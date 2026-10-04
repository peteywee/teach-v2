#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = resolve(process.cwd());
const errors = [];
const load = (p) => {
  try { return JSON.parse(readFileSync(join(ROOT, p), 'utf8')); }
  catch (e) { errors.push(`${p}: ${e.message}`); return null; }
};

const proposal = load('domains/invariants/proposed.json');
const registration = load('domains/invariants/registration.json');
const kernelInvariants = load('kernel/invariants.json');
const manifest = load('kernel/manifest.json');
const ownership = load('domains/ownership-map.json');
const machines = load('kernel/state-machines.json');

if (proposal) {
  if (proposal.invariant_discovery_id !== 'TEACH-INVARIANT-DISCOVERY') errors.push('invariant discovery: wrong id');
  if (proposal.version !== '0.1.0') errors.push('invariant discovery: version must be 0.1.0');
  if (proposal.status !== 'proposed') errors.push('invariant discovery: status must remain proposed');
  if (proposal.baseline?.commit !== '0d0da31243b78f83aac66e21733fc0b9a2371f83') errors.push('invariant discovery: baseline mismatch');
}

if (manifest?.version !== '0.6.0') errors.push(`invariant registration: expected K00 0.6.0, found ${manifest?.version}`);
if (ownership?.version !== '1.3.0' || ownership?.status !== 'active') errors.push('invariant registration: requires active Domain Ownership Map 1.3.0');
if ((machines?.entries || []).length !== 4) errors.push('invariant discovery: expected 4 registered state machines');

const ready = proposal?.ready_invariants || [];
const blocked = proposal?.blocked_invariants || [];
const ids = new Set();

for (const inv of ready) {
  if (!/^INV-\d{3}$/.test(inv.id || '')) errors.push(`ready invariant invalid id ${inv.id}`);
  if (ids.has(inv.id)) errors.push(`duplicate invariant ${inv.id}`);
  ids.add(inv.id);
  if (inv.evidence_state !== 'PROVEN') errors.push(`${inv.id}: ready invariant must be PROVEN`);
  if (!Array.isArray(inv.authority_contracts) || !inv.authority_contracts.length) errors.push(`${inv.id}: authority_contracts required`);
  if (!Array.isArray(inv.requirements) || !inv.requirements.length) errors.push(`${inv.id}: requirements required`);
  if (!inv.assertion) errors.push(`${inv.id}: assertion required`);
  if (!inv.failure_behavior) errors.push(`${inv.id}: failure_behavior required`);
}

for (const inv of blocked) {
  if (!/^INV-B\d{2}$/.test(inv.id || '')) errors.push(`blocked invariant invalid id ${inv.id}`);
  if (ids.has(inv.id)) errors.push(`duplicate invariant ${inv.id}`);
  ids.add(inv.id);
  if (!['BLOCKED','UNKNOWN','CONTRADICTORY'].includes(inv.evidence_state)) errors.push(`${inv.id}: blocked invariant cannot be ${inv.evidence_state}`);
  if (!Array.isArray(inv.blocked_by) || !inv.blocked_by.length) errors.push(`${inv.id}: blocked_by required`);
  if (!inv.reason) errors.push(`${inv.id}: reason required`);
}

if (ready.length !== 22) errors.push(`invariant discovery: expected 22 ready invariants, found ${ready.length}`);
if (blocked.length !== 5) errors.push(`invariant discovery: expected 5 blocked invariants, found ${blocked.length}`);

if (registration) {
  if (registration.version !== '1.0.0') errors.push('invariant registration: version must be 1.0.0');
  if (registration.status !== 'recorded') errors.push('invariant registration: status must be recorded');
  if (registration.kernel_version !== '0.5.0') errors.push('invariant registration: kernel_version must be 0.5.0');
  if (registration.ownership_map_version !== '1.2.0') errors.push('invariant registration: ownership_map_version must be 1.2.0');
  if (registration.candidate_to_approved_promotions !== 0) errors.push('invariant registration: promotions must remain zero');
}

const readyIds = new Set(ready.map(x => x.id));
const blockedIds = new Set(blocked.map(x => x.id));
const kernelEntries = kernelInvariants?.entries || [];
const kernelIds = new Set(kernelEntries.map(x => x.id));

for (const id of readyIds) if (!kernelIds.has(id)) errors.push(`invariant registration: ready invariant ${id} missing from K00`);
for (const id of kernelIds) if (!readyIds.has(id)) errors.push(`invariant registration: unexpected K00 invariant ${id}`);
for (const id of blockedIds) if (kernelIds.has(id)) errors.push(`invariant registration: blocked invariant ${id} must remain outside K00`);

for (const inv of kernelEntries) {
  if (inv.status !== 'candidate') errors.push(`invariant registration: ${inv.id} must remain candidate`);
  const discovered = ready.find(x => x.id === inv.id);
  const expectedOwner = discovered?.owning_domain === 'cross-cutting' ? 'Governance' : discovered?.owning_domain;
  if (inv.owning_domain !== expectedOwner) errors.push(`invariant registration: ${inv.id} owner ${inv.owning_domain} != ${expectedOwner}`);
}

const domainIds = new Set((ownership?.domains || []).map(x => x.id));
if (!domainIds.has('Governance')) errors.push('invariant registration: Governance semantic domain missing');
for (const inv of kernelEntries) if (!domainIds.has(inv.owning_domain)) errors.push(`invariant registration: ${inv.id} owner domain ${inv.owning_domain} not registered`);


if (errors.length) {
  console.error(`Invariant discovery FAILED (${errors.length} problem${errors.length===1?'':'s'}):`);
  for (const e of errors) console.error(`- ${e}`);
  process.exit(1);
}

console.log('Invariant registration PASS');
console.log(`Registered candidate invariants: ${(kernelInvariants?.entries || []).length}`);
console.log(`Blocked invariants excluded: ${blocked.length}`);
console.log('Governance semantic domain: registered');
console.log('Candidate-to-approved promotions: 0');
