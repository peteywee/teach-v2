import assert from 'node:assert/strict';
import test from 'node:test';
import {
  deriveSessionVerifier,
  evaluateSessionAuthentication,
  issueSessionCredential,
  SESSION_ABSOLUTE_LIFETIME_MS,
  SESSION_IDLE_LIFETIME_MS,
} from './application-session.js';

test('session credentials are unique canonical base64url encodings of 32 random bytes', () => {
  const seen = new Set<string>();
  for (let i = 0; i < 10_000; i++) {
    const issued = issueSessionCredential();
    assert.match(issued.credential, /^[A-Za-z0-9_-]{43}$/);
    assert.equal(Buffer.from(issued.credential, 'base64url').length, 32);
    assert.equal(issued.verifier.length, 32);
    assert.deepEqual(deriveSessionVerifier(issued.credential), issued.verifier);
    assert.equal(seen.has(issued.credential), false);
    seen.add(issued.credential);
  }
});

test('stored verifier material cannot authenticate as the raw credential', () => {
  const issued = issueSessionCredential();
  const verifierAsCredential = issued.verifier.toString('base64url');
  assert.notDeepEqual(
    deriveSessionVerifier(verifierAsCredential),
    issued.verifier,
  );
});

test('absolute and idle boundaries fail closed exactly at the approved limits', () => {
  const issuedAt = new Date('2026-10-04T12:00:00Z');
  const base = {
    identityActive: true,
    status: 'ACTIVE' as const,
    issuedAt,
    absoluteExpiresAt: new Date(issuedAt.getTime() + SESSION_ABSOLUTE_LIFETIME_MS),
    lastUsedAt: issuedAt,
  };

  assert.deepEqual(
    evaluateSessionAuthentication(base, new Date(issuedAt.getTime() + SESSION_IDLE_LIFETIME_MS)),
    { allowed: false, reason: 'IDLE_EXPIRED' },
  );

  assert.deepEqual(
    evaluateSessionAuthentication(
      { ...base, lastUsedAt: new Date(issuedAt.getTime() + SESSION_ABSOLUTE_LIFETIME_MS - 1) },
      new Date(issuedAt.getTime() + SESSION_ABSOLUTE_LIFETIME_MS),
    ),
    { allowed: false, reason: 'ABSOLUTE_EXPIRED' },
  );
});
