<!--tos-doc
{
  "doc_id": "TEACH-PROP-DCS-03",
  "class": "specification",
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
    "purpose": "revision baseline: main after PR #74"
  },
  "governed_by": [
    "TEACH-CON-C00",
    "TEACH-CON-C15"
  ],
  "resolves_if_approved": [
    "OQ-PRIV-1",
    "OQ-PRIV-2",
    "OQ-PRIV-3",
    "OQ-PRIV-6"
  ],
  "machine_sources": [
    "c15-data-lifecycle-matrix.json"
  ],
  "issue": "#68"
}
-->

# C15 Data Lifecycle and Privacy Matrix

| Field | Value |
| --- | --- |
| Status | `proposed` — corrected owner draft; not legal advice; nothing here is authority until registered |
| Owner decision | Approved in chat 2026-10-05 04:05 America/Chicago (decision sheet A–D). Registration PENDING under SYS-21 #75; this document stays `proposed` until it lands. |
| Resolves if approved | `OQ-PRIV-1`, `OQ-PRIV-2`, `OQ-PRIV-3`, `OQ-PRIV-6`; registers the format half of `OQ-PRIV-4` |
| Stays open | `OQ-PRIV-4` export deadline; `OQ-PRIV-5` deletion deadline (no value exists in any source) |
| Issue | #68, read 2026-10-05. Its four deliverables map to: field/action/retention/hold matrix → §4 and §7; corrected anonymization proposal → §2 D-1 and §3; residual-linkage evidence → §4.2; per-class clocks and audit subject-deletion vs expiry → §4 and §2 D-6 |
| Machine source | `c15-data-lifecycle-matrix.json` |

## 1. Current truth at baseline

| Fact | State |
| --- | --- |
| Direct identifiers (email, name, phone) stored in the V2 database | **Verified: none.** All 8 implemented tables hold opaque IDs, statuses, timestamps, secret verifiers or a credential hash. |
| `IdentityStatus.DELETED` ingress | **Verified: blocked** by trigger `identity_guard_identity_update` (INSERT or UPDATE into DELETED raises). |
| Retention executor, legal-hold store, deletion ledger, export/deletion request lifecycle | **Verified: absent.** |
| Audit storage | Not admitted (AuditEvent `candidate`). AUD-11 one-year policy registered; deletion BLOCKED. |
| Operational log retention | OBS-11 90 days registered; no sink evidenced. |
| Legal counsel review of these definitions | UNKNOWN — not performed. The owner may approve without counsel; the definitions are written to be technically executable, not as a legal opinion. |

## 2. Owner draft (preserved verbatim) and corrections

Source: `verification/owner-decisions/2026-10-05/sources/follow-up-answers.md` item 2.

```text
OQ-PRIV-1/2/3 — Conservative defaults (option b). Drafting below for your review:

- Deletion = hard delete from database. Anonymization = PII replaced with irreversible hash. Retention = keep as-is. Offboarding = revoke access, retain history.
- Retention: 1 year for all record classes (Identity, Credential, session, token, membership, learning, certification, audit). Legal hold suspends deletion.
- Exemptions: Audit records only (per AUD-1). No blanket exemptions. Legal hold is a suspension, not an exemption.
```

| # | Draft statement | Defect | Correction (owner intent kept) |
| --- | --- | --- | --- |
| D-1 | Anonymization = PII replaced with irreversible hash | A hash of an email or name can be recomputed from a guess and linked across records. It is **pseudonymization**; the data stays personal data (2026-10-04 review, NIST SP 800-188 §4.3.2). | Hashing is named pseudonymization and never called anonymized. "Anonymized" is restricted to aggregates (§3). Subject deletion removes identifiers instead of hashing them. |
| D-2 | Deletion = hard delete from database | Correct for most rows, but hard-deleting the Identity row breaks immutable audit/lifecycle references (AUD-4, AUD-6) and certification history (CERT-12). Backups still hold the data. | Rows are hard-deleted; the Identity row becomes a DELETED tombstone holding no personal data; backups age out and every restore replays the deletion ledger. |
| D-3 | Retention = keep as-is | Undefined clock and end action. | Every class has a clock start, a duration and an expiry action (§4). |
| D-4 | Offboarding = revoke access, retain history | Summary only; IDN-18 already fixes the exact effects. | OFFBOARDED = the IDN-18 effects verbatim; it starts retention clocks and deletes nothing. |
| D-5 | 1 year for all record classes | Clock start not stated. Counting from creation would delete an active learner's history after a year. Also must not be read as 1-year session/token validity. | Clocks start at the record's terminal event or at the end of the subject's Membership in that organization. SES-11 and IDN-9 lifetimes are unchanged. |
| D-6 | Exemptions: Audit records only | Audit exempt from *subject deletion* is different from audit *expiry*. | Audit is exempt from subject deletion and still expires at 1 year under AUD-11 (deletion executor still BLOCKED). Certification needs a decision (§6 C-2). |
| D-7 | Legal hold suspends deletion | Authority, scope, effects and release unspecified. | Full hold record in §7. |

