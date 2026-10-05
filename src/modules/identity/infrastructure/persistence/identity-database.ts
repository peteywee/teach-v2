import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type * as schema from './schema.js';

// Both a root database and its transaction expose these owner-private methods.
export type IdentityDatabase = Pick<NodePgDatabase<typeof schema>, 'select' | 'insert' | 'update' | 'execute' | 'transaction'>;
