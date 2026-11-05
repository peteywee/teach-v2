import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

const tooling = dirname(fileURLToPath(import.meta.url));

function run(...args) {
  const result = spawnSync(process.execPath, [resolve(tooling, 'run.mjs'), ...args], {
    cwd: tooling,
    encoding: 'utf8',
    timeout: 10000,
  });
  assert.equal(result.error, undefined);
  return result;
}

test('forwarded TypeScript options do not receive Turborepo options', () => {
  const result = run('typecheck', '--output-logs=errors-only', '--', '--pretty', 'false');
  assert.equal(result.status, 0, result.stdout + result.stderr);
});

test('force executes both checks freshly with remote caching disabled', () => {
  const result = run('typecheck', 'test:foundation', '--force', '--summarize', '--output-logs=errors-only');
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.match(result.stdout + result.stderr, /Remote caching disabled/);
  assert.match(result.stdout, /2 successful, 2 total/);
  assert.match(result.stdout, /0 cached, 2 total/);
});
