#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { resolve, join } from 'node:path';

const ROOT=resolve(process.cwd());
const errors=[];
const load=(p)=>{ try{return JSON.parse(readFileSync(join(ROOT,p),'utf8'));}catch(e){errors.push(`${p}: ${e.message}`);return null;} };
const d=load('persistence/semantic-closure/discovery.json');
const m=load('kernel/manifest.json');
const per=load('persistence/authority.json');
const ids=load('kernel/identifiers.json');
const states=load('kernel/states.json');
const machines=load('kernel/state-machines.json');
const rel=load('kernel/relationships.json');

if (m?.version!=='0.13.0') errors.push(`semantic closure: expected K00 0.13.0, found ${m?.version}`);
if (per?.version!=='1.0.0' || per?.status!=='active') errors.push('semantic closure: active Persistence Model 1.0.0 required');

if (d) {
  if (d.discovery_id!=='TEACH-PERSISTENCE-SEMANTIC-CLOSURE-DISCOVERY' || d.version!=='0.1.0' || d.status!=='recorded') errors.push('semantic closure: discovery identity/state mismatch');
  const ready=d.ready_for_owner_promotion||{};
  if ((ready.identifiers||[]).length!==8) errors.push(`semantic closure: expected 8 ready identifiers, found ${(ready.identifiers||[]).length}`);
  if ((ready.state_sets_and_machines||[]).length!==3) errors.push(`semantic closure: expected 3 ready state/machine pairs, found ${(ready.state_sets_and_machines||[]).length}`);
  if ((ready.relationships||[]).filter(x=>x.state==='READY_FOR_OWNER_PROMOTION').length!==10) errors.push('semantic closure: expected 10 ready relationships');
  if (d.proposed_revision_if_approved?.total_candidate_to_approved_promotions!==24) errors.push('semantic closure: expected 24 total proposed promotions');
  if (d.proposed_revision_if_approved?.k00_target_version!=='0.14.0') errors.push('semantic closure: target K00 must be 0.14.0');
  if ((d.stale_blocker_rediscovery||[]).length!==2) errors.push('semantic closure: expected 2 stale-blocker rediscoveries');
  if (d.readiness?.semantic_closure_owner_approval!=='BLOCKED') errors.push('semantic closure: owner approval must remain BLOCKED');
}

for (const id of ['IdentityId','OrganizationId','ApplicationSessionId','ContentPackId','LearningSessionId','CertificationId','IdempotencyKey','RequestId']) {
  const x=(ids?.entries||[]).find(v=>v.id===id);
  if (x?.status!=='candidate') errors.push(`semantic closure: ${id} must remain candidate in discovery stage`);
}
for (const id of ['IdentityStatus','ApplicationSessionStatus','LearningSessionStatus']) {
  const x=(states?.entries||[]).find(v=>v.id===id);
  if (x?.status!=='candidate') errors.push(`semantic closure: ${id} must remain candidate in discovery stage`);
}
for (const id of ['IdentityStateMachine','ApplicationSessionStateMachine','LearningSessionStateMachine']) {
  const x=(machines?.entries||[]).find(v=>v.id===id);
  if (x?.status!=='candidate') errors.push(`semantic closure: ${id} must remain candidate in discovery stage`);
}
if ((rel?.entries||[]).filter(x=>x.status==='approved').length!==0) errors.push('semantic closure: no relationship may be promoted by discovery');

if (errors.length) {
  console.error(`Persistence semantic closure discovery FAILED (${errors.length} problem${errors.length===1?'':'s'}):`);
  for (const e of errors) console.error(`- ${e}`);
  process.exit(1);
}
console.log('Persistence semantic closure discovery PASS');
console.log('Ready for owner promotion: 8 identifiers + 3 state sets + 3 state machines + 10 relationships = 24 entries');
console.log('K00 target if approved: 0.14.0');
console.log('Owner approval: BLOCKED');
console.log('Physical schema: BLOCKED');
