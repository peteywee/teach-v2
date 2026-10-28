import { inspectSourceInScope } from '../verification/source-inspection-scope.mjs';
import { inspectAuthoringPhysicalSuccessor, AUTHORING_STORAGE_PATHS } from './demo-authoring-physical-successor.mjs';
import { inspectKitchenPhysicalSuccessor } from './demo-kitchen-physical-successor.mjs';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import { inspectDemoRuntimeRegistration, createHistoricalSourceReader } from '../kernel/demo-runtime-registration.mjs';
import { inspectDemoPhysicalPrerequisites } from './demo-admission-evidence.mjs';
import { inspectAdmissionCriteria } from './admission-criteria.mjs';
import { inspectDemoRecipePhysicalSuccessor } from './demo-recipes-physical-successor.mjs';
import { inspectMigrationHistory } from '../packaging/migration-history-guards.mjs';

const lane = 'persistence/physical-slices/demo-runtime';
const ownerModules = { Organization: 'organization', Identity: 'identity', Content: 'content', Learning: 'learning', AuditLifecycle: 'audit-lifecycle', TransactionControl: 'transaction-control' };
export const DEMO_OWNER_ADAPTERS = {
  'organization/postgres-demo-organization.ts': 'PostgresDemoOrganization',
  'identity/postgres-demo-identity.ts': 'PostgresDemoIdentity',
  'content/postgres-demo-content.ts': 'PostgresDemoContent',
  'learning/postgres-demo-learning.ts': 'PostgresDemoLearning',
  'audit-lifecycle/postgres-demo-audit.ts': 'PostgresDemoAudit',
  'transaction-control/postgres-demo-receipts.ts': 'PostgresDemoReceipts',
};
const historicalRepositories = [
  'identity/postgres-identity-repository.ts', 'identity/postgres-application-session-repository.ts',
  'identity/postgres-invitation-repository.ts', 'identity/postgres-setup-token-repository.ts',
  'identity/postgres-password-reset-token-repository.ts', 'identity/postgres-credential-repository.ts',
  'learning/postgres-learning-session-repository.ts', 'transaction-control/postgres-reconciliation-record-repository.ts',
];
export const HISTORICAL_REPOSITORY_PATHS = historicalRepositories.map(path => ownerPath(path));
function ownerPath(path) { const [owner, file] = path.split('/'); return `src/modules/${owner}/infrastructure/persistence/${file}`; }
const historicalSchemas = ['transaction-control/schema.ts', 'identity/schema.ts', 'identity/token-schema.ts', 'identity/credential-schema.ts', 'learning/schema.ts'];
const auxiliarySources = [
  'identity/identity-database.ts', 'identity/input-snapshot.d.mts', 'identity/input-snapshot.mjs',
  'identity/postgres-identity-command-transaction.ts', 'identity/postgres-session-command-transaction.ts',
  'transaction-control/input-snapshot.d.mts', 'transaction-control/input-snapshot.mjs',
];
const demoSchemas = Object.values(ownerModules).map(owner => `${owner}/demo-schema.ts`);
const allowedPhysicalFiles = new Set([...historicalRepositories, ...historicalSchemas, ...auxiliarySources, ...Object.keys(DEMO_OWNER_ADAPTERS), ...demoSchemas].map(ownerPath));
const physicalHistoricalPaths = new Set([
  'persistence/physical-slices/readiness.json',
  'persistence/physical-slices/queue-post-p05.json',
  ...['learning-session', 'assignment', 'progress-event'].flatMap(owner => ['admission.json', 'admission-evidence-plan.json'].map(file => `persistence/physical-slices/${owner}/${file}`)),
  'persistence/physical-slices/learning-session/implementation.json',
]);

