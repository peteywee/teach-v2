import type pg from 'pg';
export function verifyIsolatedSchemaProof(options?: { exerciseRuntime?: (context: { pool: pg.Pool; connectionString: string }) => Promise<void> }): Promise<Record<string, unknown>>;
