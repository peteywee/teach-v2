import assert from 'node:assert/strict';
import test from 'node:test';
import {
  authenticateApplicationSession,
  issueApplicationSession,
} from './session-service.js';
import {
  issueSessionCredential,
  type ApplicationSessionRecord,
} from '../domain/application-session.js';
import type {
  ApplicationSessionRepository,
  SessionAuthenticationLookup,
} from './ports/application-session-repository.js';

test('expiry denial does not depend on lazy EXPIRED persistence succeeding', async () => {
  const issued = issueSessionCredential();
  const session = record({
    verifier: issued.verifier,
    lastUsedAt: new Date('2026-10-04T11:00:00Z'),
  });
  const repository = fakeRepository({
    lookup: { session, identityStatus: 'ACTIVE' },
    markExpiredError: new Error('write unavailable'),
  });

  const result = await authenticateApplicationSession(
    repository,
    issued.credential,
    new Date('2026-10-04T12:00:00Z'),
  );

  assert.equal(result, null);
  assert.equal(repository.markExpiredCalls, 1);
  assert.equal(repository.touchCalls, 0);
});

test('issuance returns the raw credential once while repository receives only verifier material', async () => {
  const repository = fakeRepository({ lookup: null });
  const result = await issueApplicationSession(repository, {
    id: 'session-1',
    identityId: 'identity-1',
    now: new Date('2026-10-04T12:00:00Z'),
  });
  assert.match(result.credential, /^[A-Za-z0-9_-]{43}$/);
  assert.equal(repository.createCalls, 1);
  assert.equal(repository.lastCreateCredential?.verifier.length, 32);
  assert.equal('credential' in (repository.lastCreateCredential ?? {}), false);
});

function record(overrides: Partial<ApplicationSessionRecord> = {}): ApplicationSessionRecord {
  const issuedAt = new Date('2026-10-04T00:00:00Z');
  return {
    id: 'session-1',
    identityId: 'identity-1',
    status: 'ACTIVE',
    verifierVersion: 'v1',
    verifier: Buffer.alloc(32, 1),
    issuedAt,
    absoluteExpiresAt: new Date('2026-10-04T12:00:00Z'),
    lastUsedAt: issuedAt,
    revokedAt: null,
    expiredAt: null,
    createdAt: issuedAt,
    updatedAt: issuedAt,
    ...overrides,
  };
}

function fakeRepository(input: {
  lookup: SessionAuthenticationLookup | null;
  markExpiredError?: Error;
}): ApplicationSessionRepository & {
  markExpiredCalls: number;
  touchCalls: number;
  createCalls: number;
  lastCreateCredential: { verifierVersion: 'v1'; verifier: Buffer } | null;
} {
  const repo = {
    markExpiredCalls: 0,
    touchCalls: 0,
    createCalls: 0,
    lastCreateCredential: null as { verifierVersion: 'v1'; verifier: Buffer } | null,
    async create(createInput) {
      repo.createCalls++;
      repo.lastCreateCredential = createInput.credential;
      return record({
        id: createInput.id,
        identityId: createInput.identityId,
        verifier: createInput.credential.verifier,
        issuedAt: createInput.now,
        absoluteExpiresAt: new Date(createInput.now.getTime() + 12 * 60 * 60 * 1000),
        lastUsedAt: createInput.now,
      });
    },
    async getById() { return null; },
    async revoke() { return record(); },
    async findForAuthenticationByVerifier() { return input.lookup; },
    async touchLastUsed() {
      repo.touchCalls++;
      return input.lookup?.session ?? null;
    },
    async markExpired() {
      repo.markExpiredCalls++;
      if (input.markExpiredError) throw input.markExpiredError;
    },
  } satisfies ApplicationSessionRepository & {
    markExpiredCalls: number;
    touchCalls: number;
    createCalls: number;
    lastCreateCredential: { verifierVersion: 'v1'; verifier: Buffer } | null;
  };
  return repo;
}
