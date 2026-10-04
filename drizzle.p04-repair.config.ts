import { defineConfig } from 'drizzle-kit';

const url =
  process.env.DATABASE_URL ??
  'postgresql://postgres:postgres@127.0.0.1:5432/teach_v2';

export default defineConfig({
  schema: [
    './src/modules/transaction-control/infrastructure/persistence/schema.ts',
    './src/modules/identity/infrastructure/persistence/schema.ts',
    './src/modules/identity/infrastructure/persistence/token-schema.ts',
    './src/modules/identity/infrastructure/persistence/credential-schema.ts',
  ],
  out: './.tmp-drizzle-p04-repair',
  dialect: 'postgresql',
  dbCredentials: { url },
  strict: true,
  verbose: true,
});
