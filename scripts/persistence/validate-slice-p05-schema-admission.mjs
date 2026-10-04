#!/usr/bin/env node
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT=resolve(process.cwd());
const errors=[];
const load=(p)=>{try{return JSON.parse(readFileSync(join(ROOT,p),'utf8'));}catch(e){errors.push(`${p}: ${e.message}`);return null;}};
const text=(p)=>{try{return readFileSync(join(ROOT,p),'utf8');}catch(e){errors.push(`${p}: ${e.message}`);return '';}};
const find=(doc,id)=>(doc?.entries||[]).find(x=>x.id===id);

const authority=load('persistence/authority.json');
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

if(admission?.admission_id!=='TEACH-SLICE-P05-PHYSICAL-SCHEMA-ADMISSION' || admission?.version!=='1.1.0' || admission?.status!=='recorded' || admission?.issue!=='#47') errors.push('SLICE-P05 admission: corrected admission identity/state mismatch');
if(admission?.semantic_baseline_commit!=='626512771b1a66751428d7bd0b5ac5fe6ddb613b') errors.push('SLICE-P05 admission: correction baseline must be exact pre-repair main');
if(plan?.plan_id!=='TEACH-SLICE-P05-ADMISSION-EVIDENCE-PLAN' || plan?.version!=='1.1.0' || plan?.status!=='recorded' || plan?.issue!=='#47' || plan?.physical_schema_authorized!==false) errors.push('SLICE-P05 admission: corrected evidence plan missing or over-authorizing');

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

if(!learningBoundary.includes('Foundation only') || !learningBoundary.includes('SLICE-P05 physical persistence is BLOCKED')) errors.push('SLICE-P05 admission: Learning source-module foundation missing or over-authorizing');

const evidence=(plan?.required_evidence||[]).join('\n');
if(!evidence.includes('UNKNOWN') || !evidence.includes('nullability/requiredness') || evidence.includes('many-to-one, nullable')) errors.push('SLICE-P05 admission: evidence plan must preserve UNKNOWN Assignment-reference nullability/requiredness');

const criteria=admission?.criteria||[];
if(criteria.length!==8) errors.push('SLICE-P05 admission: exactly eight Persistence Model criteria required');
const relationshipCriterion=criteria.find(x=>x.criterion==='every relationship/cardinality encoded by the schema is approved');
const openQuestionCriterion=criteria.find(x=>x.criterion==='no blocking open question changes the record shape');
if(relationshipCriterion?.state!=='UNKNOWN') errors.push('SLICE-P05 admission: relationship/schema-shape criterion must remain UNKNOWN');
if(openQuestionCriterion?.state!=='BLOCKED') errors.push('SLICE-P05 admission: shape-affecting open-question criterion must remain BLOCKED');
if(criteria.every(x=>x.state==='PROVEN')) errors.push('SLICE-P05 admission: unresolved shape evidence cannot collapse to all-PROVEN');

if(!Array.isArray(admission?.blockers) || admission.blockers.length!==1 || !admission.blockers[0].includes('#47')) errors.push('SLICE-P05 admission: #47 must be the explicit blocker');
if(admission?.decision!=='BLOCK' || admission?.physical_schema_authorized!==false || admission?.implementation_authorized!==false || admission?.migration_authoring_authorized!==false) errors.push('SLICE-P05 admission: must remain BLOCKED with implementation and migration authoring unauthorized');
if(admission?.shared_or_production_migration_execution_authorized!==false || admission?.full_relational_schema_authorized!==false) errors.push('SLICE-P05 admission: production/full-schema authority must remain blocked');

const admissions=readiness?.current_physical_slice_admissions||[];
if(readiness?.version!=='1.2.0' || readiness?.current_admitted_slice_count!==4 || admissions.some(x=>x.id==='SLICE-P05')) errors.push('SLICE-P05 admission: readiness must admit P01-P04 only');
const p05=readiness?.candidate_slices?.find(x=>x.id==='SLICE-P05');
if(!p05 || p05.current_state!=='BLOCKED' || p05.implementation_authorized!==false || !(p05.blockers||[]).some(x=>x.includes('#47'))) errors.push('SLICE-P05 admission: readiness P05 state mismatch');
if(readiness?.narrowed_next_lane?.physical_implementation_authorized!==false || !(readiness?.narrowed_next_lane?.owner_decisions_required||[]).some(x=>x.includes('#47'))) errors.push('SLICE-P05 admission: next-lane owner gate mismatch');
if(readiness?.evidence_states?.slice_p05_schema_admission!=='BLOCKED' || readiness?.evidence_states?.slice_p05_relationship_nullability!=='UNKNOWN' || readiness?.evidence_states?.slice_p05_implementation!=='BLOCKED') errors.push('SLICE-P05 admission: readiness evidence states must fail closed');

if(existsSync(join(ROOT,'persistence/physical-slices/learning-session/implementation.json'))) errors.push('SLICE-P05 admission: implementation evidence must not exist while BLOCKED');
const learningRoot=join(ROOT,'src/modules/learning');
if(existsSync(learningRoot)){
  const sourceFiles=readdirSync(learningRoot,{recursive:true}).filter(x=>typeof x==='string' && /\.(ts|tsx|js|mjs|sql)$/.test(x));
  if(sourceFiles.length) errors.push(`SLICE-P05 admission: runtime/persistence source exists before admission: ${sourceFiles.join(', ')}`);
}
const drizzleDir=join(ROOT,'drizzle');
if(existsSync(drizzleDir)){
  for(const file of readdirSync(drizzleDir).filter(x=>x.endsWith('.sql'))){
    const body=readFileSync(join(drizzleDir,file),'utf8');
    if(/learning_sessions/i.test(body)) errors.push(`SLICE-P05 admission: ${file} contains LearningSession physical schema while BLOCKED`);
  }
}

if(errors.length){
  console.error(`SLICE-P05 PHYSICAL-SCHEMA ADMISSION FAILED (${errors.length} problem${errors.length===1?'':'s'}):`);
  for(const e of errors) console.error(`- ${e}`);
  process.exit(1);
}

console.log('SLICE-P05 PHYSICAL-SCHEMA ADMISSION PASS');
console.log('Decision: BLOCK');
console.log('Relationship/cardinality physical nullability: UNKNOWN');
console.log('Owner decision required: #47');
console.log('Learning module foundation: PROVEN');
console.log('P05 implementation/migration authoring authorized: false');
console.log('Shared/production migration execution authorized: false');
