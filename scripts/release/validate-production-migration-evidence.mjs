#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const DAY_MS = 24 * 60 * 60 * 1000;

export function validateProductionMigrationEvidence(evidence) {
  const errors = [];
  if (!evidence || typeof evidence !== 'object' || Array.isArray(evidence)) {
    return ['production migration evidence must be an object'];
  }
  if (evidence.schema_version !== '1.0.0') errors.push('schema_version must be 1.0.0');
  if (evidence.environment !== 'production') errors.push('environment must be production');
  if (!/^sha256:[0-9a-f]{64}$/.test(evidence.configuration_identity ?? '')) {
    errors.push('configuration_identity must be a sha256 identity');
  }
  requireNonBlank(evidence.source_sha, 'source_sha', errors);

  const frozen = parseDate(evidence.candidate_frozen_at, 'candidate_frozen_at', errors);
  const requested = parseDate(evidence.promotion_requested_at, 'promotion_requested_at', errors);
  if (frozen && requested && frozen > requested) errors.push('candidate_frozen_at must not be after promotion_requested_at');

  const policy = evidence.backup_policy ?? {};
  if (policy.mechanism_class !== 'platform-native-transactionally-consistent') {
    errors.push('backup_policy.mechanism_class must be platform-native-transactionally-consistent');
  }
  if (!Number.isFinite(policy.automated_interval_hours) || policy.automated_interval_hours > 24 || policy.automated_interval_hours <= 0) {
    errors.push('backup_policy.automated_interval_hours must be > 0 and <= 24');
  }
  requireNonBlank(policy.configuration_identity, 'backup_policy.configuration_identity', errors);

  const backup = evidence.backup ?? {};
  requireNonBlank(backup.backup_id, 'backup.backup_id', errors);
  if (backup.restorable !== true) errors.push('backup.restorable must be true');
  if (backup.configuration_identity !== policy.configuration_identity) {
    errors.push('backup.configuration_identity must match backup policy');
  }
  const captured = parseDate(backup.captured_at, 'backup.captured_at', errors);
  if (captured && frozen && captured < frozen) errors.push('backup must be captured after candidate freeze');
  if (captured && requested && captured > requested) errors.push('backup must be captured before promotion request');

  const restore = evidence.restore_proof ?? {};
  if (restore.result !== 'PROVEN') errors.push('restore_proof.result must be PROVEN');
  if (restore.target_environment_class !== 'disposable-isolated') {
    errors.push('restore_proof target must be disposable-isolated');
  }
  requireNonBlank(restore.source_backup_id, 'restore_proof.source_backup_id', errors);
  requireNonBlank(restore.target_id, 'restore_proof.target_id', errors);
  if (restore.backup_configuration_identity !== policy.configuration_identity) {
    errors.push('restore proof is stale for the current backup configuration');
  }
  if (String(restore.database_engine_major ?? '') !== String(evidence.production_database_engine_major ?? '')) {
    errors.push('restore database-engine major must match production');
  }
  if (!Array.isArray(restore.verification_checks) || restore.verification_checks.length === 0) {
    errors.push('restore_proof.verification_checks must be non-empty');
  }
  const restored = parseDate(restore.completed_at, 'restore_proof.completed_at', errors);
  if (restored && requested) {
    if (restored > requested) errors.push('restore proof cannot complete after promotion request');
    if ((requested - restored) / DAY_MS > 30) errors.push('restore proof is older than 30 days');
  }

  const migration = evidence.migration ?? {};
  if (migration.changes_schema_or_data !== true) {
    errors.push('migration.changes_schema_or_data must be true for this production migration gate');
  }
  if (migration.destructive === true) {
    requireNonBlank(migration.owner_approval_issue, 'migration.owner_approval_issue', errors);
    requireNonBlank(migration.recovery_plan_id, 'migration.recovery_plan_id', errors);
  }

  return errors;
}

function requireNonBlank(value, label, errors) {
  if (typeof value !== 'string' || value.trim() === '') errors.push(`${label} must be non-blank`);
}

function parseDate(value, label, errors) {
  const date = new Date(value);
  if (typeof value !== 'string' || Number.isNaN(date.getTime())) {
    errors.push(`${label} must be an ISO timestamp`);
    return null;
  }
  return date;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const path = process.argv[2];
  if (!path) {
    console.error('usage: node scripts/release/validate-production-migration-evidence.mjs <evidence.json>');
    process.exit(2);
  }
  try {
    const evidence = JSON.parse(readFileSync(path, 'utf8'));
    const errors = validateProductionMigrationEvidence(evidence);
    if (errors.length) {
      console.error(`PRODUCTION MIGRATION EVIDENCE BLOCKED (${errors.length} problem${errors.length === 1 ? '' : 's'}):`);
      for (const error of errors) console.error(`- ${error}`);
      process.exit(1);
    }
    console.log('PRODUCTION MIGRATION EVIDENCE PASS');
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
