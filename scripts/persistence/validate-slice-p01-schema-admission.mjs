#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
const ROOT=resolve(process.cwd());
const errors=[];
const load=(p)=>{try{return JSON.parse(readFileSync(join(ROOT,p),'utf8'));}catch(e){errors.push(`${p}: ${e.message}`);return null;}};

const authority=load('persistence/authority.json');
const admission=load('persistence/physical-slices/transaction-control/admission.json');
const historical=load('persistence/physical-slices/transaction-control/admission-history/issue-22-block.json');
const plan=load('persistence/physical-slices/transaction-control/admission-evidence-plan.json');
const readiness=load('persistence/physical-slices/readiness.json');
const implementation=load('persistence/physical-slices/transaction-control/implementation.json');
const manifest=load('kernel/manifest.json');
const entities=load('kernel/entities.json');
const ids=load('kernel/identifiers.json');
const states=load('kernel/states.json');
const rel=load('kernel/relationships.json');

const find=(doc,id)=>(doc?.entries||[]).find(x=>x.id===id);
if(authority?.version!=='1.0.0' || authority?.status!=='active') errors.push('SLICE-P01 admission: active Persistence Model 1.0.0 required');
if(manifest?.version!=='0.16.0') errors.push('SLICE-P01 admission: K00 0.16.0 required');
if(admission?.admission_id!=='TEACH-SLICE-P01-PHYSICAL-SCHEMA-ADMISSION' || admission?.version!=='2.0.0' || admission?.status!=='recorded' || admission?.issue!=='#26') errors.push('SLICE-P01 admission: current admission identity/state mismatch');
if(admission?.semantic_baseline_commit!=='d6a6e33db95752174445806ef81d51147f265f9c') errors.push('SLICE-P01 admission: exact post-promotion baseline required');
if(historical?.version!=='1.0.0' || historical?.decision!=='BLOCK' || historical?.issue!=='#22' || historical?.historical!==true) errors.push('SLICE-P01 admission: historical BLOCK evidence not preserved');
if(plan?.plan_id!=='TEACH-SLICE-P01-MIGRATION-ACCEPTANCE-EVIDENCE-PLAN' || plan?.version!=='1.0.0' || plan?.status!=='recorded') errors.push('SLICE-P01 admission: migration/acceptance evidence plan missing');
if(plan?.physical_schema_authorized!==false) errors.push('SLICE-P01 admission: evidence plan must remain non-authorizing');
if(find(entities,'ReconciliationRecord')?.status!=='approved') errors.push('SLICE-P01 admission: ReconciliationRecord must be approved');
if(find(ids,'ReconciliationRecordId')?.status!=='approved') errors.push('SLICE-P01 admission: ReconciliationRecordId must be approved');
if(find(states,'ReconciliationRecordStatus')?.status!=='approved') errors.push('SLICE-P01 admission: ReconciliationRecordStatus must be approved');
if(find(states,'ExternalEffectOutcome')?.status!=='approved') errors.push('SLICE-P01 admission: ExternalEffectOutcome must be approved');
const rr=find(rel,'ReconciliationRecordUsesIdempotencyKey');
if(!rr || rr.status!=='approved' || rr.cardinality!=='many-to-zero-or-one' || rr.owning_domain!=='TransactionControl') errors.push('SLICE-P01 admission: approved TransactionControl relationship/cardinality required');
const unproven=(admission?.criteria||[]).filter(x=>x.state!=='PROVEN');
if(unproven.length!==0) errors.push('SLICE-P01 admission: every admission criterion must be PROVEN');
if((admission?.blockers||[]).length!==0) errors.push('SLICE-P01 admission: blockers must be empty');
if(admission?.decision!=='ADMIT' || admission?.physical_schema_authorized!==true || admission?.implementation_authorized!==true || admission?.migration_authoring_authorized!==true || admission?.admitted_physical_slices!==1) errors.push('SLICE-P01 admission: ADMIT authorization mismatch');
if(admission?.shared_or_production_migration_execution_authorized!==false || admission?.full_relational_schema_authorized!==false) errors.push('SLICE-P01 admission: admission must not authorize full schema or shared/production migration execution');
if(readiness?.version!=='1.2.0' || !readiness?.current_physical_slice_admissions?.some(x=>x.id==='SLICE-P01')) errors.push('SLICE-P01 admission: readiness must preserve P01 admission');
if(readiness?.candidate_slices?.find(x=>x.id==='SLICE-P01')?.implementation_authorized!==true || readiness?.implementation_guard?.physical_schema_authorized!==true) errors.push('SLICE-P01 admission: implementation authorization missing from preserved P01 readiness');
if(implementation?.version!=='1.0.0' || implementation?.status!=='recorded') errors.push('SLICE-P01 admission: subsequent admitted implementation evidence mismatch');
if(readiness?.implementation_guard?.shared_or_production_migration_execution_authorized!==false) errors.push('SLICE-P01 admission: production migration execution must remain blocked');

if(errors.length){
 console.error(`SLICE-P01 PHYSICAL-SCHEMA ADMISSION FAILED (${errors.length} problem${errors.length===1?'':'s'}):`);
 for(const e of errors) console.error(`- ${e}`);
 process.exit(1);
}
console.log('SLICE-P01 PHYSICAL-SCHEMA ADMISSION PASS');
console.log('Decision: ADMIT');
console.log('K00: 0.16.0');
console.log('All 8 admission criteria: PROVEN');
console.log('SLICE-P01 admission remains PROVEN; current total admissions: 2');
console.log('Implementation/migration authoring authorized: true');
console.log('Full relational schema authorized: false');
console.log('Shared/production migration execution authorized: false');
console.log('Subsequent implementation: PROVEN');
console.log('Next gate: C21 recovery/release proof before shared/production migration execution');
