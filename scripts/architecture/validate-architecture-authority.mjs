#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT=resolve(process.cwd());
const errors=[];
const load=(p)=>{
  try { return JSON.parse(readFileSync(join(ROOT,p),'utf8')); }
  catch(e){ errors.push(`${p}: ${e.message}`); return null; }
};
const a=load('architecture/authority.json');
const p=load('architecture/proposed.json');
const d=load('architecture/discovery.json');
const manifest=load('kernel/manifest.json');
const events=load('kernel/events.json');
const relationships=load('kernel/relationships.json');
const invariants=load('kernel/invariants.json');
const decisions=load('kernel/decision-tables.json');
const gaps=load('domains/discovery-gaps.json');

if (manifest?.version!=='0.13.0') errors.push(`architecture authority: expected K00 0.13.0, found ${manifest?.version}`);
if (!d || d.status!=='recorded') errors.push('architecture authority: recorded discovery required');
if (!p || p.status!=='proposed') errors.push('architecture authority: preserved proposal required');
if (a) {
  if (a.architecture_id!=='TEACH-ARCHITECTURE' || a.version!=='1.0.0' || a.status!=='active') errors.push('architecture authority: must be active 1.0.0');
  const modules=a.topology?.runtime_domain_modules||[];
  const expected=['Identity','Organization','Authorization','Content','Learning','Certification','AuditLifecycle','TransactionControl'];
  if (JSON.stringify(modules)!==JSON.stringify(expected)) errors.push('architecture authority: runtime modules drifted');
  if ((a.topology?.support_planes||[]).length!==3) errors.push('architecture authority: expected 3 support planes');
  if ((a.rules||[]).length!==13) errors.push('architecture authority: expected 13 rules');
  if (a.next_stage!=='Application Interfaces') errors.push('architecture authority: next stage must be Application Interfaces');
}
if ((events?.entries||[]).filter(x=>x.status==='candidate').length!==10) errors.push('architecture authority: candidate event count must remain 10');
if ((relationships?.entries||[]).filter(x=>x.status==='candidate').length!==18) errors.push('architecture authority: candidate relationship count must remain 18');
if ((invariants?.entries||[]).filter(x=>x.status==='candidate').length!==22) errors.push('architecture authority: candidate invariant count must remain 22');
if ((decisions?.entries||[]).filter(x=>x.status==='candidate').length!==8) errors.push('architecture authority: candidate decision-table count must remain 8');
if ((gaps?.core_missing_kernel_candidates||[]).length!==9) errors.push('architecture authority: remaining core gap count must remain 9');

if (errors.length) {
  console.error(`Architecture authority FAILED (${errors.length} problem${errors.length===1?'':'s'}):`);
  for (const e of errors) console.error(`- ${e}`);
  process.exit(1);
}
console.log('Architecture authority PASS');
console.log('Architecture: active 1.0.0');
console.log('Runtime modules: 8');
console.log('Support planes: 3');
console.log('Candidate semantics preserved outside authority');
