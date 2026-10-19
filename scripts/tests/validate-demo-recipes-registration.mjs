import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { createHash } from 'node:crypto';
import { cpSync, mkdtempSync, readFileSync, writeFileSync, rmSync, mkdirSync, renameSync, symlinkSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { inspectRecipeRegistration, RECIPE_BASE, RECIPE_PROPOSAL, RECIPE_PACKAGE_SHA256, RECIPE_REGISTRATION_SHA256, RECIPE_PREDECESSOR_PROPOSAL, RECIPE_SCHEMA_PROJECTION } from '../kernel/demo-recipes-registration.mjs';
import { inspectDemoRuntimeRegistration, createHistoricalSourceReader } from '../kernel/demo-runtime-registration.mjs';
const root = resolve(new URL('../..', import.meta.url).pathname);
const fixture = mkdtempSync(join(tmpdir(), 'teach-recipe-registration-'));
for (const name of ['kernel', 'domains', 'contracts', 'application-interfaces', 'governance', 'persistence', 'drizzle']) cpSync(join(root, name), join(fixture, name), { recursive: true });
after(() => rmSync(fixture, { recursive: true, force: true }));
const raw = path => readFileSync(join(fixture, path), 'utf8');
const json = path => JSON.parse(raw(path));
const hash = value => createHash('sha256').update(value).digest('hex');
const change = (path, mutate, inspect = inspectRecipeRegistration, pattern = /demo recipe registration/) => {
  const original = raw(path);
  try {
    writeFileSync(join(fixture, path), mutate(original));
    const result = inspect(fixture);
    assert.ok(result.errors.length, `accepted mutation of ${path}`);
    assert.match(result.errors.join('\n'), pattern);
    if (inspect === inspectRecipeRegistration) {
      assert.deepEqual(result.revisedPaths, []);
      assert.deepEqual(result.addedPaths, []);
      assert.deepEqual(result.predecessorFiles, {});
    }
  } finally { writeFileSync(join(fixture, path), original); }
};
const changeJson = (path, mutate, ...rest) => change(path, text => { const value = JSON.parse(text); mutate(value); return JSON.stringify(value, null, 2) + '\n'; }, ...rest);

test('exact bounded recipe registration passes without claiming review, runtime or deployment authority', () => {
  for (const target of [root, fixture]) {
    const result = inspectRecipeRegistration(target);
    assert.deepEqual(result.errors, []);
    assert.equal(result.present, true);
    assert.equal(result.revisedPaths.length, 5);
    assert.equal(result.addedPaths.length, 20);
    assert.equal(result.registration.independent_verification, 'NOT_ESTABLISHED_BY_REGISTRATION');
    assert.equal(result.registration.implementation_conformance, 'UNKNOWN');
    assert.equal(result.registration.runtime_activation_authorized, false);
    assert.equal(result.registration.shared_or_production_execution_authorized, false);
    assert.equal(result.packageSha256, RECIPE_PACKAGE_SHA256);
    const original = inspectDemoRuntimeRegistration(target);
    assert.deepEqual(original.errors, []);
    assert.equal(original.registeredEntries, 131);
    assert.equal(original.closure.approvedEntries, 236);
    assert.equal(original.closure.checkedReferences, 583);
    assert.equal(original.physicalSuccessor.revisedPaths.length, 9);
  }
  assert.equal(hash(raw(`${RECIPE_BASE}/registration.json`)), RECIPE_REGISTRATION_SHA256);
});

test('original immutable registration and all original package source bytes remain pinned', () => {
  assert.equal(hash(raw('domains/demo-runtime/registration.json')), 'b94cf7c7c9bab35ad2454470295ae2b04b8814bd0ac55c282cdd3dd6df67218d');
  assert.equal(hash(raw('domains/demo-runtime/proposal-0.1.0/SHA256SUMS')), 'a1df23b03a0f0660a072cff00eb40d3d2fb60bc8c521f12b56977f559601196a');
  change('domains/demo-runtime/registration.json', text => text + '\n');
  change('domains/demo-runtime/proposal-0.1.0/learning-definition.json', text => text + '\n', inspectDemoRuntimeRegistration, /immutable package file differs/);
});

test('every changed active authority and superseded copy is checked live, not hidden by historical reads', () => {
  for (const path of Object.keys(json(`${RECIPE_BASE}/registration.json`).authority_file_hashes)) {
    change(path, text => text + '\n');
    change(path, text => text + '\n', inspectDemoRuntimeRegistration, /registered authority file differs/);
  }
});

test('predecessor byte, baseline commit, active metadata and approval provenance cannot be rewritten', () => {
  changeJson(`${RECIPE_BASE}/source-baseline.json`, value => { value.baseline_commit = '0'.repeat(40); });
  changeJson(`${RECIPE_BASE}/source-baseline.json`, value => { value.files['contracts/c31-content-teaching-engine-contract.md'] += '\n'; });
  changeJson(`${RECIPE_BASE}/owner-approval.json`, value => { value.response.text = 'approve deployment'; });
  changeJson(`${RECIPE_BASE}/owner-approval.json`, value => { value.question.message_id = 'invented'; });
  changeJson(`${RECIPE_BASE}/owner-approval.json`, value => { value.sys21_issue.number = 82; });
  change('contracts/c31-content-teaching-engine-contract.md', text => text.replace('"version": "1.4.0"', '"version": "1.5.0"'));
});

test('activation, spending, review and semantic expansion claims cannot be introduced by registration edits', () => {
  for (const key of ['runtime_activation_authorized', 'physical_admission_performed', 'shared_or_production_execution_authorized', 'hosting_authorized', 'spending_authorized', 'live_database_changes_authorized']) changeJson(`${RECIPE_BASE}/registration.json`, value => { value[key] = true; });
  for (const key of ['new_semantic_entries', 'new_tables', 'new_routes', 'new_capabilities']) changeJson(`${RECIPE_BASE}/registration.json`, value => { value[key] = 1; });
  changeJson(`${RECIPE_BASE}/registration.json`, value => { value.new_migrations = 2; });
  for (const key of ['independent_verification', 'implementation_conformance']) changeJson(`${RECIPE_BASE}/registration.json`, value => { value[key] = 'PASS'; });
  for (const key of ['exact_content_schema_versions', 'exact_public_content_schema_versions']) changeJson(`${RECIPE_BASE}/registration.json`, value => { value[key].push('1.2.0'); });
});

test('self-rehashed approval, source, contract or package mutations cannot grant authority', () => {
  const registrationPath = `${RECIPE_BASE}/registration.json`, originalRegistration = raw(registrationPath);
  for (const [path, field] of [
    [`${RECIPE_BASE}/owner-approval.json`, 'approval_sha256'],
    [`${RECIPE_BASE}/source-baseline.json`, 'source_baseline_sha256'],
    [`${RECIPE_PROPOSAL}/SHA256SUMS`, 'package_sha256sums_digest'],
    ['contracts/c31-content-teaching-engine-contract.md', null],
  ]) {
    const original = raw(path);
    try {
      const changed = original + '\n'; writeFileSync(join(fixture, path), changed);
      const registration = JSON.parse(originalRegistration);
      if (field) registration[field] = hash(changed); else registration.authority_file_hashes[path] = hash(changed);
      writeFileSync(join(fixture, registrationPath), JSON.stringify(registration, null, 2) + '\n');
      assert.match(inspectRecipeRegistration(fixture).errors.join('\n'), /immutable evidence differs/);
    } finally { writeFileSync(join(fixture, path), original); writeFileSync(join(fixture, registrationPath), originalRegistration); }
  }
});

test('every immutable successor artifact, checksum and evidence record rejects byte drift', () => {
  for (const line of raw(`${RECIPE_PROPOSAL}/SHA256SUMS`).trimEnd().split('\n')) {
    const [, path] = line.split('  ');
    change(`${RECIPE_PROPOSAL}/${path}`, text => text + '\n');
  }
  for (const path of [`${RECIPE_PROPOSAL}/SHA256SUMS`, ...['README.md', 'owner-approval.json', 'registration.json', 'source-baseline.json'].map(name => `${RECIPE_BASE}/${name}`)]) change(path, text => text + '\n');
});

test('unlisted files, nested sources, symlinks and orphan registrations fail closed', () => {
  for (const base of [RECIPE_BASE, RECIPE_PROPOSAL]) {
    const file = join(fixture, base, 'extra.json');
    try { writeFileSync(file, '{}'); assert.match(inspectRecipeRegistration(fixture).errors.join('\n'), /directory inventory/); }
    finally { rmSync(file, { force: true }); }
    const directory = join(fixture, base, 'nested');
    try { mkdirSync(directory); assert.match(inspectRecipeRegistration(fixture).errors.join('\n'), /directory inventory|regular files/); }
    finally { rmSync(directory, { recursive: true, force: true }); }
  }
  const path = join(fixture, RECIPE_BASE, 'owner-approval.json'), saved = `${path}.saved`;
  try { renameSync(path, saved); symlinkSync('owner-approval.json.saved', path); assert.match(inspectRecipeRegistration(fixture).errors.join('\n'), /regular file/); }
  finally { rmSync(path, { force: true }); renameSync(saved, path); }
  const registration = join(fixture, RECIPE_BASE, 'registration.json'), held = `${registration}.saved`;
  try { renameSync(registration, held); assert.match(inspectRecipeRegistration(fixture).errors.join('\n'), /orphan/); }
  finally { renameSync(held, registration); }
});

test('unrelated original route, capability and governance changes still fail original authority checks', () => {
  changeJson('kernel/capabilities.json', value => { value.entries.push({ ...value.entries[0], id: 'recipe.admin.read' }); }, inspectDemoRuntimeRegistration, /exact approved overlay|registered capability names/);
  change('governance/decision-closure/c14-capability-matrix.json', text => text + '\n', inspectDemoRuntimeRegistration, /registered authority file differs/);
  change('domains/demo-runtime/proposal-0.1.0/transport-and-queries.json', text => text + '\n', inspectDemoRuntimeRegistration, /immutable package file differs/);
});

test('predecessor-only checkout remains accepted, but cannot pretend recipe registration exists', () => {
  const source = json(`${RECIPE_BASE}/source-baseline.json`);
  const registration = json(`${RECIPE_BASE}/registration.json`);
  const live = Object.fromEntries(Object.keys(source.files).map(path => [path, raw(path)]));
  const archives = Object.fromEntries(registration.contracts.map(row => [row.superseded_copy, raw(row.superseded_copy)]));
  const parked = join(fixture, 'parked-recipe-evidence');
  const projection = raw(RECIPE_SCHEMA_PROJECTION);
  // Remove the later schema successor as a complete layer before constructing
  // a runtime-only predecessor. Retaining its current docs would not be old scope.
  const schemaBase = 'governance/demo-schema-isolation';
  const schemaSource = existsSync(join(fixture, schemaBase)) ? json(`${schemaBase}/source-baseline.json`) : null;
  const schemaRegistration = schemaSource ? json(`${schemaBase}/registration.json`) : null;
  const schemaLive = schemaSource ? Object.fromEntries(Object.keys(schemaRegistration.authority_file_hashes).map(path => [path, raw(path)])) : {};
  const schemaParked = join(fixture, 'parked-schema-evidence');
  try {
    if (schemaSource) {
      renameSync(join(fixture, schemaBase), schemaParked);
      for (const [path, text] of Object.entries(schemaSource.files)) writeFileSync(join(fixture, path), text);
      for (const path of Object.keys(schemaLive)) if (!Object.hasOwn(schemaSource.files, path)) rmSync(join(fixture, path));
    }
    renameSync(join(fixture, RECIPE_BASE), parked);
    rmSync(join(fixture, RECIPE_SCHEMA_PROJECTION));
    for (const [path, text] of Object.entries(source.files)) writeFileSync(join(fixture, path), text);
    for (const path of Object.keys(archives)) rmSync(join(fixture, path));
    assert.deepEqual(inspectRecipeRegistration(fixture), { present: false, revisedPaths: [], addedPaths: [], predecessorFiles: {}, errors: [] });
    assert.deepEqual(inspectDemoRuntimeRegistration(fixture).errors, []);
  } finally {
    renameSync(parked, join(fixture, RECIPE_BASE));
    writeFileSync(join(fixture, RECIPE_SCHEMA_PROJECTION), projection);
    for (const [path, text] of Object.entries({ ...live, ...archives })) writeFileSync(join(fixture, path), text);
    if (schemaSource) {
      renameSync(schemaParked, join(fixture, schemaBase));
      for (const [path, text] of Object.entries(schemaLive)) writeFileSync(join(fixture, path), text);
    }
  }
});

test('historical reader cannot launder a mutated current recipe contract', () => {
  const path = 'contracts/c31-content-teaching-engine-contract.md', original = raw(path);
  try {
    writeFileSync(join(fixture, path), original + '\n');
    assert.throws(() => createHistoricalSourceReader(fixture), /registered authority file differs/);
  } finally { writeFileSync(join(fixture, path), original); }
});

test('all three successor contracts retain four-column changelog headers and source history', () => {
  for (const row of json(`${RECIPE_BASE}/registration.json`).contracts) {
    const current = raw(row.path), archived = raw(row.superseded_copy);
    assert.match(current, /\| Version \| Date \| Change \| By \|/);
    assert.match(archived, /\| Version \| Date \| Change \| By \|/);
    assert.ok(current.includes(`| ${row.to} | 2026-10-18 |`));
    assert.ok(current.includes(`| ${row.from} | 2026-10-17 |`));
    assert.ok(!current.includes(`\n\n| ${row.from} | 2026-10-17 |`));
    assert.ok(!current.includes("the owner states v2 is yet to be built"));
  }
});


test('corrective 0.1.1 preserves exact original recipe artifacts and both approvals', () => {
  const approval = json(`${RECIPE_BASE}/owner-approval.json`), registration = json(`${RECIPE_BASE}/registration.json`);
  assert.equal(registration.package_version, '0.1.1');
  assert.equal(registration.new_migrations, 1);
  assert.equal(registration.physical_extension.independent_review_required, true);
  assert.equal(registration.physical_extension.execution_scope, 'DISPOSABLE_LOCAL_ONLY');
  assert.equal(approval.response.message_id, 'Sentinel_225d967327cc819188c782fd856bd9e7');
  assert.equal(approval.previous_approval.response.message_id, 'Sentinel_b14361f04f608191af99747e22ca8841');
  for (const line of raw(`${RECIPE_PREDECESSOR_PROPOSAL}/SHA256SUMS`).trimEnd().split('\n')) {
    const [, path] = line.split('  ');
    change(`${RECIPE_PREDECESSOR_PROPOSAL}/${path}`, text => text + '\n');
  }
  for (const key of ['independent_review_required', 'separate_physical_admission_required', 'historical_migrations_immutable']) changeJson(`${RECIPE_BASE}/registration.json`, value => { value.physical_extension[key] = false; });
  for (const key of ['new_database_or_table_authorized', 'live_data_changes_authorized']) changeJson(`${RECIPE_BASE}/registration.json`, value => { value.physical_extension[key] = true; });
});

test('one finite ContentPack schema-reference projection does not rewrite original canonical entries', () => {
  const projection = json(RECIPE_SCHEMA_PROJECTION);
  assert.deepEqual(projection.target, { path: 'kernel/entities.json', entry: 'ContentPack', field: 'fields.versionPayload' });
  assert.deepEqual(projection.exact_schema_references.map(row => row.version), ['1.0.0', '1.1.0']);
  assert.equal(hash(raw('kernel/entities.json')), projection.predecessor_registry_sha256);
  changeJson(RECIPE_SCHEMA_PROJECTION, value => { value.target.entry = 'LearningSession'; });
  changeJson(RECIPE_SCHEMA_PROJECTION, value => { value.exact_schema_references.push({ version: '1.2.0', path: 'arbitrary.json', pointer: '' }); });
  changeJson(RECIPE_SCHEMA_PROJECTION, value => { value.new_concepts.push('Recipe'); });
  changeJson(RECIPE_SCHEMA_PROJECTION, value => { value.runtime_activation_authorized = true; });
});


test('standalone recipe gate verifies every original runtime package artifact and original provenance', () => {
  for (const line of raw('domains/demo-runtime/proposal-0.1.0/SHA256SUMS').trimEnd().split('\n')) {
    const [, path] = line.split('  ');
    change(`domains/demo-runtime/proposal-0.1.0/${path}`, text => text + '\n');
  }
  for (const path of ['domains/demo-runtime/owner-approval.json', 'domains/demo-runtime/source-baseline.json']) change(path, text => text + '\n');
});
