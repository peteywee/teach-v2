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
