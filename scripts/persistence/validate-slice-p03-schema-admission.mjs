#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT=resolve(process.cwd());
const errors=[];
const load=(p)=>{try{return JSON.parse(readFileSync(join(ROOT,p),'utf8'));}catch(e){errors.push(`${p}: ${e.message}`);return null;}};
const text=(p)=>{try{return readFileSync(join(ROOT,p),'utf8');}catch(e){errors.push(`${p}: ${e.message}`);return '';}};

const authority=load('persistence/authority.json');
const admission=load('persistence/physical-slices/identity-tokens/admission.json');
const plan=load('persistence/physical-slices/identity-tokens/admission-evidence-plan.json');
const reg=load('persistence/physical-slices/identity-tokens/registration.json');
const readiness=load('persistence/physical-slices/readiness.json');
const manifest=load('kernel/manifest.json');
const entities=load('kernel/entities.json');
const ids=load('kernel/identifiers.json');
const states=load('kernel/states.json');
const machines=load('kernel/state-machines.json');
const relationships=load('kernel/relationships.json');
const ownership=load('domains/ownership-map.json');
const c11=text('contracts/c11-identity-credentials-contract.md');
const c15=text('contracts/c15-data-isolation-privacy-contract.md');
const find=(doc,id)=>(doc?.entries||[]).find(x=>x.id===id);

if(authority?.version!=='1.0.0' || authority?.status!=='active') errors.push('SLICE-P03 admission: active Persistence Model 1.0.0 required');
if(manifest?.version!=='0.16.0') errors.push('SLICE-P03 admission: K00 0.16.0 required');
if(ownership?.version!=='1.7.0' || ownership?.status!=='active') errors.push('SLICE-P03 admission: Domain Ownership Map 1.7.0 required');
if(admission?.admission_id!=='TEACH-SLICE-P03-PHYSICAL-SCHEMA-ADMISSION' || admission?.version!=='1.0.0' || admission?.status!=='recorded' || admission?.issue!=='#42') errors.push('SLICE-P03 admission: admission identity/state mismatch');
if(admission?.semantic_baseline_commit!=='84c94ba1abe466907b63d79b281ac4df36b77b6c') errors.push('SLICE-P03 admission: exact post-registration baseline required');
if(plan?.plan_id!=='TEACH-SLICE-P03-ADMISSION-EVIDENCE-PLAN' || plan?.version!=='1.0.0' || plan?.status!=='recorded' || plan?.physical_schema_authorized!==false) errors.push('SLICE-P03 admission: evidence plan missing or over-authorizing');
if(reg?.registration_id!=='TEACH-SLICE-P03-OWNER-RELATIONSHIP-REGISTRATION' || reg?.version!=='1.0.0' || reg?.status!=='recorded' || reg?.issue!=='#40') errors.push('SLICE-P03 admission: owner/relationship registration missing');

for(const id of ['Invitation','SetupToken','PasswordResetToken']) if(find(entities,id)?.status!=='approved') errors.push(`SLICE-P03 admission: ${id} must be approved`);
for(const id of ['InvitationId','SetupTokenId','PasswordResetTokenId']) if(find(ids,id)?.status!=='approved') errors.push(`SLICE-P03 admission: ${id} must be approved`);
for(const id of ['InvitationStatus','SingleUseTokenStatus']) if(find(states,id)?.status!=='approved') errors.push(`SLICE-P03 admission: ${id} must be approved`);
for(const id of ['InvitationStateMachine','SetupTokenStateMachine','PasswordResetTokenStateMachine']) if(find(machines,id)?.status!=='approved') errors.push(`SLICE-P03 admission: ${id} must be approved`);

const expectedRelationships=new Map([
 ['InvitationForIdentity','many-to-zero-or-one'],
 ['InvitationOwnedByIdentity','many-to-one'],
 ['SetupTokenBelongsToIdentity','many-to-one'],
 ['PasswordResetTokenBelongsToIdentity','many-to-one'],
]);
for(const [id,cardinality] of expectedRelationships){
 const r=find(relationships,id);
 if(!r || r.status!=='approved' || r.cardinality!==cardinality || r.owning_domain!=='Identity') errors.push(`SLICE-P03 admission: ${id} must be approved Identity-owned ${cardinality}`);
 const o=(ownership?.entries||[]).find(x=>x.kind==='relationship'&&x.id===id);
 if(!o || o.decision_state!=='approved' || o.proposed_owner!=='Identity') errors.push(`SLICE-P03 admission: ${id} ownership-map authority missing`);
}