## 3. Definitions for C15 PRIV-13 (exactly one meaning each)

| Term | Meaning |
| --- | --- |
| **DELETED** | Applied to a record: the row is removed from the primary database by a governed, audited executor in a committed transaction, every dependent copy listed in this matrix has its stated expiry action, and the deletion is entered in the deletion ledger. Applied to an Identity: the Identity row becomes the DELETED tombstone (id, status, created_at only) and every personal-data record of the subject is hard-deleted or expired per §4. DELETED is terminal. |
| **ANONYMIZED** | Applies only to aggregate outputs from which no individual record can be recovered, with a minimum cell size of 5 identities per reported group (proposed engineering value). An individual-level record is never called anonymized, regardless of hashing. |
| **PSEUDONYMIZED (technical term, not one of the four)** | Direct identifiers replaced by a value that still allows linkage — opaque IDs while a mapping exists, keyed or unkeyed hashes, payload hashes. Pseudonymized data is personal data. Code and documents MUST NOT call it anonymized. |
| **RETAINED** | The record is kept unchanged, readable only through C14-authorized operations, until its retention clock plus duration elapses; then its expiry action runs. Retention never extends authentication validity. |
| **OFFBOARDED** | Exactly the IDN-18 effects in one transaction: IdentityStatus INACTIVE, IdentityOffboarded emitted, all sessions revoked, frontline credentials and pending single-use tokens revoked, effective Membership and grants removed through the Organization boundary. Offboarding deletes nothing and starts retention clocks. |

Prohibited usages (MUST NOT): "anonymized" for any individual-level record; "deleted" for offboarding, deactivation, revocation or soft-flagging; "purged" or "permanently erased" in any UI, policy or DPA text unless the backup window W is evidenced (PRIV-14, PRIV-17).

## 4. Record-class matrix

