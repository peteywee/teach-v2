#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
const ROOT=resolve(process.cwd());
const errors=[];
const load=(p)=>{ try{return JSON.parse(readFileSync(join(ROOT,p),'utf8'));}catch(e){errors.push(`${p}: ${e.message}`);return null;} };
const d=load('application-interfaces/discovery.json');
const commands=load('kernel/commands.json');
const a=load('architecture/authority.json');

if (!a || a.version!=='1.0.0' || a.status!=='active') errors.push('application discovery: active Architecture 1.0.0 required');
const approved=(commands?.entries||[]).filter(x=>x.status==='approved');
if (approved.length!==23) errors.push(`application discovery: expected 23 approved commands, found ${approved.length}`);

if (d) {
  if (d.discovery_id!=='TEACH-APPLICATION-INTERFACE-DISCOVERY' || d.version!=='0.1.0' || d.status!=='recorded') errors.push('application discovery: wrong identity/state');
  if (d.command_inventory?.total!==23) errors.push('application discovery: command total must be 23');
  const coverage=d.command_coverage||[];
  if (coverage.length!==23) errors.push(`application discovery: coverage must contain 23 commands, found ${coverage.length}`);
  const ids=coverage.map(x=>x.command);
  if (new Set(ids).size!==23) errors.push('application discovery: duplicate command coverage');
  for (const c of approved) {
    const x=coverage.find(v=>v.command===c.id);
    if (!x) errors.push(`application discovery: missing command ${c.id}`);
    else if (x.owning_domain!==c.owning_domain) errors.push(`application discovery: ${c.id} owner mismatch`);
  }
  const orchestration=d.contract_required_cross_domain_orchestration||[];
  for (const id of ['AcceptInvitation','OffboardIdentity']) {
    if (!orchestration.find(x=>x.source_command===id)) errors.push(`application discovery: missing orchestration for ${id}`);
  }
  if (d.readiness?.application_interface_approval!=='BLOCKED') errors.push('application discovery: approval must remain BLOCKED');
}
if (errors.length) {
  console.error(`Application interface discovery FAILED (${errors.length} problem${errors.length===1?'':'s'}):`);
  for (const e of errors) console.error(`- ${e}`);
  process.exit(1);
}
console.log('Application interface discovery PASS');
console.log('Approved command coverage: 23/23');
console.log('Cross-domain orchestrations: 2');
console.log('Interface approval: BLOCKED');
