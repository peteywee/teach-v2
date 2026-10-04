import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { inspectAdmissionCriteria } from './admission-criteria.mjs';
import { inspectMigrationHistory } from '../packaging/migration-history-guards.mjs';

export function inspectLearningImplementation(root) {
  const errors = [];
  const fail = (message) => errors.push(`SLICE-P05 implementation: ${message}`);
  const load = (path) => {
    try { return JSON.parse(readFileSync(join(root, path), 'utf8')); }
    catch (error) { fail(`${path}: ${error.message}`); return null; }
  };
  const text = (path) => {
    try { return readFileSync(join(root, path), 'utf8'); }
    catch (error) { fail(`${path}: ${error.message}`); return ''; }
  };
  const evidence = load('persistence/physical-slices/learning-session/implementation.json');
  const admission = load('persistence/physical-slices/learning-session/admission.json');
  const readiness = load('persistence/physical-slices/readiness.json');
  const journal = load('drizzle/meta/_journal.json');
  const snapshot = load('drizzle/meta/0004_snapshot.json');
  errors.push(...inspectAdmissionCriteria(load('persistence/authority.json'), admission, 'SLICE-P05'));
  if (admission?.decision !== 'ADMIT' || admission?.implementation_authorized !== true || admission?.migration_authoring_authorized !== true) fail('active ADMIT authority required');
  if (evidence?.implementation_id !== 'TEACH-SLICE-P05-PHYSICAL-IMPLEMENTATION' || evidence?.version !== '1.0.0' ||
      !['implemented', 'proven'].includes(evidence?.status) || evidence?.issue !== '#51' || evidence?.owning_module !== 'Learning' ||
      JSON.stringify(evidence?.records) !== JSON.stringify(['LearningSession']) ||
      evidence?.admission !== `persistence/physical-slices/learning-session/admission.json@${admission?.version}`) fail('implementation evidence identity/state mismatch');
  if (evidence?.runtime_activation !== 'BLOCKED' || readiness?.narrowed_next_lane?.runtime_activation !== 'BLOCKED') fail('runtime activation must remain BLOCKED');
  if (evidence?.authoritative_assignment_authorization_adapter !== 'UNKNOWN' || evidence?.atomic_authorization_and_insert !== 'PENDING' ||
      JSON.stringify(evidence?.runtime_blockers) !== JSON.stringify(['authoritative Assignment authorization adapter', 'atomic authorization-plus-insert proof'])) fail('Assignment authorization and atomic insert must remain explicit runtime blockers');
  if (evidence?.assignment_reference?.required !== true || evidence?.assignment_reference?.nullable !== false ||
      evidence?.assignment_reference?.existence_proven !== false || evidence?.assignment_reference?.foreign_key !== 'NOT_IMPLEMENTED_NO_ASSIGNMENT_STORAGE') fail('Assignment requiredness must not claim existence/authorization or a nonexistent FK');
  if (evidence?.shared_or_production_migration_execution_authorized !== false ||
      readiness?.implementation_guard?.shared_or_production_migration_execution_authorized !== false || admission?.shared_or_production_migration_execution_authorized !== false) fail('shared/production migration execution must remain blocked');
  const proofKeys = ['pinned_drizzle_generation','domain_application_tests','postgres_integration','empty_database_replay','p04_upgrade_replay','concurrent_completion','exact_head_ci'];
  const state = evidence?.status === 'proven' ? 'PASS' : 'PENDING';
  if (proofKeys.some((key) => evidence?.verification?.[key] !== state)) fail(`all physical verification fields must be ${state} for ${evidence?.status} evidence`);
  if (evidence?.status === 'proven' && (!/^[0-9a-f]{40}$/.test(evidence?.verification_source_commit ?? '') ||
      !/^[0-9a-f]{64}$/.test(evidence?.schema_fingerprint ?? ''))) fail('proven evidence requires exact verification source and replay fingerprint');
  if (evidence?.status === 'implemented' && (evidence?.verification_source_commit !== null || evidence?.schema_fingerprint !== null)) fail('pending verification must not claim a proof source or fingerprint');
  if (evidence?.integration_test_count !== 11 || evidence?.foundation_test_count !== 38) fail('declared test inventory mismatch');
  const p05 = readiness?.current_physical_slice_admissions?.find((item) => item.id === 'SLICE-P05');
  const candidate = readiness?.candidate_slices?.find((item) => item.id === 'SLICE-P05');
  if (candidate?.runtime_activation !== 'BLOCKED' || readiness?.evidence_states?.slice_p05_runtime_activation !== 'BLOCKED' ||
      readiness?.evidence_states?.slice_p05_assignment_authorization !== 'UNKNOWN' ||
      readiness?.evidence_states?.slice_p05_atomic_authorization_insert !== 'PENDING') fail('readiness runtime evidence must preserve BLOCKED/UNKNOWN/PENDING prerequisites');
  if (p05?.implementation_state !== 'IMPLEMENTED' || candidate?.current_state !== 'IMPLEMENTED' ||
      readiness?.evidence_states?.slice_p05_implementation !== (state === 'PASS' ? 'PROVEN' : 'PENDING') ||
      candidate?.implementation_evidence !== (state === 'PASS' ? 'PROVEN' : 'PENDING')) fail('readiness must distinguish implemented artifacts from proven acceptance');
  if (journal?.entries?.[4]?.tag !== '0004_slice_p05_learning_session' || journal?.entries?.[4]?.idx !== 4) fail('P05 must be journaled at idx 4 after P04');
  const table = snapshot?.tables?.['public.learning_sessions'];
  if (!table || JSON.stringify(Object.keys(table.columns)) !== JSON.stringify(['id','identity_id','assignment_id','status']) ||
      Object.values(table.columns).some((column) => column.notNull !== true)) fail('P05 snapshot must contain exactly four required LearningSession columns');
  const fks = Object.values(table?.foreignKeys ?? {});
  if (fks.length !== 1 || fks[0]?.tableTo !== 'identity_identities' || JSON.stringify(fks[0]?.columnsFrom) !== JSON.stringify(['identity_id'])) fail('P05 physical FK must reference canonical Identity; Assignment storage is absent');
  const schema = text('src/modules/learning/infrastructure/persistence/schema.ts');
  const repository = text('src/modules/learning/infrastructure/persistence/postgres-learning-session-repository.ts');
  const composition = text('src/bootstrap/learning-persistence-schema.ts');
  const migration = text('drizzle/0004_slice_p05_learning_session.sql');
  if (!composition.includes('defineLearningSessionTable(identities.id)') || !text('drizzle.config.ts').includes('./src/bootstrap/learning-persistence-schema.ts')) fail('owner-reference schema composition missing');
  for (const required of ["pgTable('learning_sessions'", "text('assignment_id').notNull()", "foreignKey({ name: 'learning_session_identity_fk'"]) if (!schema.includes(required)) fail(`schema missing ${required}`);
  for (const required of ["eq(this.table.identityId, scope.identityId)", "eq(this.table.status, 'ACTIVE')", ".set({ status: 'COMPLETED' })"]) if (!repository.includes(required)) fail(`repository scope/atomic completion missing ${required}`);
  for (const required of ['CREATE TABLE "learning_sessions"','REFERENCES "public"."identity_identities"("id")','learning_guard_session_write','BEFORE INSERT OR UPDATE ON "learning_sessions"','LearningSession references are immutable','LearningSession allows only ACTIVE to COMPLETED']) if (!migration.includes(required)) fail(`migration missing ${required}`);
  if ((migration.match(/CREATE TABLE /g) ?? []).length !== 1) fail('P05 migration must introduce exactly one table');
  const walk = (path) => readdirSync(join(root, path), { withFileTypes: true }).flatMap((entry) => entry.isDirectory() ? walk(`${path}/${entry.name}`) : [`${path}/${entry.name}`]);
  try {
    const files = walk('src/modules').filter((path) => /\.(?:ts|js|mjs)$/.test(path));
    for (const path of files) {
      const body = text(path);
      if (!path.startsWith('src/modules/learning/') && body.includes('learning/infrastructure/persistence')) fail(`foreign module imports Learning persistence: ${path}`);
      if (path.startsWith('src/modules/learning/') && /(?:identity|organization|authorization|content|certification|transaction-control)\/infrastructure\//.test(body)) fail(`Learning imports foreign Infrastructure: ${path}`);
    }
    const actual = {
      tables: Object.keys(load(`drizzle/meta/${String((journal?.entries?.length ?? 1) - 1).padStart(4, '0')}_snapshot.json`)?.tables ?? {}).length, migration_files: journal?.entries?.length,
      repositories: files.filter((path) => !path.endsWith('.test.ts')).reduce((n, path) => n + [...text(path).matchAll(/\bexport\s+class\s+Postgres[A-Za-z0-9_]*Repository\b/g)].length, 0),
      implemented_slices: readiness?.current_physical_slice_admissions?.filter((item) => ['PROVEN','IMPLEMENTED'].includes(item.implementation_state)).length,
    };
    const fields = { tables: 'tables_generated', migration_files: 'migrations_generated', repositories: 'repositories_generated', implemented_slices: 'implemented_slice_count' };
    for (const [key, value] of Object.entries(actual)) if (evidence?.physical_artifact_totals?.[key] !== value || readiness?.implementation_guard?.[fields[key]] !== value) fail(`${key} totals must match actual artifacts (${value}) and readiness`);
  } catch (error) { fail(`artifact inspection: ${error.message}`); }
  errors.push(...inspectMigrationHistory(root));
  return errors;
}
