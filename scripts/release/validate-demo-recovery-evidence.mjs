// Adopted first-install evidence shape check only. No I/O, authenticity proof or live authority.
export const REQUIRED_COVERAGE = Object.freeze(['schema','rows','types_views','constraints_indexes','functions_triggers','roles_memberships','acl_default_acl_rls','extensions','sequence_state','journals','dependencies']);
export function validateDemoRecoveryEvidence(e) {
  const errors = [];
  const check = (ok, message) => { if (!ok) errors.push(message); };
  const object = x => x !== null && typeof x === 'object' && !Array.isArray(x);
  const hash = x => typeof x === 'string' && /^sha256:[a-f0-9]{64}$/.test(x);
  const sha = x => typeof x === 'string' && /^[a-f0-9]{40}$/.test(x);
  const text = x => typeof x === 'string' && x.trim().length > 0;
  // Fixed canonical millisecond timestamps avoid Date.parse truncation/normalization ambiguity.
  const time = x => typeof x === 'string' && /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(x) && Number.isFinite(Date.parse(x)) && new Date(x).toISOString() === x ? Date.parse(x) : NaN;
  if (!object(e)) return ['evidence must be an object'];
  // Reject mixed native/production envelopes instead of ignoring contradictory fields.
  for (const field of ['environment','source_sha','configuration_identity','candidate_frozen_at','promotion_requested_at','backup_policy','backup','restore_proof','production_database_engine_major','migration','destructive','later_install']) check(!Object.hasOwn(e, field), `mixed or unsupported evidence field: ${field}`);
  check(e.schema_version === '1.0.0', 'exact schema version required');
  check(e.operation === 'FIRST_ADDITIVE_SYNTHETIC_DEMO_INSTALL', 'operation outside exception');
  check(e.project_id === 'acqafjkdkdmtpnsxiesw' && e.schema === 'teach_v2_demo' && e.database_engine_major === 17, 'exact t34ch/schema/PG17 required');
  check(e.first_install === true && e.synthetic_only === true && e.additive_only === true, 'first additive synthetic scope required');
  check(e.prior_apply_state === 'VERIFIED_ABSENT' && e.namespace_collision === false && e.role_collision === false, 'absent prior apply and collision readback required');
  check(e.full_platform_recovery_claim === false && e.customer_production === false, 'platform/future production excluded');
  const candidate = e.candidate ?? {};
  check(sha(candidate.commit) && sha(candidate.tree) && hash(candidate.configuration_sha256), 'exact candidate commit/tree/configuration binding required');
  check(Array.isArray(candidate.migrations) && candidate.migrations.length > 0 && candidate.migrations.every(m => object(m) && text(m.id) && hash(m.sha256)) && new Set(candidate.migrations.map(m => m.id)).size === candidate.migrations.length, 'unique ordered migration IDs/hashes required');
  const freeze = time(candidate.frozen_at), requested = time(e.apply_requested_at);
  check(Number.isFinite(freeze) && Number.isFinite(requested) && requested >= freeze, 'valid ordered freeze/request timestamps required');
  const capture = e.capture ?? {}, restore = e.restore ?? {};
  check(text(capture.id) && hash(capture.encrypted_artifact_sha256) && hash(capture.method_configuration_sha256) && hash(capture.inventory_sha256), 'named encrypted capture/method/inventory identities required');
  check(capture.candidate_commit === candidate.commit && capture.candidate_tree === candidate.tree && capture.candidate_configuration_sha256 === candidate.configuration_sha256 && JSON.stringify(capture.migrations) === JSON.stringify(candidate.migrations), 'capture candidate binding differs');
  const start = time(capture.started_at), end = time(capture.completed_at), restoredStart = time(restore.started_at), restoredEnd = time(restore.completed_at);
  check([start,end,restoredStart,restoredEnd].every(Number.isFinite) && freeze <= start && start <= end && end <= restoredStart && restoredStart <= restoredEnd && restoredEnd <= requested && requested-restoredEnd <= 30*86400000, 'post-freeze capture and exact restore ordering/freshness required');
  for (const key of ['consistent_snapshot','catalog_role_drift_checked','no_concurrent_ddl_verified','sequence_consistency_verified','encrypted_before_persistent_storage','encrypted_readback_verified','decryption_verified','key_stored_separately','secrets_excluded']) check(capture[key] === true, `capture.${key} required`);
  check(hash(capture.consistency_evidence_sha256) && hash(capture.encryption_evidence_sha256), 'capture consistency/encryption evidence identities required');
  const coverage = e.coverage;
  check(object(coverage) && Object.keys(coverage).sort().join() === [...REQUIRED_COVERAGE].sort().join(), 'exact required coverage inventory required');
  for (const name of REQUIRED_COVERAGE) {
    const item = coverage?.[name];
    check(object(item) && item.status === 'COMPLETE' && hash(item.inventory_sha256) && hash(item.restored_comparison_sha256), `complete ${name} inventory and restore comparison required`);
  }
  check(e.unknown_required_dependencies === 0 && e.missing_required_items === 0, 'unknown or missing required coverage blocks');
  check(Array.isArray(e.exclusions) && e.exclusions.every(x => object(x) && text(x.category) && text(x.reason) && x.candidate_affectable === false && hash(x.unaffected_proof_sha256)), 'each exclusion needs evidence of no candidate impact');
  check(e.storage_bytes_candidate_affectable === false, 'candidate-affectable storage requires separate approved coverage; unsupported by this bounded exception');
  check(restore.capture_id === capture.id && restore.encrypted_artifact_sha256 === capture.encrypted_artifact_sha256 && restore.method_configuration_sha256 === capture.method_configuration_sha256 && restore.inventory_sha256 === capture.inventory_sha256, 'restore must bind exact capture/artifact/method/inventory');
  check(restore.database_engine_major === 17 && restore.environment === 'DISPOSABLE_ISOLATED' && text(restore.target_id), 'isolated PG17 restore target required');
  for (const key of ['actual_restore_performed','extensions_compatible','role_mapping_verified','independent_role_recreation_verified','no_inherited_dependencies','external_side_effects_disabled','deletion_ledger_checked','all_comparisons_passed']) check(restore[key] === true, `restore.${key} required`);
  check(hash(restore.execution_evidence_sha256), 'actual restore execution evidence identity required');
  const preservation = e.preservation ?? {};
  check(preservation.candidate_commit === candidate.commit && preservation.candidate_tree === candidate.tree && JSON.stringify(preservation.migrations) === JSON.stringify(candidate.migrations), 'preservation candidate/migration binding differs');
  check(preservation.exact_migration_rehearsed === true && preservation.all_legacy_comparisons_passed === true && preservation.isolation_probes_passed === true && hash(preservation.evidence_sha256), 'actual additive preservation and isolation evidence required');
  check(e.rollback === 'STOP_V2_PRESERVE_DATA_TRANSACTION_ROLLBACK_OR_REVIEWED_FORWARD_FIX', 'safe rollback required; no whole-database overwrite');
  check(hash(e.independent_evidence_review_sha256), 'independent actual-evidence review required');
  return errors;
}
