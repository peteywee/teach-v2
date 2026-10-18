#!/usr/bin/env node
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { inspectMigrationHistory } from '../packaging/migration-history-guards.mjs';
import { inspectLearningImplementation } from '../persistence/learning-implementation-evidence.mjs';
import { exactCurrentDenial } from '../verification/demo-validator-predecessor.mjs';

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
// The seal is an additional oracle, not a replacement for these four properties.
// Original check declarations and their structural expectations remain unchanged.
const pairedSealDenials = new Map([
  ['empty journal fails', 'demo physical admission: original journal prefix must remain immutable'],
  ['readiness migration count drift fails', 'demo physical successor: exact nine-path successor envelope or original/live hashes differ'],
  ['readiness table count drift fails', 'demo physical successor: exact nine-path successor envelope or original/live hashes differ'],
  ['valid appended history passes without hardcoded totals', 'demo physical successor: exact nine-path successor envelope or original/live hashes differ'],
]);
function runPins(dir) {
  try {
    return {exit: 0, ordinaryProcessExit: true, output: execFileSync(process.execPath, [join(dir, 'scripts/packaging/validate-apply-guards.mjs'), 'pins'], {
      cwd: dir, encoding: 'utf8', timeout: 5000, stdio: ['ignore', 'pipe', 'pipe'],
    })};
  } catch (error) {
    return {exit: error.status, ordinaryProcessExit: Number.isInteger(error.status) && !error.signal, output: `${error.stdout ?? ''}${error.stderr ?? ''}`};
  }
}
let count = 0;
let failed = 0;
function check(name, mutate, pattern = null, structuralOnly = false) {
  const dir = mkdtempSync(join(tmpdir(), 'migration-guard-'));
  try {
    cpSync(ROOT, dir, { recursive: true, filter: (src) => !/(?:^|\/)\.git(?:\/|$)|(?:^|\/)node_modules(?:\/|$)/.test(src) });
    mutate(dir);
    if (pairedSealDenials.has(name)) {
      // Execute the current pure validator on the current mutated inputs, before
      // checking the distinct live admission denial. A removed structural rule
      // cannot be hidden by a passing hash guard.
      const properties = inspectMigrationHistory(dir);
      if (pattern) assert.match(properties.join('\n'), pattern);
      else assert.deepEqual(properties, []);
      if (structuralOnly) {
        // P05's original derived-total property uses exact predecessor inputs
        // with all CURRENT validator scripts, never archived validator logic.
        const historical = mkdtempSync(join(tmpdir(), 'p05-structural-property-'));
        try {
          // The exact pre-registration source is already pinned by the approved
          // package. A post-registration input would (correctly) seal the totals.
          const commit = '14ca8c409993c9e57077d9705db022d3bfd26b1a';
          const tree = '771867f1dbb47e277f90158a9f25b504bb786510';
          assert.equal(execFileSync('git', ['rev-parse', '--verify', `${commit}^{tree}`], {cwd: ROOT, encoding: 'utf8', timeout: 2000}).trim(), tree);
          const archive = join(historical, 'input.tar');
          execFileSync('git', ['archive', '--format=tar', `--output=${archive}`, commit], {cwd: ROOT, timeout: 5000});
          execFileSync('tar', ['-xf', archive, '-C', historical], {timeout: 5000}); rmSync(archive);
          rmSync(join(historical, 'scripts'), {recursive: true}); cpSync(join(ROOT, 'scripts'), join(historical, 'scripts'), {recursive: true});
          mutate(historical); assert.deepEqual(inspectMigrationHistory(historical), []); assert.deepEqual(inspectLearningImplementation(historical), []);
        }
        finally { rmSync(historical, { recursive: true, force: true }); }
      }
      assert.equal(exactCurrentDenial(runPins(dir), pairedSealDenials.get(name), dir), true, 'exact current admission denial required separately from structural property');
      console.log(`PASS ${name} [PAIRED current structural property${structuralOnly ? ' + exact pre-registration P05 inputs 14ca8c4/current validator' : ''} + current admission]`);
      return;
    }
    if (structuralOnly) {
      // A hypothetical valid journal append proves structure and derived totals,
      // not new physical authoring authority. The paired live-guard case below
      // must still reject this same unadmitted readiness/implementation change.
      assert.deepEqual(inspectMigrationHistory(dir), []);
      assert.deepEqual(inspectLearningImplementation(dir), []);
      console.log(`PASS ${name}`);
      return;
    }
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
const appendStructuralHistory = (dir) => {
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
  const implementationPath = 'persistence/physical-slices/learning-session/implementation.json';
  const implementation = json(dir, implementationPath);
  implementation.physical_artifact_totals.migration_files++;
  write(dir, implementationPath, implementation);
};
check('valid appended history passes without hardcoded totals', appendStructuralHistory, null, true);
check('unadmitted appended history does not gain live physical authority', appendStructuralHistory, /demo registration: unchanged preceding source drift: persistence\/physical-slices\/(?:readiness\.json|learning-session\/implementation\.json)/);

console.log(`${count - failed}/${count} migration-history guard tests passed`);
process.exitCode = failed ? 1 : 0;
