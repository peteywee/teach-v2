import { createHash } from 'node:crypto';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';

const { Pool } = pg;
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is required');
}

const tableName = 'transaction_control_reconciliation_records';
const pool = new Pool({ connectionString });

try {
  const before = await pool.query<{ table_name: string | null }>(
    "select to_regclass('public.transaction_control_reconciliation_records')::text as table_name",
  );
  if (before.rows[0]?.table_name !== null) {
    throw new Error('migration replay requires an empty SLICE-P01 application schema');
  }

  const db = drizzle(pool);
  await migrate(db, { migrationsFolder: 'drizzle' });
  const first = await fingerprint(pool);

  await migrate(db, { migrationsFolder: 'drizzle' });
  const second = await fingerprint(pool);

  if (first !== second) {
    throw new Error(
      `migration replay is not deterministic: first=${first} second=${second}`,
    );
  }

  console.log('SLICE-P01 empty-database migration replay PASS');
  console.log(`schema fingerprint: ${first}`);
} finally {
  await pool.end();
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

  return createHash('sha256')
    .update(
      JSON.stringify({
        columns: columns.rows,
        constraints: constraints.rows,
        indexes: indexes.rows,
        triggers: triggers.rows,
      }),
    )
    .digest('hex');
}
