import { createHash } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import { inspectDemoRuntimeRegistration, createHistoricalSourceReader } from './demo-runtime-registration.mjs';
import { inspectSemanticDependencyClosure } from './semantic-dependency-closure.mjs';

export const PACKAGE_ID = 'TEACH-SEM-CAPABILITY-NAMES-2026-10-17';
export const PACKAGE_SHA256 = '6d02a94d16cbc94b209500dc111be15862e6738fa63920ae6bd711f6c0dd3b51';
const BASE = 'domains/capabilities';
const PROPOSAL = `${BASE}/proposal-0.1.1`;
const APPROVAL_HASH = 'c34991daa331498dfded6d666bbd57fccb8eacfa8660e6db1cb12ea4e9b48bd5';
const BASELINE_HASH = '475e3a805b0ae02a435e1eb9923392f163f8302305950bf10e0b934dbe26b50d';
const REGISTRATION_HASH = 'a94ef14a70b3212887a799806a50ddcefd9e24e1af6a8c9893eb2db3b89f4324';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const provenance = { package_id: PACKAGE_ID, package_version: '0.1.1', approval_record: `${BASE}/owner-approval.json`, promoted_on: '2026-10-17' };
const promote = entry => ({ ...entry, status: 'approved', promotion: provenance });

// A deliberately bounded JSON Schema interpreter for the admitted schema.
// Unknown schema keywords fail closed rather than silently skipping validation.
export function inspectAdmissionSchema(value, schema, path = '$') {
  const errors = [];
  const allowed = new Set(['$schema', 'title', 'description', 'type', 'required', 'properties', 'items', 'const', 'enum', 'minLength', 'minItems', 'maxItems']);
  for (const key of Object.keys(schema)) if (!allowed.has(key)) errors.push(`${path}: unsupported schema keyword ${key}`);
  if (Object.hasOwn(schema, 'const') && !isDeepStrictEqual(value, schema.const)) errors.push(`${path}: exact admitted const differs`);
  if (schema.enum && !schema.enum.some(item => isDeepStrictEqual(value, item))) errors.push(`${path}: enum differs`);
  const actual = value === null ? 'null' : Array.isArray(value) ? 'array' : typeof value;
  if (schema.type && !(Array.isArray(schema.type) ? schema.type : [schema.type]).includes(actual)) return [...errors, `${path}: type must be ${schema.type}`];
  if (actual === 'string' && schema.minLength !== undefined && value.length < schema.minLength) errors.push(`${path}: string too short`);
  if (actual === 'array') {
    if (schema.minItems !== undefined && value.length < schema.minItems) errors.push(`${path}: too few entries`);
    if (schema.maxItems !== undefined && value.length > schema.maxItems) errors.push(`${path}: too many entries`);
    if (schema.items) for (const [i, item] of value.entries()) errors.push(...inspectAdmissionSchema(item, schema.items, `${path}[${i}]`));
  }
  if (actual === 'object') {
    for (const key of schema.required ?? []) if (!Object.hasOwn(value, key)) errors.push(`${path}: missing ${key}`);
    for (const [key, child] of Object.entries(schema.properties ?? {})) if (Object.hasOwn(value, key)) errors.push(...inspectAdmissionSchema(value[key], child, `${path}.${key}`));
  }
  return errors;
}

