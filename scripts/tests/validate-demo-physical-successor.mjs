import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { inspectDemoRuntimeRegistration, createHistoricalSourceReader } from '../kernel/demo-runtime-registration.mjs';
import { inspectCapabilityAdmission } from '../kernel/capability-admission.mjs';
import { inspectDemoPhysicalPrerequisites } from '../persistence/demo-admission-evidence.mjs';
import {
  DEMO_PHYSICAL_PATHS, DEMO_PHYSICAL_EVIDENCE, DEMO_PHYSICAL_ENVELOPE,
  DEMO_PHYSICAL_REVIEW, DEMO_PHYSICAL_LANE, DEMO_PHYSICAL_PROVENANCE,
  DEMO_PHYSICAL_REVIEW_SHA256, buildDemoPhysicalSuccessor,
} from '../kernel/demo-physical-successor.mjs';

const root = resolve(new URL('../..', import.meta.url).pathname);
const fixture = mkdtempSync(join(tmpdir(), 'teach-physical-successor-'));
for (const path of ['kernel', 'domains', 'contracts', 'application-interfaces', 'governance', 'persistence', 'drizzle']) cpSync(join(root, path), join(fixture, path), { recursive: true });
after(() => rmSync(fixture, { recursive: true, force: true }));
const raw = path => readFileSync(join(fixture, path), 'utf8');
const json = path => JSON.parse(raw(path));
const hash = text => createHash('sha256').update(text).digest('hex');
const source = json('domains/demo-runtime/source-baseline.json');
const inspect = () => inspectDemoRuntimeRegistration(fixture);
const mutate = (path, change, pattern) => {
  const original = raw(path);
  try {
    const changed = change(original);
    assert.notEqual(changed, original, `mutation must change ${path}`);
    writeFileSync(join(fixture, path), changed);
    const result = inspect();
    assert.ok(result.errors.length, `accepted ${path}`);
    assert.match(result.errors.join('\n'), pattern);
  } finally { writeFileSync(join(fixture, path), original); }
};
const mutateJson = (path, change, pattern) => mutate(path, text => {
  const value = JSON.parse(text); change(value); return JSON.stringify(value, null, 2) + '\n';
}, pattern);

test('source-only registration still proves unchanged physical predecessors without an envelope', () => {
  const originals = new Map([...DEMO_PHYSICAL_PATHS, DEMO_PHYSICAL_ENVELOPE, DEMO_PHYSICAL_REVIEW].map(path => [path, existsSync(join(fixture, path)) ? raw(path) : null]));
  try {
    for (const path of DEMO_PHYSICAL_PATHS) writeFileSync(join(fixture, path), source.files[path]);
    for (const path of [DEMO_PHYSICAL_ENVELOPE, DEMO_PHYSICAL_REVIEW]) rmSync(join(fixture, path), { force: true });
    const result = inspect();
    assert.deepEqual(result.errors, []);
    assert.equal(result.physicalSuccessor.present, false);
    mutate('persistence/physical-slices/learning-session/implementation.json', text => text + '\n', /unchanged preceding source drift/);
    const p03 = 'persistence/physical-slices/identity-tokens/admission.json', original = raw(p03);
    try {
      const value = JSON.parse(original); value.criteria.reverse(); writeFileSync(join(fixture, p03), JSON.stringify(value));
      assert.deepEqual(inspect().errors, []);
      assert.deepEqual(JSON.parse(createHistoricalSourceReader(fixture)(p03)).criteria, value.criteria);
    } finally { writeFileSync(join(fixture, p03), original); }
  } finally {
    for (const [path, original] of originals) original === null ? rmSync(join(fixture, path), { force: true }) : writeFileSync(join(fixture, path), original);
  }
});

test('fixed nine-path evidence builder preserves exact before hashes and declares no review authority', () => {
  assert.equal(DEMO_PHYSICAL_PATHS.length, 9);
  assert.equal(new Set(DEMO_PHYSICAL_PATHS).size, 9);
  assert.equal(DEMO_PHYSICAL_EVIDENCE.length, 7);
  const built = buildDemoPhysicalSuccessor(fixture, source);
  assert.deepEqual(built.files.map(row => row.path), [...DEMO_PHYSICAL_PATHS]);
  for (const row of built.files) {
    assert.equal(row.before_sha256, hash(source.files[row.path]));
    assert.equal(row.after_sha256, hash(raw(row.path)));
  }
  assert.equal(built.phase, 'AUTHORING_UNDER_TEST');
  assert.equal(built.runtime_proof, 'NOT_RUN');
  assert.equal(built.shared_or_production_migration_execution_authorized, false);
  assert.equal(built.outcome, undefined);
});

