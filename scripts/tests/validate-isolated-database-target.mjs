import assert from 'node:assert/strict';
import { test } from 'node:test';
import { assertIsolatedDatabaseTarget } from '../db/isolated-database-target.mjs';

const isolated = { TEACH_ISOLATED_DB: '1' };
for (const host of ['localhost', '127.0.0.1', '[::1]']) {
  test(`explicit disposable target at ${host} passes`, () => {
    const url = `postgresql://tester:example@${host}:5432/teach_v2_test`;
    assert.equal(assertIsolatedDatabaseTarget(url, isolated), url);
  });
}
for (const [label, url, env] of [
  ['missing isolation declaration', 'postgresql://localhost/teach_v2', {}],
  ['false isolation declaration', 'postgresql://localhost/teach_v2', { TEACH_ISOLATED_DB: '0' }],
  ['missing URL', undefined, isolated],
  ['malformed URL', 'not-a-url', isolated],
  ['remote host', 'postgresql://example.com/teach_v2', isolated],
  ['non-PostgreSQL scheme', 'https://localhost/teach_v2', isolated],
  ['default administrative database', 'postgresql://localhost/postgres', isolated],
  ['shared database', 'postgresql://localhost/teach_v2_shared', isolated],
  ['production database', 'postgresql://localhost/teach_v2_production', isolated],
  ['query host override', 'postgresql://localhost/teach_v2?host=example.com', isolated],
  ['query database override', 'postgresql://localhost/teach_v2?dbname=production', isolated],
  ['fragment', 'postgresql://localhost/teach_v2#production', isolated],
]) {
  test(`${label} fails before any database connection`, () => {
    assert.throws(() => assertIsolatedDatabaseTarget(url, env), /Database execution BLOCKED/);
  });
}
test('denial never echoes credentials', () => {
  assert.throws(() => assertIsolatedDatabaseTarget('postgresql://tester:private-password@example.com/teach_v2', isolated),
    (error) => error.message.includes('BLOCKED') && !error.message.includes('private-password'));
});
