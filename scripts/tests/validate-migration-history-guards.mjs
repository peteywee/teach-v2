#!/usr/bin/env node
import { MIGRATION_GUARD_NAMES, parseBoundedPartition, boundedPartitionEvidence } from '../verification/validator-partitions.mjs';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads';
import { inspectMigrationHistory } from '../packaging/migration-history-guards.mjs';
import { inspectLearningImplementation } from '../persistence/learning-implementation-evidence.mjs';
import { exactCurrentDenial } from '../verification/demo-validator-predecessor.mjs';
import { withKitchenPredecessor } from './kitchen-predecessor-fixture.mjs';
import { installAuthoringPredecessor } from './authoring-predecessor-fixture.mjs';

const partition = parseBoundedPartition(process.argv.slice(2),3);
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
// FK probes still target the latest table-authoring migration, not the later
// two exact function-only guards. This keeps the original structural property.
const latestTableSql = (dir) => `drizzle/${json(dir, journalPath).entries.filter(entry => !['0006_demo_recipe_content_guard', '0007_demo_kitchen_content_guard'].includes(entry.tag)).at(-1).tag}.sql`;
// The seal is an additional oracle, not a replacement for these four properties.
// Original check declarations and their structural expectations remain unchanged.
const pairedSealDenials = new Map([
  ['empty journal fails', 'demo physical admission: original journal prefix must remain immutable'],
  ['readiness migration count drift fails', 'demo physical successor: exact nine-path successor envelope or original/live hashes differ'],
  ['readiness table count drift fails', 'demo physical successor: exact nine-path successor envelope or original/live hashes differ'],
  ['valid appended history passes without hardcoded totals', 'demo physical successor: exact nine-path successor envelope or original/live hashes differ'],
]);
// The original recipe-era diagnostics remain separate from the newer kitchen
// admission oracle. Every mutation is also made against an untouched current
// fixture and must produce this exact denial through the real current CLI.
const currentKitchenDenials = new Map([
  ...['original P04 missing journal entry fails', 'noncontiguous journal idx fails', 'duplicate timestamp fails', 'unsafe journal path fails', 'empty journal fails', 'valid appended history passes without hardcoded totals', 'unadmitted appended history does not gain live physical authority'].map(name => [name, 'demo kitchen engineering: current source differs: drizzle/meta/_journal.json']),
  ...['broken snapshot chain fails', 'reused snapshot id fails', 'snapshot foreign-key target drift fails', 'snapshot foreign-key column drift fails'].map(name => [name, 'demo kitchen engineering: current source differs: drizzle/meta/0007_snapshot.json']),
  ['missing migration SQL fails', "demo kitchen engineering: missing or malformed evidence: ENOENT: no such file or directory, lstat '<fixture>/drizzle/0007_demo_kitchen_content_guard.sql'"],
  ['missing snapshot fails', "demo kitchen engineering: missing or malformed evidence: ENOENT: no such file or directory, lstat '<fixture>/drizzle/meta/0007_snapshot.json'"],
  ['original P04 stale identities FK fails', '- migration history: 0005_demo_runtime_owner_storage.sql REFERENCES missing table public.identities'],
  ['SQL foreign-key column drift fails', '- migration history: 0005_demo_runtime_owner_storage.sql REFERENCES missing column public.identity_identities.unknown'],
  ...['readiness migration count drift fails', 'readiness table count drift fails'].map(name => [name, 'demo physical successor: exact nine-path successor envelope or original/live hashes differ']),
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
const inventory = [], results = [];
if (!isMainThread && ![0, 1].includes(workerData?.index)) throw Error('exact fixed migration worker required');
function check(name, mutate, pattern = null, structuralOnly = false) {
  const ordinal = count++; inventory.push(name);
  if (isMainThread ? partition===null||ordinal%3!==partition-1 : ordinal%2!==workerData.index) return;
  const messages = []; let ok = true;
  const dir = mkdtempSync(join(tmpdir(), 'migration-guard-'));
  try {
    cpSync(ROOT, dir, { recursive: true, filter: (src) => !/(?:^|\/)\.git(?:\/|$)|(?:^|\/)node_modules(?:\/|$)/.test(src) });
    installAuthoringPredecessor(dir);
    const originalAssertions = () => {
    mutate(dir);
    if (pairedSealDenials.has(name)) {
      // Original structural properties are exercised on exact P05 predecessor
      // inputs with CURRENT validators. The current recipe lane is deliberately
      // stricter: a source/review-sealed seventh migration cannot be broadened.
      const historical = mkdtempSync(join(tmpdir(), 'p05-structural-property-'));
      try {
        const commit = '14ca8c409993c9e57077d9705db022d3bfd26b1a';
        const tree = '771867f1dbb47e277f90158a9f25b504bb786510';
        assert.equal(execFileSync('git', ['rev-parse', '--verify', `${commit}^{tree}`], {cwd: ROOT, encoding: 'utf8', timeout: 2000}).trim(), tree);
        const archive = join(historical, 'input.tar');
        execFileSync('git', ['archive', '--format=tar', `--output=${archive}`, commit], {cwd: ROOT, timeout: 5000});
        execFileSync('tar', ['-xf', archive, '-C', historical], {timeout: 5000}); rmSync(archive);
        rmSync(join(historical, 'scripts'), {recursive: true}); cpSync(join(ROOT, 'scripts'), join(historical, 'scripts'), {recursive: true});
        mutate(historical);
        const properties = inspectMigrationHistory(historical);
        if (pattern) assert.match(properties.join('\n'), pattern); else assert.deepEqual(properties, []);
        if (structuralOnly) assert.deepEqual(inspectLearningImplementation(historical), []);
      } finally { rmSync(historical, { recursive: true, force: true }); }
      // Retain both recipe-era oracles in the authenticated historical fixture;
      // the distinct untouched-current kitchen mutation is checked below.
      const recipeProperties = inspectMigrationHistory(dir);
      assert.ok(recipeProperties.length > 0, 'historical recipe physical mutation must remain fail-closed');
      assert.equal(exactCurrentDenial(runPins(dir), pairedSealDenials.get(name), dir), true, 'exact current admission denial required separately from structural property');
      messages.push(`PASS ${name} [PAIRED exact P05 inputs/current validator + authenticated recipe-era structural/admission denial + exact current kitchen denial]`);
      return;
    }
    if (structuralOnly) {
      // A hypothetical valid journal append proves structure and derived totals,
      // not new physical authoring authority. The paired live-guard case below
      // must still reject this same unadmitted readiness/implementation change.
      assert.deepEqual(inspectMigrationHistory(dir), []);
      assert.deepEqual(inspectLearningImplementation(dir), []);
      messages.push(`PASS ${name}`);
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
    messages.push(`PASS ${name}${currentKitchenDenials.has(name) ? ' [authenticated recipe-era oracle + exact current kitchen denial]' : ''}`);
    };
    if (name === 'clean repaired history passes') originalAssertions();
    else {
      assert.equal(currentKitchenDenials.size, 17);
      assert.ok(currentKitchenDenials.has(name), 'every original mutation needs a named exact current denial');
      const current = mkdtempSync(join(tmpdir(), 'kitchen-current-migration-guard-'));
      try {
        cpSync(dir, current, { recursive: true });
        mutate(current);
        assert.equal(exactCurrentDenial(runPins(current), currentKitchenDenials.get(name), current), true, `exact current kitchen denial required: ${name}`);
      } finally { rmSync(current, { recursive: true, force: true }); }
      // Authenticate before mutation, then restore only the finite verified
      // predecessor sources. These are historical fixtures, never live PASS.
      withKitchenPredecessor(dir, originalAssertions);
    }
  } catch (error) { failed++; ok = false; messages.push(`FAIL ${name}: ${error.message}`); }
  finally { rmSync(dir, { recursive: true, force: true }); results.push({ ordinal, name, ok, detail: messages.join('\n') }); }
}

check('clean repaired history passes', () => {});
check('original P04 missing journal entry fails', (dir) => mutateJournal(dir, (v) => v.entries.pop()), /SQL file .* is not journaled/);
check('original P04 stale identities FK fails', (dir) => {
  const path = latestTableSql(dir);
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
  const path = latestTableSql(dir);
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

// Scheduling only: fixed disjoint original ordinals, independent mutable roots,
// unchanged five-second CLI bounds. Worker threads and their CLI children stay
// in the outer audit process group; its unchanged 25-second limit covers all.
function awaitMigrationWorker(worker, index) {
  return new Promise((resolveWorker, rejectWorker) => {
    let report, fault, messages = 0;
    worker.on('message', value => { if (++messages !== 1) fault = Error('duplicate migration worker report'); report = value; });
    worker.once('error', error => { fault = error; });
    worker.once('exit', code => {
      if (fault) rejectWorker(fault);
      else if (code !== 0 || messages !== 1 || !report) rejectWorker(Error(`migration worker ${index} exited ${code} without an ordinary completed report`));
      else resolveWorker(report);
    });
  });
}
if (isMainThread && partition!==null) {
  assert.deepEqual(inventory,MIGRATION_GUARD_NAMES);
  const evidence=boundedPartitionEvidence('migration',partition);
  assert.deepEqual(results.map(row=>row.name),evidence.names);
  for(const row of results)console.log(row.detail);
  console.log('Bounded partition: '+JSON.stringify(evidence));
  process.exitCode=results.every(row=>row.ok)?0:1;
} else if (isMainThread) {
  const pending = [0, 1].map(index => {
    try { return awaitMigrationWorker(new Worker(new URL(import.meta.url), { workerData: { index } }), index); }
    catch (error) { return Promise.reject(error); }
  });
  const settled = await Promise.allSettled(pending);
  try {
    assert.equal(count, 18); assert.equal(new Set(inventory).size, 18);
    if (settled.some(row => row.status !== 'fulfilled')) throw settled.find(row => row.status === 'rejected').reason;
    const merged = [];
    for (const [index, { value: report }] of settled.entries()) {
      assert.deepEqual(report.inventory, inventory);
      const expected = inventory.flatMap((name, ordinal) => ordinal % 2 === index ? [{ name, ordinal }] : []);
      assert.ok(Array.isArray(report.results)); assert.equal(report.results.length, 9);
      assert.deepEqual(report.results.map(({ name, ordinal }) => ({ name, ordinal })), expected);
      assert.ok(report.results.every(row => typeof row.ok === 'boolean' && typeof row.detail === 'string'));
      merged.push(...report.results);
    }
    merged.sort((a, b) => a.ordinal - b.ordinal);
    for (const row of merged) console.log(row.detail);
    failed = merged.filter(row => !row.ok).length;
    console.log(`${count - failed}/${count} migration-history guard tests passed`);
    process.exitCode = failed ? 1 : 0;
  } catch (error) { console.error(`Migration worker failure: ${error.message}`); process.exitCode = 1; }
} else parentPort.postMessage({ inventory, results });
