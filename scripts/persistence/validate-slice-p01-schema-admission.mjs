#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
const ROOT=resolve(process.cwd());
const errors=[];
const load=(p)=>{try{return JSON.parse(readFileSync(join(ROOT,p),'utf8'));}catch(e){errors.push(`${p}: ${e.message}`);return null;}};

const authority=load('persistence/authority.json');
const admission=load('persistence/physical-slices/transaction-control/admission.json');
const plan=load('persistence/physical-slices/transaction-control/admission-evidence-plan.json');
const readiness=load('persistence/physical-slices/readiness.json');
const entities=load('kernel/entities.json');
const ids=load('kernel/identifiers.json');
const states=load('kernel/states.json');
const rel=load('kernel/relationships.json');

const find=(doc,id)=>(doc?.entries||[]).find(x=>x.id===id);
if(authority?.version!=='1.0.0' || authority?.status!=='active') errors.push('SLICE-P01 admission: active Persistence Model 1.0.0 required');
if(admission?.admission_id!=='TEACH-SLICE-P01-PHYSICAL-SCHEMA-ADMISSION' || admission?.version!=='1.0.0' || admission?.status!=='recorded' || admission?.issue!=='#22') errors.push('SLICE-P01 admission: admission record identity/state mismatch');
if(admission?.semantic_baseline_commit!=='8b2acf2c8d121315641cd726528a7add926331cd') errors.push('SLICE-P01 admission: semantic baseline must be exact relationship-registration main');
if(plan?.plan_id!=='TEACH-SLICE-P01-MIGRATION-ACCEPTANCE-EVIDENCE-PLAN' || plan?.version!=='1.0.0' || plan?.status!=='recorded') errors.push('SLICE-P01 admission: migration/acceptance evidence plan missing');
if(plan?.physical_schema_authorized!==false) errors.push('SLICE-P01 admission: evidence plan must not authorize schema');
if(find(entities,'ReconciliationRecord')?.status!=='approved') errors.push('SLICE-P01 admission: ReconciliationRecord must be approved');
if(find(ids,'ReconciliationRecordId')?.status!=='approved') errors.push('SLICE-P01 admission: ReconciliationRecordId must be approved');
if(find(states,'ReconciliationRecordStatus')?.status!=='approved') errors.push('SLICE-P01 admission: ReconciliationRecordStatus must be approved');
if(find(states,'ExternalEffectOutcome')?.status!=='approved') errors.push('SLICE-P01 admission: ExternalEffectOutcome must be approved');
const rr=find(rel,'ReconciliationRecordUsesIdempotencyKey');
if(!rr) errors.push('SLICE-P01 admission: relationship registration missing');
else {
 if(rr.status!=='approved') errors.push(`SLICE-P01 admission: owner-approved promotion expected approved relationship, found ${rr.status}`);
 if(rr.cardinality!=='many-to-zero-or-one') errors.push('SLICE-P01 admission: relationship cardinality drifted');
 if(rr.owning_domain!=='TransactionControl') errors.push('SLICE-P01 admission: relationship owner drifted');
}
const blocked=(admission?.criteria||[]).filter(x=>x.state==='BLOCKED');
if(admission?.decision!=='BLOCK' || admission?.physical_schema_authorized!==false || admission?.admitted_physical_slices!==0) errors.push('SLICE-P01 admission: decision must remain BLOCK with zero admissions');
if(blocked.length!==1 || !blocked[0]?.evidence?.includes('status is candidate')) errors.push('SLICE-P01 admission: historical issue #22 record must preserve the pre-promotion candidate blocker');
if(readiness?.version!=='0.5.0' || readiness?.evidence_states?.relationship_promotion!=='PROVEN' || readiness?.evidence_states?.admission_rerun!=='PENDING') errors.push('SLICE-P01 admission: current readiness must require a fresh post-promotion admission rerun');
if((readiness?.current_physical_slice_admissions||[]).length!==0 || readiness?.current_admitted_slice_count!==0) errors.push('SLICE-P01 admission: readiness admitted a physical slice prematurely');
if(readiness?.implementation_guard?.tables_generated!==0 || readiness?.implementation_guard?.migrations_generated!==0 || readiness?.implementation_guard?.repositories_generated!==0 || readiness?.implementation_guard?.physical_schema_authorized!==false) errors.push('SLICE-P01 admission: implementation guard violated');
if(errors.length){console.error(`SLICE-P01 PHYSICAL-SCHEMA ADMISSION FAILED (${errors.length} problem${errors.length===1?'':'s'}):`);for(const e of errors) console.error(`- ${e}`);process.exit(1);}
console.log('SLICE-P01 HISTORICAL ADMISSION EVIDENCE PASS');
console.log('Historical decision: BLOCK at pre-promotion baseline');
console.log('PROVEN: entity, identifier, lifecycle/outcome, ownership/scope decisions, migration/acceptance evidence plan');
console.log('Relationship promotion: PROVEN in current K00');
console.log('Physical slices admitted: 0');
console.log('Physical implementation authorized: false');
console.log('Next gate: fresh SLICE-P01 admission rerun');
