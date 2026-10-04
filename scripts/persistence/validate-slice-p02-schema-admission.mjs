#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT=resolve(process.cwd());
const errors=[];
const load=(p)=>{try{return JSON.parse(readFileSync(join(ROOT,p),'utf8'));}catch(e){errors.push(`${p}: ${e.message}`);return null;}};
const text=(p)=>{try{return readFileSync(join(ROOT,p),'utf8');}catch(e){errors.push(`${p}: ${e.message}`);return '';}};

const authority=load('persistence/authority.json');
const admission=load('persistence/physical-slices/identity-session/admission.json');
const plan=load('persistence/physical-slices/identity-session/admission-evidence-plan.json');
const reg=load('persistence/physical-slices/identity-session/registration.json');
const readiness=load('persistence/physical-slices/readiness.json');
const manifest=load('kernel/manifest.json');
const entities=load('kernel/entities.json');
const ids=load('kernel/identifiers.json');
const states=load('kernel/states.json');
const machines=load('kernel/state-machines.json');
const relationships=load('kernel/relationships.json');
const c12=text('contracts/c12-application-sessions-contract.md');
const c15=text('contracts/c15-data-isolation-privacy-contract.md');

const find=(doc,id)=>(doc?.entries||[]).find(x=>x.id===id);

if(authority?.version!=='1.0.0' || authority?.status!=='active') errors.push('SLICE-P02 admission: active Persistence Model 1.0.0 required');
if(manifest?.version!=='0.15.0') errors.push('SLICE-P02 admission: K00 0.15.0 required');
if(admission?.admission_id!=='TEACH-SLICE-P02-PHYSICAL-SCHEMA-ADMISSION' || admission?.version!=='1.0.0' || admission?.status!=='recorded' || admission?.issue!=='#34') errors.push('SLICE-P02 admission: admission identity/state mismatch');
if(admission?.semantic_baseline_commit!=='cf425980c5f411144a37e1c1d3e259254d3e6e9b') errors.push('SLICE-P02 admission: exact post-owner-decision baseline required');
if(plan?.plan_id!=='TEACH-SLICE-P02-MIGRATION-ACCEPTANCE-EVIDENCE-PLAN' || plan?.version!=='1.0.0' || plan?.status!=='recorded' || plan?.physical_schema_authorized!==false) errors.push('SLICE-P02 admission: evidence plan missing or over-authorizing');
if(reg?.registration_id!=='TEACH-SLICE-P02-OWNER-DECISION-REGISTRATION' || reg?.version!=='1.0.0' || reg?.status!=='recorded') errors.push('SLICE-P02 admission: owner-decision registration missing');

for(const id of ['Identity','ApplicationSession']) if(find(entities,id)?.status!=='approved') errors.push(`SLICE-P02 admission: ${id} must be approved`);
for(const id of ['IdentityId','ApplicationSessionId']) if(find(ids,id)?.status!=='approved') errors.push(`SLICE-P02 admission: ${id} must be approved`);
for(const id of ['IdentityStatus','ApplicationSessionStatus']) if(find(states,id)?.status!=='approved') errors.push(`SLICE-P02 admission: ${id} must be approved`);
for(const id of ['IdentityStateMachine','ApplicationSessionStateMachine']) if(find(machines,id)?.status!=='approved') errors.push(`SLICE-P02 admission: ${id} must be approved`);
const relation=find(relationships,'IdentityHasApplicationSession');
if(!relation || relation.status!=='approved' || relation.cardinality!=='one-to-many' || relation.owning_domain!=='Identity') errors.push('SLICE-P02 admission: approved IdentityHasApplicationSession one-to-many relationship required');

if(!c12.includes('"version": "1.1.0"') || c12.includes('| OQ-SES-3 |') || c12.includes('| OQ-SES-4 |')) errors.push('SLICE-P02 admission: C12 1.1.0 verifier/lifetime closure required');
for(const unresolved of ['OQ-SES-1','OQ-SES-2','OQ-SES-5','OQ-SES-6']) if(!c12.includes(`| ${unresolved} |`)) errors.push(`SLICE-P02 admission: non-decision ${unresolved} must remain open`);
for(const unresolved of ['OQ-PRIV-1','OQ-PRIV-2','OQ-PRIV-3']) if(!c15.includes(`| ${unresolved} |`)) errors.push(`SLICE-P02 admission: C15 non-decision ${unresolved} must remain open`);

const criteria=admission?.criteria||[];
if(criteria.length!==8 || criteria.some(x=>x.state!=='PROVEN')) errors.push('SLICE-P02 admission: all eight criteria must be PROVEN');
if((admission?.blockers||[]).length!==0) errors.push('SLICE-P02 admission: blockers must be empty');
if(admission?.decision!=='ADMIT' || admission?.physical_schema_authorized!==true || admission?.implementation_authorized!==true || admission?.migration_authoring_authorized!==true || admission?.admitted_physical_slices!==2) errors.push('SLICE-P02 admission: ADMIT authorization mismatch');
if(admission?.shared_or_production_migration_execution_authorized!==false || admission?.full_relational_schema_authorized!==false) errors.push('SLICE-P02 admission: full schema or production execution over-authorized');

const p02=readiness?.candidate_slices?.find(x=>x.id==='SLICE-P02');
if(readiness?.version!=='0.9.0' || readiness?.current_admitted_slice_count!==2 || !readiness?.current_physical_slice_admissions?.some(x=>x.id==='SLICE-P01') || !readiness?.current_physical_slice_admissions?.some(x=>x.id==='SLICE-P02')) errors.push('SLICE-P02 admission: readiness must contain P01 + P02 admissions');
if(!p02 || p02.current_state!=='ADMITTED' || p02.implementation_authorized!==true || (p02.blockers||[]).length!==0) errors.push('SLICE-P02 admission: P02 readiness state mismatch');
if(readiness?.evidence_states?.slice_p02_schema_admission!=='PROVEN' || readiness?.evidence_states?.slice_p02_implementation!=='PENDING') errors.push('SLICE-P02 admission: evidence-state transition mismatch');
if(readiness?.narrowed_next_lane?.preferred_slice!=='SLICE-P02' || readiness?.narrowed_next_lane?.physical_implementation_authorized!==true) errors.push('SLICE-P02 admission: P02 implementation lane must be authorized');
if(readiness?.implementation_guard?.tables_generated!==1 || readiness?.implementation_guard?.migrations_generated!==1 || readiness?.implementation_guard?.repositories_generated!==1 || readiness?.implementation_guard?.implemented_slice_count!==1) errors.push('SLICE-P02 admission: admission stage must not create implementation artifacts');

if(errors.length){
 console.error(`SLICE-P02 PHYSICAL-SCHEMA ADMISSION FAILED (${errors.length} problem${errors.length===1?'':'s'}):`);
 for(const e of errors) console.error(`- ${e}`);
 process.exit(1);
}
console.log('SLICE-P02 PHYSICAL-SCHEMA ADMISSION PASS');
console.log('Decision: ADMIT');
console.log('All 8 admission criteria: PROVEN');
console.log('Physical slices admitted: 2 (SLICE-P01, SLICE-P02)');
console.log('P02 implementation/migration authoring authorized: true');
console.log('P02 implementation evidence: PENDING');
console.log('Shared/production migration execution authorized: false');
