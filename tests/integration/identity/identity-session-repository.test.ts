import { assertIsolatedDatabaseTarget } from '../../../scripts/db/isolated-database-target.mjs';
import assert from 'node:assert/strict';
import { after, before, beforeEach, test } from 'node:test';
import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import {
  authenticateApplicationSession,
  issueApplicationSession,
} from '../../../src/modules/identity/application/session-service.js';
import { deriveSessionVerifier } from '../../../src/modules/identity/domain/application-session.js';
import { PostgresApplicationSessionRepository } from '../../../src/modules/identity/infrastructure/persistence/postgres-application-session-repository.js';
import { PostgresIdentityRepository } from '../../../src/modules/identity/infrastructure/persistence/postgres-identity-repository.js';
import * as schema from '../../../src/modules/identity/infrastructure/persistence/schema.js';

const { Pool } = pg;
const connectionString = assertIsolatedDatabaseTarget(process.env.DATABASE_URL);
if (!connectionString) throw new Error('DATABASE_URL is required');

const pool = new Pool({ connectionString });
const db = drizzle(pool, { schema });
const identities = new PostgresIdentityRepository(db);
const sessions = new PostgresApplicationSessionRepository(db);

before(async () => {
  await pool.query('select 1');
});

beforeEach(async () => {
  await pool.query(
    'truncate table identity_application_sessions, identity_identities cascade',
  );
});

after(async () => {
  await pool.end();
});

test('session issuance persists only v1 verifier material and authenticates', async () => {
  const now = new Date('2026-10-04T12:00:00Z');
  await identities.create({ id: 'identity-1', now });
  const issued = await issueApplicationSession(sessions, {
    id: 'session-1',
    identityId: 'identity-1',
    now,
  });

  const row = await pool.query<{
    verifier_version: string;
    credential_verifier: Buffer;
  }>(
    'select verifier_version, credential_verifier from identity_application_sessions where id = $1',
    ['session-1'],
  );
  assert.equal(row.rows[0]?.verifier_version, 'v1');
  assert.deepEqual(
    row.rows[0]?.credential_verifier,
    deriveSessionVerifier(issued.credential),
  );

  const authenticated = await authenticateApplicationSession(
    sessions,
    issued.credential,
    new Date('2026-10-04T12:05:00Z'),
  );
  assert.equal(authenticated?.identityId, 'identity-1');
  assert.equal(authenticated?.lastUsedAt.toISOString(), '2026-10-04T12:05:00.000Z');
});

test('stored verifier bytes encoded as base64url do not authenticate', async () => {
  const now = new Date('2026-10-04T12:00:00Z');
  await identities.create({ id: 'identity-1', now });
  const issued = await issueApplicationSession(sessions, {
    id: 'session-1',
    identityId: 'identity-1',
    now,
  });
  assert.equal(
    await authenticateApplicationSession(
      sessions,
      issued.session.verifier.toString('base64url'),
      now,
    ),
    null,
  );
});

test('protected session reads and revocation require authoritative IdentityId', async () => {
  const now = new Date('2026-10-04T12:00:00Z');
  await identities.create({ id: 'identity-1', now });
  await identities.create({ id: 'identity-2', now });
  await issueApplicationSession(sessions, {
    id: 'session-1',
    identityId: 'identity-1',
    now,
  });
  assert.equal(
    await sessions.getById({ id: 'session-1', identityId: 'identity-2' }),
    null,
  );
  await assert.rejects(
    sessions.revoke({
      id: 'session-1',
      identityId: 'identity-2',
      now: new Date('2026-10-04T12:01:00Z'),
    }),
    /authoritative Identity scope/,
  );
});

test('deactivation revokes sessions and reactivation cannot revive old credentials', async () => {
  const now = new Date('2026-10-04T12:00:00Z');
  await identities.create({ id: 'identity-1', now });
  const first = await issueApplicationSession(sessions, {
    id: 'session-1',
    identityId: 'identity-1',
    now,
  });
  await identities.deactivate({
    id: 'identity-1',
    now: new Date('2026-10-04T12:01:00Z'),
  });
  assert.equal(
    (await sessions.getById({ id: 'session-1', identityId: 'identity-1' }))?.status,
    'REVOKED',
  );
  assert.equal(
    await authenticateApplicationSession(
      sessions,
      first.credential,
      new Date('2026-10-04T12:02:00Z'),
    ),
    null,
  );

  await identities.reactivate({
    id: 'identity-1',
    now: new Date('2026-10-04T12:03:00Z'),
  });
  assert.equal(
    await authenticateApplicationSession(
      sessions,
      first.credential,
      new Date('2026-10-04T12:04:00Z'),
    ),
    null,
  );
});

