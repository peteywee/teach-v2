import assert from 'node:assert/strict';
import { assertIsolatedDatabaseTarget } from './isolated-database-target.mjs';
import { verifyIsolatedSchemaProof } from './verify-isolated-schema.mjs';
import { exerciseRuntime } from './exercise-isolated-schema-runtime.js';

assertIsolatedDatabaseTarget(process.env.DATABASE_URL);
assert.equal(process.env.TEACH_DB_SCHEMA, 'teach_v2_demo', 'TEACH_DB_SCHEMA=teach_v2_demo is required at process start');
await verifyIsolatedSchemaProof({ exerciseRuntime });
