import { createHash } from 'node:crypto';
import { existsSync, lstatSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import { inspectKitchenRegistration } from '../kernel/demo-kitchen-registration.mjs';

export const KITCHEN_ENGINEERING_BASE = 'verification/demo-kitchen';
export const KITCHEN_ENGINEERING_MANIFEST = `${KITCHEN_ENGINEERING_BASE}/engineering-manifest.json`;
export const KITCHEN_ENGINEERING_REVIEW = `${KITCHEN_ENGINEERING_BASE}/engineering-independent-review.json`;
// Only the genuine independent reviewer supplies this seal. This one literal
// alone is normalized to break the review/self-hash cycle; old seals never move.
export const KITCHEN_ENGINEERING_REVIEW_SHA256 = 'a61d7e896c88a3333d91cb27cd2beca29a422cd8da74fe162fc511bf786168cf';
export const KITCHEN_SOURCE_REVISIONS = Object.freeze([
  '.github/workflows/development-self-audit.yml',
  'scripts/verification/self-audit-workflow.mjs',
  'scripts/tests/hosted-loopback-postgres.test.mjs',
  'scripts/tests/validate-hosted-ci.mjs',
  'verification/workflow-lifecycle/inventory.json',
  'scripts/kernel/demo-runtime-registration.mjs',
  'scripts/kernel/demo-recipes-registration.mjs',
  'scripts/kernel/demo-recovery-registration.mjs',
  'scripts/verification/demo-schema-isolation-engineering.mjs',
  'scripts/persistence/demo-recipes-physical-successor.mjs',
  'scripts/db/compile-isolated-schema.mjs',
  'scripts/db/verify-isolated-schema.mjs',
  'scripts/packaging/build-demo-hosted.mjs',
  'scripts/packaging/migration-history-guards.mjs',
  'scripts/architecture/repository-integration-evidence.mjs',
  'scripts/architecture/validate-whole-repository.mjs',
  'scripts/verification/consolidated-ci-evidence.mjs',
  'verification/demo-runtime/route-source-inventory.json',
  'scripts/tests/demo-storage-evidence.mjs',
  'scripts/tests/validate-ci-consolidation.test.mjs',
  'scripts/tests/validate-migration-history-guards.mjs',
  'scripts/tests/validate-apply-guard-regressions.mjs',
  'scripts/tests/validate-validators.mjs',
  'scripts/tests/demo-validator-predecessor.mjs',
  'scripts/tests/validate-demo-physical-successor.mjs',
  'scripts/tests/validate-demo-recipes-physical-successor.mjs',
  'scripts/tests/validate-demo-schema-isolation-engineering.mjs',
  'scripts/persistence/demo-storage-evidence.mjs',
  'scripts/db/verify-demo-generation.mjs',
  'scripts/verification/self-audit-catalog.mjs',
  'verification/whole-repository/self-audit-plan.json',
  'tests/demo/schema-assertion.ts',
  'scripts/tests/validate-isolated-schema-lineage.test.mjs',
  'scripts/tests/validate-demo-runtime-registration.mjs',
  'scripts/tests/validate-demo-recipes-registration.mjs',
  'scripts/tests/validate-demo-schema-isolation-registration.mjs',
  'scripts/tests/validate-demo-recovery-registration.mjs',
  'tests/integration/demo/application-runtime.test.ts',
  'tests/integration/demo/recipe-content-guard.test.ts',
  'drizzle/meta/_journal.json',
  'drizzle-isolated/meta/_journal.json',
  'drizzle-isolated/manifest.json',
]);
export const KITCHEN_REVIEWED_ADDITIONS = Object.freeze([
  'scripts/verification/demo-kitchen-engineering.mjs',
  'scripts/kernel/demo-kitchen-registration.mjs',
  'scripts/kernel/demo-kitchen-registration.d.mts',
  'scripts/persistence/demo-kitchen-physical-successor.mjs',
  'persistence/physical-slices/demo-kitchen/physical-successor.json',
  'persistence/physical-slices/demo-kitchen/prior-journal.json',
  'persistence/physical-slices/demo-kitchen/immutable-baseline.json',
  'drizzle/0007_demo_kitchen_content_guard.sql',
  'drizzle/meta/0007_snapshot.json',
  'drizzle-isolated/0007_demo_kitchen_content_guard.sql',
  'scripts/db/run-demo-kitchen-integration.ts',
  'scripts/db/compile-isolated-schema.d.mts',
  'scripts/tests/validate-demo-kitchen-registration.mjs',
  'scripts/kernel/validate-demo-kitchen-registration.mjs',
  'scripts/tests/validate-demo-kitchen-engineering.mjs',
  'scripts/tests/validate-whole-audit-runner.test.mjs',
  'scripts/verification/demo-storage-partitions.mjs',
  'scripts/verification/kitchen-loopback-postgres.mjs',
  'scripts/tests/kitchen-predecessor-fixture.mjs',
  'tests/integration/demo/kitchen-content-guard.test.ts',
  'tests/demo/kitchen-content.test.ts',
  'tests/demo-web/stations.test.mjs',
  'tests/demo-web/station-api.test.mjs',
  'tests/demo-web/station-fixtures.mjs',
  'src/modules/content/application/demo-kitchen-template.ts',
]);
export const KITCHEN_IMPLEMENTATION_PATHS = Object.freeze([
  'src/modules/content/domain/demo-content.ts',
  'src/modules/organization/application/demo-run-service.ts',
  'src/web/demo/api.mjs', 'src/web/demo/app.mjs', 'src/web/demo/controller.mjs',
  'src/web/demo/styles.css', 'src/web/demo/views.mjs', 'src/web/demo/wire-contract.mjs',
]);
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
function inspectionReader(root) {
  // A snapshot cache exists only for this synchronous inspector invocation.
  // Never reuse bytes or stat decisions between inspections/tamper probes.
  const bytes = new Map(), directories = new Set();
  return path => {
    if (bytes.has(path)) return bytes.get(path);
    const parts = path.split('/');
    for (let i = 1; i <= parts.length; i++) {
      const ancestor = parts.slice(0, i).join('/');
      if (i < parts.length && directories.has(ancestor)) continue;
      const stat = lstatSync(join(root, ancestor));
      if (stat.isSymbolicLink() || (i === parts.length ? !stat.isFile() : !stat.isDirectory())) throw Error(`regular file/ancestor required: ${path}`);
      if (i < parts.length) directories.add(ancestor);
    }
    const value = readFileSync(join(root, path), 'utf8'); bytes.set(path, value); return value;
  };
}
export function normalizedKitchenEngineeringSource(path, bytes) {
  if (path !== 'scripts/verification/demo-kitchen-engineering.mjs') return bytes;
  const anchor = /^export const KITCHEN_ENGINEERING_REVIEW_SHA256 = (?:null|'[a-f0-9]{64}');$/m;
  if (!anchor.test(bytes)) throw Error('exact kitchen engineering review anchor required');
  return bytes.replace(anchor, 'export const KITCHEN_ENGINEERING_REVIEW_SHA256 = null;');
}
/** Nonrecursive finite source proof. No historical bytes are exposed until the
 * complete current source, preserved baseline, decision and independent review
 * pass. This establishes no live execution or data-modification authority. */
export function inspectKitchenEngineering(root) {
  const read = inspectionReader(root);
  const empty = { present: false, revisedPaths: [], addedPaths: [], predecessorFiles: {} };
  const errors = [], fail = message => errors.push(`demo kitchen engineering: ${message}`);
  const equal = (a, b, message) => { if (!isDeepStrictEqual(a, b)) fail(message); };
  try {
    if (!existsSync(join(root, KITCHEN_ENGINEERING_MANIFEST))) {
      if ([KITCHEN_ENGINEERING_REVIEW, 'domains/demo-kitchen/registration.json', 'persistence/physical-slices/demo-kitchen', 'drizzle/0007_demo_kitchen_content_guard.sql'].some(path => existsSync(join(root, path)))) fail('orphan kitchen source, migration or independent review without engineering manifest');
      return { ...empty, errors };
    }
    const evidence = readdirSync(join(root, KITCHEN_ENGINEERING_BASE), { withFileTypes: true });
    equal(evidence.map(item => item.name).sort(), ['engineering-independent-review.json', 'engineering-manifest.json'], 'exact two-file engineering evidence inventory required');
    if (evidence.some(item => !item.isFile())) fail('engineering evidence permits only regular files');
    const decision = inspectKitchenRegistration(root); errors.push(...decision.errors);
    if (!decision.present) fail('exact kitchen source registration required');
    const manifest = JSON.parse(read(KITCHEN_ENGINEERING_MANIFEST));
    const review = JSON.parse(read(KITCHEN_ENGINEERING_REVIEW));
    equal(hash(read(KITCHEN_ENGINEERING_REVIEW)), KITCHEN_ENGINEERING_REVIEW_SHA256, 'independent review missing seal or changed bytes');
    equal(review.manifest_sha256, hash(read(KITCHEN_ENGINEERING_MANIFEST)), 'review must bind exact manifest');
    equal(review.outcome, 'PASS', 'independent review must pass');
    equal(review.source_edits_by_reviewer, false, 'reviewer must not author sources');
    equal(review.unresolved_scope_blockers, [], 'review scope blockers remain');
    if (typeof review.reviewer !== 'string' || !review.reviewer.trim() || !Number.isFinite(Date.parse(review.reviewed_at_utc))) fail('reviewer identity and timestamp required');
    equal(manifest.successor_id, 'TEACH-DEMO-KITCHEN-ENGINEERING-2026-10-26', 'exact successor required');
    equal(manifest.baseline_commit, '884d829e5b53dcf9291677f52e7f100882f528e6', 'exact baseline commit required');
    equal(manifest.baseline_tree, '5b0e25d95320e712d7fb112852cfe29f085f895e', 'exact baseline tree required');
    for (const record of [manifest, review]) {
      equal(record.scope, 'BOUNDED_KITCHEN_SOURCE_AND_GUARD_SUCCESSOR', 'exact source/guard scope required');
      equal(record.runtime_proof, 'NOT_ESTABLISHED_BY_REVIEW', 'source review is not runtime proof');
      for (const flag of ['runtime_activation_authorized', 'shared_or_production_execution_authorized', 'credential_creation_authorized', 'security_grants_authorized', 'deployment_authorized']) equal(record[flag], false, `review cannot authorize ${flag}`);
    }
    const predecessorPaths = [...KITCHEN_SOURCE_REVISIONS, ...KITCHEN_IMPLEMENTATION_PATHS];
    equal(Object.keys(manifest.predecessor_files ?? {}).sort(), [...predecessorPaths].sort(), 'exact predecessor allowlist required');
    equal(Object.keys(manifest.predecessor_sha256 ?? {}).sort(), [...predecessorPaths].sort(), 'exact predecessor hash allowlist required');
    const current = [...KITCHEN_SOURCE_REVISIONS, ...KITCHEN_REVIEWED_ADDITIONS, ...KITCHEN_IMPLEMENTATION_PATHS];
    equal(Object.keys(manifest.current_sha256 ?? {}).sort(), [...current].sort(), 'exact current hash allowlist required');
    for (const path of predecessorPaths) equal(hash(manifest.predecessor_files[path] ?? ''), manifest.predecessor_sha256[path], `preserved predecessor differs: ${path}`);
    for (const path of current) equal(hash(normalizedKitchenEngineeringSource(path, read(path))), manifest.current_sha256[path], `current source differs: ${path}`);
    return { present: true, errors, revisedPaths: errors.length ? [] : [...predecessorPaths], addedPaths: errors.length ? [] : [...KITCHEN_REVIEWED_ADDITIONS], predecessorFiles: errors.length ? {} : manifest.predecessor_files };
  } catch (error) { fail(`missing or malformed evidence: ${error.message}`); return { ...empty, present: true, errors }; }
}
