#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = resolve(process.cwd());
const errors = [];
const load = (p) => {
  try { return JSON.parse(readFileSync(join(ROOT, p), 'utf8')); }
  catch (e) { errors.push(`${p}: ${e.message}`); return null; }
};

const proposal = load('domains/decisions/proposed.json');
const registration = load('domains/decisions/registration.json');
const kernelTables = load('kernel/decision-tables.json');
const manifest = load('kernel/manifest.json');
const ownership = load('domains/ownership-map.json');
const invariants = load('kernel/invariants.json');

if (manifest?.version !== '0.16.0') errors.push(`decision discovery: expected K00 0.16.0, found ${manifest?.version}`);
if (ownership?.version !== '1.7.0' || ownership?.status !== 'active') errors.push('decision discovery: expected active Domain Ownership Map 1.7.0');
if ((invariants?.entries || []).length !== 22) errors.push('decision discovery: expected 22 registered invariant candidates');

if (proposal) {
  if (proposal.decision_table_discovery_id !== 'TEACH-DECISION-TABLE-DISCOVERY') errors.push('decision discovery: wrong id');
  if (proposal.version !== '0.1.0') errors.push('decision discovery: version must be 0.1.0');
  if (proposal.status !== 'proposed') errors.push('decision discovery: status must remain proposed');
  if (!/^[0-9a-f]{40}$/.test(proposal.baseline?.commit || '')) errors.push('decision discovery: baseline commit must be exact SHA');
}

const domainIds = new Set((ownership?.domains || []).map(x => x.id));
const ready = proposal?.ready_decision_tables || [];
const blocked = proposal?.blocked_decision_tables || [];
const ids = new Set();

for (const dt of ready) {
  if (!/^DT-\d{3}$/.test(dt.id || '')) errors.push(`ready decision table invalid id ${dt.id}`);
  if (ids.has(dt.id)) errors.push(`duplicate decision table ${dt.id}`);
  ids.add(dt.id);
  if (dt.status !== 'proposed') errors.push(`${dt.id}: status must be proposed`);
  if (!domainIds.has(dt.owning_domain)) errors.push(`${dt.id}: unknown owner ${dt.owning_domain}`);
  if (!Array.isArray(dt.authority_contracts) || !dt.authority_contracts.length) errors.push(`${dt.id}: authority_contracts required`);
  if (!Array.isArray(dt.requirements) || !dt.requirements.length) errors.push(`${dt.id}: requirements required`);
  if (!Array.isArray(dt.inputs) || !dt.inputs.length) errors.push(`${dt.id}: inputs required`);
  if (!Array.isArray(dt.rules) || !dt.rules.length) errors.push(`${dt.id}: rules required`);
  if (!dt.default_outcome) errors.push(`${dt.id}: default_outcome required`);
  if (!dt.failure_behavior) errors.push(`${dt.id}: failure_behavior required`);
}

for (const dt of blocked) {
  if (!/^DT-B\d{2}$/.test(dt.id || '')) errors.push(`blocked decision table invalid id ${dt.id}`);
  if (ids.has(dt.id)) errors.push(`duplicate decision table ${dt.id}`);
  ids.add(dt.id);
  if (dt.evidence_state !== 'BLOCKED') errors.push(`${dt.id}: must remain BLOCKED`);
  if (!Array.isArray(dt.blocked_by) || !dt.blocked_by.length) errors.push(`${dt.id}: blocked_by required`);
}

if (ready.length !== 8) errors.push(`decision discovery: expected 8 ready, found ${ready.length}`);
if (blocked.length !== 3) errors.push(`decision discovery: expected 3 blocked, found ${blocked.length}`);

if (registration) {
  if (registration.version !== '1.0.0') errors.push('decision registration: version must be 1.0.0');
  if (registration.status !== 'recorded') errors.push('decision registration: status must be recorded');
  if (registration.kernel_version !== '0.6.0') errors.push('decision registration: kernel_version must be 0.6.0');
  if (registration.ownership_map_version !== '1.3.0') errors.push('decision registration: ownership_map_version must be 1.3.0');
  if (registration.candidate_to_approved_promotions !== 0) errors.push('decision registration: promotions must remain zero');
}
const readyIds = new Set(ready.map(x => x.id));
const blockedIds = new Set(blocked.map(x => x.id));
const kernelEntries = kernelTables?.entries || [];
const kernelIds = new Set(kernelEntries.map(x => x.id));
for (const id of readyIds) if (!kernelIds.has(id)) errors.push(`decision registration: ready table ${id} missing from K00`);
for (const id of kernelIds) if (!readyIds.has(id)) errors.push(`decision registration: unexpected K00 table ${id}`);
for (const id of blockedIds) if (kernelIds.has(id)) errors.push(`decision registration: blocked table ${id} must remain outside K00`);
for (const dt of kernelEntries) if (dt.status !== 'candidate') errors.push(`decision registration: ${dt.id} must remain candidate`);


if (errors.length) {
  console.error(`Decision-table discovery FAILED (${errors.length} problem${errors.length===1?'':'s'}):`);
  for (const e of errors) console.error(`- ${e}`);
  process.exit(1);
}

console.log('Decision-table registration PASS');
console.log(`Registered candidate decision tables: ${(kernelTables?.entries || []).length}`);
console.log(`Blocked decision tables excluded: ${blocked.length}`);
console.log('Candidate-to-approved promotions: 0');
