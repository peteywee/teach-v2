<!--tos-doc
{
  "doc_id": "TEACH-PROP-DCS-01",
  "class": "decision-table",
  "version": "0.3.0",
  "claims_truth_state": "declared",
  "status": "proposed",
  "owner": "Patrick Craven, Top Shelf Service LLC",
  "created_on": "2026-10-05",
  "updated_on": "2026-10-05",
  "baseline": {
    "repo": "peteywee/teach-v2",
    "ref": "main",
    "commit": "6553eb465e469dc9e60368cde40d259f86262997",
    "purpose": "decision-closure super-batch input baseline"
  },
  "governed_by": [
    "TEACH-CON-C00",
    "TEACH-GOV-DOCS"
  ],
  "generated_from": "governance/proposals/2026-10-05-decision-closure/closure-matrix.json"
}
-->

# 56-Decision Closure Matrix

| Field | Value |
| --- | --- |
| Status | `proposed` — not owner-approved; cites no authority (SYS-19) |
| Baseline | `peteywee/teach-v2` `main` @ `6553eb465e469dc9e60368cde40d259f86262997` |
| Machine source | `closure-matrix.json` (this Markdown is a generated view; JSON wins on disagreement) |
| Schema | `closure-matrix.schema.json` |
| Validator | `scripts/verification/validate-decision-closure.mjs` |
| Owner decision | Approved in chat 2026-10-05 04:05 America/Chicago (decision sheet A–D). Registration PENDING under SYS-21 issue #75; this document stays `proposed` until it lands. |
| Classification baseline | `2b5714d8d850da7a47c1666da5a2c7974cabe40f` (56 rows classified); live state recomputed on `6553eb465e469dc9e60368cde40d259f86262997` |
| Answer register | `verification/owner-decisions/2026-10-05/answer-register.json` sha256 `996fa46fbc4e4891c349f4453e4f576868833a6d00e4aff645ee7cf6b83791f8` |

## 1. Current truth

