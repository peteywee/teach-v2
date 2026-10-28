import { inspectSourceInScope } from './source-inspection-scope.mjs';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import { authoringHash as hash, authoringPath, authoringReader, exactAuthoringDirectory } from '../kernel/authoring-source-reader.mjs';
import { inspectAuthoringRegistration, AUTHORING_BASELINE, AUTHORING_BASELINE_TREE, AUTHORING_REGISTRATION_SHA256 } from '../kernel/demo-authoring-registration.mjs';

export const AUTHORING_ENGINEERING_BASE = 'verification/demo-authoring';
export const AUTHORING_ENGINEERING_MANIFEST = `${AUTHORING_ENGINEERING_BASE}/engineering-manifest.json`;
export const AUTHORING_ENGINEERING_REVIEW = `${AUTHORING_ENGINEERING_BASE}/engineering-independent-review.json`;
// Only the separate independent reviewer may supply this seal. Normalizing this
// single literal breaks the review/self-hash cycle and changes nothing else.
export const AUTHORING_ENGINEERING_REVIEW_SHA256 = '499129418a1e2a56865a44349af2c9b93639ed9aa06402a133daf4c77b71b9cc';
const SCOPE = 'BOUNDED_MANAGER_AUTHORING_SOURCE_AND_STORAGE_SUCCESSOR';
const FLAGS = ['runtime_activation_authorized', 'shared_or_production_execution_authorized', 'credential_creation_authorized', 'security_grants_authorized', 'deployment_authorized'];
export function normalizedAuthoringEngineeringSource(path, bytes) {
  if (path !== 'scripts/verification/demo-authoring-engineering.mjs') return bytes;
  const anchor = /^export const AUTHORING_ENGINEERING_REVIEW_SHA256 = (?:null|'[a-f0-9]{64}');$/m;
  if (!anchor.test(bytes)) throw Error('exact authoring engineering review anchor required');
  return bytes.replace(anchor, 'export const AUTHORING_ENGINEERING_REVIEW_SHA256 = null;');
}
/** Source compatibility proof only. Registration is raw-only; this leaf never
 * calls older inspectors, compilation or physical admission. No projected bytes
 * are returned until the independent review and every current/prior byte pass. */
export function inspectAuthoringEngineering(root) { return inspectSourceInScope('authoringEngineering', root); }
// Internal finite dispatcher entry. Direct invocation establishes no shared scope.
export function inspectAuthoringEngineeringUncached(root) {
  const empty = { present: false, revisedPaths: [], addedPaths: [], predecessorFiles: {} };
  const errors = [], fail = message => errors.push(`demo authoring engineering: ${message}`);
  const equal = (actual, expected, message) => { if (!isDeepStrictEqual(actual, expected)) fail(message); };
  const reader = authoringReader(root), read = path => reader.read(path);
  try {
    if (!existsSync(join(root, AUTHORING_ENGINEERING_MANIFEST))) {
      if ([AUTHORING_ENGINEERING_REVIEW, 'domains/demo-authoring/registration.json', 'persistence/physical-slices/demo-authoring', 'drizzle/0008_demo_manager_authoring.sql'].some(path => existsSync(join(root, path)))) fail('orphan authoring source or physical evidence without engineering manifest');
      return { ...empty, errors };
    }
    exactAuthoringDirectory(reader, AUTHORING_ENGINEERING_BASE, ['engineering-manifest.json', 'engineering-independent-review.json']);
    const decision = inspectAuthoringRegistration(root); errors.push(...decision.errors);
    if (!decision.present) fail('exact authoring source registration required');
    if (errors.length) return { ...empty, present: true, errors };
    const manifest = JSON.parse(read(AUTHORING_ENGINEERING_MANIFEST)), review = JSON.parse(read(AUTHORING_ENGINEERING_REVIEW));
    equal(hash(read(AUTHORING_ENGINEERING_REVIEW)), AUTHORING_ENGINEERING_REVIEW_SHA256, 'independent review missing seal or changed bytes');
    equal(review.manifest_sha256, hash(read(AUTHORING_ENGINEERING_MANIFEST)), 'independent review must bind exact manifest');
    equal(review.outcome, 'PASS', 'independent source review must pass');
    equal(review.source_edits_by_reviewer, false, 'reviewer must not author implementation');
    equal(review.unresolved_scope_blockers, [], 'source review scope blockers remain');
    if (typeof review.reviewer !== 'string' || !review.reviewer.trim() || !Number.isFinite(Date.parse(review.reviewed_at_utc))) fail('genuine reviewer identity and timestamp required');
    for (const record of [manifest, review]) {
      equal(record.scope, SCOPE, 'exact bounded source/storage scope required');
      equal(record.runtime_proof, 'NOT_ESTABLISHED_BY_REVIEW', 'source review is not runtime proof');
      for (const flag of FLAGS) equal(record[flag], false, `source review cannot grant ${flag}`);
    }
    equal(manifest.successor_id, 'TEACH-DEMO-AUTHORING-ENGINEERING-2026-10-26', 'exact engineering successor required');
    equal([manifest.baseline_commit, manifest.baseline_tree], [AUTHORING_BASELINE, AUTHORING_BASELINE_TREE], 'exact released predecessor required');
    equal(manifest.registration_sha256, AUTHORING_REGISTRATION_SHA256, 'exact source decision binding required');
    // A review-sealed finite inventory, not caller-selected paths or an allowlist
    // bypass. Reject before following it if either immutable binding is invalid.
    if (errors.length) return { ...empty, present: true, errors };
    const previous = Object.keys(manifest.predecessor_files ?? {}).sort();
    const additions = manifest.added_paths;
    if (!Array.isArray(additions) || !previous.length || new Set(additions).size !== additions.length || additions.some(path => previous.includes(path))) fail('disjoint nonempty predecessor and unique addition inventory required');
    equal(Object.keys(manifest.predecessor_sha256 ?? {}).sort(), previous, 'exact predecessor hash inventory required');
    const addedDirectories = manifest.added_directories;
    if (!Array.isArray(addedDirectories) || new Set(addedDirectories).size !== addedDirectories.length) fail('exact unique added-directory inventory required');
    for (const path of Array.isArray(addedDirectories) ? addedDirectories : []) { authoringPath(path); reader.inventory(path); }
    const current = [...previous, ...(Array.isArray(additions) ? additions : [])].sort();
    equal(Object.keys(manifest.current_sha256 ?? {}).sort(), current, 'exact complete current source inventory required');
    for (const path of previous) { authoringPath(path); equal(hash(manifest.predecessor_files[path]), manifest.predecessor_sha256[path], `preserved predecessor differs: ${path}`); }
    for (const path of current) { authoringPath(path); equal(hash(normalizedAuthoringEngineeringSource(path, read(path))), manifest.current_sha256[path], `current source differs: ${path}`); }
    for (const [path, digest] of Object.entries(manifest.immutable_sha256 ?? {})) { authoringPath(path); equal(hash(read(path)), digest, `immutable historical evidence differs: ${path}`); }
    if (!Object.keys(manifest.immutable_sha256 ?? {}).length) fail('immutable old authority and SQL evidence required');
    return { ...empty, present: true, errors, revisedPaths: errors.length ? [] : previous, addedPaths: errors.length ? [] : [...additions], predecessorFiles: errors.length ? {} : { ...manifest.predecessor_files }, addedDirectories: errors.length ? [] : [...addedDirectories] };
  } catch (error) { fail(`missing or malformed engineering evidence: ${error.message}`); return { ...empty, present: true, errors }; }
}
