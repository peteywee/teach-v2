import { assertIsolatedDatabaseTarget } from '../../../scripts/db/isolated-database-target.mjs';
import assert from 'node:assert/strict';
import { after, before, beforeEach, test } from 'node:test';
import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import { PostgresIdentityRepository } from '../../../src/modules/identity/infrastructure/persistence/postgres-identity-repository.js';
import { PostgresCredentialRepository } from '../../../src/modules/identity/infrastructure/persistence/postgres-credential-repository.js';
import * as identitySchema from '../../../src/modules/identity/infrastructure/persistence/schema.js';
import * as credentialSchema from '../../../src/modules/identity/infrastructure/persistence/credential-schema.js';

const { Pool } = pg;
const connectionString = assertIsolatedDatabaseTarget(process.env.DATABASE_URL);
if (!connectionString) throw new Error('DATABASE_URL is required');

const pool = new Pool({ connectionString });
const identityDb = drizzle(pool, { schema: identitySchema });
const credentialDb = drizzle(pool, { schema: { ...identitySchema, ...credentialSchema } });
const identities = new PostgresIdentityRepository(identityDb);
const credentials = new PostgresCredentialRepository(credentialDb);

before(async () => {
  await pool.query('select 1');
});

beforeEach(async () => {
  await pool.query(
    'truncate table identity_credentials, identity_application_sessions, identity_identities cascade',
  );
});

after(async () => {
  await pool.end();
});

test('Credential persists a PASSWORD hash for an ACTIVE Identity', async () => {
  const now = new Date('2026-10-04T12:00:00Z');
  await identities.create({ id: 'identity-1', now });

  const created = await credentials.create({
    id: 'cred-1',
    identityId: 'identity-1',
    credentialType: 'PASSWORD',
    passwordHash: '$argon2id$v=19$fixture',
    now,
  });

  assert.equal(created.identityId, 'identity-1');
  assert.equal(created.credentialType, 'PASSWORD');
  assert.equal(created.passwordHash, '$argon2id$v=19$fixture');

  const row = await pool.query<{
    identity_id: string;
    credential_type: string;
    password_hash: string | null;
  }>(
    'select identity_id, credential_type, password_hash from identity_credentials where id=$1',
    ['cred-1'],
  );
  assert.deepEqual(row.rows[0], {
    identity_id: 'identity-1',
    credential_type: 'PASSWORD',
    password_hash: '$argon2id$v=19$fixture',
  });
});

test('Credential creation rejects an INACTIVE Identity', async () => {
  const now = new Date('2026-10-04T12:00:00Z');
  await identities.create({ id: 'identity-1', now });
  await identities.deactivate({
    id: 'identity-1',
    now: new Date('2026-10-04T12:01:00Z'),
  });

  await assert.rejects(
    credentials.create({
      id: 'cred-inactive',
      identityId: 'identity-1',
      credentialType: 'PASSWORD',
      passwordHash: '$argon2id$v=19$fixture',
      now: new Date('2026-10-04T12:02:00Z'),
    }),
    /authoritative Identity must be ACTIVE/,
  );
});

