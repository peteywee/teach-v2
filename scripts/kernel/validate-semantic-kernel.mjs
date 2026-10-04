#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = resolve(process.cwd());
const K = join(ROOT, 'kernel');
const errors = [];
const load = (name) => {
  try { return JSON.parse(readFileSync(join(K, name), 'utf8')); }
  catch (e) { errors.push(`${name}: ${e.message}`); return null; }
};

const manifest = load('manifest.json');
const names = ['entities.json','values.json','identifiers.json','relationships.json','states.json','state-machines.json','invariants.json','decision-tables.json','capabilities.json','commands.json','events.json','evidence.json','schema/semantic-kernel.schema.json'];
const docs = Object.fromEntries(names.map(n => [n, load(n)]));
if (manifest) {
  if (manifest.kernel_id !== 'TEACH-K00') errors.push('manifest.json: kernel_id must be TEACH-K00');
  if (manifest.version !== '0.9.0') errors.push('manifest.json: version must be 0.9.0');
  if (manifest.canonical_format !== 'json') errors.push('manifest.json: canonical_format must be json');
  for (const n of ['entities','values','identifiers','relationships','states','state_machines','invariants','decision_tables','capabilities','commands','events','evidence','schema']) {
    if (!manifest.files?.[n]) errors.push(`manifest.json: missing file mapping ${n}`);
  }
}
const validStatus = new Set(['candidate','approved','deprecated']);
const allIds = new Map();
function collect(file) {
  const d = docs[file]; if (!d?.entries) return;
  const local = new Set();
  for (const e of d.entries) {
    if (!e.id) { errors.push(`${file}: entry missing id`); continue; }
    if (local.has(e.id)) errors.push(`${file}: duplicate id ${e.id}`); local.add(e.id);
    if (!validStatus.has(e.status)) errors.push(`${file}: ${e.id} invalid status ${e.status}`);
    if (allIds.has(e.id) && file !== 'identifiers.json' && file !== 'values.json') errors.push(`${file}: canonical id ${e.id} duplicates ${allIds.get(e.id)}`);
    else if (!allIds.has(e.id)) allIds.set(e.id,file);
  }
}
for (const f of ['entities.json','values.json','identifiers.json','relationships.json','states.json','state-machines.json','invariants.json','decision-tables.json','commands.json','events.json']) collect(f);
const ids = new Set((docs['identifiers.json']?.entries || []).map(x => x.id));
const entityIds = new Set((docs['entities.json']?.entries || []).map(x => x.id));
for (const e of docs['entities.json']?.entries || []) {
  if (!e.definition) errors.push(`entities.json: ${e.id} missing definition`);
  if (!e.identifier || !ids.has(e.identifier)) errors.push(`entities.json: ${e.id} identifier ${e.identifier} not registered`);
  if (!e.owning_domain) errors.push(`entities.json: ${e.id} missing owning_domain`);
}
for (const r of docs['relationships.json']?.entries || []) {
  const refs = [r.from, ...(Array.isArray(r.to) ? r.to : [r.to])].filter(Boolean);
  for (const ref of refs) if (!entityIds.has(ref)) errors.push(`relationships.json: ${r.id} references unknown entity ${ref}`);
  if (!r.owning_domain) errors.push(`relationships.json: ${r.id} missing owning_domain`);
  if (!Array.isArray(r.authority_contracts) || !r.authority_contracts.length) errors.push(`relationships.json: ${r.id} missing authority_contracts`);
  if (!Array.isArray(r.does_not_grant) || !r.does_not_grant.length) errors.push(`relationships.json: ${r.id} missing does_not_grant`);
  if (r.status !== 'candidate') errors.push(`relationships.json: ${r.id} must remain candidate in K00 0.3.0`);
}
const expectedRelationshipIds = new Set([
  'AssignmentReferencesContentPack',
  'AssignmentTargetsIdentity',
  'CertificationBelongsToIdentity',
  'CertificationObservedByIdentity',
  'CertificationReferencesContentPack',
  'ContentPackContainsContentBlock',
  'CredentialBelongsToIdentity',
  'EntitlementBelongsToOrganization',
  'IdentityHasApplicationSession',
  'IdentityHasLearningSession',
  'LearnerStateBelongsToIdentity',
  'LearnerStateTracksContentPack',
  'LearningSessionUsesAssignment',
  'LifecycleEventReferencesIdentity',
  'LocationBelongsToOrganization',
  'MembershipLinksIdentityOrganization',
  'MembershipMayScopeLocation',
  'ProgressEventBelongsToLearningSession'
]);
const actualRelationshipIds = new Set((docs['relationships.json']?.entries || []).map(x => x.id));
for (const id of expectedRelationshipIds) if (!actualRelationshipIds.has(id)) errors.push(`relationships.json: missing registered relationship ${id}`);
for (const id of actualRelationshipIds) if (!expectedRelationshipIds.has(id)) errors.push(`relationships.json: unexpected relationship ${id}`);

