import { inspectSchemaIsolationEngineering } from '../verification/demo-schema-isolation-engineering.mjs';
import { createAuthoringPredecessorCopy } from './authoring-proof-copy.mjs';
import { inspectDemoRecoveryRegistration } from '../kernel/demo-recovery-registration.mjs';
import { hasGuardedDatabaseEntry } from '../architecture/repository-integration-evidence.mjs';
import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { readFileSync, writeFileSync, rmSync, renameSync, symlinkSync, mkdirSync, lstatSync, realpathSync, existsSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import { inspectAuthoringRegistration, AUTHORING_OPERATIONS } from '../kernel/demo-authoring-registration.mjs';
import { inspectAuthoringEngineering, AUTHORING_ENGINEERING_MANIFEST, AUTHORING_ENGINEERING_REVIEW } from '../verification/demo-authoring-engineering.mjs';
import { inspectAuthoringPhysicalSuccessor } from '../persistence/demo-authoring-physical-successor.mjs';
import { inspectRecipeRegistration } from '../kernel/demo-recipes-registration.mjs';
import { inspectDemoRuntimeRegistration } from '../kernel/demo-runtime-registration.mjs';
import { inspectKitchenRegistration } from '../kernel/demo-kitchen-registration.mjs';
import { inspectKitchenEngineering } from '../verification/demo-kitchen-engineering.mjs';
import { inspectDemoRecipePhysicalSuccessor } from '../persistence/demo-recipes-physical-successor.mjs';
import { inspectKitchenPhysicalSuccessor } from '../persistence/demo-kitchen-physical-successor.mjs';
import { buildDemoRouteInventory, inspectDemoRouteSource } from '../verification/demo-route-inventory.mjs';
import { installAuthoringPredecessor } from './authoring-predecessor-fixture.mjs';
import { authoringSourceFixture } from './authoring-source-fixture.mjs';
import { inspectSourceInScope } from '../verification/source-inspection-scope.mjs';
import { inspectSuccessorClosure } from '../packaging/inspect-successor-closure.mjs';

const root = resolve(new URL('../..', import.meta.url).pathname), fixture = authoringSourceFixture(root);
after(() => rmSync(fixture, { recursive: true, force: true }));
const inspect = () => [inspectAuthoringRegistration(fixture), inspectAuthoringEngineering(fixture), inspectAuthoringPhysicalSuccessor(fixture)];
function denied() {
  const results = inspectSourceInScope('authoringAdmissionPair', fixture);
  assert.ok(results.some(result => result.errors.length), 'a changed current candidate must fail closed');
  assert.equal(results[1].admitted, false);
  for (const result of results.filter(result => result.errors.length)) { assert.deepEqual(result.predecessorFiles, {}); assert.deepEqual(result.revisedPaths, []); assert.deepEqual(result.addedPaths, []); }
}
function mutate(path, transform = bytes => bytes + '\n') {
  const full = join(fixture, path), original = readFileSync(full, 'utf8');
  try { const changed = transform(original); assert.notEqual(changed, original); writeFileSync(full, changed); denied(); }
  finally { writeFileSync(full, original); }
}
test('authoring source, independent review and two-table physical successor pass without execution authority', () => {
  for (const target of [root, fixture]) {
    const source = inspectAuthoringRegistration(target), engineering = inspectAuthoringEngineering(target), physical = inspectAuthoringPhysicalSuccessor(target);
    for (const result of [source, engineering, physical]) { assert.equal(result.present, true); assert.deepEqual(result.errors, []); }
    assert.equal(physical.admitted, true); assert.equal(physical.migrationCount, 9);
    assert.deepEqual(source.registration.operations, [...AUTHORING_OPERATIONS]);
    assert.equal(source.registration.runtime_activation_authorized, false); assert.equal(source.registration.execution_authorized_by_registration, false);
    for (const result of [inspectKitchenRegistration(target), inspectKitchenEngineering(target), inspectKitchenPhysicalSuccessor(target), inspectDemoRecipePhysicalSuccessor(target), inspectRecipeRegistration(target), inspectDemoRuntimeRegistration(target)]) assert.deepEqual(result.errors, []);
  }
});
test('every current authoring source and preserved immutable byte is independently sealed', () => {
  const manifest = JSON.parse(readFileSync(join(fixture, AUTHORING_ENGINEERING_MANIFEST), 'utf8'));
  for (const path of [...Object.keys(manifest.current_sha256), ...Object.keys(manifest.immutable_sha256)]) mutate(path);
});
test('forged reviews, registrations and predecessor snapshots cannot expose authority', () => {
  for (const path of [AUTHORING_ENGINEERING_MANIFEST, AUTHORING_ENGINEERING_REVIEW, 'domains/demo-authoring/registration.json', 'domains/demo-authoring/source-baseline.json', 'domains/demo-authoring/owner-approval.json']) mutate(path);
  mutate(AUTHORING_ENGINEERING_MANIFEST, bytes => { const value = JSON.parse(bytes); const path = Object.keys(value.predecessor_files)[0]; value.predecessor_files[path] += '\n'; return JSON.stringify(value); });
});
test('missing, symlink, orphan and extra evidence cannot be admitted', () => {
  for (const relative of [AUTHORING_ENGINEERING_REVIEW, 'domains/demo-authoring/registration.json', 'persistence/physical-slices/demo-authoring']) {
    const path = join(fixture, relative), held = path + '.held';
    renameSync(path, held); try { denied(); } finally { renameSync(held, path); }
  }
  const path = join(fixture, AUTHORING_ENGINEERING_REVIEW), held = path + '.held';
  renameSync(path, held); try { symlinkSync(held, path); denied(); } finally { rmSync(path); renameSync(held, path); }
  for (const base of ['domains/demo-authoring', 'verification/demo-authoring', 'persistence/physical-slices/demo-authoring']) {
    const extra = join(fixture, base, 'unreviewed.json'); try { writeFileSync(extra, '{}'); denied(); } finally { rmSync(extra); }
    const nested = join(fixture, base, 'unreviewed'); try { mkdirSync(nested); denied(); } finally { rmSync(nested, { recursive: true }); }
  }
});
test('all eight historical migration prefixes and unknown suffixes remain fail closed', () => {
  const baseline = JSON.parse(readFileSync(join(fixture, 'persistence/physical-slices/demo-authoring/immutable-baseline.json'), 'utf8'));
  assert.equal(Object.keys(baseline.files).length, 24);
  for (const path of Object.keys(baseline.files)) mutate(path);
  for (const path of ['drizzle/0009_unreviewed.sql', 'drizzle-isolated/0009_unreviewed.sql']) { try { writeFileSync(join(fixture, path), 'SELECT 1;'); denied(); } finally { rmSync(join(fixture, path)); } }
});
test('fresh inspections reject mutation immediately after success and recover only on exact restoration', () => {
  assert.ok(inspect().every(result => result.errors.length === 0));
  mutate('src/modules/content/domain/demo-authoring.ts');
  assert.deepEqual(inspectRecipeRegistration(fixture).errors, []);
  const entities = join(fixture, 'kernel/entities.json'), original = readFileSync(entities, 'utf8');
  try {
    writeFileSync(entities, original + '\n');
    const recipe = inspectRecipeRegistration(fixture);
    assert.ok(recipe.errors.length > 0); assert.deepEqual(recipe.predecessorFiles, {});
  } finally { writeFileSync(entities, original); }
  assert.deepEqual(inspectRecipeRegistration(fixture).errors, []);
  assert.deepEqual(inspectDemoRecipePhysicalSuccessor(fixture).errors, []);
  assert.deepEqual(inspectSchemaIsolationEngineering(fixture).errors, []);
  const auditPath=join(fixture,'scripts/verification/development-self-audit.mjs'),auditBytes=readFileSync(auditPath,'utf8');
  try {
    writeFileSync(auditPath,auditBytes+'\n');
    const schema=inspectSchemaIsolationEngineering(fixture);
    assert.ok(schema.errors.some(error=>error.includes('scripts/verification/development-self-audit.mjs')));
    assert.deepEqual(schema.predecessorFiles,{});assert.deepEqual(schema.revisedPaths,[]);assert.deepEqual(schema.addedPaths,[]);
  } finally { writeFileSync(auditPath,auditBytes); }
  assert.deepEqual(inspectSchemaIsolationEngineering(fixture).errors, []);

  const runner = join(fixture, 'scripts/db/run-demo-integration.ts'), runnerBytes = readFileSync(runner, 'utf8');
  try {
    writeFileSync(runner, runnerBytes + '\n');
    const recipe = inspectDemoRecipePhysicalSuccessor(fixture);
    assert.ok(recipe.errors.some(error => error.includes('scripts/db/run-demo-integration.ts')));
    assert.deepEqual(recipe.addedPaths, []); assert.deepEqual(recipe.revisedPaths, []); assert.equal(recipe.admitted, false);
  } finally { writeFileSync(runner, runnerBytes); }
  assert.deepEqual(inspectDemoRecipePhysicalSuccessor(fixture).errors, []);
  assert.ok(inspect().every(result => result.errors.length === 0));
});
test('current route authority is the exact old fifteen plus five manager-only authoring operations', () => {
  assert.deepEqual(inspectDemoRouteSource(root), []);
  const current = buildDemoRouteInventory(root), old = JSON.parse(readFileSync(join(root, 'domains/demo-runtime/proposal-0.1.0/transport-and-queries.json'), 'utf8')).routes.map(({ method, path, operation, success_status }) => ({ method, path, operation, success_status }));
  assert.deepEqual(current.routes.slice(0, 15), old); assert.equal(current.routes.length, 20);
  assert.deepEqual(current.routes.slice(15).map(row => row.operation), [...AUTHORING_OPERATIONS]);
  assert.equal(current.shared_or_production_authorized, false); assert.equal(current.deployment_inspected, false);
});
test('test-only predecessor reconstruction authenticates current bytes and restores exactly', () => {
  const before = readFileSync(join(fixture, 'drizzle/meta/_journal.json'), 'utf8');
  const restore = installAuthoringPredecessor(fixture);
  try { assert.equal(JSON.parse(readFileSync(join(fixture, 'drizzle/meta/_journal.json'), 'utf8')).entries.length, 8); assert.equal(inspectAuthoringRegistration(fixture).present, false); assert.deepEqual(inspectKitchenPhysicalSuccessor(fixture).errors, []); }
  finally { restore(); }
  assert.equal(readFileSync(join(fixture, 'drizzle/meta/_journal.json'), 'utf8'), before);
  assert.ok(inspect().every(result => result.errors.length === 0));
  mutate('drizzle/0007_demo_kitchen_content_guard.sql');
  const dependencies = realpathSync(join(root, 'node_modules'));
  const original = readFileSync(join(dependencies, 'drizzle-kit/package.json'), 'utf8');
  const copy = createAuthoringPredecessorCopy(root);
  try {
    const owned = join(copy.root, 'node_modules');
    assert.equal(lstatSync(owned).isSymbolicLink(), false); assert.equal(lstatSync(owned).isDirectory(), true);
    assert.ok(realpathSync(join(owned, 'drizzle-kit')).startsWith(owned + '/'));
    const copied = join(owned, 'drizzle-kit/package.json');
    assert.equal(readFileSync(copied, 'utf8'), original); writeFileSync(copied, original + '\n');
    assert.equal(readFileSync(join(dependencies, 'drizzle-kit/package.json'), 'utf8'), original);
  } finally { copy.remove(); }
  assert.equal(existsSync(copy.root), false);
  assert.equal(readFileSync(join(dependencies, 'drizzle-kit/package.json'), 'utf8'), original);
  const invalidDependencies = join(fixture, 'node_modules'); mkdirSync(invalidDependencies);
  try {
    symlinkSync(dependencies, join(invalidDependencies, 'external'), 'dir');
    assert.throws(() => createAuthoringPredecessorCopy(fixture), /dependency symlink must stay inside copied installation/);
    rmSync(join(invalidDependencies, 'external'));
    mkdirSync(join(invalidDependencies, 'target'));
    symlinkSync('../../' + basename(fixture) + '/node_modules/target', join(invalidDependencies, 'reentry'), 'dir');
    assert.equal(realpathSync(join(invalidDependencies, 'reentry')), join(invalidDependencies, 'target'));
    assert.throws(() => createAuthoringPredecessorCopy(fixture), /dependency symlink must stay inside copied installation/);

  } finally { rmSync(invalidDependencies, { recursive: true, force: true }); }

});

test('finite invocation scope rejects caller injection and clears results after returns and exceptions', () => {
  let coerced = false;
  const hostile = { toString() { coerced = true; throw Error('coercion forbidden'); } };
  for (const [kind, target] of [['unknown', root], [() => {}, root], ['authoringRegistration', hostile], ['authoringRegistration', () => {}]]) assert.throws(() => inspectSourceInScope(kind, target), TypeError);
  assert.equal(coerced, false);
  const pair = () => inspectSourceInScope('authoringAdmissionPair', fixture);
  const success = pair();
  assert.equal(success.length, 2); assert.ok(success.every(result => result.errors.length === 0));
  assert.equal(success[1].admitted, true);
  success[0].errors.push('caller mutation'); success[1].predecessorFiles.injected = 'untrusted';
  assert.ok(pair().every(result => result.errors.length === 0 && result.predecessorFiles.injected === undefined));
  const sealedPath = join(fixture, 'src/modules/content/domain/demo-authoring.ts'), sealedBytes = readFileSync(sealedPath, 'utf8');
  try { writeFileSync(sealedPath, sealedBytes + '\n'); denied(); }
  finally { writeFileSync(sealedPath, sealedBytes); }
  assert.ok(pair().every(result => result.errors.length === 0));
  assert.equal(pair()[1].admitted, true);

  const recovery = () => inspectDemoRecoveryRegistration(fixture);
  const recoveryResult = recovery(); assert.deepEqual(recoveryResult.errors, []);
  recoveryResult.errors.push('caller mutation'); recoveryResult.predecessorSources.injected = 'untrusted';
  assert.deepEqual(recovery().errors, []); assert.equal(recovery().predecessorSources.injected, undefined);
  for (const relative of ['scripts/kernel/demo-recovery-registration.mjs', 'src/modules/content/domain/demo-authoring.ts', 'contracts/c21-database-migration-contract.md']) {
    const path = join(fixture, relative), bytes = readFileSync(path, 'utf8');
    try {
      writeFileSync(path, bytes + '\n');
      const result = recovery(); assert.ok(result.errors.length > 0);
      assert.deepEqual(result.predecessorFiles, {}); assert.deepEqual(result.predecessorSources, {});
      assert.deepEqual(result.revisedPaths, []); assert.deepEqual(result.addedPaths, []);
      assert.deepEqual(inspectDemoRecoveryRegistration(root).errors, []);
    } finally { writeFileSync(path, bytes); }
    assert.deepEqual(recovery().errors, []);
  }
  const originalResult = inspectAuthoringRegistration(fixture);
  assert.deepEqual(originalResult.errors, []);
  originalResult.errors.push('caller mutation'); originalResult.predecessorFiles.injected = 'untrusted';
  assert.deepEqual(inspectAuthoringRegistration(fixture).errors, []);
  assert.equal(inspectAuthoringRegistration(fixture).predecessorFiles.injected, undefined);
  const clone = globalThis.structuredClone, sentinel = new Error('clone exception');
  try { globalThis.structuredClone = () => { throw sentinel; }; assert.throws(() => inspectAuthoringRegistration(fixture), error => error === sentinel); assert.throws(() => recovery(), error => error === sentinel); }
  finally { globalThis.structuredClone = clone; }
  assert.deepEqual(recovery().errors, []);
  const path = join(fixture, 'kernel/entities.json'), bytes = readFileSync(path, 'utf8');
  try {
    writeFileSync(path, bytes + '\n');
    assert.ok(inspectAuthoringRegistration(fixture).errors.length > 0);
    assert.deepEqual(inspectAuthoringRegistration(root).errors, []);
    assert.ok(inspectAuthoringRegistration(fixture).errors.length > 0);
  } finally { writeFileSync(path, bytes); }
  assert.deepEqual(inspectAuthoringRegistration(fixture).errors, []);
});
test('current packaged closure includes exact authoring assets and operations and denies altered current source', () => {
  const closure = inspectSuccessorClosure(fixture);
  assert.equal(closure.assets.length, 12); assert.equal(closure.routes.length, 20);
  assert.deepEqual(closure.routes.slice(15).map(row => row.operation), [...AUTHORING_OPERATIONS]);
  assert.ok(closure.files['domains/demo-authoring/proposal-0.1.0/authoring-operations.json']);
  const path = join(fixture, 'src/web/demo/authoring-controller.mjs'), bytes = readFileSync(path, 'utf8');
  try { writeFileSync(path, bytes + '\n'); assert.throws(() => inspectSuccessorClosure(fixture), /exact source and physical admission/); }
  finally { writeFileSync(path, bytes); }
  assert.equal(inspectSuccessorClosure(fixture).assets.length, 12);
});

test('delegated authoring database entry requires real ordered guards at both exact entrypoints', () => {
  const path = 'tests/integration/demo/authoring-runtime.test.ts';
  const source = readFileSync(join(root, path), 'utf8');
  const delegate = readFileSync(join(root, 'scripts/db/verify-isolated-schema.mjs'), 'utf8');
  const guard = 'assertIsolatedDatabaseTarget(process.env.DATABASE_URL);';
  assert.equal(hasGuardedDatabaseEntry(path, source, () => delegate), true);
  assert.equal(hasGuardedDatabaseEntry(path, source.replace(guard, ''), () => delegate), false);
  assert.equal(hasGuardedDatabaseEntry(path, source.replace(guard, '') + guard, () => delegate), false);
  assert.equal(hasGuardedDatabaseEntry(path, source.replace('scripts/db/verify-isolated-schema.mjs', 'scripts/db/foreign.mjs'), () => delegate), false);
  assert.equal(hasGuardedDatabaseEntry('tests/integration/demo/foreign.test.ts', source, () => delegate), false);
  assert.equal(hasGuardedDatabaseEntry(path, source, () => delegate.replace('assertIsolatedDatabaseTarget(process.env.DATABASE_URL)', 'process.env.DATABASE_URL')), false);
});