test('deactivation and session issuance serialize on the Identity row', async () => {
  const now = new Date('2026-10-04T12:00:00Z');
  await identities.create({ id: 'identity-race', now });

  const lockHolder = await pool.connect();
  let settled = 0;
  let issuance: Promise<unknown> | undefined;
  let deactivation: Promise<unknown> | undefined;
  try {
    await lockHolder.query('begin');
    await lockHolder.query(
      "select id from identity_identities where id = 'identity-race' for update",
    );

    issuance = issueApplicationSession(sessions, {
      id: 'session-race',
      identityId: 'identity-race',
      now: new Date('2026-10-04T12:01:00Z'),
    }).finally(() => { settled++; });

    deactivation = identities.deactivate({
      id: 'identity-race',
      now: new Date('2026-10-04T12:02:00Z'),
    }).finally(() => { settled++; });

    await new Promise((resolve) => setTimeout(resolve, 75));
    assert.equal(settled, 0, 'both operations must wait behind the Identity row lock');
    await lockHolder.query('commit');
  } finally {
    try { await lockHolder.query('rollback'); } catch {}
    lockHolder.release();
  }

  await Promise.allSettled([issuance!, deactivation!]);
  assert.equal((await identities.getById('identity-race'))?.status, 'INACTIVE');
  const active = await pool.query<{ count: string }>(
    "select count(*)::text as count from identity_application_sessions where identity_id = 'identity-race' and status = 'ACTIVE'",
  );
  assert.equal(active.rows[0]?.count, '0');
});

test('idle expiry denies authentication even when EXPIRED persistence fails', async () => {
  const issuedAt = new Date('2026-10-04T00:00:00Z');
  await identities.create({ id: 'identity-1', now: issuedAt });
  const issued = await issueApplicationSession(sessions, {
    id: 'session-idle-fail',
    identityId: 'identity-1',
    now: issuedAt,
  });

  await pool.query(`
    create function test_fail_session_expire() returns trigger language plpgsql as $$
    begin
      if new.status = 'EXPIRED' then
        raise exception 'forced expiry persistence failure';
      end if;
      return new;
    end;
    $$
  `);
  await pool.query(`
    create trigger test_fail_session_expire_trigger
    before update on identity_application_sessions
    for each row execute function test_fail_session_expire()
  `);

  try {
    assert.equal(
      await authenticateApplicationSession(
        sessions,
        issued.credential,
        new Date(issuedAt.getTime() + 30 * 60 * 1000),
      ),
      null,
    );
    assert.equal(
      (await sessions.getById({
        id: 'session-idle-fail',
        identityId: 'identity-1',
      }))?.status,
      'ACTIVE',
    );
  } finally {
    await pool.query('drop trigger if exists test_fail_session_expire_trigger on identity_application_sessions');
    await pool.query('drop function if exists test_fail_session_expire()');
  }
});

test('absolute expiry fails closed and normal lazy expiry persists', async () => {
  const start = new Date('2026-10-05T00:00:00Z');
  await identities.create({ id: 'identity-1', now: start });
  const issued = await issueApplicationSession(sessions, {
    id: 'session-absolute',
    identityId: 'identity-1',
    now: start,
  });
  assert.equal(
    await authenticateApplicationSession(
      sessions,
      issued.credential,
      new Date(start.getTime() + 12 * 60 * 60 * 1000),
    ),
    null,
  );
  assert.equal(
    (await sessions.getById({
      id: 'session-absolute',
      identityId: 'identity-1',
    }))?.status,
    'EXPIRED',
  );
});

test('database guards reject DELETED insertion/update and terminal session reactivation', async () => {
  const now = new Date('2026-10-04T12:00:00Z');
  await assert.rejects(
    pool.query(
      "insert into identity_identities(id,status,created_at,updated_at) values ('deleted-direct','DELETED',now(),now())",
    ),
    /DELETED ingress is not authorized/,
  );

  await identities.create({ id: 'identity-1', now });
  const issued = await issueApplicationSession(sessions, {
    id: 'session-1',
    identityId: 'identity-1',
    now,
  });
  await sessions.revoke({
    id: 'session-1',
    identityId: 'identity-1',
    now: new Date('2026-10-04T12:01:00Z'),
  });

  await assert.rejects(
    pool.query("update identity_identities set status = 'DELETED' where id = 'identity-1'"),
    /DELETED ingress is not authorized/,
  );
  await assert.rejects(
    pool.query(
      "update identity_application_sessions set status = 'ACTIVE', revoked_at = null where id = 'session-1'",
    ),
    /terminal ApplicationSession status cannot change/,
  );
  assert.equal(
    await authenticateApplicationSession(
      sessions,
      issued.credential,
      new Date('2026-10-04T12:02:00Z'),
    ),
    null,
  );
});

test('P02 schema contains no copied tenant or authorization authority columns', async () => {
  const rows = await pool.query<{ table_name: string; column_name: string }>(
    `select table_name, column_name
       from information_schema.columns
      where table_schema = 'public'
        and table_name in ('identity_identities', 'identity_application_sessions')
      order by table_name, ordinal_position`,
  );
  const forbidden = /organization|location|role|capability/i;
  assert.equal(rows.rows.some((row) => forbidden.test(row.column_name)), false);
  assert.equal(rows.rows.some((row) => row.column_name === 'credential'), false);
});
