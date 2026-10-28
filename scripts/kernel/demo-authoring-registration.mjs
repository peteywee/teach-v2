import { inspectSourceInScope } from '../verification/source-inspection-scope.mjs';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import { authoringHash as hash, authoringPath, authoringReader, exactAuthoringDirectory } from './authoring-source-reader.mjs';
import { inspectSemanticDependencyClosure } from './semantic-dependency-closure.mjs';

export const AUTHORING_BASE = 'domains/demo-authoring';
export const AUTHORING_PROPOSAL = `${AUTHORING_BASE}/proposal-0.1.0`;
export const AUTHORING_PACKAGE_ID = 'TEACH-DEMO-AUTHORING-2026-10-26';
export const AUTHORING_BASELINE = '30b4c62dca6dbfe5cb709b5b6d1b34257bf5d567';
export const AUTHORING_BASELINE_TREE = 'ef3b12410f3efdf70724ac2532cfc3fe8f437d7e';
// Mechanical source seals. Null deliberately blocks until the exact owner scope
// and canonical package are recorded; these never represent independent review.
export const AUTHORING_REGISTRATION_SHA256 = '4c17002fe5cdb7122feae77235568e0b8d54222ab64257c857e3273473c8a3d8';
export const AUTHORING_PACKAGE_SHA256 = '168a26453ac4b05f0e08ecd0fe548fb38da586cf561ac391d16fdaf1f3da857b';
export const AUTHORING_SOURCE_SHA256 = 'a047c82fc232fb371710a06460892751b29ce5af5e91516b50f2e17f12274e9e';
export const AUTHORING_APPROVAL_SHA256 = '1fa0fb982efe1d2cce284d6c56cd69264082c582fd3205e16656237bf622f405';
export const AUTHORING_OPERATIONS = Object.freeze(['ReadAuthoringWorkspace', 'SaveContentDraft', 'PreviewContentDraft', 'PublishContentDraft', 'ReadAuthoringOperation']);
export const AUTHORING_TABLES = Object.freeze(['content_authoring_drafts', 'content_authoring_receipts']);
const PACKAGE_NAMES = Object.freeze(['README.md', 'package-manifest.json', 'authoring-wire.schema.json', 'authoring-operations.json', 'semantic-additions.json', 'authoring-policy.json']);
const EVIDENCE_NAMES = Object.freeze(['README.md', 'owner-approval.json', 'registration.json', 'source-baseline.json']);
const FAMILIES = Object.freeze(['entities', 'identifiers', 'values', 'states', 'state-machines', 'relationships', 'invariants', 'decision-tables', 'commands', 'capabilities', 'events']);
const NO_AUTHORITY = Object.freeze(['runtime_activation_authorized', 'physical_admission_performed', 'shared_or_production_execution_authorized', 'execution_authorized_by_registration']);

/** Newest, raw-only source leaf. It never calls a predecessor registration,
 * engineering, physical or runtime inspector. The cryptographically sealed
 * inventory is finite; all current and preserved bytes must pass before any
 * predecessor view is exposed. Owner scope is not an execution credential. */
