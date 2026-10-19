// Historical public lineage must never consume isolated-schema table definitions.
if (process.env.TEACH_DB_SCHEMA && process.env.TEACH_DB_SCHEMA !== 'public') throw new Error('Use the separately verified isolated-schema lineage; public generation is blocked');
import { defineConfig } from 'drizzle-kit';

const url =
  process.env.DATABASE_URL ??
  'postgresql://postgres:postgres@127.0.0.1:5432/teach_v2';

export default defineConfig({
  schema: ['./src/bootstrap/demo/demo-persistence-schema.ts'],
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: { url },
  strict: true,
  verbose: true,
});
