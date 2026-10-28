import {createHash} from 'node:crypto';

// A finite scheduling refinement, not a change to any validator declaration.
// The two full-repository controls have measured aggregate cost and each runs
// alone. Six measured literal moves rebalance existing partitions; every other
// ordinal retains its original twelve-way partition. No dynamic scheduling.
export const VALIDATOR_INVENTORY_COUNT=220;
export const VALIDATOR_INVENTORY_SHA256='36faf791bb97dd1a99c2c985316d2ee1f123c00be3c1b525db4a040876a2a923';
export const VALIDATOR_PARTITION_COUNT=26;
export const PREDECESSOR_VALIDATOR_PARTITION_COUNT=14;
export const WHOLE_REPOSITORY_CONTROLS=Object.freeze([
 Object.freeze({ordinal:152,name:'whole audit: every standalone gate passes',partition:13}),
 Object.freeze({ordinal:153,name:'whole audit: an otherwise untriggered historical validator fails',partition:14}),
]);
export const REBALANCED_VALIDATOR_CASES=Object.freeze([
 Object.freeze({ordinal:108,name:'foundation: repository totals fails',partition:3}),
 Object.freeze({ordinal:120,name:'p05 physical evidence: production execution fails',partition:4}),
 Object.freeze({ordinal:144,name:'integration: invented relationship count fails',partition:4}),
 Object.freeze({ordinal:176,name:'integration: future table cannot hide in existing module',partition:12}),
 Object.freeze({ordinal:180,name:'integration: missing future evidence plan fails',partition:4}),
 Object.freeze({ordinal:201,name:'decision closure: registered policy and 24 denial regressions pass',partition:5}),
]);
export function predecessorValidatorPartitionForOrdinal(ordinal){
 if(!Number.isInteger(ordinal)||ordinal<0||ordinal>=VALIDATOR_INVENTORY_COUNT)throw Error('exact validator ordinal required');
 return WHOLE_REPOSITORY_CONTROLS.find(row=>row.ordinal===ordinal)?.partition??REBALANCED_VALIDATOR_CASES.find(row=>row.ordinal===ordinal)?.partition??ordinal%12+1;
}
// Explicit scheduling successor: original ordinary partition membership stays
// intact; alternate positions move to its second half. Whole controls stay alone.
export function validatorPartitionForOrdinal(ordinal){
 const prior=predecessorValidatorPartitionForOrdinal(ordinal);
 if(prior===13||prior===14)return prior;
 const position=Array.from({length:ordinal+1},(_,i)=>i).filter(i=>predecessorValidatorPartitionForOrdinal(i)===prior).length-1;
 return position%2===0?prior:prior+14;
}
export function validatorPartitionOrdinals(index){
 if(!Number.isInteger(index)||index<1||index>VALIDATOR_PARTITION_COUNT)throw Error('exact validator partition required');
 return Array.from({length:VALIDATOR_INVENTORY_COUNT},(_,ordinal)=>ordinal).filter(ordinal=>validatorPartitionForOrdinal(ordinal)===index);
}
export function assertValidatorInventory(names){
 if(!Array.isArray(names)||names.length!==VALIDATOR_INVENTORY_COUNT||new Set(names).size!==names.length||createHash('sha256').update(JSON.stringify(names)).digest('hex')!==VALIDATOR_INVENTORY_SHA256||[...WHOLE_REPOSITORY_CONTROLS,...REBALANCED_VALIDATOR_CASES].some(row=>names[row.ordinal]!==row.name))throw Error('exact original validator declarations and dedicated controls required');
}

// Positive anchored selectors avoid Node20 parent-suite matching by a zero-length negative lookahead.
export const REGISTRATION_TEST_NAMES=Object.freeze([
 "exact demo successor proves 131 entries, 236 approved, 583 references and no holds",
 "all 131 exact registered entries reject partial approval and deletion",
 "every family rejects extra entries and unrelated status promotions",
 "typed references cannot substitute a candidate homonym or wrong family",
 "Membership promotion removes only old hold and cannot promote candidate business events",
 "baseline bytes, exact owner evidence and proposal files are immutable",
 "registration inventory, activation scope and authority hash allowlist cannot be forged",
 "manifest ancestry and exact one-owner assignments remain closed",
 "current immutable historical evidence is checked live, never hidden by baseline reads",
 "every registered changed authority file remains byte-bound to reviewed registration",
 "envelope collisions never rename ContentPack or replace LifecycleSnapshot definition",
 "actual kernel, admission and historical discovery CLIs reject changed live authority",
 "only three exact approved four-segment names extend baseline grammar",
 "frozen proposal directory rejects unexpected files and nested directories",
 "historical physical criterion order remains non-authoritative without allowing changed evidence",
 "active authority roots reject unregistered files, subdirectories and symlinks",
 "validator harness never accepts expected stderr followed by timeout, signal or launch failure"
]);
export const REGISTRATION_ENTRY_PATTERN='^'+REGISTRATION_TEST_NAMES[1]+'$';
export const REGISTRATION_REMAINDER_PATTERN='^(?:'+REGISTRATION_TEST_NAMES.filter((_,index)=>index!==1).join('|')+')$';

