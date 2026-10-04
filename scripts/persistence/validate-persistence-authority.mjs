#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { resolve, join } from 'node:path';

const ROOT=resolve(process.cwd());
const errors=[];
const load=(p)=>{ try{return JSON.parse(readFileSync(join(ROOT,p),'utf8'));}catch(e){errors.push(`${p}: ${e.message}`);return null;} };

const a=load('persistence/authority.json');
const p=load('persistence/proposed.json');
const d=load('persistence/discovery.json');
const app=load('application-interfaces/authority.json');
const arch=load('architecture/authority.json');
const m=load('kernel/manifest.json');
const ids=load('kernel/identifiers.json');
const rel=load('kernel/relationships.json');

if (m?.version!=='0.16.0') errors.push(`persistence authority: expected K00 0.16.0, found ${m?.version}`);
if (arch?.version!=='1.0.0' || arch?.status!=='active') errors.push('persistence authority: Architecture 1.0.0 required');
if (app?.version!=='1.0.0' || app?.status!=='active') errors.push('persistence authority: Application Interfaces 1.0.0 required');
if (d?.version!=='0.1.0' || d?.status!=='recorded') errors.push('persistence authority: discovery 0.1.0 required');
if (p?.version!=='0.1.0' || p?.status!=='proposed') errors.push('persistence authority: preserved proposal 0.1.0 required');

if (a) {
  if (a.authority_id!=='TEACH-PERSISTENCE-MODEL' || a.version!=='1.0.0' || a.status!=='active') errors.push('persistence authority: wrong identity/state');
  if (!/^#(?:\d+|REHEARSAL)$/.test(a.approval_issue||'')) errors.push('persistence authority: invalid approval issue');
  if ((a.principles||[]).length!==14) errors.push('persistence authority: expected 14 principles');
  if (a.schema_admission_gate?.default!=='BLOCK') errors.push('persistence authority: schema admission must default BLOCK');
  if ((a.currently_admissible_logical_records||[]).length!==4) errors.push('persistence authority: expected 4 currently admissible logical-record classes');
  if ((a.blocked_schema_groups||[]).length!==7) errors.push('persistence authority: expected 7 blocker groups');
  if (a.next_stage!=='Persistence Semantic Closure') errors.push('persistence authority: next stage must be Persistence Semantic Closure');
  if (a.full_relational_schema_status!=='BLOCKED') errors.push('persistence authority: full relational schema must remain BLOCKED');
  if (a.migration_implementation_status!=='BLOCKED') errors.push('persistence authority: migration implementation must remain BLOCKED');
}

if ((ids?.entries||[]).filter(x=>x.status==='approved').length!==15) errors.push('persistence authority: identifier promotions occurred unexpectedly');
if ((rel?.entries||[]).filter(x=>x.status==='approved').length!==15) errors.push('persistence authority: relationship promotions occurred unexpectedly');

if (errors.length) {
  console.error(`Persistence authority FAILED (${errors.length} problem${errors.length===1?'':'s'}):`);
  for (const e of errors) console.error(`- ${e}`);
  process.exit(1);
}
console.log('Persistence authority PASS');
console.log('Persistence Model: active 1.0.0');
console.log('Schema admission default: BLOCK');
console.log('Full relational schema: BLOCKED');
console.log('Migrations: BLOCKED');
console.log('Next stage: Persistence Semantic Closure');
