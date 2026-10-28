import {inspectAuthoringEngineering} from '../verification/demo-authoring-engineering.mjs';
import {inspectAuthoringRecoveryRegistration} from './demo-authoring-recovery-registration.mjs';
import { createHash } from 'node:crypto';
import { existsSync, lstatSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import { inspectKitchenRegistration } from './demo-kitchen-registration.mjs';
import { inspectKitchenEngineering } from '../verification/demo-kitchen-engineering.mjs';

export const RECOVERY_BASE = 'docs/proposals/demo-recovery-exception';
export const RECOVERY_REGISTRATION = `${RECOVERY_BASE}/adoption-registration.json`;
export const RECOVERY_REVIEW = `${RECOVERY_BASE}/adoption-independent-review.json`;
// Set only by the genuinely independent reviewer. This one literal alone is normalized.
export const RECOVERY_REVIEW_SHA256 = '944d40a18e89122f3218b9034be93248b1f3bc43c1e25cfebb661182223e1412';
export const RECOVERY_AUTHORITY_PATHS = Object.freeze([
  'contracts/c21-database-migration-contract.md',
  'governance/decision-closure/07-evidence-release-operations-spec.md',
  'contracts/README.md', 'contracts/APPROVAL-RECORD.md',
]);
export const RECOVERY_ARCHIVES = Object.freeze([
  'contracts/superseded/c21-database-migration-contract-2.0.0.md',
  'governance/decision-closure/superseded/07-evidence-release-operations-spec-2.0.0.md',
]);
export const RECOVERY_SOURCE_REVISIONS = Object.freeze([
  'scripts/architecture/repository-integration-evidence.mjs',
  'scripts/verification/validate-legacy-foundation-recovery.mjs',
  'scripts/tests/validate-ci-consolidation.test.mjs',
  '.github/workflows/development-self-audit.yml',
  'scripts/verification/self-audit-workflow.mjs',
  'scripts/verification/run-hosted-source-check.mjs',
  'verification/workflow-lifecycle/inventory.json',
  'scripts/tests/validate-demo-runtime-registration.mjs',
  'scripts/tests/validate-demo-recipes-registration.mjs',
  'scripts/tests/validate-demo-physical-successor.mjs',
  'scripts/tests/validate-demo-recipes-physical-successor.mjs',
  'scripts/tests/demo-storage-evidence.mjs',

  'scripts/kernel/demo-schema-isolation-registration.mjs',
  'scripts/verification/demo-schema-isolation-engineering.mjs',
  'scripts/tests/validate-demo-schema-isolation-registration.mjs',
  'scripts/tests/validate-demo-schema-isolation-engineering.mjs',
]);
export const RECOVERY_SOURCE_ADDITIONS = Object.freeze([
  'scripts/verification/consolidated-ci-evidence.mjs',
  'scripts/db/recovery-rehearsal-target.mjs',
  'scripts/db/verify-demo-recovery-rehearsal.mjs',
  'scripts/verification/hosted-loopback-postgres.mjs',
  'scripts/tests/recovery-rehearsal-target.test.mjs',
  'scripts/kernel/demo-recovery-registration.mjs',
  'scripts/tests/validate-demo-recovery-registration.mjs',
  'docs/proposals/demo-recovery-exception/proposal.md',
  'scripts/release/validate-demo-recovery-evidence.mjs',
  'scripts/release/validate-production-migration-evidence.mjs',
  'scripts/tests/validate-demo-recovery-evidence.mjs',
  'scripts/tests/validate-production-proof.mjs',
]);
const ID = 'TEACH-DEMO-RECOVERY-EXCEPTION-2026-10-19';
const BASELINE = '86a7ba6e10cc851da25c7e5331350caf622e6d4f';
const FLAGS = ['data_export_authorized', 'credential_creation_authorized', 'security_grants_authorized', 'live_database_changes_authorized', 'deployment_authorized', 'spending_authorized', 'runtime_activation_authorized'];
const hash = value => createHash('sha256').update(value).digest('hex');
export function normalizedRecoverySource(path, text) {
  if (path !== 'scripts/kernel/demo-recovery-registration.mjs') return text;
  const anchor = /^export const RECOVERY_REVIEW_SHA256 = (?:null|'[a-f0-9]{64}');$/m;
  if (!anchor.test(text)) throw Error('exact recovery review anchor required');
  return text.replace(anchor, 'export const RECOVERY_REVIEW_SHA256 = null;');
}
/** Non-recursive finite leaf. It authenticates every current byte and the
 * independent review before exposing any historical projection. No caller
 * reader, dynamic target, fallback, or registration hash can grant authority. */
export function inspectDemoRecoveryRegistration(root) {
  const empty = { present: false, revisedPaths: [], addedPaths: [], predecessorFiles: {}, predecessorSources: {} };
  const errors = [], fail = message => errors.push(`demo schema isolation registration: recovery exception: ${message}`);
  const equal = (actual, expected, message) => { if (!isDeepStrictEqual(actual, expected)) fail(message); };
  const raw = path => {
    const parts = path.split('/');
    for (let n = 1; n <= parts.length; n++) {
      const stat = lstatSync(join(root, ...parts.slice(0, n)));
      if (stat.isSymbolicLink() || (n === parts.length ? !stat.isFile() : !stat.isDirectory())) throw Error(`regular file/ancestor required: ${path}`);
    }
    return readFileSync(join(root, path), 'utf8');
  };
  const json = path => JSON.parse(raw(path));
  try {
    if (!existsSync(join(root, RECOVERY_REGISTRATION))) {
      if ([RECOVERY_REVIEW, `${RECOVERY_BASE}/owner-adoption.json`, `${RECOVERY_BASE}/source-baseline.json`, ...RECOVERY_ARCHIVES].some(path => existsSync(join(root, path)))) fail('orphan recovery adoption without registration');
      return { ...empty, errors };
    }
    const registration = json(RECOVERY_REGISTRATION), review = json(RECOVERY_REVIEW);
    equal(hash(raw(RECOVERY_REVIEW)), RECOVERY_REVIEW_SHA256, 'independent review missing seal or changed bytes');
    equal(review.registration_sha256, hash(raw(RECOVERY_REGISTRATION)), 'independent review must bind exact registration');
    equal(review.review_id, `${ID}-REVIEW`, 'exact review identity required');
    equal(review.outcome, 'PASS', 'independent review must pass');
    equal(review.source_edits_by_reviewer, false, 'reviewer must not author implementation');
    if (typeof review.reviewer !== 'string' || !review.reviewer.trim() || !Number.isFinite(Date.parse(review.reviewed_at_utc))) fail('reviewer identity and timestamp required');
    for (const record of [registration, review]) {
      equal(record.scope, 'POLICY_AND_FINITE_SOURCE_COMPATIBILITY_ONLY', 'policy-only scope required');
      for (const flag of FLAGS) equal(record[flag], false, `cannot authorize ${flag}`);
      equal(record.actual_recovery_evidence, 'UNKNOWN', 'registration is not actual recovery proof');
    }
    equal(review.unresolved_scope_blockers, [], 'review blockers must be resolved');
    equal(registration.registration_id, ID, 'exact registration identity required');
    equal(registration.state, 'REGISTERED_POLICY_ONLY', 'only policy registration allowed');
    equal(registration.version, '1.0.0', 'exact registration version required');
    equal(registration.baseline_commit, BASELINE, 'exact baseline required');
    const source = json(`${RECOVERY_BASE}/source-baseline.json`), compatibility = json(`${RECOVERY_BASE}/source-compatibility-baseline.json`), owner = json(`${RECOVERY_BASE}/owner-adoption.json`);
    for (const [path, digest] of [[`${RECOVERY_BASE}/source-baseline.json`, registration.source_baseline_sha256], [`${RECOVERY_BASE}/source-compatibility-baseline.json`, registration.source_compatibility_baseline_sha256], [`${RECOVERY_BASE}/owner-adoption.json`, registration.owner_adoption_sha256]]) equal(hash(raw(path)), digest, `sealed evidence differs: ${path}`);
    for (const record of [registration, owner]) {
      equal(record.project_id, 'acqafjkdkdmtpnsxiesw', 'exact project required');
      equal(record.schema, 'teach_v2_demo', 'exact schema required');
      equal(record.operation, 'FIRST_ADDITIVE_SYNTHETIC_DEMO_INSTALL', 'first additive synthetic install only');
      for (const flag of FLAGS) equal(record[flag], false, `owner/adoption cannot authorize ${flag}`);
    }
    equal(owner.decision_id, ID, 'exact owner decision required');
    equal(owner.policy_adoption_authorized, true, 'owner adoption required');
    for (const record of [source, compatibility]) equal(record.baseline_commit, BASELINE, 'exact preserved baseline required');
    const keys = (record, paths, label) => equal(Object.keys(record ?? {}).sort(), [...paths].sort(), `exact ${label} allowlist required`);
    keys(source.files, RECOVERY_AUTHORITY_PATHS, 'authority predecessors');
    keys(compatibility.files, RECOVERY_SOURCE_REVISIONS, 'source predecessors');
    keys(registration.predecessor_file_hashes, RECOVERY_AUTHORITY_PATHS, 'authority predecessor seals');
    keys(registration.authority_file_hashes, [...RECOVERY_AUTHORITY_PATHS, ...RECOVERY_ARCHIVES], 'current authority seals');
    keys(registration.source_predecessor_sha256, RECOVERY_SOURCE_REVISIONS, 'source predecessor seals');
    keys(registration.source_current_sha256, [...RECOVERY_SOURCE_REVISIONS, ...RECOVERY_SOURCE_ADDITIONS], 'current source seals');
    for (const path of RECOVERY_AUTHORITY_PATHS) equal(hash(source.files[path] ?? ''), registration.predecessor_file_hashes[path], `preserved authority differs: ${path}`);
    const policy = inspectAuthoringRecoveryRegistration(root);
    errors.push(...policy.errors);
    if (errors.length) return { ...empty, present: true, errors };
    const kitchen = inspectKitchenRegistration(root);
    const kitchenEngineering = inspectKitchenEngineering(root);
    const authoringEngineering = inspectAuthoringEngineering(root);
    errors.push(...kitchen.errors, ...kitchenEngineering.errors, ...authoringEngineering.errors);
    if (errors.length) return { ...empty, present: true, errors };
    const authority = path => Object.hasOwn(kitchen.predecessorFiles, path) ? kitchen.predecessorFiles[path] : Object.hasOwn(policy.predecessorFiles,path) ? policy.predecessorFiles[path] : raw(path);
    const sourceBytes = path => Object.hasOwn(kitchenEngineering.predecessorFiles, path) ? kitchenEngineering.predecessorFiles[path] : Object.hasOwn(authoringEngineering.predecessorFiles,path) ? authoringEngineering.predecessorFiles[path] : raw(path);
    for (const path of [...RECOVERY_AUTHORITY_PATHS, ...RECOVERY_ARCHIVES]) equal(hash(authority(path)), registration.authority_file_hashes[path], `current authority differs: ${path}`);
    for (const path of RECOVERY_SOURCE_REVISIONS) equal(hash(compatibility.files[path] ?? ''), registration.source_predecessor_sha256[path], `preserved source differs: ${path}`);
    for (const path of [...RECOVERY_SOURCE_REVISIONS, ...RECOVERY_SOURCE_ADDITIONS]) equal(hash(normalizedRecoverySource(path, sourceBytes(path))), registration.source_current_sha256[path], `current source differs: ${path}`);
    return { ...empty, errors, present: true, registration, revisedPaths: errors.length ? [] : [...RECOVERY_AUTHORITY_PATHS], addedPaths: errors.length ? [] : [...RECOVERY_ARCHIVES, ...policy.addedPaths], predecessorFiles: errors.length ? {} : source.files, predecessorSources: errors.length ? {} : compatibility.files };
  } catch (error) {
    fail(`missing or malformed adoption evidence: ${error.message}`);
    return { ...empty, present: existsSync(join(root, RECOVERY_REGISTRATION)), errors };
  }
}
