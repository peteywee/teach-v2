#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { resolve, join } from 'node:path';

const ROOT=resolve(process.cwd());
const errors=[];
const load=(p)=>{ try{return JSON.parse(readFileSync(join(ROOT,p),'utf8'));}catch(e){errors.push(`${p}: ${e.message}`);return null;} };

const p=load('persistence/proposed.json');
const d=load('persistence/discovery.json');
const app=load('application-interfaces/authority.json');
const m=load('kernel/manifest.json');
const ids=load('kernel/identifiers.json');
const rel=load('kernel/relationships.json');

if (app?.version!=='1.0.0' || app?.status!=='active') errors.push('persistence proposal: active Application Interfaces 1.0.0 required');
if (d?.version!=='0.1.0' || d?.status!=='recorded') errors.push('persistence proposal: recorded discovery required');

if (p) {
  if (p.proposal_id!=='TEACH-PERSISTENCE-MODEL-PROPOSAL' || p.version!=='0.1.0' || p.status!=='proposed') errors.push('persistence proposal: identity/state mismatch');
  if (p.approval_required!==true) errors.push('persistence proposal: approval_required must be true');
  if ((p.principles||[]).length!==14) errors.push('persistence proposal: expected 14 principles');
  if ((p.logical_store_ownership||[]).length!==8) errors.push('persistence proposal: expected 8 runtime module persistence dispositions');
  if ((p.currently_admissible_logical_records||[]).length!==4) errors.push('persistence proposal: expected 4 logical-record candidates');
  if ((p.blocked_schema_groups||[]).length!==7) errors.push('persistence proposal: expected 7 blocker groups');
  if (p.schema_admission_gate?.default!=='BLOCK') errors.push('persistence proposal: schema admission must default BLOCK');
  if (p.readiness?.owner_approval!=='BLOCKED') errors.push('persistence proposal: owner approval must remain BLOCKED');
  if (p.readiness?.full_relational_schema!=='BLOCKED') errors.push('persistence proposal: full relational schema must remain BLOCKED');
  if (p.readiness?.migration_implementation!=='BLOCKED') errors.push('persistence proposal: migration implementation must remain BLOCKED');

  const forbidden=['table_name','column_name','foreign_key','create table','CREATE TABLE','migration_sql'];
  const text=JSON.stringify(p);
  for (const token of forbidden) if (text.includes(`"${token}"`)) errors.push(`persistence proposal: premature physical schema token ${token}`);
}


if (errors.length) {
  console.error(`Persistence proposal FAILED (${errors.length} problem${errors.length===1?'':'s'}):`);
  for (const e of errors) console.error(`- ${e}`);
  process.exit(1);
}
console.log('Persistence proposal PASS');
console.log('Scope: persistence authority model, not relational schema');
console.log('Owner approval: BLOCKED');
console.log('Full relational schema: BLOCKED');
console.log('Migration implementation: BLOCKED');
