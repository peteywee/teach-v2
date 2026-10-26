import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import { inspectSemanticDependencyClosure } from './semantic-dependency-closure.mjs';
import { inspectDemoPhysicalSuccessor } from './demo-physical-successor.mjs';
import { inspectRecipeRegistration } from './demo-recipes-registration.mjs';
import { inspectSchemaIsolationRegistration } from './demo-schema-isolation-registration.mjs';
import { inspectKitchenRegistration } from './demo-kitchen-registration.mjs';

export const DEMO_PACKAGE_ID = 'TEACH-DEMO-RUNTIME-2026-10-17';
export const DEMO_PACKAGE_SHA256 = 'a1df23b03a0f0660a072cff00eb40d3d2fb60bc8c521f12b56977f559601196a';
export const DEMO_BASE = 'domains/demo-runtime';
export const DEMO_PROPOSAL = `${DEMO_BASE}/proposal-0.1.0`;
export const DEMO_FAMILY_KINDS = {
  entities: 'entity', identifiers: 'identifier', values: 'value_object',
  states: 'state_set', 'state-machines': 'state_machine', relationships: 'relationship',
  invariants: 'invariant', 'decision-tables': 'decision_table', commands: 'command',
  capabilities: 'capability', events: 'event',
};
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const canonical = value => JSON.stringify(Array.isArray(value) ? value.map(item => JSON.parse(canonical(item))) : value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().map(key => [key, JSON.parse(canonical(value[key]))])) : value);
export const DEMO_ENTRY_PROVENANCE = {
  package_id: DEMO_PACKAGE_ID, package_version: '0.1.0',
  approval_record: `${DEMO_BASE}/owner-approval.json`, issue: '#82', registered_on: '2026-10-17',
};

// Mechanical registration, not an implementation or a new semantic decision.
// Entity field declarations remain nested: ContentPack.fields.id is a data
// field type, never permission to rename the canonical ContentPack entry.
export function buildDemoKernelOverlay(source, proposal) {
  const docs = Object.fromEntries(Object.keys(DEMO_FAMILY_KINDS).map(family => {
    const path = `kernel/${family}.json`;
    return [path, JSON.parse(source.files[path])];
  }));
  for (const proposed of proposal.entries) {
    const path = `kernel/${proposed.family}.json`;
    if (!docs[path]) throw new Error(`unknown family ${proposed.family}`);
    const index = docs[path].entries.findIndex(entry => entry.id === proposed.id);
    const original = index === -1 ? {} : docs[path].entries[index];
    const entry = { ...structuredClone(original), id: proposed.id, kind: DEMO_FAMILY_KINDS[proposed.family], status: 'approved', owning_domain: proposed.owning_domain, definition: proposed.definition, requires: structuredClone(proposed.requires) };
    if (proposed.fields) {
      if (proposed.family === 'entities') entry.fields = structuredClone(proposed.fields);
      else {
        const reserved = ['id', 'kind', 'status', 'owning_domain', 'definition', 'requires', 'demo_runtime_registration'];
        for (const [key, value] of Object.entries(proposed.fields)) {
          if (reserved.includes(key)) entry.fields = { ...(entry.fields ?? {}), [key]: structuredClone(value) };
          else entry[key] = structuredClone(value);
        }
      }
    }
    if (proposed.constraints) entry.constraints = structuredClone(proposed.constraints);
    entry.demo_runtime_registration = { ...DEMO_ENTRY_PROVENANCE };
    if (proposed.family === 'entities' && proposed.id === 'Membership') delete entry.promotion_hold;
    if (proposed.family === 'entities' && !entry.identifier) {
      const identifier = proposed.requires.find(ref => ref.family === 'identifiers' && ref.id === `${proposed.id}Id`);
      if (!identifier) throw new Error(`no exact canonical identifier for ${proposed.id}`);
      entry.identifier = identifier.id;
    }
    if (proposed.family === 'identifiers' && !entry.represents) {
      const entities = proposed.requires.filter(ref => ref.family === 'entities');
      if (entities.length === 1) entry.represents = entities[0].id;
    }
    if (proposed.family === 'state-machines') {
      for (const [field, family] of [['entity', 'entities'], ['state_set', 'states']]) {
        if (entry[field]) continue;
        const refs = proposed.requires.filter(ref => ref.family === family);
        if (refs.length !== 1) throw new Error(`no unique ${field} for ${proposed.id}`);
        entry[field] = refs[0].id;
      }
    }
    // Exact policy corrections expressly named in decision-and-scope.md §4.
    if (proposed.family === 'decision-tables' && proposed.id === 'DT-002') {
      entry.inputs = ['session_valid', 'identity_active', 'membership_active', 'scope_valid', 'capability_present', 'target_visible', 'entitlement_allows'];
      entry.rules = [
        { when: 'session_valid=false or identity_active=false', outcome: 'DENY_401' },
        { when: 'session_valid=true and identity_active=true and membership_active=false', outcome: 'DENY_403' },
        { when: 'session_valid=true and identity_active=true and membership_active=true and scope_valid=false', outcome: 'DENY_403' },
        { when: 'session_valid=true and identity_active=true and membership_active=true and scope_valid=true and capability_present=false', outcome: 'DENY_403' },
        { when: 'session_valid=true and identity_active=true and membership_active=true and scope_valid=true and capability_present=true and target_visible=false', outcome: 'DENY_404_NON_DISCLOSING' },
        { when: 'all authority checks pass and entitlement_allows=false', outcome: 'DENY_403' },
        { when: 'all authority checks pass and entitlement_allows=true', outcome: 'ALLOW' },
      ];
    }
    if (proposed.family === 'decision-tables' && proposed.id === 'DT-008') {
      entry.inputs = ['input_schema_valid', 'required_scope_selector_present', 'client_authority_claim_present', 'server_scope_resolved', 'target_scope_resolved'];
      entry.rules = [
        { when: 'input_schema_valid=false', outcome: 'REJECT_INPUT_NO_SIDE_EFFECT' },
        { when: 'required_scope_selector_present=false', outcome: 'DENY' },
        { when: 'server_scope_resolved=false or target_scope_resolved=false', outcome: 'DENY' },
        { when: 'client_authority_claim_present=true', outcome: 'IGNORE_CLIENT_AUTHORITY_AND_VALIDATE_REQUIRED_SELECTOR_SERVER_SIDE' },
        { when: 'all server-side checks pass and required scope selector is validated', outcome: 'CONTINUE' },
      ];
      entry.failure_behavior = 'The required explicit scope tuple is a selector validated against database-current authority; client authority claims never grant tenant or target access.';
    }
    if (index === -1) docs[path].entries.push(entry); else docs[path].entries[index] = entry;
  }
  return docs;
}

