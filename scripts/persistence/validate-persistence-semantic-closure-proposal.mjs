#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { resolve, join } from 'node:path';

const ROOT=resolve(process.cwd());
const errors=[];
const load=(p)=>{ try{return JSON.parse(readFileSync(join(ROOT,p),'utf8'));}catch(e){errors.push(`${p}: ${e.message}`);return null;} };

const p=load('persistence/semantic-closure/proposed.json');
const d=load('persistence/semantic-closure/discovery.json');
const m=load('kernel/manifest.json');
const ids=load('kernel/identifiers.json');
const states=load('kernel/states.json');
const machines=load('kernel/state-machines.json');
const rel=load('kernel/relationships.json');

if (m?.version!=='0.13.0') errors.push(`semantic closure proposal: expected K00 0.13.0, found ${m?.version}`);
if (d?.version!=='0.1.0' || d?.status!=='recorded') errors.push('semantic closure proposal: discovery required');

if (p) {
  if (p.proposal_id!=='TEACH-PERSISTENCE-SEMANTIC-CLOSURE-PROPOSAL' || p.version!=='0.1.0' || p.status!=='proposed') errors.push('semantic closure proposal: identity/state mismatch');
  if (p.approval_required!==true) errors.push('semantic closure proposal: approval_required must be true');
  if (p.target_revision?.kernel_version!=='0.14.0') errors.push('semantic closure proposal: target K00 must be 0.14.0');
  if (p.promotion_counts?.identifiers!==8 || p.promotion_counts?.state_sets!==3 || p.promotion_counts?.state_machines!==3 || p.promotion_counts?.relationships!==10 || p.promotion_counts?.total!==24) errors.push('semantic closure proposal: promotion counts drifted');
  if ((p.explicitly_not_promoted||[]).length!==10) errors.push('semantic closure proposal: expected 10 explicit exclusions');
  if (p.readiness?.owner_approval!=='BLOCKED' || p.readiness?.registration!=='BLOCKED until explicit token') errors.push('semantic closure proposal: approval boundary drifted');
}

for (const x of p?.promote?.identifiers||[]) {
  if ((ids?.entries||[]).find(v=>v.id===x.id)?.status!=='candidate') errors.push(`semantic closure proposal: ${x.id} must still be candidate`);
}
for (const x of p?.promote?.state_sets||[]) {
  if ((states?.entries||[]).find(v=>v.id===x.id)?.status!=='candidate') errors.push(`semantic closure proposal: ${x.id} must still be candidate`);
}
for (const x of p?.promote?.state_machines||[]) {
  if ((machines?.entries||[]).find(v=>v.id===x.id)?.status!=='candidate') errors.push(`semantic closure proposal: ${x.id} must still be candidate`);
}
for (const x of p?.promote?.relationships||[]) {
  if ((rel?.entries||[]).find(v=>v.id===x.id)?.status!=='candidate') errors.push(`semantic closure proposal: ${x.id} must still be candidate`);
}

if (errors.length) {
  console.error(`Persistence semantic closure proposal FAILED (${errors.length} problem${errors.length===1?'':'s'}):`);
  for (const e of errors) console.error(`- ${e}`);
  process.exit(1);
}
console.log('Persistence semantic closure proposal PASS');
console.log('Proposed promotions: 24');
console.log('Target K00: 0.14.0');
console.log('Owner approval: BLOCKED');
console.log('K00 mutation in this stage: none');
