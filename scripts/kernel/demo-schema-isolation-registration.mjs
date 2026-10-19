import { createHash } from 'node:crypto';
import { existsSync, lstatSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { isDeepStrictEqual } from 'node:util';

export const SCHEMA_ISOLATION_BASE = 'governance/demo-schema-isolation';
export const SCHEMA_ISOLATION_ID = 'TEACH-DEMO-SCHEMA-ISOLATION-2026-10-19';
// Source seals establish a bounded recorded decision, not independent review,
// implementation conformance, physical admission or live execution authority.
export const SCHEMA_ISOLATION_REGISTRATION_SHA256 = '188788182ba635e7ab8cc21e8236aad89f707022c5cafdd6201de32ae2b2194d';
const SOURCE_SHA256 = '188f9d60358e3b5ad46f05257e897d8f0cf1edd3d9d12e8fc8008e326512366a';
const APPROVAL_SHA256 = '36a0c15b5121e87cf323ed47308b2ab440d0b7ed58e6e11d9c656f388ef39481';
const DESIGN_SHA256 = '38a1e27353073af60163e12fcfdc41582333094ac1ec8f4e24d8862598136453';
export const SCHEMA_ISOLATION_REVISED_PATHS = Object.freeze([
  'contracts/c21-database-migration-contract.md',
  'governance/decision-closure/07-evidence-release-operations-spec.md',
  'contracts/README.md', 'contracts/APPROVAL-RECORD.md',
]);
const ARCHIVES = Object.freeze([
  'contracts/superseded/c21-database-migration-contract-1.2.0.md',
  'governance/decision-closure/superseded/07-evidence-release-operations-spec-1.1.0.md',
]);
const EVIDENCE_NAMES = Object.freeze(['design.md', 'owner-approval.json', 'source-baseline.json', 'registration.json']);
const ADDED_PATHS = [...ARCHIVES, ...EVIDENCE_NAMES.map(name => `${SCHEMA_ISOLATION_BASE}/${name}`)];
const PREDECESSOR_HASHES = Object.freeze({
  [SCHEMA_ISOLATION_REVISED_PATHS[0]]: '8e3c550fb583a90d7c9ee2c1b62ed53b7c1b573fb874d316ba51c27eaa388279',
  [SCHEMA_ISOLATION_REVISED_PATHS[1]]: 'a0018831136b2d09920a92f67baf30715b794ae27477dace4045dca9a88fadde',
  [SCHEMA_ISOLATION_REVISED_PATHS[2]]: '52cfc226f6c94d948c860086f76b5b005c7b22d4285b1b4efa794df3e2166000',
  [SCHEMA_ISOLATION_REVISED_PATHS[3]]: '992c4c4c592f98c6c0aed7a426328d7788c832d8332d89997a74a4eca0325ef2',
});
const BLOCKED_FLAGS = ['runtime_activation_authorized', 'shared_or_production_execution_authorized', 'live_database_changes_authorized', 'credential_creation_authorized', 'deployment_authorized', 'spending_authorized'];
const hash = value => createHash('sha256').update(value).digest('hex');
const metadata = text => JSON.parse(text.match(/^<!--tos-doc\n([\s\S]*?)\n-->\n/)?.[1] ?? 'null');

/** Read-only, non-recursive leaf. No predecessor bytes or authority paths escape
 * unless the complete new decision, every live authority file and both retained
 * predecessor registrations pass. It never delegates trust to a caller's reader. */
export function inspectSchemaIsolationRegistration(root) {
  const registrationPath = `${SCHEMA_ISOLATION_BASE}/registration.json`;
  const empty = { present: false, revisedPaths: [], addedPaths: [], predecessorFiles: {} };
  const errors = [], fail = message => errors.push(`demo schema isolation registration: ${message}`);
  const equal = (actual, expected, message) => { if (!isDeepStrictEqual(actual, expected)) fail(message); };
  const raw = path => {
    const parts = path.split('/');
    for (let index = 1; index <= parts.length; index++) {
      const stat = lstatSync(join(root, ...parts.slice(0, index)));
      if (stat.isSymbolicLink() || (index === parts.length ? !stat.isFile() : !stat.isDirectory())) throw Error(`regular file/ancestor required: ${path}`);
    }
    return readFileSync(join(root, path), 'utf8');
  };
  const json = path => JSON.parse(raw(path));
  try {
    if (!existsSync(join(root, registrationPath))) {
      const orphan = existsSync(join(root, SCHEMA_ISOLATION_BASE)) || ARCHIVES.some(path => existsSync(join(root, path))) ||
        SCHEMA_ISOLATION_REVISED_PATHS.some(path => existsSync(join(root, path)) && raw(path).includes('demo_schema_isolation_registration'));
      if (orphan) fail('orphan schema-isolation sources without registration');
      return { ...empty, errors };
    }
    for (const [path, digest] of [
      [registrationPath, SCHEMA_ISOLATION_REGISTRATION_SHA256],
      [`${SCHEMA_ISOLATION_BASE}/source-baseline.json`, SOURCE_SHA256],
      [`${SCHEMA_ISOLATION_BASE}/owner-approval.json`, APPROVAL_SHA256],
      [`${SCHEMA_ISOLATION_BASE}/design.md`, DESIGN_SHA256],
      ['domains/demo-runtime/registration.json', 'b94cf7c7c9bab35ad2454470295ae2b04b8814bd0ac55c282cdd3dd6df67218d'],
      ['domains/demo-recipes/registration.json', 'bd0b74666f5da45c70a0d1c0fe42d5d7099a5bc6c9d727b665e4381094605443'],
    ]) equal(hash(raw(path)), digest, `immutable evidence differs: ${path}`);
    const registration = json(registrationPath), source = json(`${SCHEMA_ISOLATION_BASE}/source-baseline.json`), approval = json(`${SCHEMA_ISOLATION_BASE}/owner-approval.json`);
    const runtime = json('domains/demo-runtime/registration.json'), recipes = json('domains/demo-recipes/registration.json');
    equal(registration.registration_id, SCHEMA_ISOLATION_ID, 'exact bounded registration ID required');
    equal(registration.version, '1.0.0', 'exact registration version required');
    equal(registration.state, 'REGISTERED_BOUNDED_LOCAL_PREPARATION_ONLY', 'local preparation is the only registered authority');
    equal(registration.source_baseline_commit, '87c427ebb4b7e8f5b65ae04a1c47165ccea81932', 'exact source baseline commit required');
    equal(registration.source_baseline_tree, '2f7306d3b5c6b02b0b52f78d96b348dde0ee660b', 'exact source baseline tree required');
    for (const key of ['source_baseline_commit', 'source_baseline_tree']) equal(source[key], registration[key], `source ${key} differs`);
    equal(registration.source_baseline_sha256, SOURCE_SHA256, 'source seal differs');
    equal(registration.approval_sha256, APPROVAL_SHA256, 'approval seal differs');
    equal(registration.approval_record, `${SCHEMA_ISOLATION_BASE}/owner-approval.json`, 'exact approval path required');
    equal(registration.design, `${SCHEMA_ISOLATION_BASE}/design.md`, 'exact design path required');
    equal(registration.design_sha256, DESIGN_SHA256, 'design seal differs');
    equal(registration.revised_paths, [...SCHEMA_ISOLATION_REVISED_PATHS], 'exact four revised authority paths required');
    equal(registration.added_paths, ADDED_PATHS, 'exact six added authority paths required');
    equal(Object.keys(source.files).sort(), [...SCHEMA_ISOLATION_REVISED_PATHS].sort(), 'exact four predecessor files required');
    equal(registration.predecessor_file_hashes, PREDECESSOR_HASHES, 'exact predecessor hash inventory required');
    for (const path of SCHEMA_ISOLATION_REVISED_PATHS) equal(hash(source.files[path] ?? ''), PREDECESSOR_HASHES[path], `registered predecessor bytes differ: ${path}`);
    equal(PREDECESSOR_HASHES[SCHEMA_ISOLATION_REVISED_PATHS[1]], runtime.authority_file_hashes[SCHEMA_ISOLATION_REVISED_PATHS[1]], 'operations predecessor must match immutable runtime registration');
    for (const path of SCHEMA_ISOLATION_REVISED_PATHS.slice(2)) equal(PREDECESSOR_HASHES[path], recipes.authority_file_hashes[path], `predecessor must match immutable recipe registration: ${path}`);
    const authorityPaths = [...SCHEMA_ISOLATION_REVISED_PATHS, ...ARCHIVES];
    equal(Object.keys(registration.authority_file_hashes).sort(), authorityPaths.slice().sort(), 'exact six live authority seals required');
    // Read only our finite path allowlist, never an injected manifest target.
    for (const path of authorityPaths) equal(hash(raw(path)), registration.authority_file_hashes[path], `registered authority file differs: ${path}`);
    const inventory = readdirSync(join(root, SCHEMA_ISOLATION_BASE), { withFileTypes: true });
    equal(inventory.map(entry => entry.name).sort(), [...EVIDENCE_NAMES].sort(), 'exact evidence directory inventory required');
    if (inventory.some(entry => !entry.isFile())) fail('evidence inventory permits only regular files');
    for (const record of [registration, approval]) {
      equal(record.schema, 'teach_v2_demo', 'only the exact isolated demo schema is authorized');
      equal(record.node_major, 24, 'owner-selected Node 24 required');
      equal(record.local_preparation_authorized, true, 'only local preparation approval required');
      for (const flag of BLOCKED_FLAGS) equal(record[flag], false, `registration/approval cannot authorize ${flag}`);
    }
    equal(registration.physical_admission_performed, false, 'registration is not physical admission');
    for (const key of ['independent_verification', 'implementation_conformance']) equal(registration[key], 'NOT_ESTABLISHED_BY_REGISTRATION', `registration cannot establish ${key}`);
    equal(approval.independent_verification, 'NOT_ESTABLISHED_BY_APPROVAL', 'approval cannot establish independent review');
    equal(approval.approval_id, SCHEMA_ISOLATION_ID, 'exact approval ID required');
    equal(approval.record_form, 'MINIMAL_OWNER_DECISION_SUMMARY', 'minimal owner decision summary required');
    if(Object.hasOwn(approval,'owner_message_id')||Object.hasOwn(approval,'exchanges'))fail('private conversation metadata must not be published');
    equal(approval.approval_timestamp, 'NOT_RECORDED_IN_SUPPLIED_EVIDENCE', 'recording date must not fabricate an approval timestamp');
    equal(registration.historical_migrations_immutable, true, 'historical migrations must remain immutable');
    equal(registration.legacy_data_import, 'ABSENT', 'legacy import remains absent');
    equal(registration.nonexception_data_api_default, 'DISABLED', 'nonexception Data API default must remain disabled');
    equal(registration.shared_resources_are_isolated, false, 'shared project resources cannot be claimed isolated');
    for (const [index, id, before] of [[0, 'TEACH-CON-C21', '1.2.0'], [1, 'TEACH-PROP-DCS-07', '1.1.0']]) {
      const path = SCHEMA_ISOLATION_REVISED_PATHS[index], old = source.files[path], current = raw(path), archive = raw(ARCHIVES[index]);
      const previousMetadata = metadata(old), currentMetadata = metadata(current);
      equal([previousMetadata.doc_id, previousMetadata.version], [id, before], `predecessor document identity differs: ${id}`);
      equal([currentMetadata.doc_id, currentMetadata.version, currentMetadata.status, currentMetadata.approval.approved_version], [id, '2.0.0', 'active', '2.0.0'], `current document metadata differs: ${id}`);
      equal(metadata(archive), { ...previousMetadata, status: 'superseded', superseded_by: `${id}@2.0.0`, superseded_on: '2026-10-19' }, `superseded metadata differs: ${id}`);
      equal(archive.split('The original body below is preserved, including its former current-status wording.\n')[1], old.replace(/^<!--tos-doc\n[\s\S]*?\n-->\n/, '').replace(/^\n+/, ''), `superseded original body differs: ${id}`);
      equal(currentMetadata.demo_schema_isolation_registration, {
        registration: registrationPath, approval_record: `${SCHEMA_ISOLATION_BASE}/owner-approval.json`, scope: 'LOCAL_CODE_AND_TESTS_ONLY', schema: 'teach_v2_demo', node_major: 24,
        runtime_activation: false, live_database_changes: false, deployment_authority: false, spending_authority: false,
      }, `bounded successor metadata differs: ${id}`);
    }
    return { errors, present: true, registration,
      revisedPaths: errors.length ? [] : [...SCHEMA_ISOLATION_REVISED_PATHS],
      addedPaths: errors.length ? [] : [...ADDED_PATHS],
      predecessorFiles: errors.length ? {} : { ...source.files },
    };
  } catch (error) {
    fail(`missing or malformed successor evidence: ${error.message}`);
    return { ...empty, errors, present: existsSync(join(root, registrationPath)) };
  }
}