export const DEMO_CAPABILITY_NAME_EXCEPTIONS = [
  'identity.demo.persona.create', 'identity.demo.persona.switch', 'identity.demo.sessions.revoke',
];
export function inspectDemoCapabilityNames(entries, grammar) {
  const pattern = new RegExp(grammar);
  const exceptions = new Set(DEMO_CAPABILITY_NAME_EXCEPTIONS);
  return entries.filter(entry => !pattern.test(entry.id) && !exceptions.has(entry.id))
    .map(entry => `demo registration: unapproved capability identifier grammar ${entry.id}`);
}

export function buildDemoAuthorityMetadata(source, proposal, registration, approval) {
  const keys = ['registration_id', 'version', 'approval_record', 'package_sha256', 'source_baseline_commit', 'source_baseline_tree', 'issue', 'registered_entries', 'runtime_activation_authorized', 'physical_admission_performed'];
  const summary = Object.fromEntries(keys.map(key => [key, registration[key]]));
  summary.record = `${DEMO_BASE}/registration.json`;
  const manifest = JSON.parse(source.files['kernel/manifest.json']);
  manifest.version = '0.18.0';
  manifest.updated_on = '2026-10-17';
  manifest.demo_runtime_registration = summary;
  const ownership = JSON.parse(source.files['domains/ownership-map.json']);
  ownership.version = '1.9.0';
  ownership.updated_on = '2026-10-17';
  ownership.approval_history = [...(ownership.approval_history ?? []), ownership.approval];
  ownership.approval = {
    state: 'approved', approved_on: '2026-10-17', owner: approval.owner,
    record: `${DEMO_BASE}/owner-approval.json`, issue: '#82',
    basis: `${DEMO_PACKAGE_ID}@0.1.0: exact 131-entry successor; one existing owner retained per concept.`,
  };
  ownership.demo_runtime_registration = summary;
  const contracts = {
    AuditLifecycle: ['C23'], Authorization: ['C01', 'C14'], Content: ['C31'],
    Identity: ['C11', 'C12'], Learning: ['C32', 'C33'], Organization: ['C13'],
    TransactionControl: ['C22'],
  };
  for (const proposed of proposal.entries) {
    const kind = DEMO_FAMILY_KINDS[proposed.family];
    let entry = ownership.entries.find(row => row.kind === kind && row.id === proposed.id);
    if (!entry) {
      if (!contracts[proposed.owning_domain]) throw new Error(`unknown owner ${proposed.owning_domain}`);
      entry = { kind, id: proposed.id, decision_state: 'approved', proposed_owner: proposed.owning_domain, authority_contracts: contracts[proposed.owning_domain] };
      ownership.entries.push(entry);
    }
    if (entry.proposed_owner !== proposed.owning_domain) throw new Error(`existing owner differs ${kind}:${proposed.id}`);
    entry.decision_state = 'approved';
    entry.demo_runtime_registration = { ...DEMO_ENTRY_PROVENANCE };
  }
  return { 'kernel/manifest.json': manifest, 'domains/ownership-map.json': ownership };
}

