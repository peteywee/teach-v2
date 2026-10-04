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

if (m?.version!=='0.16.0') errors.push(`semantic closure registration: expected K00 0.16.0, found ${m?.version}`);
for (const id of promotedIds) if ((ids?.entries||[]).find(x=>x.id===id)?.status!=='approved') errors.push(`semantic closure registration: ${id} must be approved`);
for (const id of promotedStates) if ((states?.entries||[]).find(x=>x.id===id)?.status!=='approved') errors.push(`semantic closure registration: ${id} must be approved`);
for (const id of promotedMachines) if ((machines?.entries||[]).find(x=>x.id===id)?.status!=='approved') errors.push(`semantic closure registration: ${id} must be approved`);
for (const id of promotedRelationships) if ((rel?.entries||[]).find(x=>x.id===id)?.status!=='approved') errors.push(`semantic closure registration: ${id} must be approved`);

// Issue #17 exclusions describe that historical promotion only. Issue #46
// subsequently approved three identifiers; validate their recorded authority
// instead of forcing the live registry back to the historical candidate state.
for (const id of ['CredentialId','AssignmentId','ProgressEventId']) {
  const entry=(ids?.entries||[]).find(x=>x.id===id);
  if(entry?.status!=='approved' || entry?.promotion_issue!=='#46' ||
     entry?.promoted_on!=='2026-10-04' || !Array.isArray(entry?.promotion_evidence) ||
     entry.promotion_evidence.length===0 || entry.promotion_evidence.some(x=>typeof x!=='string' || !x.trim())) {
    errors.push(`semantic closure registration: later ${id} approval requires issue #46 promotion evidence`);
  }
  if(!(reg?.explicitly_not_promoted||[]).some(x=>x.id===id)) errors.push(`semantic closure registration: historical exclusion for ${id} must be preserved`);
}
for (const id of ['CapabilityId','MembershipId','LocationId']) {
  if ((ids?.entries||[]).find(x=>x.id===id)?.status!=='candidate') errors.push(`semantic closure registration: excluded ${id} must remain candidate`);
}
for (const id of ['MembershipStatus','EvidenceState']) {
  if ((states?.entries||[]).find(x=>x.id===id)?.status!=='candidate') errors.push(`semantic closure registration: excluded ${id} must remain candidate`);
}
if ((rel?.entries||[]).filter(x=>x.status==='approved').length!==15) errors.push('semantic closure registration: expected exactly 15 approved relationships');
if ((rel?.entries||[]).filter(x=>x.status==='candidate').length!==8) errors.push('semantic closure registration: expected exactly 8 candidate relationships');
if (reg?.version!=='1.0.0' || reg?.status!=='recorded') errors.push('semantic closure registration: registration record missing');
if(reg?.issue!=='#17' || reg?.kernel_from!=='0.13.0' || reg?.kernel_to!=='0.14.0') errors.push('semantic closure registration: historical issue #17 provenance must remain intact');
for(const [kind,expected] of [['identifiers',promotedIds],['state_sets',promotedStates],['state_machines',promotedMachines],['relationships',promotedRelationships]]) {
  const entries=reg?.promotions?.[kind];
  if(!Array.isArray(entries) || entries.length!==expected.length ||
     new Set(entries.map(x=>x.id)).size!==expected.length ||
     entries.some(x=>!expected.includes(x.id) || x.from!=='candidate' || x.to!=='approved') ||
     reg?.promotion_counts?.[kind]!==expected.length) errors.push(`semantic closure registration: exact historical ${kind} promotion set required`);
}
if (reg?.promotion_counts?.total!==24) errors.push('semantic closure registration: promotion total must be 24');
if (reg?.command_status_changes!==0 || reg?.event_status_changes!==0) errors.push('semantic closure registration: command/event status change forbidden');

if (errors.length) {
  console.error(`Persistence semantic closure registration FAILED (${errors.length} problem${errors.length===1?'':'s'}):`);
  for (const e of errors) console.error(`- ${e}`);
  process.exit(1);
}
console.log('Persistence semantic closure registration PASS');
console.log('Historical promotion: K00 0.13.0 -> 0.14.0; current K00: 0.16.0');
console.log('Promotions: 8 identifiers + 3 state sets + 3 state machines + 10 relationships = 24');
console.log('Current relationships: 15 approved / 8 candidate');
console.log('Historical commands/events: unchanged; later identifier approval: issue #46');
