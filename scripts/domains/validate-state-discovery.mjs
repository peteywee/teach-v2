#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = resolve(process.cwd());
const errors = [];

const load = (p) => {
  try { return JSON.parse(readFileSync(join(ROOT, p), 'utf8')); }
  catch (e) { errors.push(`${p}: ${e.message}`); return null; }
};

const proposal = load('domains/states/proposed.json');
const kernelStates = load('kernel/states.json');
const entities = load('kernel/entities.json');
const commands = load('kernel/commands.json');
const events = load('kernel/events.json');
const ownership = load('domains/ownership-map.json');

if (proposal) {
  if (proposal.state_discovery_id !== 'TEACH-STATE-DISCOVERY') errors.push('state discovery: wrong id');
  if (proposal.version !== '0.1.0') errors.push('state discovery: version must be 0.1.0');
  if (proposal.status !== 'proposed') errors.push('state discovery: status must remain proposed');
  if (proposal.baseline?.commit !== 'd71fbf99b5ab2f554f89a6794a0ff9dc98e4f9da') errors.push('state discovery: baseline mismatch');
}

if (ownership?.status !== 'active' || ownership?.version !== '1.0.0') {
  errors.push('state discovery: requires active Domain Ownership Map 1.0.0');
}

const states = new Map((kernelStates?.entries || []).map(x => [x.id, x]));
const entityIds = new Set((entities?.entries || []).map(x => x.id));
const commandIds = new Set((commands?.entries || []).map(x => x.id));
const eventIds = new Set((events?.entries || []).map(x => x.id));

const app = (proposal?.ready || []).find(x => x.id === 'ApplicationSessionStateMachine');
if (!app) errors.push('state discovery: ApplicationSessionStateMachine must be ready');
else {
  const ss = states.get('ApplicationSessionStatus');
  if (!ss) errors.push('state discovery: ApplicationSessionStatus missing from K00');
  else if (JSON.stringify(ss.values) !== JSON.stringify(['ACTIVE','EXPIRED','REVOKED'])) {
    errors.push('state discovery: ApplicationSessionStatus values drifted');
  }
  if (!entityIds.has('ApplicationSession')) errors.push('state discovery: ApplicationSession entity missing');
  if (!commandIds.has('RevokeApplicationSession')) errors.push('state discovery: RevokeApplicationSession command missing');
  if (!eventIds.has('ApplicationSessionRevoked')) errors.push('state discovery: ApplicationSessionRevoked event missing');
  const transitions = new Set((app.transitions || []).map(t => `${t.from}->${t.to}`));
  for (const expected of ['ACTIVE->EXPIRED','ACTIVE->REVOKED']) {
    if (!transitions.has(expected)) errors.push(`state discovery: missing ${expected}`);
  }
}

const ev = (proposal?.ready || []).find(x => x.id === 'EvidenceStateClassification');
if (!ev || ev.transition_graph_required !== false) {
  errors.push('state discovery: EvidenceState must be classified as non-lifecycle');
}
const evidenceSet = states.get('EvidenceState');
if (!evidenceSet || JSON.stringify(evidenceSet.values) !== JSON.stringify(['PROVEN','BLOCKED','UNKNOWN','CONTRADICTORY'])) {
  errors.push('state discovery: EvidenceState values drifted');
}

const identity = (proposal?.ready || []).find(x => x.id === 'IdentityStatusSet');
if (!identity || identity.transition_graph_state !== 'BLOCKED') {
  errors.push('state discovery: IdentityStatus transition graph must remain BLOCKED');
}
const identitySet = states.get('IdentityStatus');
if (!identitySet || JSON.stringify(identitySet.values) !== JSON.stringify(['ACTIVE','INACTIVE','DELETED'])) {
  errors.push('state discovery: IdentityStatus values drifted');
}

const membership = (proposal?.blocked || []).find(x => x.id === 'MembershipStateMachine');
if (!membership || membership.evidence_state !== 'CONTRADICTORY') {
  errors.push('state discovery: MembershipStateMachine must remain CONTRADICTORY');
}

const learning = (proposal?.blocked || []).find(x => x.id === 'LearningSessionStateMachine');
if (!learning || !learning.blocked_by?.some(x => x.includes('OQ-LRN-1'))) {
  errors.push('state discovery: LearningSessionStateMachine must remain blocked by OQ-LRN-1');
}

for (const item of [...(proposal?.ready || []), ...(proposal?.blocked || [])]) {
  if (!['PROVEN','BLOCKED','CONTRADICTORY','UNKNOWN'].includes(item.evidence_state)) {
    errors.push(`${item.id}: invalid evidence state ${item.evidence_state}`);
  }
}
for (const item of proposal?.blocked || []) {
  if (item.evidence_state === 'PROVEN') errors.push(`${item.id}: blocked item must not be PROVEN`);
  if (!Array.isArray(item.blocked_by) || !item.blocked_by.length) errors.push(`${item.id}: blocked_by required`);
}

if (errors.length) {
  console.error(`State discovery FAILED (${errors.length} problem${errors.length===1?'':'s'}):`);
  for (const e of errors) console.error(`- ${e}`);
  process.exit(1);
}

console.log('State discovery PASS');
console.log(`Ready state artifacts: ${(proposal?.ready || []).length}`);
console.log(`Blocked state machines: ${(proposal?.blocked || []).length}`);
console.log('ApplicationSession transitions proven: 2');
console.log('Membership lifecycle evidence: CONTRADICTORY');
console.log('K00 state authority changed: no');