export function inspectAuthoringRegistration(root) { return inspectSourceInScope('authoringRegistration', root); }
// Internal finite dispatcher entry. Direct invocation establishes no shared scope.
export function inspectAuthoringRegistrationUncached(root) {
  const empty = { present: false, errors: [], revisedPaths: [], addedPaths: [], predecessorFiles: {} };
  const errors = [], fail = message => errors.push(`demo authoring registration: ${message}`);
  const equal = (actual, expected, message) => { if (!isDeepStrictEqual(actual, expected)) fail(message); };
  const reader = authoringReader(root), raw = path => reader.read(path), json = path => JSON.parse(raw(path));
  const registrationPath = `${AUTHORING_BASE}/registration.json`;
  try {
    if (!existsSync(join(root, registrationPath))) {
      if ([AUTHORING_BASE, 'src/bootstrap/demo-authoring', 'drizzle/0008_demo_manager_authoring.sql', 'drizzle-isolated/0008_demo_manager_authoring.sql'].some(path => existsSync(join(root, path)))) fail('orphan authoring package, transport or migration without registration');
      return { ...empty, errors };
    }
    for (const [path, seal] of [[registrationPath, AUTHORING_REGISTRATION_SHA256], [`${AUTHORING_BASE}/source-baseline.json`, AUTHORING_SOURCE_SHA256], [`${AUTHORING_BASE}/owner-approval.json`, AUTHORING_APPROVAL_SHA256], [`${AUTHORING_PROPOSAL}/SHA256SUMS`, AUTHORING_PACKAGE_SHA256]]) equal(hash(raw(path)), seal, `immutable source evidence differs or remains unsealed: ${path}`);
    // Do not follow an unverified inventory or expose partial authority.
    if (errors.length) return { ...empty, present: true, errors };
    exactAuthoringDirectory(reader, AUTHORING_BASE, EVIDENCE_NAMES, ['proposal-0.1.0']);
    exactAuthoringDirectory(reader, AUTHORING_PROPOSAL, [...PACKAGE_NAMES, 'SHA256SUMS']);
    const seen = new Set();
    for (const line of raw(`${AUTHORING_PROPOSAL}/SHA256SUMS`).trimEnd().split('\n')) {
      const match = /^([a-f0-9]{64})  ([A-Za-z0-9_.-]+)$/.exec(line);
      if (!match || !PACKAGE_NAMES.includes(match[2]) || seen.has(match[2])) { fail('exact unique package checksum inventory required'); continue; }
      seen.add(match[2]); equal(hash(raw(`${AUTHORING_PROPOSAL}/${match[2]}`)), match[1], `immutable package file differs: ${match[2]}`);
    }
    equal([...seen].sort(), [...PACKAGE_NAMES].sort(), 'complete package checksum inventory required');
    const registration = json(registrationPath), source = json(`${AUTHORING_BASE}/source-baseline.json`), approval = json(`${AUTHORING_BASE}/owner-approval.json`), manifest = json(`${AUTHORING_PROPOSAL}/package-manifest.json`);
    equal([registration.registration_id, registration.package_id, registration.version, registration.state], [AUTHORING_PACKAGE_ID, AUTHORING_PACKAGE_ID, '0.1.0', 'REGISTERED_BOUNDED_AUTHORING_SOURCE_ONLY'], 'exact registration identity required');
    for (const record of [registration, source, manifest]) equal([record.baseline_commit, record.baseline_tree], [AUTHORING_BASELINE, AUTHORING_BASELINE_TREE], 'exact released predecessor required');
    equal(registration.package_sha256sums_digest, AUTHORING_PACKAGE_SHA256, 'exact package binding required');
    equal([registration.source_baseline_sha256, registration.approval_sha256], [AUTHORING_SOURCE_SHA256, AUTHORING_APPROVAL_SHA256], 'exact source/approval binding required');
    equal(registration.approval_record, `${AUTHORING_BASE}/owner-approval.json`, 'exact minimal owner record required');
    if (!/^https:\/\/github\.com\/peteywee\/teach-v2\/issues\/[1-9][0-9]*$/.test(registration.impact_issue ?? '')) fail('actual repository impact issue required; pending publication is not admission');
    for (const record of [approval, manifest]) equal(record.impact_issue, registration.impact_issue, 'same exact impact issue required');
    equal([approval.approval_id, approval.state, approval.record_form], [AUTHORING_PACKAGE_ID, 'APPROVED_BOUNDED_SCOPE', 'MINIMAL_OWNER_DECISION_SUMMARY'], 'bounded owner decision required');
    if (['question', 'response', 'exchanges', 'transcript', 'owner_message_id'].some(key => Object.hasOwn(approval, key))) fail('private conversation details must not be published');
    equal(approval.package_sha256sums_digest, AUTHORING_PACKAGE_SHA256, 'owner decision must bind exact package');
    equal(approval.release_approval_conditional_on_tests_and_checks, true, 'review and passing checks remain required');
    equal(approval.independent_verification, 'NOT_ESTABLISHED_BY_APPROVAL', 'owner approval is not independent review');
    for (const flag of NO_AUTHORITY) equal(registration[flag], false, `source registration cannot grant ${flag}`);
    for (const key of ['independent_verification', 'implementation_conformance']) equal(registration[key], 'NOT_ESTABLISHED_BY_REGISTRATION', `source registration cannot prove ${key}`);
    equal(manifest.artifact_files, [...PACKAGE_NAMES], 'exact proposal inventory required');
    equal(manifest.execution_authorized_by_package, false, 'proposal cannot grant execution');
    equal(registration.operations, [...AUTHORING_OPERATIONS], 'exact five manager operations required');
    equal(registration.new_tables, [...AUTHORING_TABLES], 'only two private representations allowed');
    equal(registration.prior_route_count, 15, 'all original routes retained');
    equal(registration.current_route_count, 20, 'exact combined twenty routes required');
    equal(registration.content_schema_versions, ['1.0.0', '1.1.0', '1.2.0'], 'published content lineage unchanged');
    equal(registration.historical_migrations_immutable, true, 'historical migrations remain immutable');
    const priorPaths = Object.keys(source.files ?? {}).sort(), currentPaths = Object.keys(registration.authority_file_hashes ?? {}).sort();
    equal(priorPaths, [...(registration.revised_paths ?? [])].sort(), 'exact predecessor path inventory required');
    equal(Object.keys(registration.predecessor_file_hashes ?? {}).sort(), priorPaths, 'exact predecessor hash inventory required');
    equal(currentPaths, [...(registration.revised_paths ?? []), ...(registration.added_authority_paths ?? [])].sort(), 'exact current authority inventory required');
    if (new Set(currentPaths).size !== currentPaths.length || !priorPaths.length) fail('nonempty unique finite authority inventory required');
    for (const path of priorPaths) { authoringPath(path); equal(hash(source.files[path]), registration.predecessor_file_hashes[path], `preserved authority differs: ${path}`); }
    for (const path of currentPaths) { authoringPath(path); equal(hash(raw(path)), registration.authority_file_hashes[path], `registered authority differs: ${path}`); }
    const semantic = json(`${AUTHORING_PROPOSAL}/semantic-additions.json`);
    const docs = Object.fromEntries(FAMILIES.map(family => [`${family}.json`, json(`kernel/${family}.json`)]));
    for (const family of FAMILIES) {
      const path = `kernel/${family}.json`, additions = semantic.entries.filter(entry => entry.family === family);
      const prior = JSON.parse(source.files[path]);
      if (additions.some(entry => prior.entries.some(old => old.id === entry.entry.id))) fail(`existing ${family} entries cannot be silently replaced`);
      equal(docs[`${family}.json`], { ...prior, entries: [...prior.entries, ...additions.map(entry => entry.entry)] }, `only exact appended semantic entries allowed: ${path}`);
    }
    if (semantic.entries.some(entry => !FAMILIES.includes(entry.family) || entry.entry?.status !== 'approved')) fail('typed approved semantic additions required');
    const closure = inspectSemanticDependencyClosure(docs); errors.push(...closure.errors);
    equal(closure.exceptions, [], 'current semantic closure cannot add exceptions');
    equal(registration.registered_entries, semantic.entries.map(({ family, entry }) => ({ family, id: entry.id })), 'exact registered semantic inventory required');
    equal(registration.semantic_closure, { approvedEntries: closure.approvedEntries, checkedReferences: closure.checkedReferences }, 'exact current semantic closure receipt required');
    const operations = json(`${AUTHORING_PROPOSAL}/authoring-operations.json`), policy = json('governance/decision-closure/c14-capability-matrix.json');
    const oldPolicy = JSON.parse(source.files['governance/decision-closure/c14-capability-matrix.json']);
    equal(operations.routes.map(row => row.operation), [...AUTHORING_OPERATIONS], 'canonical operation order required');
    equal(operations.routes.map(row => row.capability), ['content.draft.read', 'content.draft.write', 'content.draft.preview', 'content.draft.publish', 'transaction.authoring.read'], 'exact five grammar-compatible capabilities required');
    equal(policy.operations.slice(0, oldPolicy.operations.length), oldPolicy.operations, 'all old operation policies remain unchanged');
    equal(policy.operations.slice(oldPolicy.operations.length).map(row => [row.id, row.capability, row.kind, row.actor_classes, row.bundles]), operations.routes.map(row => [row.operation, row.capability, row.kind, ['HumanActor'], ['manager']]), 'new operations are manager HumanActor only');
    equal(policy.automation_principals, oldPolicy.automation_principals, 'old automation identities are not widened');
    equal(policy.capability_identifier_exceptions, oldPolicy.capability_identifier_exceptions, 'no new capability grammar exception');
    for (const [name, bundle] of Object.entries(oldPolicy.bundles)) equal(policy.bundles[name], name === 'manager' ? { ...bundle, capabilities: [...bundle.capabilities, ...operations.routes.map(row => row.capability)] } : bundle, 'only exact five bounded manager capabilities added');
    equal(policy.demo_persona_operation_allowlist, { ...oldPolicy.demo_persona_operation_allowlist, MANAGER: [...oldPolicy.demo_persona_operation_allowlist.MANAGER, ...AUTHORING_OPERATIONS] }, 'learner/common allowlists unchanged');
    equal(operations.tables.map(row => [row.name, row.runtime_privileges, row.delete]), [['content_authoring_drafts', ['SELECT', 'INSERT', 'UPDATE'], false], ['content_authoring_receipts', ['SELECT', 'INSERT'], false]], 'only exact non-delete private access scope');
    equal(semantic.entries.length, 17, 'exact seventeen semantic additions required');
    equal(semantic.entries.filter(row => row.family === 'commands').map(row => row.entry.id), ['SaveContentDraft', 'PublishContentDraft'], 'queries cannot become fake commands');
    const receiptId = docs['identifiers.json'].entries.find(entry => entry.id === 'AuthoringReceiptId');
    equal(receiptId.physical_mapping, { table: 'content_authoring_receipts', primary_key: ['demo_run_id', 'manager_identity_id', 'key'] }, 'composite receipt identity is not operation-dependent');
    const metadata = bytes => JSON.parse(bytes.match(/^<!--tos-doc\n([\s\S]*?)\n-->\n/)?.[1] ?? 'null');
    equal(registration.contracts.map(row => row.contract), ['C01', 'C14', 'C22', 'C23', 'C31', 'C41', 'C42'], 'exact seven bounded contract transitions');
    for (const row of registration.contracts) {
      const prior = source.files[row.path], current = raw(row.path), archive = raw(row.superseded_copy);
      const before = metadata(prior), after = metadata(current), saved = metadata(archive);
      equal([before.doc_id, before.version, after.doc_id, after.version, after.approval.record], [`TEACH-CON-${row.contract}`, row.from, `TEACH-CON-${row.contract}`, row.to, `${AUTHORING_BASE}/owner-approval.json`], 'exact contract identity and owner record required');
      equal(saved, { ...before, status: 'superseded', superseded_by: `TEACH-CON-${row.contract}@${row.to}`, superseded_on: '2026-10-26' }, 'archive metadata preserves prior approval');
      equal(archive.split('The original body below is preserved, including its former current-status wording.\n')[1], prior.replace(/^<!--tos-doc\n[\s\S]*?\n-->\n/, '').replace(/^\n+/, ''), 'archive body preserves exact prior bytes');
    }
    const addedPaths = [...registration.added_authority_paths, ...EVIDENCE_NAMES.map(name => `${AUTHORING_BASE}/${name}`), ...[...PACKAGE_NAMES, 'SHA256SUMS'].map(name => `${AUTHORING_PROPOSAL}/${name}`)];
    return { ...empty, present: true, errors, registration, packageSha256: AUTHORING_PACKAGE_SHA256, revisedPaths: errors.length ? [] : priorPaths, addedPaths: errors.length ? [] : addedPaths, predecessorFiles: errors.length ? {} : { ...source.files } };
  } catch (error) { fail(`missing or malformed source evidence: ${error.message}`); return { ...empty, present: true, errors }; }
}
