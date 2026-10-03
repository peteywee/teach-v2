#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = resolve(process.cwd());
const errors = [];
const load = (p) => {
  try { return JSON.parse(readFileSync(join(ROOT, p), 'utf8')); }
  catch (e) { errors.push(`${p}: ${e.message}`); return null; }
};

const map = load('domains/ownership-map.proposed.json');
const gaps = load('domains/discovery-gaps.json');
const files = {
  entity: load('kernel/entities.json'),
  identifier: load('kernel/identifiers.json'),
  value_object: load('kernel/values.json'),
  state_set: load('kernel/states.json'),
  relationship: load('kernel/relationships.json'),
  command: load('kernel/commands.json'),
  event: load('kernel/events.json')
};

if (map) {
  if (map.map_id !== 'TEACH-DOMAIN-OWNERSHIP') errors.push('ownership map: map_id must be TEACH-DOMAIN-OWNERSHIP');
  if (map.version !== '0.1.0') errors.push('ownership map: version must be 0.1.0');
  if (map.status !== 'proposed') errors.push('ownership map: this discovery package must remain proposed');
}

const domainIds = new Set((map?.domains || []).map(d => d.id));
const mapKeys = new Map();
for (const e of map?.entries || []) {
  const key = `${e.kind}:${e.id}`;
  if (mapKeys.has(key)) errors.push(`ownership map: duplicate ${key}`);
  mapKeys.set(key, e);
  if (!['proposed','unresolved'].includes(e.decision_state)) errors.push(`ownership map: ${key} invalid decision_state`);
  if (e.decision_state === 'proposed') {
    if (!e.proposed_owner) errors.push(`ownership map: ${key} proposed without owner`);
    else if (!domainIds.has(e.proposed_owner)) errors.push(`ownership map: ${key} owner ${e.proposed_owner} is not a registered proposed domain`);
  }
  if (e.decision_state === 'unresolved' && e.proposed_owner !== null) errors.push(`ownership map: ${key} unresolved entry must keep proposed_owner null`);
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

const unresolved = [...mapKeys.values()].filter(x => x.decision_state === 'unresolved');
if (!unresolved.some(x => x.id === 'Entitlement')) errors.push('ownership map: Entitlement must remain explicitly unresolved in this discovery pass');
if (!unresolved.some(x => x.id === 'EntitlementId')) errors.push('ownership map: EntitlementId must remain explicitly unresolved in this discovery pass');

if (errors.length) {
  console.error(`Domain ownership discovery FAILED (${errors.length} problem${errors.length===1?'':'s'}):`);
  for (const e of errors) console.error(`- ${e}`);
  process.exit(1);
}

console.log('Domain ownership discovery PASS');
console.log(`Proposed domains: ${domainIds.size}`);
console.log(`Mapped K00 concepts: ${mapKeys.size}`);
console.log(`Unresolved ownership entries: ${unresolved.length}`);
console.log(`Missing core semantic candidates: ${(gaps?.core_missing_kernel_candidates || []).length}`);
