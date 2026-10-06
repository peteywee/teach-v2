# Every unresolved owner decision

Consulted V2 main: `6553eb465e469dc9e60368cde40d259f86262997`. Live-source projection and proposal packet; recommendations are not approvals.

**9 unresolved contract questions / 1 explicitly blocking rows / 12 physical-shape placeholders / 71 candidate entries.** These inventories overlap. A nonblocking row can still block its dependent feature.

Five selected policy questions were registered separately through [issue #66](https://github.com/peteywee/teach-v2/issues/66): OQ-IDN-6, OQ-AUD-1, OQ-REL-1, OQ-REL-4, OQ-OBS-3. See [registration and review](../owner-decisions/2026-10-04/review.md). Runtime, deletion, analytics, provisioning and production remain gated.

## First review-ready selections

| ID | Proposed option | What it affects |
| --- | --- | --- |

Decision-closure r3.1 is registered under [issue #75](https://github.com/peteywee/teach-v2/issues/75). The V2 capability matrix, corrected privacy semantics, cookie topology and Sentry error selection are recorded; analytics remains disabled. Only the listed residual owner values remain open. OQ-CERT-2 remains the sole explicit contract-question blocker. Registration is not runtime, capability-promotion, schema-admission or production evidence.

## Complete contract-question inventory

### C15

| ID | Blocking row | Exact unresolved question | Proposed choice or required input |
| --- | --- | --- | --- |
| OQ-PRIV-4 | No | **Open — residual only.** What export fulfillment deadline applies? Owner, 2026-10-05: Export format is machine-readable JSON plus a human-readable summary. Only the export fulfillment deadline remains undecided. See `governance/decision-closure/03-c15-data-lifecycle-privacy-matrix.md`. (Decision-closure r3.1; partial registration) | **Open — residual only.** What export fulfillment deadline applies? Owner, 2026-10-05: Export format is machine-readable JSON plus a human-readable summary. Only the export fulfillment deadline remains undecided. See `governance/decision-closure/03-c15-data-lifecycle-privacy-matrix.md`. (Decision-closure r3.1; partial registration) |
| OQ-PRIV-5 | No | What deletion fulfillment deadline applies? | What deletion fulfillment deadline applies? |

### C22

| ID | Blocking row | Exact unresolved question | Proposed choice or required input |
| --- | --- | --- | --- |
| OQ-TXN-2 | No | **Open — residual only.** Which email delivery provider and OAuth provider(s) are approved? Owner, 2026-10-05: External-effect scope is email delivery and OAuth sign-in; payments remain DISABLED. TransactionControl owns ambiguous email-send reconciliation, and canonical provider readback MUST precede any retry. Failed OAuth exchange fails sign-in. Email and OAuth providers remain unselected: no provider adapter/delivery or mounted OAuth callback is authorized. See `governance/decision-closure/07-evidence-release-operations-spec.md`. (Decision-closure r3.1; partial registration) | **Open — residual only.** Which email delivery provider and OAuth provider(s) are approved? Owner, 2026-10-05: External-effect scope is email delivery and OAuth sign-in; payments remain DISABLED. TransactionControl owns ambiguous email-send reconciliation, and canonical provider readback MUST precede any retry. Failed OAuth exchange fails sign-in. Email and OAuth providers remain unselected: no provider adapter/delivery or mounted OAuth callback is authorized. See `governance/decision-closure/07-evidence-release-operations-spec.md`. (Decision-closure r3.1; partial registration) |

### C31

| ID | Blocking row | Exact unresolved question | Proposed choice or required input |
| --- | --- | --- | --- |
| OQ-CNT-2 | No | **Open — residual only.** Which customer content-approver role/title is approved? Owner, 2026-10-05: Customer-approval claims MUST be backed by a Content-owned append-only approval bound to content_pack_id, version and digest, recording authorized actor, organization scope, time and audit atomically. New versions inherit no approval; withdrawal is a new record. Approver role/title remains UNKNOWN, so no approval record or claim is authorized until selected. See `governance/decision-closure/09-governance-content-certification-web-packet.md`. (Decision-closure r3.1; partial registration) | **Open — residual only.** Which customer content-approver role/title is approved? Owner, 2026-10-05: Customer-approval claims MUST be backed by a Content-owned append-only approval bound to content_pack_id, version and digest, recording authorized actor, organization scope, time and audit atomically. New versions inherit no approval; withdrawal is a new record. Approver role/title remains UNKNOWN, so no approval record or claim is authorized until selected. See `governance/decision-closure/09-governance-content-certification-web-packet.md`. (Decision-closure r3.1; partial registration) |

### C34

| ID | Blocking row | Exact unresolved question | Proposed choice or required input |
| --- | --- | --- | --- |
| OQ-CERT-2 | Yes | Who approves certification criteria versions, and where is approval recorded? | Who approves certification criteria versions, and where is approval recorded? |

### C41

| ID | Blocking row | Exact unresolved question | Proposed choice or required input |
| --- | --- | --- | --- |
| OQ-API-3 | No | **Open — residual only.** Which API deprecation sunset periods are approved? Owner, 2026-10-05: Breaking consumer changes MUST use the major-version path `/api/v1` and an explicit deprecation manifest rather than in-place replacement. Sunset periods remain UNKNOWN; no deprecation sunset is authorized until owner selection. See `governance/decision-closure/05-api-boundary-manifest.md`. (Decision-closure r3.1; partial registration) | **Open — residual only.** Which API deprecation sunset periods are approved? Owner, 2026-10-05: Breaking consumer changes MUST use the major-version path `/api/v1` and an explicit deprecation manifest rather than in-place replacement. Sunset periods remain UNKNOWN; no deprecation sunset is authorized until owner selection. See `governance/decision-closure/05-api-boundary-manifest.md`. (Decision-closure r3.1; partial registration) |

### C51

| ID | Blocking row | Exact unresolved question | Proposed choice or required input |
| --- | --- | --- | --- |
| OQ-EVD-2 | No | **Open — residual only.** What evidence retention duration and durable content-addressed archive location are approved? Owner, 2026-10-05: Evidence uses repository metadata plus exact-SHA-bound content-addressed artifacts, digest-verified archive readback and explicit expiry. CI artifacts are not assumed permanent; retention duration and durable archive location remain UNKNOWN. See `governance/decision-closure/07-evidence-release-operations-spec.md`. (Decision-closure r3.1; partial registration) | **Open — residual only.** What evidence retention duration and durable content-addressed archive location are approved? Owner, 2026-10-05: Evidence uses repository metadata plus exact-SHA-bound content-addressed artifacts, digest-verified archive readback and explicit expiry. CI artifacts are not assumed permanent; retention duration and durable archive location remain UNKNOWN. See `governance/decision-closure/07-evidence-release-operations-spec.md`. (Decision-closure r3.1; partial registration) |

### C53

| ID | Blocking row | Exact unresolved question | Proposed choice or required input |
| --- | --- | --- | --- |
| OQ-OBS-1 | No | **Open — residual only.** Where must operational alerts be delivered? Owner, 2026-10-05: Sentry is selected for server errors with sendDefaultPii false and redaction of credential headers and request bodies; request ID tagging only. Vercel Analytics remains OFF under the disabled analytics policy. Alert destination remains UNKNOWN and the separate 90-day redacted-log sink evidence is still required. See `governance/decision-closure/07-evidence-release-operations-spec.md`. (Decision-closure r3.1; partial registration) | **Open — residual only.** Where must operational alerts be delivered? Owner, 2026-10-05: Sentry is selected for server errors with sendDefaultPii false and redaction of credential headers and request bodies; request ID tagging only. Vercel Analytics remains OFF under the disabled analytics policy. Alert destination remains UNKNOWN and the separate 90-day redacted-log sink evidence is still required. See `governance/decision-closure/07-evidence-release-operations-spec.md`. (Decision-closure r3.1; partial registration) |

### C63

| ID | Blocking row | Exact unresolved question | Proposed choice or required input |
| --- | --- | --- | --- |
| OQ-BIL-3 | No | **Open — residual only.** What Organization-to-billing-account cardinality is approved? Owner, 2026-10-05: Billing accounts are Organization-owned and entitlement is a read-only Organization-owned projection; the relationship requires separate C01 semantic registration. Organization-to-billing-account cardinality remains UNKNOWN; no billing-account creation is authorized while billing is disabled. See `governance/decision-closure/08-deferred-feature-policy-register.md`. (Decision-closure r3.1; partial registration) | **Open — residual only.** What Organization-to-billing-account cardinality is approved? Owner, 2026-10-05: Billing accounts are Organization-owned and entitlement is a read-only Organization-owned projection; the relationship requires separate C01 semantic registration. Organization-to-billing-account cardinality remains UNKNOWN; no billing-account creation is authorized while billing is disabled. See `governance/decision-closure/08-deferred-feature-policy-register.md`. (Decision-closure r3.1; partial registration) |

## Physical-shape placeholders

| ID | Owner | State | Gate |
| --- | --- | --- | --- |
| P06.shape_decision | Learning | UNKNOWN | #60 |
| P06.lifecycle_decision | Learning | UNKNOWN | #60 |
| P06.protected_scope_decision | Learning | UNKNOWN | #60 |
| P06.content_version_decision | Learning | UNKNOWN | #60 |
| P07.shape_decision | Certification | UNKNOWN | #63 |
| P07.lifecycle_decision | Certification | UNKNOWN | #63 |
| P07.protected_scope_decision | Certification | UNKNOWN | #63 |
| P07.content_version_decision | Certification | UNKNOWN | #63 |
| P08.shape_decision | Learning | UNKNOWN | #63 |
| P08.lifecycle_decision | Learning | UNKNOWN | #63 |
| P08.protected_scope_decision | Learning | UNKNOWN | #63 |
| P08.content_version_decision | Learning | UNKNOWN | #63 |

## Semantic candidates

Candidate is not approval. Every promotion requires the existing strict-nine authority and dependency evidence.

### kernel/decision-tables.json

- DT-001
- DT-002
- DT-003
- DT-004
- DT-005
- DT-006
- DT-007
- DT-008

### kernel/entities.json

- AuditEvent
- ContentBlock
- Entitlement
- LearnerState
- LifecycleEvent
- Location
- Membership

### kernel/events.json

- ApplicationSessionCreated
- ApplicationSessionRevoked
- CertificationIssued
- CertificationRevoked
- ContentAssigned
- LearningSessionCompleted
- LearningSessionStarted
- MembershipCreated
- MembershipDeactivated
- ProgressRecorded

### kernel/identifiers.json

- AuditEventId
- CapabilityId
- ContentBlockId
- EntitlementId
- LearnerStateId
- LifecycleEventId
- LocationId
- MembershipId

### kernel/invariants.json

- INV-001
- INV-002
- INV-003
- INV-004
- INV-005
- INV-006
- INV-007
- INV-008
- INV-009
- INV-010
- INV-011
- INV-012
- INV-013
- INV-014
- INV-015
- INV-016
- INV-017
- INV-018
- INV-019
- INV-020
- INV-021
- INV-022

### kernel/relationships.json

- ContentPackContainsContentBlock
- EntitlementBelongsToOrganization
- LearnerStateBelongsToIdentity
- LearnerStateTracksContentPack
- LifecycleEventReferencesIdentity
- LocationBelongsToOrganization
- MembershipLinksIdentityOrganization
- MembershipMayScopeLocation

### kernel/state-machines.json

- MembershipStateMachine

### kernel/states.json

- EvidenceState
- MembershipStatus

### kernel/values.json

- EmailAddress
- ContentVersion
- Timestamp
- RequestId
- IdempotencyKey

## Execution order and preserved authority

Owner selections → SYS-21 revisions → dependency-ready semantic promotions and Membership/Content/Audit admission → P06 ADMIT/BLOCK → authoritative Assignment and atomic Learning start → exact-source transport/runtime/demo evidence. #60 remains the sole P06 shape gate; #58 remains the atomic Learning-start gate.

P05 REQUIRED_ONE_ASSIGNMENT and ACTIVE→COMPLETED, verifier-only session storage, 12-hour absolute/30-minute idle expiry and 7-day/15-minute/1-hour Invitation/Setup/Reset validity remain binding. Organization owns Entitlement; C01 owns capability names and C14 their semantics. No draft/privacy/retention policy extends authentication validity. Existing immutable migrations, backend-only persistence and production-proof gates remain binding.

Global Identity lifecycle effects across memberships require an explicit actor/scope review. Sign-in/bootstrap must not depend on an already authenticated protected-command grant. Required audit storage and real authorization adapters remain absent. Self-audit is not independent review.
