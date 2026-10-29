import { createAuthoringPredecessorCopy } from '../tests/authoring-proof-copy.mjs';
import { randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import pg from 'pg';
import { assertIsolatedDatabaseTarget } from './isolated-database-target.mjs';
const target = assertIsolatedDatabaseTarget(process.env.DATABASE_URL);
const predecessor = createAuthoringPredecessorCopy(process.cwd());
const admin = new pg.Pool({ connectionString: target, connectionTimeoutMillis: 5000, statement_timeout: 5000 });
const name = 'teach_v2_demo_kitchen_ci_' + randomUUID().replaceAll('-', '');
let created = false;
try {
  await admin.query(`CREATE DATABASE ${name}`); created = true;
  const url = new URL(target); url.pathname = '/' + name;
  const connectionString = assertIsolatedDatabaseTarget(url.toString());
  execFileSync(process.execPath, ['--import', 'tsx', '--test', 'tests/integration/demo/kitchen-content-guard.test.ts'], {
    cwd: predecessor.root, env: { ...process.env, DATABASE_URL: connectionString, TEACH_ISOLATED_DB: '1' }, stdio: 'inherit', timeout: 20000,
  });
} finally {
  try { if (created) await admin.query(`DROP DATABASE ${name}`); }
  finally { try { await admin.end(); } finally { predecessor.remove(); } }
}
