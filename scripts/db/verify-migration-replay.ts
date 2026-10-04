import { assertIsolatedDatabaseTarget } from './isolated-database-target.mjs';
import { createHash } from 'node:crypto';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';

const { Pool } = pg;
const connectionString = assertIsolatedDatabaseTarget(process.env.DATABASE_URL);
if (!connectionString) {
  throw new Error('DATABASE_URL is required');
}

const tableName = 'transaction_control_reconciliation_records';
const baseUrl = new URL(connectionString);
const adminUrl = new URL(connectionString);
adminUrl.pathname = '/postgres';

const suffix = String(process.pid);
const dbNames = [
  `teach_v2_replay_a_${suffix}`,
  `teach_v2_replay_b_${suffix}`,
] as const;

const admin = new Pool({ connectionString: adminUrl.toString() });

try {
  for (const name of dbNames) {
    await dropDatabase(name);
    await admin.query(`create database ${quoteIdent(name)}`);
  }

  const [first, second] = await Promise.all(
    dbNames.map(async (name) => {
      const url = new URL(baseUrl);
      url.pathname = `/${name}`;
      const pool = new Pool({ connectionString: url.toString() });
      try {
        const db = drizzle(pool);
        await migrate(db, { migrationsFolder: 'drizzle' });
        return await fingerprint(pool);
      } finally {
        await pool.end();
      }
    }),
  );

  if (first !== second) {
    throw new Error(
      `migration replay is not deterministic: first=${first} second=${second}`,
    );
  }

  console.log('SLICE-P01 independent empty-database migration replay PASS');
  console.log(`schema fingerprint: ${first}`);
} finally {
  for (const name of dbNames) {
    await dropDatabase(name);
  }
  await admin.end();
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
  if (!/^[a-z0-9_]+$/i.test(value)) {
    throw new Error('unsafe database identifier');
  }
  return '"' + value.replaceAll('"', '""') + '"';
}

async function fingerprint(pool: pg.Pool): Promise<string> {
  const columns = await pool.query(
    `select column_name, data_type, is_nullable, column_default
       from information_schema.columns
      where table_schema = 'public' and table_name = $1
      order by ordinal_position`,
    [tableName],
  );

  const expectedColumns = [
    'id',
    'status',
    'outcome',
    'operation_name',
    'scope_fingerprint',
    'authoritative_scope',
    'provider_name',
    'provider_reference',
    'provider_detail',
    'last_readback_at',
    'last_readback_error',
    'idempotency_key',
    'idempotency_key_source',
    'payload_hash',
    'retry_horizon_ends_at',
    'idempotency_retention_until',
    'created_at',
    'updated_at',
    'resolved_at',
  ];

  const actualColumns = columns.rows.map((row) => row.column_name);
  if (JSON.stringify(actualColumns) !== JSON.stringify(expectedColumns)) {
    throw new Error(
      `unexpected SLICE-P01 columns: ${JSON.stringify(actualColumns)}`,
    );
  }

  const constraints = await pool.query(
    `select conname, pg_get_constraintdef(c.oid, true) as definition
       from pg_constraint c
       join pg_class t on t.oid = c.conrelid
       join pg_namespace n on n.oid = t.relnamespace
      where n.nspname = 'public' and t.relname = $1
      order by conname`,
    [tableName],
  );

  const indexes = await pool.query(
    `select indexname, indexdef
       from pg_indexes
      where schemaname = 'public' and tablename = $1
      order by indexname`,
    [tableName],
  );

  const triggers = await pool.query(
    `select tgname, pg_get_triggerdef(t.oid, true) as definition
       from pg_trigger t
       join pg_class c on c.oid = t.tgrelid
       join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public'
        and c.relname = $1
        and not t.tgisinternal
      order by tgname`,
    [tableName],
  );

  const functions = await pool.query(
    `select p.proname, pg_get_functiondef(p.oid) as definition
       from pg_proc p
       join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public'
        and p.proname = 'transaction_control_guard_reconciliation_record_update'
      order by p.proname`,
  );

  for (const required of [
    'transaction_control_reconciliation_status_outcome_check',
    'transaction_control_reconciliation_idempotency_binding_check',
    'transaction_control_reconciliation_nonblank_check',
  ]) {
    if (!constraints.rows.some((row) => row.conname === required)) {
      throw new Error(`missing constraint ${required}`);
    }
  }

  for (const required of [
    'transaction_control_reconciliation_status_idx',
    'transaction_control_reconciliation_scope_idx',
    'transaction_control_reconciliation_idempotency_key_idx',
  ]) {
    if (!indexes.rows.some((row) => row.indexname === required)) {
      throw new Error(`missing index ${required}`);
    }
  }

  if (
    !triggers.rows.some(
      (row) =>
        row.tgname ===
        'transaction_control_guard_reconciliation_record_update_trigger',
    )
  ) {
    throw new Error('missing reconciliation update guard trigger');
  }

  if (functions.rows.length !== 1) {
    throw new Error('missing reconciliation guard function definition');
  }

  return createHash('sha256')
    .update(
      JSON.stringify({
        columns: columns.rows,
        constraints: constraints.rows,
        indexes: indexes.rows,
        triggers: triggers.rows,
        functions: functions.rows,
      }),
    )
    .digest('hex');
}