| Record class | Physical state | Retention clock starts | Duration | Expiry action | Offboarding effect | Subject-deletion action |
| --- | --- | --- | --- | --- | --- | --- |
| **Identity** `identity_identities` | `IMPLEMENTED_SCHEMA` | offboarded_at; for non-offboard deactivation: UNDEFINED (no deactivated_at column) | 1 year (OWNER_DRAFT_OQ-PRIV-2) | Transition to DELETED tombstone: row kept with id/status/created_at only so immutable audit and lifecycle references stay valid. Requires C11 revision authorizing DELETED ingress solely from the retention/deletion executor (DB trigger currently blocks it). | status INACTIVE, offboarded_at set once, IdentityOffboarded emitted (IDN-18). No data removed. | Same as expiry action, executed on request after verification (PRIV-11), subject to holds. |
| **Credential** `identity_credentials` | `IMPLEMENTED_SCHEMA` | revoked_at | 1 year (OWNER_DRAFT_OQ-PRIV-2) | Hard DELETE of the row. | Credential revoked (revoked_at set) in the offboarding transaction (IDN-18). | Hard DELETE of every credential row of the identity in the deletion transaction (no hold exemption needed: a hash has no evidentiary value). |
| **ApplicationSession** `identity_application_sessions` | `IMPLEMENTED_SCHEMA` | COALESCE(revoked_at, expired_at, absolute_expires_at) | 1 year (OWNER_DRAFT_OQ-PRIV-2) | Hard DELETE of the row. | All ACTIVE sessions REVOKED in the offboarding transaction (IDN-18, SES-14). | Hard DELETE of all session rows of the identity. |
| **Invitation** `identity_invitations` | `IMPLEMENTED_SCHEMA` | COALESCE(accepted_at, revoked_at, expired_at) | 1 year (OWNER_DRAFT_OQ-PRIV-2) | Hard DELETE of the row. | PENDING invitations created by or for the identity are REVOKED (pending single-use secrets, IDN-18). | Hard DELETE of invitations where the identity is invited_identity_id; for owner_identity_id rows, set owner reference to the identity tombstone (opaque, retained). |
| **SetupToken** `identity_setup_tokens` | `IMPLEMENTED_SCHEMA` | COALESCE(consumed_at, revoked_at, expired_at) | 1 year (OWNER_DRAFT_OQ-PRIV-2) | Hard DELETE of the row. | ACTIVE tokens REVOKED in the offboarding transaction (IDN-18). | Hard DELETE of all rows of the identity. |
| **PasswordResetToken** `identity_password_reset_tokens` | `IMPLEMENTED_SCHEMA` | COALESCE(consumed_at, revoked_at, expired_at) | 1 year (OWNER_DRAFT_OQ-PRIV-2) | Hard DELETE of the row. | ACTIVE tokens REVOKED in the offboarding transaction (IDN-18). | Hard DELETE of all rows of the identity. |
| **LearningSession** `learning_sessions` | `IMPLEMENTED_SCHEMA` | Time the learner's last Membership in the owning organization reaches INACTIVE or REVOKED (proposed); never while a Membership is ACTIVE | 1 year (OWNER_DRAFT_OQ-PRIV-2) | Hard DELETE of the session and its ProgressEvents in one transaction. | Retained unchanged (history retained). | Hard DELETE (same as expiry). |
| **ProgressEvent** `(P08)` | `PLANNED_NOT_ADMITTED` | Inherits LearningSession clock | 1 year (OWNER_DRAFT_OQ-PRIV-2) | Deleted with its LearningSession. | Retained. | Deleted with its LearningSession. |
| **Assignment** `(P06)` | `PLANNED_NOT_ADMITTED` | Same as LearningSession | 1 year (OWNER_DRAFT_OQ-PRIV-2) | Hard DELETE after dependent LearningSessions are deleted. | Retained. | Hard DELETE (after dependents). |
| **Membership** `(Membership held candidate pending OQ-TEN-1)` | `PLANNED_NOT_ADMITTED` | Time status becomes REVOKED | 1 year (OWNER_DRAFT_OQ-PRIV-2) | Hard DELETE of the row; history remains in lifecycle events (AUD-7) under audit retention. | ACTIVE → INACTIVE → REVOKED through Organization command boundary (IDN-18 "remove effective membership"). | Hard DELETE after REVOKED. |
| **Certification** `(P07)` | `PLANNED_NOT_ADMITTED` | Same as LearningSession | 1 year (OWNER_DRAFT_OQ-PRIV-2) | CONFLICT: CERT-12 forbids deleting certification records through application paths. Expiry cannot run until resolved (see §6). | Retained. | CONFLICT (same as expiry). |
| **AuditEvent** `(AuditEvent candidate)` | `PLANNED_NOT_ADMITTED` | occurred_at | 1 year (REGISTERED_AUD-11) | Privileged expiry executor deletes rows older than 1 year. BLOCKED: AUD-11 keeps audit deletion BLOCKED until the clock/executor is admitted; AUD-4 forbids application-path deletion. | Retained. | EXEMPT from subject deletion (draft OQ-PRIV-3). Retained until its own 1-year expiry. Contains opaque references only (AUD-5). |
| **LifecycleEvent** `(LifecycleEvent candidate)` | `PLANNED_NOT_ADMITTED` | occurred_at | 1 year (PROPOSED: follow audit retention) | Same executor as AuditEvent; BLOCKED with it. | Retained. | EXEMPT with AuditEvent (proposed). |
| **ReconciliationRecord** `transaction_control_reconciliation_records` | `IMPLEMENTED_SCHEMA` | GREATEST(resolved_at, idempotency_retention_until); OPEN records have no clock | 1 year (OWNER_DRAFT_OQ-PRIV-2) | Hard DELETE when RESOLVED and clock elapsed. OPEN records never expire (TXN-8). | Retained. | Retained until expiry: needed to prevent duplicate external effects (TXN-5, TXN-7); contains no direct identifiers if constraints hold. |
| **OperationalLog** `—` | `EXTERNAL_COPY` | emitted_at | 90 days (REGISTERED_OBS-11) | Sink deletes at 90 days. UNKNOWN: no sink meets 90 days by default (Vercel ≤30d by plan; Sentry 30d lookback). | None. | Not individually deleted; ages out at 90 days. Logs must not contain direct identifiers (OBS-2), which makes per-subject deletion unnecessary. |
| **DatabaseBackup** `—` | `EXTERNAL_COPY` | backup creation time | UNKNOWN (provider retention configuration; MIG-9 requires ≥ daily backups) | Provider ages backups out. Deleted subjects persist in backups until then. | None. | Not edited. Subject data in backups expires with the backup. Any restore MUST replay the deletion ledger before the restored database serves traffic. |
| **DeletionLedger** `(new)` | `PLANNED_NOT_ADMITTED` | executed_at | W + 30 days (PROPOSED: backup window W plus 30 days) | Hard DELETE. | — | — |
| **DataExportBundle** `(new)` | `PLANNED_NOT_ADMITTED` | generated_at | 7 days (PROPOSED engineering value) | Delete stored copy after 7 days. | — | Deleted with the request. |
| **ExternalProviderCopy** `—` | `EXTERNAL_COPY` | provider-defined | UNKNOWN until OQ-TXN-2 providers are selected | Provider retention. | — | Provider deletion API or retention; documented per provider before selection. |
| **CIEvidenceArtifact** `—` | `EXTERNAL_COPY` | upload time | GitHub artifact expiry (OQ-EVD-2 residual) | Expires. | — | Not applicable: fixtures MUST be synthetic; real personal data in CI artifacts is a defect. |

