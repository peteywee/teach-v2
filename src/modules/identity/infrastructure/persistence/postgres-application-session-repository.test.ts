import assert from 'node:assert/strict';
import test from 'node:test';
import type { IdentityDatabase } from './identity-database.js';
import { PostgresApplicationSessionRepository } from './postgres-application-session-repository.js';
import { PgDialect } from 'drizzle-orm/pg-core';
import type { SQL } from 'drizzle-orm';

const validInput = {
  verifierVersion: 'v1' as const,
  verifier: Buffer.alloc(32, 1),
  now: new Date('2026-10-04T12:00:00Z'),
};

for (const [label, input] of [
  ['invalid Date', { ...validInput, now: new Date(NaN) }],
  ['string clock', { ...validInput, now: validInput.now.toISOString() }],
  ['missing clock', { ...validInput, now: undefined }],
  ['unsupported verifier version', { ...validInput, verifierVersion: 'v2' }],
  ['missing verifier version', { ...validInput, verifierVersion: undefined }],
  ['short verifier', { ...validInput, verifier: Buffer.alloc(31) }],
  ['long verifier', { ...validInput, verifier: Buffer.alloc(33) }],
  ['string verifier', { ...validInput, verifier: 'A'.repeat(32) }],
  ['non-Buffer verifier', { ...validInput, verifier: new Uint8Array(32) }],
  ['missing verifier', { ...validInput, verifier: undefined }],
] as const) {
  test(`session repository rejects ${label} before any database access`, async () => {
    let databaseCalls = 0;
    const database = new Proxy({}, {
      get() {
        databaseCalls++;
        throw new Error('invalid authentication input must not access persistence');
      },
    });
    const repository = new PostgresApplicationSessionRepository(database as IdentityDatabase);
    assert.equal(await repository.authenticateByVerifier(input as typeof validInput), null);
    assert.equal(databaseCalls, 0);
  });
}

for (const denial of ['unknown session', 'inactive identity', 'conditional authentication denial'] as const) {
  test(`${denial} does not trigger a follow-on state write`, async () => {
    let followOnWrites = 0;
    let guardedAuthenticationAttempts = 0;
    const selection = {
      from() { return selection; },
      where() { return selection; },
      async limit() { return denial === 'unknown session' ? [] : [{ id: 'session-1', identityId: 'identity-1' }]; },
    };
    const update = {
      set(values: object) {
        assert.deepEqual(values, { lastUsedAt: validInput.now, updatedAt: validInput.now });
        return update;
      },
      where(condition: SQL) {
        const query = new PgDialect().sqlToQuery(condition);
        assert.match(query.sql, /isfinite\("identity_application_sessions"\."issued_at"\)/);
        assert.match(query.sql, /isfinite\("identity_application_sessions"\."absolute_expires_at"\)/);
        assert.match(query.sql, /isfinite\("identity_application_sessions"\."last_used_at"\)/);
        assert.match(query.sql, /\$\d+ >= "identity_application_sessions"\."issued_at"/);
        assert.match(query.sql, /\$\d+ >= "identity_application_sessions"\."last_used_at"/);
        assert.match(query.sql, /interval '12 hours'/);
        assert.match(query.sql, /interval '30 minutes'/);
        return update;
      },
      async returning() { return []; },
    };
    const database = {
      async transaction(work: (transaction: object) => Promise<unknown>) {
        return work({
          select() { return selection; },
          async execute() { return { rows: [{ status: denial === 'inactive identity' ? 'INACTIVE' : 'ACTIVE' }] }; },
          update() { guardedAuthenticationAttempts++; return update; },
        });
      },
      update() { followOnWrites++; throw new Error('authentication denial must not mutate state'); },
    };
    const repository = new PostgresApplicationSessionRepository(database as unknown as IdentityDatabase);
    assert.equal(await repository.authenticateByVerifier(validInput), null);
    assert.equal(guardedAuthenticationAttempts, denial === 'conditional authentication denial' ? 1 : 0);
    assert.equal(followOnWrites, 0);
  });
}