- **Verified (exact-source rerun on `6553eb4`):** `deriveOwnerDecisionInventory` returns **49 unresolved contract questions, 11 explicit blockers**. All 49 are rows of this matrix.
- **Verified:** PR #74 (merged 2026-10-05 08:57Z) registered 7 rows of this matrix — `OQ-IDN-1/3/4`, `OQ-TEN-1/2`, `OQ-MGR-1`, `OQ-CERT-1` — using the values in `06-…` and `09-…`. They stay here with `live_state: RESOLVED` as history. At the classification baseline `2b5714d` the set was 56 rows / 18 blockers, identical to the 56 `ANSWER_RECEIVED_UNREGISTERED` register records.
- **Verified:** answer receipt, registration and implementation are separate states. Apart from the 7 rows #74 registered, no row is registered. No row has implementation evidence.
- **Correction to the earlier summary:** the earlier note said only `OQ-CERT-2` contains a genuine owner unknown. That is true of the register's `recorded_detail_state`, but **9 rows** still lack a named owner value (table §4). Only one of them — `OQ-CERT-2` — is an explicit implementation blocker. The others can register their supplied part now and keep a narrower residual.
- **Interpretation:** 10 of the 11 live blockers close when the approved registration (#75) lands. `OQ-CERT-2` cannot.

## 2. Closure classes

Counts are live (open) rows only.

| Class | Count | Explicit blockers | Meaning |
| --- | --- | --- | --- |
| `READY_TO_REGISTER` | 13 | 1 | The preserved answer is complete and exact. Only the SYS-21 registration and an owner approval token are needed. No new information. |
| `REGISTER_WITH_ARTIFACT` | 12 | 4 | The direction is complete, but registration must cite a concrete artifact in this package (matrix, manifest, spec). Owner approves the artifact and the registration together. |
| `REGISTER_AS_DISABLED` | 10 | 0 | The answer is "disabled / deferred / none". Register the disabled state, the fail-closed behavior, and the exact re-enable trigger. The question then closes; a future enablement is a new revision, not this open question. |
| `REGISTER_SPLIT_RESIDUAL` | 6 | 0 | The answer supplies the mechanism or format but not one named value. Register the supplied part; leave exactly the named value as a narrower residual. Owner must approve the split. |
| `RECONCILE_DRAFT` | 3 | 3 | The answer is a draft with recorded technical defects. The controlling artifact corrects the defects without changing the owner's stated intent. Owner approves the corrected draft. |
| `CONFIRM_RECOMMENDATION` | 3 | 2 | The register holds a recommendation, not a selection. Owner answers yes/no to the recorded recommendation. This is a confirmation, not a re-asked question. |
| `UNKNOWN_OWNER_VALUE` | 2 | 1 | No source holds the value. It stays UNKNOWN and fails closed until the layer that needs it is next. |

## 3. Matrix

| ID | Live state | Contract @ live version | Blocker | Affects | Class | Owner action | Controlling artifact |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `OQ-SYS-1` | open | C00 @ 1.0.3 | No | SYS-4 | `READY_TO_REGISTER` | `APPROVE_REGISTRATION` | `09-governance-content-certification-web-packet.md` |
| `OQ-SYS-2` | open | C00 @ 1.0.3 | No | SYS-11 | `REGISTER_WITH_ARTIFACT` | `APPROVE_ARTIFACT_AND_REGISTRATION` | `09-governance-content-certification-web-packet.md` |
| `OQ-SYS-5` | open | C00 @ 1.0.3 | No | SYS-29 | `REGISTER_WITH_ARTIFACT` | `APPROVE_ARTIFACT_AND_REGISTRATION` | `09-governance-content-certification-web-packet.md` |
| `OQ-AGT-1` | open | C02 @ 1.0.3 | No | AGT-9 | `REGISTER_WITH_ARTIFACT` | `APPROVE_ARTIFACT_AND_REGISTRATION` | `02-c14-authorization-capability-matrix.md` |
| `OQ-AGT-2` | open | C02 @ 1.0.3 | No | AGT-16 | `REGISTER_AS_DISABLED` | `APPROVE_DISABLED_STATE_REGISTRATION` | `08-deferred-feature-policy-register.md` |
| `OQ-AGT-3` | open | C02 @ 1.0.3 | No | — | `REGISTER_WITH_ARTIFACT` | `APPROVE_ARTIFACT_AND_REGISTRATION` | `02-c14-authorization-capability-matrix.md` |
| `OQ-IDN-1` | RESOLVED (#74) | C11 @ 1.5.0 | **Yes** | IDN-5 | `READY_TO_REGISTER` | `APPROVE_REGISTRATION` | `06-identity-tenancy-manager-registration-packet.md` |
| `OQ-IDN-3` | RESOLVED (#74) | C11 @ 1.5.0 | **Yes** | IDN-15 | `READY_TO_REGISTER` | `APPROVE_REGISTRATION` | `06-identity-tenancy-manager-registration-packet.md` |
| `OQ-IDN-4` | RESOLVED (#74) | C11 @ 1.5.0 | **Yes** | IDN-2 | `READY_TO_REGISTER` | `APPROVE_REGISTRATION` | `06-identity-tenancy-manager-registration-packet.md` |
| `OQ-IDN-7` | open | C11 @ 1.5.0 | No | — | `READY_TO_REGISTER` | `APPROVE_REGISTRATION` | `06-identity-tenancy-manager-registration-packet.md` |
| `OQ-SES-1` | open | C12 @ 1.1.0 | **Yes** | SES-5 | `CONFIRM_RECOMMENDATION` | `CONFIRM_OR_REJECT_RECOMMENDATION` | `04-session-transport-security-spec.md` |
| `OQ-SES-2` | open | C12 @ 1.1.0 | **Yes** | SES-6 | `CONFIRM_RECOMMENDATION` | `CONFIRM_OR_REJECT_RECOMMENDATION` | `04-session-transport-security-spec.md` |
| `OQ-SES-5` | open | C12 @ 1.1.0 | **Yes** | SES-18 | `REGISTER_WITH_ARTIFACT` | `APPROVE_ARTIFACT_AND_REGISTRATION` | `04-session-transport-security-spec.md` |
| `OQ-SES-6` | open | C12 @ 1.1.0 | **Yes** | SES-19 | `REGISTER_WITH_ARTIFACT` | `APPROVE_ARTIFACT_AND_REGISTRATION` | `04-session-transport-security-spec.md` |
| `OQ-SES-7` | open | C12 @ 1.1.0 | No | — | `READY_TO_REGISTER` | `APPROVE_REGISTRATION` | `04-session-transport-security-spec.md` |
| `OQ-TEN-1` | RESOLVED (#74) | C13 @ 1.5.0 | **Yes** | TEN-15 | `REGISTER_WITH_ARTIFACT` | `APPROVE_ARTIFACT_AND_REGISTRATION` | `06-identity-tenancy-manager-registration-packet.md` |
| `OQ-TEN-2` | RESOLVED (#74) | C13 @ 1.5.0 | **Yes** | TEN-7 | `REGISTER_WITH_ARTIFACT` | `APPROVE_ARTIFACT_AND_REGISTRATION` | `06-identity-tenancy-manager-registration-packet.md` |
| `OQ-AUTHZ-1` | open | C14 @ 1.2.0 | **Yes** | AUTHZ-19 | `REGISTER_WITH_ARTIFACT` | `APPROVE_ARTIFACT_AND_REGISTRATION` | `02-c14-authorization-capability-matrix.md` |
| `OQ-PRIV-1` | open | C15 @ 1.0.3 | **Yes** | — | `RECONCILE_DRAFT` | `APPROVE_CORRECTED_DRAFT` | `03-c15-data-lifecycle-privacy-matrix.md` |
| `OQ-PRIV-2` | open | C15 @ 1.0.3 | **Yes** | PRIV-12 | `RECONCILE_DRAFT` | `APPROVE_CORRECTED_DRAFT` | `03-c15-data-lifecycle-privacy-matrix.md` |
| `OQ-PRIV-3` | open | C15 @ 1.0.3 | **Yes** | PRIV-15 | `RECONCILE_DRAFT` | `APPROVE_CORRECTED_DRAFT` | `03-c15-data-lifecycle-privacy-matrix.md` |
| `OQ-PRIV-4` | open | C15 @ 1.0.3 | No | — | `REGISTER_SPLIT_RESIDUAL` | `APPROVE_PARTIAL_REGISTRATION_AND_SUPPLY_RESIDUAL_VALUE_LATER` | `03-c15-data-lifecycle-privacy-matrix.md` |
| `OQ-PRIV-5` | open | C15 @ 1.0.3 | No | — | `UNKNOWN_OWNER_VALUE` | `SUPPLY_VALUE_WHEN_LAYER_NEEDS_IT` | `03-c15-data-lifecycle-privacy-matrix.md` |
| `OQ-PRIV-6` | open | C15 @ 1.0.3 | No | — | `READY_TO_REGISTER` | `APPROVE_REGISTRATION` | `03-c15-data-lifecycle-privacy-matrix.md` |
| `OQ-MIG-3` | open | C21 @ 1.1.0 | No | MIG-12 | `READY_TO_REGISTER` | `APPROVE_REGISTRATION` | `07-evidence-release-operations-spec.md` |
| `OQ-MIG-4` | open | C21 @ 1.1.0 | No | — | `READY_TO_REGISTER` | `APPROVE_REGISTRATION` | `07-evidence-release-operations-spec.md` |
| `OQ-MIG-5` | open | C21 @ 1.1.0 | No | — | `REGISTER_AS_DISABLED` | `APPROVE_DISABLED_STATE_REGISTRATION` | `08-deferred-feature-policy-register.md` |
| `OQ-TXN-2` | open | C22 @ 1.2.0 | No | — | `REGISTER_SPLIT_RESIDUAL` | `APPROVE_PARTIAL_REGISTRATION_AND_SUPPLY_RESIDUAL_VALUE_LATER` | `07-evidence-release-operations-spec.md` |
| `OQ-AUD-2` | open | C23 @ 1.1.0 | No | AUD-7 | `READY_TO_REGISTER` | `APPROVE_REGISTRATION` | `07-evidence-release-operations-spec.md` |
| `OQ-AUD-3` | open | C23 @ 1.1.0 | No | AUD-8 | `REGISTER_WITH_ARTIFACT` | `APPROVE_ARTIFACT_AND_REGISTRATION` | `07-evidence-release-operations-spec.md` |
| `OQ-CNT-2` | open | C31 @ 1.1.0 | No | CNT-11 | `REGISTER_SPLIT_RESIDUAL` | `APPROVE_PARTIAL_REGISTRATION_AND_SUPPLY_RESIDUAL_VALUE_LATER` | `09-governance-content-certification-web-packet.md` |
| `OQ-CNT-3` | open | C31 @ 1.1.0 | No | — | `REGISTER_AS_DISABLED` | `APPROVE_DISABLED_STATE_REGISTRATION` | `08-deferred-feature-policy-register.md` |
| `OQ-LRN-2` | open | C32 @ 1.2.0 | No | LRN-13 | `REGISTER_AS_DISABLED` | `APPROVE_DISABLED_STATE_REGISTRATION` | `08-deferred-feature-policy-register.md` |
| `OQ-MGR-1` | RESOLVED (#74) | C33 @ 1.1.0 | **Yes** | MGR-3 | `REGISTER_WITH_ARTIFACT` | `APPROVE_ARTIFACT_AND_REGISTRATION` | `06-identity-tenancy-manager-registration-packet.md` |
| `OQ-MGR-2` | open | C33 @ 1.1.0 | No | — | `REGISTER_WITH_ARTIFACT` | `APPROVE_ARTIFACT_AND_REGISTRATION` | `06-identity-tenancy-manager-registration-packet.md` |
| `OQ-CERT-1` | RESOLVED (#74) | C34 @ 1.2.0 | **Yes** | CERT-13 | `READY_TO_REGISTER` | `APPROVE_REGISTRATION` | `09-governance-content-certification-web-packet.md` |
| `OQ-CERT-2` | open | C34 @ 1.2.0 | **Yes** | CERT-4 | `UNKNOWN_OWNER_VALUE` | `SUPPLY_VALUE_WHEN_LAYER_NEEDS_IT` | `09-governance-content-certification-web-packet.md` |
| `OQ-CERT-3` | open | C34 @ 1.2.0 | No | CERT-7 | `READY_TO_REGISTER` | `APPROVE_REGISTRATION` | `08-deferred-feature-policy-register.md` |
| `OQ-CERT-5` | open | C34 @ 1.2.0 | No | — | `REGISTER_AS_DISABLED` | `APPROVE_DISABLED_STATE_REGISTRATION` | `08-deferred-feature-policy-register.md` |
| `OQ-API-1` | open | C41 @ 1.0.3 | **Yes** | — | `REGISTER_WITH_ARTIFACT` | `APPROVE_ARTIFACT_AND_REGISTRATION` | `05-api-boundary-manifest.md` |
| `OQ-API-2` | open | C41 @ 1.0.3 | No | API-10 | `REGISTER_WITH_ARTIFACT` | `APPROVE_ARTIFACT_AND_REGISTRATION` | `05-api-boundary-manifest.md` |
| `OQ-API-3` | open | C41 @ 1.0.3 | No | API-13 | `REGISTER_SPLIT_RESIDUAL` | `APPROVE_PARTIAL_REGISTRATION_AND_SUPPLY_RESIDUAL_VALUE_LATER` | `05-api-boundary-manifest.md` |
| `OQ-WEB-1` | open | C42 @ 1.0.3 | **Yes** | WEB-15 | `READY_TO_REGISTER` | `APPROVE_REGISTRATION` | `09-governance-content-certification-web-packet.md` |
| `OQ-WEB-2` | open | C42 @ 1.0.3 | No | — | `READY_TO_REGISTER` | `APPROVE_REGISTRATION` | `09-governance-content-certification-web-packet.md` |
| `OQ-EVD-1` | open | C51 @ 1.0.3 | No | EVD-16 | `READY_TO_REGISTER` | `APPROVE_REGISTRATION` | `07-evidence-release-operations-spec.md` |
| `OQ-EVD-2` | open | C51 @ 1.0.3 | No | — | `REGISTER_SPLIT_RESIDUAL` | `APPROVE_PARTIAL_REGISTRATION_AND_SUPPLY_RESIDUAL_VALUE_LATER` | `07-evidence-release-operations-spec.md` |
| `OQ-EVD-3` | open | C51 @ 1.0.3 | No | — | `READY_TO_REGISTER` | `APPROVE_REGISTRATION` | `07-evidence-release-operations-spec.md` |
| `OQ-REL-3` | open | C52 @ 1.2.0 | No | REL-8 | `REGISTER_WITH_ARTIFACT` | `APPROVE_ARTIFACT_AND_REGISTRATION` | `07-evidence-release-operations-spec.md` |
| `OQ-OBS-1` | open | C53 @ 1.1.0 | No | OBS-2 | `CONFIRM_RECOMMENDATION` | `CONFIRM_OR_REJECT_RECOMMENDATION` | `07-evidence-release-operations-spec.md` |
| `OQ-OBS-2` | open | C53 @ 1.1.0 | No | OBS-7 | `READY_TO_REGISTER` | `APPROVE_REGISTRATION` | `07-evidence-release-operations-spec.md` |
| `OQ-ANL-1` | open | C61 @ 1.0.3 | No | — | `REGISTER_AS_DISABLED` | `APPROVE_DISABLED_STATE_REGISTRATION` | `08-deferred-feature-policy-register.md` |
| `OQ-ANL-2` | open | C61 @ 1.0.3 | No | ANL-7 | `REGISTER_AS_DISABLED` | `APPROVE_DISABLED_STATE_REGISTRATION` | `08-deferred-feature-policy-register.md` |
| `OQ-PWA-1` | open | C62 @ 1.0.3 | No | PWA-5 | `REGISTER_AS_DISABLED` | `APPROVE_DISABLED_STATE_REGISTRATION` | `08-deferred-feature-policy-register.md` |
| `OQ-BIL-1` | open | C63 @ 1.1.0 | No | — | `REGISTER_AS_DISABLED` | `APPROVE_DISABLED_STATE_REGISTRATION` | `08-deferred-feature-policy-register.md` |
| `OQ-BIL-2` | open | C63 @ 1.1.0 | No | BIL-12 | `REGISTER_AS_DISABLED` | `APPROVE_DISABLED_STATE_REGISTRATION` | `08-deferred-feature-policy-register.md` |
| `OQ-BIL-3` | open | C63 @ 1.1.0 | No | BIL-13 | `REGISTER_SPLIT_RESIDUAL` | `APPROVE_PARTIAL_REGISTRATION_AND_SUPPLY_RESIDUAL_VALUE_LATER` | `08-deferred-feature-policy-register.md` |

## 4. Rows with a missing owner value

| ID | Blocker | Missing value | What registers now | Fail-closed behavior until supplied |
| --- | --- | --- | --- | --- |
| `OQ-PRIV-4` | No | export fulfillment deadline | {"export_format": "JSON (machine-readable) + human-readable summary"} | Export requests may be accepted and tracked (PRIV-10) but no deadline is promised in any UI, policy or DPA text (PRIV-14, PRIV-17). |
| `OQ-PRIV-5` | No | deletion fulfillment deadline | Nothing | No deletion deadline is promised anywhere. Deletion requests remain operator-handled and cannot be represented as fulfilled on a deadline. |
| `OQ-TXN-2` | No | email delivery provider; OAuth provider(s) | {"in_scope_external_effects": ["email delivery", "OAuth sign-in"], "payments": "DISABLED"} | No email or OAuth adapter may perform an external effect. OAuth sign-in and email-delivered invitations/resets are unavailable. |
| `OQ-CNT-2` | No | content approver role/title | {"mechanism": "version/digest-bound approval in Content-owned record; recorded actor/scope/time; audited"} | CNT-11: content displays and records no customer-approval claim. |
| `OQ-CERT-2` | **Yes** | certification-criteria approver role/title; approval-record ownership | {"mechanism": "version/digest-bound approval, designated approvers, audited", "approver_role": "UNKNOWN", "approval_record_location": "UNKNOWN"} | CERT-4 / CERT-8: IssueCertification rejects every request because no approved criteria version can exist. |
| `OQ-API-3` | No | deprecation sunset periods | {"versioning": "/api/v1 major-version path", "deprecation": "explicit deprecation manifest"} | No /api/v1 operation may be deprecated or removed; breaking changes require /api/v2 under API-13. |
| `OQ-EVD-2` | No | evidence retention duration; durable content-addressed archive location | {"storage": "repository metadata + SHA-bound artifacts", "ci_artifacts_assumed_permanent": false} | Evidence older than the CI artifact expiry is UNKNOWN for re-verification; no claim may rely on an expired artifact. |
| `OQ-OBS-1` | No | alert destination | {"errors": "Sentry", "traffic": "Vercel Analytics", "alert_destination": "UNKNOWN"} | No alert may be claimed to reach a human. OBS-2 conformance is UNKNOWN. |
| `OQ-BIL-3` | No | Organization-to-billing-account cardinality | {"billing_account_owner": "Organization", "entitlement_projection": "read-only, Organization-owned"} | Billing stays disabled (BIL-1); no billing-account record is created. |

## 5. Row detail

Each block lists the preserved value (structured from the register text, not new policy), dependencies, recorded conflicts, and technical notes. `packet` and `follow-up` hashes are SHA-256 of the verbatim register text so a later reader can prove the source was not edited.

### OQ-SYS-1 — Does numeric order within a group (for example C11 before C12) define precedence, or are contracts within a group peers?

- Register: record 57, `ANSWER_RECEIVED_UNREGISTERED` / `SUPPLIED_PACKET_RESPONSE`; packet `dec29d4a87e3e5d2…`, follow-up `none…`
- Preserved value: `{"intra_group_precedence": "PEERS", "conflict_rule": "MORE_RESTRICTIVE_REQUIREMENT_APPLIES", "conflict_must_be_recorded": true}`
- Registration target: `contracts/c00-system-authority-contract.md` 1.0.3 → next MINOR via SYS-21; amends `SYS-4`
- Bound value: `09-governance-content-certification-web-packet.md` must contain `GROUP_PEERS_RESTRICTIVE_ON_CONFLICT`, `the more restrictive requirement governs`

### OQ-SYS-2 — Where does the compatibility register live, and in what format (Markdown table, machine-readable file checked in CI, or both)?

- Register: record 58, `ANSWER_RECEIVED_UNREGISTERED` / `SUPPLIED_PACKET_RESPONSE`; packet `198a6bc0f1c663d6…`, follow-up `none…`
- Preserved value: `{"canonical_register": "governance/compatibility-register.json", "human_view": "generated Markdown", "ci_validated": true}`
- Registration target: `contracts/c00-system-authority-contract.md` 1.0.3 → next MINOR via SYS-21; amends `SYS-11`
- Bound value: `09-governance-content-certification-web-packet.md` must contain `JSON_CANONICAL_REGISTER_WITH_MARKDOWN_VIEW`, `governance/compatibility-register.json`
- Note: Register file does not exist at baseline; artifact defines its JSON Schema, generator and CI check.

### OQ-SYS-5 — Which parts of C11–C15 and C21–C23 are applicable to the learner demo?

- Register: record 59, `ANSWER_RECEIVED_UNREGISTERED` / `SUPPLIED_PACKET_RESPONSE`; packet `ad1d27688fac8ee3…`, follow-up `none…`
- Preserved value: `{"demo_applicability": "APPROVE_EXPLICIT_MATRIX", "shared_deployment_requires_release_proof": true}`
- Registration target: `contracts/c00-system-authority-contract.md` 1.0.3 → next MINOR via SYS-21; amends `SYS-29`
- Bound value: `09-governance-content-certification-web-packet.md` must contain `EXPLICIT_CORE_DEMO_APPLICABILITY`
- Note: Exact requirement-level applicability matrix is authored in the controlling artifact.

### OQ-AGT-1 — Where are AutomationActor execution identities and their capability sets registered?

- Register: record 0, `ANSWER_RECEIVED_UNREGISTERED` / `SUPPLIED_PACKET_RESPONSE`; packet `bf46bb5e70519ed9…`, follow-up `none…`
- Preserved value: `{"automation_identity_registry": "backend execution-principal records", "capability_assignment": "explicit per principal", "ci_job_is_product_actor": false}`
- Registration target: `contracts/c02-automation-agent-authority-contract.md` 1.0.3 → next MINOR via SYS-21; amends `AGT-9`
- Bound value: `02-c14-authorization-capability-matrix.md` must contain `governance/automation-principals.json`
- Bound value: `c14-capability-matrix.json` must contain `"automation_principals": []`

### OQ-AGT-2 — What is the first runtime-agent use case, if any, that would trigger the revision of this contract?

- Register: record 1, `ANSWER_RECEIVED_UNREGISTERED` / `SUPPLIED_PACKET_RESPONSE`; packet `7ba142627c6d452a…`, follow-up `none…`
- Preserved value: `{"runtime_agents": "DISABLED", "enablement_trigger": "named use case + dedicated C02 revision defining AgentIdentity/AgentCapability/tool boundary/evidence/escalation/recovery"}`
- Registration target: `contracts/c02-automation-agent-authority-contract.md` 1.0.3 → next MINOR via SYS-21; amends `AGT-16`
- Bound value: `08-deferred-feature-policy-register.md` must contain `DEFER_RUNTIME_AGENTS`

### OQ-AGT-3 — Which existing jobs, workers, and CLI commands (for example `pnpm cli`) carry forward as AutomationActors?

- Register: record 2, `ANSWER_RECEIVED_UNREGISTERED` / `SUPPLIED_PACKET_RESPONSE`; packet `5f9619fbcbd8df88…`, follow-up `none…`
- Preserved value: `{"adoption_rule": "NAMED_JOB_BY_JOB", "blanket_grandfathering": false}`
- Registration target: `contracts/c02-automation-agent-authority-contract.md` 1.0.3 → next MINOR via SYS-21
- Bound value: `02-c14-authorization-capability-matrix.md` must contain `NAMED_JOB_BY_JOB`
- Note: Baseline inventory: zero V2 jobs/workers/CLIs act as AutomationActors; scripts/db/migrate.ts is the C21 migration runner (AGT-11 exception), not a product actor.

### OQ-IDN-1 — **Resolved** Which password hashing algorithm and parameters are approved?

- Register: record 27, `ANSWER_RECEIVED_UNREGISTERED` / `SUPPLIED_PACKET_RESPONSE`; packet `4e1480ceca5c440e…`, follow-up `none…`
- Preserved value: `{"algorithm": "argon2id", "memory_kib": 19456, "iterations": 2, "parallelism": 1, "salt": "unique CSPRNG salt per hash", "encoding": "versioned PHC string"}`
- Registration target: `contracts/c11-identity-credentials-contract.md` 1.5.0 → next MINOR via SYS-21; amends `IDN-5`
- Bound value: `c11-identity-credentials-contract.md` must contain `ARGON2ID_19M_T2_P1`, `at least 19456 KiB`
- Note: Salt length and tag length are engineering parameters proposed in the artifact, not owner-supplied.
- Note: Backend benchmark is implementation evidence, not a registration precondition.

### OQ-IDN-3 — **Resolved** Which sessions does a credential change revoke: all sessions, all other sessions, or another policy?

- Register: record 28, `ANSWER_RECEIVED_UNREGISTERED` / `SUPPLIED_PACKET_RESPONSE`; packet `302f17f7f72f3ba8…`, follow-up `none…`
- Preserved value: `{"credential_change_revokes": "ALL_SESSIONS_OF_TARGET_IDENTITY", "atomic_with_credential_change": true, "reauthentication_required": true}`
- Registration target: `contracts/c11-identity-credentials-contract.md` 1.5.0 → next MINOR via SYS-21; amends `IDN-15`
- Bound value: `c11-identity-credentials-contract.md` must contain `ALL_SESSIONS_ON_CREDENTIAL_CHANGE`, `including the session that performed the change`

### OQ-IDN-4 — **Resolved** What is the OAuth linking rule: verified-email match, explicit user-initiated linking only, or another rule?

- Register: record 29, `ANSWER_RECEIVED_UNREGISTERED` / `SUPPLIED_PACKET_RESPONSE`; packet `da1a2a23528ac3cb…`, follow-up `none…`
- Preserved value: `{"linking_rule": "EXPLICIT_USER_INITIATED_REAUTHENTICATED", "email_match_links": false, "email_match_creates_identity": false}`
- Registration target: `contracts/c11-identity-credentials-contract.md` 1.5.0 → next MINOR via SYS-21; amends `IDN-2`
- Bound value: `c11-identity-credentials-contract.md` must contain `EXPLICIT_REAUTHENTICATED_LINKING`, `a matching email address alone MUST NOT link`
- Depends on: `OQ-TXN-2`
- Note: identity_credentials has no provider/subject columns at baseline; OAUTH_LINK persistence needs schema admission before implementation.

### OQ-IDN-7 — Must password-reset and invitation responses be indistinguishable for registered and unregistered emails?

- Register: record 31, `ANSWER_RECEIVED_UNREGISTERED` / `SUPPLIED_PACKET_RESPONSE`; packet `62cfeebcef8ed6be…`, follow-up `none…`
- Preserved value: `{"password_reset_and_invitation_response": "INDISTINGUISHABLE_FOR_KNOWN_AND_UNKNOWN_EMAIL", "abuse_controls": "bounded"}`
- Registration target: `contracts/c11-identity-credentials-contract.md` 1.5.0 → next MINOR via SYS-21
- Bound value: `06-identity-tenancy-manager-registration-packet.md` must contain `{"status":"accepted"}`, `INDISTINGUISHABLE_ACCEPTED_RESPONSE`

### OQ-SES-1 — Which `SameSite` value is approved: `Strict` or `Lax`?

- Register: record 52, `ANSWER_RECEIVED_UNREGISTERED` / `RECOMMENDED`; packet `81133f2b660aba7c…`, follow-up `ae7b0ce1a953d5a1…`
- Preserved value: `{"sameSite": "Lax"}`
- Registration target: `contracts/c12-application-sessions-contract.md` 1.1.0 → next MINOR via SYS-21; amends `SES-5`
- Bound value: `04-session-transport-security-spec.md` must contain `SameSite=Lax` and must not contain `SameSite=Strict`, `SameSite=None`
- Depends on: `OQ-SES-5`
- Note: Register state is RECOMMENDED; 2026-10-04 review requires owner selection. Lax is safe only together with SES-5 origin enforcement.

### OQ-SES-2 — Which cookie domain and path are approved given the web and API hostnames?

- Register: record 53, `ANSWER_RECEIVED_UNREGISTERED` / `RECOMMENDED`; packet `9aed6311830358c9…`, follow-up `ae7b0ce1a953d5a1…`
- Preserved value: `{"topology": "same-origin", "web_origin": "https://t34ch.com", "api_prefix": "/api/v1", "cookie": {"Domain": null, "Path": "/", "Secure": true, "HttpOnly": true, "SameSite": "Lax"}}`
- Registration target: `contracts/c12-application-sessions-contract.md` 1.1.0 → next MINOR via SYS-21; amends `SES-6`
- Bound value: `04-session-transport-security-spec.md` must contain `__Host-teach_session`, `'https://t34ch.com'`, `| 'Domain' | **Absent** |` and must not contain `Domain=.t34ch.com`, `Domain=t34ch.com`
- Note: OQ-REL-1 (Vercel) is registered, so the original REL-1 dependency is satisfied. Exact project/domain binding remains release evidence.

### OQ-SES-5 — Is `SameSite` alone the approved CSRF control, or is an additional mechanism (token, origin check) required?

- Register: record 54, `ANSWER_RECEIVED_UNREGISTERED` / `SUPPLIED_PACKET_RESPONSE`; packet `aa17cb234429d0f9…`, follow-up `none…`
- Preserved value: `{"csrf_control": "EXACT_ALLOWED_ORIGIN_ON_UNSAFE_METHODS", "deny_when_origin": ["missing", "foreign", "malformed", "null"], "includes_logout": true}`
- Registration target: `contracts/c12-application-sessions-contract.md` 1.1.0 → next MINOR via SYS-21; amends `SES-18`
- Bound value: `04-session-transport-security-spec.md` must contain `No 'Referer' fallback`, `| Missing | '403 FORBIDDEN', no write |`
- Depends on: `OQ-SES-2`

### OQ-SES-6 — On which events must the session credential rotate (sign-in, privilege change, other)?

- Register: record 55, `ANSWER_RECEIVED_UNREGISTERED` / `SUPPLIED_PACKET_RESPONSE`; packet `828f1ca46a382813…`, follow-up `none…`
- Preserved value: `{"rotate_on": ["successful sign-in", "privilege elevation"], "pre_authentication_credential_upgrade": false, "atomic": true}`
- Registration target: `contracts/c12-application-sessions-contract.md` 1.1.0 → next MINOR via SYS-21; amends `SES-19`
- Bound value: `04-session-transport-security-spec.md` must contain `step-up reauthentication`, `Never reuse or upgrade a presented value`
- Note: SES-16 forbids sessions carrying authority, so "privilege elevation" must be defined as step-up reauthentication; artifact gives the exact event list.

### OQ-SES-7 — Is there a limit on concurrent sessions per identity?

- Register: record 56, `ANSWER_RECEIVED_UNREGISTERED` / `SUPPLIED_PACKET_RESPONSE`; packet `088cafcdd901ceaf…`, follow-up `none…`
- Preserved value: `{"concurrent_session_limit": null, "eviction_semantics": "not defined; a later limit requires explicit selection"}`
- Registration target: `contracts/c12-application-sessions-contract.md` 1.1.0 → next MINOR via SYS-21
- Bound value: `04-session-transport-security-spec.md` must contain `No count limit.`

### OQ-TEN-1 — **Resolved** Does v2 start with the Gate A single-location compatibility membership or a normalized multi-organization, multi-location membership model?

- Register: record 60, `ANSWER_RECEIVED_UNREGISTERED` / `SUPPLIED_PACKET_RESPONSE`; packet `438b5d33e4838b55…`, follow-up `none…`
- Preserved value: `{"membership_model": "NORMALIZED_MULTI_ORGANIZATION_MULTI_LOCATION"}`
- Registration target: `contracts/c13-tenancy-membership-contract.md` 1.5.0 → next MINOR via SYS-21; amends `TEN-15`
- Bound value: `c13-tenancy-membership-contract.md` must contain `NORMALIZED_MULTI_ORGANIZATION_MULTI_LOCATION`
- Note: Membership entity is held as candidate in kernel/entities.json pending this decision; Location is candidate.

### OQ-TEN-2 — **Resolved** How does a request select its scope when an identity holds more than one membership (explicit path segment, header validated against membership, other)?

- Register: record 61, `ANSWER_RECEIVED_UNREGISTERED` / `SUPPLIED_PACKET_RESPONSE`; packet `f15982d0c709300e…`, follow-up `none…`
- Preserved value: `{"scope_selection": "EXPLICIT_VALIDATED_SCOPE_TUPLE", "implicit_default_or_first_found": false}`
- Registration target: `contracts/c13-tenancy-membership-contract.md` 1.5.0 → next MINOR via SYS-21; amends `TEN-7`
- Bound value: `c13-tenancy-membership-contract.md` must contain `EXPLICIT_VALIDATED_SCOPE_TUPLE`
- Depends on: `OQ-TEN-1`
- Note: Transport encoding of the tuple is proposed in 05-api-boundary-manifest.md.

### OQ-AUTHZ-1 — Is the Gate A capability vocabulary and bundle table (accepted 2026-07-22) adopted verbatim for v2, amended, or replaced?

- Register: record 11, `ANSWER_RECEIVED_UNREGISTERED` / `DIRECTION_RECORDED`; packet `b63c34f73db357dd…`, follow-up `e3818dce3d1e7bb4…`
- Preserved value: `{"matrix_source": "NEW_V2", "legacy_grants_adopted": false}`
- Registration target: `contracts/c14-authorization-capabilities-contract.md` 1.2.0 → next MINOR via SYS-21; amends `AUTHZ-19`
- Bound value: `c14-capability-matrix.json` must contain `"matrix_source": "NEW_V2"`, `"legacy_grants_adopted": false`, `"cross_tenant_capabilities": []`
- Depends on: `OQ-TEN-1`, `OQ-TEN-2`, `OQ-MGR-1`, `OQ-MGR-2`, `OQ-AGT-1`
- **Conflict:** Global Identity lifecycle commands (DeactivateIdentity, ReactivateIdentity, OffboardIdentity) have cross-organization effects under a multi-organization model; OQ-TEN-3 resolution already records that a separate scope/actor policy is required.
- Note: kernel/capabilities.json has 0 entries at baseline.
- Note: No registered command issues SetupToken/PasswordResetToken; no command creates Organization or Location.

### OQ-PRIV-1 — What exactly do deleted, anonymized, retained, and offboarded mean in Teach?

- Register: record 42, `ANSWER_RECEIVED_UNREGISTERED` / `DRAFT_FOR_REVIEW`; packet `b3e7b00c51bbc484…`, follow-up `c8c318113bfa319d…`
- Preserved value: `{"deletion": "hard delete from database", "anonymization": "PII replaced with irreversible hash", "retention": "keep as-is", "offboarding": "revoke access, retain history"}`
- Registration target: `contracts/c15-data-isolation-privacy-contract.md` 1.0.3 → next MINOR via SYS-21
- Bound value: `03-c15-data-lifecycle-privacy-matrix.md` must contain `CORRECTED_LIFECYCLE_DEFINITIONS`, `MUST NOT call it anonymized`
- **Conflict:** "Irreversible hash" is pseudonymization, not anonymization (2026-10-04 review; NIST SP 800-188 s4.3.2).
- **Conflict:** IdentityStatus DELETED has no authorized ingress (DB trigger blocks it).

### OQ-PRIV-2 — What retention periods apply to each record class?

- Register: record 43, `ANSWER_RECEIVED_UNREGISTERED` / `DRAFT_FOR_REVIEW`; packet `9270a7dcb72e6ce7…`, follow-up `c8c318113bfa319d…`
- Preserved value: `{"duration": 1, "unit": "year", "record_classes": ["Identity", "Credential", "session", "token", "membership", "learning", "certification", "audit"], "legal_hold": "suspends deletion"}`
- Registration target: `contracts/c15-data-isolation-privacy-contract.md` 1.0.3 → next MINOR via SYS-21; amends `PRIV-12`
- Bound value: `03-c15-data-lifecycle-privacy-matrix.md` must contain `ONE_YEAR_TERMINAL_CLOCK`, `automatic deletion of it is BLOCKED`
- **Conflict:** One-year record retention must not be read as one-year credential validity; 12h/30m session and 7d/15m/1h token limits remain binding.
- **Conflict:** Certification records MUST NOT be deleted through application paths (CERT-12).

### OQ-PRIV-3 — Which record classes are exempt from deletion, and on what legal or audit basis?

- Register: record 44, `ANSWER_RECEIVED_UNREGISTERED` / `DRAFT_FOR_REVIEW`; packet `b8f76c8c99df1ef8…`, follow-up `c8c318113bfa319d…`
- Preserved value: `{"exemptions": ["audit"], "legal_hold_is_exemption": false}`
- Registration target: `contracts/c15-data-isolation-privacy-contract.md` 1.0.3 → next MINOR via SYS-21; amends `PRIV-15`
- Bound value: `03-c15-data-lifecycle-privacy-matrix.md` must contain `AUDIT_SUBJECT_DELETION_EXEMPTION`, `Legal hold is a suspension, not an exemption`
- **Conflict:** Audit exemption from subject deletion differs from audit expiry at 1 year (AUD-11); audit deletion is still BLOCKED.

### OQ-PRIV-4 — What export format and fulfillment deadline apply?

- Register: record 45, `ANSWER_RECEIVED_UNREGISTERED` / `SUPPLIED_PACKET_RESPONSE`; packet `d25cada6928fa539…`, follow-up `none…`
- Preserved value: `{"export_format": "JSON (machine-readable) + human-readable summary"}`
- Registration target: `contracts/c15-data-isolation-privacy-contract.md` 1.0.3 → next MINOR via SYS-21
- Bound value: `03-c15-data-lifecycle-privacy-matrix.md` must contain `"export_version":"1.0.0"`, `Deadline: **UNKNOWN** (OQ-PRIV-4 residual)`

### OQ-PRIV-5 — What deletion fulfillment deadline applies?

- Register: record 46, `ANSWER_RECEIVED_UNREGISTERED` / `SUPPLIED_PACKET_RESPONSE`; packet `43b8f9c2111d58fe…`, follow-up `none…`
- Preserved value: `{}`
- Registration target: `contracts/c15-data-isolation-privacy-contract.md` 1.0.3 → next MINOR via SYS-21
- Bound value: `03-c15-data-lifecycle-privacy-matrix.md` must contain `Deletion deadline: **UNKNOWN** (OQ-PRIV-5)`
- Note: Register labels this SUPPLIED_PACKET_RESPONSE, but the supplied text defers the value ("Requires your input"). No deadline exists in any source.

### OQ-PRIV-6 — Can export and deletion be fulfilled by an operator procedure at first, rather than self-service?

- Register: record 47, `ANSWER_RECEIVED_UNREGISTERED` / `SUPPLIED_PACKET_RESPONSE`; packet `7c0bb968861342d8…`, follow-up `none…`
- Preserved value: `{"initial_fulfillment": "VERIFIED_SCOPED_AUDITED_OPERATOR_PROCEDURE", "self_service": "later"}`
- Registration target: `contracts/c15-data-isolation-privacy-contract.md` 1.0.3 → next MINOR via SYS-21
- Bound value: `03-c15-data-lifecycle-privacy-matrix.md` must contain `AUDITED_OPERATOR_PROCEDURE_FIRST`

### OQ-MIG-3 — Will any browser-reachable database role exist in v2 (for example a hosted-auth client), making RLS tests applicable?

- Register: record 36, `ANSWER_RECEIVED_UNREGISTERED` / `SUPPLIED_PACKET_RESPONSE`; packet `37e9d9ff6089304e…`, follow-up `none…`
- Preserved value: `{"browser_reachable_application_tables": false, "implicit_rls_exemption": false}`
- Registration target: `contracts/c21-database-migration-contract.md` 1.1.0 → next MINOR via SYS-21; amends `MIG-12`
- Bound value: `07-evidence-release-operations-spec.md` must contain `BACKEND_ONLY_APPLICATION_DATABASE`, `**Release blocker:**`, `Project-specific; verified only by readback`
- Note: Supabase exposure is project-specific (opt-in default for new projects from 2026-05-30, enforced on existing projects 2026-10-30); MIG-11/12 proof must come from readback of the exact target project showing zero application-table privileges for anon/authenticated.

### OQ-MIG-4 — Are production migrations applied by the deployment pipeline or by a manual, owner-approved step?

- Register: record 37, `ANSWER_RECEIVED_UNREGISTERED` / `SUPPLIED_PACKET_RESPONSE`; packet `46aa022f34106413…`, follow-up `none…`
- Preserved value: `{"production_apply": "MANUAL_OWNER_APPROVED_EXACT_CANDIDATE", "ci_grants_production_permission": false}`
- Registration target: `contracts/c21-database-migration-contract.md` 1.1.0 → next MINOR via SYS-21
- Bound value: `07-evidence-release-operations-spec.md` must contain `MANUAL_OWNER_APPROVED_PRODUCTION_APPLY`, `CI holds no production database credential`

### OQ-MIG-5 — Will v2 import any data from the legacy Teach database, and if so through which governed, audited path? Until decided, MIG-7's production baseline is the v2 production schema only.

- Register: record 38, `ANSWER_RECEIVED_UNREGISTERED` / `SUPPLIED_PACKET_RESPONSE`; packet `b979c2026e48c741…`, follow-up `none…`
- Preserved value: `{"legacy_data_import": "ABSENT", "future_import_requires": "own source snapshot, transformation, reconciliation, audit and rollback plan"}`
- Registration target: `contracts/c21-database-migration-contract.md` 1.1.0 → next MINOR via SYS-21
- Bound value: `08-deferred-feature-policy-register.md` must contain `NO_LEGACY_DATA_IMPORT_YET`

### OQ-TXN-2 — Which external providers are in scope for v2 (email delivery, OAuth, payments, other), and which owns reconciliation for each?

- Register: record 63, `ANSWER_RECEIVED_UNREGISTERED` / `SUPPLIED_PACKET_RESPONSE`; packet `a19027e69a69d467…`, follow-up `none…`
- Preserved value: `{"in_scope_external_effects": ["email delivery", "OAuth sign-in"], "payments": "DISABLED"}`
- Registration target: `contracts/c22-transaction-idempotency-reconciliation-contract.md` 1.2.0 → next MINOR via SYS-21
- Bound value: `07-evidence-release-operations-spec.md` must contain `in scope = email delivery and OAuth sign-in; payments disabled`

### OQ-AUD-2 — For which entities must current state be reconstructable from lifecycle history?

- Register: record 9, `ANSWER_RECEIVED_UNREGISTERED` / `SUPPLIED_PACKET_RESPONSE`; packet `c0f5fe1e681c8ff5…`, follow-up `none…`
- Preserved value: `{"reconstructable_entities": ["Identity", "Membership", "Assignment", "Certification"], "projections_separate_from_canonical_state": true}`
- Registration target: `contracts/c23-audit-lifecycle-events-contract.md` 1.1.0 → next MINOR via SYS-21; amends `AUD-7`
- Bound value: `07-evidence-release-operations-spec.md` must contain `IDENTITY_MEMBERSHIP_ASSIGNMENT_CERTIFICATION_HISTORY`

### OQ-AUD-3 — Which denial types are operationally significant enough to record?

- Register: record 10, `ANSWER_RECEIVED_UNREGISTERED` / `SUPPLIED_PACKET_RESPONSE`; packet `a7cf24db14b29754…`, follow-up `none…`
- Preserved value: `{"recorded_denials": ["capability", "tenant scope", "target scope", "invalid or revoked credential abuse"], "rate_limited": true, "validation_errors_recorded": false}`
- Registration target: `contracts/c23-audit-lifecycle-events-contract.md` 1.1.0 → next MINOR via SYS-21; amends `AUD-8`
- Bound value: `07-evidence-release-operations-spec.md` must contain `SECURITY_SIGNIFICANT_DENIALS_ONLY`, `100 rows per actor per hour`
- Note: Rate-limit/deduplication parameters are engineering proposals in the artifact.

### OQ-CNT-2 — Where are customer content approvals recorded, and who may record one?

- Register: record 22, `ANSWER_RECEIVED_UNREGISTERED` / `SUPPLIED_PACKET_RESPONSE`; packet `3af74681267b659b…`, follow-up `none…`
- Preserved value: `{"mechanism": "version/digest-bound approval in Content-owned record; recorded actor/scope/time; audited"}`
- Registration target: `contracts/c31-content-teaching-engine-contract.md` 1.1.0 → next MINOR via SYS-21; amends `CNT-11`
- Bound value: `09-governance-content-certification-web-packet.md` must contain `A new content version never inherits an approval`
- Note: OQ-CNT-1 dependency is now resolved (C31 1.1.0).
- Note: Same approver-identity gap as OQ-CERT-2.

### OQ-CNT-3 — Which legacy pack formats must v2 accept through adapters?

- Register: record 23, `ANSWER_RECEIVED_UNREGISTERED` / `SUPPLIED_PACKET_RESPONSE`; packet `2217109dde0389e6…`, follow-up `none…`
- Preserved value: `{"accepted_legacy_formats": [], "admission_rule": "one named adapter per format, fixtures incl. negative fixtures, C00 compatibility-register entry"}`
- Registration target: `contracts/c31-content-teaching-engine-contract.md` 1.1.0 → next MINOR via SYS-21
- Bound value: `08-deferred-feature-policy-register.md` must contain `ONE_NAMED_ADAPTER_PER_LEGACY_FORMAT`

### OQ-LRN-2 — How are mastery, XP, streak, and rank derived from events?

- Register: record 32, `ANSWER_RECEIVED_UNREGISTERED` / `SUPPLIED_PACKET_RESPONSE`; packet `2a63e42b6cae5bdf…`, follow-up `none…`
- Preserved value: `{"xp_mastery_streak_rank": "UNAVAILABLE_UNTIL_VERSIONED_FORMULAS_APPROVED"}`
- Registration target: `contracts/c32-learning-sessions-progress-contract.md` 1.2.0 → next MINOR via SYS-21; amends `LRN-13`
- Bound value: `08-deferred-feature-policy-register.md` must contain `DEFER_SCORING_FORMULAS`
- Note: Verified: learning_sessions has columns id, identity_id, assignment_id, status only; no persisted XP, so the non-blocking label holds.

### OQ-MGR-1 — **Resolved** Is manager visibility limited to direct reports, the whole location, or configurable?

- Register: record 34, `ANSWER_RECEIVED_UNREGISTERED` / `SUPPLIED_PACKET_RESPONSE`; packet `b52423223a39e314…`, follow-up `none…`
- Preserved value: `{"manager_visibility": "DIRECT_REPORTS_INTERSECT_ACTIVE_ORGANIZATION_LOCATION_SCOPE", "reporting_creates_capability": false}`
- Registration target: `contracts/c33-manager-operations-contract.md` 1.1.0 → next MINOR via SYS-21; amends `MGR-3`
- Bound value: `c33-manager-operations-contract.md` must contain `DIRECT_REPORTS_WITHIN_APPROVED_SCOPE`
- **Conflict:** No ReportingRelationship concept exists in kernel/entities.json; until one is registered (C01 semantic change) the direct-report set is empty and managers see no learners (fail closed).

### OQ-MGR-2 — May managers offboard directly, or only request offboarding for an operator to approve?

- Register: record 35, `ANSWER_RECEIVED_UNREGISTERED` / `SUPPLIED_PACKET_RESPONSE`; packet `8810cc9493f1f9ac…`, follow-up `none…`
- Preserved value: `{"manager_offboarding": "DEDICATED_CAPABILITY_THROUGH_CANONICAL_IDENTITY_SERVICE", "global_effects": "require separate policy"}`
- Registration target: `contracts/c33-manager-operations-contract.md` 1.1.0 → next MINOR via SYS-21
- Bound value: `06-identity-tenancy-manager-registration-packet.md` must contain `EXPLICIT_OFFBOARD_CAPABILITY_THROUGH_IDENTITY_SERVICE`, `GLOBAL-EFFECT GUARD`
- Depends on: `OQ-AUTHZ-1`
- **Conflict:** Same global-lifecycle conflict as OQ-AUTHZ-1.

### OQ-CERT-1 — **Resolved** Is credential verification public (anyone with the link) or private (authenticated, scoped)? (Deferred by Gate A.)

- Register: record 16, `ANSWER_RECEIVED_UNREGISTERED` / `SUPPLIED_PACKET_RESPONSE`; packet `c9e4246f7c275d11…`, follow-up `none…`
- Preserved value: `{"verification_surface": "PRIVATE_AUTHENTICATED_SCOPED", "public_link": "requires separate disclosure model"}`
- Registration target: `contracts/c34-certification-credentials-contract.md` 1.2.0 → next MINOR via SYS-21; amends `CERT-13`
- Bound value: `c34-certification-credentials-contract.md` must contain `PRIVATE_AUTHENTICATED_SCOPED_VERIFICATION`

### OQ-CERT-2 — Who approves certification criteria versions, and where is approval recorded?

- Register: record 17, `ANSWER_RECEIVED_UNREGISTERED` / `UNKNOWN`; packet `0cfb03bec2331913…`, follow-up `6563fe5a62e06c28…`
- Preserved value: `{"mechanism": "version/digest-bound approval, designated approvers, audited", "approver_role": "UNKNOWN", "approval_record_location": "UNKNOWN"}`
- Registration target: `contracts/c34-certification-credentials-contract.md` 1.2.0 → next MINOR via SYS-21; amends `CERT-4`
- Bound value: `09-governance-content-certification-web-packet.md` must contain `| Approver role/title | **UNKNOWN** |`

### OQ-CERT-3 — What evidence types are acceptable (observation notes, checklist, photo, other)?

- Register: record 18, `ANSWER_RECEIVED_UNREGISTERED` / `SUPPLIED_PACKET_RESPONSE`; packet `e411666b4e4e2be5…`, follow-up `none…`
- Preserved value: `{"accepted_evidence": ["structured checklist result", "scoped observation note"], "photo_evidence": "DISABLED"}`
- Registration target: `contracts/c34-certification-credentials-contract.md` 1.2.0 → next MINOR via SYS-21; amends `CERT-7`
- Bound value: `08-deferred-feature-policy-register.md` must contain `STRUCTURED_CHECKLIST_AND_OBSERVATION_NOTES_FIRST`

### OQ-CERT-5 — Do certifications expire, and if so how is expiry represented?

- Register: record 20, `ANSWER_RECEIVED_UNREGISTERED` / `SUPPLIED_PACKET_RESPONSE`; packet `ed92dbc993f5fcfb…`, follow-up `none…`
- Preserved value: `{"certification_expiry": "NONE", "future_expiry_requires": "owner-defined representation, effects, history/revocation rules"}`
- Registration target: `contracts/c34-certification-credentials-contract.md` 1.2.0 → next MINOR via SYS-21
- Bound value: `08-deferred-feature-policy-register.md` must contain `NO_IMPLICIT_EXPIRY`

### OQ-API-1 — Which routes are boundary exceptions outside `/api/v1`?

- Register: record 5, `ANSWER_RECEIVED_UNREGISTERED` / `SOURCE_SCAN_PENDING_SELECTION`; packet `76795de259a00402…`, follow-up `bbcdda8a7bcdaf95…`
- Preserved value: `{"product_operations": "/api/v1/*", "exceptions": "health/readiness + auth callbacks only", "implemented_http_route_count_at_scan": 0}`
- Registration target: `contracts/c41-api-boundary-contract.md` 1.0.3 → next MINOR via SYS-21
- Bound value: `api-boundary-manifest.json` must contain `"path": "/api/health"`, `"path": "/api/ready"`, `"path": "/api/auth/callback/{provider}"`
- Note: Exact exception list is authored in api-boundary-manifest.json; no route is authorized until registered.

### OQ-API-2 — What is the error envelope shape?

- Register: record 6, `ANSWER_RECEIVED_UNREGISTERED` / `SUPPLIED_PACKET_RESPONSE`; packet `14e220457a934c4b…`, follow-up `none…`
- Preserved value: `{"error_envelope": ["code", "message", "requestId"], "target_denials": "identical and non-disclosing"}`
- Registration target: `contracts/c41-api-boundary-contract.md` 1.0.3 → next MINOR via SYS-21; amends `API-10`
- Bound value: `05-api-boundary-manifest.md` must contain `CODE_MESSAGE_REQUEST_ID_ENVELOPE`
- Bound value: `api-error-envelope.schema.json` must contain `"requestId"`, `"additionalProperties": false`

### OQ-API-3 — What is the API versioning and deprecation policy?

- Register: record 7, `ANSWER_RECEIVED_UNREGISTERED` / `SUPPLIED_PACKET_RESPONSE`; packet `c18c36bdc60aaa50…`, follow-up `none…`
- Preserved value: `{"versioning": "/api/v1 major-version path", "deprecation": "explicit deprecation manifest"}`
- Registration target: `contracts/c41-api-boundary-contract.md` 1.0.3 → next MINOR via SYS-21; amends `API-13`
- Bound value: `05-api-boundary-manifest.md` must contain `'/api/v2'`, `**Sunset period: UNKNOWN**`

### OQ-WEB-1 — Which accessibility standard and level is approved (for example WCAG 2.2 AA)?

- Register: record 64, `ANSWER_RECEIVED_UNREGISTERED` / `SUPPLIED_PACKET_RESPONSE`; packet `04fd38138a9d0a9a…`, follow-up `none…`
- Preserved value: `{"accessibility_standard": "WCAG 2.2", "level": "AA", "minimum_target_css_px": 44}`
- Registration target: `contracts/c42-web-client-boundary-contract.md` 1.0.3 → next MINOR via SYS-21; amends `WEB-15`
- Bound value: `09-governance-content-certification-web-packet.md` must contain `WCAG_2_2_AA`, `44×44 CSS px`

### OQ-WEB-2 — Is the core-path list above complete for v2?

- Register: record 65, `ANSWER_RECEIVED_UNREGISTERED` / `SUPPLIED_PACKET_RESPONSE`; packet `c9c0f9b79ec6bd40…`, follow-up `none…`
- Preserved value: `{"core_paths": ["login", "assigned-content start", "recorded completion", "scoped manager view", "logout"], "demo_isolation": "separately specified"}`
- Registration target: `contracts/c42-web-client-boundary-contract.md` 1.0.3 → next MINOR via SYS-21
- Bound value: `09-governance-content-certification-web-packet.md` must contain `sign in, start assigned content, record completion, scoped manager view, sign out`

### OQ-EVD-1 — Which contracts are high-risk and require independent verification?

- Register: record 24, `ANSWER_RECEIVED_UNREGISTERED` / `SUPPLIED_PACKET_RESPONSE`; packet `274d1f88cab8f888…`, follow-up `none…`
- Preserved value: `{"independent_verification_required_for": ["C11", "C12", "C13", "C14", "C15", "C21", "C22", "C23", "C51", "C52", "protected cross-domain mutations"], "self_audit_is_independent": false}`
- Registration target: `contracts/c51-verification-evidence-contract.md` 1.0.3 → next MINOR via SYS-21; amends `EVD-16`
- Bound value: `07-evidence-release-operations-spec.md` must contain `INDEPENDENT_SECURITY_DATA_RELEASE_VERIFICATION`

### OQ-EVD-2 — Where are evidence records stored and for how long?

- Register: record 25, `ANSWER_RECEIVED_UNREGISTERED` / `SUPPLIED_PACKET_RESPONSE`; packet `6564ae72562cd5ec…`, follow-up `none…`
- Preserved value: `{"storage": "repository metadata + SHA-bound artifacts", "ci_artifacts_assumed_permanent": false}`
- Registration target: `contracts/c51-verification-evidence-contract.md` 1.0.3 → next MINOR via SYS-21
- Bound value: `07-evidence-release-operations-spec.md` must contain `Content addressing`, `Residual owner values: **retention duration** and **archive location**`

### OQ-EVD-3 — How do these four evidence states map to the TOS truth states (verified, declared, inferred, unknown, conflicting, stale)?

- Register: record 26, `ANSWER_RECEIVED_UNREGISTERED` / `SUPPLIED_PACKET_RESPONSE`; packet `4a730ea1f395529f…`, follow-up `none…`
- Preserved value: `{"PROVEN": "verified, current, exact-SHA evidence", "BLOCKED": "unmet gate", "UNKNOWN": "insufficient or stale evidence", "CONTRADICTORY": "conflicting facts", "declared_or_inferred_auto_promote": false}`
- Registration target: `contracts/c51-verification-evidence-contract.md` 1.0.3 → next MINOR via SYS-21
- Bound value: `07-evidence-release-operations-spec.md` must contain `Never auto-promotes`, `Only path to PROVEN`

### OQ-REL-3 — What does the deployed smoke test cover?

- Register: record 50, `ANSWER_RECEIVED_UNREGISTERED` / `SUPPLIED_PACKET_RESPONSE`; packet `de0a85f0c0a0aea4…`, follow-up `none…`
- Preserved value: `{"smoke_scope": ["deployment/config/schema identity", "health/readiness", "role/scope denials", "assigned-content start/completion", "atomic audit", "logout replay", "recovery"], "url_200_sufficient": false}`
- Registration target: `contracts/c52-deployment-release-recovery-contract.md` 1.2.0 → next MINOR via SYS-21; amends `REL-8`
- Bound value: `07-evidence-release-operations-spec.md` must contain `SOURCE_ENV_AUTHORIZATION_RECOVERY_SMOKE_MATRIX`, `A '200' on the home page is not a step.`

### OQ-OBS-1 — Which error-capture and alerting providers are approved, and where do alerts go?

- Register: record 39, `ANSWER_RECEIVED_UNREGISTERED` / `RECOMMENDED`; packet `4d898d0341117e24…`, follow-up `0a67e03d01d6f88c…`
- Preserved value: `{"errors": "Sentry", "traffic": "Vercel Analytics", "alert_destination": "UNKNOWN"}`
- Registration target: `contracts/c53-observability-contract.md` 1.1.0 → next MINOR via SYS-21; amends `OBS-2`
- Bound value: `07-evidence-release-operations-spec.md` must contain `sendDefaultPii: false`, `**Alert destination: UNKNOWN**`
- **Conflict:** Vercel Analytics conflicts with OQ-ANL-1 (analytics disabled) unless reclassified as non-product operational traffic metrics with zero learner identifiers.
- **Conflict:** Sentry default retention (30-day lookback) cannot satisfy OBS-11 90-day retention alone.

### OQ-OBS-2 — Which learner fields, if any, may appear in logs?

- Register: record 40, `ANSWER_RECEIVED_UNREGISTERED` / `SUPPLIED_PACKET_RESPONSE`; packet `2923e637e730088b…`, follow-up `none…`
- Preserved value: `{"logs_may_contain": ["request ID", "operation", "denial reason class", "approved pseudonymous operational identifiers"], "logs_must_not_contain": ["credentials", "learner payload content"]}`
- Registration target: `contracts/c53-observability-contract.md` 1.1.0 → next MINOR via SYS-21; amends `OBS-7`
- Bound value: `07-evidence-release-operations-spec.md` must contain `NO_CREDENTIALS_OR_LEARNER_PAYLOAD_LOGGING`

### OQ-ANL-1 — Will analytics be enabled for v2, and with which provider?

- Register: record 3, `ANSWER_RECEIVED_UNREGISTERED` / `SUPPLIED_PACKET_RESPONSE`; packet `760f58347bc0abdb…`, follow-up `none…`
- Preserved value: `{"analytics": "DISABLED", "provider": null}`
- Registration target: `contracts/c61-analytics-contract.md` 1.0.3 → next MINOR via SYS-21
- Bound value: `08-deferred-feature-policy-register.md` must contain `'OQ-ANL-1' | C61 | Product analytics | 'DISABLED'`

### OQ-ANL-2 — Which identifying fields, if any, may analytics events carry?

- Register: record 4, `ANSWER_RECEIVED_UNREGISTERED` / `SUPPLIED_PACKET_RESPONSE`; packet `4197618d6d468043…`, follow-up `none…`
- Preserved value: `{"identifying_fields_permitted": []}`
- Registration target: `contracts/c61-analytics-contract.md` 1.0.3 → next MINOR via SYS-21; amends `ANL-7`
- Bound value: `08-deferred-feature-policy-register.md` must contain `NO_IDENTIFYING_ANALYTICS_FIELDS`

### OQ-PWA-1 — Will offline writes ever be authorized, and for which operations?

- Register: record 48, `ANSWER_RECEIVED_UNREGISTERED` / `SUPPLIED_PACKET_RESPONSE`; packet `db6b6b958d15dbf5…`, follow-up `none…`
- Preserved value: `{"offline_writes": "NOT_AUTHORIZED"}`
- Registration target: `contracts/c62-pwa-offline-contract.md` 1.0.3 → next MINOR via SYS-21; amends `PWA-5`
- Bound value: `08-deferred-feature-policy-register.md` must contain `NO_OFFLINE_WRITES`

### OQ-BIL-1 — When, if ever, is self-service billing enabled for v2?

- Register: record 13, `ANSWER_RECEIVED_UNREGISTERED` / `SUPPLIED_PACKET_RESPONSE`; packet `69e2d944631c343a…`, follow-up `none…`
- Preserved value: `{"self_service_billing": "DISABLED"}`
- Registration target: `contracts/c63-billing-contract.md` 1.1.0 → next MINOR via SYS-21
- Bound value: `08-deferred-feature-policy-register.md` must contain `'OQ-BIL-1' | C63 | Self-service billing | 'DISABLED'`

### OQ-BIL-2 — Which payment provider is approved (the source proposal names Stripe)?

- Register: record 14, `ANSWER_RECEIVED_UNREGISTERED` / `SUPPLIED_PACKET_RESPONSE`; packet `1c5cb2d1fe3c804b…`, follow-up `none…`
- Preserved value: `{"payment_provider": null, "money_movement": "NOT_AUTHORIZED"}`
- Registration target: `contracts/c63-billing-contract.md` 1.1.0 → next MINOR via SYS-21; amends `BIL-12`
- Bound value: `08-deferred-feature-policy-register.md` must contain `DEFER_PAYMENT_PROVIDER`

### OQ-BIL-3 — How does an Organization relate to its billing account (for example one-to-one, owned by the organization)?

- Register: record 15, `ANSWER_RECEIVED_UNREGISTERED` / `SUPPLIED_PACKET_RESPONSE`; packet `954a92c0549f5e95…`, follow-up `none…`
- Preserved value: `{"billing_account_owner": "Organization", "entitlement_projection": "read-only, Organization-owned"}`
- Registration target: `contracts/c63-billing-contract.md` 1.1.0 → next MINOR via SYS-21; amends `BIL-13`
- Bound value: `08-deferred-feature-policy-register.md` must contain `ORGANIZATION_OWNED_BILLING_RELATION_PROPOSAL`, `Organization-to-billing-account cardinality`

## 6. Definition of resolved (applies to every row)

A row moves out of this matrix only when **all** of the following are true on one exact SHA:

1. GitHub issue opened before material contract edits (SYS-21)
2. Prior contract version preserved under contracts/superseded/ with status superseded
3. OQ row marked Resolved with the selection token and approval date; affected requirement text carries the value
4. contracts/APPROVAL-RECORD.md entry naming contract ID and new version, recorded from an owner approval (SYS-17, SYS-18)
5. scripts/verification/owner-decision-inventory.mjs unresolved count decreases by exactly the resolved IDs and no others
6. scripts/docs/validate-document-metadata.mjs and existing CI pass on the exact registration SHA

Negative conditions — a row is **not** resolved when:

- the answer exists only in the register, a chat, an issue comment or this package;
- a recommendation or confidence label ("99%") is the only basis;
- an AI or automated agent recorded the approval (SYS-18);
- the inventory count dropped by more or fewer IDs than the registration names;
- implementation passed tests but the contract row still reads Open (SYS-34 forbids implementing beyond fail-closed first).

## 7. Change log

| Version | Date | Change |
| --- | --- | --- |
| 0.1.0 | 2026-10-05 | Initial proposed matrix generated from the live inventory and the 2026-10-05 answer register. |
| 0.2.0 | 2026-10-05 | Live state recomputed on `6553eb4` after PR #74 (7 rows RESOLVED, 49 open, 11 blockers); added `live_state`/`registered_by`; recorded owner chat approval with registration pending under #75. |
| 0.3.0 | 2026-10-05 | Audit corrections: every row carries `semantic_assertions` binding the approved value to its governing artifact (finding 3); OQ-MIG-3 Supabase note reworded to project-specific readback (finding 5). |
