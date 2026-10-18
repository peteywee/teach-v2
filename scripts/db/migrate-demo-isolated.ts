import { assertIsolatedDatabaseTarget } from './isolated-database-target.mjs';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { drizzle } from 'drizzle-orm/node-postgres';
import { pathToFileURL } from 'node:url';
import pg from 'pg';
/** The caller owns a disposable loopback pool. No import-time database access. */
export async function applyDemoMigrations(pool: pg.Pool, migrationsFolder = 'drizzle'): Promise<void> {
 await migrate(drizzle(pool), { migrationsFolder });
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
 const pool = new pg.Pool({connectionString:assertIsolatedDatabaseTarget(process.env.DATABASE_URL)});
 try { await applyDemoMigrations(pool); console.log('Isolated demo migrations applied'); } finally { await pool.end(); }
}