// Structural evidence only. Neither this function nor the historical projection
// turns authoring admission, recorded claims, or source inspection into runtime PASS.
export function inspectDemoStorageEvidence(root) { return inspectSourceInScope('storage', root); }
// Internal finite dispatcher entry. Direct invocation establishes no shared scope.
export function inspectDemoStorageEvidenceUncached(root) {
  const registration = inspectDemoRuntimeRegistration(root);
  const recipePhysicalSuccessor = inspectDemoRecipePhysicalSuccessor(root);
  const authoringPhysicalSuccessor = inspectAuthoringPhysicalSuccessor(root);
  const errors = [...registration.errors, ...recipePhysicalSuccessor.errors, ...authoringPhysicalSuccessor.errors];
  const currentPhysicalFiles = new Set([...allowedPhysicalFiles, ...(authoringPhysicalSuccessor.admitted ? AUTHORING_STORAGE_PATHS : [])]);
  const fail = message => errors.push(`demo owner storage: ${message}`);
  const text = path => { try { return path.startsWith('src/') && Object.hasOwn(authoringPhysicalSuccessor.predecessorFiles, path) ? authoringPhysicalSuccessor.predecessorFiles[path] : readFileSync(join(root, path), 'utf8'); } catch (error) { fail(`${path}: ${error.message}`); return ''; } };
  const load = path => { try { return JSON.parse(text(path)); } catch (error) { fail(`${path}: ${error.message}`); return null; } };
  const readiness = load('persistence/physical-slices/readiness.json');
  const extended = Boolean(readiness?.demo_physical_successor || existsSync(join(root, `${lane}/physical-successor.json`)) || existsSync(join(root, 'src/bootstrap/demo/demo-persistence-schema.ts')));
  if (!extended) return { errors, extended, registration, recipePhysicalSuccessor, authoringPhysicalSuccessor };
  if (!existsSync(join(root, `${lane}/physical-successor.json`))) fail('independently reviewed exact physical successor required');
  if (registration.physicalSuccessor?.present !== true || registration.physicalSuccessor.errors?.length || !isDeepStrictEqual([...(registration.physicalSuccessor?.revisedPaths ?? [])].sort(), [...physicalHistoricalPaths].sort())) fail('exact independently verified nine-path physical successor required');
  const admission = inspectDemoPhysicalPrerequisites(root, registration);
  errors.push(...admission.errors);
  if (admission.decision !== 'ADMIT') fail('fresh exact physical admission must be ADMIT');
  // Registration verifies the successor envelope and independent review itself;
  // presence of a marker, version, or caller-supplied Boolean never grants access.
  try {
  const mapping = load(`${lane}/representation.proposed.json`);
  const prior = load('drizzle/meta/0004_snapshot.json');
  const latest = load('drizzle/meta/0005_snapshot.json');
  const journal = load('drizzle/meta/_journal.json');
  const current = load('persistence/physical-slices/learning-session/implementation.json');
  const equal = (actual, expected, label) => { if (!isDeepStrictEqual(actual, expected)) fail(label); };
  const expectedTables = [...new Set([...Object.keys(prior?.tables ?? {}), ...(mapping?.tables ?? []).map(table => `public.${table.table}`)])].sort();
  equal(Object.keys(latest?.tables ?? {}).sort(), expectedTables, 'exact prior eight plus fourteen owner tables required');
  if (expectedTables.length !== 22) fail('exact 22-table current schema required');
  const kitchenPhysicalSuccessor = inspectKitchenPhysicalSuccessor(root); errors.push(...kitchenPhysicalSuccessor.errors);
  const migrationCount = authoringPhysicalSuccessor.admitted ? 9 : kitchenPhysicalSuccessor.admitted && recipePhysicalSuccessor.admitted ? 8 : recipePhysicalSuccessor.admitted ? 7 : 6;
  if (journal?.entries?.length !== migrationCount || journal?.entries?.[5]?.idx !== 5 || journal?.entries?.[5]?.tag !== '0005_demo_runtime_owner_storage') fail('exact historical history or independently reviewed recipe/kitchen guard successor required');
  errors.push(...inspectMigrationHistory(root));
  const migration = text('drizzle/0005_demo_runtime_owner_storage.sql');
  equal([...migration.matchAll(/CREATE TABLE\s+"([^"]+)"/g)].map(match => match[1]).sort(), (mapping?.tables ?? []).filter(table => table.table !== 'learning_sessions').map(table => table.table).sort(), 'migration must create exactly the fourteen admitted new owner tables');
  if (!/ALTER TABLE "learning_sessions"/.test(migration)) fail('migration must extend the existing P05 table, not replace its history');
  for (const [name, table] of Object.entries(prior?.tables ?? {})) if (name !== 'public.learning_sessions') equal(latest?.tables?.[name], table, `historical table changed: ${name}`);
  for (const table of mapping?.tables ?? []) {
    const actual = latest?.tables?.[`public.${table.table}`];
    equal(Object.keys(actual?.columns ?? {}).sort(), Object.keys(table.fields).sort(), `exact approved fields required: ${table.table}`);
    for (const [name, field] of Object.entries(table.fields)) {
      equal(actual?.columns?.[name]?.type, field.postgres_type === 'timestamptz' ? 'timestamp with time zone' : field.postgres_type, `approved type required: ${table.table}.${name}`);
      equal(actual?.columns?.[name]?.notNull, !field.nullable, `approved nullability required: ${table.table}.${name}`);
    }
  }
  const walk = directory => readdirSync(join(root, directory), { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? walk(`${directory}/${entry.name}`) : [`${directory}/${entry.name}`]);
  try {
    const files = walk('src/modules').filter(path => /\.(?:ts|js|mjs|mts)$/.test(path) && !path.endsWith('.test.ts'));
    for (const path of files) {
      const body = text(path);
      if (path.includes('/infrastructure/persistence/') && !currentPhysicalFiles.has(path)) fail(`unadmitted physical adapter or source: ${path}`);
      if (!currentPhysicalFiles.has(path) && /\bpgTable\s*\(|\bclass\s+Postgres\w*/.test(body)) fail(`unadmitted physical implementation: ${path}`);
    }
    for (const path of currentPhysicalFiles) if (!files.includes(path)) fail(`missing admitted physical source: ${path}`);
    const tableOwners = new Map((mapping?.tables ?? []).map(table => [table.table, ownerModules[table.owner]]));
    for (const name of Object.keys(prior?.tables ?? {})) {
      const table = name.slice('public.'.length);
      if (!tableOwners.has(table)) tableOwners.set(table, table.startsWith('identity_') ? 'identity' : table.startsWith('transaction_control_') ? 'transaction-control' : null);
    }
    for (const [suffix, name] of Object.entries(DEMO_OWNER_ADAPTERS)) {
      const body = text(ownerPath(suffix));
      equal([...body.matchAll(/\bexport\s+class\s+(Postgres\w+)/g)].map(match => match[1]), [name], `exact owner adapter required: ${suffix}`);
      const owner = suffix.split('/')[0];
      // Supplemental source boundary: repository SQL may use only its owner's
      // admitted tables. Cross-owner migration FKs/triggers are a separate,
      // independently admitted consistency mechanism, not repository authority.
      const sqlBody=body.replace(/\$\{databaseObject\(["']([a-z_][a-z0-9_]*)["']\)\}/g, '$1');
      for (const match of sqlBody.matchAll(/\b(?:FROM|JOIN|UPDATE|INTO|TRUNCATE(?:\s+TABLE)?)\s+(?:"?public"?\s*\.\s*)?"?([a-z_][a-z0-9_]*)"?/gi)) {
        const table = match[1].toLowerCase();
        if (tableOwners.has(table) && tableOwners.get(table) !== owner) fail(`owner adapter ${owner}/${name} queries foreign-owned table ${table}`);
      }
      for (const match of body.matchAll(/(?:from\s*|import\s*\()['"]([^'"]+)['"]/g)) {
        if (/\/infrastructure\//.test(match[1]) || /bootstrap/.test(match[1])) fail(`owner adapter must not import foreign infrastructure or bootstrap: ${owner}/${name}`);
      }
    }
    for (const [owner, module] of Object.entries(ownerModules)) {
      const actual = [...text(ownerPath(`${module}/demo-schema.ts`)).matchAll(/\bpgTable\s*\(\s*['"]([^'"]+)['"]/g)].map(match => match[1]).sort();
      equal(actual, (mapping?.tables ?? []).filter(table => table.owner === owner).map(table => table.table).sort(), `exact ${owner}-owned table definitions required`);
    }
    const repoCount = files.reduce((count, path) => count + [...text(path).matchAll(/\bexport\s+class\s+Postgres\w*Repository\b/g)].length, 0);
    if (repoCount !== 8) fail('historical eight repository implementations must remain exact');
  } catch (error) { fail(`source inventory: ${error.message}`); }
  const config = text('drizzle.config.ts');
  const schemas = /schema\s*:\s*\[([^\]]*)\]/.exec(config)?.[1];
  equal([...((schemas ?? '').matchAll(/['"]([^'"]+)['"]/g))].map(match => match[1]), ['./src/bootstrap/demo/demo-persistence-schema.ts'], 'live Drizzle config must use only exact owner-reference composition');
  const composition = text('src/bootstrap/demo/demo-persistence-schema.ts');
  const compositionSources = [...new Set([...composition.matchAll(/from\s+['"]([^'"]+)['"]/g)].map(match => match[1]))].sort();
  equal(compositionSources, [...historicalSchemas.filter(path => path !== 'learning/schema.ts'), ...demoSchemas].map(path => { const [owner,file]=path.split('/'); return `../../modules/${owner}/infrastructure/persistence/${file.replace(/\.ts$/, '.js')}`; }).sort(), 'composition must retain every historical owner and only admitted demo owners');
  if (/Repository|\.insert\(|\.update\(|\.delete\(/.test(composition)) fail('schema composition must not expose writes or repositories');
  for (const path of historicalSchemas.filter(path => path !== 'learning/schema.ts').map(ownerPath).concat('src/bootstrap/learning-persistence-schema.ts')) if (!text('drizzle.p05.config.ts').includes(`./${path}`)) fail(`historical generation config missing ${path}`);
  const guard = readiness?.implementation_guard;
  for (const [field, expected] of Object.entries({ tables_generated:22, migrations_generated:6, repositories_generated:14, implemented_slice_count:7, evidence_proof:'UNDER_TEST', shared_or_production_migration_execution_authorized:false, full_relational_schema_authorized:false })) equal(guard?.[field], expected, `current readiness ${field} must remain ${expected}`);
  for (const key of ['slice_p05_implementation','slice_p05_assignment_authorization','slice_p05_atomic_authorization_insert','slice_p05_pinned_drizzle_generation','slice_p05_postgres_integration','slice_p05_migration_determinism','slice_p05_p04_upgrade_replay','slice_p05_concurrent_completion','slice_p05_assignment_existence','demo_runtime']) equal(readiness?.evidence_states?.[key], 'UNDER_TEST', `current readiness ${key} cannot inherit historical proof`);
  equal(readiness?.current_physical_slice_admissions?.map(item => item.id).sort(), ['SLICE-P01','SLICE-P02','SLICE-P03','SLICE-P04','SLICE-P05','SLICE-P06','SLICE-P08'], 'only exact seven slices may be current');
  for (const id of ['SLICE-P05','SLICE-P06','SLICE-P08']) {
    const item = readiness?.current_physical_slice_admissions?.find(item => item.id === id);
    if (item?.evidence_proof !== 'UNDER_TEST' || item?.runtime_activation !== 'BLOCKED') fail(`${id} must preserve UNDER_TEST/BLOCKED current evidence`);
  }
  equal(Object.keys(current?.verification ?? {}).sort(), ['pinned_drizzle_generation','fresh_and_upgrade_replay','populated_p05_fail_closed','postgres_constraints','backend_privileges','atomic_authorization_insert','race_rollback_isolation','exact_head_ci'].sort(), 'complete under-test P05 extension verification inventory required');
  for (const name of ['learning-session','assignment','progress-event']) {
    const decision = load(`persistence/physical-slices/${name}/admission.json`);
    errors.push(...inspectAdmissionCriteria(load('persistence/authority.json'), decision, name));
    if (decision?.decision !== 'ADMIT' || decision?.physical_schema_authorized !== true || decision?.implementation_authorized !== true || decision?.migration_authoring_authorized !== true || decision?.shared_or_production_migration_execution_authorized !== false) fail(`exact isolated engineering authoring admission required: ${name}`);
  }
  if (current?.version !== '2.0.0' || current?.evidence_proof !== 'UNDER_TEST' || current?.runtime_proof !== 'NOT_RUN' || current?.runtime_activation !== 'BLOCKED' || Object.values(current?.verification ?? {}).some(state => state !== 'UNDER_TEST')) fail('current P05 extension cannot inherit historical runtime PASS');
  if (current?.assignment_reference?.existence_proven !== false || current?.assignment_reference?.foreign_key !== 'IMPLEMENTED_UNDER_TEST') fail('implemented Assignment FK must not claim unproven runtime evidence');
  const p07 = load('persistence/physical-slices/certification/admission.json');
  if (p07?.decision !== 'BLOCK' || p07?.implementation_authorized !== false) fail('P07 must remain BLOCK');
  } catch (error) { fail(`malformed current storage evidence: ${error.message}`); }
  return { errors, extended, registration, recipePhysicalSuccessor, authoringPhysicalSuccessor };
}

export function createPersistenceEvidenceContext(root) {
  const inspection = inspectDemoStorageEvidence(root);
  const historical = createHistoricalSourceReader(root, inspection.registration.source);
  // Physical snapshots are selected only after BOTH exact successor and actual
  // current storage checks pass. The unchanged original source is hash verified.
  const read = path => inspection.extended && physicalHistoricalPaths.has(path)
    ? (inspection.errors.length === 0 ? inspection.registration.source.files[path] : readFileSync(join(root, path), 'utf8'))
    : historical(path);
  return { ...inspection, read };
}
