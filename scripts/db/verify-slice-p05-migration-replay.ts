import { createHash } from 'node:crypto';
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';

const { Pool } = pg;
const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL is required');
if (process.env.TEACH_ISOLATED_DB !== '1') throw new Error('P05 replay requires explicitly isolated test databases');

const migrationsFolder = resolve(process.env.MIGRATIONS_FOLDER ?? 'drizzle');
const baseUrl = new URL(connectionString);
const adminUrl = new URL(connectionString);
adminUrl.pathname = '/postgres';
const suffix = String(process.pid);
const names = {
  first: `teach_v2_p05_a_${suffix}`,
  second: `teach_v2_p05_b_${suffix}`,
  upgrade: `teach_v2_p05_upgrade_${suffix}`,
};
const admin = new Pool({ connectionString: adminUrl.toString() });
const prefixFolder = resolve(`/tmp/teach-v2-p04-prefix-${suffix}`);
const fullFolder = resolve(`/tmp/teach-v2-p05-${suffix}`);

try {
  prepareFullFolder(fullFolder);

  for (const name of Object.values(names)) {
    await dropDatabase(name);
    await admin.query(`create database ${quoteIdent(name)}`);
  }

  const [first, second] = await Promise.all([
    migrateAndFingerprint(names.first, fullFolder),
    migrateAndFingerprint(names.second, fullFolder),
  ]);
  if (first !== second) {
    throw new Error(`two-empty-database replay diverged: ${first} != ${second}`);
  }

  preparePrefixFolder(prefixFolder);
  const pool = new Pool({ connectionString: databaseUrl(names.upgrade) });
  try {
    await migrate(drizzle(pool), { migrationsFolder: prefixFolder });
    assertTables(
      await publicTables(pool),
      [
        'identity_application_sessions',
        'identity_credentials',
        'identity_identities',
        'identity_invitations',
        'identity_password_reset_tokens',
        'identity_setup_tokens',
        'transaction_control_reconciliation_records',
      ],
      'P04 baseline',
    );

    await migrate(drizzle(pool), { migrationsFolder: fullFolder });
    const upgraded = await fingerprint(pool);
    if (upgraded !== first) {
      throw new Error(`P04 -> P05 upgrade fingerprint diverged: ${upgraded} != ${first}`);
    }
  } finally {
    await pool.end();
  }

  console.log('SLICE-P05 MIGRATION REPLAY PASS');
  console.log('P05 migration prefix pinned through 0004_slice_p05_learning_session');
  console.log('two independent empty databases: identical');
  console.log('P04 -> P05 migration: identical');
  console.log(`schema fingerprint: ${first}`);
} finally {
  rmSync(prefixFolder, { recursive: true, force: true });
  rmSync(fullFolder, { recursive: true, force: true });
  for (const name of Object.values(names)) await dropDatabase(name);
  await admin.end();
}

function prepareFullFolder(target: string): void {
  mkdirSync(join(target, 'meta'), { recursive: true });
  for (const name of [
    '0000_slice_p01_reconciliation.sql',
    '0001_odd_photon.sql',
    '0002_quick_venus.sql',
    '0003_slice_p04_credential.sql',
    '0004_slice_p05_learning_session.sql',
  ]) {
    cpSync(resolve('drizzle', name), join(target, name));
  }
  const journal = JSON.parse(readFileSync(resolve('drizzle/meta/_journal.json'), 'utf8'));
  journal.entries = journal.entries.filter((entry: { idx: number }) => entry.idx <= 4);
  writeFileSync(join(target, 'meta', '_journal.json'), JSON.stringify(journal, null, 2) + '\n');
}

