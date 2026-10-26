/** Test-only newest-to-oldest reconstruction. Never used by runtime/admission.
 * Authenticate the entire current successor before omitting its finite additions;
 * retain every original historical assertion and restore the live fixture. */
import assert from 'node:assert/strict';
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
