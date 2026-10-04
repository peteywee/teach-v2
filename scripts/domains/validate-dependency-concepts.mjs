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
const entities=load('kernel/entities.json');
const identifiers=load('kernel/identifiers.json');
const commands=load('kernel/commands.json');
const registration=load('domains/dependencies/registration.json');

if (manifest?.version!=='0.11.0') errors.push(`dependency concepts: expected K00 0.11.0, found ${manifest?.version}`);
if (ownership?.version!=='1.5.0' || ownership?.status!=='active') errors.push('dependency concepts: expected active Domain Ownership Map 1.5.0');

const expected=new Map([
  ['Invitation',{id:'InvitationId',owner:'Identity'}],
  ['SetupToken',{id:'SetupTokenId',owner:'Identity'}],
  ['PasswordResetToken',{id:'PasswordResetTokenId',owner:'Identity'}],
  ['ReconciliationRecord',{id:'ReconciliationRecordId',owner:'TransactionControl'}],
]);

for (const [id,meta] of expected) {
  const e=(entities?.entries||[]).find(x=>x.id===id);
  if (!e) { errors.push(`dependency concepts: missing entity ${id}`); continue; }
  if (e.status!=='candidate') errors.push(`dependency concepts: ${id} must remain candidate`);
  if (e.owning_domain!==meta.owner) errors.push(`dependency concepts: ${id} owner must be ${meta.owner}`);
  if (e.identifier!==meta.id) errors.push(`dependency concepts: ${id} identifier must be ${meta.id}`);
  if (e.lifecycle?.state!=='blocked') errors.push(`dependency concepts: ${id} lifecycle must remain blocked`);
  if (!Array.isArray(e.lifecycle?.blocked_by) || !e.lifecycle.blocked_by.length) errors.push(`dependency concepts: ${id} lifecycle blockers required`);

  const i=(identifiers?.entries||[]).find(x=>x.id===meta.id);
  if (!i) { errors.push(`dependency concepts: missing identifier ${meta.id}`); continue; }
  if (i.status!=='candidate') errors.push(`dependency concepts: ${meta.id} must remain candidate`);
  if (i.represents!==id) errors.push(`dependency concepts: ${meta.id} must represent ${id}`);
  if (i.owning_domain!==meta.owner) errors.push(`dependency concepts: ${meta.id} owner must be ${meta.owner}`);
}

const expectedCommandBlockers=new Map([
  ['InviteIdentity',['candidate-dependency:Invitation','lifecycle-unresolved:Invitation']],
  ['AcceptInvitation',['candidate-dependency:Invitation','lifecycle-unresolved:Invitation']],
  ['ReconcileExternalEffect',['candidate-dependency:ReconciliationRecord','lifecycle-unresolved:ReconciliationRecord']],
  ['RevokeSingleUseToken',[
    'candidate-dependency:SetupToken',
    'candidate-dependency:PasswordResetToken',
    'lifecycle-unresolved:SetupToken',
    'lifecycle-unresolved:PasswordResetToken'
  ]],
]);

for (const [id,blockers] of expectedCommandBlockers) {
  const c=(commands?.entries||[]).find(x=>x.id===id);
  if (!c) { errors.push(`dependency concepts: missing command ${id}`); continue; }
  if (c.status!=='candidate') errors.push(`dependency concepts: ${id} must remain candidate`);
  if (JSON.stringify(c.promotion_blockers)!==JSON.stringify(blockers)) errors.push(`dependency concepts: ${id} blocker mismatch`);
  if ((c.promotion_blockers||[]).some(x=>x.startsWith('missing-k00:'))) errors.push(`dependency concepts: ${id} still carries stale missing-k00 blocker`);
}

if ((commands?.entries||[]).filter(x=>x.status==='approved').length!==18) errors.push('dependency concepts: approved command count must remain 18');
if ((commands?.entries||[]).filter(x=>x.status==='candidate').length!==4) errors.push('dependency concepts: candidate command count must remain 4');

if (registration) {
  if (registration.version!=='1.0.0') errors.push('dependency registration: version must be 1.0.0');
  if (registration.status!=='recorded') errors.push('dependency registration: status must be recorded');
  if (registration.kernel_version!=='0.11.0') errors.push('dependency registration: kernel_version must be 0.11.0');
  if (registration.ownership_map_version!=='1.5.0') errors.push('dependency registration: ownership_map_version must be 1.5.0');
  if (registration.registered_candidate_entities?.length!==4) errors.push('dependency registration: expected 4 entities');
  if (registration.registered_candidate_identifiers?.length!==4) errors.push('dependency registration: expected 4 identifiers');
  if (registration.command_promotions!==0) errors.push('dependency registration: command promotions must be zero');
}

if (errors.length) {
  console.error(`Dependency concept registration FAILED (${errors.length} problem${errors.length===1?'':'s'}):`);
  for (const e of errors) console.error(`- ${e}`);
  process.exit(1);
}
console.log('Dependency concept registration PASS');
console.log('Registered candidate entities: 4');
console.log('Registered candidate identifiers: 4');
console.log('Commands unchanged: 18 approved / 4 candidate');
console.log('Lifecycle closure still required: yes');