### 4.1 Field categories per class

Categories: `OPAQUE_ID`, `OPAQUE_LINK` (reference to another opaque ID), `STATUS`, `TIMESTAMP`, `SECRET_VERIFIER`, `CREDENTIAL_HASH`, `SCOPE_REF`, `CONTENT_REF`, `PROVIDER_DATA`, `DIRECT_IDENTIFIER`, `FREE_TEXT`, `LEARNER_PAYLOAD`, `OPERATIONAL`.

| Record class | Fields (category) | Gaps |
| --- | --- | --- |
| Identity | `id` (OPAQUE_ID); `status` (STATUS); `offboarded_at` (TIMESTAMP); `created_at` (TIMESTAMP); `updated_at` (TIMESTAMP) | No deactivated_at timestamp: retention clock for DeactivateIdentity (non-offboard) cannot start. DELETED ingress blocked by identity_guard_identity_update trigger; any deletion implementation is BLOCKED until C11 changes. |
| Credential | `id` (OPAQUE_ID); `identity_id` (OPAQUE_LINK); `credential_type` (STATUS); `password_hash` (CREDENTIAL_HASH); `revoked_at` (TIMESTAMP) | RECOMMENDATION R-1: retaining a revoked password hash for one year keeps an offline-crackable secret with no evidentiary use. Recommended correction: null password_hash at revocation and keep the row (type, revoked_at) for the 1-year history. Requires C11/P04 domain change (PASSWORD rows currently require a hash). |
| ApplicationSession | `id` (OPAQUE_ID); `identity_id` (OPAQUE_LINK); `status` (STATUS); `verifier_version` (STATUS); `credential_verifier` (SECRET_VERIFIER); `issued_at` (TIMESTAMP); `absolute_expires_at` (TIMESTAMP); `last_used_at` (TIMESTAMP); `revoked_at` (TIMESTAMP); `expired_at` (TIMESTAMP) | Record retention is not validity: SES-11 (12h absolute / 30m idle) still governs authentication. |
| Invitation | `id` (OPAQUE_ID); `owner_identity_id` (OPAQUE_LINK); `invited_identity_id` (OPAQUE_LINK); `status` (STATUS); `secret_verifier` (SECRET_VERIFIER); `issued_at` (TIMESTAMP); `expires_at` (TIMESTAMP); `accepted_at` (TIMESTAMP); `revoked_at` (TIMESTAMP); `expired_at` (TIMESTAMP); `recipient_email (planned)` (DIRECT_IDENTIFIER) | IDN-20 requires recognizing an offboarded identity's email; that check needs a retained email or keyed email digest, which is pseudonymous personal data and must be listed here once admitted. |
| SetupToken | `id` (OPAQUE_ID); `identity_id` (OPAQUE_LINK); `status` (STATUS); `secret_verifier` (SECRET_VERIFIER); `issued_at` (TIMESTAMP); `expires_at` (TIMESTAMP); `consumed_at` (TIMESTAMP); `revoked_at` (TIMESTAMP); `expired_at` (TIMESTAMP) | — |
| PasswordResetToken | `id` (OPAQUE_ID); `identity_id` (OPAQUE_LINK); `status` (STATUS); `secret_verifier` (SECRET_VERIFIER); `issued_at` (TIMESTAMP); `expires_at` (TIMESTAMP); `consumed_at` (TIMESTAMP); `revoked_at` (TIMESTAMP); `expired_at` (TIMESTAMP) | — |
| LearningSession | `id` (OPAQUE_ID); `identity_id` (OPAQUE_LINK); `assignment_id` (OPAQUE_LINK); `status` (STATUS) | No organization_id column: PRIV-1/TEN-13 require exactly one owning organization per tenant-owned record; ownership is only derivable through the not-yet-admitted Assignment. Retention clock cannot be computed until fixed. No timestamps on learning_sessions; retention needs at least started_at/completed_at. |
| ProgressEvent | `id` (OPAQUE_ID); `learning_session_id` (OPAQUE_LINK); `content identity+version` (CONTENT_REF); `payload` (LEARNER_PAYLOAD) | — |
| Assignment | `id` (OPAQUE_ID); `identity_id` (OPAQUE_LINK); `organization_id` (SCOPE_REF); `content version/digest` (CONTENT_REF) | — |
| Membership | `id` (OPAQUE_ID); `identity_id` (OPAQUE_LINK); `organization_id` (SCOPE_REF); `location_id` (SCOPE_REF); `status` (STATUS); `grants` (AUTHORITY) | — |
| Certification | `id` (OPAQUE_ID); `learner identity_id` (OPAQUE_LINK); `observer identity_id` (OPAQUE_LINK); `criteria version/digest` (CONTENT_REF); `checklist result` (STRUCTURED_EVIDENCE); `observation note` (FREE_TEXT) | Free-text observation notes are the highest-risk personal-data field in the planned schema. |
| AuditEvent | `actor reference` (OPAQUE_LINK); `target reference` (OPAQUE_LINK); `organization/location` (SCOPE_REF); `action/result/time` (OPERATIONAL); `request/idempotency id` (OPERATIONAL) | — |
| LifecycleEvent | `entity reference` (OPAQUE_LINK); `transition` (STATUS); `time` (TIMESTAMP) | — |
| ReconciliationRecord | `id` (OPAQUE_ID); `authoritative_scope` (SCOPE_REF); `provider_name` (OPERATIONAL); `provider_reference` (PROVIDER_DATA); `provider_detail` (PROVIDER_DATA); `idempotency_key` (OPERATIONAL); `payload_hash` (OPERATIONAL) | No CHECK constraint prevents personal data in provider_detail; enforce in the adapter and test with canary values (PRIV-AC-4). |
| OperationalLog | `request id, operation, denial class` (OPERATIONAL); `pseudonymous operational ids` (OPAQUE_LINK) | — |
| DatabaseBackup | `full database copy` (ALL) | Backup retention window W is UNKNOWN; the privacy statement may promise only "deleted from backups within W days" once W is evidenced (PRIV-14, PRIV-17). |
| DeletionLedger | `subject identity id` (OPAQUE_ID); `record class` (OPERATIONAL); `executed_at` (TIMESTAMP); `request id` (OPERATIONAL) | Must survive a database restore, so it cannot live only inside the restorable database; candidate: separate store or export with each backup cycle. |
| DataExportBundle | `subject records` (ALL_SUBJECT_DATA) | — |
| ExternalProviderCopy | `recipient email, message metadata` (DIRECT_IDENTIFIER) | — |
| CIEvidenceArtifact | `test output` (OPERATIONAL) | — |

