import assert from 'node:assert/strict';
import test from 'node:test';
import {
  authenticateApplicationSession,
  issueApplicationSession,
} from './session-service.js';
import { issueSessionCredential, type ApplicationSessionRecord } from '../domain/application-session.js';
import type { ApplicationSessionRepository } from './ports/application-session-repository.js';

test('malformed credentials fail closed without entering the persistence lookup', async () => {
  const repository = fakeRepository();
  assert.equal(
    await authenticateApplicationSession(repository, 'not-a-session', new Date()),
    null,
  );
  assert.equal(repository.authenticateCalls, 0);
});

test('issuance returns the raw credential once while persistence receives verifier material only', async () => {
  const repository = fakeRepository();
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

function fakeRepository(): ApplicationSessionRepository & {
  authenticateCalls: number;
  createCalls: number;
  lastCreateCredential: { verifierVersion: 'v1'; verifier: Buffer } | null;
} {
  const repo = {
    authenticateCalls: 0,
    createCalls: 0,
    lastCreateCredential: null as { verifierVersion: 'v1'; verifier: Buffer } | null,
    async create(input) {
      repo.createCalls++;
      repo.lastCreateCredential = input.credential;
      return record({
        id: input.id,
        identityId: input.identityId,
        verifier: input.credential.verifier,
        issuedAt: input.now,
        absoluteExpiresAt: new Date(input.now.getTime() + 12 * 60 * 60 * 1000),
        lastUsedAt: input.now,
      });
    },
    async getById() { return null; },
    async revoke() { return record(); },
    async authenticateByVerifier() {
      repo.authenticateCalls++;
      return null;
    },
  } satisfies ApplicationSessionRepository & {
    authenticateCalls: number;
    createCalls: number;
    lastCreateCredential: { verifierVersion: 'v1'; verifier: Buffer } | null;
  };
  return repo;
}

test('invalid clock denies authentication before persistence lookup', async () => {
  const repository = fakeRepository();
  assert.equal(await authenticateApplicationSession(repository, issueSessionCredential().credential, new Date(NaN)), null);
  assert.equal(repository.authenticateCalls, 0);
});