export function hasDemoRegistration(root) {
  return existsSync(join(root, `${DEMO_BASE}/registration.json`));
}

// Callers must validate inspectDemoRuntimeRegistration before using this reader.
// This is an explicit historical view for old exact-proof validators, not a
// filesystem override and not a substitute for current-source validation.
export function createHistoricalSourceReader(root, source) {
  const registered = hasDemoRegistration(root);
  let snapshot = source ?? (registered ? JSON.parse(readFileSync(join(root, `${DEMO_BASE}/source-baseline.json`), 'utf8')) : null);
  const registration = registered ? JSON.parse(readFileSync(join(root, `${DEMO_BASE}/registration.json`), 'utf8')) : null;
  const revised = new Set(registered ? [
    ...Object.keys(DEMO_FAMILY_KINDS).map(family => `kernel/${family}.json`),
    'kernel/manifest.json', 'domains/ownership-map.json',
    ...Object.keys(registration.authority_file_hashes ?? {}),
  ] : []);
  if (registered) {
    const schema = inspectSchemaIsolationRegistration(root);
    // The immutable semantic-only predecessor is also a structural-test input:
    // its unmodified original evidence may project original overlay bytes while
    // a live, nonprojected input is intentionally invalid. This is not admission.
    // Any later successor or orphan switches back to complete-chain validation.
    const successor = schema.present || schema.errors.length || [
      'domains/demo-recipes', 'domains/demo-kitchen', 'persistence/physical-slices/demo-runtime',
      'persistence/physical-slices/demo-recipes', 'src/bootstrap/demo',
      'drizzle/0005_demo_runtime_owner_storage.sql', 'drizzle/meta/0005_snapshot.json',
      'kernel/content-schema-reference-successor.json',
      'contracts/superseded/c31-content-teaching-engine-contract-1.3.0.md',
      'contracts/superseded/c41-api-boundary-contract-1.2.0.md',
      'contracts/superseded/c42-web-client-boundary-contract-1.2.0.md',
    ].some(path => existsSync(join(root,path))) || [
      'contracts/c31-content-teaching-engine-contract.md','contracts/c41-api-boundary-contract.md','contracts/c42-web-client-boundary-contract.md',
    ].some(path => existsSync(join(root,path)) && readFileSync(join(root,path),'utf8').includes('demo_recipes_registration'));
    if (successor) {
      const verified = inspectDemoRuntimeRegistration(root);
      if (verified.errors.length) throw new Error(verified.errors.join('\n'));
      if (source && !isDeepStrictEqual(source, verified.source)) throw new Error('demo registration: historical reader requires the verified source snapshot');
      snapshot = verified.source;
      for (const path of [...verified.physicalSuccessor.revisedPaths, ...verified.schemaIsolationSuccessor.revisedPaths, ...verified.kitchenSuccessor.revisedPaths]) revised.add(path);
    } else {
      for (const [path, expected] of Object.entries(EVIDENCE_HASHES)) {
        if (hash(readFileSync(join(root,path))) !== expected) throw new Error('demo registration: exact original semantic evidence required: '+path);
      }
      const original = JSON.parse(readFileSync(join(root, `${DEMO_BASE}/source-baseline.json`),'utf8'));
      if (source && !isDeepStrictEqual(source,original)) throw new Error('demo registration: historical reader requires the verified source snapshot');
      snapshot = original;
    }
  }
  return path => snapshot && revised.has(path) && Object.hasOwn(snapshot.files, path) ? snapshot.files[path] : readFileSync(join(root, path), 'utf8');
}
export function readHistoricalSource(root, path) { return createHistoricalSourceReader(root)(path); }

