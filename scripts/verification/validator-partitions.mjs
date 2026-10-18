import {createHash} from 'node:crypto';

// A finite scheduling refinement, not a change to any validator declaration.
// The two full-repository controls have measured aggregate cost and each runs
// alone. Every other ordinal retains its original twelve-way partition.
export const VALIDATOR_INVENTORY_COUNT=220;
export const VALIDATOR_INVENTORY_SHA256='36faf791bb97dd1a99c2c985316d2ee1f123c00be3c1b525db4a040876a2a923';
export const VALIDATOR_PARTITION_COUNT=14;
export const WHOLE_REPOSITORY_CONTROLS=Object.freeze([
 Object.freeze({ordinal:152,name:'whole audit: every standalone gate passes',partition:13}),
 Object.freeze({ordinal:153,name:'whole audit: an otherwise untriggered historical validator fails',partition:14}),
]);
export function validatorPartitionForOrdinal(ordinal){
 if(!Number.isInteger(ordinal)||ordinal<0||ordinal>=VALIDATOR_INVENTORY_COUNT)throw Error('exact validator ordinal required');
 return WHOLE_REPOSITORY_CONTROLS.find(row=>row.ordinal===ordinal)?.partition??ordinal%12+1;
}
export function validatorPartitionOrdinals(index){
 if(!Number.isInteger(index)||index<1||index>VALIDATOR_PARTITION_COUNT)throw Error('exact validator partition required');
 return Array.from({length:VALIDATOR_INVENTORY_COUNT},(_,ordinal)=>ordinal).filter(ordinal=>validatorPartitionForOrdinal(ordinal)===index);
}
export function assertValidatorInventory(names){
 if(!Array.isArray(names)||names.length!==VALIDATOR_INVENTORY_COUNT||new Set(names).size!==names.length||createHash('sha256').update(JSON.stringify(names)).digest('hex')!==VALIDATOR_INVENTORY_SHA256||WHOLE_REPOSITORY_CONTROLS.some(row=>names[row.ordinal]!==row.name))throw Error('exact original validator declarations and dedicated controls required');
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
