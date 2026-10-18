import assert from 'node:assert/strict';
import { test } from 'node:test';
import { setTimeout as delay } from 'node:timers/promises';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { EventEmitter } from 'node:events';
import pg from 'pg';
import { dropReplayDatabase } from '../db/replay-database-cleanup.mjs';

const name = 'teach_v2_replay_test';
const query = 'select pid from pg_stat_activity where datname = $1 and pid <> pg_backend_pid()';
const drop = `drop database if exists "${name}"`;
const hash = source => createHash('sha256').update(source).digest('hex');

test('cleanup waits for delayed disconnect after pool.end resolves, then drops without termination', async () => {
  const calls = [];
  let sessions = 2;
  const admin = { async query(sql, values) {
    calls.push([sql, values]);
    if (sql === query) return { rows: sessions-- > 0 ? [{ pid: 101 }] : [] };
    assert.equal(sql, drop);
    return { rows: [] };
  } };
  await dropReplayDatabase(admin, name);
  assert.deepEqual(calls, [[query, [name]], [query, [name]], [query, [name]], [drop, undefined]]);
});

// Exercise the installed pg-pool shutdown path, with a transport whose close is
// delayed deterministically. The old backend kill reaches the real idle-client
// error listener and emits an unhandled BoundPool error with PostgreSQL's code.
async function closingPoolFixture() {
  class DelayedClient extends EventEmitter {
    _queryable = true;
    _ending = false;
    disconnected = false;
    connect(callback) { queueMicrotask(() => callback(null)); }
    end(callback) {
      if (this.disconnected) { callback?.(); return; }
      if (callback) this.once('end', callback);
      if (this._ending) return;
      this._ending = true;
      setTimeout(() => { this.disconnected = true; this.emit('end'); }, 40);
    }
  }
  const pool = new pg.Pool({ Client: DelayedClient });
  const client = await pool.connect();
  const removed = new Promise(resolve => pool.once('remove', resolve));
  client.release();
  await pool.end();
  assert.equal(client.disconnected, false, 'fixture reproduces pool.end resolving before transport close');
  const calls = [];
  const admin = { async query(sql) {
    calls.push(sql);
    if (sql.includes('pg_terminate_backend') && !client.disconnected) {
      client.emit('error', Object.assign(new Error('terminating connection due to administrator command'), { code: '57P01' }));
    }
    if (sql === drop) assert.equal(client.disconnected, true, 'drop must follow transport close');
    return { rows: client.disconnected ? [] : [{ pid: 101 }] };
  } };
  return { admin, removed, calls };
}

test('failure-injection control: old cleanup causes the actual pg-pool 57P01 error', async () => {
  const fixture = await closingPoolFixture();
  try {
    await assert.rejects(fixture.admin.query('select pg_terminate_backend(pid)'),
      error => error.code === '57P01' && error.message === 'terminating connection due to administrator command');
  } finally { await fixture.removed; }
});

test('fixed cleanup survives the same installed pg-pool delayed-close injection', async () => {
  const fixture = await closingPoolFixture();
  try {
    await dropReplayDatabase(fixture.admin, name);
    assert.equal(fixture.calls.at(-1), drop);
    assert.ok(fixture.calls.filter(sql => sql === query).length >= 2);
  } finally { await fixture.removed; }
});

test('already disconnected database drops immediately', async () => {
  const calls = [];
  await dropReplayDatabase({ async query(sql) { calls.push(sql); return { rows: [] }; } }, name);
  assert.deepEqual(calls, [query, drop]);
});

test('live connections time out without terminating a backend or dropping the database', async () => {
  const calls = [];
  await assert.rejects(dropReplayDatabase({ async query(sql) {
    calls.push(sql); return { rows: [{ pid: 101 }] };
  } }, name, 10), /replay database disconnect timed out/);
  assert.ok(calls.length > 0);
  assert.ok(calls.every(sql => sql === query));
});

test('a delayed session query cannot authorize a drop after the disconnect deadline', async () => {
  const calls = [];
  await assert.rejects(dropReplayDatabase({ async query(sql) {
    calls.push(sql); await delay(20); return { rows: [] };
  } }, name, 5), /replay database disconnect timed out/);
  assert.deepEqual(calls, [query]);
});

for (const step of ['sessions', 'drop']) test(`${step} errors retain their exact identity and fail cleanup`, async () => {
  const failure = Object.assign(new Error(`injected ${step} failure`), { code: '57P01' });
  const calls = [];
  await assert.rejects(dropReplayDatabase({ async query(sql) {
    calls.push(sql);
    if (step === 'sessions' || sql === drop) throw failure;
    return { rows: [] };
  } }, name), error => error === failure);
  assert.deepEqual(calls, step === 'sessions' ? [query] : [query, drop]);
});

for (const unsafe of ['postgres', 'teach_v2_x";select 1;--', '', 'other_test']) {
  test(`unsafe replay identifier is rejected before querying: ${unsafe}`, async () => {
    await assert.rejects(dropReplayDatabase({ query() { assert.fail('must not query'); } }, unsafe), /unsafe replay database identifier/);
  });
}
for (const timeout of [0, -1, 5001, NaN, Infinity, 1.5]) {
  test(`invalid disconnect bound is rejected before querying: ${timeout}`, async () => {
    await assert.rejects(dropReplayDatabase({ query() { assert.fail('must not query'); } }, name, timeout), /timeout must be between 1 and 5000 ms/);
  });
}

// Reconstruct the exact frozen pre-repair files after undoing ONLY the cleanup
// substitution. This proves every migration/fingerprint/negative assertion and
// existing pool-finally block remains byte-for-byte unchanged in all five slices.
const previous = [
  ['verify-migration-replay.ts', '4c2698fd9da53776d7cd58e727d82d2d841fe46b3d670eb980ee3ef89887b764', true],
  ['verify-slice-p02-migration-replay.ts', 'badcb82c5a95022df54a5484a24f848c1aa59d48946e52e00e33fa272de914aa', true],
  ['verify-slice-p03-migration-replay.ts', '75e4823b61f054fdbaf0edc187fdf65eb021b9da7f69ae3669ebd427903e0def', false],
  ['verify-slice-p04-migration-replay.ts', 'e2506bc0a0d4be4a16f345ddd91a9aec2f2a9573f4e346f79a9db739374f8daf', false],
  ['verify-slice-p05-migration-replay.ts', 'd52b8fe273aec6b881d087de6f22a4f48fc09da8cc6bcd0e31e027d4a37ef9be', false],
];
for (const [file, digest, multiline] of previous) test(`${file} changes only the unsafe cleanup operation`, () => {
  const source = readFileSync(new URL(`../db/${file}`, import.meta.url), 'utf8');
  const header = "import { dropReplayDatabase } from './replay-database-cleanup.mjs';\n";
  assert.ok(source.startsWith(header));
  assert.equal(source.split('await dropReplayDatabase(admin, name);').length, 2);
  assert.ok(!source.includes('pg_terminate_backend'));
  const oldQuery = multiline
    ? '`select pg_terminate_backend(pid)\n       from pg_stat_activity\n      where datname = $1 and pid <> pg_backend_pid()`'
    : '`select pg_terminate_backend(pid) from pg_stat_activity where datname=$1 and pid<>pg_backend_pid()`';
  const restored = source.slice(header.length).replace('  await dropReplayDatabase(admin, name);',
    `  await admin.query(\n    ${oldQuery},\n    [name],\n  );\n  await admin.query(\`drop database if exists \${quoteIdent(name)}\`);`);
  assert.equal(hash(restored), digest);
});