// Pin all evidence after creation. A changed approval is not fresh permission.
const EVIDENCE_HASHES = {
  [`${DEMO_BASE}/registration.json`]: 'b94cf7c7c9bab35ad2454470295ae2b04b8814bd0ac55c282cdd3dd6df67218d',
  [`${DEMO_BASE}/source-baseline.json`]: '86071ed7379f2a9af85e7da501009803f353267fa66fe422d7b4926794135e8d',
  [`${DEMO_BASE}/owner-approval.json`]: 'b17341d3ed5198c554e68364f98932f1c224d0cbcad840e4332a9346657fed6e',
};

function inspectActiveAuthorityInventory(root, expectedFiles) {
  const errors = [];
  const expectedDirectories = new Set();
  for (const file of expectedFiles) {
    const parts = file.split('/');
    for (let count = 1; count < parts.length; count++) expectedDirectories.add(parts.slice(0, count).join('/'));
  }
  const seen = new Set();
  const visit = directory => {
    for (const entry of readdirSync(join(root, directory), { withFileTypes: true })) {
      const path = `${directory}/${entry.name}`;
      if (entry.isDirectory()) {
        if (!expectedDirectories.has(path)) errors.push(`demo registration: unexpected active authority directory ${path}`);
        else visit(path);
      } else if (!entry.isFile()) errors.push(`demo registration: active authority must be regular file or expected directory ${path}`);
      else {
        seen.add(path);
        if (!expectedFiles.has(path)) errors.push(`demo registration: unexpected active authority file ${path}`);
      }
    }
  };
  for (const directory of ['contracts', 'kernel', 'domains', 'governance', 'application-interfaces']) visit(directory);
  for (const path of expectedFiles) if (/^(contracts|kernel|domains|governance|application-interfaces)\//.test(path) && !seen.has(path)) errors.push(`demo registration: missing active authority file ${path}`);
  return errors;
}

export function inspectDemoRuntimeRegistration(root) {
  if (!hasDemoRegistration(root)) return { errors: inspectSchemaIsolationRegistration(root).errors, registered: false };
  const errors = [];
  const raw = path => readFileSync(join(root, path), 'utf8');
  const json = path => JSON.parse(raw(path));
  const equal = (actual, expected, label) => { if (!isDeepStrictEqual(actual, expected)) errors.push(`demo registration: ${label}`); };
  try {
    const sums = raw(`${DEMO_PROPOSAL}/SHA256SUMS`);
    equal(hash(sums), DEMO_PACKAGE_SHA256, 'immutable package digest differs');
    const seen = new Set();
    for (const line of sums.trimEnd().split('\n')) {
      const match = /^([a-f0-9]{64})  ([A-Za-z0-9_.-]+)$/.exec(line);
      if (!match || seen.has(match[2])) { errors.push('demo registration: malformed or duplicate immutable checksum'); continue; }
      seen.add(match[2]);
      equal(hash(raw(`${DEMO_PROPOSAL}/${match[2]}`)), match[1], `immutable package file differs: ${match[2]}`);
    }
    equal(seen.size, 16, 'exact 16-file checksum inventory required');
    const packageFiles = readdirSync(join(root, DEMO_PROPOSAL), { withFileTypes: true });
    equal(packageFiles.map(file => file.name).sort(), [...seen, 'SHA256SUMS'].sort(), 'exact immutable package directory inventory required');
    if (packageFiles.some(file => !file.isFile())) errors.push('demo registration: immutable package directory permits only regular files');
    for (const [path, sha256] of Object.entries(EVIDENCE_HASHES)) equal(hash(raw(path)), sha256, `immutable evidence differs: ${path}`);
    const source = json(`${DEMO_BASE}/source-baseline.json`);
    const packageSource = json(`${DEMO_PROPOSAL}/source-baseline.json`);
    const manifest = json(`${DEMO_PROPOSAL}/package-manifest.json`);
    const proposal = json(`${DEMO_PROPOSAL}/registry-proposal.json`);
    equal(source.baseline_commit, manifest.source_commit, 'source baseline commit differs');
    equal(source.baseline_tree, manifest.source_tree, 'source baseline tree differs');
    for (const [path, digest] of Object.entries(packageSource.files)) equal(hash(source.files[path] ?? ''), digest, `original source hash differs: ${path}`);
    equal(proposal.entries.length, 131, 'exact 131 semantic entries required');
    const counts = {};
    const keys = new Set();
    for (const entry of proposal.entries) {
      const key = `${entry.family}:${entry.id}`;
      if (keys.has(key)) errors.push(`demo registration: duplicate proposal ${key}`);
      keys.add(key);
      counts[entry.change] = (counts[entry.change] ?? 0) + 1;
      const baseline = JSON.parse(source.files[`kernel/${entry.family}.json`]).entries.find(item => item.id === entry.id);
      if (entry.change === 'ADD') equal(baseline, undefined, `ADD already exists ${key}`);
      else {
        equal(baseline?.status, entry.change === 'PROMOTE' ? 'candidate' : 'approved', `baseline disposition differs ${key}`);
        equal(hash(canonical(baseline)), entry.baseline_entry_sha256, `original entry digest differs ${key}`);
      }
    }
    equal(counts, { PROMOTE: 46, ADD: 70, REVISE: 15 }, 'exact change disposition counts required');
    if (errors.length) return { errors, registered: true };
    const registration = json(`${DEMO_BASE}/registration.json`);
    const approval = json(`${DEMO_BASE}/owner-approval.json`);
    equal(registration.registered_entries, proposal.entries.map(({ family, id, change }) => ({ family, id, change })), 'exact registered entry inventory required');
    equal(registration.package_id, DEMO_PACKAGE_ID, 'registered package ID differs');
    equal(registration.package_sha256, DEMO_PACKAGE_SHA256, 'registered package digest differs');
    equal(registration.state, 'REGISTERED_SEMANTICS_ONLY', 'registration must remain semantics-only');
    for (const flag of ['runtime_activation_authorized', 'physical_admission_performed', 'shared_or_production_execution_authorized']) equal(registration[flag], false, `registration cannot authorize ${flag}`);
    // The bounded recipe successor proves all current bytes and retained exact
    // predecessor bytes before the old source-bound authority checks may use them.
    const schemaIsolationSuccessor = inspectSchemaIsolationRegistration(root);
    errors.push(...schemaIsolationSuccessor.errors);
    const schemaRevisions = new Set(schemaIsolationSuccessor.revisedPaths);
    const recipeSuccessor = inspectRecipeRegistration(root);
    errors.push(...recipeSuccessor.errors);
    const recipeRevisions = new Set(recipeSuccessor.revisedPaths);
    const kitchenSuccessor = inspectKitchenRegistration(root);
    errors.push(...kitchenSuccessor.errors);
    const expectedFiles = new Set([
      ...Object.keys(source.files), ...Object.keys(registration.authority_file_hashes ?? {}),
      ...Object.keys(EVIDENCE_HASHES), ...[...seen, 'SHA256SUMS'].map(name => `${DEMO_PROPOSAL}/${name}`),
      ...recipeSuccessor.addedPaths, ...schemaIsolationSuccessor.addedPaths, ...kitchenSuccessor.addedPaths,
    ]);
    errors.push(...inspectActiveAuthorityInventory(root, expectedFiles));
    const overlay = buildDemoKernelOverlay(source, proposal);
    const docs = {};
    for (const [path, expected] of Object.entries(overlay)) {
      const current = json(path);
      equal(current, expected, `exact approved overlay / unrelated entries changed: ${path}`);
      docs[path.slice(7)] = current;
    }
    const baselinePolicy = JSON.parse(source.files['governance/decision-closure/c14-capability-matrix.json']);
    const policy = json('governance/decision-closure/c14-capability-matrix.json');
    equal(policy.capability_identifier_grammar, baselinePolicy.capability_identifier_grammar, 'baseline capability grammar must remain unchanged');
    equal(policy.capability_identifier_exceptions, DEMO_CAPABILITY_NAME_EXCEPTIONS, 'only the exact three approved capability name exceptions are permitted');
    equal(policy.capability_identifier_effective_rule, {
      authority: 'contracts/c01-canonical-semantics-contract.md#exact-demo-capability-identifier-compatibility',
      required_membership: 'kernel/capabilities.json approved exact vocabulary',
      shape: 'baseline pattern OR exact capability_identifier_exceptions; no other alternative',
    }, 'exact C01-authorized capability identifier precedence required');
    equal(policy.operations.map(operation => operation.capability).sort(), docs['capabilities.json'].entries.map(entry => entry.id).sort(), 'C14 operations must match exact 39 registered capability names');
    equal(docs['capabilities.json'].entries.length, 39, 'exact 39 registered capability names required');
    errors.push(...inspectDemoCapabilityNames(docs['capabilities.json'].entries, baselinePolicy.capability_identifier_grammar));
    const metadata = buildDemoAuthorityMetadata(source, proposal, registration, approval);
    for (const [path, expected] of Object.entries(metadata)) equal(json(path), expected, `exact metadata ancestry differs: ${path}`);
    const registeredAuthority = registration.authority_file_hashes;
    if (!registeredAuthority || typeof registeredAuthority !== 'object' || Array.isArray(registeredAuthority)) errors.push('demo registration: exact registered authority hash inventory required');
    for (const [path, digest] of Object.entries(registeredAuthority ?? {})) {
      if (!/^(contracts|domains|kernel|application-interfaces|governance|persistence)\/[A-Za-z0-9_./-]+$/.test(path) || path.includes('..') || !/^[a-f0-9]{64}$/.test(digest)) {
        errors.push(`demo registration: invalid authority hash target ${path}`); continue;
      }
      // Original reviewed pins remain unchanged. A verified successor replaces
      // only their exact paths, while independently sealing their new bytes.
      const registeredBytes = recipeRevisions.has(path) ? recipeSuccessor.predecessorFiles[path] : schemaRevisions.has(path) ? schemaIsolationSuccessor.predecessorFiles[path] : raw(path);
      equal(hash(registeredBytes), digest, `registered authority file differs: ${path}`);
    }
    const closure = inspectSemanticDependencyClosure(docs);
    errors.push(...closure.errors);
    equal(closure.approvedEntries, 236, 'exact all-family 236 approved entries required');
    equal(closure.checkedReferences, 583, 'exact all-family 583 semantic references required');
    equal(closure.exceptions, [], 'current approved closure must have no historical Membership holds');
    equal(docs['entities.json'].entries.find(entry => entry.id === 'Membership')?.promotion_hold, undefined, 'Membership hold must be removed after exact promotion');
    // Ordering is intentional: this synchronous leaf receives verified live
    // semantics and cannot call either admission orchestrator recursively.
    const physicalSuccessor = inspectDemoPhysicalSuccessor(root, {
      errors: [...errors], registered: true, registeredEntries: 131, closure, source, proposal,
    });
    errors.push(...physicalSuccessor.errors);
    const physicalRevisions = new Set(physicalSuccessor.revisedPaths);
    for (const [path, digest] of Object.entries(packageSource.files)) {
      if (Object.hasOwn(overlay, path) || Object.hasOwn(metadata, path) || Object.hasOwn(registeredAuthority ?? {}, path)) continue;
      // Only nine independently reviewed, byte-exact successors can replace
      // live predecessor hashes. Retained source hashes were checked above.
      if (physicalRevisions.has(path)) continue;
      const current = schemaRevisions.has(path) ? schemaIsolationSuccessor.predecessorFiles[path] : raw(path);
      // Criterion order has never been admission authority: retain the
      // existing positive control while every row, evidence value and all
      // other fields remain exact. Actual admission validation still reads
      // this live file, never a substituted historical record.
      if (/^persistence\/physical-slices\/[^/]+\/admission\.json$/.test(path)) {
        const normalize = text => {
          const value = JSON.parse(text);
          if (Array.isArray(value.criteria)) value.criteria.sort((a, b) => canonical(a).localeCompare(canonical(b)));
          return value;
        };
        equal(normalize(current), normalize(source.files[path]), `unchanged preceding source drift: ${path}`);
      } else equal(hash(current), digest, `unchanged preceding source drift: ${path}`);
    }
    return { errors, registered: true, registeredEntries: 131, closure, source, proposal, physicalSuccessor, recipeSuccessor, schemaIsolationSuccessor, kitchenSuccessor };
  } catch (error) {
    errors.push(`demo registration: missing or malformed evidence: ${error.message}`);
    return { errors, registered: true };
  }
}
