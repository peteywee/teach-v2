// One CI-stage scope around the unchanged owned, host-network loopback fixture.
// No new target mode, container selection or migration authority is introduced.
import assert from 'node:assert/strict';
import { appendFileSync, mkdirSync } from 'node:fs';
import { isAbsolute, join, resolve } from 'node:path';
import { main as ownedFixtureMain } from './hosted-loopback-postgres.mjs';

export const ORIGINAL_SERVICE_URL = 'postgresql://postgres:postgres@127.0.0.1:5432/teach_v2';
export function kitchenFixtureEnvironment(env) {
  assert.equal(env.GITHUB_ACTIONS, 'true', 'GitHub disposable runner required');
  assert.match(env.GITHUB_RUN_ID ?? '', /^\d+$/);
  assert.match(env.GITHUB_RUN_ATTEMPT ?? '', /^\d+$/);
  assert.ok(isAbsolute(env.RUNNER_TEMP ?? ''), 'runner temporary directory required');
  assert.ok(isAbsolute(env.GITHUB_ENV ?? ''), 'runner environment file required');
  return { ...env, RUNNER_TEMP: join(env.RUNNER_TEMP, `teach-kitchen-postgres-${env.GITHUB_RUN_ID}-${env.GITHUB_RUN_ATTEMPT}`) };
}
export async function main(action, env = process.env, fixtureMain = ownedFixtureMain) {
  assert.ok(['start', 'stop'].includes(action), 'Only start and stop are admitted');
  const scoped = kitchenFixtureEnvironment(env);
  if (action === 'start') {
    assert.ok(env.DATABASE_URL === ORIGINAL_SERVICE_URL, 'exact preceding synthetic service target required');
    mkdirSync(scoped.RUNNER_TEMP, { recursive: true, mode: 0o700 });
    // Existing helper persists ownership before creation, verifies real loopback
    // readback, and exports its exact synthetic URL only after successful start.
    await fixtureMain('start', scoped);
  } else {
    // This command is a separate always-run workflow step, so it still executes
    // if the stage or start process is killed by its unchanged outer bound.
    let cleanupError;
    try { await fixtureMain('stop', scoped); } catch (error) { cleanupError = error; }
    try { appendFileSync(env.GITHUB_ENV, `DATABASE_URL=${ORIGINAL_SERVICE_URL}\n`); }
    catch (error) { if (cleanupError) throw new AggregateError([cleanupError, error], 'kitchen fixture cleanup and target restoration failed'); throw error; }
    if (cleanupError) throw cleanupError;
  }
}
if (process.argv[1] && resolve(process.argv[1]) === new URL(import.meta.url).pathname) await main(process.argv[2]);
