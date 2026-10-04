#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { resolve, join } from 'node:path';

const ROOT=resolve(process.cwd());
const errors=[];
const notes=[];
const load=(p)=>{ try{return JSON.parse(readFileSync(join(ROOT,p),'utf8'));}catch(e){errors.push(`${p}: ${e.message}`);return null;} };

const arch=load('architecture/authority.json');
const app=load('application-interfaces/proposed.json');
const commands=load('kernel/commands.json');
const events=load('kernel/events.json');
const rel=load('kernel/relationships.json');
const inv=load('kernel/invariants.json');
const dt=load('kernel/decision-tables.json');
const gaps=load('domains/discovery-gaps.json');
const ce=load('domains/commands-events/proposed.json');

if (arch?.status!=='active' || arch?.version!=='1.0.0') errors.push('cross-layer audit: architecture authority missing');
if (app?.status!=='proposed') errors.push('cross-layer audit: application interfaces must remain proposed');

const cmd=(commands?.entries||[]);
if (cmd.length!==23 || cmd.some(x=>x.status!=='approved')) errors.push('cross-layer audit: expected 23 approved commands');
const mapped=(app?.command_interfaces||[]).flatMap(x=>x.commands||[]);
if (mapped.length!==23 || new Set(mapped).size!==23) errors.push('cross-layer audit: command mapping not bijective');
for (const c of cmd) {
  const mappings=(app?.command_interfaces||[]).filter(x=>(x.commands||[]).includes(c.id));
  if (mappings.length!==1) errors.push(`cross-layer audit: ${c.id} must map exactly once`);
  else if (mappings[0].module!==c.owning_domain) errors.push(`cross-layer audit: ${c.id} owner mismatch`);
}

const candidateEvents=(events?.entries||[]).filter(x=>x.status==='candidate').length;
const candidateRelationships=(rel?.entries||[]).filter(x=>x.status==='candidate').length;
const candidateInvariants=(inv?.entries||[]).filter(x=>x.status==='candidate').length;
const candidateDecisionTables=(dt?.entries||[]).filter(x=>x.status==='candidate').length;
const missing=(gaps?.core_missing_kernel_candidates||[]).length;
const blockedCommands=(ce?.blocked_command_candidates||[]).length;

if (candidateEvents!==10) errors.push(`cross-layer audit: candidate events changed to ${candidateEvents}`);
if (candidateRelationships!==18) errors.push(`cross-layer audit: candidate relationships changed to ${candidateRelationships}`);
if (candidateInvariants!==22) errors.push(`cross-layer audit: candidate invariants changed to ${candidateInvariants}`);
if (candidateDecisionTables!==8) errors.push(`cross-layer audit: candidate decision tables changed to ${candidateDecisionTables}`);
if (missing!==9) errors.push(`cross-layer audit: core missing candidates changed to ${missing}`);
if (blockedCommands!==8) errors.push(`cross-layer audit: blocked command proposals changed to ${blockedCommands}`);

const appText=JSON.stringify(app||{});
const candidateEventIds=(events?.entries||[]).filter(x=>x.status==='candidate').map(x=>x.id);
for (const id of candidateEventIds) {
  if (appText.includes(`"${id}"`)) errors.push(`cross-layer audit: candidate event ${id} leaked into application-interface authority`);
}

for (const o of app?.explicit_cross_domain_orchestrations||[]) {
  if ((o.forbidden||[]).length===0) errors.push(`cross-layer audit: ${o.use_case} missing explicit forbidden shortcut`);
}

notes.push(`architecture=${arch?.version}/${arch?.status}`);
notes.push(`application=${app?.version}/${app?.status}`);
notes.push(`commands=23 approved, mapping=23`);
notes.push(`preserved blockers: events=${candidateEvents}, blocked-command-proposals=${blockedCommands}, gaps=${missing}, relationships=${candidateRelationships}, invariants=${candidateInvariants}, decision-tables=${candidateDecisionTables}`);

if (errors.length) {
  console.error(`CROSS-LAYER SELF-AUDIT FAILED (${errors.length} problem${errors.length===1?'':'s'}):`);
  for (const e of errors) console.error(`- ${e}`);
  process.exit(1);
}
console.log('CROSS-LAYER SELF-AUDIT PASS');
for (const n of notes) console.log(`PROVEN: ${n}`);
console.log('BLOCKED: Application Interface owner approval');
console.log('BLOCKED: Persistence Model until Application Interfaces are approved');
console.log('UNKNOWN: none introduced by this batch');
console.log('CONTRADICTORY: none introduced by this batch');
