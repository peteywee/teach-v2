import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { createHash } from 'node:crypto';
import { cpSync, existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { inspectMigrationHistory } from '../packaging/migration-history-guards.mjs';
import {
  buildDemoRecipePhysicalSuccessor, inspectDemoRecipePhysicalSuccessor, DEMO_RECIPE_REVIEWED_SOURCE_PATHS,
  DEMO_RECIPE_PHYSICAL_LANE, DEMO_RECIPE_PHYSICAL_ENVELOPE,
  DEMO_RECIPE_PHYSICAL_REVIEW, DEMO_RECIPE_PHYSICAL_REVIEW_SHA256,
  DEMO_RECIPE_PHYSICAL_EVIDENCE, DEMO_RECIPE_MIGRATION,
  DEMO_RECIPE_SNAPSHOT, DEMO_RECIPE_JOURNAL,
} from '../persistence/demo-recipes-physical-successor.mjs';

const root = resolve(new URL('../..', import.meta.url).pathname);
const fixture = mkdtempSync(join(tmpdir(), 'teach-recipe-physical-'));
for (const path of ['domains', 'contracts', 'kernel', 'persistence', 'drizzle']) cpSync(join(root, path), join(fixture, path), { recursive: true });
for (const path of DEMO_RECIPE_REVIEWED_SOURCE_PATHS) { mkdirSync(join(fixture, path, '..'), { recursive: true }); cpSync(join(root, path), join(fixture, path)); }
after(() => rmSync(fixture, { recursive: true, force: true }));
const raw = path => readFileSync(join(fixture, path), 'utf8');
const json = path => JSON.parse(raw(path));
const hash = value => createHash('sha256').update(value).digest('hex');
const inspect = () => inspectDemoRecipePhysicalSuccessor(fixture);
const denied = result => {
  assert.ok(result.errors.length, 'invalid candidate cannot have an empty error list');
  assert.equal(result.admitted, false);
  assert.equal(result.migrationCount, null);
  assert.deepEqual(result.addedPaths, []);
  assert.deepEqual(result.revisedPaths, []);
};
const mutate = (path, transform, pattern) => {
  const original = existsSync(join(fixture, path)) ? raw(path) : null;
  try {
    if (transform === null) rmSync(join(fixture, path));
    else { mkdirSync(join(fixture, path, '..'), { recursive: true }); writeFileSync(join(fixture, path), transform(original)); }
    const result = inspect(); denied(result); assert.match(result.errors.join('\n'), pattern);
  } finally {
    if (original === null) rmSync(join(fixture, path), { force: true });
    else writeFileSync(join(fixture, path), original);
  }
};
const mutateJson = (path, change, pattern) => mutate(path, text => {
  const value = JSON.parse(text); change(value); return JSON.stringify(value, null, 2) + '\n';
}, pattern);

test('mechanical builder binds exact approved scope and cannot issue review or runtime PASS', () => {
  const envelope = buildDemoRecipePhysicalSuccessor(fixture);
  assert.deepEqual(envelope, json(DEMO_RECIPE_PHYSICAL_ENVELOPE));
  assert.equal(envelope.package, 'TEACH-DEMO-RECIPES-2026-10-18@0.1.1');
  assert.equal(envelope.new_migrations, 1);
  assert.equal(envelope.new_tables, 0);
  assert.equal(envelope.new_databases, 0);
  assert.equal(envelope.runtime_proof, 'NOT_RUN');
  assert.equal(envelope.runtime_activation, 'BLOCKED');
  assert.equal(envelope.shared_or_production_migration_execution_authorized, false);
  assert.equal(envelope.outcome, undefined);
  assert.deepEqual(envelope.added_files.map(row => row.path), [DEMO_RECIPE_MIGRATION, DEMO_RECIPE_SNAPSHOT]);
  assert.deepEqual(envelope.revised_files.map(row => row.path), [DEMO_RECIPE_JOURNAL]);
});

test('actual candidate requires genuine sealed review before any seventh-migration admission', () => {
  const result = inspect();
  if (!DEMO_RECIPE_PHYSICAL_REVIEW_SHA256) {
    denied(result);
    assert.ok(result.errors.every(error => /independent successor review (?:missing|is unsealed)|exact recipe physical evidence directory inventory/.test(error)), result.errors.join('\n'));
  } else {
    assert.equal(hash(raw(DEMO_RECIPE_PHYSICAL_REVIEW)), DEMO_RECIPE_PHYSICAL_REVIEW_SHA256);
    assert.deepEqual(result.errors, []);
    assert.equal(result.admitted, true);
    assert.equal(result.migrationCount, 7);
    assert.deepEqual(inspectMigrationHistory(fixture), []);
  }
});

test('missing review denies even when candidate and source registration are otherwise valid', () => {
  if (existsSync(join(fixture, DEMO_RECIPE_PHYSICAL_REVIEW))) mutate(DEMO_RECIPE_PHYSICAL_REVIEW, null, /independent successor review missing/);
  else { const result = inspect(); denied(result); assert.match(result.errors.join('\n'), /independent successor review missing/); }
});

test('orphan migration and envelope removal never gain admission', () => mutate(DEMO_RECIPE_PHYSICAL_ENVELOPE, null, /exact hash-bound physical envelope required/));
test('all new physical evidence remains byte-bound', () => {
  for (const path of DEMO_RECIPE_PHYSICAL_EVIDENCE) mutate(path, text => text + '\n', /exact bounded successor envelope|immutable .* (?:seal differs|journal differs)/);
});
test('new SQL cannot change behind an unchanged reviewed envelope', () => mutate(DEMO_RECIPE_MIGRATION, text => text + '\n', /exact bounded successor envelope/));
test('new SQL cannot append table, database or privilege operations', () => {
  for (const sql of ['CREATE TABLE extra(id text);', 'CREATE DATABASE extra;', 'GRANT ALL ON content_pack_versions TO public;', 'DELETE FROM content_pack_versions;']) {
    mutate(DEMO_RECIPE_MIGRATION, text => text + sql + '\n', /only reviewed content_guard_demo_version replacement is admitted/);
  }
});
test('envelope cannot broaden scope, hide drift or claim runtime proof', () => {
  for (const [field, value] of [['new_tables', 1], ['new_databases', 1], ['new_migrations', 2], ['runtime_proof', 'PASS'], ['runtime_activation', 'ACTIVE'], ['shared_or_production_migration_execution_authorized', true]]) {
    mutateJson(DEMO_RECIPE_PHYSICAL_ENVELOPE, envelope => { envelope[field] = value; }, /exact bounded successor envelope/);
  }
  mutateJson(DEMO_RECIPE_PHYSICAL_ENVELOPE, envelope => { envelope.added_files[0].path = '../outside.sql'; }, /exact bounded successor envelope/);
});
test('original six migrations, snapshots and original physical admission remain exact', () => {
  const baseline = json(`${DEMO_RECIPE_PHYSICAL_LANE}/immutable-baseline.json`);
  for (const path of Object.keys(baseline.files)) mutate(path, text => text + '\n', /original migration, metadata or physical authority changed/);
});
test('prior six-entry journal cannot reorder, drift or lose entries', () => {
  mutateJson(DEMO_RECIPE_JOURNAL, journal => { journal.entries[0].when++; }, /original six-entry journal prefix must remain immutable/);
  mutateJson(DEMO_RECIPE_JOURNAL, journal => { [journal.entries[0], journal.entries[1]] = [journal.entries[1], journal.entries[0]]; }, /original six-entry journal prefix must remain immutable/);
  mutateJson(DEMO_RECIPE_JOURNAL, journal => { journal.entries.pop(); }, /exact seven-migration current history required/);
});
test('eighth migration and unjournaled SQL are never admitted', () => {
  mutate('drizzle/0007_extra.sql', () => 'SELECT 1;\n', /only six original migrations and exact recipe guard migration admitted/);
  mutateJson(DEMO_RECIPE_JOURNAL, journal => { journal.entries.push({ ...journal.entries[6], idx: 7, when: journal.entries[6].when + 1, tag: '0007_extra' }); }, /exact seven-migration current history required/);
});
test('seventh snapshot changes only identity and ancestry, not table fields or schema', () => {
  mutateJson(DEMO_RECIPE_SNAPSHOT, snapshot => { snapshot.tables['public.extra'] = {}; }, /function-only migration snapshot may change only id and prevId/);
  mutateJson(DEMO_RECIPE_SNAPSHOT, snapshot => { snapshot.tables['public.content_packs'].columns.id.notNull = false; }, /function-only migration snapshot may change only id and prevId/);
  mutateJson(DEMO_RECIPE_SNAPSHOT, snapshot => { snapshot.prevId = '00000000-0000-0000-0000-000000000000'; }, /function-only migration snapshot may change only id and prevId/);
  mutateJson(DEMO_RECIPE_SNAPSHOT, snapshot => { snapshot.id = json('drizzle/meta/0005_snapshot.json').id; }, /unique nonzero successor snapshot identity required/);
});
test('sealed review cannot be rebound, forged or changed', { skip: !DEMO_RECIPE_PHYSICAL_REVIEW_SHA256 ? 'Genuine independent review is pending; no synthetic PASS is manufactured.' : false }, () => {
  for (const field of ['outcome', 'reviewer', 'physical_successor_sha256', 'recipe_registration_sha256', 'package_sha256sums_digest']) mutateJson(DEMO_RECIPE_PHYSICAL_REVIEW, review => { review[field] = 'unauthorized'; }, /independent successor review is unsealed or bytes changed/);
});
test('physical evidence rejects unknown files and symbolic links', () => {
  mutate(`${DEMO_RECIPE_PHYSICAL_LANE}/unknown.json`, () => '{}', /exact recipe physical evidence directory inventory/);
  const original = raw(DEMO_RECIPE_MIGRATION);
  try {
    rmSync(join(fixture, DEMO_RECIPE_MIGRATION));
    symlinkSync('0005_demo_runtime_owner_storage.sql', join(fixture, DEMO_RECIPE_MIGRATION));
    const result = inspect(); denied(result); assert.match(result.errors.join('\n'), /regular file\/ancestor required/);
  } finally { rmSync(join(fixture, DEMO_RECIPE_MIGRATION), { force: true }); writeFileSync(join(fixture, DEMO_RECIPE_MIGRATION), original); }
});
test('source registration cannot be replaced by a caller boolean or altered evidence', () => {
  mutateJson('domains/demo-recipes/registration.json', value => { value.new_migrations = 100; }, /fresh exact approved recipe 0.1.1 registration|recipe registration bytes differ/);
});

test('every reviewed gate, activation and test source is independently byte-bound', { skip: !DEMO_RECIPE_PHYSICAL_REVIEW_SHA256 ? 'Genuine independent review is pending; no synthetic PASS is manufactured.' : false }, () => {
  for (const path of DEMO_RECIPE_REVIEWED_SOURCE_PATHS) mutate(path, text => text + '\n', /exact independently reviewed gate, activation and test source hashes differ/);
});

test('original package file contents and exact finite inventory remain immutable in standalone admission', () => {
  const base = 'domains/demo-runtime/proposal-0.1.0';
  for (const line of raw(`${base}/SHA256SUMS`).trimEnd().split('\n')) {
    const name = line.split('  ')[1];
    mutate(`${base}/${name}`, text => text + '\n', /original immutable package file changed/);
  }
  mutate(`${base}/unapproved.json`, () => '{}', /original immutable package directory inventory differs/);
});
