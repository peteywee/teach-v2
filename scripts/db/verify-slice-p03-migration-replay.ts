import { assertIsolatedDatabaseTarget } from './isolated-database-target.mjs';
import { createHash } from 'node:crypto';
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';

const { Pool } = pg;
const connectionString = assertIsolatedDatabaseTarget(process.env.DATABASE_URL);
if (!connectionString) throw new Error('DATABASE_URL is required');

const migrationsFolder = resolve(process.env.MIGRATIONS_FOLDER ?? 'drizzle');
const baseUrl = new URL(connectionString);
const adminUrl = new URL(connectionString);
adminUrl.pathname = '/postgres';
const suffix = String(process.pid);
const names = {
  first: `teach_v2_p03_a_${suffix}`,
  second: `teach_v2_p03_b_${suffix}`,
  upgrade: `teach_v2_p03_upgrade_${suffix}`,
};
const admin = new Pool({ connectionString: adminUrl.toString() });
const p02Folder = resolve(`/tmp/teach-v2-p02-${suffix}`);
const p03Folder = resolve(`/tmp/teach-v2-p03-${suffix}`);

try {
  prepareP03Folder(p03Folder);

  for (const name of Object.values(names)) {
    await dropDatabase(name);
    await admin.query(`create database ${quoteIdent(name)}`);
  }

  const [first, second] = await Promise.all([
    migrateAndFingerprint(names.first, p03Folder),
    migrateAndFingerprint(names.second, p03Folder),
  ]);
  if (first !== second) {
    throw new Error(`two-empty-database replay diverged: ${first} != ${second}`);
  }

  prepareP02Folder(p02Folder);
  const pool = new Pool({ connectionString: databaseUrl(names.upgrade) });
  try {
    await migrate(drizzle(pool), { migrationsFolder: p02Folder });
    const p02 = await publicTables(pool);
    assertTables(
      p02,
      [
        'identity_application_sessions',
        'identity_identities',
        'transaction_control_reconciliation_records',
      ],
      'P02 baseline',
    );
    await migrate(drizzle(pool), { migrationsFolder: p03Folder });
    const upgraded = await fingerprint(pool);
    if (upgraded !== first) {
      throw new Error(`P02 -> P03 upgrade fingerprint diverged: ${upgraded} != ${first}`);
    }
  } finally {
    await pool.end();
  }

  console.log('SLICE-P03 MIGRATION REPLAY PASS');
  console.log('P03 migration prefix pinned through 0002_quick_venus');
  console.log('two independent empty databases: identical');
  console.log('P02 -> P03 migration: identical');
  console.log(`schema fingerprint: ${first}`);
} finally {
  rmSync(p02Folder, { recursive: true, force: true });
  rmSync(p03Folder, { recursive: true, force: true });
  for (const name of Object.values(names)) await dropDatabase(name);
  await admin.end();
}

function prepareP03Folder(target: string): void {
  mkdirSync(join(target, 'meta'), { recursive: true });
  for (const name of [
    '0000_slice_p01_reconciliation.sql',
    '0001_odd_photon.sql',
    '0002_quick_venus.sql',
  ]) {
    cpSync(resolve('drizzle', name), join(target, name));
  }
  const journal = JSON.parse(readFileSync(resolve('drizzle/meta/_journal.json'), 'utf8'));
  journal.entries = journal.entries.filter((entry: { idx: number }) => entry.idx <= 2);
  writeFileSync(join(target, 'meta', '_journal.json'), JSON.stringify(journal, null, 2) + '\n');
}

function prepareP02Folder(target: string): void {
  mkdirSync(join(target, 'meta'), { recursive: true });
  cpSync(resolve('drizzle/0000_slice_p01_reconciliation.sql'), join(target, '0000_slice_p01_reconciliation.sql'));
  cpSync(resolve('drizzle/0001_odd_photon.sql'), join(target, '0001_odd_photon.sql'));
  const journal = JSON.parse(readFileSync(resolve('drizzle/meta/_journal.json'), 'utf8'));
  journal.entries = journal.entries.filter((entry: { idx: number }) => entry.idx <= 1);
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
      'identity_identities',
      'identity_invitations',
      'identity_password_reset_tokens',
      'identity_setup_tokens',
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
        (p.proname like 'identity_%' or p.proname like 'transaction_control_%')
      order by p.proname`,
  );

  return createHash('sha256')
    .update(JSON.stringify({tables,columns:columns.rows,constraints:constraints.rows,indexes:indexes.rows,triggers:triggers.rows,functions:functions.rows}))
    .digest('hex');
}
