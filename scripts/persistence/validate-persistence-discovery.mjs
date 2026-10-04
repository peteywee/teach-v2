#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { resolve, join } from 'node:path';

const ROOT=resolve(process.cwd());
const errors=[];
const load=(p)=>{ try{return JSON.parse(readFileSync(join(ROOT,p),'utf8'));}catch(e){errors.push(`${p}: ${e.message}`);return null;} };

const d=load('persistence/discovery.json');
const m=load('kernel/manifest.json');
const app=load('application-interfaces/authority.json');
const entities=load('kernel/entities.json');
const ids=load('kernel/identifiers.json');
const rel=load('kernel/relationships.json');

if (app?.version!=='1.0.0' || app?.status!=='active') errors.push('persistence discovery: active Application Interfaces 1.0.0 required');

if (d) {
  if (d.discovery_id!=='TEACH-PERSISTENCE-MODEL-DISCOVERY' || d.version!=='0.1.0' || d.status!=='recorded') errors.push('persistence discovery: identity/state mismatch');
  if (d.inventory?.approved_entities?.length!==13) errors.push(`persistence discovery: expected 13 approved entities, found ${d.inventory?.approved_entities?.length}`);
  if (d.inventory?.candidate_entities?.length!==7) errors.push(`persistence discovery: expected 7 candidate entities, found ${d.inventory?.candidate_entities?.length}`);
  if (d.inventory?.approved_identifiers?.length!==4) errors.push(`persistence discovery: expected 4 approved identifiers, found ${d.inventory?.approved_identifiers?.length}`);
  if (d.inventory?.candidate_identifiers?.length!==19) errors.push(`persistence discovery: expected 19 candidate identifiers, found ${d.inventory?.candidate_identifiers?.length}`);
  if (d.inventory?.candidate_relationships?.length!==18) errors.push('persistence discovery: expected 18 candidate relationships');
  if ((d.hard_blockers||[]).length!==5) errors.push('persistence discovery: expected 5 hard blocker groups');
  if (d.readiness?.full_relational_schema!=='BLOCKED') errors.push('persistence discovery: full relational schema must remain BLOCKED');
  if (d.readiness?.migration_implementation!=='BLOCKED') errors.push('persistence discovery: migration implementation must remain BLOCKED');
}


if (errors.length) {
  console.error(`Persistence discovery FAILED (${errors.length} problem${errors.length===1?'':'s'}):`);
  for (const e of errors) console.error(`- ${e}`);
  process.exit(1);
}
console.log('Persistence discovery PASS');
console.log('Approved entities: 13');
console.log('Approved identifiers: 4');
console.log('Candidate relationships: 18');
console.log('Full relational schema: BLOCKED');
