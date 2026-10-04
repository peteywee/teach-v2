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
const registration = load('domains/relationships/registration.json');
const entities = load('kernel/entities.json');
const existingRelationships = load('kernel/relationships.json');
const ownership = load('domains/ownership-map.json');

if (proposal) {
  if (proposal.relationship_discovery_id !== 'TEACH-REL-DISCOVERY') errors.push('relationship proposal: wrong id');
  if (proposal.version !== '0.1.0') errors.push('relationship proposal: version must be 0.1.0');
  if (proposal.status !== 'proposed') errors.push('relationship proposal: status must remain proposed');
  if (proposal.baseline?.commit !== '1cb51b4b0a171866628886d5445277b4f6b21e15') errors.push('relationship proposal: baseline commit mismatch');
}

if (ownership?.status !== 'active' || ownership?.version !== '1.6.0') {
  errors.push('relationship proposal: requires active Domain Ownership Map 1.6.0');
}

const entityIds = new Set((entities?.entries || []).map(x => x.id));
const identifierIds = new Set((load('kernel/identifiers.json')?.entries || []).map(x => x.id));
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
  for (const ref of r.to || []) if (!entityIds.has(ref) && !identifierIds.has(ref)) errors.push(`${r.id}: unknown to entity or identifier ${ref}`);
  if (!ownerDomains.has(r.owning_domain)) errors.push(`${r.id}: unknown owner domain ${r.owning_domain}`);
  if (!Array.isArray(r.authority_contracts) || !r.authority_contracts.length) errors.push(`${r.id}: missing contract traceability`);
  if (!Array.isArray(r.does_not_grant) || !r.does_not_grant.length) errors.push(`${r.id}: missing does_not_grant`);
}

for (const r of proposal?.blocked_relationships || []) {
  if (!r.id) { errors.push('blocked relationship missing id'); continue; }
  if (seen.has(r.id)) errors.push(`duplicate relationship proposal ${r.id}`);
  seen.add(r.id);
  if (!Array.isArray(r.blocked_by) || !r.blocked_by.length) errors.push(`${r.id}: blocker list required`);
  if (!Array.isArray(r.authority_contracts) || !r.authority_contracts.length) errors.push(`${r.id}: contract traceability required`);
}

if (registration) {
  if (registration.version !== '1.0.0') errors.push('relationship registration: version must be 1.0.0');
  if (registration.status !== 'recorded') errors.push('relationship registration: status must be recorded');
  if (registration.kernel_version !== '0.3.0') errors.push('relationship registration: kernel_version must be 0.3.0');
  if (registration.promotion?.candidate_to_approved !== false) errors.push('relationship registration: candidate promotion must remain false');
}

const readyIds = new Set((proposal?.ready_relationships || []).map(x => x.id));
const blockedIds = new Set((proposal?.blocked_relationships || []).map(x => x.id));

for (const id of readyIds) {
  if (!existing.has(id)) errors.push(`relationship registration: ready relationship ${id} missing from K00`);
}
for (const id of existing) {
  if (!readyIds.has(id)) errors.push(`relationship registration: K00 relationship ${id} was not in the approved ready set`);
}
for (const id of blockedIds) {
  if (existing.has(id)) errors.push(`relationship registration: blocked relationship ${id} must not be in K00`);
}

const registeredIds = new Set(registration?.registered_relationships || []);
for (const id of readyIds) if (!registeredIds.has(id)) errors.push(`relationship registration: ${id} missing from registration record`);
for (const id of registeredIds) if (!readyIds.has(id)) errors.push(`relationship registration: unexpected registered id ${id}`);

const persistencePromoted = new Set([
  'CredentialBelongsToIdentity','IdentityHasApplicationSession',
  'AssignmentTargetsIdentity','AssignmentReferencesContentPack',
  'IdentityHasLearningSession','LearningSessionUsesAssignment',
  'ProgressEventBelongsToLearningSession','CertificationBelongsToIdentity',
  'CertificationReferencesContentPack','CertificationObservedByIdentity'
]);
for (const r of existingRelationships?.entries || []) {
  const expected=persistencePromoted.has(r.id)?'approved':'candidate';
  if (r.status !== expected) errors.push(`relationship registration: current ${r.id} must be ${expected}`);
}


if (errors.length) {
  console.error(`Relationship discovery FAILED (${errors.length} problem${errors.length===1?'':'s'}):`);
  for (const e of errors) console.error(`- ${e}`);
  process.exit(1);
}

console.log('Relationship registration PASS');
console.log(`Registered relationships: ${existing.size} total / 10 approved / 8 candidate`);
console.log(`Blocked relationships excluded: ${(proposal?.blocked_relationships || []).length}`);
console.log('Historical registration promotions: 0; later persistence closure promotions: 10');
