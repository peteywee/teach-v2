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
const entities=load('kernel/entities.json');
const commands=load('kernel/commands.json');
const states=load('kernel/states.json');
const machines=load('kernel/state-machines.json');

if (manifest?.version!=='0.11.0') errors.push(`dependency lifecycle discovery: expected K00 0.11.0, found ${manifest?.version}`);
if (ownership?.version!=='1.5.0' || ownership?.status!=='active') errors.push('dependency lifecycle discovery: expected active Domain Ownership Map 1.5.0');

if (proposal) {
  if (proposal.version!=='0.1.0' || proposal.status!=='proposed') errors.push('dependency lifecycle discovery: proposal must remain proposed 0.1.0');
  if (proposal.rules?.command_promotion_in_this_stage!==false) errors.push('dependency lifecycle discovery: command promotion must be false');
  if (proposal.decision_groups?.length!==3) errors.push('dependency lifecycle discovery: expected 3 decision groups');
  if (proposal.command_readiness?.length!==4) errors.push('dependency lifecycle discovery: expected 4 blocked commands');
  for (const d of proposal.decision_groups||[]) if (d.evidence_state!=='BLOCKED') errors.push(`dependency lifecycle discovery: ${d.id} must remain BLOCKED`);
  for (const c of proposal.command_readiness||[]) if (c.state!=='BLOCKED') errors.push(`dependency lifecycle discovery: ${c.id} must remain BLOCKED`);
}

for (const id of ['Invitation','SetupToken','PasswordResetToken','ReconciliationRecord']) {
  const e=(entities?.entries||[]).find(x=>x.id===id);
  if (!e) { errors.push(`dependency lifecycle discovery: missing entity ${id}`); continue; }
  if (e.status!=='candidate') errors.push(`dependency lifecycle discovery: ${id} must remain candidate`);
  if (e.lifecycle?.state!=='blocked') errors.push(`dependency lifecycle discovery: ${id} lifecycle must remain blocked`);
}

for (const id of ['InviteIdentity','AcceptInvitation','RevokeSingleUseToken','ReconcileExternalEffect']) {
  const c=(commands?.entries||[]).find(x=>x.id===id);
  if (!c) { errors.push(`dependency lifecycle discovery: missing command ${id}`); continue; }
  if (c.status!=='candidate') errors.push(`dependency lifecycle discovery: ${id} must remain candidate`);
}

if ((states?.entries||[]).length!==5) errors.push(`dependency lifecycle discovery: expected no new state set; found ${(states?.entries||[]).length}`);
if ((machines?.entries||[]).length!==4) errors.push(`dependency lifecycle discovery: expected no new state machine; found ${(machines?.entries||[]).length}`);

if (errors.length) {
  console.error(`Dependency lifecycle discovery FAILED (${errors.length} problem${errors.length===1?'':'s'}):`);
  for (const e of errors) console.error(`- ${e}`);
  process.exit(1);
}
console.log('Dependency lifecycle discovery PASS');
console.log('Decision groups: 3 BLOCKED');
console.log('Commands awaiting lifecycle closure: 4');
console.log('K00 mutation in discovery stage: no');