for (const s of docs['states.json']?.entries || []) {
  if (!Array.isArray(s.values) || !s.values.length) errors.push(`states.json: ${s.id} missing values`);
  if (new Set(s.values || []).size !== (s.values || []).length) errors.push(`states.json: ${s.id} duplicate values`);
}
const identity = (docs['states.json']?.entries || []).find(x => x.id === 'IdentityStatus');
if (!identity) errors.push('states.json: IdentityStatus missing');
else {
  const expected = ['ACTIVE','INACTIVE','DELETED'];
  if (JSON.stringify(identity.values) !== JSON.stringify(expected)) errors.push(`states.json: IdentityStatus must be ${expected.join(',')}`);
  if (identity.values.includes('OFFBOARDED')) errors.push('states.json: OFFBOARDED must not be IdentityStatus');
}
const eventIds = new Set((docs['events.json']?.entries || []).map(x => x.id));
if (!eventIds.has('IdentityOffboarded')) errors.push('events.json: IdentityOffboarded missing');
const ev = docs['evidence.json'];
const evidenceExpected = ['PROVEN','BLOCKED','UNKNOWN','CONTRADICTORY'];
if (ev?.state_set !== 'EvidenceState') errors.push('evidence.json: state_set must be EvidenceState');
if (JSON.stringify(Object.keys(ev?.values || {})) !== JSON.stringify(evidenceExpected)) errors.push(`evidence.json: evidence keys must be ${evidenceExpected.join(',')}`);
const cap = docs['capabilities.json'];
if (cap?.ownership?.identifier_registration !== 'C01') errors.push('capabilities.json: identifier_registration must be C01');
if (cap?.ownership?.authorization_semantics !== 'C14') errors.push('capabilities.json: authorization_semantics must be C14');
const expectedOwners = new Map([
  ['entities.json:Organization','Organization'],
  ['entities.json:Location','Organization'],
  ['entities.json:Membership','Organization'],
  ['entities.json:Entitlement','Organization'],
  ['identifiers.json:OrganizationId','Organization'],
  ['identifiers.json:LocationId','Organization'],
  ['identifiers.json:MembershipId','Organization'],
  ['identifiers.json:EntitlementId','Organization'],
  ['identifiers.json:CapabilityId','Authorization'],
  ['identifiers.json:RequestId','Observability'],
  ['identifiers.json:IdempotencyKey','TransactionControl'],
  ['values.json:RequestId','Observability'],
  ['values.json:IdempotencyKey','TransactionControl']
]);
for (const [key, owner] of expectedOwners) {
  const [file, id] = key.split(':');
  const entry = (docs[file]?.entries || []).find(x => x.id === id);
  if (!entry) errors.push(`${file}: expected ${id}`);
  else if (entry.owning_domain !== owner) errors.push(`${file}: ${id} owner must be ${owner}`);
}
if (cap?.semantic_domain !== 'Authorization') errors.push('capabilities.json: semantic_domain must be Authorization');
const stateSetMap = new Map((docs['states.json']?.entries || []).map(x => [x.id, x]));
const commandSet = new Set((docs['commands.json']?.entries || []).map(x => x.id));
const eventSet = new Set((docs['events.json']?.entries || []).map(x => x.id));
const machineIds = new Set();
for (const m of docs['state-machines.json']?.entries || []) {
  if (machineIds.has(m.id)) errors.push(`state-machines.json: duplicate ${m.id}`);
  machineIds.add(m.id);
  if (m.status !== 'candidate') errors.push(`state-machines.json: ${m.id} must remain candidate in K00 0.4.0`);
  if (!entityIds.has(m.entity)) errors.push(`state-machines.json: ${m.id} unknown entity ${m.entity}`);
  const ss = stateSetMap.get(m.state_set);
  if (!ss) errors.push(`state-machines.json: ${m.id} unknown state_set ${m.state_set}`);
  if (!m.owning_domain) errors.push(`state-machines.json: ${m.id} missing owning_domain`);
  if (!Array.isArray(m.authority_contracts) || !m.authority_contracts.length) errors.push(`state-machines.json: ${m.id} missing authority_contracts`);
  const values = new Set(ss?.values || []);
  if (m.initial_state && !values.has(m.initial_state)) errors.push(`state-machines.json: ${m.id} invalid initial_state ${m.initial_state}`);
  for (const tr of m.transitions || []) {
    if (!values.has(tr.from) || !values.has(tr.to)) errors.push(`state-machines.json: ${m.id} invalid transition ${tr.from}->${tr.to}`);
    if (tr.command && !commandSet.has(tr.command)) errors.push(`state-machines.json: ${m.id} unknown command ${tr.command}`);
    if (tr.event && !eventSet.has(tr.event)) errors.push(`state-machines.json: ${m.id} unknown event ${tr.event}`);
  }
  for (const terminal of m.terminal_states || []) if (!values.has(terminal)) errors.push(`state-machines.json: ${m.id} invalid terminal ${terminal}`);
}
const requiredMachines = new Set(['ApplicationSessionStateMachine','IdentityStateMachine','LearningSessionStateMachine','MembershipStateMachine']);
for (const id of requiredMachines) if (!machineIds.has(id)) errors.push(`state-machines.json: missing ${id}`);
for (const id of machineIds) if (!requiredMachines.has(id)) errors.push(`state-machines.json: unexpected ${id}`);

