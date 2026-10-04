#!/usr/bin/env node
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const ROOT = resolve(new URL('.', import.meta.url).pathname, '../..');
const json = (dir, path) => JSON.parse(readFileSync(join(dir, path), 'utf8'));
const write = (dir, path, value) => writeFileSync(join(dir, path), JSON.stringify(value, null, 2) + '\n');
const journalPath = 'drizzle/meta/_journal.json';
const readinessPath = 'persistence/physical-slices/readiness.json';
const mutateJournal = (dir, mutate) => { const value = json(dir, journalPath); mutate(value); write(dir, journalPath, value); };
const mutateLatest = (dir, mutate) => {
  const entries = json(dir, journalPath).entries;
  const path = `drizzle/meta/${String(entries.at(-1).idx).padStart(4, '0')}_snapshot.json`;
  const value = json(dir, path); mutate(value); write(dir, path, value);
};
const latestSql = (dir) => `drizzle/${json(dir, journalPath).entries.at(-1).tag}.sql`;
let count = 0;
let failed = 0;
function check(name, mutate, pattern = null) {
  const dir = mkdtempSync(join(tmpdir(), 'migration-guard-'));
  try {
    cpSync(ROOT, dir, { recursive: true, filter: (src) => !/(?:^|\/)\.git(?:\/|$)|(?:^|\/)node_modules(?:\/|$)/.test(src) });
    mutate(dir);
    let output = '';
    let status = 0;
    try {
      output = execFileSync(process.execPath, [join(dir, 'scripts/packaging/validate-apply-guards.mjs'), 'pins'], {
        cwd: dir, encoding: 'utf8', timeout: 5000, stdio: ['ignore', 'pipe', 'pipe'],
      });
    } catch (error) { status = error.status ?? 1; output = `${error.stdout ?? ''}${error.stderr ?? ''}`; }
    if (pattern) { assert.notEqual(status, 0, 'fixture unexpectedly passed'); assert.match(output, pattern); }
    else assert.equal(status, 0, output);
    console.log(`PASS ${name}`);
  } catch (error) { failed++; console.error(`FAIL ${name}: ${error.message}`); }
  finally { count++; rmSync(dir, { recursive: true, force: true }); }
}

check('clean repaired history passes', () => {});
check('original P04 missing journal entry fails', (dir) => mutateJournal(dir, (v) => v.entries.pop()), /SQL file .* is not journaled/);
check('original P04 stale identities FK fails', (dir) => {
  const path = latestSql(dir);
  const source = readFileSync(join(dir, path), 'utf8');
  assert.ok(source.includes('REFERENCES "public"."identity_identities"'));
  writeFileSync(join(dir, path), source.replace('REFERENCES "public"."identity_identities"', 'REFERENCES "identities"'));
}, /REFERENCES missing table public\.identities/);
check('missing migration SQL fails', (dir) => rmSync(join(dir, latestSql(dir))), /\.sql:.*ENOENT/);
check('missing snapshot fails', (dir) => {
  const idx = json(dir, journalPath).entries.at(-1).idx;
  rmSync(join(dir, `drizzle/meta/${String(idx).padStart(4, '0')}_snapshot.json`));
}, /snapshot\.json:.*ENOENT/);
check('broken snapshot chain fails', (dir) => mutateLatest(dir, (v) => v.prevId = 'wrong'), /prevId breaks the snapshot chain/);
check('reused snapshot id fails', (dir) => mutateLatest(dir, (v) => v.id = v.prevId), /unique nonzero snapshot id/);
check('noncontiguous journal idx fails', (dir) => mutateJournal(dir, (v) => v.entries.at(-1).idx = 99), /contiguous idx/);
check('duplicate timestamp fails', (dir) => mutateJournal(dir, (v) => v.entries.at(-1).when = v.entries.at(-2).when), /strictly increasing safe integer/);
check('unsafe journal path fails', (dir) => mutateJournal(dir, (v) => v.entries.at(-1).tag = '../outside'), /safe .* migration tag/);
check('empty journal fails', (dir) => mutateJournal(dir, (v) => v.entries = []), /nonempty Drizzle journal required/);
check('snapshot foreign-key target drift fails', (dir) => mutateLatest(dir, (v) => {
  Object.values(v.tables['public.identity_credentials'].foreignKeys)[0].tableTo = 'identities';
}), /foreign key .* targets missing table public\.identities/);
check('snapshot foreign-key column drift fails', (dir) => mutateLatest(dir, (v) => {
  Object.values(v.tables['public.identity_credentials'].foreignKeys)[0].columnsTo = ['unknown'];
}), /missing target column public\.identity_identities\.unknown/);
check('SQL foreign-key column drift fails', (dir) => {
  const path = latestSql(dir);
  const source = readFileSync(join(dir, path), 'utf8');
  assert.ok(source.includes('REFERENCES "public"."identity_identities"("id")'));
  writeFileSync(join(dir, path), source.replace('REFERENCES "public"."identity_identities"("id")', 'REFERENCES "public"."identity_identities"("unknown")'));
}, /REFERENCES missing column public\.identity_identities\.unknown/);
check('readiness migration count drift fails', (dir) => {
  const value = json(dir, readinessPath); value.implementation_guard.migrations_generated++; write(dir, readinessPath, value);
}, /readiness migration count .* differs from journal count/);
check('readiness table count drift fails', (dir) => {
  const value = json(dir, readinessPath); value.implementation_guard.tables_generated++; write(dir, readinessPath, value);
}, /readiness table count .* differs from final snapshot count/);
check('valid appended history passes without hardcoded totals', (dir) => {
  const journal = json(dir, journalPath);
  const last = journal.entries.at(-1);
  const idx = journal.entries.length;
  const prefix = String(idx).padStart(4, '0');
  const snapshot = json(dir, `drizzle/meta/${String(last.idx).padStart(4, '0')}_snapshot.json`);
  snapshot.prevId = snapshot.id; snapshot.id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
  write(dir, `drizzle/meta/${prefix}_snapshot.json`, snapshot);
  writeFileSync(join(dir, `drizzle/${prefix}_structural_fixture.sql`), 'SELECT 1;\n');
  journal.entries.push({ idx, version: '7', when: last.when + 1, tag: `${prefix}_structural_fixture`, breakpoints: true });
  write(dir, journalPath, journal);
  const readiness = json(dir, readinessPath); readiness.implementation_guard.migrations_generated++; write(dir, readinessPath, readiness);
});

console.log(`${count - failed}/${count} migration-history guard tests passed`);
process.exitCode = failed ? 1 : 0;