function preparePrefixFolder(target: string): void {
  mkdirSync(join(target, 'meta'), { recursive: true });
  for (const name of [
    '0000_slice_p01_reconciliation.sql',
    '0001_odd_photon.sql',
    '0002_quick_venus.sql',
    '0003_slice_p04_credential.sql',
  ]) {
    cpSync(resolve('drizzle', name), join(target, name));
  }
  for (const name of ['0000_snapshot.json', '0001_snapshot.json', '0002_snapshot.json']) {
    cpSync(resolve('drizzle/meta', name), join(target, 'meta', name));
  }
  const journal = JSON.parse(readFileSync(resolve('drizzle/meta/_journal.json'), 'utf8'));
  journal.entries = journal.entries.filter((entry: { idx: number }) => entry.idx <= 3);
  writeFileSync(join(target, 'meta', '_journal.json'), JSON.stringify(journal, null, 2) + '\n');
}

async function migrateAndFingerprint(name: string, folder: string): Promise<string> {
  const pool = new Pool({ connectionString: databaseUrl(name) });
  try {
    await migrate(drizzle(pool), { migrationsFolder: folder });
    return await fingerprint(pool);
  } finally {
    await pool.end();
  }
}

function databaseUrl(name: string): string {
  const url = new URL(baseUrl);
  url.pathname = `/${name}`;
  return url.toString();
}

async function dropDatabase(name: string): Promise<void> {
  await admin.query(
    `select pg_terminate_backend(pid) from pg_stat_activity where datname=$1 and pid<>pg_backend_pid()`,
    [name],
  );
  await admin.query(`drop database if exists ${quoteIdent(name)}`);
}

function quoteIdent(value: string): string {
  if (!/^[a-z0-9_]+$/i.test(value)) throw new Error('unsafe database identifier');
  return '"' + value + '"';
}

async function publicTables(pool: pg.Pool): Promise<string[]> {
  const rows = await pool.query<{ tablename: string }>(
    `select tablename from pg_tables where schemaname='public' order by tablename`,
  );
  return rows.rows.map((row) => row.tablename);
}

function assertTables(actual: string[], expected: string[], label: string): void {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`${label}: unexpected tables ${JSON.stringify(actual)}`);
  }
}

async function fingerprint(pool: pg.Pool): Promise<string> {
  const tables = await publicTables(pool);
  assertTables(
    tables,
    [
      'identity_application_sessions',
      'identity_credentials',
      'identity_identities',
      'identity_invitations',
      'identity_password_reset_tokens',
      'identity_setup_tokens',
      'learning_sessions',
      'transaction_control_reconciliation_records',
    ],
    'full schema',
  );

  const columns = await pool.query(
    `select table_name,ordinal_position,column_name,data_type,is_nullable,column_default
       from information_schema.columns
      where table_schema='public' and table_name=any($1::text[])
      order by table_name,ordinal_position`,
    [tables],
  );
  const constraints = await pool.query(
    `select t.relname as table_name,c.conname,pg_get_constraintdef(c.oid,true) as definition
       from pg_constraint c
       join pg_class t on t.oid=c.conrelid
       join pg_namespace n on n.oid=t.relnamespace
      where n.nspname='public' and t.relname=any($1::text[])
      order by t.relname,c.conname`,
    [tables],
  );
  const indexes = await pool.query(
    `select tablename,indexname,indexdef from pg_indexes
      where schemaname='public' and tablename=any($1::text[])
      order by tablename,indexname`,
    [tables],
  );
  const triggers = await pool.query(
    `select c.relname as table_name,t.tgname,pg_get_triggerdef(t.oid,true) as definition
       from pg_trigger t
       join pg_class c on c.oid=t.tgrelid
       join pg_namespace n on n.oid=c.relnamespace
      where n.nspname='public' and c.relname=any($1::text[]) and not t.tgisinternal
      order by c.relname,t.tgname`,
    [tables],
  );
  const functions = await pool.query(
    `select p.proname,pg_get_functiondef(p.oid) as definition
       from pg_proc p join pg_namespace n on n.oid=p.pronamespace
      where n.nspname='public' and
        (p.proname like 'identity_%' or p.proname like 'transaction_control_%' or p.proname like 'learning_%')
      order by p.proname`,
  );

  return createHash('sha256')
    .update(JSON.stringify({
      tables,
      columns: columns.rows,
      constraints: constraints.rows,
      indexes: indexes.rows,
      triggers: triggers.rows,
      functions: functions.rows,
    }))
    .digest('hex');
}