const learningStatus = stateSetMap.get('LearningSessionStatus');
if (!learningStatus || JSON.stringify(learningStatus.values) !== JSON.stringify(['ACTIVE','COMPLETED'])) errors.push('states.json: LearningSessionStatus must be ACTIVE,COMPLETED');
const membershipStatus = stateSetMap.get('MembershipStatus');
if (!membershipStatus || JSON.stringify(membershipStatus.values) !== JSON.stringify(['ACTIVE','INACTIVE','REVOKED'])) errors.push('states.json: MembershipStatus must be ACTIVE,INACTIVE,REVOKED');


// Per-kind semantic schema (approved 2026-10-04): commands and events must
// carry owning_domain, definitions, and kind-specific semantic references.
for (const c of docs['commands.json']?.entries || []) {
  if (!c.owning_domain) errors.push(`commands.json: ${c.id} missing owning_domain`);
  if (!c.definition) errors.push(`commands.json: ${c.id} missing definition`);
  if (!c.authority) errors.push(`commands.json: ${c.id} missing authority`);
  if (!Array.isArray(c.requires)) errors.push(`commands.json: ${c.id} requires must be an array`);
}
for (const e of docs['events.json']?.entries || []) {
  if (!e.owning_domain) errors.push(`events.json: ${e.id} missing owning_domain`);
  if (!e.definition) errors.push(`events.json: ${e.id} missing definition`);
  if (!e.emitted_by) errors.push(`events.json: ${e.id} missing emitted_by`);
  else if (!commandSet.has(e.emitted_by)) errors.push(`events.json: ${e.id} unknown emitted_by command ${e.emitted_by}`);
  if (!('sem35_evidence' in e)) errors.push(`events.json: ${e.id} missing sem35_evidence`);
  // Promotion gate: approved events must cite an explicit owning-contract rule.
  if (e.status === 'approved' && !(typeof e.sem35_evidence === 'string' && e.sem35_evidence.length)) {
    errors.push(`events.json: ${e.id} approved without sem35_evidence rule`);
  }
}
for (const id of ['DeactivateIdentity','ReactivateIdentity','RevokeMembership']) if (!commandSet.has(id)) errors.push(`commands.json: missing ${id}`);
for (const id of ['IdentityDeactivated','IdentityReactivated','MembershipRevoked']) if (!eventSet.has(id)) errors.push(`events.json: missing ${id}`);
const invariantIds = new Set();
for (const inv of docs['invariants.json']?.entries || []) {
  if (invariantIds.has(inv.id)) errors.push(`invariants.json: duplicate ${inv.id}`);
  invariantIds.add(inv.id);
  if (inv.kind !== 'invariant') errors.push(`invariants.json: ${inv.id} kind must be invariant`);
  if (inv.status !== 'candidate') errors.push(`invariants.json: ${inv.id} must remain candidate in K00 0.5.0`);
  if (!inv.name) errors.push(`invariants.json: ${inv.id} missing name`);
  if (!inv.owning_domain) errors.push(`invariants.json: ${inv.id} missing owning_domain`);
  if (!Array.isArray(inv.authority_contracts) || !inv.authority_contracts.length) errors.push(`invariants.json: ${inv.id} missing authority_contracts`);
  if (!Array.isArray(inv.requirements) || !inv.requirements.length) errors.push(`invariants.json: ${inv.id} missing requirements`);
  if (!inv.assertion) errors.push(`invariants.json: ${inv.id} missing assertion`);
  if (!inv.failure_behavior) errors.push(`invariants.json: ${inv.id} missing failure_behavior`);
}
if (invariantIds.size !== 22) errors.push(`invariants.json: expected 22 registered candidates, found ${invariantIds.size}`);
const decisionIds = new Set();
for (const dt of docs['decision-tables.json']?.entries || []) {
  if (decisionIds.has(dt.id)) errors.push(`decision-tables.json: duplicate ${dt.id}`);
  decisionIds.add(dt.id);
  if (dt.kind !== 'decision_table') errors.push(`decision-tables.json: ${dt.id} kind must be decision_table`);
  if (dt.status !== 'candidate') errors.push(`decision-tables.json: ${dt.id} must remain candidate in K00 0.6.0`);
  if (!dt.owning_domain) errors.push(`decision-tables.json: ${dt.id} missing owning_domain`);
  if (!Array.isArray(dt.authority_contracts) || !dt.authority_contracts.length) errors.push(`decision-tables.json: ${dt.id} missing authority_contracts`);
  if (!Array.isArray(dt.requirements) || !dt.requirements.length) errors.push(`decision-tables.json: ${dt.id} missing requirements`);
  if (!Array.isArray(dt.inputs) || !dt.inputs.length) errors.push(`decision-tables.json: ${dt.id} missing inputs`);
  if (!Array.isArray(dt.rules) || !dt.rules.length) errors.push(`decision-tables.json: ${dt.id} missing rules`);
  if (!dt.default_outcome) errors.push(`decision-tables.json: ${dt.id} missing default_outcome`);
  if (!dt.failure_behavior) errors.push(`decision-tables.json: ${dt.id} missing failure_behavior`);
}
if (decisionIds.size !== 8) errors.push(`decision-tables.json: expected 8 registered candidates, found ${decisionIds.size}`);
const expectedCommandIds = new Set(['AcceptInvitation','AssignContent','AuthenticateIdentity','ChangeCredential','CompleteLearningSession','CreateApplicationSession','CreateIdentity','CreateMembership','DeactivateIdentity','DeactivateMembership','InviteIdentity','IssueCertification','OffboardIdentity','PublishContentPack','ReactivateIdentity','ReconcileExternalEffect','RecordProgressEvent','RevokeApplicationSession','RevokeCertification','RevokeMembership','RevokeSingleUseToken','StartLearningSession']);
for (const id of expectedCommandIds) if (!commandSet.has(id)) errors.push(`commands.json: missing registered command ${id}`);
if (commandSet.size !== expectedCommandIds.size) errors.push(`commands.json: expected ${expectedCommandIds.size} commands, found ${commandSet.size}`);
if (eventSet.size !== 14) errors.push(`events.json: expected 14 events after command registration, found ${eventSet.size}`);
if (manifest?.rules?.audit_record_implies_domain_event !== false) errors.push('manifest.json: audit_record_implies_domain_event must be false');
if (manifest?.rules?.state_transition_implies_event !== false) errors.push('manifest.json: state_transition_implies_event must be false');
if (manifest?.rules?.event_registration_requires_explicit_contract_semantics !== true) errors.push('manifest.json: explicit contract semantics must be required for event registration');




if (errors.length) {
  console.error(`Semantic kernel FAILED (${errors.length} problem${errors.length===1?'':'s'}):`);
  for (const e of errors) console.error(`- ${e}`);
  process.exit(1);
}
console.log('Semantic kernel PASS: TEACH-K00 0.9.0');
console.log(`Entities: ${(docs['entities.json']?.entries || []).length}`);
console.log(`Identifiers: ${(docs['identifiers.json']?.entries || []).length}`);
console.log(`Relationships: ${(docs['relationships.json']?.entries || []).length}`);
console.log(`State machines: ${(docs['state-machines.json']?.entries || []).length}`);
console.log(`Invariants: ${(docs['invariants.json']?.entries || []).length}`);
console.log(`Decision tables: ${(docs['decision-tables.json']?.entries || []).length}`);
console.log(`Commands: ${(docs['commands.json']?.entries || []).length}`);
console.log(`Events: ${(docs['events.json']?.entries || []).length}`);
