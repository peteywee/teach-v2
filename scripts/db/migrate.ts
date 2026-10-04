import { assertIsolatedDatabaseTarget } from './isolated-database-target.mjs';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';

const { Pool } = pg;
const connectionString = assertIsolatedDatabaseTarget(process.env.DATABASE_URL);
if (!connectionString) {
  throw new Error('DATABASE_URL is required');
}

const pool = new Pool({ connectionString });

try {
  const db = drizzle(pool);
  await migrate(db, {
    migrationsFolder: process.env.MIGRATIONS_FOLDER ?? 'drizzle',
  });
  console.log('Drizzle migrations applied');
} finally {
  await pool.end();
}
