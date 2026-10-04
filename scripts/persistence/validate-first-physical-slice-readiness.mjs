#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
const ROOT=resolve(process.cwd());
const errors=[];
const load=(p)=>{try{return JSON.parse(readFileSync(join(ROOT,p),'utf8'));}catch(e){errors.push(`${p}: ${e.message}`);return null;}};
const r=load('persistence/physical-slices/readiness.json');
const m=load('kernel/manifest.json');
const reg=load('persistence/semantic-closure/registration.json');

if (m?.version!=='0.14.0') errors.push(`slice readiness: expected K00 0.14.0, found ${m?.version}`);
if (reg?.version!=='1.0.0' || reg?.status!=='recorded') errors.push('slice readiness: semantic closure registration missing');
if (r) {
  if (r.readiness_id!=='TEACH-FIRST-PHYSICAL-SLICE-READINESS' || r.version!=='0.3.0' || r.status!=='recorded') errors.push('slice readiness: identity/state mismatch');
  if (r.current_admitted_slice_count!==0 || (r.current_physical_slice_admissions||[]).length!==0) errors.push('slice readiness: no physical slice may be admitted');
  if ((r.candidate_slices||[]).length!==5) errors.push('slice readiness: expected 5 candidate slices');
  if ((r.candidate_slices||[]).some(x=>x.current_state!=='BLOCKED')) errors.push('slice readiness: every slice must remain BLOCKED');
  if (r.narrowed_next_lane?.preferred_slice!=='SLICE-P01') errors.push('slice readiness: next lane must be SLICE-P01');
  if ((r.narrowed_next_lane?.owner_decisions_required||[]).length!==0) errors.push('slice readiness: TransactionControl owner decisions must be closed');
  if (r.narrowed_next_lane?.next_required_gate!=='Register ReconciliationRecordUsesIdempotencyKey as relationship authority') errors.push('slice readiness: relationship registration must be next gate');
  if (r.implementation_guard?.tables_generated!==0 || r.implementation_guard?.migrations_generated!==0 || r.implementation_guard?.repositories_generated!==0 || r.implementation_guard?.physical_schema_authorized!==false) errors.push('slice readiness: implementation guard violated');
}
if (errors.length) {
  console.error(`Post-closure physical slice readiness FAILED (${errors.length} problem${errors.length===1?'':'s'}):`);
  for (const e of errors) console.error(`- ${e}`);
  process.exit(1);
}
console.log('Post-closure physical slice readiness PASS');
console.log('K00: 0.14.0');
console.log('Physical slices admitted: 0');
console.log('Preferred next lane: SLICE-P01 TransactionControl');
console.log('Owner decisions remaining for SLICE-P01: 0');
console.log('Next gate: ReconciliationRecordUsesIdempotencyKey relationship registration');
