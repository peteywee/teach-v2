import { inspectAuthoringRecoveryRegistration, AUTHORING_RECOVERY_ARCHIVES, AUTHORING_RECOVERY_BASE } from '../kernel/demo-authoring-recovery-registration.mjs';
import { installAuthoringPredecessor } from './authoring-predecessor-fixture.mjs';
import { RECOVERY_BASE, RECOVERY_ARCHIVES } from '../kernel/demo-recovery-registration.mjs';
import './validate-demo-recovery-registration.mjs';
import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { createHash } from 'node:crypto';
import { cpSync, mkdtempSync, readFileSync, writeFileSync, rmSync, mkdirSync, renameSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { inspectSchemaIsolationRegistration, SCHEMA_ISOLATION_BASE as BASE, SCHEMA_ISOLATION_REVISED_PATHS as REVISED, SCHEMA_ISOLATION_REGISTRATION_SHA256 } from '../kernel/demo-schema-isolation-registration.mjs';
import { inspectRecipeRegistration } from '../kernel/demo-recipes-registration.mjs';
import { inspectDemoRuntimeRegistration, createHistoricalSourceReader } from '../kernel/demo-runtime-registration.mjs';
import { withKitchenPredecessor } from './kitchen-predecessor-fixture.mjs';

const root = resolve(new URL('../..', import.meta.url).pathname);
const fixture = mkdtempSync(join(tmpdir(), 'teach-schema-registration-'));
for (const name of ['docs', 'scripts', '.github', 'verification', 'kernel', 'domains', 'contracts', 'application-interfaces', 'governance', 'persistence', 'drizzle', 'drizzle-isolated', 'src', 'tests']) cpSync(join(root, name), join(fixture, name), { recursive: true });
installAuthoringPredecessor(fixture);
after(() => rmSync(fixture, { recursive: true, force: true }));
const raw = path => readFileSync(join(fixture, path), 'utf8');
const json = path => JSON.parse(raw(path));
const hash = value => createHash('sha256').update(value).digest('hex');
const registrationPath = `${BASE}/registration.json`;
const inspectAll = () => [inspectSchemaIsolationRegistration(fixture), inspectRecipeRegistration(fixture), inspectDemoRuntimeRegistration(fixture)];
const denied = () => {
  for (const result of inspectAll()) {
    assert.ok(result.errors.length, 'invalid schema successor accepted');
    assert.match(result.errors.join('\n'), /demo (?:schema isolation |recipe )?registration/);
    if (Object.hasOwn(result, 'predecessorFiles')) {
      assert.deepEqual(result.predecessorFiles, {});
      assert.deepEqual(result.revisedPaths, []);
      assert.deepEqual(result.addedPaths, []);
    }
  }
  assert.throws(() => createHistoricalSourceReader(fixture), /demo (?:schema isolation |recipe )?registration/);
};
const change = (path, mutate) => {
  const original = raw(path);
  try { writeFileSync(join(fixture, path), mutate(original)); denied(); }
  finally { writeFileSync(join(fixture, path), original); }
};
const changeJson = (path, mutate) => change(path, text => { const value = JSON.parse(text); mutate(value); return JSON.stringify(value, null, 2) + '\n'; });

test('exact bounded decision verifies current sources before exposing four predecessors and six additions', () => {
  assert.equal(hash(raw(registrationPath)), SCHEMA_ISOLATION_REGISTRATION_SHA256);
  for (const target of [root, fixture]) {
    const result = inspectSchemaIsolationRegistration(target);
    assert.deepEqual(result.errors, []);
    assert.deepEqual(result.revisedPaths, [...REVISED]);
    const policy = inspectAuthoringRecoveryRegistration(target);
    assert.deepEqual(policy.errors, []);
    const policyPaths = policy.present ? [...AUTHORING_RECOVERY_ARCHIVES, ...['adoption.md','adoption-registration.json','owner-adoption.json','source-baseline.json','impact-map.json','adoption-independent-review.json'].map(name => `${AUTHORING_RECOVERY_BASE}/${name}`)] : [];
    assert.deepEqual(policy.addedPaths, policyPaths);
    const historicalPaths = ['contracts/superseded/c21-database-migration-contract-1.2.0.md','governance/decision-closure/superseded/07-evidence-release-operations-spec-1.1.0.md', ...['design.md','owner-approval.json','source-baseline.json','registration.json'].map(name => `${BASE}/${name}`), ...RECOVERY_ARCHIVES];
    assert.equal(historicalPaths.length, 8);
    assert.deepEqual(result.addedPaths.filter(path => !policyPaths.includes(path)).sort(), historicalPaths.slice().sort());
    assert.deepEqual(result.addedPaths.slice().sort(), [...historicalPaths, ...policyPaths].sort());
    assert.equal(result.addedPaths.length, 8 + policyPaths.length);
    assert.equal(result.registration.schema, 'teach_v2_demo');
    assert.equal(result.registration.node_major, 24);
    assert.equal(result.registration.local_preparation_authorized, true);
    assert.equal(result.registration.runtime_activation_authorized, false);
    assert.equal(result.registration.physical_admission_performed, false);
    assert.equal(result.registration.independent_verification, 'NOT_ESTABLISHED_BY_REGISTRATION');
    assert.equal(result.registration.implementation_conformance, 'NOT_ESTABLISHED_BY_REGISTRATION');
    assert.deepEqual(inspectRecipeRegistration(target).errors, []);
    assert.deepEqual(inspectDemoRuntimeRegistration(target).errors, []);
  }
});

test('all six current authority files and all four evidence records reject byte drift without predecessor access', () => {
  for (const path of [...Object.keys(json(registrationPath).authority_file_hashes), ...['design.md', 'owner-approval.json', 'source-baseline.json', 'registration.json'].map(name => `${BASE}/${name}`)]) change(path, text => text + '\n');
});

test('activation, credential, spending, execution and fabricated review cannot expand local-only approval', () => {
  for (const path of [registrationPath, `${BASE}/owner-approval.json`]) {
    for (const flag of ['runtime_activation_authorized', 'shared_or_production_execution_authorized', 'live_database_changes_authorized', 'credential_creation_authorized', 'deployment_authorized', 'spending_authorized']) changeJson(path, value => { value[flag] = true; });
    changeJson(path, value => { value.node_major = 22; });
    changeJson(path, value => { value.schema = 'public'; });
    changeJson(path, value => { value.independent_verification = 'PASS'; });
  }
  changeJson(registrationPath, value => { value.physical_admission_performed = true; });
  changeJson(registrationPath, value => { value.implementation_conformance = 'PROVEN'; });
  changeJson(`${BASE}/owner-approval.json`, value => { value.approved_scope = ['approve deployment']; });
});

test('wrong predecessor snapshots, commits, paths and self-rehashed authority cannot become a new trust root', () => {
  changeJson(`${BASE}/source-baseline.json`, value => { value.source_baseline_commit = '0'.repeat(40); });
  for (const path of REVISED) changeJson(`${BASE}/source-baseline.json`, value => { value.files[path] += '\n'; });
  for (const path of ['domains/demo-runtime/registration.json', 'domains/demo-recipes/registration.json']) change(path, text => text + '\n');
  const originalRegistration = raw(registrationPath);
  for (const [path, field] of [[`${BASE}/owner-approval.json`, 'approval_sha256'], [`${BASE}/source-baseline.json`, 'source_baseline_sha256'], [`${BASE}/design.md`, 'design_sha256'], [REVISED[0], null]]) {
    const original = raw(path);
    try {
      const changed = original + '\n'; writeFileSync(join(fixture, path), changed);
      const registration = JSON.parse(originalRegistration);
      if (field) registration[field] = hash(changed); else registration.authority_file_hashes[path] = hash(changed);
      writeFileSync(join(fixture, registrationPath), JSON.stringify(registration, null, 2) + '\n');
      denied();
      assert.match(inspectSchemaIsolationRegistration(fixture).errors.join('\n'), /immutable evidence differs: governance\/demo-schema-isolation\/registration.json/);
    } finally { writeFileSync(join(fixture, path), original); writeFileSync(join(fixture, registrationPath), originalRegistration); }
  }
  changeJson(registrationPath, value => { value.authority_file_hashes['../../outside-secret'] = '0'.repeat(64); value.added_paths.push('../../outside-secret'); });
  changeJson(`${BASE}/source-baseline.json`, value => { value.files['kernel/entities.json'] = '{}'; });
});

test('evidence inventory, symlinks and missing or orphan records fail closed', () => {
  const extra = join(fixture, BASE, 'unapproved.json'), nested = join(fixture, BASE, 'unapproved');
  try { writeFileSync(extra, '{}'); denied(); } finally { rmSync(extra, { force: true }); }
  try { mkdirSync(nested); denied(); } finally { rmSync(nested, { recursive: true, force: true }); }
  const approval = join(fixture, BASE, 'owner-approval.json'), heldApproval = join(fixture, 'held-schema-approval.json');
  try { renameSync(approval, heldApproval); symlinkSync(heldApproval, approval); denied(); }
  finally { rmSync(approval, { force: true }); renameSync(heldApproval, approval); }
  const registration = join(fixture, registrationPath), held = join(fixture, 'held-schema-registration.json');
  try { renameSync(registration, held); denied(); assert.match(inspectSchemaIsolationRegistration(fixture).errors.join('\n'), /orphan/); }
  finally { renameSync(held, registration); }
  const parked = join(fixture, 'held-schema-evidence');
  try { renameSync(join(fixture, BASE), parked); denied(); assert.match(inspectSchemaIsolationRegistration(fixture).errors.join('\n'), /orphan/); }
  finally { renameSync(parked, join(fixture, BASE)); }
  const runtime = join(fixture, 'domains/demo-runtime/registration.json'), heldRuntime = join(fixture, 'held-runtime-registration.json');
  try { renameSync(runtime, heldRuntime); assert.ok(inspectDemoRuntimeRegistration(fixture).errors.length); }
  finally { renameSync(heldRuntime, runtime); }
});

test('unregistered authority remains rejected outside the exact six successor additions', () => {
  for (const directory of ['contracts/superseded', 'governance/decision-closure/superseded', 'governance/demo-schema-isolation']) {
    const file = join(fixture, directory, 'unapproved-authority.json');
    try {
      writeFileSync(file, '{}');
      assert.ok(inspectDemoRuntimeRegistration(fixture).errors.length);
      assert.throws(() => createHistoricalSourceReader(fixture), /unexpected active authority file|evidence directory inventory/);
    } finally { rmSync(file, { force: true }); }
  }
});

test('historical reader cannot accept a caller-forged snapshot or hide current drift without physical envelope', () => {
  const source = json('domains/demo-runtime/source-baseline.json'); source.files[REVISED[0]] = 'forged historical authority';
  assert.throws(() => createHistoricalSourceReader(fixture, source), /verified source snapshot/);
  const envelope = join(fixture, 'persistence/physical-slices/demo-runtime/physical-successor.json'), held = join(fixture, 'held-physical-envelope.json');
  const current = raw(REVISED[0]);
  try { renameSync(envelope, held); writeFileSync(join(fixture, REVISED[0]), current + '\n'); assert.throws(() => createHistoricalSourceReader(fixture), /registered authority file differs/); }
  finally { writeFileSync(join(fixture, REVISED[0]), current); renameSync(held, envelope); }
});

test('complete predecessor-only checkout remains valid when the entire successor layer is absent', () => withKitchenPredecessor(fixture, () => {
  const registration = json(registrationPath), source = json(`${BASE}/source-baseline.json`);
  const live = Object.fromEntries(Object.keys(registration.authority_file_hashes).map(path => [path, raw(path)]));
  const parked = join(fixture, 'held-complete-schema-evidence');
  const recoveryParked = join(fixture, 'held-complete-recovery-evidence');
  const recoveryArchives = Object.fromEntries(RECOVERY_ARCHIVES.map(path => [path, raw(path)]));
  try {
    renameSync(join(fixture, RECOVERY_BASE), recoveryParked);
    for (const path of RECOVERY_ARCHIVES) rmSync(join(fixture, path));
    renameSync(join(fixture, BASE), parked);
    for (const [path, text] of Object.entries(source.files)) writeFileSync(join(fixture, path), text);
    for (const path of Object.keys(live)) if (!Object.hasOwn(source.files, path)) rmSync(join(fixture, path));
    assert.deepEqual(inspectSchemaIsolationRegistration(fixture), { present: false, revisedPaths: [], addedPaths: [], predecessorFiles: {}, errors: [] });
    assert.deepEqual(inspectRecipeRegistration(fixture).errors, []);
    assert.deepEqual(inspectDemoRuntimeRegistration(fixture).errors, []);
  } finally {
    renameSync(recoveryParked, join(fixture, RECOVERY_BASE));
    for (const [path, text] of Object.entries(recoveryArchives)) writeFileSync(join(fixture, path), text);
    renameSync(parked, join(fixture, BASE));
    for (const [path, text] of Object.entries(live)) writeFileSync(join(fixture, path), text);
  }
}));
