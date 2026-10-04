import { assertIsolatedDatabaseTarget } from '../../../scripts/db/isolated-database-target.mjs';
import assert from 'node:assert/strict';
import { after, before, beforeEach, test } from 'node:test';
import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import {
  IdempotencyKeyBindingConflictError,
  ReconciliationRecordConflictError,
  ReconciliationRecordNotFoundError,
} from '../../../src/modules/transaction-control/application/ports/reconciliation-record-repository.js';
import type { OpenReconciliationRecordInput } from '../../../src/modules/transaction-control/domain/reconciliation-record.js';
import { PostgresReconciliationRecordRepository } from '../../../src/modules/transaction-control/infrastructure/persistence/postgres-reconciliation-record-repository.js';
import { reconcileExternalEffect } from '../../../src/modules/transaction-control/application/reconciliation-service.js';
import * as schema from '../../../src/modules/transaction-control/infrastructure/persistence/schema.js';

const { Pool } = pg;
const connectionString = assertIsolatedDatabaseTarget(process.env.DATABASE_URL);
if (!connectionString) throw new Error('DATABASE_URL is required');

const pool = new Pool({ connectionString });
const db = drizzle(pool, { schema });
const repository = new PostgresReconciliationRecordRepository(db);
const table = 'transaction_control_reconciliation_records';

before(async () => {
  await pool.query('select 1');
});

beforeEach(async () => {
  await pool.query(`truncate table ${table}`);
});

after(async () => {
  await pool.end();
});

test('unreadable provider state keeps the record OPEN and unresolved', async () => {
  await repository.createOpen(input({ id: 'recon-unreadable' }));

  const row = await repository.recordReadbackUnavailable({
    id: 'recon-unreadable',
    authoritativeScope: { organizationId: 'acme' },
    readbackAt: new Date('2026-10-04T12:00:00Z'),
    error: 'provider unavailable',
  });

  assert.equal(row.status, 'OPEN');
  assert.equal(row.outcome, 'AMBIGUOUS');
  assert.equal(row.resolvedAt, null);
  assert.equal(row.lastReadbackError, 'provider unavailable');
});

test('canonical readback resolves only to a confirmed outcome', async () => {
  await repository.createOpen(input({ id: 'recon-success' }));

  const row = await repository.resolve({
    id: 'recon-success',
    authoritativeScope: { organizationId: 'acme' },
    outcome: 'CONFIRMED_SUCCESS',
    readbackAt: new Date('2026-10-04T12:05:00Z'),
    providerDetail: { messageId: 'provider-123' },
  });

  assert.equal(row.status, 'RESOLVED');
  assert.equal(row.outcome, 'CONFIRMED_SUCCESS');
  assert.equal(row.lastReadbackError, null);

  await assert.rejects(
    pool.query(
      `update ${table} set status = 'OPEN', outcome = 'AMBIGUOUS', resolved_at = null where id = 'recon-success'`,
    ),
    /resolved reconciliation state is terminal/,
  );
});

test('same record id plus same key and payload replays to one authoritative row', async () => {
  const request = input({ id: 'recon-replay' });

  const first = await repository.createOpen(request);
  const second = await repository.createOpen(request);

  assert.equal(second.id, first.id);
  assert.equal(second.idempotencyKey, first.idempotencyKey);

  const count = await pool.query<{ count: string }>(
    `select count(*)::text as count from ${table}`,
  );
  assert.equal(count.rows[0]?.count, '1');
});

test('same IdempotencyKey identifier cannot bind to a different operation or payload', async () => {
  await repository.createOpen(input({ id: 'recon-binding-1' }));

  await assert.rejects(
    repository.createOpen(
      input({
        id: 'recon-binding-2',
        operationName: 'IssueCertification',
      }),
    ),
    IdempotencyKeyBindingConflictError,
  );

  await assert.rejects(
    repository.createOpen(
      input({
        id: 'recon-binding-3',
        payloadHash: 'payload-b',
      }),
    ),
    IdempotencyKeyBindingConflictError,
  );

  const count = await pool.query<{ count: string }>(
    `select count(*)::text as count from ${table}`,
  );
  assert.equal(count.rows[0]?.count, '1');
});

test('concurrent same-id replay produces one authoritative row', async () => {
  const request = input({ id: 'recon-concurrent-replay' });
  const results = await Promise.all(
    Array.from({ length: 8 }, () => repository.createOpen(request)),
  );

  assert.equal(new Set(results.map((row) => row.id)).size, 1);

  const count = await pool.query<{ count: string }>(
    `select count(*)::text as count from ${table}`,
  );
  assert.equal(count.rows[0]?.count, '1');
});