test('genuine independently reviewed nine-file successor passes current and historical proofs', () => {
  // No synthetic reviewer PASS or test-only trust anchor can satisfy this.
  assert.match(DEMO_PHYSICAL_REVIEW_SHA256 ?? '', /^[a-f0-9]{64}$/, 'genuine independent review must be integrated before this suite can PASS');
  const result = inspect();
  assert.deepEqual(result.errors, []);
  assert.equal(result.physicalSuccessor.present, true);
  assert.deepEqual(result.physicalSuccessor.revisedPaths, [...DEMO_PHYSICAL_PATHS]);
  assert.equal(result.physicalSuccessor.prerequisites.decision, 'ADMIT');
  assert.equal(result.registeredEntries, 131);
  assert.equal(result.closure.approvedEntries, 236);
  assert.equal(result.closure.checkedReferences, 583);
  assert.deepEqual(result.closure.exceptions, []);
  assert.deepEqual(inspectCapabilityAdmission(fixture).errors, []);
  const historical = createHistoricalSourceReader(fixture);
  for (const path of DEMO_PHYSICAL_PATHS) {
    assert.equal(historical(path), source.files[path]);
    assert.deepEqual(json(path).demo_physical_successor, DEMO_PHYSICAL_PROVENANCE);
  }
});

test('every physical successor file remains independently byte-bound', () => {
  for (const path of DEMO_PHYSICAL_PATHS) mutate(path, text => text + '\n', /exact nine-path successor envelope/);
});

test('review cannot be forged, rebound to another candidate or separated from its envelope', () => {
  for (const field of ['outcome', 'reviewer', 'physical_successor_sha256', 'package_sha256sums_digest']) {
    mutateJson(DEMO_PHYSICAL_REVIEW, value => { value[field] = 'unauthorized change'; }, /independent successor review.*bytes changed/);
  }
  mutateJson(DEMO_PHYSICAL_REVIEW, value => { value.semantic_registration.commit = '0'.repeat(40); }, /review must bind independently passed semantic candidate/);
  const original = raw(DEMO_PHYSICAL_ENVELOPE);
  try {
    rmSync(join(fixture, DEMO_PHYSICAL_ENVELOPE));
    assert.match(inspect().errors.join('\n'), /orphan independent review/);
  } finally { writeFileSync(join(fixture, DEMO_PHYSICAL_ENVELOPE), original); }
});

test('envelope cannot broaden nine paths, rewrite ancestry or conceal changed live hashes', () => {
  mutateJson(DEMO_PHYSICAL_ENVELOPE, value => { value.files.push({ ...value.files[0], path: 'persistence/physical-slices/certification/admission.json' }); }, /exact nine-path successor envelope/);
  mutateJson(DEMO_PHYSICAL_ENVELOPE, value => { value.files.pop(); }, /exact nine-path successor envelope/);
  mutateJson(DEMO_PHYSICAL_ENVELOPE, value => { value.files[0].before_sha256 = '0'.repeat(64); }, /exact nine-path successor envelope/);
  mutateJson(DEMO_PHYSICAL_ENVELOPE, value => { value.files[0].after_sha256 = '0'.repeat(64); }, /exact nine-path successor envelope/);
  mutateJson(DEMO_PHYSICAL_ENVELOPE, value => { value.files[0].path = '../outside.json'; }, /exact nine-path successor envelope/);
  mutateJson(DEMO_PHYSICAL_ENVELOPE, value => { value.semantic_registration.tree = '0'.repeat(40); }, /exact nine-path successor envelope/);
});

test('reviewed mapping, plan, semantic review and recorded admission remain live evidence', () => {
  for (const path of DEMO_PHYSICAL_EVIDENCE) mutate(path, text => text + '\n', /exact nine-path successor envelope/);
  const admission = `${DEMO_PHYSICAL_LANE}/admission.json`;
  mutateJson(admission, value => { value.criteria[0].state = 'UNKNOWN'; }, /recorded admission must reproduce fresh criteria/);
  mutateJson(admission, value => { value.criteria[0] = value.criteria[1]; }, /recorded admission must reproduce fresh criteria/);
  mutateJson(admission, value => { value.criteria.pop(); }, /recorded admission must reproduce fresh criteria/);
  mutateJson(admission, value => { value.criteria[0].evidence = ''; }, /recorded admission must reproduce fresh criteria/);
});

