import type pg from 'pg';
export function applyIsolatedSchemaMigrations(pool: pg.Pool, env?: NodeJS.ProcessEnv): Promise<{ schema: string; applied: number; total: number }>;
