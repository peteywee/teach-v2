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
const p04Implementation=load('persistence/physical-slices/identity-credentials/implementation.json');
const p05Registration=load('persistence/physical-slices/learning-session/registration.json');
const p05Admission=load('persistence/physical-slices/learning-session/admission.json');
const p05Plan=load('persistence/physical-slices/learning-session/admission-evidence-plan.json');
const learningBoundary=text('src/modules/learning/README.md');

if(m?.version!=='0.16.0') errors.push(`slice readiness: expected K00 0.16.0, found ${m?.version}`);
if(reg?.version!=='1.0.0' || reg?.status!=='recorded') errors.push('slice readiness: semantic closure registration missing');

if(r){
  if(r.readiness_id!=='TEACH-FIRST-PHYSICAL-SLICE-READINESS' || r.version!=='1.2.0' || r.status!=='recorded') errors.push('slice readiness: identity/state mismatch');

  const admissions=r.current_physical_slice_admissions||[];
  const admittedIds=admissions.map(x=>x.id).sort();
  const expectedIds=['SLICE-P01','SLICE-P02','SLICE-P03','SLICE-P04','SLICE-P05'];
  if(r.current_admitted_slice_count!==5 || JSON.stringify(admittedIds)!==JSON.stringify(expectedIds)) errors.push('slice readiness: exactly P01-P05 must be admitted');

  for(const id of ['SLICE-P01','SLICE-P02','SLICE-P03','SLICE-P04']){
    const x=admissions.find(a=>a.id===id);
    if(!x || !['PROVEN','IMPLEMENTED'].includes(x.implementation_state)) errors.push(`slice readiness: ${id} must preserve implemented/proven evidence`);
  }
  const p05AdmissionState=admissions.find(x=>x.id==='SLICE-P05');
  if(!p05AdmissionState || !['ADMITTED','IMPLEMENTED','PROVEN'].includes(p05AdmissionState.implementation_state)) errors.push('slice readiness: P05 admission/implementation state invalid');

  const p04=(r.candidate_slices||[]).find(x=>x.id==='SLICE-P04');
  if(!p04 || p04.name!=='Credential persistence' || p04.current_state!=='IMPLEMENTED' || (p04.blockers||[]).length!==0) errors.push('slice readiness: P04 Credential evidence mismatch');

  const p05=(r.candidate_slices||[]).find(x=>x.id==='SLICE-P05');
  if(!p05 || p05.name!=='LearningSession persistence' || p05.owning_module!=='Learning' || JSON.stringify(p05.records)!==JSON.stringify(['LearningSession']) || !['ADMITTED','IMPLEMENTED'].includes(p05.current_state) || p05.implementation_authorized!==true || p05.migration_authoring_authorized!==true || (p05.blockers||[]).length!==0) errors.push('slice readiness: P05 must be admitted/implemented with no blockers');

  if(r.narrowed_next_lane?.preferred_slice!=='SLICE-P05' || r.narrowed_next_lane?.physical_implementation_authorized!==true || (r.narrowed_next_lane?.owner_decisions_required||[]).length!==0) errors.push('slice readiness: P05 implementation must be next authorized lane');

  if(p04Implementation?.version!=='1.1.0' || p04Implementation?.status!=='proven') errors.push('slice readiness: P04 Credential implementation evidence missing');
  if(p05Registration?.version!=='1.0.0' || p05Registration?.decisions?.[0]?.selection!=='REQUIRED_ONE_ASSIGNMENT') errors.push('slice readiness: P05 owner decision evidence missing');
  if(p05Admission?.version!=='1.2.0' || p05Admission?.decision!=='ADMIT' || p05Admission?.physical_schema_authorized!==true || p05Admission?.implementation_authorized!==true || p05Admission?.migration_authoring_authorized!==true) errors.push('slice readiness: P05 admission mismatch');
  if(p05Plan?.version!=='1.2.0' || p05Plan?.physical_schema_authorized!==false || !(p05Plan?.required_evidence||[]).some(x=>x.includes('REQUIRED_ONE_ASSIGNMENT'))) errors.push('slice readiness: P05 evidence plan mismatch');
  if(!learningBoundary.includes('SLICE-P05 physical persistence is ADMITTED')) errors.push('slice readiness: Learning source-module boundary missing admitted state');

  if(r.evidence_states?.slice_p05_owner_decision!=='PROVEN' || r.evidence_states?.slice_p05_schema_admission!=='PROVEN' || r.evidence_states?.slice_p05_relationship_nullability!=='PROVEN') errors.push('slice readiness: P05 evidence-state transition mismatch');
  if(r.implementation_guard?.tables_generated!==7 || r.implementation_guard?.migrations_generated!==4 || r.implementation_guard?.repositories_generated!==7 || r.implementation_guard?.implemented_slice_count!==4) errors.push('slice readiness: admission must not invent P05 implementation artifacts');
  if(r.implementation_guard?.shared_or_production_migration_execution_authorized!==false || r.implementation_guard?.full_relational_schema_authorized!==false) errors.push('slice readiness: production/full-schema execution must remain blocked');
}

if(errors.length){
  console.error(`Post-closure physical slice readiness FAILED (${errors.length} problem${errors.length===1?'':'s'}):`);
  for(const e of errors) console.error(`- ${e}`);
  process.exit(1);
}

console.log('Post-closure physical slice readiness PASS');
console.log('K00: 0.16.0');
console.log('Implemented slices: P01-P04');
console.log('P05 LearningSession schema admission: ADMIT / PROVEN');
console.log('P05 Assignment reference: REQUIRED / NON-NULL');
console.log('P05 physical implementation/migration authoring: AUTHORIZED');
console.log('Implemented artifact totals remain 7/4/7/4 until P05 implementation proves otherwise');
console.log('Shared/production migration execution: BLOCKED');
