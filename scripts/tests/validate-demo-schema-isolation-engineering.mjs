import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { createHash } from 'node:crypto';
import { cpSync, mkdtempSync, readFileSync, writeFileSync, rmSync, mkdirSync, renameSync, symlinkSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { ENGINEERING_MANIFEST, ENGINEERING_REVIEW, ENGINEERING_BASE, ENGINEERING_REVISED_PATHS, ENGINEERING_ADDED_PATHS, SCHEMA_ENGINEERING_REVIEW_SHA256, inspectSchemaIsolationEngineering } from '../verification/demo-schema-isolation-engineering.mjs';
import { inspectDemoRecipePhysicalSuccessor } from '../persistence/demo-recipes-physical-successor.mjs';

const root = resolve(new URL('../..', import.meta.url).pathname);
const fixture = mkdtempSync(join(tmpdir(), 'teach-schema-engineering-'));
for (const name of ['.github', 'kernel', 'domains', 'contracts', 'application-interfaces', 'governance', 'persistence', 'drizzle', 'verification', 'scripts', 'src', 'tests']) cpSync(join(root, name), join(fixture, name), { recursive: true });
after(() => rmSync(fixture, { recursive: true, force: true }));
const raw = path => readFileSync(join(fixture, path), 'utf8');
const hash = text => createHash('sha256').update(text).digest('hex');
const requireReview = { skip: !SCHEMA_ENGINEERING_REVIEW_SHA256 ? 'Genuine independent source review remains pending; no synthetic verdict is manufactured.' : false };
const denied = () => {
  const result = inspectSchemaIsolationEngineering(fixture);
  assert.ok(result.errors.length);
  assert.deepEqual(result.revisedPaths, []);
  assert.deepEqual(result.addedPaths, []);
  assert.deepEqual(result.predecessorFiles, {});
  return result;
};
const change = (path, mutate) => {
  const original = raw(path);
  try { writeFileSync(join(fixture, path), mutate(original)); denied(); }
  finally { writeFileSync(join(fixture, path), original); }
};
const changeJson = (path, mutate) => change(path, text => { const value = JSON.parse(text); mutate(value); return JSON.stringify(value, null, 2) + '\n'; });

test('unsealed review fails closed; genuine sealed source review exposes only exact finite predecessors', () => {
  const result = inspectSchemaIsolationEngineering(fixture);
  if (!SCHEMA_ENGINEERING_REVIEW_SHA256) {
    denied(); assert.match(result.errors.join('\n'), /independent engineering review missing|independent engineering review is unsealed/);
  } else {
    assert.deepEqual(result.errors, []);
    assert.deepEqual(result.revisedPaths, [...ENGINEERING_REVISED_PATHS]);
    assert.deepEqual(result.addedPaths, [...ENGINEERING_ADDED_PATHS]);
    assert.equal(hash(raw(ENGINEERING_REVIEW)), SCHEMA_ENGINEERING_REVIEW_SHA256);
    const physical = inspectDemoRecipePhysicalSuccessor(fixture);
    assert.deepEqual(physical.errors, []);
    assert.equal(physical.migrationCount, 7);
  }
});

test('every exact current source is verified before any predecessor source is exposed', requireReview, () => {
  for (const path of [...ENGINEERING_REVISED_PATHS, ...ENGINEERING_ADDED_PATHS]) change(path, text => text + '\n');
});

test('altered predecessors, injected paths, rebound hashes and review authority escalation deny', requireReview, () => {
  const first = ENGINEERING_REVISED_PATHS[0];
  for (const mutate of [value => { value.predecessor_files[first] += '\n'; }, value => { value.predecessor_sha256[first] = '0'.repeat(64); }, value => { value.current_sha256[first] = '0'.repeat(64); }, value => { value.source_baseline_commit = '0'.repeat(40); }, value => { value.predecessor_files['../../outside'] = 'injected'; value.current_sha256['../../outside'] = hash('injected'); }]) changeJson(ENGINEERING_MANIFEST, mutate);
  for (const flag of ['runtime_activation_authorized', 'physical_admission_granted', 'shared_or_production_execution_authorized', 'live_database_changes_authorized', 'credential_creation_authorized', 'deployment_authorized', 'spending_authorized']) changeJson(ENGINEERING_REVIEW, value => { value[flag] = true; });
  changeJson(ENGINEERING_REVIEW, value => { value.engineering_manifest_sha256 = '0'.repeat(64); });
  changeJson(ENGINEERING_REVIEW, value => { value.source_edits_by_reviewer = true; });
  changeJson(ENGINEERING_REVIEW, value => { value.outcome = 'FAIL'; });
});

test('a rehashed current source and manifest cannot replace the independently sealed review', requireReview, () => {
  const path = ENGINEERING_REVISED_PATHS[0], source = raw(path), manifestText = raw(ENGINEERING_MANIFEST);
  try {
    writeFileSync(join(fixture, path), source + '\n');
    const manifest = JSON.parse(manifestText); manifest.current_sha256[path] = hash(source + '\n');
    writeFileSync(join(fixture, ENGINEERING_MANIFEST), JSON.stringify(manifest, null, 2) + '\n');
    assert.match(denied().errors.join('\n'), /review must bind exact engineering manifest/);
  } finally { writeFileSync(join(fixture, path), source); writeFileSync(join(fixture, ENGINEERING_MANIFEST), manifestText); }
});

test('missing review, orphan manifest, extra engineering evidence and symlinks never expose predecessors', () => {
  const review = join(fixture, ENGINEERING_REVIEW), held = join(fixture, 'held-engineering-review.json');
  if (existsSync(review)) {
    try { renameSync(review, held); assert.match(denied().errors.join('\n'), /independent engineering review missing/); }
    finally { renameSync(held, review); }
    const manifest = join(fixture, ENGINEERING_MANIFEST), parked = join(fixture, 'held-engineering-manifest.json');
    try { renameSync(manifest, parked); assert.match(denied().errors.join('\n'), /orphan/); }
    finally { renameSync(parked, manifest); }
  }
  const extra = join(fixture, ENGINEERING_BASE, 'engineering-extra.json');
  try { writeFileSync(extra, '{}'); assert.match(denied().errors.join('\n'), /engineering evidence inventory/); }
  finally { rmSync(extra, { force: true }); }
  const target = join(fixture, ENGINEERING_REVISED_PATHS[0]), saved = join(fixture, 'held-engineering-source');
  try { renameSync(target, saved); symlinkSync(saved, target); assert.match(denied().errors.join('\n'), /regular file\/ancestor required/); }
  finally { rmSync(target, { force: true }); renameSync(saved, target); }
});

test('prior independent physical reviews remain byte-exact and cannot be replaced by this source review', () => {
  assert.equal(hash(raw('persistence/physical-slices/demo-recipes/independent-successor-review.json')), '758e0183ed2d1c8542a3f75f6a87795eb264f028900179243eadf4524ed3b0a7');
  assert.equal(hash(raw('persistence/physical-slices/demo-recipes/independent-scheduling-review.json')), 'acd0ecdba21f7fa7d348a4262b5a2c472101e7fc2f747066b0690b33139aab6f');
  if (SCHEMA_ENGINEERING_REVIEW_SHA256) for (const path of ['scripts/kernel/demo-runtime-registration.mjs', 'scripts/kernel/demo-recipes-registration.mjs', 'scripts/persistence/demo-recipes-physical-successor.mjs']) {
    const original = raw(path);
    try { writeFileSync(join(fixture, path), original + '\n'); const result = inspectDemoRecipePhysicalSuccessor(fixture); assert.equal(result.admitted, false); assert.match(result.errors.join('\n'), /exact independently reviewed gate, activation and test source hashes differ/); }
    finally { writeFileSync(join(fixture, path), original); }
  }
});