### 4.2 Residual linkage after subject deletion (issue #68 evidence)

After subject deletion the person's direct identifiers are gone from the primary database, but these items can still link records back to them. None of them makes a record "anonymized" (§3); each is listed with its control and the test that proves the control.

| # | Residual item | Where it remains | Who could re-link, and how | Control | Evidence |
| --- | --- | --- | --- | --- | --- |
| L-1 | Identity tombstone ID | `identity_identities` (tombstone), AuditEvent/LifecycleEvent actor and target references, other people's Invitation `owner_identity_id`, other learners' Certification observer reference | Anyone holding an older copy that maps ID → person (backup, delivered export, a manager's memory of "who did what") | No table maps the ID to a person after deletion; audit/lifecycle rows expire at 1 year; readable only by `org_admin` (AUD-10) | PRIV-X-11 |
| L-2 | Quasi-identifiers in retained rows | Audit rows: organization, location, action, timestamp | Insiders in a small team: a 6-person kitchen can infer the person from location + shift time | Treated as personal data for the full retention period; never published or aggregated below 5 people | PRIV-X-13 |
| L-3 | Free text written about the person | Other learners' certification observation notes; reconciliation `provider_detail` if misused | Anyone reading the note | Notes are bound by their own record's retention (C-2); `provider_detail` must hold no identifiers (canary test) | PRIV-X-9, PRIV-X-12 |
| L-4 | Backup copies | Supabase backups until window W (UNKNOWN) | Anyone performing a restore | Deletion-ledger replay before a restored database serves traffic; no deletion-time promise until W is evidenced | PRIV-X-6 |
| L-5 | Processor copies | Email/OAuth provider logs linked by `provider_reference` message IDs | Provider staff or a provider data request | Provider retention is outside Teach; listed per provider when OQ-TXN-2 selects one | Provider documentation at selection |
| L-6 | Payload hashes | `transaction_control_reconciliation_records.payload_hash` | Anyone who can guess the payload (e.g. an email address) and recompute the hash | Pseudonymous by definition; expires with the record (PRIV-15 exemption ends at expiry) | PRIV-X-11 |
| L-7 | Delivered exports | Files already given to the subject or controller | Their holder | Outside Teach once delivered; the stored copy expires after 7 days | PRIV-X-14 |

## 5. Constraints

MUST:

1. Every retention period in §4 has an executable mechanism before any document promises it (PRIV-12). Until then the period is a policy value only and the conformance state is UNKNOWN.
2. Every executor deletion is scoped to an exact owner (organization), run ID and record class; unscoped DELETE statements do not exist (TXN-13).
3. Every executor run writes an audit record per batch with actor type `AutomationActor` and its execution identity (AGT-14).
4. A database restore replays the deletion ledger before the restored database serves any request.
5. Credential verifiers and session/token verifiers are used only for authentication; they are never reused as identifiers or as an anonymization device.
6. Subject deletion and expiry check for active legal holds inside the same transaction that deletes.

MUST NOT:

1. Call any per-person record anonymized.
2. Delete AuditEvent or LifecycleEvent rows through any application path (AUD-4); only the privileged expiry executor may, and only after AUD-11 executor admission.
3. Delete a ReconciliationRecord in state OPEN (TXN-8).
4. Let a legal hold block offboarding, session revocation or authentication denial.
5. Put personal data in `provider_detail`, `provider_reference`, operational logs, analytics or CI artifacts.
6. Automatically delete, or make a retention or compliance claim about, a record class that is absent from §4. Its retention is UNKNOWN until a revision adds it; the executor skips it and reports it.

## 6. Conflicts the owner resolves by approving this document

| ID | Conflict | Options | Recommendation and tradeoff |
| --- | --- | --- | --- |
| C-1 | Identity deletion needs `DELETED` ingress, which C11 IDN-21 and the DB trigger forbid. | (a) C11 revision: DELETED ingress only from the retention/deletion executor. (b) Never use DELETED; delete the Identity row. | **(a).** Keeps audit/lifecycle references valid with a tombstone holding no personal data. Cost: a C11 MINOR revision and a trigger change. (b) breaks AUD-4/AUD-6 foreign references. |
| C-2 | Owner draft gives certifications 1-year retention; CERT-12 forbids deleting certification records through application paths. | (a) C34 revision: only the retention executor may delete, after the clock. (b) Exempt certifications from expiry. | **(a).** (b) creates indefinite retention of free-text observation notes, which the original answer sheet warned against. Cost: a former employee loses Teach-held proof of certification one year after leaving; the restaurant must export it first if it needs longer. |
| C-3 | `learning_sessions` has no `organization_id` and no timestamps. Retention clock cannot be computed; PRIV-1/TEN-13 ownership is incomplete. | (a) Add `organization_id` and `started_at`/`completed_at` through P06/P05 admission. (b) Derive through Assignment. | **(a).** Direct ownership is what PRIV-AC-1 inspects. Cost: migration + admission evidence. |
| R-1 | Revoked password hashes retained 1 year. | (a) Keep hash for 1 year as drafted. (b) Null the hash at revocation; keep the row. | **(b).** A retained hash is an offline-crackable secret with no evidentiary use. Cost: C11/P04 domain change (PASSWORD rows currently require a hash). |
| C-4 | Backup window W is unknown. | — | No privacy text may state a backup deletion time until W is read from the Supabase project configuration and recorded as evidence. |

## 7. Legal hold

Record shape (proposed new Governance-owned record, not tenant-writable):

```json
{
  "hold_id": "opaque-id",
  "organization_id": "opaque-id",
  "subject_identity_ids": ["opaque-id"],
  "record_classes": ["LearningSession", "Certification"],
  "basis": "written request reference (controller or counsel); no free-text personal data",
  "placed_by": "operator execution identity",
  "placed_at": "RFC 3339",
  "review_on": "ISO date, at most 180 days after placed_at",
  "released_at": null,
  "released_by": null
}
```

- **Authority (proposed):** placed and released only by the Top Shelf operator procedure on a written request from the customer organization (controller) or counsel. Not a tenant capability. Owner approves this authority by approving this document.
- **Effect:** while `released_at` is null, expiry and subject deletion skip matching rows; the skipped count is reported per run. Offboarding, revocation and authentication are unaffected.
- **Constraints:** every place/release is audited; a hold with no `review_on` is invalid; an expired `review_on` is reported daily until reviewed (it does not auto-release).
- **Negative tests:** a tenant org_admin cannot create or release a hold (403); a deletion request on a held subject ends `ON_HOLD`, not `COMPLETED`; releasing a hold does not delete anything until the next executor run.

## 8. Retention executor

| Property | Specification |
| --- | --- |
| Actor | AutomationActor principal `automation:retention-executor` (registered under `02-…` §9) |
| Capabilities (new C01 identifiers, not in the 34) | `privacy.retention.execute`, `privacy.request.fulfill` |
| Schedule | Once per day; a missed run is caught up by the next run (clock-based, not run-count based) |
| Batch | ≤ 1,000 rows per class per organization per transaction (proposed); each batch scoped by organization + class + run ID |
| Idempotency | SERVER_DERIVED: (run_id, class, organization_id); re-running deletes nothing already deleted |
| Outputs | Per-run report: rows expired per class, rows skipped by hold, failures; stored as evidence (EVD-10) |
| Failure | Batch rolls back; next run retries; three consecutive failed runs raise an alert (OBS-5) |
| Dry run | Required mode that reports counts without deleting; first production execution needs owner approval of a dry-run report |

## 9. Export and deletion request lifecycle (PRIV-10, PRIV-11, OQ-PRIV-6)

States: `RECEIVED` → `IDENTITY_VERIFIED` → `SCOPE_CONFIRMED` → `IN_PROGRESS` → `COMPLETED` | `REJECTED`; `ON_HOLD` reachable from `IN_PROGRESS` (deletion only).

| Transition | Actor | Required evidence |
| --- | --- | --- |
| → RECEIVED | Operator records request from subject or controller | Request ID, channel, organization |
| RECEIVED → IDENTITY_VERIFIED | Operator | Verification method recorded (no copy of ID documents stored) |
| IDENTITY_VERIFIED → SCOPE_CONFIRMED | Operator | Organization(s) and record classes in scope |
| SCOPE_CONFIRMED → IN_PROGRESS | Executor (`privacy.request.fulfill`) | Run ID |
| IN_PROGRESS → COMPLETED | Executor | Export: bundle digest + delivery record. Deletion: ledger entries + list of exempt/retained classes with reasons (PRIV-AC-8) |
| IN_PROGRESS → ON_HOLD | Executor | Hold ID |
| any → REJECTED | Operator | Reason code: unverifiable, out of scope, duplicate |

Export format (registers half of OQ-PRIV-4): `export.json` = `{"export_version":"1.0.0","generated_at":RFC3339,"subject":{"identity_id"},"organization_id","records":{"<RecordClass>":[...]}}` plus `summary.txt` (human-readable counts and descriptions). Deadline: **UNKNOWN** (OQ-PRIV-4 residual). Deletion deadline: **UNKNOWN** (OQ-PRIV-5). Until set, no text may promise a time.

## 10. Proposed registration text (C15 1.0.3 → 1.1.0)

Registration form: values are written into existing requirement text or the resolved open-question row; no requirement or acceptance IDs are added (`00-README.md` §R). Test cases in this document are verification cases cited by that text, not contract acceptance IDs.

- **OQ-PRIV-1 → Resolved `CORRECTED_LIFECYCLE_DEFINITIONS`:** §3 table becomes the C15 Definitions row for the four terms; PRIV-13 cites it.
- **OQ-PRIV-2 → Resolved `ONE_YEAR_TERMINAL_CLOCK`:** amend PRIV-12 text (no new requirement ID): "Retention clocks, durations and expiry actions MUST be those in the approved data lifecycle matrix. A record class absent from the matrix has retention semantics UNKNOWN: automatic deletion of it is BLOCKED and no retention, deletion or compliance claim may cover it until a revision adds the class to the matrix."
- **OQ-PRIV-3 → Resolved `AUDIT_SUBJECT_DELETION_EXEMPTION`:** PRIV-15 list = AuditEvent, LifecycleEvent (basis: AUD-1, AUD-4, AUD-6), ReconciliationRecord until expiry (basis: TXN-5, TXN-7). Legal hold is a suspension, not an exemption.
- **OQ-PRIV-4 → split:** format registered as above; residual narrowed `OQ-PRIV-4` deadline stays open.
- **OQ-PRIV-6 → Resolved `AUDITED_OPERATOR_PROCEDURE_FIRST`.**
- Dependent revisions required for implementation (not for registration): C11 (C-1, R-1), C34 (C-2), P05/P06 admission (C-3), C01 (executor capabilities, hold and request entities).

## 11. Acceptance tests

| Case | Setup | Expected |
| --- | --- | --- |
| PRIV-X-1 | Seed each implemented class past clock + 1 year; run executor | Rows deleted; report counts match; audit per batch |
| PRIV-X-2 | Same, with an active hold on one subject | Held rows remain; report shows skipped count; no error |
| PRIV-X-3 | Seed an ACTIVE-membership learner with 2-year-old sessions | Nothing deleted (clock not started) |
| PRIV-X-4 | Seed an OPEN ReconciliationRecord older than 1 year | Not deleted |
| PRIV-X-5 | Subject deletion of an offboarded identity | Credentials, sessions, tokens, invitations removed; Identity is DELETED tombstone; audit rows untouched; ledger entries written |
| PRIV-X-6 | Restore a pre-deletion backup into an isolated database; run ledger replay | Deleted subject absent before first request served |
| PRIV-X-7 | Attempt `UPDATE identity_identities SET status='DELETED'` from the application role | Rejected (until C-1 revision; afterwards rejected for every role except the executor) |
| PRIV-X-8 | Grep UI copy, privacy policy and DPA template for "anonymized", "purged", "permanently" | Zero matches outside approved definitions (PRIV-AC-10) |
| PRIV-X-9 | Run core paths with canary email/name; scan logs, provider_detail, analytics, CI artifacts | Zero canary matches (PRIV-AC-4) |
| PRIV-X-10 | org_admin attempts to place a legal hold via API | 403; no hold record |
| PRIV-X-11 | After subject deletion, search every table and column for the subject's identity ID | Found only in the tombstone, AuditEvent, LifecycleEvent and non-expired ReconciliationRecord rows (§4.2 L-1, L-6) |
| PRIV-X-12 | Seed canary name/email; delete the subject; scan every column of every table | Zero canary matches |
| PRIV-X-13 | Generate any aggregate report or count | Every reported group has at least 5 identities, otherwise suppressed |
| PRIV-X-14 | Run the executor 8 days after an export completes | Stored export bundle deleted; delivery record kept |
| PRIV-X-15 | Create a table whose record class is not in §4; seed rows older than 2 years; run the executor | Zero rows deleted from it; run report lists the class as UNKNOWN; any document claiming its retention fails PRIV-X-8 |

## 12. Definition of Done

1. Owner approves this document including C-1, C-2, C-3, R-1 choices (or states different ones).
2. C15 1.1.0 registered per §10 through SYS-21; inventory drops by exactly 4 (`OQ-PRIV-1/2/3/6`), `OQ-PRIV-4` row narrows, `OQ-PRIV-5` unchanged.
3. Implementation (separate work): executor, ledger, hold store, request lifecycle, dependent C11/C34 revisions, and PRIV-X-1…10 passing on an exact SHA. Until then PRIV-12 conformance is UNKNOWN.

## 13. Change log

| Version | Date | Change |
| --- | --- | --- |
| 0.1.0 | 2026-10-05 | Corrected owner draft into a per-class, per-field lifecycle matrix (issue #68). |
| 0.2.0 | 2026-10-05 | Revised on `6553eb4` (C15 still 1.0.3): read issue #68 and mapped its deliverables; added §4.2 residual-linkage evidence (L-1…L-7) and PRIV-X-11…14; narrowed-residual naming fixed (letter-suffixed IDs are not valid inventory IDs); owner chat approval recorded, registration pending #75. |
| 0.3.0 | 2026-10-05 | Audit corrections: PRIV-18 removed — the C15 value is written into PRIV-12 (no new ID, finding 1); an unregistered record class is now retention UNKNOWN with automatic deletion BLOCKED instead of a one-year default (finding 6), with §5 constraint 6 and PRIV-X-15; registration-form note added to §10. |
