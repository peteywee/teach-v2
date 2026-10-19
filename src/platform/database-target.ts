import { pgSchema, pgTable as publicTable, type PgTableFn } from 'drizzle-orm/pg-core';

/** Schema selection is composition metadata, never permission to activate a host
 * or connect to a database. The existing local URL/activation gates still apply.
 * Fixed at module load so Drizzle and raw SQL cannot select different targets. */
export function parseDatabaseSchema(value: string | undefined): 'public' | 'teach_v2_demo' {
  if (value === undefined || value === 'public') return 'public';
  if (value === 'teach_v2_demo') return value;
  throw new Error('Unsupported TEACH_DB_SCHEMA; expected public or teach_v2_demo');
}
export const databaseSchema = parseDatabaseSchema(process.env.TEACH_DB_SCHEMA);
const isolatedSchema = pgSchema('teach_v2_demo');
export const pgTable: PgTableFn<'teach_v2_demo' | undefined> = databaseSchema === 'teach_v2_demo' ? isolatedSchema.table : publicTable;

/** Only trusted source literals belong here. Values remain separately bound. */
export function databaseObject(name: string): string {
  if (!/^[a-z][a-z0-9_]*$/.test(name)) throw new Error('Invalid database object identifier');
  return databaseSchema === 'public' ? name : `"${databaseSchema}"."${name}"`;
}

/** Qualify PostgreSQL builtins too: an explicitly hostile search_path can put
 * user schemas before pg_catalog. SQL grammar constructs are not functions. */
export function databaseFunction(name: string): string {
  if (!['clock_timestamp','pg_advisory_xact_lock','hashtext','hashtextextended','count','max','ceil','json_build_object'].includes(name)) throw new Error('Unregistered database builtin');
  return databaseSchema === 'public' ? name : `"pg_catalog"."${name}"`;
}
