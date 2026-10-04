#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { resolve, join } from 'node:path';

const ROOT=resolve(process.cwd());
const errors=[];
const load=(p)=>{try{return JSON.parse(readFileSync(join(ROOT,p),'utf8'));}catch(e){errors.push(`${p}: ${e.message}`);return null;}};

const d=load('persistence/semantic-closure/discovery.json');
const reg=load('persistence/semantic-closure/registration.json');
const m=load('kernel/manifest.json');

if (d) {
  if (d.discovery_id!=='TEACH-PERSISTENCE-SEMANTIC-CLOSURE-DISCOVERY' || d.version!=='0.1.0' || d.status!=='recorded') errors.push('semantic closure discovery: identity/state mismatch');
  if (d.baseline?.kernel_version!=='0.13.0') errors.push('semantic closure discovery: historical K00 baseline must remain 0.13.0');
  const ready=d.ready_for_owner_promotion||{};
  if ((ready.identifiers||[]).length!==8) errors.push('semantic closure discovery: expected 8 historical ready identifiers');
  if ((ready.state_sets_and_machines||[]).length!==3) errors.push('semantic closure discovery: expected 3 historical state/machine pairs');
  if ((ready.relationships||[]).filter(x=>x.state==='READY_FOR_OWNER_PROMOTION').length!==10) errors.push('semantic closure discovery: expected 10 historical ready relationships');
  if (d.proposed_revision_if_approved?.total_candidate_to_approved_promotions!==24) errors.push('semantic closure discovery: expected 24 historical proposed promotions');
  if (d.proposed_revision_if_approved?.k00_target_version!=='0.14.0') errors.push('semantic closure discovery: target must remain 0.14.0');
}
if (m?.version!=='0.14.0') errors.push(`semantic closure discovery: current K00 must be 0.14.0, found ${m?.version}`);
if (reg) {
  if (reg.kernel_to!=='0.14.0' || reg.promotion_counts?.total!==24) errors.push('semantic closure discovery: current registration mismatch');
}

if (errors.length) {
  console.error(`Persistence semantic closure discovery FAILED (${errors.length} problem${errors.length===1?'':'s'}):`);
  for (const e of errors) console.error(`- ${e}`);
  process.exit(1);
}
console.log('Persistence semantic closure discovery PASS');
console.log('Historical discovery preserved at K00 0.13.0');
console.log('Current registration: K00 0.14.0 / 24 promotions');
