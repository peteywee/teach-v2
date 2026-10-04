#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT=resolve(process.cwd());
const errors=[];
const load=(p)=>{try{return JSON.parse(readFileSync(join(ROOT,p),'utf8'));}catch(e){errors.push(`${p}: ${e.message}`);return null;}};
const text=(p)=>{try{return readFileSync(join(ROOT,p),'utf8');}catch(e){errors.push(`${p}: ${e.message}`);return '';}};
const find=(doc,id)=>(doc?.entries||[]).find(x=>x.id===id);

const authority=load('persistence/authority.json');
const registration=load('persistence/physical-slices/learning-session/registration.json');
const admission=load('persistence/physical-slices/learning-session/admission.json');
const plan=load('persistence/physical-slices/learning-session/admission-evidence-plan.json');
const readiness=load('persistence/physical-slices/readiness.json');
const manifest=load('kernel/manifest.json');
const entities=load('kernel/entities.json');
const ids=load('kernel/identifiers.json');
const states=load('kernel/states.json');
const machines=load('kernel/state-machines.json');
const relationships=load('kernel/relationships.json');
const ownership=load('domains/ownership-map.json');
const architecture=load('architecture/authority.json');
const c32=text('contracts/c32-learning-sessions-progress-contract.md');
const learningBoundary=text('src/modules/learning/README.md');

if(authority?.version!=='1.0.0' || authority?.status!=='active') errors.push('SLICE-P05 admission: active Persistence Model 1.0.0 required');
if(manifest?.version!=='0.16.0') errors.push('SLICE-P05 admission: K00 0.16.0 required');
if(ownership?.version!=='1.7.0' || ownership?.status!=='active') errors.push('SLICE-P05 admission: Domain Ownership Map 1.7.0 required');
if(architecture?.version!=='1.0.0' || architecture?.status!=='active' || !(architecture?.topology?.runtime_domain_modules||[]).includes('Learning')) errors.push('SLICE-P05 admission: Architecture 1.0.0 Learning runtime module authority required');

if(registration?.registration_id!=='TEACH-SLICE-P05-OWNER-DECISION-REGISTRATION' || registration?.version!=='1.0.0' || registration?.status!=='recorded' || registration?.issue!=='#47') errors.push('SLICE-P05 admission: owner decision registration missing');
const d=(registration?.decisions||[]).find(x=>x.id==='P05-D01');
if(!d || d.selection!=='REQUIRED_ONE_ASSIGNMENT' || d.physical_reference_required!==true || d.physical_reference_nullable!==false) errors.push('SLICE-P05 admission: exact REQUIRED_ONE_ASSIGNMENT owner decision required');

if(admission?.admission_id!=='TEACH-SLICE-P05-PHYSICAL-SCHEMA-ADMISSION' || admission?.version!=='1.2.0' || admission?.status!=='recorded' || admission?.issue!=='#47') errors.push('SLICE-P05 admission: admission identity/state mismatch');
if(admission?.semantic_baseline_commit!=='971b77faad88c4be5119324b5c324b56d0a78055') errors.push('SLICE-P05 admission: exact pre-decision main baseline required');
if(plan?.plan_id!=='TEACH-SLICE-P05-ADMISSION-EVIDENCE-PLAN' || plan?.version!=='1.2.0' || plan?.status!=='recorded' || plan?.issue!=='#47' || plan?.physical_schema_authorized!==false) errors.push('SLICE-P05 admission: evidence plan missing or over-authorizing');

if(find(entities,'LearningSession')?.status!=='approved') errors.push('SLICE-P05 admission: LearningSession must be approved');
if(find(ids,'LearningSessionId')?.status!=='approved') errors.push('SLICE-P05 admission: LearningSessionId must be approved');
if(find(states,'LearningSessionStatus')?.status!=='approved') errors.push('SLICE-P05 admission: LearningSessionStatus must be approved');
if(find(machines,'LearningSessionStateMachine')?.status!=='approved') errors.push('SLICE-P05 admission: LearningSessionStateMachine must be approved');

