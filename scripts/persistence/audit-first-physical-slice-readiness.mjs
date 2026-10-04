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

if (m?.version!=='0.14.0') errors.push('whole-stack audit: K00 must be 0.14.0');
const checks=[
 ['commands-approved',(commands?.entries||[]).filter(x=>x.status==='approved').length,23],
 ['events-candidate',(events?.entries||[]).filter(x=>x.status==='candidate').length,10],
 ['ids-approved',(ids?.entries||[]).filter(x=>x.status==='approved').length,12],
 ['states-approved',(states?.entries||[]).filter(x=>x.status==='approved').length,7],
 ['states-candidate',(states?.entries||[]).filter(x=>x.status==='candidate').length,2],
 ['machines-approved',(machines?.entries||[]).filter(x=>x.status==='approved').length,7],
 ['machines-candidate',(machines?.entries||[]).filter(x=>x.status==='candidate').length,1],
 ['relationships-approved',(rel?.entries||[]).filter(x=>x.status==='approved').length,10],
 ['relationships-candidate',(rel?.entries||[]).filter(x=>x.status==='candidate').length,8],
 ['invariants-candidate',(inv?.entries||[]).filter(x=>x.status==='candidate').length,22],
 ['decision-tables-candidate',(dt?.entries||[]).filter(x=>x.status==='candidate').length,8],
];
for(const [name,a,e] of checks) if(a!==e) errors.push(`whole-stack audit: ${name} expected ${e}, found ${a}`);
if (r?.current_admitted_slice_count!==0) errors.push('whole-stack audit: physical slice admitted prematurely');

if(errors.length){
 console.error(`POST-CLOSURE WHOLE-STACK AUDIT FAILED (${errors.length} problem${errors.length===1?'':'s'}):`);
 for(const e of errors) console.error(`- ${e}`);
 process.exit(1);
}
console.log('POST-CLOSURE WHOLE-STACK AUDIT PASS');
console.log('PROVEN: K00 0.14.0 exact promotion counts');
console.log('BLOCKED: physical schema — 0 admitted slices');
console.log('NEXT: TransactionControl first-slice decision discovery');
