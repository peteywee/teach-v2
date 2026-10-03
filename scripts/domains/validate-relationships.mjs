#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = resolve(process.cwd());
const errors = [];
const load = (p) => {
  try { return JSON.parse(readFileSync(join(ROOT, p), 'utf8')); }
  catch (e) { errors.push(`${p}: ${e.message}`); return null; }
};

const proposal = load('domains/relationships/proposed.json');
const entities = load('kernel/entities.json');
const existingRelationships = load('kernel/relationships.json');
const ownership = load('domains/ownership-map.json');

if (proposal) {
  if (proposal.relationship_discovery_id !== 'TEACH-REL-DISCOVERY') errors.push('relationship proposal: wrong id');
  if (proposal.version !== '0.1.0') errors.push('relationship proposal: version must be 0.1.0');
  if (proposal.status !== 'proposed') errors.push('relationship proposal: status must remain proposed');
  if (proposal.baseline?.commit !== '1cb51b4b0a171866628886d5445277b4f6b21e15') errors.push('relationship proposal: baseline commit mismatch');
}

if (ownership?.status !== 'active' || ownership?.version !== '1.0.0') {
  errors.push('relationship proposal: requires active Domain Ownership Map 1.0.0');
}

const entityIds = new Set((entities?.entries || []).map(x => x.id));
const ownerDomains = new Set((ownership?.domains || []).map(x => x.id));
const existing = new Set((existingRelationships?.entries || []).map(x => x.id));
const seen = new Set();

for (const r of proposal?.ready_relationships || []) {
  if (!r.id) { errors.push('ready relationship missing id'); continue; }
  if (seen.has(r.id)) errors.push(`duplicate relationship proposal ${r.id}`);
  seen.add(r.id);
  if (r.state !== 'proposed') errors.push(`${r.id}: state must be proposed`);
  if (!['add','retain-existing'].includes(r.action)) errors.push(`${r.id}: invalid action ${r.action}`);
  if (!entityIds.has(r.from)) errors.push(`${r.id}: unknown from entity ${r.from}`);
  for (const ref of r.to || []) if (!entityIds.has(ref)) errors.push(`${r.id}: unknown to entity ${ref}`);
  if (!ownerDomains.has(r.owning_domain)) errors.push(`${r.id}: unknown owner domain ${r.owning_domain}`);
  if (!Array.isArray(r.authority_contracts) || !r.authority_contracts.length) errors.push(`${r.id}: missing contract traceability`);
  if (!Array.isArray(r.does_not_grant) || !r.does_not_grant.length) errors.push(`${r.id}: missing does_not_grant`);
  if (r.action === 'retain-existing' && !existing.has(r.id)) errors.push(`${r.id}: marked retain-existing but absent from K00`);
  if (r.action === 'add' && existing.has(r.id)) errors.push(`${r.id}: marked add but already exists in K00`);
}

for (const r of proposal?.blocked_relationships || []) {
  if (!r.id) { errors.push('blocked relationship missing id'); continue; }
  if (seen.has(r.id)) errors.push(`duplicate relationship proposal ${r.id}`);
  seen.add(r.id);
  if (!Array.isArray(r.blocked_by) || !r.blocked_by.length) errors.push(`${r.id}: blocker list required`);
  if (!Array.isArray(r.authority_contracts) || !r.authority_contracts.length) errors.push(`${r.id}: contract traceability required`);
}

if (errors.length) {
  console.error(`Relationship discovery FAILED (${errors.length} problem${errors.length===1?'':'s'}):`);
  for (const e of errors) console.error(`- ${e}`);
  process.exit(1);
}

console.log('Relationship discovery PASS');
console.log(`Ready proposals: ${(proposal?.ready_relationships || []).length}`);
console.log(`Blocked proposals: ${(proposal?.blocked_relationships || []).length}`);
console.log(`Existing K00 relationships retained: ${(proposal?.ready_relationships || []).filter(x => x.action === 'retain-existing').length}`);
console.log(`New relationship candidates proposed: ${(proposal?.ready_relationships || []).filter(x => x.action === 'add').length}`);
