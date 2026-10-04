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
const connectionString = process.env.DATABASE_URL;
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
  const verifierCredential = issued.session.verifier.toString('base64url');
  assert.equal(
    await authenticateApplicationSession(sessions, verifierCredential, now),
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

test('inactive Identity and revoked session both fail authentication', async () => {
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
  const second = await issueApplicationSession(sessions, {
    id: 'session-2',
    identityId: 'identity-1',
    now: new Date('2026-10-04T12:04:00Z'),
  });
  await sessions.revoke({
    id: 'session-2',
    identityId: 'identity-1',
    now: new Date('2026-10-04T12:05:00Z'),
  });
  assert.equal(
    await authenticateApplicationSession(
      sessions,
      second.credential,
      new Date('2026-10-04T12:06:00Z'),
    ),
    null,
  );
});

test('idle and absolute expiry fail closed and persist EXPIRED best-effort', async () => {
  const issuedAt = new Date('2026-10-04T00:00:00Z');
  await identities.create({ id: 'identity-1', now: issuedAt });

  const idle = await issueApplicationSession(sessions, {
    id: 'session-idle',
    identityId: 'identity-1',
    now: issuedAt,
  });
  assert.equal(
    await authenticateApplicationSession(
      sessions,
      idle.credential,
      new Date(issuedAt.getTime() + 30 * 60 * 1000),
    ),
    null,
  );
  assert.equal(
    (await sessions.getById({
      id: 'session-idle',
      identityId: 'identity-1',
    }))?.status,
    'EXPIRED',
  );

  const absoluteStart = new Date('2026-10-05T00:00:00Z');
  const absolute = await issueApplicationSession(sessions, {
    id: 'session-absolute',
    identityId: 'identity-1',
    now: absoluteStart,
  });
  assert.equal(
    await authenticateApplicationSession(
      sessions,
      absolute.credential,
      new Date(absoluteStart.getTime() + 12 * 60 * 60 * 1000),
    ),
    null,
  );
});

test('database guards reject DELETED ingress and terminal session reactivation', async () => {
  const now = new Date('2026-10-04T12:00:00Z');
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
  assert.equal(
    rows.rows.some((row) => forbidden.test(row.column_name)),
    false,
  );
  assert.equal(
    rows.rows.some((row) => row.column_name === 'credential'),
    false,
  );
});
