import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { join, resolve } from 'node:path';
import { createAuthoringPredecessorCopy } from '../tests/authoring-proof-copy.mjs';
import { inspectAuthoringPhysicalSuccessor } from '../persistence/demo-authoring-physical-successor.mjs';
import { assertIsolatedDatabaseTarget } from './isolated-database-target.mjs';

const root = resolve(process.cwd());
assertIsolatedDatabaseTarget(process.env.DATABASE_URL);
assert.ok(process.env.TEACH_DB_SCHEMA === undefined || process.env.TEACH_DB_SCHEMA === 'teach_v2_demo', 'conflicting schema mode is not admitted');
const proof = inspectAuthoringPhysicalSuccessor(root);
assert.equal(proof.admitted, true); assert.deepEqual(proof.errors, []);
const copy = createAuthoringPredecessorCopy(root);
try {
  // Original entrypoint and all imports are restored before this fresh process.
  // Its eight-migration/22-table/39-function assertions are not reinterpreted.
  execFileSync(process.execPath, ['--import', 'tsx', join(copy.root, 'scripts/db/run-isolated-schema-proof.ts')], { cwd: copy.root, env: { ...process.env, TEACH_DB_SCHEMA: 'teach_v2_demo' }, stdio: 'inherit', timeout: 25000 });
} finally { copy.remove(); }
