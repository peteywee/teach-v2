#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { resolve, join } from 'node:path';

const ROOT=resolve(process.cwd());
const errors=[];
const load=(p)=>{try{return JSON.parse(readFileSync(join(ROOT,p),'utf8'));}catch(e){errors.push(`${p}: ${e.message}`);return null;}};
const text=(p)=>{try{return readFileSync(join(ROOT,p),'utf8');}catch(e){errors.push(`${p}: ${e.message}`);return '';}};

const r=load('persistence/physical-slices/readiness.json');
const m=load('kernel/manifest.json');
const reg=load('persistence/semantic-closure/registration.json');
const p01Admission=load('persistence/physical-slices/transaction-control/admission.json');
const p01Plan=load('persistence/physical-slices/transaction-control/admission-evidence-plan.json');
const p01Implementation=load('persistence/physical-slices/transaction-control/implementation.json');
const p04Implementation=load('persistence/physical-slices/identity-credentials/implementation.json');
const p05Admission=load('persistence/physical-slices/learning-session/admission.json');
const p05Plan=load('persistence/physical-slices/learning-session/admission-evidence-plan.json');
const learningBoundary=text('src/modules/learning/README.md');

if(m?.version!=='0.16.0') errors.push(`slice readiness: expected K00 0.16.0, found ${m?.version}`);
if(reg?.version!=='1.0.0' || reg?.status!=='recorded') errors.push('slice readiness: semantic closure registration missing');

if(r){
  if(r.readiness_id!=='TEACH-FIRST-PHYSICAL-SLICE-READINESS' || r.version!=='1.2.0' || r.status!=='recorded') errors.push('slice readiness: identity/state mismatch');

  const admissions=r.current_physical_slice_admissions||[];
  const admittedIds=admissions.map(x=>x.id).sort();
  const expectedIds=['SLICE-P01','SLICE-P02','SLICE-P03','SLICE-P04'];
  if(r.current_admitted_slice_count!==4 || JSON.stringify(admittedIds)!==JSON.stringify(expectedIds)) errors.push('slice readiness: exactly P01-P04 must be currently admitted; P05 must remain blocked');

  for(const id of expectedIds){
    const x=admissions.find(a=>a.id===id);
    if(!x || !['PROVEN','IMPLEMENTED'].includes(x.implementation_state)) errors.push(`slice readiness: ${id} must preserve implemented/proven evidence`);
  }
  if(admissions.some(x=>x.id==='SLICE-P05')) errors.push('slice readiness: blocked P05 must not appear in current admitted slices');

  const p04=(r.candidate_slices||[]).find(x=>x.id==='SLICE-P04');
  if(!p04 || p04.name!=='Credential persistence' || p04.owning_module!=='Identity' || JSON.stringify(p04.records)!==JSON.stringify(['Credential']) || p04.current_state!=='IMPLEMENTED' || (p04.blockers||[]).length!==0) errors.push('slice readiness: P04 candidate alias must describe implemented Credential persistence');

  const p05=(r.candidate_slices||[]).find(x=>x.id==='SLICE-P05');
  if(!p05 || p05.name!=='LearningSession persistence' || p05.owning_module!=='Learning' || JSON.stringify(p05.records)!==JSON.stringify(['LearningSession']) || p05.current_state!=='BLOCKED' || p05.implementation_authorized!==false || p05.migration_authoring_authorized!==false || !(p05.blockers||[]).some(x=>x.includes('#47'))) errors.push('slice readiness: P05 must be BLOCKED on owner decision #47');

  if(r.narrowed_next_lane?.preferred_slice!=='SLICE-P05' || r.narrowed_next_lane?.physical_implementation_authorized!==false || !(r.narrowed_next_lane?.owner_decisions_required||[]).some(x=>x.includes('#47')) || r.narrowed_next_lane?.next_required_gate!=='Resolve #47, register the decision, and rerun SLICE-P05 schema admission') errors.push('slice readiness: next lane must be blocked P05 owner-decision rerun');

  if(r.evidence_states?.slice_p04_implementation!=='PROVEN' || r.evidence_states?.slice_p05_schema_admission!=='BLOCKED' || r.evidence_states?.slice_p05_relationship_nullability!=='UNKNOWN' || r.evidence_states?.slice_p05_module_foundation!=='PROVEN' || r.evidence_states?.slice_p05_implementation!=='BLOCKED') errors.push('slice readiness: P04/P05 evidence states are inconsistent');

  if(p01Admission?.version!=='2.0.0' || p01Admission?.decision!=='ADMIT' || p01Admission?.shared_or_production_migration_execution_authorized!==false) errors.push('slice readiness: P01 admission evidence missing');
  if(p01Plan?.version!=='1.0.0' || p01Plan?.physical_schema_authorized!==false) errors.push('slice readiness: P01 evidence plan missing');
  if(p01Implementation?.version!=='1.0.0' || p01Implementation?.status!=='recorded') errors.push('slice readiness: P01 implementation evidence missing');
  if(p04Implementation?.version!=='1.0.0' || p04Implementation?.status!=='proven') errors.push('slice readiness: P04 Credential implementation evidence missing');

  if(p05Admission?.version!=='1.1.0' || p05Admission?.decision!=='BLOCK' || p05Admission?.physical_schema_authorized!==false || p05Admission?.implementation_authorized!==false || p05Admission?.migration_authoring_authorized!==false) errors.push('slice readiness: P05 fail-closed admission mismatch');
  if(p05Plan?.version!=='1.1.0' || p05Plan?.physical_schema_authorized!==false || !(p05Plan?.required_evidence||[]).some(x=>x.includes('UNKNOWN'))) errors.push('slice readiness: P05 evidence plan must preserve UNKNOWN Assignment-reference shape');
  if(!learningBoundary.includes('Foundation only') || !learningBoundary.includes('SLICE-P05 physical persistence is BLOCKED')) errors.push('slice readiness: Learning source-module foundation missing or over-authorizing');

  if(r.implementation_guard?.shared_or_production_migration_execution_authorized!==false || r.implementation_guard?.full_relational_schema_authorized!==false) errors.push('slice readiness: production/full-schema execution must remain blocked');
}

if(errors.length){
  console.error(`Post-closure physical slice readiness FAILED (${errors.length} problem${errors.length===1?'':'s'}):`);
  for(const e of errors) console.error(`- ${e}`);
  process.exit(1);
}

console.log('Post-closure physical slice readiness PASS');
console.log('K00: 0.16.0');
console.log('Implemented/admitted slices: P01-P04');
console.log('P04 Credential implementation: PROVEN');
console.log('P05 LearningSession admission: BLOCKED');
console.log('P05 Assignment-reference nullability/requiredness: UNKNOWN pending #47');
console.log('P05 physical implementation/migration authoring: NOT AUTHORIZED');
console.log('Shared/production migration execution: BLOCKED');
