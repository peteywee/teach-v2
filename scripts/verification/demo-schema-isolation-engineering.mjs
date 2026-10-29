import { inspectAuthoringEngineering } from './demo-authoring-engineering.mjs';
import { inspectKitchenEngineering } from './demo-kitchen-engineering.mjs';
import { inspectDemoRecoveryRegistration } from '../kernel/demo-recovery-registration.mjs';
import { createHash } from 'node:crypto';
import { existsSync, lstatSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import { inspectSchemaIsolationRegistration, SCHEMA_ISOLATION_REGISTRATION_SHA256 } from '../kernel/demo-schema-isolation-registration.mjs';

export const ENGINEERING_BASE = 'verification/demo-schema-isolation';
export const ENGINEERING_MANIFEST = `${ENGINEERING_BASE}/engineering-manifest.json`;
export const ENGINEERING_REVIEW = `${ENGINEERING_BASE}/engineering-independent-review.json`;
// Only the separate, genuinely independent reviewer may supply this seal.
// Normalizing this one literal breaks the review/self-hash cycle and nothing else.
export const SCHEMA_ENGINEERING_REVIEW_SHA256 = '8555a444c0c630ef6edeaec34a2ac764962edbea72064078001e4b09641092ff';
export const ENGINEERING_REVISED_PATHS = Object.freeze([
  ".github/workflows/development-self-audit.yml",
  "scripts/kernel/demo-recipes-registration.mjs",
  "scripts/kernel/demo-runtime-registration.mjs",
  "scripts/persistence/demo-recipes-physical-successor.mjs",
  "scripts/persistence/demo-storage-evidence.mjs",
  "scripts/tests/demo-storage-evidence.mjs",
  "scripts/tests/demo-validator-predecessor.mjs",
  "scripts/tests/validate-capability-admission.mjs",
  "scripts/tests/validate-ci-consolidation.test.mjs",
  "scripts/tests/validate-demo-recipes-physical-successor.mjs",
  "scripts/tests/validate-demo-recipes-registration.mjs",
  "scripts/verification/development-self-audit.mjs",
  "scripts/verification/self-audit-workflow.mjs",
  "scripts/verification/validate-legacy-foundation-recovery.mjs",
  "scripts/verification/validate-owner-policy-registration.mjs",
  "src/bootstrap/demo/README.md",
  "src/modules/audit-lifecycle/infrastructure/persistence/demo-schema.ts",
  "src/modules/audit-lifecycle/infrastructure/persistence/postgres-demo-audit.ts",
  "src/modules/content/infrastructure/persistence/demo-schema.ts",
  "src/modules/content/infrastructure/persistence/postgres-demo-content.ts",
  "src/modules/identity/infrastructure/persistence/credential-schema.ts",
  "src/modules/identity/infrastructure/persistence/demo-schema.ts",
  "src/modules/identity/infrastructure/persistence/postgres-application-session-repository.ts",
  "src/modules/identity/infrastructure/persistence/postgres-credential-repository.ts",
  "src/modules/identity/infrastructure/persistence/postgres-demo-identity.ts",
  "src/modules/identity/infrastructure/persistence/postgres-identity-repository.ts",
  "src/modules/identity/infrastructure/persistence/postgres-invitation-repository.ts",
  "src/modules/identity/infrastructure/persistence/postgres-password-reset-token-repository.ts",
  "src/modules/identity/infrastructure/persistence/postgres-setup-token-repository.ts",
  "src/modules/identity/infrastructure/persistence/schema.ts",
  "src/modules/identity/infrastructure/persistence/token-schema.ts",
  "src/modules/learning/infrastructure/persistence/demo-schema.ts",
  "src/modules/learning/infrastructure/persistence/postgres-demo-learning.ts",
  "src/modules/learning/infrastructure/persistence/schema.ts",
  "src/modules/organization/infrastructure/persistence/demo-schema.ts",
  "src/modules/organization/infrastructure/persistence/postgres-demo-organization.ts",
  "src/modules/transaction-control/infrastructure/persistence/demo-schema.ts",
  "src/modules/transaction-control/infrastructure/persistence/postgres-demo-receipts.ts",
  "src/modules/transaction-control/infrastructure/persistence/postgres-reconciliation-record-repository.ts",
  "src/modules/transaction-control/infrastructure/persistence/schema.ts",
  "verification/workflow-lifecycle/inventory.json"
]);
export const ENGINEERING_ADDED_PATHS = Object.freeze([
  "scripts/kernel/demo-schema-isolation-registration.mjs",
  "scripts/tests/validate-demo-schema-isolation-engineering.mjs",
  "scripts/tests/validate-demo-schema-isolation-registration.mjs",
  "scripts/tests/validate-hosted-ci.mjs",
  "scripts/verification/demo-schema-isolation-engineering.mjs",
  "scripts/verification/run-hosted-source-check.mjs",
  "src/platform/database-target.ts",
  "tests/demo/database-target.test.ts"
]);
const hash = value => createHash('sha256').update(value).digest('hex');
const regularRead = (root, path) => {
  const parts = path.split('/');
  for (let index = 1; index <= parts.length; index++) {
    const stat = lstatSync(join(root, ...parts.slice(0, index)));
    if (stat.isSymbolicLink() || (index === parts.length ? !stat.isFile() : !stat.isDirectory())) throw Error(`regular file/ancestor required: ${path}`);
  }
  return readFileSync(join(root, path), 'utf8');
};
export function normalizedSchemaEngineeringSource(path, bytes) {
  if (path !== 'scripts/verification/demo-schema-isolation-engineering.mjs') return bytes;
  const anchor = /^export const SCHEMA_ENGINEERING_REVIEW_SHA256 = (?:null|'[a-f0-9]{64}');$/m;
  if (!anchor.test(bytes)) throw Error('exact engineering review-anchor declaration required');
  return bytes.replace(anchor, 'export const SCHEMA_ENGINEERING_REVIEW_SHA256 = null;');
}

/** Finite source-compatibility proof only. No historical reader may use these
 * bytes until the decision, independent review, manifest, every exact current
 * source and every preserved predecessor byte pass. No arbitrary path, flag,
 * caller snapshot or unreviewed fallback can expand the projection. */
export function inspectSchemaIsolationEngineering(root) {
  const empty = { present: false, revisedPaths: [], addedPaths: [], predecessorFiles: {} };
  const errors = [], fail = message => errors.push(`demo schema isolation engineering: ${message}`);
  const equal = (actual, expected, message) => { if (!isDeepStrictEqual(actual, expected)) fail(message); };
  const raw = path => regularRead(root, path);
  const json = path => JSON.parse(raw(path));
  if (!existsSync(join(root, ENGINEERING_MANIFEST))) {
    const orphan = existsSync(join(root, ENGINEERING_REVIEW)) || (existsSync(join(root, ENGINEERING_BASE)) && readdirSync(join(root, ENGINEERING_BASE)).some(name => name.startsWith('engineering-')));
    if (orphan) fail('orphan engineering evidence without exact manifest');
    return { ...empty, errors };
  }
  try {
    const authoring = inspectAuthoringEngineering(root);
    errors.push(...authoring.errors);
    if(errors.length)return { ...empty, present: true, errors };
    const kitchen = inspectKitchenEngineering(root);
    errors.push(...kitchen.errors);
    const recovery = inspectDemoRecoveryRegistration(root);
    errors.push(...recovery.errors);
    const projected = path => Object.hasOwn(recovery.predecessorSources, path) ? recovery.predecessorSources[path] : Object.hasOwn(kitchen.predecessorFiles, path) ? kitchen.predecessorFiles[path] : Object.hasOwn(authoring.predecessorFiles,path) ? authoring.predecessorFiles[path] : raw(path);
    const decision = inspectSchemaIsolationRegistration(root);
    errors.push(...decision.errors);
    if (!decision.present) fail('exact approved bounded schema decision required');
    const manifest = json(ENGINEERING_MANIFEST);
    const review = existsSync(join(root, ENGINEERING_REVIEW)) ? json(ENGINEERING_REVIEW) : null;
    if (!review) fail('independent engineering review missing');
    else {
      equal(hash(raw(ENGINEERING_REVIEW)), SCHEMA_ENGINEERING_REVIEW_SHA256, 'independent engineering review is unsealed or bytes changed');
      equal(review.engineering_manifest_sha256, hash(raw(ENGINEERING_MANIFEST)), 'review must bind exact engineering manifest');
      equal(review.decision_registration_sha256, SCHEMA_ISOLATION_REGISTRATION_SHA256, 'review must bind exact bounded owner decision');
      equal(review.review_id, 'TEACH-DEMO-SCHEMA-ENGINEERING-REVIEW-2026-10-19', 'exact engineering review ID required');
      equal(review.scope, 'BOUNDED_SOURCE_COMPATIBILITY_ONLY', 'review cannot broaden source-compatibility scope');
      equal(review.outcome, 'PASS', 'independent source review must PASS');
      equal(review.source_edits_by_reviewer, false, 'reviewer must not author the sources');
      if (typeof review.reviewer !== 'string' || !review.reviewer.trim()) fail('independent reviewer identity required');
      if (typeof review.reviewed_at_utc !== 'string' || !Number.isFinite(Date.parse(review.reviewed_at_utc))) fail('review timestamp required');
      equal(review.runtime_proof, 'NOT_ESTABLISHED_BY_REVIEW', 'source review cannot establish runtime proof');
      for (const flag of ['runtime_activation_authorized', 'physical_admission_granted', 'shared_or_production_execution_authorized', 'live_database_changes_authorized', 'credential_creation_authorized', 'deployment_authorized', 'spending_authorized']) equal(review[flag], false, `source review cannot authorize ${flag}`);
      equal(review.unresolved_scope_blockers, [], 'source compatibility review blockers must be resolved');
    }
    equal(manifest.successor_id, 'TEACH-DEMO-SCHEMA-ENGINEERING-2026-10-19', 'exact source successor ID required');
    equal(manifest.version, '1.0.0', 'exact source successor version required');
    equal(manifest.source_baseline_commit, '87c427ebb4b7e8f5b65ae04a1c47165ccea81932', 'exact predecessor commit required');
    equal(manifest.source_baseline_tree, '2f7306d3b5c6b02b0b52f78d96b348dde0ee660b', 'exact predecessor tree required');
    equal(manifest.decision_registration_sha256, SCHEMA_ISOLATION_REGISTRATION_SHA256, 'manifest must bind exact bounded owner decision');
    equal(manifest.scope, 'BOUNDED_SOURCE_COMPATIBILITY_ONLY', 'manifest cannot grant execution authority');
    equal(Object.keys(manifest.predecessor_files).sort(), [...ENGINEERING_REVISED_PATHS], 'exact predecessor source allowlist required');
    equal(Object.keys(manifest.predecessor_sha256).sort(), [...ENGINEERING_REVISED_PATHS], 'exact predecessor digest allowlist required');
    equal(Object.keys(manifest.current_sha256).sort(), [...ENGINEERING_REVISED_PATHS, ...ENGINEERING_ADDED_PATHS].sort(), 'exact current source allowlist required');
    // Iteration is over the hard-coded set, never over manifest-controlled paths.
    for (const path of ENGINEERING_REVISED_PATHS) equal(hash(manifest.predecessor_files[path] ?? ''), manifest.predecessor_sha256[path], `preserved predecessor source bytes differ: ${path}`);
    for (const path of [...ENGINEERING_REVISED_PATHS, ...ENGINEERING_ADDED_PATHS]) equal(hash(normalizedSchemaEngineeringSource(path, projected(path))), manifest.current_sha256[path], `reviewed current source differs: ${path}`);
    const evidenceNames = readdirSync(join(root, ENGINEERING_BASE), { withFileTypes: true }).filter(entry => entry.name.startsWith('engineering-'));
    equal(evidenceNames.map(entry => entry.name).sort(), [ENGINEERING_MANIFEST, ENGINEERING_REVIEW].map(path => path.split('/').at(-1)).sort(), 'exact engineering evidence inventory required');
    if (evidenceNames.some(entry => !entry.isFile())) fail('engineering evidence permits only regular files');
    // Recipe's immutable source review additionally pins this one later-edited
    // inspector. Expose only its fully authenticated recovery predecessor;
    // existing older engineering predecessors retain precedence.
    const integrationPath = 'scripts/architecture/repository-integration-evidence.mjs';
    const recoveryIntegration = Object.hasOwn(recovery.predecessorSources, integrationPath)
      ? { [integrationPath]: recovery.predecessorSources[integrationPath] } : {};
    return { errors, present: true, revisedPaths: errors.length ? [] : [...ENGINEERING_REVISED_PATHS], addedPaths: errors.length ? [] : [...ENGINEERING_ADDED_PATHS], predecessorFiles: errors.length ? {} : { ...kitchen.predecessorFiles, ...recoveryIntegration, ...manifest.predecessor_files } };
  } catch (error) {
    fail(`missing or malformed source evidence: ${error.message}`);
    return { ...empty, errors, present: true };
  }
}