test('overlapping conflicting IdempotencyKey bindings serialize and allow one winner', async () => {
  const lockHolder = await pool.connect();
  let settledCount = 0;
  let first: Promise<unknown> | undefined;
  let second: Promise<unknown> | undefined;
  let blockedBeforeRelease = false;

  try {
    await lockHolder.query('begin');
    await lockHolder.query(
      'select pg_advisory_xact_lock(hashtextextended($1, 0))',
      ['idem-1'],
    );

    first = repository
      .createOpen(
        input({ id: 'recon-race-a', operationName: 'SendInvitationEmail' }),
      )
      .finally(() => {
        settledCount++;
      });
    second = repository
      .createOpen(
        input({ id: 'recon-race-b', operationName: 'IssueCertification' }),
      )
      .finally(() => {
        settledCount++;
      });

    await new Promise((resolve) => setTimeout(resolve, 75));
    blockedBeforeRelease = settledCount === 0;
    await lockHolder.query('commit');
  } finally {
    try {
      await lockHolder.query('rollback');
    } catch {}
    lockHolder.release();
  }

  const settled = await Promise.allSettled([first!, second!]);
  assert.equal(
    blockedBeforeRelease,
    true,
    'both repository writes must block behind the held IdempotencyKey advisory lock',
  );

  const fulfilled = settled.filter((result) => result.status === 'fulfilled');
  const rejected = settled.filter((result) => result.status === 'rejected');

  assert.equal(fulfilled.length, 1);
  assert.equal(rejected.length, 1);
  assert.ok(
    rejected[0]?.status === 'rejected' &&
      rejected[0].reason instanceof IdempotencyKeyBindingConflictError,
  );

  const count = await pool.query<{ count: string }>(
    `select count(*)::text as count from ${table}`,
  );
  assert.equal(count.rows[0]?.count, '1');
});

test('same record id rejects changed immutable scope and idempotency horizons', async () => {
  const original = input({ id: 'recon-immutable-replay' });
  await repository.createOpen(original);

  await assert.rejects(
    repository.createOpen({
      ...original,
      authoritativeScope: { organizationId: 'other' },
    }),
    ReconciliationRecordConflictError,
  );

  await assert.rejects(
    repository.createOpen({
      ...original,
      idempotency: {
        ...original.idempotency!,
        retryHorizonEndsAt: new Date('2026-10-05T01:00:00Z'),
      },
    }),
    ReconciliationRecordConflictError,
  );

  await assert.rejects(
    repository.createOpen({
      ...original,
      idempotency: {
        ...original.idempotency!,
        retentionUntil: new Date('2026-10-06T01:00:00Z'),
      },
    }),
    ReconciliationRecordConflictError,
  );
});

test('many records may reference one key when operation and payload binding are identical', async () => {
  await repository.createOpen(input({ id: 'recon-many-1' }));
  await repository.createOpen(input({ id: 'recon-many-2' }));

  const count = await pool.query<{ count: string }>(
    `select count(*)::text as count from ${table} where idempotency_key = 'idem-1'`,
  );
  assert.equal(count.rows[0]?.count, '2');
});

test('authoritative scope is required on reads and cannot be broadened after insert', async () => {
  await repository.createOpen(input({ id: 'recon-scope' }));

  assert.equal(await repository.getById('recon-scope', { organizationId: 'other' }), null);

  await assert.rejects(
    repository.resolve({
      id: 'recon-scope',
      authoritativeScope: { organizationId: 'other' },
      outcome: 'CONFIRMED_NO_EFFECT',
      readbackAt: new Date('2026-10-04T12:10:00Z'),
    }),
    ReconciliationRecordNotFoundError,
  );

  await assert.rejects(
    pool.query(
      `update ${table} set scope_fingerprint = 'org:other' where id = 'recon-scope'`,
    ),
    /immutable reconciliation identity\/scope fields cannot change/,
  );
});