const expectedRelationships=new Map([
  ['IdentityHasLearningSession','one-to-many'],
  ['LearningSessionUsesAssignment','many-to-one'],
]);
for(const [id,cardinality] of expectedRelationships){
  const r=find(relationships,id);
  if(!r || r.status!=='approved' || r.cardinality!==cardinality || r.owning_domain!=='Learning') errors.push(`SLICE-P05 admission: ${id} must be approved Learning-owned ${cardinality}`);
  const o=(ownership?.entries||[]).find(x=>x.kind==='relationship'&&x.id===id);
  if(!o || o.decision_state!=='approved' || o.proposed_owner!=='Learning') errors.push(`SLICE-P05 admission: ${id} ownership-map authority missing`);
}

for(const req of ['LRN-1','LRN-2','LRN-3']) if(!c32.includes(`**${req}**`)) errors.push(`SLICE-P05 admission: C32 missing ${req}`);
if(!learningBoundary.includes('SLICE-P05 physical persistence is ADMITTED')) errors.push('SLICE-P05 admission: Learning source-module boundary must record ADMITTED state');

const evidence=(plan?.required_evidence||[]).join('\n');
if(!evidence.includes('REQUIRED_ONE_ASSIGNMENT') || !evidence.includes('non-null physical Assignment reference') || evidence.includes('UNKNOWN') || evidence.includes('many-to-one, nullable')) errors.push('SLICE-P05 admission: evidence plan must encode required/non-null Assignment reference without UNKNOWN/nullability drift');

const criteria=admission?.criteria||[];
if(criteria.length!==8 || criteria.some(x=>x.state!=='PROVEN')) errors.push('SLICE-P05 admission: all eight Persistence Model criteria must be PROVEN');
if((admission?.blockers||[]).length!==0) errors.push('SLICE-P05 admission: blockers must be empty');
if(admission?.decision!=='ADMIT' || admission?.physical_schema_authorized!==true || admission?.implementation_authorized!==true || admission?.migration_authoring_authorized!==true) errors.push('SLICE-P05 admission: ADMIT authorization mismatch');
if(admission?.shared_or_production_migration_execution_authorized!==false || admission?.full_relational_schema_authorized!==false) errors.push('SLICE-P05 admission: production/full-schema authority must remain blocked');

const admissions=readiness?.current_physical_slice_admissions||[];
const p05Admission=admissions.find(x=>x.id==='SLICE-P05');
if(readiness?.version!=='1.2.0' || readiness?.current_admitted_slice_count!==5 || !p05Admission || p05Admission.status!=='ADMITTED' || p05Admission.implementation_authorized!==true) errors.push('SLICE-P05 admission: readiness must contain admitted P05');
const p05=readiness?.candidate_slices?.find(x=>x.id==='SLICE-P05');
if(!p05 || p05.current_state!=='ADMITTED' || p05.implementation_authorized!==true || p05.migration_authoring_authorized!==true || (p05.blockers||[]).length!==0) errors.push('SLICE-P05 admission: P05 readiness state mismatch');
if(readiness?.narrowed_next_lane?.physical_implementation_authorized!==true || (readiness?.narrowed_next_lane?.owner_decisions_required||[]).length!==0) errors.push('SLICE-P05 admission: next lane must authorize P05 implementation with no owner gate');
if(readiness?.evidence_states?.slice_p05_owner_decision!=='PROVEN' || readiness?.evidence_states?.slice_p05_schema_admission!=='PROVEN' || readiness?.evidence_states?.slice_p05_relationship_nullability!=='PROVEN') errors.push('SLICE-P05 admission: readiness evidence states must be PROVEN');

if(errors.length){
  console.error(`SLICE-P05 PHYSICAL-SCHEMA ADMISSION FAILED (${errors.length} problem${errors.length===1?'':'s'}):`);
  for(const e of errors) console.error(`- ${e}`);
  process.exit(1);
}
console.log('SLICE-P05 PHYSICAL-SCHEMA ADMISSION PASS');
console.log('Decision: ADMIT');
console.log('P05-D01: REQUIRED_ONE_ASSIGNMENT');
console.log('Assignment physical reference required/non-null: true');
console.log('All 8 admission criteria: PROVEN');
console.log('P05 implementation/migration authoring authorized: true');
console.log('Shared/production migration execution authorized: false');
