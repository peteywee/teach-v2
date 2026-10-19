import {verifyManualProbesLocally} from './manual-apply/probe-local-check.mjs';
import assert from 'node:assert/strict';
import {assertIsolatedDatabaseTarget} from './isolated-database-target.mjs';
import {verifyIsolatedSchemaProof} from './verify-isolated-schema.mjs';
import {exerciseRuntime} from './exercise-successor-runtime.js';
assertIsolatedDatabaseTarget(process.env.DATABASE_URL);
assert.equal(process.env.TEACH_DB_SCHEMA,'teach_v2_demo');
await verifyManualProbesLocally();
await verifyIsolatedSchemaProof({exerciseRuntime});
