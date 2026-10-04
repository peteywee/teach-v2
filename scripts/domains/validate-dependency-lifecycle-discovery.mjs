#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT=resolve(process.cwd());
const errors=[];
const load=(p)=>{
  try { return JSON.parse(readFileSync(join(ROOT,p),'utf8')); }
  catch(e){ errors.push(`${p}: ${e.message}`); return null; }
};

const manifest=load('kernel/manifest.json');
const ownership=load('domains/ownership-map.json');
const proposal=load('domains/dependencies/lifecycle-closure.proposed.json');
const decisions=load('domains/dependencies/lifecycle-decisions.json');
const registration=load('domains/dependencies/lifecycle-registration.json');
const entities=load('kernel/entities.json');
const commands=load('kernel/commands.json');
const states=load('kernel/states.json');
const machines=load('kernel/state-machines.json');

if (manifest?.version!=='0.12.0') errors.push(`dependency lifecycle: expected K00 0.12.0, found ${manifest?.version}`);
if (ownership?.version!=='1.6.0' || ownership?.status!=='active') errors.push('dependency lifecycle: expected active Domain Ownership Map 1.6.0');

if (proposal) {
  if (proposal.version!=='0.1.0' || proposal.status!=='proposed') errors.push('dependency lifecycle: historical proposal must remain proposed 0.1.0');
  if (proposal.decision_groups?.length!==3) errors.push('dependency lifecycle: historical proposal must contain 3 decision groups');
  for (const d of proposal.decision_groups||[]) if (d.evidence_state!=='BLOCKED') errors.push(`dependency lifecycle: historical ${d.id} discovery state must remain BLOCKED`);
}
if (decisions) {
  if (decisions.version!=='1.0.0' || decisions.status!=='approved') errors.push('dependency lifecycle: owner decisions must be approved 1.0.0');
  if (decisions.required_new_command!=='RevokeInvitation') errors.push('dependency lifecycle: RevokeInvitation decision missing');
}
if (registration) {
  if (registration.version!=='1.0.0' || registration.status!=='recorded') errors.push('dependency lifecycle: registration must be recorded 1.0.0');
  if (registration.approved_state_sets?.length!==4) errors.push('dependency lifecycle: expected 4 approved state sets');
  if (registration.approved_state_machines?.length!==4) errors.push('dependency lifecycle: expected 4 approved state machines');
  if (registration.total_approved_commands!==23 || registration.remaining_candidate_commands!==0) errors.push('dependency lifecycle: command closure must be 23 approved / 0 candidate');
  if (registration.event_status_changes!==0) errors.push('dependency lifecycle: event status changes must remain zero');
}

const stateMap=new Map((states?.entries||[]).map(x=>[x.id,x]));
const expectedStates=new Map([
  ['InvitationStatus',['PENDING','ACCEPTED','REVOKED','EXPIRED']],
  ['SingleUseTokenStatus',['ACTIVE','CONSUMED','EXPIRED','REVOKED']],
  ['ReconciliationRecordStatus',['OPEN','RESOLVED']],
  ['ExternalEffectOutcome',['AMBIGUOUS','PARTIAL_FAILURE','CONFIRMED_SUCCESS','CONFIRMED_NO_EFFECT']],
]);
for (const [id,values] of expectedStates) {
  const s=stateMap.get(id);
  if (!s) { errors.push(`dependency lifecycle: missing state set ${id}`); continue; }
  if (s.status!=='approved') errors.push(`dependency lifecycle: ${id} must be approved`);
  if (JSON.stringify(s.values)!==JSON.stringify(values)) errors.push(`dependency lifecycle: ${id} values drifted`);
}

const machineMap=new Map((machines?.entries||[]).map(x=>[x.id,x]));
const expectedMachines=['InvitationStateMachine','SetupTokenStateMachine','PasswordResetTokenStateMachine','ReconciliationRecordStateMachine'];
for (const id of expectedMachines) {
  const m=machineMap.get(id);
  if (!m) { errors.push(`dependency lifecycle: missing state machine ${id}`); continue; }
  if (m.status!=='approved') errors.push(`dependency lifecycle: ${id} must be approved`);
}

for (const id of ['Invitation','SetupToken','PasswordResetToken','ReconciliationRecord']) {
  const e=(entities?.entries||[]).find(x=>x.id===id);
  if (e?.status!=='approved' || e?.lifecycle?.state!=='approved') errors.push(`dependency lifecycle: ${id} must be lifecycle-approved`);
}
for (const id of ['InviteIdentity','AcceptInvitation','RevokeSingleUseToken','ReconcileExternalEffect','RevokeInvitation']) {
  const c=(commands?.entries||[]).find(x=>x.id===id);
  if (c?.status!=='approved') errors.push(`dependency lifecycle: ${id} must be approved`);
}

if (errors.length) {
  console.error(`Dependency lifecycle closure FAILED (${errors.length} problem${errors.length===1?'':'s'}):`);
  for (const e of errors) console.error(`- ${e}`);
  process.exit(1);
}
console.log('Dependency lifecycle closure PASS');
console.log('Owner decision groups: 3 closed');
console.log('Approved lifecycle state sets: 4');
console.log('Approved lifecycle state machines: 4');
console.log('Commands: 23 approved / 0 candidate');
console.log('Event status changes: 0');
