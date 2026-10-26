import { inspectKitchenPhysicalSuccessor } from './demo-kitchen-physical-successor.mjs';
import { createHash } from 'node:crypto';
import { existsSync, lstatSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import { inspectSchemaIsolationEngineering } from '../verification/demo-schema-isolation-engineering.mjs';
import { inspectRecipeRegistration, RECIPE_PACKAGE_SHA256, RECIPE_REGISTRATION_SHA256 } from '../kernel/demo-recipes-registration.mjs';

export const DEMO_RECIPE_PHYSICAL_LANE = 'persistence/physical-slices/demo-recipes';
export const DEMO_RECIPE_PHYSICAL_ENVELOPE = `${DEMO_RECIPE_PHYSICAL_LANE}/physical-successor.json`;
export const DEMO_RECIPE_PHYSICAL_REVIEW = `${DEMO_RECIPE_PHYSICAL_LANE}/independent-scheduling-review.json`;
// Preserve the prior genuine review at its original path. Scheduling changes
// require a new independent review and may not rewrite that earlier verdict.
const PREDECESSOR_REVIEW = `${DEMO_RECIPE_PHYSICAL_LANE}/independent-successor-review.json`;
const PREDECESSOR_REVIEW_SHA256 = '758e0183ed2d1c8542a3f75f6a87795eb264f028900179243eadf4524ed3b0a7';
export const DEMO_RECIPE_MIGRATION = 'drizzle/0006_demo_recipe_content_guard.sql';
export const DEMO_RECIPE_SNAPSHOT = 'drizzle/meta/0006_snapshot.json';
export const DEMO_RECIPE_JOURNAL = 'drizzle/meta/_journal.json';
export const DEMO_RECIPE_PHYSICAL_EVIDENCE = Object.freeze([
  'README.md', 'immutable-baseline.json', 'prior-journal.json', 'verification-plan.json',
].map(name => `${DEMO_RECIPE_PHYSICAL_LANE}/${name}`));
// Filled only from a genuine independent review. The envelope cannot provide
// its own trust anchor. A missing/unsealed review always denies the successor.
export const DEMO_RECIPE_PHYSICAL_REVIEW_SHA256 = 'acd0ecdba21f7fa7d348a4262b5a2c472101e7fc2f747066b0690b33139aab6f';
export const DEMO_RECIPE_REVIEWED_SOURCE_PATHS = Object.freeze([
  'scripts/persistence/demo-recipes-physical-successor.mjs',
  'scripts/persistence/demo-recipes-physical-successor.d.mts',
  'scripts/persistence/validate-demo-recipes-physical-admission.mjs',
  'scripts/tests/validate-demo-recipes-physical-successor.mjs',
  'scripts/persistence/demo-storage-evidence.mjs',
  'scripts/packaging/migration-history-guards.mjs',
  'scripts/architecture/repository-integration-evidence.mjs',
  'scripts/db/verify-demo-generation.mjs',
  'scripts/kernel/demo-recipes-registration.mjs',
  'scripts/kernel/demo-runtime-registration.mjs',
  'src/bootstrap/demo/local-activation.ts',
  'drizzle/0006_demo_recipe_content_guard.sql',
  'drizzle/meta/0006_snapshot.json',
  'drizzle/meta/_journal.json',
  'tests/integration/demo/recipe-content-guard.test.ts',
  'scripts/db/run-demo-integration.ts',
  'scripts/db/run-demo-recipe-integration.ts',
]);
const BASELINE_SHA256 = '47f6d13618713d72de0a321d5edb1e0ad1a1551236f76d176073f5d023ed49d9';
const PRIOR_JOURNAL_SHA256 = '412b21579a8deb58d06aaa6890e8bd34ce398ad9801b70d2196ea8332af83ddf';
const hash = value => createHash('sha256').update(value).digest('hex');
const binding = Object.freeze({
  package: 'TEACH-DEMO-RECIPES-2026-10-18@0.1.1',
  package_sha256sums_digest: RECIPE_PACKAGE_SHA256,
  recipe_registration_sha256: RECIPE_REGISTRATION_SHA256,
});
const limits = Object.freeze({
  new_migrations: 1, new_tables: 0, new_databases: 0,
  replaced_function: 'content_guard_demo_version',
  accepted_content_schema_versions: ['1.0.0', '1.1.0'],
  phase: 'AUTHORING_UNDER_TEST', runtime_proof: 'NOT_RUN',
  runtime_activation: 'BLOCKED',
  local_disposable_database_testing_authorized: true,
  shared_or_production_migration_execution_authorized: false,
  live_database_changes_authorized: false,
});
const regularRead = (root, path) => {
  const parts = path.split('/');
  for (let index = 1; index <= parts.length; index++) {
    const stat = lstatSync(join(root, ...parts.slice(0, index)));
    if (stat.isSymbolicLink() || (index === parts.length ? !stat.isFile() : !stat.isDirectory())) throw Error(`regular file/ancestor required: ${path}`);
  }
  return readFileSync(join(root, path), 'utf8');
};

/** Exact finite source binding. Only the review anchor literal is normalized;
 * no other source bytes may change after independent review. */
export function demoRecipeReviewedSourceHashes(root) {
  const engineering = inspectSchemaIsolationEngineering(root);
  if (engineering.errors.length) throw Error('exact independently reviewed gate, activation and test source hashes differ: ' + engineering.errors.join('; '));
  return Object.fromEntries(DEMO_RECIPE_REVIEWED_SOURCE_PATHS.map(path => {
    let source = Object.hasOwn(engineering.predecessorFiles, path) ? engineering.predecessorFiles[path] : regularRead(root, path);
    if (path === 'scripts/persistence/demo-recipes-physical-successor.mjs') {
      const anchor = /^export const DEMO_RECIPE_PHYSICAL_REVIEW_SHA256 = (?:null|'[a-f0-9]{64}');$/m;
      if (!anchor.test(source)) throw Error('exact review-anchor declaration required');
      source = source.replace(anchor, 'export const DEMO_RECIPE_PHYSICAL_REVIEW_SHA256 = null;');
    }
    return [path, hash(source)];
  }));
}

// Mechanical candidate builder only. This cannot issue review PASS, physical
// admission, PostgreSQL proof or runtime permission; review seals its output.
export function buildDemoRecipePhysicalSuccessor(root) {
  const kitchen = inspectKitchenPhysicalSuccessor(root);
  if (kitchen.errors.length) throw Error(kitchen.errors.join('; '));
  const raw = path => Object.hasOwn(kitchen.predecessorFiles, path) ? kitchen.predecessorFiles[path] : regularRead(root, path);
  const baseline = JSON.parse(raw(`${DEMO_RECIPE_PHYSICAL_LANE}/immutable-baseline.json`));
  const prior = JSON.parse(raw(`${DEMO_RECIPE_PHYSICAL_LANE}/prior-journal.json`));
  const journal = JSON.parse(raw(DEMO_RECIPE_JOURNAL));
  return {
    successor_id: 'TEACH-DEMO-RECIPE-PHYSICAL-SUCCESSOR-2026-10-18',
    version: '1.0.0', ...binding, ...structuredClone(limits),
    original_physical_successor_unchanged: true,
    prior_migration_count: 6, current_migration_count: 7, current_table_count: 22,
    immutable_baseline_sha256: BASELINE_SHA256,
    immutable_file_hashes: baseline.files,
    evidence_hashes: Object.fromEntries(DEMO_RECIPE_PHYSICAL_EVIDENCE.map(path => [path, hash(raw(path))])),
    revised_files: [{ path: DEMO_RECIPE_JOURNAL, before_sha256: hash(raw(`${DEMO_RECIPE_PHYSICAL_LANE}/prior-journal.json`)), after_sha256: hash(raw(DEMO_RECIPE_JOURNAL)) }],
    added_files: [DEMO_RECIPE_MIGRATION, DEMO_RECIPE_SNAPSHOT].map(path => ({ path, sha256: hash(raw(path)) })),
    prior_journal_entries: prior.entries,
    appended_journal_entry: journal.entries?.[6] ?? null,
  };
}

/** Pure synchronous leaf: calls only the independent source-registration leaf,
 * never original runtime, storage or migration-history orchestrators. It grants
 * structural authoring compatibility, never executed migration/runtime proof.
 * Every authority output is empty on any error; caller-supplied booleans are not
 * accepted as registration or review evidence. */
export function inspectDemoRecipePhysicalSuccessor(root) {
  const denied = { admitted: false, migrationCount: null, addedPaths: [], revisedPaths: [] };
  const envelopeExists = existsSync(join(root, DEMO_RECIPE_PHYSICAL_ENVELOPE));
  const laneExists = existsSync(join(root, DEMO_RECIPE_PHYSICAL_LANE));
  const migrationExists = existsSync(join(root, DEMO_RECIPE_MIGRATION));
  const snapshotExists = existsSync(join(root, DEMO_RECIPE_SNAPSHOT));
  const source = inspectRecipeRegistration(root);
  if (!envelopeExists && !laneExists && !migrationExists && !snapshotExists && source.registration?.package_version !== '0.1.1') {
    return { ...denied, errors: [], present: false };
  }
  const errors = [], fail = message => errors.push(`demo recipe physical successor: ${message}`);
  const equal = (actual, expected, message) => { if (!isDeepStrictEqual(actual, expected)) fail(message); };
  const kitchen = inspectKitchenPhysicalSuccessor(root);
  errors.push(...kitchen.errors);
  const raw = path => Object.hasOwn(kitchen.predecessorFiles, path) ? kitchen.predecessorFiles[path] : regularRead(root, path);
  const json = path => JSON.parse(raw(path));
  if (!envelopeExists) {
    fail('exact hash-bound physical envelope required; orphan recipe migration or evidence is not admission');
    return { ...denied, errors, present: true };
  }
  try {
    if (source.errors.length || source.present !== true || source.registration?.package_version !== '0.1.1' || source.registration?.new_migrations !== 1) {
      fail('fresh exact approved recipe 0.1.1 registration with one bounded migration required');
      errors.push(...source.errors);
    }
    equal(hash(raw('domains/demo-recipes/registration.json')), RECIPE_REGISTRATION_SHA256, 'recipe registration bytes differ');
    const envelope = json(DEMO_RECIPE_PHYSICAL_ENVELOPE);
    equal(hash(raw(PREDECESSOR_REVIEW)), PREDECESSOR_REVIEW_SHA256, 'preserved predecessor independent review bytes differ');
    const review = existsSync(join(root, DEMO_RECIPE_PHYSICAL_REVIEW)) ? json(DEMO_RECIPE_PHYSICAL_REVIEW) : null;
    if (!review) fail('independent successor review missing');
    else {
      if (!DEMO_RECIPE_PHYSICAL_REVIEW_SHA256 || hash(raw(DEMO_RECIPE_PHYSICAL_REVIEW)) !== DEMO_RECIPE_PHYSICAL_REVIEW_SHA256) fail('independent successor review is unsealed or bytes changed');
      // A failed current-source seal must not suppress the original independent
      // baseline diagnostics below. It still leaves final admission denied.
      try { equal(review.reviewed_source_hashes, demoRecipeReviewedSourceHashes(root), 'exact independently reviewed gate, activation and test source hashes differ'); }
      catch (error) { fail(error.message); }
      equal(review.predecessor_review, { path: PREDECESSOR_REVIEW, sha256: PREDECESSOR_REVIEW_SHA256 }, 'scheduling review must bind preserved predecessor review');
      equal(review.outcome, 'PASS', 'independent structural review must PASS');
      equal(review.source_edits_by_reviewer, false, 'reviewer cannot author candidate sources');
      if (typeof review.reviewer !== 'string' || !review.reviewer.trim()) fail('independent reviewer identity required');
      if (typeof review.reviewed_at_utc !== 'string' || !Number.isFinite(Date.parse(review.reviewed_at_utc))) fail('review date required');
      equal(review.physical_successor_sha256, hash(raw(DEMO_RECIPE_PHYSICAL_ENVELOPE)), 'review must bind exact physical envelope');
      equal(review.recipe_registration_sha256, RECIPE_REGISTRATION_SHA256, 'review must bind exact recipe registration');
      equal(review.package_sha256sums_digest, RECIPE_PACKAGE_SHA256, 'review must bind exact recipe package');
      equal(review.runtime_proof, 'NOT_RUN', 'source review cannot claim runtime proof');
      equal(review.shared_or_production_migration_execution_authorized, false, 'review cannot authorize shared or production execution');
      equal(review.unresolved_scope_blockers, [], 'independent review must resolve scope blockers');
    }
    const baseline = json(`${DEMO_RECIPE_PHYSICAL_LANE}/immutable-baseline.json`);
    equal(hash(raw(`${DEMO_RECIPE_PHYSICAL_LANE}/immutable-baseline.json`)), BASELINE_SHA256, 'immutable six-migration baseline seal differs');
    equal(hash(raw(`${DEMO_RECIPE_PHYSICAL_LANE}/prior-journal.json`)), PRIOR_JOURNAL_SHA256, 'immutable prior six-migration journal differs');
    equal(baseline.baseline_commit, '2ad83bfce7d5c460f9f5f383a36491d9188de916', 'exact approved baseline commit required');
    // Do not use untrusted path lists after baseline seal failure.
    if (hash(raw(`${DEMO_RECIPE_PHYSICAL_LANE}/immutable-baseline.json`)) === BASELINE_SHA256) {
      for (const [path, digest] of Object.entries(baseline.files)) equal(hash(raw(path)), digest, `original migration, metadata or physical authority changed: ${path}`);
    }
    // The original core also verifies these bytes. Repeat its finite package
    // integrity check here so this standalone leaf never relies on a caller
    // having invoked that orchestrator first (which would introduce recursion).
    const originalPackage = 'domains/demo-runtime/proposal-0.1.0';
    const originalSums = raw(`${originalPackage}/SHA256SUMS`);
    if (hash(originalSums) !== 'a1df23b03a0f0660a072cff00eb40d3d2fb60bc8c521f12b56977f559601196a') fail('original immutable package checksum seal differs');
    else {
      const originalNames = new Set();
      for (const line of originalSums.trimEnd().split('\n')) {
        const match = /^([a-f0-9]{64})  ([A-Za-z0-9][A-Za-z0-9_.-]*)$/.exec(line);
        if (!match || originalNames.has(match[2]) || match[2] === 'SHA256SUMS') { fail('original immutable package checksum inventory differs'); continue; }
        originalNames.add(match[2]);
        equal(hash(raw(`${originalPackage}/${match[2]}`)), match[1], `original immutable package file changed: ${match[2]}`);
      }
      equal(originalNames.size, 16, 'original immutable package requires exact sixteen sources');
      const originalInventory = readdirSync(join(root, originalPackage), { withFileTypes: true });
      equal(originalInventory.map(item => item.name).sort(), [...originalNames, 'SHA256SUMS'].sort(), 'original immutable package directory inventory differs');
      if (originalInventory.some(item => !item.isFile())) fail('original immutable package permits only regular files');
    }
    equal(envelope, buildDemoRecipePhysicalSuccessor(root), 'exact bounded successor envelope or live hashes differ');
    const expectedNames = [...DEMO_RECIPE_PHYSICAL_EVIDENCE, DEMO_RECIPE_PHYSICAL_ENVELOPE, PREDECESSOR_REVIEW, DEMO_RECIPE_PHYSICAL_REVIEW].map(path => path.slice(DEMO_RECIPE_PHYSICAL_LANE.length + 1)).sort();
    const inventory = readdirSync(join(root, DEMO_RECIPE_PHYSICAL_LANE), { withFileTypes: true });
    equal(inventory.map(item => item.name).sort(), expectedNames, 'exact recipe physical evidence directory inventory required');
    if (inventory.some(item => !item.isFile())) fail('recipe physical evidence permits only regular files');
    const prior = json(`${DEMO_RECIPE_PHYSICAL_LANE}/prior-journal.json`), journal = json(DEMO_RECIPE_JOURNAL);
    equal({ ...journal, entries: journal.entries?.slice(0, 6) }, prior, 'original six-entry journal prefix must remain immutable');
    equal(journal.entries?.length, 7, 'exact seven-migration current history required');
    const entry = journal.entries?.[6];
    equal(entry, { idx: 6, version: '7', when: entry?.when, tag: '0006_demo_recipe_content_guard', breakpoints: true }, 'exact function-only migration journal suffix required');
    if (!Number.isSafeInteger(entry?.when) || entry.when <= prior.entries[5].when) fail('strictly increasing migration timestamp required');
    equal(readdirSync(join(root, 'drizzle')).filter(name => name.endsWith('.sql') && !(kitchen.admitted && name === '0007_demo_kitchen_content_guard.sql')).sort(), [...prior.entries.map(row => `${row.tag}.sql`), '0006_demo_recipe_content_guard.sql'].sort(), 'only six original migrations and exact recipe guard migration admitted');
    equal(readdirSync(join(root, 'drizzle/meta')).filter(name => name.endsWith('_snapshot.json') && !(kitchen.admitted && name === '0007_snapshot.json')).sort(), Array.from({ length: 7 }, (_, index) => `${String(index).padStart(4, '0')}_snapshot.json`), 'exact seven-snapshot inventory required');
    const oldSnapshot = json('drizzle/meta/0005_snapshot.json'), snapshot = json(DEMO_RECIPE_SNAPSHOT);
    equal(snapshot, { ...oldSnapshot, id: snapshot.id, prevId: oldSnapshot.id }, 'function-only migration snapshot may change only id and prevId');
    if (typeof snapshot.id !== 'string' || !/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i.test(snapshot.id) || snapshot.id === '00000000-0000-0000-0000-000000000000' || Object.keys(baseline.files).filter(path => /^drizzle\/meta\/\d+_snapshot\.json$/.test(path)).some(path => json(path).id === snapshot.id)) fail('unique nonzero successor snapshot identity required');
    equal(Object.keys(snapshot.tables ?? {}).length, 22, 'existing exact 22 tables required');
    // Hash-bound independent review establishes body semantics. This additional
    // fail-closed structural guard prevents appending another top-level action.
    const sql = raw(DEMO_RECIPE_MIGRATION).replace(/\/\*[\s\S]*?\*\//g, '').replace(/--[^\n]*/g, '').trim();
    const match = /^CREATE OR REPLACE FUNCTION content_guard_demo_version\(\) RETURNS trigger LANGUAGE plpgsql AS \$\$([\s\S]*)\$\$;$/.exec(sql);
    if (!match || /\$\$/.test(match[1]) || /\b(?:CREATE|ALTER|DROP|TRUNCATE|GRANT|REVOKE|COPY|EXECUTE|INSERT|UPDATE|DELETE)\b/i.test(match[1].replace(/'(?:[^']|'')*'/g, ''))) fail('only reviewed content_guard_demo_version replacement is admitted');
    const admitted = errors.length === 0;
    return { errors, present: true, admitted, migrationCount: admitted ? 7 : null,
      addedPaths: admitted ? [DEMO_RECIPE_MIGRATION, DEMO_RECIPE_SNAPSHOT, ...DEMO_RECIPE_PHYSICAL_EVIDENCE, DEMO_RECIPE_PHYSICAL_ENVELOPE, PREDECESSOR_REVIEW, DEMO_RECIPE_PHYSICAL_REVIEW] : [],
      revisedPaths: admitted ? [DEMO_RECIPE_JOURNAL] : [], envelope };
  } catch (error) {
    fail(`missing or malformed successor evidence: ${error.message}`);
    return { ...denied, errors, present: true };
  }
}
