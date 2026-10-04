#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { resolve, join } from 'node:path';

const ROOT=resolve(process.cwd());
const errors=[];
const load=(p)=>{ try{return JSON.parse(readFileSync(join(ROOT,p),'utf8'));}catch(e){errors.push(`${p}: ${e.message}`);return null;} };

const r=load('persistence/physical-slices/readiness.json');
const m=load('kernel/manifest.json');
const p=load('persistence/authority.json');
const c=load('persistence/semantic-closure/proposed.json');

if (m?.version!=='0.14.0') errors.push(`slice readiness: expected K00 0.14.0, found ${m?.version}`);
if (p?.version!=='1.0.0' || p?.status!=='active') errors.push('slice readiness: active Persistence Model 1.0.0 required');
if (c?.version!=='0.1.0' || c?.status!=='proposed') errors.push('slice readiness: semantic closure proposal required');

if (r) {
  if (r.readiness_id!=='TEACH-FIRST-PHYSICAL-SLICE-READINESS' || r.version!=='0.1.0' || r.status!=='recorded') errors.push('slice readiness: identity/state mismatch');
  if (r.current_admitted_slice_count!==0 || (r.current_physical_slice_admissions||[]).length!==0) errors.push('slice readiness: no current physical slice may be admitted');
  if ((r.candidate_slices||[]).length!==5) errors.push('slice readiness: expected 5 candidate slice groups');
  if ((r.candidate_slices||[]).some(x=>x.current_state!=='BLOCKED')) errors.push('slice readiness: every candidate slice must remain BLOCKED');
  if (r.after_recommended_semantic_closure?.admitted_slice_count!==0) errors.push('slice readiness: semantic closure alone must not admit a physical slice');
  if (r.implementation_guard?.tables_generated!==0 || r.implementation_guard?.migrations_generated!==0 || r.implementation_guard?.repositories_generated!==0 || r.implementation_guard?.physical_schema_authorized!==false) errors.push('slice readiness: implementation guard violated');
  if (r.evidence_states?.physical_slice_readiness!=='BLOCKED') errors.push('slice readiness: evidence state must be BLOCKED');
}

if (errors.length) {
  console.error(`First physical slice readiness FAILED (${errors.length} problem${errors.length===1?'':'s'}):`);
  for (const e of errors) console.error(`- ${e}`);
  process.exit(1);
}
console.log('First physical persistence slice readiness PASS');
console.log('Physical slices admitted now: 0');
console.log('Physical slices admitted by semantic closure alone: 0');
console.log('Tables/migrations/repositories generated: 0');
console.log('Next owner gate: K00 0.14.0 persistence semantic closure');
