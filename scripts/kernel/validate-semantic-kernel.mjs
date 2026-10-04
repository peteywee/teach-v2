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
  if (manifest.version !== '0.14.0') errors.push('manifest.json: version must be 0.14.0');
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
  for (const ref of refs) if (!entityIds.has(ref) && !ids.has(ref)) errors.push(`relationships.json: ${r.id} references unknown entity or identifier ${ref}`);
  if (!r.owning_domain) errors.push(`relationships.json: ${r.id} missing owning_domain`);
  if (!Array.isArray(r.authority_contracts) || !r.authority_contracts.length) errors.push(`relationships.json: ${r.id} missing authority_contracts`);
  if (!Array.isArray(r.does_not_grant) || !r.does_not_grant.length) errors.push(`relationships.json: ${r.id} missing does_not_grant`);
  const persistencePromotedRelationships = new Set([
    'CredentialBelongsToIdentity','IdentityHasApplicationSession',
    'AssignmentTargetsIdentity','AssignmentReferencesContentPack',
    'IdentityHasLearningSession','LearningSessionUsesAssignment',
    'ProgressEventBelongsToLearningSession','CertificationBelongsToIdentity',
    'CertificationReferencesContentPack','CertificationObservedByIdentity'
  ]);
  const expectedStatus = persistencePromotedRelationships.has(r.id) ? 'approved' : 'candidate';
  if (r.status !== expectedStatus) errors.push(`relationships.json: ${r.id} must be ${expectedStatus} in K00 0.14.0`);
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
  'ProgressEventBelongsToLearningSession',
  'ReconciliationRecordUsesIdempotencyKey'
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
const historicalCandidateMachines = new Set(['MembershipStateMachine']);
const persistencePromotedMachines = new Set(['ApplicationSessionStateMachine','IdentityStateMachine','LearningSessionStateMachine']);
const approvedLifecycleMachines = new Set(['InvitationStateMachine','SetupTokenStateMachine','PasswordResetTokenStateMachine','ReconciliationRecordStateMachine']);
for (const m of docs['state-machines.json']?.entries || []) {
  if (machineIds.has(m.id)) errors.push(`state-machines.json: duplicate ${m.id}`);
  machineIds.add(m.id);
  if (historicalCandidateMachines.has(m.id) && m.status !== 'candidate') errors.push(`state-machines.json: ${m.id} must remain candidate`);
  if ((persistencePromotedMachines.has(m.id) || approvedLifecycleMachines.has(m.id)) && m.status !== 'approved') errors.push(`state-machines.json: ${m.id} must be approved`);
  if (!historicalCandidateMachines.has(m.id) && !persistencePromotedMachines.has(m.id) && !approvedLifecycleMachines.has(m.id)) errors.push(`state-machines.json: unexpected ${m.id}`);
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
const requiredMachines = new Set([...historicalCandidateMachines, ...persistencePromotedMachines, ...approvedLifecycleMachines]);
for (const id of requiredMachines) if (!machineIds.has(id)) errors.push(`state-machines.json: missing ${id}`);
for (const id of machineIds) if (!requiredMachines.has(id)) errors.push(`state-machines.json: unexpected ${id}`);

const requiredLifecycleStateSets = new Map([
  ['InvitationStatus',['PENDING','ACCEPTED','REVOKED','EXPIRED']],
  ['SingleUseTokenStatus',['ACTIVE','CONSUMED','EXPIRED','REVOKED']],
  ['ReconciliationRecordStatus',['OPEN','RESOLVED']],
  ['ExternalEffectOutcome',['AMBIGUOUS','PARTIAL_FAILURE','CONFIRMED_SUCCESS','CONFIRMED_NO_EFFECT']],
]);
for (const [id,expected] of requiredLifecycleStateSets) {
  const s=stateSetMap.get(id);
  if (!s) errors.push(`states.json: missing ${id}`);
  else {
    if (s.status !== 'approved') errors.push(`states.json: ${id} must be approved`);
    if (JSON.stringify(s.values)!==JSON.stringify(expected)) errors.push(`states.json: ${id} values drifted`);
  }
}

const learningStatus = stateSetMap.get('LearningSessionStatus');
if (!learningStatus || JSON.stringify(learningStatus.values) !== JSON.stringify(['ACTIVE','COMPLETED'])) errors.push('states.json: LearningSessionStatus must be ACTIVE,COMPLETED');
const membershipStatus = stateSetMap.get('MembershipStatus');
if (!membershipStatus || JSON.stringify(membershipStatus.values) !== JSON.stringify(['ACTIVE','INACTIVE','REVOKED'])) errors.push('states.json: MembershipStatus must be ACTIVE,INACTIVE,REVOKED');


const persistencePromotedIdentifiers = new Set(['IdentityId','OrganizationId','ApplicationSessionId','ContentPackId','LearningSessionId','CertificationId','IdempotencyKey','RequestId']);
for (const id of persistencePromotedIdentifiers) {
  const x=(docs['identifiers.json']?.entries||[]).find(v=>v.id===id);
  if (x?.status!=='approved') errors.push(`identifiers.json: ${id} must be approved in K00 0.14.0`);
}
for (const id of ['IdentityStatus','ApplicationSessionStatus','LearningSessionStatus']) {
  const x=stateSetMap.get(id);
  if (x?.status!=='approved') errors.push(`states.json: ${id} must be approved in K00 0.14.0`);
}
for (const id of ['CredentialId','AssignmentId','ProgressEventId','CapabilityId','MembershipId','LocationId']) {
  const x=(docs['identifiers.json']?.entries||[]).find(v=>v.id===id);
  if (x?.status!=='candidate') errors.push(`identifiers.json: excluded ${id} must remain candidate`);
}
for (const id of ['MembershipStatus','EvidenceState']) {
  const x=stateSetMap.get(id);
  if (x?.status!=='candidate') errors.push(`states.json: excluded ${id} must remain candidate`);
}

// Per-kind semantic schema (approved 2026-10-04): commands and events must
// carry owning_domain, definitions, and kind-specific semantic references.
for (const c of docs['commands.json']?.entries || []) {
  if (!c.owning_domain) errors.push(`commands.json: ${c.id} missing owning_domain`);
  if (!c.definition) errors.push(`commands.json: ${c.id} missing definition`);
  if (!c.authority) errors.push(`commands.json: ${c.id} missing authority`);
  if (!Array.isArray(c.requires)) errors.push(`commands.json: ${c.id} requires must be an array`);
}

const expectedApprovedCommandEvidence = new Map([
  ['AcceptInvitation',['IDN-24','IDN-27']],
  ['AssignContent',['MGR-7','LRN-2']],
  ['AuthenticateIdentity',['IDN-14','SES-17']],
  ['ChangeCredential',['IDN-15','IDN-16','IDN-26']],
  ['CompleteLearningSession',['LRN-3']],
  ['CreateApplicationSession',['SES-1','SES-3','SES-10']],
  ['CreateIdentity',['IDN-1','IDN-16']],
  ['CreateMembership',['TEN-3','TEN-18']],
  ['DeactivateIdentity',['IDN-21','IDN-22']],
  ['DeactivateMembership',['TEN-10','TEN-18']],
  ['InviteIdentity',['IDN-20','IDN-24','IDN-25']],
  ['IssueCertification',['CERT-1','CERT-8','CERT-9','CERT-10']],
  ['OffboardIdentity',['IDN-17','IDN-18','IDN-19','IDN-21']],
  ['PublishContentPack',['CNT-3','CNT-6']],
  ['ReactivateIdentity',['IDN-21','IDN-23']],
  ['ReconcileExternalEffect',['TXN-6','TXN-7','TXN-8','TXN-14','TXN-16']],
  ['RecordProgressEvent',['LRN-3','LRN-4','LRN-7','LRN-10']],
  ['RevokeApplicationSession',['SES-12','SES-14','SES-20']],
  ['RevokeCertification',['CERT-11','CERT-12']],
  ['RevokeInvitation',['IDN-24','IDN-28']],
  ['RevokeMembership',['TEN-18','TEN-19']],
  ['RevokeSingleUseToken',['IDN-11','IDN-26']],
  ['StartLearningSession',['LRN-2','LRN-3']],
]);
const expectedBlockedCommandBlockers = new Map([]);
const requirementFiles = new Map([
  ['IDN','contracts/c11-identity-credentials-contract.md'],
  ['SES','contracts/c12-application-sessions-contract.md'],
  ['TEN','contracts/c13-tenancy-membership-contract.md'],
  ['CNT','contracts/c31-content-teaching-engine-contract.md'],
  ['LRN','contracts/c32-learning-sessions-progress-contract.md'],
  ['MGR','contracts/c33-manager-operations-contract.md'],
  ['CERT','contracts/c34-certification-credentials-contract.md'],
  ['TXN','contracts/c22-transaction-idempotency-reconciliation-contract.md'],
]);
const ownerPrefixes = new Map([
  ['Identity',new Set(['IDN','SES'])],
  ['Organization',new Set(['TEN'])],
  ['Content',new Set(['CNT'])],
  ['Learning',new Set(['LRN','MGR'])],
  ['Certification',new Set(['CERT'])],
  ['TransactionControl',new Set(['TXN'])],
]);
const semanticDependencyIds = new Set();
for (const f of ['entities.json','identifiers.json','values.json','states.json','relationships.json']) {
  for (const e of docs[f]?.entries || []) semanticDependencyIds.add(e.id);
}
const contractTextCache = new Map();
function contractText(path) {
  if (!contractTextCache.has(path)) contractTextCache.set(path, readFileSync(join(ROOT,path),'utf8'));
  return contractTextCache.get(path);
}
for (const c of docs['commands.json']?.entries || []) {
  if (expectedApprovedCommandEvidence.has(c.id)) {
    if (c.status !== 'approved') errors.push(`commands.json: ${c.id} must be approved`);
    const expected = expectedApprovedCommandEvidence.get(c.id);
    if (JSON.stringify(c.promotion_evidence) !== JSON.stringify(expected)) errors.push(`commands.json: ${c.id} promotion_evidence mismatch`);
    for (const dep of c.requires || []) if (!semanticDependencyIds.has(dep)) errors.push(`commands.json: ${c.id} approved with missing dependency ${dep}`);
    const allowed = ownerPrefixes.get(c.owning_domain);
    for (const req of expected) {
      const prefix = req.split('-',1)[0];
      if (!allowed?.has(prefix)) errors.push(`commands.json: ${c.id} evidence ${req} is outside owning-domain contracts`);
      const path = requirementFiles.get(prefix);
      if (!path || !contractText(path).includes(`**${req}**`)) errors.push(`commands.json: ${c.id} evidence ${req} not found in active contract`);
    }
  } else if (expectedBlockedCommandBlockers.has(c.id)) {
    if (c.status !== 'candidate') errors.push(`commands.json: ${c.id} must remain candidate`);
    const expected = expectedBlockedCommandBlockers.get(c.id);
    if (JSON.stringify(c.promotion_blockers) !== JSON.stringify(expected)) errors.push(`commands.json: ${c.id} promotion_blockers mismatch`);
  } else {
    errors.push(`commands.json: ${c.id} missing command-promotion disposition`);
  }
}
if ([...(docs['commands.json']?.entries || [])].filter(c => c.status === 'approved').length !== 23) errors.push('commands.json: expected 23 approved commands');
if ([...(docs['commands.json']?.entries || [])].filter(c => c.status === 'candidate').length !== 0) errors.push('commands.json: expected 0 candidate commands');
const expectedDependencyEntities = new Map([
  ['Invitation',{identifier:'InvitationId',owner:'Identity'}],
  ['SetupToken',{identifier:'SetupTokenId',owner:'Identity'}],
  ['PasswordResetToken',{identifier:'PasswordResetTokenId',owner:'Identity'}],
  ['ReconciliationRecord',{identifier:'ReconciliationRecordId',owner:'TransactionControl'}],
]);
for (const [id,meta] of expectedDependencyEntities) {
  const e=(docs['entities.json']?.entries||[]).find(x=>x.id===id);
  if (!e) { errors.push(`entities.json: missing dependency entity ${id}`); continue; }
  if (e.status!=='approved') errors.push(`entities.json: ${id} must be approved`);
  if (e.identifier!==meta.identifier) errors.push(`entities.json: ${id} identifier must be ${meta.identifier}`);
  if (e.owning_domain!==meta.owner) errors.push(`entities.json: ${id} owner must be ${meta.owner}`);
  if (e.lifecycle?.state!=='approved') errors.push(`entities.json: ${id} lifecycle must be approved`);
  if (!e.lifecycle?.state_set || !e.lifecycle?.state_machine) errors.push(`entities.json: ${id} lifecycle references required`);
  const i=(docs['identifiers.json']?.entries||[]).find(x=>x.id===meta.identifier);
  if (!i) errors.push(`identifiers.json: missing ${meta.identifier}`);
  else {
    if (i.status!=='approved') errors.push(`identifiers.json: ${meta.identifier} must be approved`);
    if (i.represents!==id) errors.push(`identifiers.json: ${meta.identifier} must represent ${id}`);
    if (i.owning_domain!==meta.owner) errors.push(`identifiers.json: ${meta.identifier} owner must be ${meta.owner}`);
  }
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
const expectedCommandIds = new Set(['AcceptInvitation','AssignContent','AuthenticateIdentity','ChangeCredential','CompleteLearningSession','CreateApplicationSession','CreateIdentity','CreateMembership','DeactivateIdentity','DeactivateMembership','InviteIdentity','IssueCertification','OffboardIdentity','PublishContentPack','ReactivateIdentity','ReconcileExternalEffect','RecordProgressEvent','RevokeApplicationSession','RevokeCertification','RevokeInvitation','RevokeMembership','RevokeSingleUseToken','StartLearningSession']);
for (const id of expectedCommandIds) if (!commandSet.has(id)) errors.push(`commands.json: missing registered command ${id}`);
if (commandSet.size !== expectedCommandIds.size) errors.push(`commands.json: expected ${expectedCommandIds.size} commands, found ${commandSet.size}`);
if (eventSet.size !== 14) errors.push(`events.json: expected 14 events after command registration, found ${eventSet.size}`);
if (manifest?.rules?.audit_record_implies_domain_event !== false) errors.push('manifest.json: audit_record_implies_domain_event must be false');
if (manifest?.rules?.state_transition_implies_event !== false) errors.push('manifest.json: state_transition_implies_event must be false');
if (manifest?.rules?.event_registration_requires_explicit_contract_semantics !== true) errors.push('manifest.json: explicit contract semantics must be required for event registration');





// SEM-36 (C01 1.8.0): an approved entry MUST NOT depend on a candidate entry.
// Explicit owner-directed holds are enumerated by ID; anything else fails.
const MEMBERSHIP_HOLD_EXCEPTION = new Set([
  // Owner-directed hold 2026-10-04: Membership stays candidate pending OQ-TEN-1.
  // CreateMembership, DeactivateMembership, RevokeMembership are approved with
  // this documented exception. See Membership.promotion_hold in entities.json.
  'CreateMembership', 'DeactivateMembership', 'RevokeMembership',
]);
const statusById = new Map();
for (const [file, key] of [['entities.json','entity'],['commands.json','command'],['events.json','event'],['identifiers.json','identifier'],['values.json','value']]) {
  for (const e of docs[file]?.entries || []) statusById.set(e.id, e.status);
}
function depRefs(e) {
  const refs = [];
  if (Array.isArray(e.requires)) refs.push(...e.requires);
  if (e.from) refs.push(e.from);
  if (Array.isArray(e.to)) refs.push(...e.to); else if (e.to) refs.push(e.to);
  if (e.entity) refs.push(e.entity);
  if (e.emitted_by) refs.push(e.emitted_by);
  if (Array.isArray(e.scope)) refs.push(...e.scope);
  if (e.identifier) refs.push(e.identifier);
  return refs;
}
for (const [file, entries] of [['commands.json', docs['commands.json']?.entries || []], ['events.json', docs['events.json']?.entries || []]]) {
  for (const e of entries) {
    if (e.status !== 'approved') continue;
    for (const ref of depRefs(e)) {
      const st = statusById.get(ref);
      if (st === undefined) continue; // unknown concept: promotion gate's concern, not SEM-36's
      if (st !== 'approved' && !MEMBERSHIP_HOLD_EXCEPTION.has(e.id)) {
        errors.push(`${file}: ${e.id} approved but depends on candidate ${ref} (SEM-36)`);
      }
    }
  }
}

if (errors.length) {
  console.error(`Semantic kernel FAILED (${errors.length} problem${errors.length===1?'':'s'}):`);
  for (const e of errors) console.error(`- ${e}`);
  process.exit(1);
}
console.log('Semantic kernel PASS: TEACH-K00 0.13.0');
console.log(`Entities: ${(docs['entities.json']?.entries || []).length}`);
console.log(`Identifiers: ${(docs['identifiers.json']?.entries || []).length}`);
console.log(`Relationships: ${(docs['relationships.json']?.entries || []).length}`);
console.log(`State machines: ${(docs['state-machines.json']?.entries || []).length}`);
console.log(`Invariants: ${(docs['invariants.json']?.entries || []).length}`);
console.log(`Decision tables: ${(docs['decision-tables.json']?.entries || []).length}`);
console.log(`Commands: ${(docs['commands.json']?.entries || []).length}`);
console.log(`Events: ${(docs['events.json']?.entries || []).length}`);
