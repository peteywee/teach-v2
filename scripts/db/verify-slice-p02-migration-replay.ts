import { createHash } from 'node:crypto';
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';

const { Pool } = pg;
const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL is required');

const migrationsFolder = resolve(process.env.MIGRATIONS_FOLDER ?? 'drizzle');
const baseUrl = new URL(connectionString);
const adminUrl = new URL(connectionString);
adminUrl.pathname = '/postgres';
const suffix = String(process.pid);
const names = {
  first: `teach_v2_p02_a_${suffix}`,
  second: `teach_v2_p02_b_${suffix}`,
  upgrade: `teach_v2_p02_upgrade_${suffix}`,
};
const admin = new Pool({ connectionString: adminUrl.toString() });
const p01Folder = resolve(`/tmp/teach-v2-p01-${suffix}`);
const p02Folder = resolve(`/tmp/teach-v2-p02-${suffix}`);

try {
  prepareP02Folder(p02Folder, migrationsFolder);

  for (const name of Object.values(names)) {
    await dropDatabase(name);
    await admin.query(`create database ${quoteIdent(name)}`);
  }

  const [first, second] = await Promise.all([
    migrateAndFingerprint(names.first, p02Folder),
    migrateAndFingerprint(names.second, p02Folder),
  ]);
  if (first !== second) {
    throw new Error(`two-empty-database replay diverged: ${first} != ${second}`);
  }

  prepareP01Folder(p01Folder);
  const upgradeUrl = databaseUrl(names.upgrade);
  const upgradePool = new Pool({ connectionString: upgradeUrl });
  try {
    await migrate(drizzle(upgradePool), { migrationsFolder: p01Folder });
    const p01Tables = await publicTables(upgradePool);
    assertTables(p01Tables, ['transaction_control_reconciliation_records'], 'P01 baseline');

    await migrate(drizzle(upgradePool), { migrationsFolder: p02Folder });
    const upgraded = await fingerprint(upgradePool);
    if (upgraded !== first) {
      throw new Error(`P01 -> P02 upgrade fingerprint diverged: ${upgraded} != ${first}`);
    }
  } finally {
    await upgradePool.end();
  }

  console.log('SLICE-P02 MIGRATION REPLAY PASS');
  console.log('P02 migration prefix pinned through 0001_odd_photon');
  console.log('two independent empty databases: identical');
  console.log('P01 -> P02 pending migration: identical');
  console.log(`schema fingerprint: ${first}`);
} finally {
  rmSync(p01Folder, { recursive: true, force: true });
  rmSync(p02Folder, { recursive: true, force: true });
  for (const name of Object.values(names)) await dropDatabase(name);
  await admin.end();
}

function prepareP02Folder(target: string, source: string): void {
  mkdirSync(join(target, 'meta'), { recursive: true });
  for (const migration of [
    '0000_slice_p01_reconciliation.sql',
    '0001_odd_photon.sql',
  ]) {
    cpSync(join(source, migration), join(target, migration));
  }

  const sourceJournal = JSON.parse(
    readFileSync(join(source, 'meta', '_journal.json'), 'utf8'),
  ) as {
    version: string;
    dialect: string;
    entries: Array<{
      idx: number;
      version: string;
      when: number;
      tag: string;
      breakpoints: boolean;
    }>;
  };
  const entries = sourceJournal.entries.slice(0, 2);
  if (
    entries.length !== 2 ||
    entries[0]?.idx !== 0 ||
    entries[0]?.tag !== '0000_slice_p01_reconciliation' ||
    entries[1]?.idx !== 1 ||
    entries[1]?.tag !== '0001_odd_photon'
  ) {
    throw new Error('P02 migration prefix no longer matches the admitted 0000/0001 history');
  }

  writeFileSync(
    join(target, 'meta', '_journal.json'),
    JSON.stringify(
      {
        version: sourceJournal.version,
        dialect: sourceJournal.dialect,
        entries,
      },
      null,
      2,
    ) + '\n',
  );
}

function prepareP01Folder(target: string): void {
  mkdirSync(join(target, 'meta'), { recursive: true });
  cpSync(
    resolve('drizzle/0000_slice_p01_reconciliation.sql'),
    join(target, '0000_slice_p01_reconciliation.sql'),
  );
  const journal = {
    version: '7',
    dialect: 'postgresql',
    entries: [
      {
        idx: 0,
        version: '7',
        when: 1791115200000,
        tag: '0000_slice_p01_reconciliation',
        breakpoints: true,
      },
    ],
  };
  writeFileSync(
    join(target, 'meta', '_journal.json'),
    JSON.stringify(journal, null, 2) + '\n',
  );
}

async function migrateAndFingerprint(
  name: string,
  folder: string,
): Promise<string> {
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
    `select pg_terminate_backend(pid)
       from pg_stat_activity
      where datname = $1 and pid <> pg_backend_pid()`,
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
    `select tablename
       from pg_tables
      where schemaname = 'public'
      order by tablename`,
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
      'transaction_control_reconciliation_records',
    ],
    'full schema',
  );

  const columns = await pool.query(
    `select table_name, ordinal_position, column_name, data_type, is_nullable, column_default
       from information_schema.columns
      where table_schema = 'public'
        and table_name = any($1::text[])
      order by table_name, ordinal_position`,
    [tables],
  );
  const constraints = await pool.query(
    `select t.relname as table_name, c.conname,
            pg_get_constraintdef(c.oid, true) as definition
       from pg_constraint c
       join pg_class t on t.oid = c.conrelid
       join pg_namespace n on n.oid = t.relnamespace
      where n.nspname = 'public' and t.relname = any($1::text[])
      order by t.relname, c.conname`,
    [tables],
  );
  const indexes = await pool.query(
    `select tablename, indexname, indexdef
       from pg_indexes
      where schemaname = 'public' and tablename = any($1::text[])
      order by tablename, indexname`,
    [tables],
  );
  const triggers = await pool.query(
    `select c.relname as table_name, t.tgname,
            pg_get_triggerdef(t.oid, true) as definition
       from pg_trigger t
       join pg_class c on c.oid = t.tgrelid
       join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public'
        and c.relname = any($1::text[])
        and not t.tgisinternal
      order by c.relname, t.tgname`,
    [tables],
  );
  const functions = await pool.query(
    `select p.proname, pg_get_functiondef(p.oid) as definition
       from pg_proc p
       join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public'
        and (p.proname like 'identity_%' or p.proname like 'transaction_control_%')
      order by p.proname`,
  );

  return createHash('sha256')
    .update(
      JSON.stringify({
        tables,
        columns: columns.rows,
        constraints: constraints.rows,
        indexes: indexes.rows,
        triggers: triggers.rows,
        functions: functions.rows,
      }),
    )
    .digest('hex');
}
