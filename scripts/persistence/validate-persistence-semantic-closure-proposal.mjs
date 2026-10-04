#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { resolve, join } from 'node:path';

const ROOT=resolve(process.cwd());
const errors=[];
const load=(p)=>{try{return JSON.parse(readFileSync(join(ROOT,p),'utf8'));}catch(e){errors.push(`${p}: ${e.message}`);return null;}};

const p=load('persistence/semantic-closure/proposed.json');
const reg=load('persistence/semantic-closure/registration.json');
const m=load('kernel/manifest.json');

if (p) {
  if (p.proposal_id!=='TEACH-PERSISTENCE-SEMANTIC-CLOSURE-PROPOSAL' || p.version!=='0.1.0' || p.status!=='proposed') errors.push('semantic closure proposal: historical identity/state mismatch');
  if (p.baseline?.kernel_version!=='0.13.0') errors.push('semantic closure proposal: historical baseline must remain 0.13.0');
  if (p.target_revision?.kernel_version!=='0.14.0') errors.push('semantic closure proposal: target must remain 0.14.0');
  if (p.promotion_counts?.total!==24) errors.push('semantic closure proposal: expected 24 proposed promotions');
  if ((p.explicitly_not_promoted||[]).length!==10) errors.push('semantic closure proposal: expected 10 explicit exclusions');
}
if (m?.version!=='0.14.0') errors.push(`semantic closure proposal: current K00 must be 0.14.0, found ${m?.version}`);
if (reg?.status!=='recorded' || reg?.kernel_to!=='0.14.0') errors.push('semantic closure proposal: registration evidence missing');

if (errors.length) {
  console.error(`Persistence semantic closure proposal FAILED (${errors.length} problem${errors.length===1?'':'s'}):`);
  for (const e of errors) console.error(`- ${e}`);
  process.exit(1);
}
console.log('Persistence semantic closure proposal PASS');
console.log('Historical proposal preserved; owner-approved registration is K00 0.14.0');
