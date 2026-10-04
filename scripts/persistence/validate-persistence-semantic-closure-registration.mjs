#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { resolve, join } from 'node:path';

const ROOT=resolve(process.cwd());
const errors=[];
const load=(p)=>{try{return JSON.parse(readFileSync(join(ROOT,p),'utf8'));}catch(e){errors.push(`${p}: ${e.message}`);return null;}};

const m=load('kernel/manifest.json');
const ids=load('kernel/identifiers.json');
const states=load('kernel/states.json');
const machines=load('kernel/state-machines.json');
const rel=load('kernel/relationships.json');
const reg=load('persistence/semantic-closure/registration.json');

const promotedIds=['IdentityId','OrganizationId','ApplicationSessionId','ContentPackId','LearningSessionId','CertificationId','IdempotencyKey','RequestId'];
const promotedStates=['IdentityStatus','ApplicationSessionStatus','LearningSessionStatus'];
const promotedMachines=['IdentityStateMachine','ApplicationSessionStateMachine','LearningSessionStateMachine'];
const promotedRelationships=['CredentialBelongsToIdentity','IdentityHasApplicationSession','AssignmentTargetsIdentity','AssignmentReferencesContentPack','IdentityHasLearningSession','LearningSessionUsesAssignment','ProgressEventBelongsToLearningSession','CertificationBelongsToIdentity','CertificationReferencesContentPack','CertificationObservedByIdentity'];

if (m?.version!=='0.14.0') errors.push(`semantic closure registration: expected K00 0.14.0, found ${m?.version}`);
for (const id of promotedIds) if ((ids?.entries||[]).find(x=>x.id===id)?.status!=='approved') errors.push(`semantic closure registration: ${id} must be approved`);
for (const id of promotedStates) if ((states?.entries||[]).find(x=>x.id===id)?.status!=='approved') errors.push(`semantic closure registration: ${id} must be approved`);
for (const id of promotedMachines) if ((machines?.entries||[]).find(x=>x.id===id)?.status!=='approved') errors.push(`semantic closure registration: ${id} must be approved`);
for (const id of promotedRelationships) if ((rel?.entries||[]).find(x=>x.id===id)?.status!=='approved') errors.push(`semantic closure registration: ${id} must be approved`);

for (const id of ['CredentialId','AssignmentId','ProgressEventId','CapabilityId','MembershipId','LocationId']) {
  if ((ids?.entries||[]).find(x=>x.id===id)?.status!=='candidate') errors.push(`semantic closure registration: excluded ${id} must remain candidate`);
}
for (const id of ['MembershipStatus','EvidenceState']) {
  if ((states?.entries||[]).find(x=>x.id===id)?.status!=='candidate') errors.push(`semantic closure registration: excluded ${id} must remain candidate`);
}
if ((rel?.entries||[]).filter(x=>x.status==='approved').length!==10) errors.push('semantic closure registration: expected exactly 10 approved relationships');
if ((rel?.entries||[]).filter(x=>x.status==='candidate').length!==9) errors.push('semantic closure registration: expected exactly 9 candidate relationships');
if (reg?.version!=='1.0.0' || reg?.status!=='recorded') errors.push('semantic closure registration: registration record missing');
if (reg?.promotion_counts?.total!==24) errors.push('semantic closure registration: promotion total must be 24');
if (reg?.command_status_changes!==0 || reg?.event_status_changes!==0) errors.push('semantic closure registration: command/event status change forbidden');

if (errors.length) {
  console.error(`Persistence semantic closure registration FAILED (${errors.length} problem${errors.length===1?'':'s'}):`);
  for (const e of errors) console.error(`- ${e}`);
  process.exit(1);
}
console.log('Persistence semantic closure registration PASS');
console.log('K00: 0.14.0');
console.log('Promotions: 8 identifiers + 3 state sets + 3 state machines + 10 relationships = 24');
console.log('Relationships: 10 approved / 9 candidate');
console.log('Commands/events: unchanged');