test('caller mutation during Identity lock wait cannot redirect Credential ownership', async () => {
  const now = new Date('2026-10-04T12:00:00Z');
  await identities.create({ id: 'identity-active', now });
  await identities.create({ id: 'identity-inactive', now });
  await identities.deactivate({ id: 'identity-inactive', now });
  const mutable = { id: 'cred-captured', identityId: 'identity-active', credentialType: 'PASSWORD' as const, passwordHash: '$hash', now: new Date(now) };
  const holder = await pool.connect();
  let pending: ReturnType<typeof credentials.create> | undefined;
  try {
    await holder.query('begin');
    await holder.query('select status from identity_identities where id=$1 for update', ['identity-active']);
    pending = credentials.create(mutable);
    void pending.catch(() => {});
    const deadline = Date.now() + 3000;
    let waiting = false;
    while (Date.now() < deadline) {
      await pool.query('select pg_stat_clear_snapshot()');
      const state = await pool.query<{ count: string }>(`select count(*)::text as count from pg_stat_activity
        where datname=current_database() and wait_event_type='Lock' and query like '%identity_identities%' and query like '%for update%'`);
      if (Number(state.rows[0]?.count) >= 1) { waiting = true; break; }
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    assert.equal(waiting, true, 'creation must wait behind the original Identity lock');
    mutable.id = 'cred-shifted';
    mutable.identityId = 'identity-inactive';
    mutable.passwordHash = '$changed';
    mutable.now.setUTCFullYear(2030);
    await holder.query('commit');
  } finally {
    await holder.query('rollback');
    holder.release();
  }
  const record = await pending!;
  assert.equal(record.id, 'cred-captured');
  assert.equal(record.identityId, 'identity-active');
  assert.equal(record.passwordHash, '$hash');
  assert.equal(record.createdAt.toISOString(), '2026-10-04T12:00:00.000Z');
  assert.equal((await credentials.listByIdentity({ identityId: 'identity-inactive' })).length, 0);
});

test('Credential foreign key targets the canonical identity_identities table', async () => {
  await assert.rejects(
    pool.query(
      `insert into identity_credentials
        (id, identity_id, credential_type, password_hash, created_at, updated_at)
       values ('cred-no-owner','missing','PASSWORD','$hash',now(),now())`,
    ),
    /foreign key constraint/,
  );

  const fk = await pool.query<{ definition: string }>(
    `select pg_get_constraintdef(c.oid,true) as definition
       from pg_constraint c
       join pg_class t on t.oid=c.conrelid
       join pg_namespace n on n.oid=t.relnamespace
      where n.nspname='public'
        and t.relname='identity_credentials'
        and c.contype='f'`,
  );
  assert.equal(fk.rows.length, 1);
  assert.match(fk.rows[0]!.definition, /REFERENCES identity_identities\(id\)/);
});

test('protected Credential reads, lists, and revocation are Identity-scoped', async () => {
  const now = new Date('2026-10-04T12:00:00Z');
  await identities.create({ id: 'identity-1', now });
  await identities.create({ id: 'identity-2', now });
  await credentials.create({
    id: 'cred-1',
    identityId: 'identity-1',
    credentialType: 'PASSWORD',
    passwordHash: '$hash',
    now,
  });

  assert.equal(
    await credentials.findById({ id: 'cred-1', identityId: 'identity-2' }),
    null,
  );
  assert.equal((await credentials.listByIdentity({ identityId: 'identity-2' })).length, 0);
  assert.equal(
    await credentials.revoke({
      id: 'cred-1',
      identityId: 'identity-2',
      now: new Date('2026-10-04T12:01:00Z'),
    }),
    null,
  );
  assert.equal(
    (await credentials.findById({ id: 'cred-1', identityId: 'identity-1' }))?.revokedAt,
    null,
  );
});

test('database constraints reject missing PASSWORD hash and OAUTH_LINK hash material', async () => {
  const now = new Date('2026-10-04T12:00:00Z');
  await identities.create({ id: 'identity-1', now });

  await assert.rejects(
    pool.query(
      `insert into identity_credentials
        (id, identity_id, credential_type, password_hash, created_at, updated_at)
       values ('cred-no-hash','identity-1','PASSWORD',null,now(),now())`,
    ),
    /identity_credential_hash_check/,
  );

  await assert.rejects(
    pool.query(
      `insert into identity_credentials
        (id, identity_id, credential_type, password_hash, created_at, updated_at)
       values ('cred-oauth-hash','identity-1','OAUTH_LINK','$hash',now(),now())`,
    ),
    /identity_credential_hash_check/,
  );
});

test('P04 Credential table copies no tenant or authorization authority columns', async () => {
  const rows = await pool.query<{ column_name: string }>(
    `select column_name
       from information_schema.columns
      where table_schema='public' and table_name='identity_credentials'
      order by ordinal_position`,
  );
  const forbidden = /organization|location|role|capability|membership|entitlement/i;
  assert.equal(rows.rows.some((row) => forbidden.test(row.column_name)), false);
  assert.equal(rows.rows.some((row) => row.column_name === 'identity_id'), true);
});

test('16 concurrent Credential revocations mutate once and preserve original scope', async () => {
  const now = new Date('2026-10-04T12:00:00Z'); await identities.create({id:'owner',now});
  await credentials.create({id:'revoke-race',identityId:'owner',credentialType:'PASSWORD',passwordHash:'$hash',now});
  const results = await Promise.all(Array.from({length:16},()=>credentials.revoke({id:'revoke-race',identityId:'owner',now})));
  assert.equal(results.filter(Boolean).length,1);
  assert.equal((await credentials.findById({id:'revoke-race',identityId:'owner'}))?.revokedAt?.getTime(),now.getTime());
});
test('failed Credential revocation commits no partial status or timestamp change', async () => {
  const now = new Date('2026-10-04T12:00:00Z'); await identities.create({id:'owner',now});
  await credentials.create({id:'revoke-fault',identityId:'owner',credentialType:'PASSWORD',passwordHash:'$hash',now});
  await pool.query(`create function test_fail_credential_revoke() returns trigger language plpgsql as $$ begin raise exception 'forced credential failure'; end $$`);
  await pool.query('create trigger test_fail_credential_revoke before update on identity_credentials for each row execute function test_fail_credential_revoke()');
  try {
    await assert.rejects(credentials.revoke({id:'revoke-fault',identityId:'owner',now:new Date(now.getTime()+1000)}), (error: unknown) => {
      const cause = error instanceof Error ? (error as Error & { cause?: unknown }).cause ?? error : error;
      return cause instanceof Error && cause.message === 'forced credential failure';
    });
    const row = await credentials.findById({id:'revoke-fault',identityId:'owner'});
    assert.equal(row?.revokedAt,null); assert.equal(row?.updatedAt.getTime(),now.getTime());
  } finally {
    await pool.query('drop trigger if exists test_fail_credential_revoke on identity_credentials'); await pool.query('drop function if exists test_fail_credential_revoke()');
  }
});
