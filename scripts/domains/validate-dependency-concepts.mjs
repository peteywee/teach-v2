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
const lifecycleRegistration=load('domains/dependencies/lifecycle-registration.json');

if (manifest?.version!=='0.12.0') errors.push(`dependency concepts: expected K00 0.12.0, found ${manifest?.version}`);
if (ownership?.version!=='1.6.0' || ownership?.status!=='active') errors.push('dependency concepts: expected active Domain Ownership Map 1.6.0');

const expected=new Map([
  ['Invitation',{id:'InvitationId',owner:'Identity',machine:'InvitationStateMachine'}],
  ['SetupToken',{id:'SetupTokenId',owner:'Identity',machine:'SetupTokenStateMachine'}],
  ['PasswordResetToken',{id:'PasswordResetTokenId',owner:'Identity',machine:'PasswordResetTokenStateMachine'}],
  ['ReconciliationRecord',{id:'ReconciliationRecordId',owner:'TransactionControl',machine:'ReconciliationRecordStateMachine'}],
]);

for (const [id,meta] of expected) {
  const e=(entities?.entries||[]).find(x=>x.id===id);
  if (!e) { errors.push(`dependency concepts: missing entity ${id}`); continue; }
  if (e.status!=='approved') errors.push(`dependency concepts: ${id} must be approved`);
  if (e.owning_domain!==meta.owner) errors.push(`dependency concepts: ${id} owner must be ${meta.owner}`);
  if (e.identifier!==meta.id) errors.push(`dependency concepts: ${id} identifier must be ${meta.id}`);
  if (e.lifecycle?.state!=='approved') errors.push(`dependency concepts: ${id} lifecycle must be approved`);
  if (e.lifecycle?.state_machine!==meta.machine) errors.push(`dependency concepts: ${id} state_machine must be ${meta.machine}`);

  const i=(identifiers?.entries||[]).find(x=>x.id===meta.id);
  if (!i) { errors.push(`dependency concepts: missing identifier ${meta.id}`); continue; }
  if (i.status!=='approved') errors.push(`dependency concepts: ${meta.id} must be approved`);
  if (i.represents!==id) errors.push(`dependency concepts: ${meta.id} must represent ${id}`);
  if (i.owning_domain!==meta.owner) errors.push(`dependency concepts: ${meta.id} owner must be ${meta.owner}`);
}

if ((commands?.entries||[]).length!==23) errors.push(`dependency concepts: expected 23 commands, found ${(commands?.entries||[]).length}`);
if ((commands?.entries||[]).filter(x=>x.status==='approved').length!==23) errors.push('dependency concepts: all 23 commands must be approved');
if ((commands?.entries||[]).filter(x=>x.status==='candidate').length!==0) errors.push('dependency concepts: no candidate commands may remain');

if (registration) {
  if (registration.version!=='1.0.0') errors.push('dependency registration: historical version must be 1.0.0');
  if (registration.status!=='recorded') errors.push('dependency registration: historical status must be recorded');
  if (registration.kernel_version!=='0.11.0') errors.push('dependency registration: historical kernel_version must remain 0.11.0');
  if (registration.ownership_map_version!=='1.5.0') errors.push('dependency registration: historical ownership_map_version must remain 1.5.0');
  if (registration.command_promotions!==0) errors.push('dependency registration: historical command promotions must remain zero');
}
if (lifecycleRegistration) {
  if (lifecycleRegistration.version!=='1.0.0') errors.push('lifecycle registration: version must be 1.0.0');
  if (lifecycleRegistration.status!=='recorded') errors.push('lifecycle registration: status must be recorded');
  if (lifecycleRegistration.kernel_version!=='0.12.0') errors.push('lifecycle registration: kernel_version must be 0.12.0');
  if (lifecycleRegistration.ownership_map_version!=='1.6.0') errors.push('lifecycle registration: ownership_map_version must be 1.6.0');
  if (lifecycleRegistration.approved_entities?.length!==4) errors.push('lifecycle registration: expected 4 approved entities');
  if (lifecycleRegistration.approved_identifiers?.length!==4) errors.push('lifecycle registration: expected 4 approved identifiers');
  if (lifecycleRegistration.remaining_candidate_commands!==0) errors.push('lifecycle registration: no candidate commands may remain');
}

if (errors.length) {
  console.error(`Dependency concept registration FAILED (${errors.length} problem${errors.length===1?'':'s'}):`);
  for (const e of errors) console.error(`- ${e}`);
  process.exit(1);
}
console.log('Dependency concept lifecycle closure PASS');
console.log('Dependency entities: 4 approved');
console.log('Dependency identifiers: 4 approved');
console.log('Commands: 23 approved / 0 candidate');