// Exact current inventories; emitted partition receipts bind names as well as counts.
export const AUTHORITY_VALIDATORS=Object.freeze([
  "scripts/application-interfaces/audit-architecture-application.mjs",
  "scripts/application-interfaces/validate-application-interface-authority.mjs",
  "scripts/application-interfaces/validate-application-interface-discovery.mjs",
  "scripts/application-interfaces/validate-application-interface-proposal.mjs",
  "scripts/architecture/validate-architecture-authority.mjs",
  "scripts/architecture/validate-architecture-discovery.mjs",
  "scripts/architecture/validate-architecture-proposal.mjs",
  "scripts/architecture/validate-command-coverage.mjs",
  "scripts/architecture/validate-repository-integration.mjs",
  "scripts/docs/validate-document-metadata.mjs",
  "scripts/domains/validate-command-event-discovery.mjs",
  "scripts/domains/validate-decision-table-discovery.mjs",
  "scripts/domains/validate-dependency-concepts.mjs",
  "scripts/domains/validate-dependency-lifecycle-discovery.mjs",
  "scripts/domains/validate-domain-ownership.mjs",
  "scripts/domains/validate-invariant-discovery.mjs",
  "scripts/domains/validate-relationships.mjs",
  "scripts/domains/validate-state-discovery.mjs",
  "scripts/governance/validate-strict-nine-ratification.mjs",
  "scripts/kernel/validate-capability-admission.mjs",
  "scripts/kernel/validate-demo-authoring-registration.mjs",
  "scripts/kernel/validate-demo-kitchen-registration.mjs",
  "scripts/kernel/validate-demo-recipes-registration.mjs",
  "scripts/kernel/validate-demo-runtime-registration.mjs",
  "scripts/kernel/validate-semantic-kernel.mjs",
  "scripts/persistence/audit-architecture-application-persistence.mjs",
  "scripts/persistence/audit-first-physical-slice-readiness.mjs",
  "scripts/persistence/validate-demo-physical-admission.mjs",
  "scripts/persistence/validate-demo-recipes-physical-admission.mjs",
  "scripts/persistence/validate-first-physical-slice-readiness.mjs",
  "scripts/persistence/validate-persistence-authority.mjs",
  "scripts/persistence/validate-persistence-discovery.mjs",
  "scripts/persistence/validate-persistence-proposal.mjs",
  "scripts/persistence/validate-persistence-semantic-closure-discovery.mjs",
  "scripts/persistence/validate-persistence-semantic-closure-proposal.mjs",
  "scripts/persistence/validate-persistence-semantic-closure-registration.mjs",
  "scripts/persistence/validate-slice-p01-implementation-boundary.mjs",
  "scripts/persistence/validate-slice-p01-relationship-promotion.mjs",
  "scripts/persistence/validate-slice-p01-schema-admission.mjs",
  "scripts/persistence/validate-slice-p02-implementation-boundary.mjs",
  "scripts/persistence/validate-slice-p02-owner-decisions.mjs",
  "scripts/persistence/validate-slice-p02-schema-admission.mjs",
  "scripts/persistence/validate-slice-p03-implementation-boundary.mjs",
  "scripts/persistence/validate-slice-p03-schema-admission.mjs",
  "scripts/persistence/validate-slice-p04-implementation-boundary.mjs",
  "scripts/persistence/validate-slice-p04-schema-admission.mjs",
  "scripts/persistence/validate-slice-p05-foundation.mjs",
  "scripts/persistence/validate-slice-p05-implementation-boundary.mjs",
  "scripts/persistence/validate-slice-p05-owner-decisions.mjs",
  "scripts/persistence/validate-slice-p05-schema-admission.mjs",
  "scripts/persistence/validate-slice-p06-schema-admission.mjs",
  "scripts/persistence/validate-slice-p07-schema-admission.mjs",
  "scripts/persistence/validate-slice-p08-schema-admission.mjs",
  "scripts/persistence/validate-transactioncontrol-first-slice-decision-packet.mjs",
  "scripts/persistence/validate-transactioncontrol-first-slice-decision-registration.mjs",
  "scripts/verification/validate-decision-closure.mjs",
  "scripts/verification/validate-development-self-audit.mjs",
  "scripts/verification/validate-legacy-foundation-recovery.mjs",
  "scripts/verification/validate-owner-policy-registration.mjs",
  "scripts/verification/validate-workflow-lifecycle.mjs"
]);
export const MIGRATION_GUARD_NAMES=Object.freeze([
  "clean repaired history passes",
  "original P04 missing journal entry fails",
  "original P04 stale identities FK fails",
  "missing migration SQL fails",
  "missing snapshot fails",
  "broken snapshot chain fails",
  "reused snapshot id fails",
  "noncontiguous journal idx fails",
  "duplicate timestamp fails",
  "unsafe journal path fails",
  "empty journal fails",
  "snapshot foreign-key target drift fails",
  "snapshot foreign-key column drift fails",
  "SQL foreign-key column drift fails",
  "readiness migration count drift fails",
  "readiness table count drift fails",
  "valid appended history passes without hardcoded totals",
  "unadmitted appended history does not gain live physical authority"
]);
export function parseBoundedPartition(args,total=2){
 if(![2,3].includes(total)||!Array.isArray(args)||args.length>1)throw Error('exact bounded partition arguments required');
 if(!args.length)return null;
 const match=/^--partition=([1-3])\/([23])$/.exec(args[0]);
 if(!match||Number(match[2])!==total||Number(match[1])>total)throw Error('exact bounded partition arguments required');
 return Number(match[1]);
}
export function boundedPartitionEvidence(kind,index){
 const total=kind==='migration'?3:2;
 if(!['authority','migration'].includes(kind)||!Number.isInteger(index)||index<1||index>total)throw Error('exact bounded partition required');
 const names=kind==='authority'?AUTHORITY_VALIDATORS:MIGRATION_GUARD_NAMES;
 return {kind,index,total,inventory:names.length,ordinals:names.flatMap((_,i)=>i%total===index-1?[i]:[]),digest:createHash('sha256').update(JSON.stringify(names)).digest('hex'),names:names.filter((_,i)=>i%total===index-1)};
}