test('under-test authoring evidence cannot claim runtime or production completion', () => {
  const implementation = 'persistence/physical-slices/learning-session/implementation.json';
  mutateJson(implementation, value => { value.evidence_proof = 'PROVEN'; }, /new P05 implementation evidence must remain UNDER_TEST/);
  mutateJson(implementation, value => { value.runtime_proof = 'PASS'; }, /new P05 runtime proof must remain NOT_RUN/);
  mutateJson(implementation, value => { value.verification = { postgres_integration: 'PASS' }; }, /cannot reuse historical PASS/);
  mutateJson(implementation, value => { value.runtime_activation = 'ACTIVE'; }, /runtime activation remains independently unproven/);
  mutateJson(implementation, value => { value.shared_or_production_migration_execution_authorized = true; }, /shared\/production execution remains excluded/);
});

test('unrelated physical histories, semantic authority and all original migration bytes remain enforced', () => {
  for (const path of ['persistence/physical-slices/certification/admission-evidence-plan.json', 'persistence/physical-slices/identity-tokens/implementation.json', 'persistence/physical-slices/learning-session/registration.json', 'persistence/physical-slices/learning-session/foundation.json']) mutate(path, text => text + '\n', /unchanged preceding source drift/);
  mutateJson('kernel/entities.json', value => { value.entries.find(row => row.id === 'DemoRun').status = 'candidate'; }, /exact approved overlay/);
  mutate('drizzle/0004_slice_p05_learning_session.sql', text => text + '\n', /historical migration changed/);
  mutate('drizzle/meta/0004_snapshot.json', text => text + '\n', /historical metadata changed/);
  mutateJson('drizzle/meta/_journal.json', value => { value.entries[0].when += 1; }, /original journal prefix must remain immutable/);
});

test('physical evidence inventory rejects unknown files, directories and symlinks', () => {
  const extra = join(fixture, DEMO_PHYSICAL_LANE, 'unauthorized-policy.json');
  try { writeFileSync(extra, '{}'); assert.match(inspect().errors.join('\n'), /physical evidence directory inventory/); }
  finally { rmSync(extra, { force: true }); }
  try { mkdirSync(extra); assert.match(inspect().errors.join('\n'), /physical evidence directory inventory|only regular files/); }
  finally { rmSync(extra, { recursive: true, force: true }); }
  const path = DEMO_PHYSICAL_PATHS[0], original = raw(path);
  try {
    rmSync(join(fixture, path)); symlinkSync('queue-post-p05.json', join(fixture, path));
    assert.match(inspect().errors.join('\n'), /regular file\/ancestor required/);
  } finally { rmSync(join(fixture, path), { force: true }); writeFileSync(join(fixture, path), original); }
});

test('historical view refuses invalid physical successor and never substitutes live runtime files', () => {
  const path = DEMO_PHYSICAL_PATHS[0], original = raw(path);
  try {
    writeFileSync(join(fixture, path), original + '\n');
    assert.throws(() => createHistoricalSourceReader(fixture), /exact nine-path successor envelope/);
  } finally { writeFileSync(join(fixture, path), original); }
  const migration = 'drizzle/0004_slice_p05_learning_session.sql';
  const reader = createHistoricalSourceReader(fixture), before = raw(migration);
  try { writeFileSync(join(fixture, migration), before + '\n'); assert.equal(reader(migration), before + '\n'); }
  finally { writeFileSync(join(fixture, migration), before); }
});

test('semantic and physical orchestrators terminate normally without recursive gate calls', () => {
  const registration = inspect();
  assert.deepEqual(registration.errors, []);
  assert.deepEqual(inspectDemoPhysicalPrerequisites(fixture, registration).errors, []);
  for (const script of ['scripts/kernel/validate-demo-runtime-registration.mjs', 'scripts/persistence/validate-demo-physical-admission.mjs']) {
    const result = spawnSync(process.execPath, [join(root, script)], { cwd: fixture, encoding: 'utf8', timeout: 5000 });
    assert.equal(result.error, undefined);
    assert.equal(result.signal, null);
    assert.equal(result.status, 0, result.stdout + result.stderr);
  }
});

test('real physical CLI rejects changed live admission and cannot be replaced by a no-op', () => {
  const path=`${DEMO_PHYSICAL_LANE}/admission.json`, original=raw(path);
  try {
    const value=JSON.parse(original);value.decision='BLOCK';writeFileSync(join(fixture,path),JSON.stringify(value));
    const result=spawnSync(process.execPath,[join(root,'scripts/persistence/validate-demo-physical-admission.mjs')],{cwd:fixture,encoding:'utf8',timeout:5000});
    assert.equal(result.error,undefined);assert.equal(result.signal,null);assert.equal(result.status,1);
    assert.match(result.stderr,/exact package registration and dependency closure must PASS/);
  } finally { writeFileSync(join(fixture,path),original); }
});
