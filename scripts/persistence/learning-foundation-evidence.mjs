import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { inspectMigrationHistory } from '../packaging/migration-history-guards.mjs';

// This validates the current Domain/Application-only checkpoint. It does not
// manufacture runtime or PostgreSQL proof from recorded claims or test doubles.
export function inspectLearningFoundation(root) {
  const errors = [];
  const fail = (message) => errors.push(`SLICE-P05 foundation: ${message}`);
  const load = (path) => {
    try { return JSON.parse(readFileSync(join(root, path), 'utf8')); }
    catch (error) { fail(`${path}: ${error.message}`); return null; }
  };
  const foundation = load('persistence/physical-slices/learning-session/foundation.json');
  const admission = load('persistence/physical-slices/learning-session/admission.json');
  const registration = load('persistence/physical-slices/learning-session/registration.json');
  const readiness = load('persistence/physical-slices/readiness.json');
  const journal = load('drizzle/meta/_journal.json');
  if (foundation?.foundation_id !== 'TEACH-SLICE-P05-DOMAIN-APPLICATION-FOUNDATION' ||
      foundation?.version !== '1.0.1' || foundation?.status !== 'recorded' || foundation?.issue !== '#51' ||
      foundation?.scope !== 'Domain model and Application ports/service; no physical persistence implementation') {
    fail('foundation identity/version/scope mismatch');
  }
  if (!/^[0-9a-f]{40}$/.test(foundation?.baseline_commit ?? '') ||
      !/^[0-9a-f]{40}$/.test(foundation?.verification_source_commit ?? '')) fail('exact baseline and verification source commits required');
  if (admission?.decision !== 'ADMIT' || admission?.implementation_authorized !== true ||
      admission?.migration_authoring_authorized !== true || admission?.physical_schema_authorized !== true ||
      foundation?.admission !== `persistence/physical-slices/learning-session/admission.json@${admission?.version}` ||
      foundation?.physical_schema_authoring_authorized_by_existing_admission !== true) {
    fail('foundation authoring authority must match separate ADMIT admission');
  }
  const decision = registration?.decisions?.find((item) => item?.id === 'P05-D01');
  if (decision?.selection !== 'REQUIRED_ONE_ASSIGNMENT' || decision?.physical_reference_required !== true ||
      decision?.physical_reference_nullable !== false || foundation?.owner_decision !== 'P05-D01 REQUIRED_ONE_ASSIGNMENT') {
    fail('required/non-null Assignment owner decision mismatch');
  }
  if (foundation?.runtime_activation !== 'BLOCKED') fail('runtime activation must remain BLOCKED without concrete adapter and atomic/database proof');
  for (const [key, state] of Object.entries({
    physical_persistence: 'PENDING', authoritative_assignment_authorization_adapter: 'UNKNOWN',
    atomic_authorization_and_insert: 'PENDING', postgresql_concurrent_completion: 'PENDING',
  })) {
    if (foundation?.verification?.[key] !== state) fail(`${key} must remain ${state} in this foundation checkpoint`);
  }
  for (const key of ['domain_and_application_tests', 'exact_head_ci', 'local_domain_and_application_tests']) {
    if (typeof foundation?.verification?.[key] !== 'string' || !foundation.verification[key].trim()) fail(`recorded ${key} evidence required`);
  }
  if (!Array.isArray(foundation?.next_required_evidence) || foundation.next_required_evidence.length === 0 ||
      foundation.next_required_evidence.some((item) => typeof item !== 'string' || !item.trim())) fail('next required evidence must be recorded');
  if (foundation?.shared_or_production_migration_execution_authorized !== false ||
      admission?.shared_or_production_migration_execution_authorized !== false ||
      readiness?.implementation_guard?.shared_or_production_migration_execution_authorized !== false) {
    fail('shared/production migration execution must remain unauthorized');
  }
  const p05 = readiness?.current_physical_slice_admissions?.find((item) => item?.id === 'SLICE-P05');
  if (p05?.implementation_state !== 'ADMITTED') fail('P05 readiness must remain admitted with physical implementation pending');
  const walk = (path) => readdirSync(join(root, path), { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory() ? walk(`${path}/${entry.name}`) : [`${path}/${entry.name}`]);
  try {
    const files = walk('src/modules');
    const repositoryCount = files.filter((path) => path.endsWith('.ts') && !path.endsWith('.test.ts'))
      .reduce((count, path) => count + [...readFileSync(join(root, path), 'utf8')
        .matchAll(/\bexport\s+class\s+Postgres[A-Za-z0-9_]*Repository\b/g)].length, 0);
    const learning = files.filter((path) => path.startsWith('src/modules/learning/') && path.endsWith('.ts') && !path.endsWith('.test.ts'));
    for (const path of learning) {
      const source = readFileSync(join(root, path), 'utf8');
      if (path.includes('/infrastructure/') || /\bpgTable\s*\(|from\s+['"](?:drizzle-orm(?:\/[^'"]*)?|pg)['"]|\bclass\s+Postgres\w*Repository\b/.test(source)) {
        fail(`physical Learning implementation cannot be covered by foundation-only evidence: ${path}`);
      }
    }
    const entries = journal?.entries;
    if (!Array.isArray(entries) || entries.length === 0) fail('nonempty migration journal required');
    else {
      const latest = load(`drizzle/meta/${String(entries.length - 1).padStart(4, '0')}_snapshot.json`);
      const tables = latest?.tables;
      if (!tables || typeof tables !== 'object' || Array.isArray(tables)) fail('final snapshot tables required');
      else {
        if (Object.keys(tables).some((name) => /learning/i.test(name))) fail('Learning physical tables require separate implementation evidence');
        const actual = { tables: Object.keys(tables).length, migration_files: entries.length, repositories: repositoryCount };
        const fields = { tables: 'tables_generated', migration_files: 'migrations_generated', repositories: 'repositories_generated' };
        for (const [key, value] of Object.entries(actual)) {
          if (foundation?.physical_artifact_totals?.[key] !== value || readiness?.implementation_guard?.[fields[key]] !== value) {
            fail(`${key} totals must match actual artifacts (${value}) and readiness`);
          }
        }
      }
    }
    const implemented = readiness?.current_physical_slice_admissions?.filter((item) => ['PROVEN', 'IMPLEMENTED'].includes(item?.implementation_state)).length;
    if (foundation?.implemented_physical_slices !== implemented || readiness?.implementation_guard?.implemented_slice_count !== implemented) {
      fail('implemented physical slice count must match readiness implementation states');
    }
  } catch (error) { fail(`physical artifact inspection failed: ${error.message}`); }
  errors.push(...inspectMigrationHistory(root));
  return errors;
}
