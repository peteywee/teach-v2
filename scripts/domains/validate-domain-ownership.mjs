#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = resolve(process.cwd());
const errors = [];
const load = (p) => {
  try { return JSON.parse(readFileSync(join(ROOT, p), 'utf8')); }
  catch (e) { errors.push(`${p}: ${e.message}`); return null; }
};

const map = load('domains/ownership-map.json');
const gaps = load('domains/discovery-gaps.json');
const files = {
  entity: load('kernel/entities.json'),
  identifier: load('kernel/identifiers.json'),
  value_object: load('kernel/values.json'),
  state_set: load('kernel/states.json'),
  state_machine: load('kernel/state-machines.json'),
  invariant: load('kernel/invariants.json'),
  decision_table: load('kernel/decision-tables.json'),
  relationship: load('kernel/relationships.json'),
  command: load('kernel/commands.json'),
  event: load('kernel/events.json')
};

if (map) {
  if (map.map_id !== 'TEACH-DOMAIN-OWNERSHIP') errors.push('ownership map: map_id must be TEACH-DOMAIN-OWNERSHIP');
  if (map.version !== '1.7.0') errors.push('ownership map: version must be 1.7.0');
  if (map.status !== 'active') errors.push('ownership map: approved map must be active');
}

const domainIds = new Set((map?.domains || []).map(d => d.id));
const mapKeys = new Map();
for (const e of map?.entries || []) {
  const key = `${e.kind}:${e.id}`;
  if (mapKeys.has(key)) errors.push(`ownership map: duplicate ${key}`);
  mapKeys.set(key, e);
  if (e.decision_state !== 'approved') errors.push(`ownership map: ${key} must be approved`);
  if (!e.proposed_owner) errors.push(`ownership map: ${key} approved without owner`);
  else if (!domainIds.has(e.proposed_owner)) errors.push(`ownership map: ${key} owner ${e.proposed_owner} is not a registered domain`);
}

const kernelKeys = new Set();
for (const [kind, doc] of Object.entries(files)) {
  for (const e of doc?.entries || []) {
    const key = `${kind}:${e.id}`;
    kernelKeys.add(key);
    if (!mapKeys.has(key)) errors.push(`ownership map: missing current K00 concept ${key}`);
  }
}
for (const key of mapKeys.keys()) if (!kernelKeys.has(key)) errors.push(`ownership map: unknown K00 concept ${key}`);

for (const g of gaps?.core_missing_kernel_candidates || []) {
  const present = [...kernelKeys].some(k => k.endsWith(`:${g.id}`));
  if (present) errors.push(`discovery gaps: ${g.id} is listed missing but is already in K00`);
}

const unresolved = [...mapKeys.values()].filter(x => x.decision_state !== 'approved');
for (const id of ['Entitlement','EntitlementId']) {
  const matches = [...mapKeys.values()].filter(x => x.id === id);
  if (!matches.length) errors.push(`ownership map: missing ${id}`);
  for (const x of matches) if (x.proposed_owner !== 'Organization') errors.push(`ownership map: ${id} owner must be Organization`);
}

if (errors.length) {
  console.error(`Domain ownership discovery FAILED (${errors.length} problem${errors.length===1?'':'s'}):`);
  for (const e of errors) console.error(`- ${e}`);
  process.exit(1);
}

console.log('Domain ownership discovery PASS');
console.log(`Proposed domains: ${domainIds.size}`);
console.log(`Mapped K00 concepts: ${mapKeys.size}`);
console.log(`Unapproved ownership entries: ${unresolved.length}`);
console.log(`Missing core semantic candidates: ${(gaps?.core_missing_kernel_candidates || []).length}`);
