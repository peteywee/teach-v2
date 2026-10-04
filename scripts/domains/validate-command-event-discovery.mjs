#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT=resolve(process.cwd());
const errors=[];
const load=(p)=>{try{return JSON.parse(readFileSync(join(ROOT,p),'utf8'));}catch(e){errors.push(`${p}: ${e.message}`);return null;}};

const proposal=load('domains/commands-events/proposed.json');
const manifest=load('kernel/manifest.json');
const ownership=load('domains/ownership-map.json');
const commands=load('kernel/commands.json');
const events=load('kernel/events.json');
const decisions=load('kernel/decision-tables.json');

if (manifest?.version !== '0.6.0') errors.push(`command/event discovery: expected K00 0.6.0, found ${manifest?.version}`);
if (ownership?.version !== '1.3.0' || ownership?.status !== 'active') errors.push('command/event discovery: expected active Domain Ownership Map 1.3.0');
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

if (commandIds.size !== 15) errors.push(`command/event discovery: expected 15 K00 commands, found ${commandIds.size}`);
if (eventIds.size !== 14) errors.push(`command/event discovery: expected 14 K00 events, found ${eventIds.size}`);
for (const id of commandIds) if (!existingCommands.has(id)) errors.push(`command/event discovery: current command ${id} missing from retained inventory`);
for (const id of existingCommands) if (!commandIds.has(id)) errors.push(`command/event discovery: retained command ${id} not in K00`);
for (const id of eventIds) if (!existingEvents.has(id)) errors.push(`command/event discovery: current event ${id} missing from retained inventory`);
for (const id of existingEvents) if (!eventIds.has(id)) errors.push(`command/event discovery: retained event ${id} not in K00`);

const proposedCommandIds=new Set();
for (const c of readyCommands) {
  if (proposedCommandIds.has(c.id)) errors.push(`command/event discovery: duplicate ready command ${c.id}`);
  proposedCommandIds.add(c.id);
  if (commandIds.has(c.id)) errors.push(`command/event discovery: ready command ${c.id} already exists in K00`);
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

if (errors.length) {
  console.error(`Command/event discovery FAILED (${errors.length} problem${errors.length===1?'':'s'}):`);
  for (const e of errors) console.error(`- ${e}`);
  process.exit(1);
}
console.log('Command/event discovery PASS');
console.log('Existing commands retained: 15');
console.log('Ready new command candidates: 7');
console.log('Blocked command candidates: 8');
console.log('Existing events retained: 14');
console.log('Ready new event candidates: 0');
console.log('Blocked event candidates: 9');
console.log('K00 command/event authority changed: no');
