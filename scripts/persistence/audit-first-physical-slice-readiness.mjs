#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { resolve, join } from 'node:path';

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

if(r?.version!=='1.2.0') errors.push('whole-stack audit: readiness 1.2.0 required');
const admissions=r?.current_physical_slice_admissions||[];
const admittedIds=admissions.map(x=>x.id).sort();
if(r?.current_admitted_slice_count!==4 || JSON.stringify(admittedIds)!==JSON.stringify(['SLICE-P01','SLICE-P02','SLICE-P03','SLICE-P04'])) errors.push('whole-stack audit: current admitted set must be exactly P01-P04');

for(const id of ['SLICE-P01','SLICE-P02','SLICE-P03','SLICE-P04']){
  const x=admissions.find(a=>a.id===id);
  if(!x || !['PROVEN','IMPLEMENTED'].includes(x.implementation_state)) errors.push(`whole-stack audit: ${id} must be implemented/proven`);
}

const p04=r?.candidate_slices?.find(x=>x.id==='SLICE-P04');
if(!p04 || p04.current_state!=='IMPLEMENTED' || p04.name!=='Credential persistence' || JSON.stringify(p04.records)!==JSON.stringify(['Credential'])) errors.push('whole-stack audit: P04 must resolve to Credential IMPLEMENTED');

const p05=r?.candidate_slices?.find(x=>x.id==='SLICE-P05');
if(!p05 || p05.current_state!=='BLOCKED' || p05.name!=='LearningSession persistence' || JSON.stringify(p05.records)!==JSON.stringify(['LearningSession']) || p05.implementation_authorized!==false) errors.push('whole-stack audit: P05 must resolve to LearningSession BLOCKED');

if(p04Implementation?.version!=='1.0.0' || p04Implementation?.status!=='proven' || p04Implementation?.verification?.exact_head_ci!=='PASS') errors.push('whole-stack audit: P04 implementation evidence must remain PROVEN');
if(p05Admission?.version!=='1.1.0' || p05Admission?.decision!=='BLOCK' || p05Admission?.implementation_authorized!==false) errors.push('whole-stack audit: P05 admission must fail closed');

if(r?.implementation_guard?.tables_generated!==7 || r?.implementation_guard?.migrations_generated!==4 || r?.implementation_guard?.repositories_generated!==7 || r?.implementation_guard?.implemented_slice_count!==4) errors.push('whole-stack audit: implemented artifact totals must be 7 tables / 4 migrations / 7 repositories / 4 slices');
if(r?.implementation_guard?.shared_or_production_migration_execution_authorized!==false || r?.implementation_guard?.full_relational_schema_authorized!==false) errors.push('whole-stack audit: production/full relational schema execution must remain blocked');

if(errors.length){
  console.error(`POST-CLOSURE WHOLE-STACK AUDIT FAILED (${errors.length} problem${errors.length===1?'':'s'}):`);
  for(const e of errors) console.error(`- ${e}`);
  process.exit(1);
}

console.log('POST-CLOSURE WHOLE-STACK AUDIT PASS');
console.log('PROVEN: K00 0.16.0 semantic counts');
console.log('PROVEN: P01-P04 implementation state');
console.log('PROVEN totals: 7 tables / 4 migrations / 7 repositories / 4 implemented slices');
console.log('BLOCKED: P05 LearningSession schema admission');
console.log('UNKNOWN: LearningSessionUsesAssignment physical nullability/requiredness pending #47');
console.log('BLOCKED: shared/production migration execution');
