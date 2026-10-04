#!/usr/bin/env node
import assert from 'node:assert/strict';
import { buildConfigurationIdentity } from '../release/build-config-identity.mjs';
import { validateProductionMigrationEvidence } from '../release/validate-production-migration-evidence.mjs';

const manifestA = {
  schema_version: '1.0.0',
  environment: 'production',
  non_secret: { API_ORIGIN: 'https://api.example.test', FEATURE_X: true },
  secret_revisions: { DATABASE_URL: 'provider-revision-42', SESSION_KEY: 'provider-revision-7' },
  required_secret_keys: ['SESSION_KEY', 'DATABASE_URL'],
};
const manifestB = {
  required_secret_keys: ['DATABASE_URL', 'SESSION_KEY'],
  secret_revisions: { SESSION_KEY: 'provider-revision-7', DATABASE_URL: 'provider-revision-42' },
  non_secret: { FEATURE_X: true, API_ORIGIN: 'https://api.example.test' },
  environment: 'production',
  schema_version: '1.0.0',
};

const a = buildConfigurationIdentity(manifestA);
const b = buildConfigurationIdentity(manifestB);
assert.equal(a.configuration_identity, b.configuration_identity, 'key ordering must not change identity');

const changedValue = buildConfigurationIdentity({
  ...manifestA,
  non_secret: { ...manifestA.non_secret, FEATURE_X: false },
});
assert.notEqual(a.configuration_identity, changedValue.configuration_identity, 'effective non-secret config change must invalidate identity');

const changedRevision = buildConfigurationIdentity({
  ...manifestA,
  secret_revisions: { ...manifestA.secret_revisions, SESSION_KEY: 'provider-revision-8' },
});
assert.notEqual(a.configuration_identity, changedRevision.configuration_identity, 'secret revision change must invalidate identity');

assert.throws(
  () => buildConfigurationIdentity({ ...manifestA, secret_revisions: { DATABASE_URL: 'provider-revision-42' } }),
  /missing stable revision identity/,
);
assert.throws(
  () => buildConfigurationIdentity({ ...manifestA, secret_values: { SESSION_KEY: 'raw-secret' } }),
  /unsupported top-level field secret_values/,
);

const validEvidence = {
  schema_version: '1.0.0',
  environment: 'production',
  source_sha: '0123456789abcdef0123456789abcdef01234567',
  configuration_identity: a.configuration_identity,
  candidate_frozen_at: '2026-10-04T10:00:00Z',
  promotion_requested_at: '2026-10-04T11:00:00Z',
  production_database_engine_major: '17',
  backup_policy: {
    mechanism_class: 'platform-native-transactionally-consistent',
    automated_interval_hours: 24,
    configuration_identity: 'backup-policy-v1',
  },
  backup: {
    backup_id: 'backup-20261004-1030',
    captured_at: '2026-10-04T10:30:00Z',
    restorable: true,
    configuration_identity: 'backup-policy-v1',
  },
  restore_proof: {
    result: 'PROVEN',
    source_backup_id: 'restore-source-20260920',
    target_environment_class: 'disposable-isolated',
    target_id: 'restore-proof-20260920',
    database_engine_major: '17',
    completed_at: '2026-09-20T12:00:00Z',
    backup_configuration_identity: 'backup-policy-v1',
    verification_checks: ['migration journal readable', 'canonical table count verified'],
  },
  migration: {
    changes_schema_or_data: true,
    destructive: false,
  },
};

assert.deepEqual(validateProductionMigrationEvidence(validEvidence), []);

const oldRestore = structuredClone(validEvidence);
oldRestore.restore_proof.completed_at = '2026-08-01T12:00:00Z';
assert.match(validateProductionMigrationEvidence(oldRestore).join('\n'), /older than 30 days/);

const wrongMajor = structuredClone(validEvidence);
wrongMajor.restore_proof.database_engine_major = '16';
assert.match(validateProductionMigrationEvidence(wrongMajor).join('\n'), /major must match production/);

const beforeFreeze = structuredClone(validEvidence);
beforeFreeze.backup.captured_at = '2026-10-04T09:59:00Z';
assert.match(validateProductionMigrationEvidence(beforeFreeze).join('\n'), /after candidate freeze/);

const staleConfig = structuredClone(validEvidence);
staleConfig.restore_proof.backup_configuration_identity = 'backup-policy-v0';
assert.match(validateProductionMigrationEvidence(staleConfig).join('\n'), /stale for the current backup configuration/);

const destructive = structuredClone(validEvidence);
destructive.migration.destructive = true;
assert.match(validateProductionMigrationEvidence(destructive).join('\n'), /owner_approval_issue/);
assert.match(validateProductionMigrationEvidence(destructive).join('\n'), /recovery_plan_id/);

console.log('PRODUCTION PROOF TESTS PASS');
console.log('Configuration identity: deterministic and secret-revision-bound');
console.log('C21 backup/restore gate: fail-closed negative paths proven');
