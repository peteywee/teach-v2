import { createHash } from 'node:crypto';
import { existsSync, lstatSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import { inspectDemoPhysicalPrerequisites } from '../persistence/demo-admission-evidence.mjs';

export const DEMO_PHYSICAL_LANE = 'persistence/physical-slices/demo-runtime';
export const DEMO_PHYSICAL_ENVELOPE = `${DEMO_PHYSICAL_LANE}/physical-successor.json`;
export const DEMO_PHYSICAL_REVIEW = `${DEMO_PHYSICAL_LANE}/independent-successor-review.json`;
export const DEMO_PHYSICAL_PATHS = Object.freeze([
  'persistence/physical-slices/readiness.json',
  'persistence/physical-slices/queue-post-p05.json',
  ...['admission.json', 'admission-evidence-plan.json', 'implementation.json'].map(name => `persistence/physical-slices/learning-session/${name}`),
  ...['assignment', 'progress-event'].flatMap(lane => ['admission.json', 'admission-evidence-plan.json'].map(name => `persistence/physical-slices/${lane}/${name}`)),
]);
export const DEMO_PHYSICAL_EVIDENCE = Object.freeze([
  'representation.proposed.json', 'admission-evidence-plan.json',
  'independent-representation-review.json', 'semantic-independent-review.json',
  'semantic-independent-review.md', 'admission.json', 'prior-journal.json',
].map(name => `${DEMO_PHYSICAL_LANE}/${name}`));
export const DEMO_PHYSICAL_BINDING = Object.freeze({
  package: 'TEACH-DEMO-RUNTIME-2026-10-17@0.1.0',
  package_sha256sums_digest: 'a1df23b03a0f0660a072cff00eb40d3d2fb60bc8c521f12b56977f559601196a',
  source_baseline: Object.freeze({
    commit: '14ca8c409993c9e57077d9705db022d3bfd26b1a',
    tree: '771867f1dbb47e277f90158a9f25b504bb786510',
    sha256: '86071ed7379f2a9af85e7da501009803f353267fa66fe422d7b4926794135e8d',
  }),
  semantic_registration: Object.freeze({
    commit: '4d759924389590c9bda330008dbfc76291485200',
    tree: '5795b40203414a6751db4e44684b1151cf63903e',
    sha256: 'b94cf7c7c9bab35ad2454470295ae2b04b8814bd0ac55c282cdd3dd6df67218d',
  }),
});
export const DEMO_PHYSICAL_PROVENANCE = Object.freeze({
  record: DEMO_PHYSICAL_ENVELOPE,
  phase: 'AUTHORING_UNDER_TEST',
  evidence_proof: 'UNDER_TEST',
  runtime_proof: 'NOT_RUN',
  shared_or_production_migration_execution_authorized: false,
});

// Deliberately fail closed until the independent reviewer supplies the real
// exact-envelope attestation. Never obtain this trust anchor from the envelope.
export const DEMO_PHYSICAL_REVIEW_SHA256 = 'f23cf4aa57a6ca68617f70f8a464c2dc936c28f8b656f28eca5f3b4aaf95cf6b';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');

// Mechanical evidence builder only: this does not issue ADMIT or reviewer PASS.
// The caller writes and independently reviews its output before sealing it.
export function buildDemoPhysicalSuccessor(root, source) {
  const raw = path => readFileSync(join(root, path));
  return {
    successor_id: 'TEACH-DEMO-PHYSICAL-SUCCESSOR-2026-10-17',
    version: '1.0.0',
    ...structuredClone(DEMO_PHYSICAL_BINDING),
    phase: 'AUTHORING_UNDER_TEST',
    runtime_proof: 'NOT_RUN',
    shared_or_production_migration_execution_authorized: false,
    evidence_hashes: Object.fromEntries(DEMO_PHYSICAL_EVIDENCE.map(path => [path, hash(raw(path))])),
    files: DEMO_PHYSICAL_PATHS.map(path => ({ path, before_sha256: hash(source.files[path]), after_sha256: hash(raw(path)) })),
  };
}

// This leaf is synchronous, read-only and non-recursive. It receives the
// already checked semantic result; the prerequisite leaf never calls back into
// semantic inspection. It grants no runtime/replay/production verification.
export function inspectDemoPhysicalSuccessor(root, registration) {
  if (!existsSync(join(root, DEMO_PHYSICAL_ENVELOPE))) {
    return { errors: existsSync(join(root, DEMO_PHYSICAL_REVIEW)) ? ['demo physical successor: orphan independent review without envelope'] : [], present: false, revisedPaths: [] };
  }
  const errors = [], fail = message => errors.push(`demo physical successor: ${message}`);
  const equal = (actual, expected, message) => { if (!isDeepStrictEqual(actual, expected)) fail(message); };
  const raw = path => {
    const parts = path.split('/');
    for (let index = 1; index <= parts.length; index++) {
      const stat = lstatSync(join(root, ...parts.slice(0, index)));
      if (stat.isSymbolicLink() || (index === parts.length ? !stat.isFile() : !stat.isDirectory())) throw new Error(`regular file/ancestor required: ${path}`);
    }
    return readFileSync(join(root, path));
  };
  const json = path => JSON.parse(raw(path));
  try {
    if (registration?.errors?.length || registration?.registered !== true || registration?.registeredEntries !== 131 || registration?.closure?.approvedEntries !== 236 || registration?.closure?.checkedReferences !== 583 || registration?.closure?.exceptions?.length !== 0) {
      fail('fresh exact semantic core and zero-hold closure required');
      return { errors, present: true, revisedPaths: [] };
    }
    const envelope = json(DEMO_PHYSICAL_ENVELOPE);
    const review = existsSync(join(root, DEMO_PHYSICAL_REVIEW)) ? json(DEMO_PHYSICAL_REVIEW) : null;
    // Report the remaining input failures even before review arrives. Missing
    // or unsealed review still yields zero revised paths and cannot admit work.
    if (!review) fail('independent successor review missing');
    else {
      if (!DEMO_PHYSICAL_REVIEW_SHA256 || hash(raw(DEMO_PHYSICAL_REVIEW)) !== DEMO_PHYSICAL_REVIEW_SHA256) fail('independent successor review is unsealed or bytes changed');
      equal(review.outcome, 'PASS', 'independent engineering review must PASS');
      equal(review.source_edits_by_reviewer, false, 'independent reviewer must not author successor sources');
      if (typeof review.reviewer !== 'string' || !review.reviewer.trim()) fail('independent reviewer identity required');
      equal(review.physical_successor_sha256, hash(raw(DEMO_PHYSICAL_ENVELOPE)), 'independent review must bind exact successor envelope');
      equal(review.semantic_registration, DEMO_PHYSICAL_BINDING.semantic_registration, 'review must bind independently passed semantic candidate');
      equal(review.package_sha256sums_digest, DEMO_PHYSICAL_BINDING.package_sha256sums_digest, 'review package digest differs');
    }
    for (const path of [...DEMO_PHYSICAL_EVIDENCE, ...DEMO_PHYSICAL_PATHS]) raw(path);
    equal(envelope, buildDemoPhysicalSuccessor(root, registration.source), 'exact nine-path successor envelope or original/live hashes differ');
    const expectedNames = [...DEMO_PHYSICAL_EVIDENCE, DEMO_PHYSICAL_ENVELOPE, DEMO_PHYSICAL_REVIEW].map(path => path.slice(DEMO_PHYSICAL_LANE.length + 1)).sort();
    const inventory = readdirSync(join(root, DEMO_PHYSICAL_LANE), { withFileTypes: true });
    equal(inventory.map(item => item.name).sort(), expectedNames, 'exact physical evidence directory inventory required');
    if (inventory.some(item => !item.isFile())) fail('physical evidence inventory permits only regular files');
    const prerequisites = inspectDemoPhysicalPrerequisites(root, registration);
    errors.push(...prerequisites.errors);
    equal(prerequisites.decision, 'ADMIT', 'fresh physical prerequisites must ADMIT');
    const admission = json(`${DEMO_PHYSICAL_LANE}/admission.json`);
    for (const [key, value] of Object.entries({
      admission_id: 'TEACH-DEMO-RUNTIME-PHYSICAL-ADMISSION', version: '1.0.0', issue: '#82',
      package: DEMO_PHYSICAL_BINDING.package, decision: 'ADMIT', criteria: prerequisites.criteria,
      mapping_sha256: prerequisites.mapping_sha256, evidence_plan_sha256: prerequisites.evidence_plan_sha256,
      semantic_review: prerequisites.semantic_review, physical_schema_authorized: true,
      implementation_authorized: true, migration_authoring_authorized: true,
      shared_or_production_migration_execution_authorized: false, runtime_proof: 'NOT_RUN',
    })) equal(admission[key], value, `recorded admission must reproduce fresh ${key}`);
    for (const path of DEMO_PHYSICAL_PATHS) {
      const current = json(path);
      equal(current.demo_physical_successor, DEMO_PHYSICAL_PROVENANCE, `explicit under-test physical scope required: ${path}`);
      if (Object.hasOwn(current, 'runtime_activation')) equal(current.runtime_activation, 'BLOCKED', `runtime activation remains independently unproven: ${path}`);
      if (Object.hasOwn(current, 'shared_or_production_migration_execution_authorized')) equal(current.shared_or_production_migration_execution_authorized, false, `shared/production execution remains excluded: ${path}`);
    }
    const implementation = json('persistence/physical-slices/learning-session/implementation.json');
    equal(implementation.status, 'IMPLEMENTED', 'P05 authoring checkpoint must distinguish implemented artifacts from proof');
    equal(implementation.evidence_proof, 'UNDER_TEST', 'new P05 implementation evidence must remain UNDER_TEST');
    equal(implementation.runtime_proof, 'NOT_RUN', 'new P05 runtime proof must remain NOT_RUN');
    if (!implementation.verification || typeof implementation.verification !== 'object' || Array.isArray(implementation.verification) || Object.keys(implementation.verification).length === 0 || Object.values(implementation.verification).some(value => !['NOT_RUN', 'UNDER_TEST'].includes(value))) fail('new P05 verification cannot reuse historical PASS evidence');
    return { errors, present: true, revisedPaths: errors.length ? [] : [...DEMO_PHYSICAL_PATHS], envelope, prerequisites };
  } catch (error) {
    fail(`missing or malformed successor evidence: ${error.message}`);
    return { errors, present: true, revisedPaths: [] };
  }
}
