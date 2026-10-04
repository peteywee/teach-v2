#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT=resolve(process.cwd());
const errors=[];
const load=(p)=>{try{return JSON.parse(readFileSync(join(ROOT,p),'utf8'));}catch(e){errors.push(`${p}: ${e.message}`);return null;}};
const text=(p)=>{try{return readFileSync(join(ROOT,p),'utf8');}catch(e){errors.push(`${p}: ${e.message}`);return '';}};

const reg=load('persistence/physical-slices/identity-session/registration.json');
const readiness=load('persistence/physical-slices/readiness.json');
const manifest=load('kernel/manifest.json');
const entities=load('kernel/entities.json');
const ids=load('kernel/identifiers.json');
const states=load('kernel/states.json');
const machines=load('kernel/state-machines.json');
const relationships=load('kernel/relationships.json');
const c12=text('contracts/c12-application-sessions-contract.md');
const approvals=text('contracts/APPROVAL-RECORD.md');
const index=text('contracts/README.md');

const find=(doc,id)=>(doc?.entries||[]).find(x=>x.id===id);

if(manifest?.version!=='0.16.0') errors.push('SLICE-P02 decisions: K00 must remain 0.16.0');
if(reg?.registration_id!=='TEACH-SLICE-P02-OWNER-DECISION-REGISTRATION' || reg?.version!=='1.0.0' || reg?.status!=='recorded' || reg?.issue!=='#32') errors.push('SLICE-P02 decisions: registration identity/state mismatch');

const expected=new Map([
 ['P02-D01','SESSION_VERIFIER_V1_SHA256_256BIT'],
 ['P02-D02','ABSOLUTE_12H_IDLE_30M'],
 ['P02-D03','IDENTITY_GLOBAL_PRINCIPAL_SESSION_IDENTITY_OWNED'],
]);
const actual=new Map((reg?.decisions||[]).map(x=>[x.id,x.selection]));
for(const [id,value] of expected) if(actual.get(id)!==value) errors.push(`SLICE-P02 decisions: ${id} must be ${value}`);

for(const id of ['Identity','ApplicationSession']) if(find(entities,id)?.status!=='approved') errors.push(`SLICE-P02 decisions: ${id} must be approved`);
for(const id of ['IdentityId','ApplicationSessionId']) if(find(ids,id)?.status!=='approved') errors.push(`SLICE-P02 decisions: ${id} must be approved`);
for(const id of ['IdentityStatus','ApplicationSessionStatus']) if(find(states,id)?.status!=='approved') errors.push(`SLICE-P02 decisions: ${id} must be approved`);
for(const id of ['IdentityStateMachine','ApplicationSessionStateMachine']) if(find(machines,id)?.status!=='approved') errors.push(`SLICE-P02 decisions: ${id} must be approved`);
const relation=find(relationships,'IdentityHasApplicationSession');
if(!relation || relation.status!=='approved' || relation.cardinality!=='one-to-many' || relation.owning_domain!=='Identity') errors.push('SLICE-P02 decisions: approved IdentityHasApplicationSession one-to-many authority required');

const scope=reg?.ownership_scope_decision;
if(scope?.identity_organization_owned!==false || scope?.identity_explicit_ownership_key!=='IdentityId' || scope?.application_session_owner!=='Identity' || scope?.application_session_identity_fk_required!==true || scope?.tenant_authority_columns_forbidden!==true || scope?.protected_session_queries_require_authoritative_identity_id!==true || scope?.cross_identity_admin_access_requires_external_authorization!==true) errors.push('SLICE-P02 decisions: ownership/scope decision drifted');
if(reg?.readiness_effect?.physical_schema_authorized!==false || reg?.readiness_effect?.schema_admission_rerun_required!==true) errors.push('SLICE-P02 decisions: registration must remain non-authorizing');

if(!c12.includes('"version": "1.1.0"') || c12.includes('| OQ-SES-3 |') || c12.includes('| OQ-SES-4 |')) errors.push('SLICE-P02 decisions: C12 1.1.0 must resolve OQ-SES-3/4');
for(const token of ['SESSION_VERIFIER_V1_SHA256_256BIT','ABSOLUTE_12H_IDLE_30M','exactly 32 cryptographically secure random bytes','absolute lifetime is 12 hours','idle lifetime is 30 minutes']) if(!c12.includes(token)) errors.push(`SLICE-P02 decisions: C12 missing ${token}`);
if(!approvals.includes('## Part 23 — SLICE-P02 owner decisions') || !approvals.includes('IDENTITY_GLOBAL_PRINCIPAL_SESSION_IDENTITY_OWNED') || !approvals.includes('| #32 |')) errors.push('SLICE-P02 decisions: canonical approval ledger entry missing');
if(!index.includes('"version": "0.14.0"') || !index.includes('- Package version: `0.14.0`')) errors.push('SLICE-P02 decisions: contract package synchronization missing');
if(!index.includes('| C12 |')) errors.push('SLICE-P02 decisions: C12 index row missing');

const p02=readiness?.candidate_slices?.find(x=>x.id==='SLICE-P02');
if(readiness?.version!=='1.2.0' || readiness?.evidence_states?.slice_p02_owner_decisions!=='PROVEN' || readiness?.evidence_states?.slice_p02_schema_admission!=='PROVEN' || readiness?.evidence_states?.slice_p02_implementation!=='PROVEN') errors.push('SLICE-P02 decisions: owner/admission/implementation proof must remain preserved through readiness 1.2.0');
if(!p02 || p02.current_state!=='ADMITTED' || (p02.blockers_removed_by_owner_decisions||[]).length!==3 || (p02.blockers||[]).length!==0 || readiness?.current_physical_slice_admissions?.find(x=>x.id==='SLICE-P02')?.implementation_state!=='IMPLEMENTED') errors.push('SLICE-P02 decisions: P02 admission and IMPLEMENTED evidence must preserve the three owner decisions');
if(readiness?.current_admitted_slice_count!==4 || !readiness?.current_physical_slice_admissions?.some(x=>x.id==='SLICE-P02')) errors.push('SLICE-P02 decisions: subsequent P02 admission evidence missing');

if(errors.length){
 console.error(`SLICE-P02 OWNER DECISIONS FAILED (${errors.length} problem${errors.length===1?'':'s'}):`);
 for(const e of errors) console.error(`- ${e}`);
 process.exit(1);
}
console.log('SLICE-P02 OWNER DECISIONS PASS');
console.log('C12: 1.1.0');
console.log('P02 decisions: 3 PROVEN');
console.log('K00: 0.16.0 unchanged');
console.log('P02 physical schema: ADMITTED; implementation pending');
