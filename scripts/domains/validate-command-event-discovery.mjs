#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT=resolve(process.cwd());
const errors=[];
const load=(p)=>{try{return JSON.parse(readFileSync(join(ROOT,p),'utf8'));}catch(e){errors.push(`${p}: ${e.message}`);return null;}};

const proposal=load('domains/commands-events/proposed.json');
const registration=load('domains/commands-events/command-registration.json');
const eventAdmission=load('domains/commands-events/event-admission.json');
const manifest=load('kernel/manifest.json');
const ownership=load('domains/ownership-map.json');
const commands=load('kernel/commands.json');
const events=load('kernel/events.json');
const decisions=load('kernel/decision-tables.json');

if (manifest?.version !== '0.8.0') errors.push(`command/event discovery: expected K00 0.8.0, found ${manifest?.version}`);
if (ownership?.version !== '1.4.0' || ownership?.status !== 'active') errors.push('command/event discovery: expected active Domain Ownership Map 1.4.0');
if ((decisions?.entries || []).length !== 8) errors.push('command/event discovery: expected 8 registered decision tables');
if (proposal?.version !== '0.1.0' || proposal?.status !== 'proposed') errors.push('command/event discovery: proposal must be proposed 0.1.0');
if (!/^[0-9a-f]{40}$/.test(proposal?.baseline?.commit || '')) errors.push('command/event discovery: exact baseline SHA required');

const commandIds=new Set((commands?.entries||[]).map(x=>x.id));
const eventIds=new Set((events?.entries||[]).map(x=>x.id));
const existingCommands=new Set(proposal?.existing_registered_commands||[]);
const existingEvents=new Set(proposal?.existing_registered_events||[]);
const readyCommands=proposal?.ready_command_candidates||[];
const blockedCommands=proposal?.blocked_command_candidates||[];
const readyEvents=proposal?.ready_event_candidates||[];
const blockedEvents=proposal?.blocked_event_candidates||[];

if (commandIds.size !== 22) errors.push(`command registration: expected 22 K00 commands, found ${commandIds.size}`);
if (eventIds.size !== 14) errors.push(`command/event discovery: expected 14 K00 events, found ${eventIds.size}`);
// current K00 contains retained commands plus registered ready commands
for (const id of existingCommands) if (!commandIds.has(id)) errors.push(`command/event discovery: retained command ${id} not in K00`);
for (const id of eventIds) if (!existingEvents.has(id)) errors.push(`command/event discovery: current event ${id} missing from retained inventory`);
for (const id of existingEvents) if (!eventIds.has(id)) errors.push(`command/event discovery: retained event ${id} not in K00`);

const proposedCommandIds=new Set();
for (const c of readyCommands) {
  if (proposedCommandIds.has(c.id)) errors.push(`command/event discovery: duplicate ready command ${c.id}`);
  proposedCommandIds.add(c.id);
  if (!commandIds.has(c.id)) errors.push(`command registration: ready command ${c.id} missing from K00`);
  if (!c.owning_domain || !Array.isArray(c.authority_contracts) || !c.authority_contracts.length || !Array.isArray(c.requirements) || !c.requirements.length || !c.reason) errors.push(`command/event discovery: incomplete ready command ${c.id}`);
}
for (const c of blockedCommands) {
  if (!Array.isArray(c.blocked_by) || !c.blocked_by.length) errors.push(`command/event discovery: blocked command ${c.id} missing blockers`);
}
for (const e of readyEvents) if (eventIds.has(e.id)) errors.push(`command/event discovery: ready event ${e.id} already exists in K00`);
for (const e of blockedEvents) if (!Array.isArray(e.blocked_by) || !e.blocked_by.length) errors.push(`command/event discovery: blocked event ${e.id} missing blockers`);

if (readyCommands.length !== 7) errors.push(`command/event discovery: expected 7 ready commands, found ${readyCommands.length}`);
if (blockedCommands.length !== 8) errors.push(`command/event discovery: expected 8 blocked commands, found ${blockedCommands.length}`);
if (readyEvents.length !== 0) errors.push(`command/event discovery: expected 0 ready events, found ${readyEvents.length}`);
if (blockedEvents.length !== 9) errors.push(`command/event discovery: expected 9 blocked events, found ${blockedEvents.length}`);
if (registration) {
  if (registration.version !== '1.0.0') errors.push('command registration: version must be 1.0.0');
  if (registration.status !== 'recorded') errors.push('command registration: status must be recorded');
  if (registration.kernel_version !== '0.7.0') errors.push('command registration: kernel_version must be 0.7.0');
  if (registration.ownership_map_version !== '1.4.0') errors.push('command registration: ownership_map_version must be 1.4.0');
  if (registration.events_added !== 0) errors.push('command registration: events_added must be 0');
  if (registration.candidate_to_approved_promotions !== 0) errors.push('command registration: promotions must remain zero');
}
for (const c of blockedCommands) if (commandIds.has(c.id)) errors.push(`command registration: blocked command ${c.id} must remain outside K00`);
for (const e of blockedEvents) if (eventIds.has(e.id)) errors.push(`command registration: blocked event ${e.id} must remain outside K00`);
if (eventAdmission) {
  if (eventAdmission.version !== '1.0.0') errors.push('event admission: version must be 1.0.0');
  if (eventAdmission.status !== 'recorded') errors.push('event admission: status must be recorded');
  if (eventAdmission.kernel_version !== '0.8.0') errors.push('event admission: kernel_version must be 0.8.0');
  if (eventAdmission.new_events_registered?.length !== 0) errors.push('event admission: new event list must be empty');
  if (eventAdmission.discovery_event_disposition?.length !== 9) errors.push('event admission: expected disposition for 9 discovery event names');
  if (eventAdmission.events_gate !== 'closed-for-current-baseline') errors.push('event admission: events gate must be closed for current baseline');
  for (const d of eventAdmission.discovery_event_disposition || []) if (d.disposition !== 'NOT_ADMITTED') errors.push(`event admission: ${d.id} disposition must be NOT_ADMITTED`);
}
if (manifest?.rules?.audit_record_implies_domain_event !== false) errors.push('event admission: audit record must not imply domain event');
if (manifest?.rules?.state_transition_implies_event !== false) errors.push('event admission: state transition must not imply event');
if (manifest?.rules?.event_registration_requires_explicit_contract_semantics !== true) errors.push('event admission: explicit contract semantics rule missing');

if (errors.length) {
  console.error(`Command/event discovery FAILED (${errors.length} problem${errors.length===1?'':'s'}):`);
  for (const e of errors) console.error(`- ${e}`);
  process.exit(1);
}
console.log('Command registration + event admission PASS');
console.log('Existing commands retained: 15');
console.log('New command candidates registered: 7');
console.log('Total K00 commands: 22');
console.log('Blocked command candidates excluded: 8');
console.log('K00 events unchanged: 14');
console.log('Events gate: closed for current semantic baseline');
console.log('Blocked event candidates excluded: 9');
console.log('Candidate-to-approved promotions: 0');
