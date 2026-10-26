/** Test-only newest-to-oldest reconstruction. Never used by runtime/admission.
 * Authenticate the entire current successor before omitting its finite additions;
 * retain every original historical assertion and restore the live fixture. */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, rmSync, rmdirSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { inspectKitchenRegistration } from '../kernel/demo-kitchen-registration.mjs';
import { inspectKitchenEngineering, KITCHEN_ENGINEERING_MANIFEST, KITCHEN_ENGINEERING_REVIEW } from '../verification/demo-kitchen-engineering.mjs';
import { inspectKitchenPhysicalSuccessor } from '../persistence/demo-kitchen-physical-successor.mjs';

export function withKitchenPredecessor(root, work) {
  const source=inspectKitchenRegistration(root),engineering=inspectKitchenEngineering(root),physical=inspectKitchenPhysicalSuccessor(root);
  for(const result of [source,engineering,physical]){assert.equal(result.present,true);assert.deepEqual(result.errors,[]);}
  assert.equal(physical.admitted,true);
  const removed=[...new Set([...source.addedPaths,...engineering.addedPaths,...physical.addedPaths,KITCHEN_ENGINEERING_MANIFEST,KITCHEN_ENGINEERING_REVIEW])];
  const predecessors={...source.predecessorFiles,...engineering.predecessorFiles};
  const live=new Map([...new Set([...removed,...Object.keys(predecessors)])].map(path=>[path,readFileSync(join(root,path),'utf8')]));
  try {
    for(const [path,text] of Object.entries(predecessors))writeFileSync(join(root,path),text);
    for(const path of removed)rmSync(join(root,path));
    // Nonrecursive rmdir refuses an unlisted addition instead of hiding it.
    for(const path of ['domains/demo-kitchen/proposal-0.1.0','domains/demo-kitchen','verification/demo-kitchen','persistence/physical-slices/demo-kitchen'])rmdirSync(join(root,path));
    return work();
  } finally {
    for(const [path,text] of live){mkdirSync(dirname(join(root,path)),{recursive:true});writeFileSync(join(root,path),text);}
  }
}

// Exactly one existing 220-case declaration acquired a newer kitchen denial.
// This does not replace its original b90 property or recipe-era current oracle.
export const KITCHEN_VALIDATOR_TRANSITION = Object.freeze({
  name: 'slice-p04 implementation: missing journal entry fails',
  script: 'scripts/persistence/validate-slice-p04-implementation-boundary.mjs',
  original_diagnostic: 'demo physical admission: original journal prefix must remain immutable',
  current_diagnostic: 'demo kitchen engineering: current source differs: drizzle/meta/_journal.json',
});
export function kitchenValidatorTransition(name, transition) {
  if (name !== KITCHEN_VALIDATOR_TRANSITION.name) return null;
  assert.equal(transition?.name, name, 'named original transition required');
  assert.equal(transition?.script, KITCHEN_VALIDATOR_TRANSITION.script, 'original transition validator required');
  assert.equal(transition?.current_diagnostic, KITCHEN_VALIDATOR_TRANSITION.original_diagnostic, 'original recipe-era diagnostic required');
  return KITCHEN_VALIDATOR_TRANSITION;
}

// The new cleanup precedes the original finalizer. Preserve that one original
// first-if mutation on authenticated predecessor inputs; target the finalizer
// explicitly on current inputs, never accept the cleanup's unrelated rejection.
export const KITCHEN_FINALIZER_TRANSITION = Object.freeze({
  name: 'self-audit: missing failure finalizer fails',
  script: 'scripts/verification/validate-development-self-audit.mjs',
  pattern: 'finalize and be retained',
  mutation_sha256: '14a435d23f24e46cd5d1dee2df70f1e11557d4ee843d3ef4067309426a65463d',
  diagnostic: 'consolidated verification: failed or missing audit evidence must finalize and be retained',
});
export function kitchenFinalizerTransition(name, script, mutate, expect) {
  if (name !== KITCHEN_FINALIZER_TRANSITION.name) return null;
  assert.equal(script, KITCHEN_FINALIZER_TRANSITION.script, 'original finalizer validator required');
  assert.equal(expect?.pass, undefined, 'original finalizer denial required');
  assert.equal(expect?.pattern?.source, KITCHEN_FINALIZER_TRANSITION.pattern, 'original finalizer matcher required');
  assert.equal(createHash('sha256').update(mutate.toString()).digest('hex'), KITCHEN_FINALIZER_TRANSITION.mutation_sha256, 'original finalizer mutation required');
  return KITCHEN_FINALIZER_TRANSITION;
}
export function mutateKitchenFinalizer(workflow) {
  const target = '        id: audit_finalize\n        if: always()\n        run: node scripts/verification/run-self-audit.mjs --finish\n';
  assert.equal([...workflow.matchAll(/^        id: audit_finalize$/gm)].length, 1, 'one exact audit finalizer required');
  assert.equal(workflow.split(target).length, 2, 'one exact always-run finalizer required');
  return workflow.replace(target, target.replace('if: always()', 'if: success()'));
}