test('caller mutation during advisory-lock wait cannot change captured scope or key binding', async () => {
  const base = input({ id: 'recon-captured' });
  const mutable = { ...base, authoritativeScope: { organizationId: 'acme' }, idempotency: { ...base.idempotency! } };
  const holder = await pool.connect();
  let pending: ReturnType<typeof repository.createOpen> | undefined;
  try {
    await holder.query('begin');
    await holder.query('select pg_advisory_xact_lock(hashtextextended($1, 0))', ['idem-1']);
    pending = repository.createOpen(mutable);
    void pending.catch(() => {});
    const deadline = Date.now() + 3000;
    let waiting = false;
    while (Date.now() < deadline) {
      await pool.query('select pg_stat_clear_snapshot()');
      const state = await pool.query<{ count: string }>(`select count(*)::text as count from pg_stat_activity
        where datname=current_database() and wait_event_type='Lock' and query like '%pg_advisory_xact_lock%'`);
      if (Number(state.rows[0]?.count) >= 1) { waiting = true; break; }
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    assert.equal(waiting, true, 'repository must be waiting on the original key before mutation');
    mutable.id = 'recon-shifted';
    mutable.authoritativeScope.organizationId = 'other';
    mutable.idempotency.key = 'idem-shifted';
    mutable.idempotency.payloadHash = 'payload-shifted';
    mutable.idempotency.retentionUntil.setUTCFullYear(2030);
    await holder.query('commit');
  } finally {
    await holder.query('rollback');
    holder.release();
  }
  const record = await pending!;
  assert.equal(record.id, 'recon-captured');
  assert.deepEqual(record.authoritativeScope, { organizationId: 'acme' });
  assert.equal(record.idempotencyKey, 'idem-1');
  assert.equal(record.payloadHash, 'payload-a');
  assert.equal(record.idempotencyRetentionUntil?.toISOString(), '2026-10-06T00:00:00.000Z');
  assert.equal(await repository.getById('recon-captured', { organizationId: 'other' }), null);
  assert.ok(await repository.getById('recon-captured', { organizationId: 'acme' }));
});

function input(
  overrides: Partial<{
    id: string;
    operationName: string;
    payloadHash: string;
  }> = {},
): OpenReconciliationRecordInput {
  return {
    id: overrides.id ?? 'recon-1',
    outcome: 'AMBIGUOUS',
    operationName: overrides.operationName ?? 'SendInvitationEmail',
    authoritativeScope: { organizationId: 'acme' },
    providerName: 'email-provider',
    providerReference: 'attempt-1',
    idempotency: {
      key: 'idem-1',
      source: 'CLIENT_SUPPLIED',
      payloadHash: overrides.payloadHash ?? 'payload-a',
      retryHorizonEndsAt: new Date('2026-10-05T00:00:00Z'),
      retentionUntil: new Date('2026-10-06T00:00:00Z'),
    },
  };
}

for (const outcome of ['CONFIRMED_SUCCESS', 'CONFIRMED_NO_EFFECT', 'UNAVAILABLE'] as const) {
  test(`Application reconciliation persists canonical ${outcome} with no provider sends`, async () => {
    await repository.createOpen(input({ id: 'service-readback' }));
    let reads = 0;
    const provider = { async readCanonicalState() { reads++; return { outcome }; } };
    const row = await reconcileExternalEffect(repository, provider, { id: 'service-readback', authoritativeScope: { organizationId: 'acme' } }, () => new Date('2026-10-04T12:00:00Z'));
    assert.equal(reads, 1);
    assert.equal(row.status, outcome === 'UNAVAILABLE' ? 'OPEN' : 'RESOLVED');
    assert.equal((await repository.getById('service-readback', { organizationId: 'acme' }))?.outcome, outcome === 'UNAVAILABLE' ? 'AMBIGUOUS' : outcome);
    assert.equal(await repository.getById('service-readback', { organizationId: 'other' }), null);
  });
}

test('16 conflicting resolutions preserve one terminal canonical outcome', async () => {
  await repository.createOpen(input({id:'terminal-race'}));
  const outcomes = Array.from({length:16},(_,i)=>i%2 ? 'CONFIRMED_SUCCESS' as const : 'CONFIRMED_NO_EFFECT' as const);
  const settled = await Promise.allSettled(outcomes.map(outcome=>repository.resolve({id:'terminal-race',authoritativeScope:{organizationId:'acme'},outcome,readbackAt:new Date('2026-10-04T12:00:00Z')})));
  const row = await repository.getById('terminal-race',{organizationId:'acme'});
  assert.equal(row?.status,'RESOLVED');
  for (const [i,result] of settled.entries()) {
    if(outcomes[i]===row?.outcome) {assert.equal(result.status,'fulfilled'); if(result.status==='fulfilled') assert.equal(result.value.outcome,row.outcome);}
    else {assert.equal(result.status,'rejected');if(result.status==='rejected') assert.ok(result.reason instanceof ReconciliationRecordConflictError);}
  }
});