// Validates recorded owner evidence and an exact reviewed package; it does not
// authenticate a user, issue approval, mutate statuses, or enable runtime use.
export function inspectCapabilityAdmission(root) {
  const errors = [];
  const equal = (a, b, label) => { if (!isDeepStrictEqual(a, b)) errors.push(`capability admission: ${label}`); };
  // The historical name/type package is still proved in full against its
  // exact retained successor baseline. Current sources independently pass the
  // exact approved demo overlay before any historical read is considered.
  const successor = inspectDemoRuntimeRegistration(root);
  errors.push(...successor.errors);
  if (errors.length) return { errors };
  const raw = createHistoricalSourceReader(root, successor.source);
  const json = path => JSON.parse(raw(path));
  try {
    const sums = raw(`${PROPOSAL}/SHA256SUMS`);
    equal(hash(sums), PACKAGE_SHA256, 'immutable package digest differs');
    equal(raw(`${PROPOSAL}/PACKAGE-SHA256`), `${PACKAGE_SHA256}  SHA256SUMS\n`, 'immutable package digest record differs');
    for (const line of sums.trimEnd().split('\n')) {
      const match = /^([a-f0-9]{64})  ([a-zA-Z0-9_.-]+)$/.exec(line);
      if (!match) { errors.push('capability admission: malformed immutable checksum'); continue; }
      equal(hash(raw(`${PROPOSAL}/${match[2]}`)), match[1], `immutable package file differs: ${match[2]}`);
    }
    equal(hash(raw(`${BASE}/owner-approval.json`)), APPROVAL_HASH, 'exact recorded owner approval required');
    equal(hash(raw(`${BASE}/source-baseline.json`)), BASELINE_HASH, 'immutable source-baseline evidence differs');
    equal(hash(raw(`${BASE}/registration.json`)), REGISTRATION_HASH, 'exact registration scope/provenance required');
    equal(hash(raw(`${BASE}/prior-owner-decisions.json`)), 'b257008847f3bcb1fc23f657c0ae791875019376241809af8a17754636777072', 'prior candidate/decision inventory evidence differs');
    if (errors.length) return { errors };

    const manifest = json(`${PROPOSAL}/manifest.json`);
    const proposal = json(`${PROPOSAL}/entries.proposed.json`);
    const source = json(`${BASE}/source-baseline.json`);
    const registration = json(`${BASE}/registration.json`);
    const ownershipProposal = json(`${PROPOSAL}/ownership-additions.proposed.json`);
    const baseline = path => JSON.parse(source.files[path]);
    equal(Object.keys(source.files).sort(), manifest.sources.map(item => item.path).sort(), 'exact baseline source inventory required');
    for (const entry of manifest.sources) equal(hash(source.files[entry.path]), entry.sha256, `original source hash differs: ${entry.path}`);
    equal(source.baseline_commit, manifest.baseline_commit, 'source baseline commit differs');
    const expected = proposal.entries.map(promote);
    equal(registration.promoted_entries, manifest.proposed_future_promotion_set, 'exact 36-entry promotion manifest required');
    equal(expected.length, 36, 'exactly 36 entries required');

    const docs = {};
    for (const path of Object.keys(source.files).filter(path => /^kernel\/[^/]+\.json$/.test(path) && path !== 'kernel/manifest.json')) {
      const old = baseline(path);
      const current = json(path);
      const target = structuredClone(old);
      const kind = { 'kernel/values.json': 'value_object', 'kernel/identifiers.json': 'identifier', 'kernel/capabilities.json': 'capability' }[path];
      for (const added of expected.filter(entry => kind && entry.kind === kind)) {
        const index = target.entries.findIndex(entry => entry.id === added.id);
        if (index === -1) target.entries.push(added); else target.entries[index] = added;
      }
      equal(current, target, `exact approved overlay / unrelated entries changed: ${path}`);
      docs[path.slice(7)] = current;
    }
    // Source authority remains byte-identical. Only the explicitly listed live
    // overlay/metadata files and reviewed checker implementation may differ.
    const revised = new Set(['kernel/values.json', 'kernel/identifiers.json', 'kernel/capabilities.json', 'kernel/manifest.json', 'domains/ownership-map.json', 'scripts/kernel/validate-semantic-kernel.mjs']);
    for (const entry of manifest.sources) if (!revised.has(entry.path)) equal(hash(raw(entry.path)), entry.sha256, `unchanged source authority drift: ${entry.path}`);
    const policy = json('governance/decision-closure/c14-capability-matrix.json');
    equal(raw('governance/decision-closure/c14-capability-matrix.json'), raw(`${PROPOSAL}/c14-policy.snapshot.json`), 'C14 policy bytes differ');
    for (const [index, op] of policy.operations.entries()) {
      const entry = docs['capabilities.json'].entries[index];
      equal(entry?.id, op.capability, `C14 capability name differs at ${index}`);
      equal(entry?.authorization_policy_ref, { path: 'governance/decision-closure/c14-capability-matrix.json', json_pointer: `/operations/${index}`, operation_id: op.id, operation_kind: op.kind }, `C14 operation reference differs at ${index}`);
      equal(entry?.identifier, 'CapabilityId', `typed identifier differs at ${index}`);
    }
    const value = docs['values.json'].entries.find(entry => entry.id === 'Capability');
    const identifier = docs['identifiers.json'].entries.find(entry => entry.id === 'CapabilityId');
    equal(value?.identifier, 'CapabilityId', 'Capability must reference the identifier type');
    equal(identifier?.represents, 'Capability', 'CapabilityId must represent the immutable Capability value');
    equal(identifier?.validation, { pattern: policy.capability_identifier_grammar, allowed_values_source: 'kernel/capabilities.json' }, 'typed name validation differs');

    const summaryKeys = ['registration_id','version','approval_record','package_sha256','source_baseline_commit','implementation_baseline_commit','promoted_entries','other_status_changes','runtime_grants_created','runtime_activation_authorized'];
    const summary = Object.fromEntries(summaryKeys.map(key => [key, registration[key]]));
    summary.record = `${BASE}/registration.json`;
    const kernel = baseline('kernel/manifest.json');
    kernel.version = '0.17.0'; kernel.updated_on = '2026-10-17'; kernel.capability_name_registration = summary;
    kernel.files.capability_schema = 'schema/capability-admission.schema.json';
    equal(json('kernel/manifest.json'), kernel, 'exact K00 0.17 ancestry / historical metadata required');
    const ownership = baseline('domains/ownership-map.json');
    ownership.version = '1.8.0'; ownership.updated_on = '2026-10-17'; ownership.approval_history = [ownership.approval];
    ownership.approval = { state: 'approved', approved_on: '2026-10-17', owner: registration.owner, record: `${BASE}/owner-approval.json`, basis: `${PACKAGE_ID}@0.1.1: exactly 35 added Authorization ownership assignments; all existing assignments preserved.` };
    ownership.entries.push(...ownershipProposal.proposed_additions.map(entry => ({ ...entry, decision_state: 'approved' })));
    ownership.capability_name_registration = summary;
    equal(json('domains/ownership-map.json'), ownership, 'exact ownership 1.8 ancestry / existing owners required');

    const schema = json('kernel/schema/capability-admission.schema.json');
    const expectedSchema = json(`${PROPOSAL}/entry-overlay.schema.proposed.json`);
    expectedSchema.title = 'Admitted Teach capability name/type entry overlay';
    expectedSchema.description = 'K00 0.17.0 exact owner-approved status overlay of immutable proposal 0.1.1. Executable validation checks these same const entries and structural constraints; this schema creates no grant.';
    expectedSchema.properties.state.const = 'REGISTERED';
    expectedSchema.properties.entries.items.properties.status.const = 'approved';
    expectedSchema.properties.entries.const = expected;
    equal(schema, expectedSchema, 'deterministic admitted schema differs');
    const live = expected.map(entry => docs[{ value_object: 'values.json', identifier: 'identifiers.json', capability: 'capabilities.json' }[entry.kind]].entries.find(item => item.id === entry.id));
    errors.push(...inspectAdmissionSchema({ ...proposal, state: 'REGISTERED', entries: live }, expectedSchema).map(error => `capability schema: ${error}`));
    const closure = inspectSemanticDependencyClosure(docs);
    errors.push(...closure.errors);
    equal(closure.approvedEntries, 120, 'exact all-family 120 approved entries required');
    equal(closure.checkedReferences, 147, 'exact all-family 147 semantic references required');
    equal(closure.exceptions, ['CreateMembership','DeactivateMembership','RevokeMembership'].map(id => `commands.json: ${id}.requires -> Membership: owner-directed Membership hold OQ-TEN-1 / C13 / #14 (SEM-36)`), 'exact historical Membership hold edges required');
    return { errors, promotedEntries: 36, capabilityNames: 34, closure };
  } catch (error) {
    errors.push(`capability admission: missing or malformed evidence: ${error.message}`);
    return { errors };
  }
}
