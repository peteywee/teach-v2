#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { inspectAdmissionCriteria } from './admission-criteria.mjs';

const ROOT=resolve(process.cwd());
const errors=[];
const load=(p)=>{try{return JSON.parse(readFileSync(join(ROOT,p),'utf8'));}catch(e){errors.push(`${p}: ${e.message}`);return null;}};
const text=(p)=>{try{return readFileSync(join(ROOT,p),'utf8');}catch(e){errors.push(`${p}: ${e.message}`);return '';}};
const find=(doc,id)=>(doc?.entries||[]).find(x=>x.id===id);

const authority=load('persistence/authority.json');
const admission=load('persistence/physical-slices/identity-credentials/admission.json');
const plan=load('persistence/physical-slices/identity-credentials/admission-evidence-plan.json');
const manifest=load('kernel/manifest.json');
const entities=load('kernel/entities.json');
const ids=load('kernel/identifiers.json');
const relationships=load('kernel/relationships.json');
const ownership=load('domains/ownership-map.json');
const c11=text('contracts/c11-identity-credentials-contract.md');

if(authority?.version!=='1.0.0' || authority?.status!=='active') errors.push('SLICE-P04 admission: active Persistence Model 1.0.0 required');
if(manifest?.version!=='0.16.0') errors.push('SLICE-P04 admission: K00 0.16.0 required');
if(ownership?.version!=='1.7.0' || ownership?.status!=='active') errors.push('SLICE-P04 admission: Domain Ownership Map 1.7.0 required');
if(admission?.admission_id!=='TEACH-SLICE-P04-PHYSICAL-SCHEMA-ADMISSION' || admission?.version!=='1.1.0' || admission?.status!=='recorded' || admission?.issue!=='#46') errors.push('SLICE-P04 admission: admission identity/state mismatch');
if(plan?.plan_id!=='TEACH-SLICE-P04-ADMISSION-EVIDENCE-PLAN' || plan?.version!=='1.1.0' || plan?.status!=='recorded' || plan?.physical_schema_authorized!==false) errors.push('SLICE-P04 admission: evidence plan missing or over-authorizing');

if(find(entities,'Credential')?.status!=='approved') errors.push('SLICE-P04 admission: Credential must be approved');
if(find(ids,'CredentialId')?.status!=='approved') errors.push('SLICE-P04 admission: CredentialId must be approved');
const rel=find(relationships,'CredentialBelongsToIdentity');
if(!rel || rel.status!=='approved' || rel.cardinality!=='many-to-one' || rel.owning_domain!=='Identity') errors.push('SLICE-P04 admission: CredentialBelongsToIdentity must be approved Identity-owned many-to-one');
const ownerRel=(ownership?.entries||[]).find(x=>x.kind==='relationship'&&x.id==='CredentialBelongsToIdentity');
if(!ownerRel || ownerRel.decision_state!=='approved' || ownerRel.proposed_owner!=='Identity') errors.push('SLICE-P04 admission: relationship ownership authority missing');

for(const req of ['IDN-4','IDN-5','IDN-6','IDN-13']) if(!c11.includes(`**${req}**`)) errors.push(`SLICE-P04 admission: C11 missing ${req}`);
for(const oq of ['OQ-IDN-1','OQ-IDN-3']) if(!c11.includes(`| ${oq} |`)) errors.push(`SLICE-P04 admission: ${oq} must remain explicitly open rather than silently resolved`);

errors.push(...inspectAdmissionCriteria(authority, admission, 'SLICE-P04'));
if((admission?.blockers||[]).length!==0) errors.push('SLICE-P04 admission: blockers must be empty');
if(admission?.decision!=='ADMIT' || admission?.physical_schema_authorized!==true || admission?.implementation_authorized!==true || admission?.migration_authoring_authorized!==true) errors.push('SLICE-P04 admission: ADMIT authorization mismatch');
if(admission?.shared_or_production_migration_execution_authorized!==false || admission?.full_relational_schema_authorized!==false) errors.push('SLICE-P04 admission: production/full-schema authority must remain blocked');

if(errors.length){
 console.error(`SLICE-P04 PHYSICAL-SCHEMA ADMISSION FAILED (${errors.length} problem${errors.length===1?'':'s'}):`);
 for(const e of errors) console.error(`- ${e}`);
 process.exit(1);
}
console.log('SLICE-P04 PHYSICAL-SCHEMA ADMISSION PASS');
console.log('Decision: ADMIT');
console.log('All 8 admission criteria: PROVEN');
console.log('CredentialBelongsToIdentity: approved many-to-one');
console.log('Shared/production migration execution authorized: false');
