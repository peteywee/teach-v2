import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import pg from 'pg';
import { assertIsolatedDatabaseTarget } from './isolated-database-target.mjs';
import { ISOLATED_SCHEMA, verifyIsolatedLineage } from './compile-isolated-schema.mjs';

const JOURNAL = '"teach_v2_demo"."__drizzle_migrations"';

/**
 * Local-only, atomic application of the separately committed isolated lineage.
 * Do not substitute the historical drizzle folder or set search_path as routing.
 * No credentials, login roles, runtime grants or external schemas are changed.
 */
export async function applyIsolatedSchemaMigrations(pool, env = process.env) {
  const connectionString = assertIsolatedDatabaseTarget(pool.options.connectionString, env);
  const target = new URL(connectionString);
  // pg currently lets parsed URL fields override these options, but rejecting
  // contradictory configuration is safer than relying on driver precedence.
  const expected = { host: target.hostname.replace(/^\[|\]$/g, ''), database: target.pathname.slice(1), port: target.port || '5432', user: decodeURIComponent(target.username) };
  for (const [key, value] of Object.entries(expected)) {
    if (pool.options[key] === undefined) continue;
    const supplied = key === 'host' ? String(pool.options[key]).replace(/^\[|\]$/g, '') : String(pool.options[key]);
    assert.equal(supplied, value, `Database execution BLOCKED: conflicting pool ${key} override`);
  }
  assert.equal(pool.options.stream, undefined, 'Database execution BLOCKED: custom connection streams are not admitted');
  const { manifest, files } = verifyIsolatedLineage();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const actual = (await client.query('SELECT pg_catalog.host(pg_catalog.inet_server_addr()) AS host, pg_catalog.current_database() AS database')).rows[0];
    assert.ok(['127.0.0.1', '::1'].includes(actual.host) && actual.database === expected.database, 'connected target does not match the isolated loopback database');
    await client.query("SET LOCAL lock_timeout = '3s'");
    await client.query("SET LOCAL statement_timeout = '10s'");
    await client.query('SELECT pg_catalog.pg_advisory_xact_lock(737304, 29017)');
    const namespace = await client.query('SELECT nspowner = (SELECT oid FROM pg_catalog.pg_roles WHERE rolname = current_user) AS owned FROM pg_catalog.pg_namespace WHERE nspname = $1', [ISOLATED_SCHEMA]);
    if (namespace.rows.length === 0) {
      await client.query('CREATE SCHEMA "teach_v2_demo"');
      // Drizzle-compatible journal columns, but no unscoped drizzle/public journal.
      await client.query(`CREATE TABLE ${JOURNAL} (id serial PRIMARY KEY, hash text NOT NULL, created_at bigint NOT NULL UNIQUE)`);
      await client.query('REVOKE ALL ON SCHEMA "teach_v2_demo" FROM PUBLIC');
    } else {
      assert.equal(namespace.rows[0].owned, true, 'isolated schema is not owned by the current migration role');
      const existingJournal = await client.query("SELECT pg_catalog.to_regclass('teach_v2_demo.__drizzle_migrations') IS NOT NULL AS present");
      assert.equal(existingJournal.rows[0].present, true, 'existing isolated namespace lacks a verified journal; refusing adoption');
    }
    const applied = await client.query(`SELECT id, hash, created_at::text FROM ${JOURNAL} ORDER BY id`);
    assert.ok(applied.rows.length <= manifest.migrations.length, 'unknown isolated journal suffix');
    for (const [index, row] of applied.rows.entries()) {
      const expected = manifest.migrations[index];
      assert.equal(row.id, index + 1, 'isolated journal ordering mismatch');
      assert.equal(row.hash, expected.isolatedSha256, 'isolated journal hash mismatch');
      assert.equal(row.created_at, String(expected.when), 'isolated journal timestamp mismatch');
    }
    if (namespace.rows.length > 0 && applied.rows.length === 0) throw new Error('empty journal in an existing namespace; refusing unverified adoption');
    for (let index = applied.rows.length; index < manifest.migrations.length; index++) {
      const migration = manifest.migrations[index];
      // Execute exact committed bytes. All remapping happened offline and is
      // checked byte-for-byte above; no replacement or schema rewriting here.
      for (const statement of files.get(migration.name).split('--> statement-breakpoint')) {
        if (statement.trim()) await client.query(statement);
      }
      await client.query(`INSERT INTO ${JOURNAL} (hash, created_at) VALUES ($1, $2)`, [migration.isolatedSha256, migration.when]);
    }
    await client.query('COMMIT');
    return { schema: ISOLATED_SCHEMA, applied: manifest.migrations.length - applied.rows.length, total: manifest.migrations.length };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const connectionString = assertIsolatedDatabaseTarget(process.env.DATABASE_URL);
  const pool = new pg.Pool({ connectionString });
  try {
    const result = await applyIsolatedSchemaMigrations(pool);
    console.log(`ISOLATED SCHEMA MIGRATIONS PASS: ${JSON.stringify(result)}`);
  } finally { await pool.end(); }
}
