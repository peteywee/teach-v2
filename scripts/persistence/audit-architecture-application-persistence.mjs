#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { resolve, join } from 'node:path';

const ROOT=resolve(process.cwd());
const errors=[];
const load=(p)=>{ try{return JSON.parse(readFileSync(join(ROOT,p),'utf8'));}catch(e){errors.push(`${p}: ${e.message}`);return null;} };

const arch=load('architecture/authority.json');
const app=load('application-interfaces/authority.json');
const per=load('persistence/authority.json');
const proposal=load('persistence/proposed.json');
const m=load('kernel/manifest.json');
const entities=load('kernel/entities.json');
const ids=load('kernel/identifiers.json');
const states=load('kernel/states.json');
const rel=load('kernel/relationships.json');
const events=load('kernel/events.json');
const inv=load('kernel/invariants.json');
const dt=load('kernel/decision-tables.json');
const gaps=load('domains/discovery-gaps.json');

if (arch?.version!=='1.0.0' || arch?.status!=='active') errors.push('persistence audit: Architecture 1.0.0 missing');
if (app?.version!=='1.0.0' || app?.status!=='active') errors.push('persistence audit: Application Interfaces 1.0.0 missing');
if (per?.version!=='1.0.0' || per?.status!=='active') errors.push('persistence audit: Persistence Model 1.0.0 missing');
if (proposal?.version!=='0.1.0' || proposal?.status!=='proposed') errors.push('persistence audit: historical proposal must remain proposed');
if (m?.version!=='0.15.0') errors.push(`persistence audit: K00 drifted to ${m?.version}`);

const counts={
  approvedEntities:(entities?.entries||[]).filter(x=>x.status==='approved').length,
  approvedIds:(ids?.entries||[]).filter(x=>x.status==='approved').length,
  candidateStates:(states?.entries||[]).filter(x=>x.status==='candidate').length,
  candidateRelationships:(rel?.entries||[]).filter(x=>x.status==='candidate').length,
  candidateEvents:(events?.entries||[]).filter(x=>x.status==='candidate').length,
  candidateInvariants:(inv?.entries||[]).filter(x=>x.status==='candidate').length,
  candidateDecisions:(dt?.entries||[]).filter(x=>x.status==='candidate').length,
  gaps:(gaps?.core_missing_kernel_candidates||[]).length,
};
const expected={approvedEntities:13,approvedIds:12,candidateStates:2,candidateRelationships:8,candidateEvents:10,candidateInvariants:22,candidateDecisions:8,gaps:9};
for (const [k,v] of Object.entries(expected)) if (counts[k]!==v) errors.push(`persistence audit: ${k} expected ${v}, found ${counts[k]}`);

if (per?.full_relational_schema_status!=='BLOCKED' || per?.migration_implementation_status!=='BLOCKED') errors.push('persistence audit: physical implementation was unblocked by policy approval');

if (errors.length) {
  console.error(`ARCHITECTURE/APPLICATION/PERSISTENCE AUTHORITY AUDIT FAILED (${errors.length} problem${errors.length===1?'':'s'}):`);
  for (const e of errors) console.error(`- ${e}`);
  process.exit(1);
}
console.log('ARCHITECTURE/APPLICATION/PERSISTENCE AUTHORITY AUDIT PASS');
console.log('PROVEN: Architecture 1.0.0 active');
console.log('PROVEN: Application Interfaces 1.0.0 active');
console.log('PROVEN: Persistence Model 1.0.0 active');
console.log('PROVEN: K00 semantic counts reconciled after SLICE-P01 relationship promotion');
console.log('BLOCKED: full relational schema and migrations');
