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

for (const field of ['issuedAt', 'absoluteExpiresAt', 'lastUsedAt', 'now'] as const) {
  test(`invalid ${field} fails closed instead of bypassing expiry`, () => {
    const at = new Date('2026-10-04T12:00:00Z');
    const values = { identityActive: true, status: 'ACTIVE' as const, issuedAt: at, absoluteExpiresAt: new Date(at.getTime() + SESSION_ABSOLUTE_LIFETIME_MS), lastUsedAt: at, now: at };
    values[field] = new Date(NaN);
    assert.deepEqual(evaluateSessionAuthentication(values, values.now), { allowed: false, reason: 'INVALID_TIME' });
  });
}
test('session and single-use verifiers are separated even for identical raw bytes', async () => {
  const { deriveSingleUseVerifier } = await import('./single-use-secret.js');
  const secret = Buffer.alloc(32, 1).toString('base64url');
  assert.notDeepEqual(deriveSessionVerifier(secret), deriveSingleUseVerifier(secret));
});

const sessionStart = new Date('2026-10-04T12:00:00Z');
const activeSession = {
  identityActive: true,
  status: 'ACTIVE' as const,
  issuedAt: sessionStart,
  absoluteExpiresAt: new Date(sessionStart.getTime() + SESSION_ABSOLUTE_LIFETIME_MS),
  lastUsedAt: sessionStart,
};

test('active sessions authenticate at issuance and immediately before each expiry boundary', () => {
  const beforeIdle = new Date(sessionStart.getTime() + SESSION_IDLE_LIFETIME_MS - 1);
  const beforeAbsolute = new Date(activeSession.absoluteExpiresAt.getTime() - 1);
  assert.deepEqual(evaluateSessionAuthentication(activeSession, sessionStart), { allowed: true });
  assert.deepEqual(evaluateSessionAuthentication(activeSession, beforeIdle), { allowed: true });
  assert.deepEqual(evaluateSessionAuthentication({ ...activeSession, lastUsedAt: beforeAbsolute }, beforeAbsolute), { allowed: true });
});

for (const [label, input, now] of [
  ['before issuance', activeSession, new Date(sessionStart.getTime() - 1)],
  ['future last use', { ...activeSession, lastUsedAt: new Date(sessionStart.getTime() + 1) }, sessionStart],
  ['last use before issuance', { ...activeSession, lastUsedAt: new Date(sessionStart.getTime() - 1) }, sessionStart],
  ['shortened absolute lifetime', { ...activeSession, absoluteExpiresAt: new Date(activeSession.absoluteExpiresAt.getTime() - 1) }, sessionStart],
  ['extended absolute lifetime', { ...activeSession, absoluteExpiresAt: new Date(activeSession.absoluteExpiresAt.getTime() + 1), lastUsedAt: activeSession.absoluteExpiresAt }, activeSession.absoluteExpiresAt],
] as const) {
  test(`${label} fails closed without mutating the session`, () => {
    const before = structuredClone(input);
    assert.deepEqual(evaluateSessionAuthentication(input, now), { allowed: false, reason: 'INVALID_TIME' });
    assert.deepEqual(input, before);
  });
}

test('only a literal active identity and canonical ACTIVE session may authenticate', () => {
  for (const identityActive of [false, undefined, null, 0, 1, 'false', 'true', {}]) {
    assert.deepEqual(
      evaluateSessionAuthentication({ ...activeSession, identityActive: identityActive as boolean }, sessionStart),
      { allowed: false, reason: 'IDENTITY_INACTIVE' },
    );
  }
  for (const status of ['REVOKED', 'EXPIRED', 'active', '', undefined, null]) {
    assert.deepEqual(
      evaluateSessionAuthentication({ ...activeSession, status: status as typeof activeSession.status }, sessionStart),
      { allowed: false, reason: 'SESSION_NOT_ACTIVE' },
    );
  }
});

test('non-Date temporal inputs fail closed rather than being coerced', () => {
  for (const field of ['issuedAt', 'absoluteExpiresAt', 'lastUsedAt', 'now'] as const) {
    for (const invalid of [undefined, null, 0, sessionStart.toISOString(), {}]) {
      const input = { ...activeSession, now: sessionStart, [field]: invalid };
      assert.deepEqual(
        evaluateSessionAuthentication(input as typeof activeSession, input.now as Date),
        { allowed: false, reason: 'INVALID_TIME' },
      );
    }
  }
});

test('session verifier matches the fixed v1 domain-separated SHA-256 vector', () => {
  assert.equal(
    deriveSessionVerifier('AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA').toString('hex'),
    'bd788819f2c15498bf4e92e8c76ccc1c5150d4b523f6da81ad9172a21944fb50',
  );
});

test('malformed or noncanonical session credentials cannot produce a verifier', () => {
  for (const credential of [
    '', ' '.repeat(43), 'A'.repeat(42), 'A'.repeat(44), `${'A'.repeat(43)}=`,
    `${'A'.repeat(42)}+`, `${'A'.repeat(42)}/`, `${'A'.repeat(42)}B`,
    ` ${'A'.repeat(43)}`, `${'A'.repeat(43)}\n`,
  ]) assert.throws(() => deriveSessionVerifier(credential), RangeError);
});
