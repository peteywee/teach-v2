#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT=resolve(process.cwd());
const errors=[];
const load=(p)=>{try{return JSON.parse(readFileSync(join(ROOT,p),'utf8'));}catch(e){errors.push(`${p}: ${e.message}`);return null;}};
const find=(doc,id)=>(doc?.entries||[]).find(x=>x.id===id);

const registration=load('persistence/physical-slices/learning-session/registration.json');
const manifest=load('kernel/manifest.json');
const relationships=load('kernel/relationships.json');
const ownership=load('domains/ownership-map.json');
const architecture=load('architecture/authority.json');
const authority=load('persistence/authority.json');

if(registration?.registration_id!=='TEACH-SLICE-P05-OWNER-DECISION-REGISTRATION' || registration?.version!=='1.0.0' || registration?.status!=='recorded' || registration?.issue!=='#47') errors.push('SLICE-P05 owner decision: registration identity/state mismatch');
if(registration?.baseline_commit!=='971b77faad88c4be5119324b5c324b56d0a78055') errors.push('SLICE-P05 owner decision: exact pre-decision main baseline required');
if(manifest?.version!=='0.16.0') errors.push('SLICE-P05 owner decision: K00 0.16.0 required');
if(authority?.version!=='1.0.0' || authority?.status!=='active') errors.push('SLICE-P05 owner decision: active Persistence Model 1.0.0 required');
if(architecture?.version!=='1.0.0' || !(architecture?.topology?.runtime_domain_modules||[]).includes('Learning')) errors.push('SLICE-P05 owner decision: Learning runtime module authority missing');

const relationship=find(relationships,'LearningSessionUsesAssignment');
if(!relationship || relationship.status!=='approved' || relationship.cardinality!=='many-to-one' || relationship.owning_domain!=='Learning') errors.push('SLICE-P05 owner decision: LearningSessionUsesAssignment must remain approved Learning-owned many-to-one');
const ownershipEntry=(ownership?.entries||[]).find(x=>x.kind==='relationship'&&x.id==='LearningSessionUsesAssignment');
if(!ownershipEntry || ownershipEntry.decision_state!=='approved' || ownershipEntry.proposed_owner!=='Learning') errors.push('SLICE-P05 owner decision: LearningSessionUsesAssignment ownership authority missing');

const d=(registration?.decisions||[]).find(x=>x.id==='P05-D01');
if(!d || d.selection!=='REQUIRED_ONE_ASSIGNMENT' || d.relationship!=='LearningSessionUsesAssignment' || d.cardinality!=='many-to-one' || d.physical_reference_required!==true || d.physical_reference_nullable!==false) errors.push('SLICE-P05 owner decision: P05-D01 must be REQUIRED_ONE_ASSIGNMENT with required non-null physical reference');

const scope=registration?.scope_rules;
if(scope?.learning_session_identity_required!==true || scope?.learning_session_assignment_required!==true || scope?.assignment_reference_nullable!==false || scope?.protected_reads_writes_require_authoritative_identity_id!==true || scope?.assignment_presence_does_not_grant_authorization!==true || scope?.start_authorization_still_requires_c32_lrn2!==true) errors.push('SLICE-P05 owner decision: required scope rules drifted');

const effects=registration?.effects;
if(effects?.owner_shape_decision_closed!==true || effects?.schema_admission_rerun_authorized!==true || effects?.physical_schema_authorized!==false || effects?.implementation_authorized!==false || effects?.migration_authoring_authorized!==false || effects?.shared_or_production_migration_execution_authorized!==false) errors.push('SLICE-P05 owner decision: registration must authorize admission rerun only');

if(errors.length){
  console.error(`SLICE-P05 OWNER DECISION FAILED (${errors.length} problem${errors.length===1?'':'s'}):`);
  for(const e of errors) console.error(`- ${e}`);
  process.exit(1);
}
console.log('SLICE-P05 OWNER DECISION PASS');
console.log('P05-D01: REQUIRED_ONE_ASSIGNMENT');
console.log('LearningSessionUsesAssignment: approved many-to-one');
console.log('Physical Assignment reference required/non-null: true');
console.log('Schema admission rerun authorized: true');
console.log('Physical implementation authorized by registration alone: false');
