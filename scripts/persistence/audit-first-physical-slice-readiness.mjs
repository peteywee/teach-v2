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
const implementation=load('persistence/physical-slices/transaction-control/implementation.json');

if (m?.version!=='0.16.0') errors.push('whole-stack audit: K00 must be 0.16.0');
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
for(const [name,a,e] of checks) if(a!==e) errors.push(`whole-stack audit: ${name} expected ${e}, found ${a}`);
if (r?.version!=='1.2.0' || r?.current_admitted_slice_count!==3 || !r?.current_physical_slice_admissions?.some(x=>x.id==='SLICE-P01') || !r?.current_physical_slice_admissions?.some(x=>x.id==='SLICE-P02')) errors.push('whole-stack audit: expected P01 and P02 admitted at readiness 1.0.0');
if (r?.candidate_slices?.find(x=>x.id==='SLICE-P01')?.current_state!=='IMPLEMENTED') errors.push('whole-stack audit: SLICE-P01 must be IMPLEMENTED');
const p02=r?.candidate_slices?.find(x=>x.id==='SLICE-P02');
if (!p02 || p02.current_state!=='ADMITTED' || (p02.blockers_removed_by_owner_decisions||[]).length!==3 || (p02.blockers||[]).length!==0 || r?.current_physical_slice_admissions?.find(x=>x.id==='SLICE-P02')?.implementation_state!=='IMPLEMENTED') errors.push('whole-stack audit: P02 admission and IMPLEMENTED evidence must be preserved');
const p03=r?.candidate_slices?.find(x=>x.id==='SLICE-P03');
if (!p03 || p03.current_state!=='ADMITTED' || p03.implementation_authorized!==true || (p03.blockers||[]).length!==0) errors.push('whole-stack audit: P03 must be admitted and implementation-authorized');
if (implementation?.version!=='1.0.0' || implementation?.status!=='recorded' || implementation?.verification?.migration_determinism!=='PROVEN') errors.push('whole-stack audit: verified implementation evidence missing');
if (r?.implementation_guard?.tables_generated!==6 || r?.implementation_guard?.migrations_generated!==3 || r?.implementation_guard?.repositories_generated!==6) errors.push('whole-stack audit: implemented artifact counts must be 6/3/6');

if(errors.length){
 console.error(`POST-CLOSURE WHOLE-STACK AUDIT FAILED (${errors.length} problem${errors.length===1?'':'s'}):`);
 for(const e of errors) console.error(`- ${e}`);
 process.exit(1);
}
console.log('POST-CLOSURE WHOLE-STACK AUDIT PASS');
console.log('PROVEN: K00 0.16.0 exact promotion counts');
console.log('PROVEN: SLICE-P01 physical schema admitted and implementation verified');
console.log('PROVEN: SLICE-P02 physical schema admitted');
console.log('PENDING: SLICE-P02 implementation evidence');
console.log('BLOCKED: full relational schema and shared/production migration execution');
console.log('NEXT: implement P02 and prove acceptance evidence');