const scope=reg?.scope_rules;
if(scope?.invitation_invited_identity_optional!==true || scope?.invitation_owner_identity_required!==true || scope?.setup_token_identity_required!==true || scope?.password_reset_token_identity_required!==true || scope?.protected_reads_writes_require_authoritative_identity_id!==true || scope?.token_verifier_secret_read_exposure_forbidden!==true || scope?.tenant_role_capability_authority_columns_forbidden!==true) errors.push('SLICE-P03 admission: exact #40 scope rules required');

for(const req of ['IDN-7','IDN-8','IDN-9','IDN-10','IDN-11','IDN-24','IDN-25','IDN-26','IDN-27','IDN-28']) if(!c11.includes(`**${req}**`)) errors.push(`SLICE-P03 admission: C11 missing ${req}`);
for(const unresolved of ['OQ-IDN-1','OQ-IDN-3','OQ-IDN-4']) if(!c11.includes(`| ${unresolved} |`)) errors.push(`SLICE-P03 admission: C11 non-decision ${unresolved} must remain open`);
for(const unresolved of ['OQ-PRIV-1','OQ-PRIV-2','OQ-PRIV-3']) if(!c15.includes(`| ${unresolved} |`)) errors.push(`SLICE-P03 admission: C15 non-decision ${unresolved} must remain open/unencoded`);

const criteria=admission?.criteria||[];
if(criteria.length!==8 || criteria.some(x=>x.state!=='PROVEN')) errors.push('SLICE-P03 admission: all eight criteria must be PROVEN');
if((admission?.blockers||[]).length!==0) errors.push('SLICE-P03 admission: blockers must be empty');
if(admission?.decision!=='ADMIT' || admission?.physical_schema_authorized!==true || admission?.implementation_authorized!==true || admission?.migration_authoring_authorized!==true || admission?.admitted_physical_slices!==3) errors.push('SLICE-P03 admission: ADMIT authorization mismatch');
if(admission?.shared_or_production_migration_execution_authorized!==false || admission?.full_relational_schema_authorized!==false) errors.push('SLICE-P03 admission: production/full-schema authority must remain blocked');

const p03=readiness?.candidate_slices?.find(x=>x.id==='SLICE-P03');
if(readiness?.version!=='1.2.0' || readiness?.current_admitted_slice_count!==4 || !['SLICE-P01','SLICE-P02','SLICE-P03','SLICE-P04'].every(id=>readiness?.current_physical_slice_admissions?.some(x=>x.id===id))) errors.push('SLICE-P03 admission: readiness must contain P01/P02/P03/P04 admissions');
if(!p03 || p03.current_state!=='ADMITTED' || p03.implementation_authorized!==true || (p03.blockers||[]).length!==0) errors.push('SLICE-P03 admission: P03 readiness state mismatch');
if(readiness?.evidence_states?.slice_p03_schema_admission!=='PROVEN' || readiness?.evidence_states?.slice_p03_implementation!=='PROVEN') errors.push('SLICE-P03 admission: evidence-state transition mismatch');
if(readiness?.narrowed_next_lane?.preferred_slice!=='SLICE-P04' || readiness?.narrowed_next_lane?.physical_implementation_authorized!==true) errors.push('SLICE-P03 admission: implementation lane must be authorized');
if(readiness?.implementation_guard?.tables_generated!==7 || readiness?.implementation_guard?.migrations_generated!==4 || readiness?.implementation_guard?.repositories_generated!==7 || readiness?.implementation_guard?.implemented_slice_count!==4) errors.push('SLICE-P03 admission: admission must not invent implementation artifacts');

if(errors.length){
 console.error(`SLICE-P03 PHYSICAL-SCHEMA ADMISSION FAILED (${errors.length} problem${errors.length===1?'':'s'}):`);
 for(const e of errors) console.error(`- ${e}`);
 process.exit(1);
}
console.log('SLICE-P03 PHYSICAL-SCHEMA ADMISSION PASS');
console.log('Decision: ADMIT');
console.log('All 8 admission criteria: PROVEN');
console.log('Physical slices admitted: 3 (P01, P02, P03)');
console.log('P03 implementation/migration authoring authorized: true');
console.log('Shared/production migration execution authorized: false');
