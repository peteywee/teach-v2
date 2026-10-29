// Validation of a source-bound evidence descriptor is necessary, never proof that
// capture/restore actually happened. Independent review and target readback remain gates.
const sha=x=>typeof x==='string'&&/^[a-f0-9]{64}$/.test(x),time=x=>typeof x==='string'&&/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(x)&&Number.isFinite(Date.parse(x))&&new Date(x).toISOString()===x;
export const AUTHORING_RECOVERY_COVERAGE=Object.freeze(['all_private_schema_rows','tables_constraints_indexes','sequences','functions_triggers','owners_acl_defaults','rls_policies','role_membership_closure','platform_hook_dependency_closure','historical_content_and_training']);
export function validateAuthoringRecoveryEvidence(e){
 const errors=[],need=(v,m)=>{if(!v)errors.push(m);};
 if(!e||typeof e!=='object'||Array.isArray(e))return ['actual recovery evidence required'];
 for(const k of ['environment','source_sha','configuration_identity','candidate_frozen_at','promotion_requested_at','backup_policy','backup','restore_proof','production_database_engine_major','migration','destructive','later_install','first_install'])need(!Object.hasOwn(e,k),'mixed or unsupported field: '+k);
 need(e.schema_version==='1.0.0'&&e.additive_only===true&&e.private_synthetic_only===true&&e.prior_apply_state==='EXACT_EIGHT_MIGRATIONS','bounded additive private scope');
 need(e.operation==='EXACT_AUTHORING_0008','one exact operation');need(e.project_id==='acqafjkdkdmtpnsxiesw'&&e.schema==='teach_v2_demo','exact target');need(e.migration_sha256==='6c6e568354e95cb5012e369dca6a3f0c9a3c2d72ac49d05127d1b77f3ba941ab','exact raw migration');
 need(e.wrapper_sha256==='7a8fffc9581d8edfd4f149609d48fe5f81c839db6f523d265161b3c1c7c6c180','exact reviewed activation wrapper');
 need(typeof e.candidate_sha==='string'&&/^[a-f0-9]{40}$/.test(e.candidate_sha)&&sha(e.selector_sha256)&&sha(e.renderer_sha256),'frozen candidate/selector/renderer hashes');
 for(const k of ['freeze_at','snapshot_at','restore_started_at','restore_finished_at','promotion_at'])need(time(e[k]),'timestamp required: '+k);
 const t=k=>Date.parse(e[k]);need(t('freeze_at')<t('snapshot_at')&&t('snapshot_at')<=t('restore_started_at')&&t('restore_started_at')<=t('restore_finished_at')&&t('restore_finished_at')<=t('promotion_at')&&t('promotion_at')-t('restore_finished_at')<=30*86400000,'fresh post-freeze snapshot and same-candidate restore before promotion');
 need(e.coverage&&Object.keys(e.coverage).sort().join('|')===[...AUTHORING_RECOVERY_COVERAGE].sort().join('|')&&AUTHORING_RECOVERY_COVERAGE.every(k=>e.coverage[k]===true),'complete exact scoped coverage');need(Array.isArray(e.unknown_dependencies)&&e.unknown_dependencies.length===0,'unknown coverage blocks');
 need(e.snapshot_consistency==='SINGLE_MVCC_SNAPSHOT'&&e.encrypted_before_export===true&&e.plaintext_published===false,'consistent encrypted-only capture');
 need(typeof e.restore_target_id==='string'&&e.restore_target_id.trim().length>0,'named isolated restore target');
 need(typeof e.backup_id==='string'&&!!e.backup_id&&sha(e.ciphertext_sha256)&&Number.isSafeInteger(e.ciphertext_bytes)&&e.ciphertext_bytes>0&&e.retained_readback_sha256===e.ciphertext_sha256,'named retained ciphertext verified');
 need(e.retention_owner_only===true&&e.separate_transfer_approval===true&&e.supported_selected_key_access===true&&e.key_access_approved===true,'retention and supported separate custody approval');
 need(e.restore_source==='RETAINED_CIPHERTEXT_ONLY'&&e.restore_isolated===true&&e.source_pg_major===17&&e.restore_pg_major===17&&e.actual_restore==='PASS','actual retained-only same-major restore');
 for(const k of ['baseline_rows_sequences_equal','baseline_schema_security_equal','exact_candidate_upgrade','old_versions_and_training_preserved','restricted_runtime_checks','no_unapproved_delta','fresh_preapply_reconciliation','private_schema_exposure_verified','independent_review'])need(e[k]==='PASS','missing actual proof: '+k);
 need(e.candidate_changed_after_capture===false&&e.backup_configuration_changed===false,'changed binding requires fresh capture/proof');need(e.temporary_plaintext_and_key_removed===true,'temporary sensitive material cleanup');
 need(e.paid_spend===false&&e.future_migration_authorized===false&&e.production_execution_authorized_by_descriptor===false,'no spending/future/automatic execution authority');return errors;
}
