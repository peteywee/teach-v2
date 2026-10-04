#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { inspectLearningImplementation } from './learning-implementation-evidence.mjs';

const ROOT=resolve(process.cwd());
const errors=[];
const load=(p)=>{try{return JSON.parse(readFileSync(join(ROOT,p),'utf8'));}catch(e){errors.push(`${p}: ${e.message}`);return null;}};

const m=load('kernel/manifest.json');
const commands=load('kernel/commands.json');
const events=load('kernel/events.json');
const ids=load('kernel/identifiers.json');
const states=load('kernel/states.json');
const machines=load('kernel/state-machines.json');
const rel=load('kernel/relationships.json');
const inv=load('kernel/invariants.json');
const dt=load('kernel/decision-tables.json');
const r=load('persistence/physical-slices/readiness.json');
const p04Implementation=load('persistence/physical-slices/identity-credentials/implementation.json');
const p05Registration=load('persistence/physical-slices/learning-session/registration.json');
const p05Admission=load('persistence/physical-slices/learning-session/admission.json');

if(m?.version!=='0.16.0') errors.push('whole-stack audit: K00 must be 0.16.0');
const checks=[
 ['commands-approved',(commands?.entries||[]).filter(x=>x.status==='approved').length,23],
 ['events-candidate',(events?.entries||[]).filter(x=>x.status==='candidate').length,10],
 ['ids-approved',(ids?.entries||[]).filter(x=>x.status==='approved').length,15],
 ['states-approved',(states?.entries||[]).filter(x=>x.status==='approved').length,7],
 ['states-candidate',(states?.entries||[]).filter(x=>x.status==='candidate').length,2],
 ['machines-approved',(machines?.entries||[]).filter(x=>x.status==='approved').length,7],
 ['machines-candidate',(machines?.entries||[]).filter(x=>x.status==='candidate').length,1],
 ['relationships-approved',(rel?.entries||[]).filter(x=>x.status==='approved').length,15],
 ['relationships-candidate',(rel?.entries||[]).filter(x=>x.status==='candidate').length,8],
 ['invariants-candidate',(inv?.entries||[]).filter(x=>x.status==='candidate').length,22],
 ['decision-tables-candidate',(dt?.entries||[]).filter(x=>x.status==='candidate').length,8],
];
for(const [name,actual,expected] of checks) if(actual!==expected) errors.push(`whole-stack audit: ${name} expected ${expected}, found ${actual}`);

const admissions=r?.current_physical_slice_admissions||[];
const admittedIds=admissions.map(x=>x.id).sort();
if(r?.version!=='1.3.0' || r?.current_admitted_slice_count!==5 || JSON.stringify(admittedIds)!==JSON.stringify(['SLICE-P01','SLICE-P02','SLICE-P03','SLICE-P04','SLICE-P05'])) errors.push('whole-stack audit: current admitted set must be exactly P01-P05');

for(const id of ['SLICE-P01','SLICE-P02','SLICE-P03','SLICE-P04']){
  const x=admissions.find(a=>a.id===id);
  if(!x || !['PROVEN','IMPLEMENTED'].includes(x.implementation_state)) errors.push(`whole-stack audit: ${id} must remain implemented/proven`);
}

const p05=r?.candidate_slices?.find(x=>x.id==='SLICE-P05');
if(!p05 || !['ADMITTED','IMPLEMENTED'].includes(p05.current_state) || p05.name!=='LearningSession persistence' || p05.implementation_authorized!==true || (p05.blockers||[]).length!==0) errors.push('whole-stack audit: P05 must be LearningSession ADMITTED/IMPLEMENTED');
if(p04Implementation?.version!=='1.1.0' || p04Implementation?.status!=='proven' || p04Implementation?.verification?.exact_head_ci!=='PASS') errors.push('whole-stack audit: P04 implementation evidence must remain PROVEN');
if(p05Registration?.version!=='1.0.0' || p05Registration?.decisions?.[0]?.selection!=='REQUIRED_ONE_ASSIGNMENT') errors.push('whole-stack audit: P05 owner decision missing');
if(p05Admission?.version!=='1.2.0' || p05Admission?.decision!=='ADMIT' || p05Admission?.implementation_authorized!==true) errors.push('whole-stack audit: P05 admission must be ADMIT');

if(r?.implementation_guard?.tables_generated!==8 || r?.implementation_guard?.migrations_generated!==5 || r?.implementation_guard?.repositories_generated!==8 || r?.implementation_guard?.implemented_slice_count!==5) errors.push('whole-stack audit: admission-stage artifact totals must remain 8/5/8/5');
if(r?.implementation_guard?.shared_or_production_migration_execution_authorized!==false || r?.implementation_guard?.full_relational_schema_authorized!==false) errors.push('whole-stack audit: production/full relational schema execution must remain blocked');

errors.push(...inspectLearningImplementation(ROOT));

if(errors.length){
 console.error(`POST-CLOSURE WHOLE-STACK AUDIT FAILED (${errors.length} problem${errors.length===1?'':'s'}):`);
 for(const e of errors) console.error(`- ${e}`);
 process.exit(1);
}
console.log('POST-CLOSURE WHOLE-STACK AUDIT PASS');
console.log('PROVEN: K00 0.16.0 semantic counts');
console.log('PROVEN: P01-P04 implementation state');
console.log('PROVEN: P05 REQUIRED_ONE_ASSIGNMENT owner decision');
console.log('PROVEN: P05 LearningSession schema admission');
console.log(`P05 physical verification: ${r?.evidence_states?.slice_p05_implementation}`);
console.log('Artifact totals: 8 tables / 5 migrations / 8 repositories / 5 implemented slices');
console.log('BLOCKED: shared/production migration execution');
