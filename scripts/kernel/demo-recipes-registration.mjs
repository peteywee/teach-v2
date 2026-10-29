import { inspectSourceInScope } from '../verification/source-inspection-scope.mjs';
import { inspectAuthoringRegistration } from './demo-authoring-registration.mjs';
import { createHash } from 'node:crypto';
import { existsSync, lstatSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import { inspectSchemaIsolationRegistration } from './demo-schema-isolation-registration.mjs';
import { inspectKitchenRegistration } from './demo-kitchen-registration.mjs';

export const RECIPE_BASE = 'domains/demo-recipes';
export const RECIPE_PROPOSAL = `${RECIPE_BASE}/proposal-0.1.1`;
export const RECIPE_PREDECESSOR_PROPOSAL = `${RECIPE_BASE}/proposal-0.1.0`;
export const RECIPE_SCHEMA_PROJECTION = 'kernel/content-schema-reference-successor.json';
const PREDECESSOR_RECIPE_PACKAGE_SHA256 = '51e6cec2b309ca3a14c9ef5f1b8b9f6603c53ec3c4d350602996cf1b6c07b539';
export const RECIPE_PACKAGE_ID = 'TEACH-DEMO-RECIPES-2026-10-18';
// These are recorded source seals, not independent-review or runtime attestations.
export const RECIPE_PACKAGE_SHA256 = 'b5f80daf1d94ecbccb1a01f3e58be3fc98d32564567b1cf03fd5c639eb435255';
export const RECIPE_REGISTRATION_SHA256 = 'bd0b74666f5da45c70a0d1c0fe42d5d7099a5bc6c9d727b665e4381094605443';
const RECIPE_APPROVAL_SHA256 = 'a7d5d653bdfd6d3d34c43189b4c265fa663e880662d51064d59b48888a25177c';
const RECIPE_SOURCE_SHA256 = '369990712fa57e7d73a3eb294a50c6b455ddccf901b37bfeda591170f753516b';
const ORIGINAL_REGISTRATION_SHA256 = 'b94cf7c7c9bab35ad2454470295ae2b04b8814bd0ac55c282cdd3dd6df67218d';
const ORIGINAL_PACKAGE_SHA256 = 'a1df23b03a0f0660a072cff00eb40d3d2fb60bc8c521f12b56977f559601196a';
export const RECIPE_REVISED_PATHS = Object.freeze([
  'contracts/c31-content-teaching-engine-contract.md',
  'contracts/c41-api-boundary-contract.md',
  'contracts/c42-web-client-boundary-contract.md',
  'contracts/README.md', 'contracts/APPROVAL-RECORD.md',
]);
const CONTRACT_REVISIONS = [
  ['C31', RECIPE_REVISED_PATHS[0], '1.3.0', '1.4.0'],
  ['C41', RECIPE_REVISED_PATHS[1], '1.2.0', '1.3.0'],
  ['C42', RECIPE_REVISED_PATHS[2], '1.2.0', '1.3.0'],
];
const ARCHIVES = CONTRACT_REVISIONS.map(([, path, before]) => path.replace('contracts/', 'contracts/superseded/').replace('.md', `-${before}.md`));
const PACKAGE_NAMES = Object.freeze(['README.md', 'content-schema-1.1.0.json', 'package-manifest.json', 'public-content-schema-1.1.0.json', 'synthetic-content-template-1.1.0.json']);
const EVIDENCE_NAMES = Object.freeze(['README.md', 'owner-approval.json', 'registration.json', 'source-baseline.json']);
const hash = value => createHash('sha256').update(value).digest('hex');
const metadata = text => JSON.parse(text.match(/^<!--tos-doc\n([\s\S]*?)\n-->\n/)?.[1] ?? 'null');

/** Synchronous, read-only and non-recursive. This gate proves exact registration
 * integrity, not independent review, physical admission, or local activation.
 * No caller may substitute predecessor bytes unless this returns no errors. */
export function inspectRecipeRegistration(root) { return inspectSourceInScope('recipeRegistration', root); }
// Internal finite dispatcher entry. Direct invocation establishes no shared scope.
export function inspectRecipeRegistrationUncached(root) {
  const registrationPath = `${RECIPE_BASE}/registration.json`;
  const empty = { present: false, revisedPaths: [], addedPaths: [], predecessorFiles: {} };
  if (!existsSync(join(root, registrationPath))) return {
    ...empty, errors: existsSync(join(root, RECIPE_BASE)) ? ['demo recipe registration: orphan recipe sources without registration'] : [],
  };
  const authoring = inspectAuthoringRegistration(root);
  const errors = [...authoring.errors], fail = message => errors.push(`demo recipe registration: ${message}`);
  if (errors.length) return { ...empty, present: true, errors };
  const equal = (actual, expected, message) => { if (!isDeepStrictEqual(actual, expected)) fail(message); };
  const raw = path => {
    if (Object.hasOwn(authoring.predecessorFiles, path)) return authoring.predecessorFiles[path];
    const parts = path.split('/');
    for (let index = 1; index <= parts.length; index++) {
      const stat = lstatSync(join(root, ...parts.slice(0, index)));
      if (stat.isSymbolicLink() || (index === parts.length ? !stat.isFile() : !stat.isDirectory())) throw Error(`regular file/ancestor required: ${path}`);
    }
    return readFileSync(join(root, path), 'utf8');
  };
  const json = path => JSON.parse(raw(path));
  try {
    for (const [path, digest] of [
      [registrationPath, RECIPE_REGISTRATION_SHA256],
      [`${RECIPE_BASE}/owner-approval.json`, RECIPE_APPROVAL_SHA256],
      [`${RECIPE_BASE}/source-baseline.json`, RECIPE_SOURCE_SHA256],
      ['domains/demo-runtime/registration.json', ORIGINAL_REGISTRATION_SHA256],
      ['domains/demo-runtime/owner-approval.json', 'b17341d3ed5198c554e68364f98932f1c224d0cbcad840e4332a9346657fed6e'],
      ['domains/demo-runtime/source-baseline.json', '86071ed7379f2a9af85e7da501009803f353267fa66fe422d7b4926794135e8d'],
      ['domains/demo-runtime/proposal-0.1.0/SHA256SUMS', ORIGINAL_PACKAGE_SHA256],
    ]) equal(hash(raw(path)), digest, `immutable evidence differs: ${path}`);
    // This leaf also runs directly in activation checks. Never rely on its
    // caller to verify the original source package behind the pinned manifest.
    const originalProposal = 'domains/demo-runtime/proposal-0.1.0';
    const originalSums = raw(`${originalProposal}/SHA256SUMS`), originalSeen = new Set();
    for (const line of originalSums.trimEnd().split('\n')) {
      const match = /^([a-f0-9]{64})  ([A-Za-z0-9_.-]+)$/.exec(line);
      if (!match || originalSeen.has(match[2])) { fail('malformed original runtime package checksum'); continue; }
      originalSeen.add(match[2]); equal(hash(raw(`${originalProposal}/${match[2]}`)), match[1], `immutable original runtime package file differs: ${match[2]}`);
    }
    equal(originalSeen.size, 16, 'exact original sixteen-file runtime package required');
    const originalEntries = readdirSync(join(root, originalProposal), { withFileTypes: true });
    equal(originalEntries.map(entry => entry.name).sort(), [...originalSeen, 'SHA256SUMS'].sort(), 'exact original runtime package directory inventory required');
    if (originalEntries.some(entry => !entry.isFile())) fail('original runtime package permits only regular files');
    // Verify every new current byte before consulting its exact predecessor for
    // the two ledger/index paths pinned by this immutable recipe registration.
    const schemaIsolationSuccessor = inspectSchemaIsolationRegistration(root);
    errors.push(...schemaIsolationSuccessor.errors);
    const schemaRevisions = new Set(schemaIsolationSuccessor.revisedPaths);
    const kitchen = inspectKitchenRegistration(root);
    errors.push(...kitchen.errors);
    const kitchenPredecessor = path => Object.hasOwn(kitchen.predecessorFiles, path) ? kitchen.predecessorFiles[path] : raw(path);
    const registration = json(registrationPath);
    const source = json(`${RECIPE_BASE}/source-baseline.json`);
    const approval = json(`${RECIPE_BASE}/owner-approval.json`);
    const original = json('domains/demo-runtime/registration.json');
    equal(registration.registration_id, RECIPE_PACKAGE_ID, 'exact successor ID required');
    equal(registration.package_id, RECIPE_PACKAGE_ID, 'exact package ID required');
    equal(registration.version, '0.1.1', 'exact registration version required');
    equal(registration.package_version, '0.1.1', 'exact package version required');
    equal(registration.state, 'REGISTERED_BOUNDED_CONTENT_AND_GUARD_ONLY', 'bounded registration state required');
    equal(registration.package_sha256sums_digest, RECIPE_PACKAGE_SHA256, 'sealed package binding required');
    equal(registration.source_baseline_commit, '2ad83bfce7d5c460f9f5f383a36491d9188de916', 'exact issue baseline required');
    equal(source.baseline_commit, registration.source_baseline_commit, 'source baseline commit differs');
    equal(source.baseline_tree, registration.source_baseline_tree, 'source baseline tree differs');
    equal(registration.source_baseline_sha256, RECIPE_SOURCE_SHA256, 'source evidence seal differs');
    equal(registration.approval_sha256, RECIPE_APPROVAL_SHA256, 'approval evidence seal differs');
    equal(registration.approval_record, `${RECIPE_BASE}/owner-approval.json`, 'exact approval path required');
    equal(registration.immutable_proposal, RECIPE_PROPOSAL, 'exact source package path required');
    equal(registration.predecessor_registration, { path: 'domains/demo-runtime/registration.json', sha256: ORIGINAL_REGISTRATION_SHA256, package_sha256sums_digest: ORIGINAL_PACKAGE_SHA256 }, 'original registration binding differs');
    equal(Object.keys(source.files).sort(), [...RECIPE_REVISED_PATHS].sort(), 'exact five predecessor files required');
    for (const path of RECIPE_REVISED_PATHS) equal(hash(source.files[path] ?? ''), original.authority_file_hashes[path], `original registered predecessor bytes differ: ${path}`);
    equal(Object.keys(registration.authority_file_hashes).sort(), [...RECIPE_REVISED_PATHS, ...ARCHIVES, RECIPE_SCHEMA_PROJECTION].sort(), 'exact five authority revisions, three preserved contracts and one schema-reference projection required');
    for (const [path, digest] of Object.entries(registration.authority_file_hashes)) {
      if (![...RECIPE_REVISED_PATHS, ...ARCHIVES, RECIPE_SCHEMA_PROJECTION].includes(path)) continue;
      equal(hash(schemaRevisions.has(path) ? schemaIsolationSuccessor.predecessorFiles[path] : kitchenPredecessor(path)), digest, `registered authority file differs: ${path}`);
    }
    equal(Object.keys(registration.evidence_hashes).sort(), EVIDENCE_NAMES.filter(name => name !== 'registration.json').map(name => `${RECIPE_BASE}/${name}`).sort(), 'exact evidence inventory required');
    for (const name of EVIDENCE_NAMES.filter(name => name !== 'registration.json')) {
      const path = `${RECIPE_BASE}/${name}`;
      equal(hash(raw(path)), registration.evidence_hashes[path], `source evidence differs: ${path}`);
    }
    equal(registration.contracts.map(({ contract, path, from, to, superseded_copy }) => [contract, path, from, to, superseded_copy]), CONTRACT_REVISIONS.map((row, index) => [...row, ARCHIVES[index]]), 'exact three contract version transitions required');
    for (const [index, [id, path, before, after]] of CONTRACT_REVISIONS.entries()) {
      const current = kitchenPredecessor(path), old = source.files[path], archive = raw(ARCHIVES[index]);
      const oldMeta = metadata(old), currentMeta = metadata(current), archiveMeta = metadata(archive);
      equal([currentMeta.doc_id, currentMeta.version, currentMeta.status, currentMeta.approval.approved_version, currentMeta.approval.record], [`TEACH-CON-${id}`, after, 'active', after, `${RECIPE_BASE}/owner-approval.json`], `current contract metadata differs: ${id}`);
      equal(archiveMeta, { ...oldMeta, status: 'superseded', superseded_by: `TEACH-CON-${id}@${after}`, superseded_on: '2026-10-18' }, `superseded metadata differs: ${id}`);
      const oldBody = old.replace(/^<!--tos-doc\n[\s\S]*?\n-->\n/, '').replace(/^\n+/, '');
      const archiveBody = archive.split('The original body below is preserved, including its former current-status wording.\n')[1];
      equal(archiveBody, oldBody, `superseded original body differs: ${id}`);
      equal(registration.contracts[index].before_sha256, hash(old), `before hash differs: ${id}`);
      equal(registration.contracts[index].after_sha256, hash(current), `after hash differs: ${id}`);
      equal(registration.contracts[index].superseded_sha256, hash(archive), `archive hash differs: ${id}`);
      equal(currentMeta.demo_runtime_registration, oldMeta.demo_runtime_registration, `original runtime authority metadata changed: ${id}`);
      if (!current.includes('| Version | Date | Change | By |')) fail(`complete changelog header required: ${id}`);
      equal(currentMeta.demo_recipes_registration.package, `${RECIPE_PACKAGE_ID}@0.1.1`, `successor package metadata differs: ${id}`);
      equal(currentMeta.demo_recipes_registration.sha256sums_sha256, RECIPE_PACKAGE_SHA256, `successor digest metadata differs: ${id}`);
    }
    const sums = raw(`${RECIPE_PROPOSAL}/SHA256SUMS`);
    equal(hash(sums), RECIPE_PACKAGE_SHA256, 'immutable package digest differs');
    const seen = new Set();
    for (const line of sums.trimEnd().split('\n')) {
      const match = /^([a-f0-9]{64})  ([A-Za-z0-9_.-]+)$/.exec(line);
      if (!match || seen.has(match[2]) || !PACKAGE_NAMES.includes(match[2])) { fail('malformed, duplicate or unapproved package checksum'); continue; }
      seen.add(match[2]);
      equal(hash(raw(`${RECIPE_PROPOSAL}/${match[2]}`)), match[1], `immutable package file differs: ${match[2]}`);
    }
    equal([...seen].sort(), [...PACKAGE_NAMES].sort(), 'exact five source artifacts required');
    const packageEntries = readdirSync(join(root, RECIPE_PROPOSAL), { withFileTypes: true });
    equal(packageEntries.map(entry => entry.name).sort(), [...PACKAGE_NAMES, 'SHA256SUMS'].sort(), 'exact immutable package directory inventory required');
    if (packageEntries.some(entry => !entry.isFile())) fail('package inventory permits only regular files');
    const evidenceEntries = readdirSync(join(root, RECIPE_BASE), { withFileTypes: true });
    equal(evidenceEntries.map(entry => entry.name).sort(), [...EVIDENCE_NAMES, 'proposal-0.1.0', 'proposal-0.1.1'].sort(), 'exact recipe evidence directory inventory required');
    if (evidenceEntries.some(entry => ['proposal-0.1.0', 'proposal-0.1.1'].includes(entry.name) ? !entry.isDirectory() : !entry.isFile())) fail('recipe evidence requires regular files and exact proposal directory');
    equal(approval.state, 'APPROVED_BOUNDED_SCOPE', 'owner approval required');
    equal(approval.package_sha256sums_digest, RECIPE_PACKAGE_SHA256, 'approval package binding differs');
    equal(approval.question.message_id, 'Sentinel_bb54ecb9be7c8191a74613073ea41da5', 'exact approval question source required');
    equal(approval.response, { message_id: 'Sentinel_225d967327cc819188c782fd856bd9e7', speaker: 'owner', text: 'approve' }, 'exact owner response required');
    equal(approval.sys21_issue.number, 88, 'exact SYS-21 issue required');
    equal(hash(approval.sys21_issue.historical_body), approval.sys21_issue.body_sha256, 'historical issue body differs');
    for (const key of ['runtime_activation_authorized', 'physical_admission_performed', 'shared_or_production_execution_authorized', 'hosting_authorized', 'spending_authorized', 'live_database_changes_authorized']) equal(registration[key], false, `registration cannot authorize ${key}`);
    for (const key of ['new_semantic_entries', 'new_tables', 'new_routes', 'new_capabilities']) equal(registration[key], 0, `registration cannot add ${key}`);
    equal(registration.independent_verification, 'NOT_ESTABLISHED_BY_REGISTRATION', 'registration cannot fabricate independent review');
    equal(registration.implementation_conformance, 'UNKNOWN', 'registration cannot fabricate runtime proof');
    equal(registration.recipe_count, 3, 'exact three recipes required');
    equal(registration.api_route_count, 15, 'exact fifteen existing routes required');
    equal(registration.served_asset_path_count, 7, 'exact seven existing served assets required');
    for (const key of ['exact_content_schema_versions', 'exact_public_content_schema_versions']) equal(registration[key], ['1.0.0', '1.1.0'], 'exact schema version allowlist required');
    equal(registration.new_synthetic_template_version, '1.1.0', 'exact successor template required');
    equal(registration.new_migrations, 1, 'exact one separately admitted additive strict guard migration required');
    equal(registration.physical_extension, {
      allowed_migration_count: 1, target_function: 'public.content_guard_demo_version', exact_content_schema_versions: ['1.0.0', '1.1.0'],
      independent_review_required: true, separate_physical_admission_required: true, execution_scope: 'DISPOSABLE_LOCAL_ONLY',
      historical_migrations_immutable: true, new_database_or_table_authorized: false, live_data_changes_authorized: false,
    }, 'bounded independent-review-gated physical scope differs');
    equal(registration.preserved_predecessor_proposal, { path: RECIPE_PREDECESSOR_PROPOSAL, version: '0.1.0', sha256sums_digest: PREDECESSOR_RECIPE_PACKAGE_SHA256 }, 'original recipe source package must remain immutable');
    const priorSums = raw(`${RECIPE_PREDECESSOR_PROPOSAL}/SHA256SUMS`);
    equal(hash(priorSums), PREDECESSOR_RECIPE_PACKAGE_SHA256, 'immutable original recipe package digest differs');
    const priorSeen = new Set();
    for (const line of priorSums.trimEnd().split('\n')) {
      const match = /^([a-f0-9]{64})  ([A-Za-z0-9_.-]+)$/.exec(line);
      if (!match || priorSeen.has(match[2]) || !PACKAGE_NAMES.includes(match[2])) { fail('malformed original recipe package checksum'); continue; }
      priorSeen.add(match[2]); equal(hash(raw(`${RECIPE_PREDECESSOR_PROPOSAL}/${match[2]}`)), match[1], `immutable original recipe package file differs: ${match[2]}`);
    }
    equal([...priorSeen].sort(), [...PACKAGE_NAMES].sort(), 'exact original recipe package source inventory required');
    const priorEntries = readdirSync(join(root, RECIPE_PREDECESSOR_PROPOSAL), { withFileTypes: true });
    equal(priorEntries.map(entry => entry.name).sort(), [...PACKAGE_NAMES, 'SHA256SUMS'].sort(), 'exact original recipe package directory inventory required');
    if (priorEntries.some(entry => !entry.isFile())) fail('original recipe package permits only regular files');
    for (const name of ['content-schema-1.1.0.json', 'public-content-schema-1.1.0.json', 'synthetic-content-template-1.1.0.json']) equal(raw(`${RECIPE_PROPOSAL}/${name}`), raw(`${RECIPE_PREDECESSOR_PROPOSAL}/${name}`), `corrective package cannot change approved schema or template: ${name}`);
    equal(approval.previous_approval.question.message_id, 'Sentinel_320d16ec3ce88191b915e1c9962ccfcb', 'original approval question must be retained');
    equal(approval.previous_approval.response, { message_id: 'Sentinel_b14361f04f608191af99747e22ca8841', speaker: 'owner', text: 'approve' }, 'original owner approval must be retained');
    equal(approval.previous_approval.package_sha256sums_digest, PREDECESSOR_RECIPE_PACKAGE_SHA256, 'original owner scope binding must be retained');
    const projection = json(RECIPE_SCHEMA_PROJECTION);
    equal(registration.schema_reference_projection, { path: RECIPE_SCHEMA_PROJECTION, sha256: hash(raw(RECIPE_SCHEMA_PROJECTION)) }, 'exact finite schema-reference projection binding required');
    equal(projection.target, { path: 'kernel/entities.json', entry: 'ContentPack', field: 'fields.versionPayload' }, 'only ContentPack versionPayload reference may be projected');
    equal(projection.predecessor_text, 'canonical schema 1.0.0 described in canonical_content_schema', 'exact predecessor field reference required');
    equal(projection.predecessor_registry_sha256, hash(raw('kernel/entities.json')), 'original kernel entries must remain byte-exact');
    equal(json('kernel/entities.json').entries.find(entry => entry.id === 'ContentPack')?.fields?.versionPayload, projection.predecessor_text, 'original ContentPack field must remain unchanged');
    equal(projection.exact_schema_references, [
      { version: '1.0.0', path: 'domains/demo-runtime/proposal-0.1.0/learning-definition.json', pointer: '/canonical_content_schema' },
      { version: '1.1.0', path: `${RECIPE_PROPOSAL}/content-schema-1.1.0.json`, pointer: '' },
    ], 'only exact original and successor schema references may resolve');
    equal(projection.new_concepts, [], 'schema reference must not introduce concepts');
    equal(projection.original_registry_entries_modified, false, 'schema projection cannot rewrite original entries');
    equal(projection.identity_owner_relationships_dependencies_unchanged, true, 'canonical semantics and ownership must remain unchanged');
    equal(projection.physical_admission_granted, false, 'schema projection cannot grant physical admission');
    equal(projection.runtime_activation_authorized, false, 'schema projection cannot activate runtime');
    return { errors, present: true, registration, packageSha256: RECIPE_PACKAGE_SHA256,
      revisedPaths: errors.length ? [] : [...RECIPE_REVISED_PATHS],
      addedPaths: errors.length ? [] : [...ARCHIVES, RECIPE_SCHEMA_PROJECTION, ...EVIDENCE_NAMES.map(name => `${RECIPE_BASE}/${name}`), ...[RECIPE_PROPOSAL, RECIPE_PREDECESSOR_PROPOSAL].flatMap(proposal => [...PACKAGE_NAMES, 'SHA256SUMS'].map(name => `${proposal}/${name}`))],
      predecessorFiles: errors.length ? {} : { ...source.files },
    };
  } catch (error) {
    fail(`missing or malformed successor evidence: ${error.message}`);
    return { ...empty, errors, present: true };
  }
}
