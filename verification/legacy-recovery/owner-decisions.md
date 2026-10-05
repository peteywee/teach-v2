# Every unresolved owner decision

Consulted V2 main: `3fe92889aa55fa4a69d3b1e28c3a1211719b1b3f`. Live-source projection and proposal packet; recommendations are not approvals.

**61 unresolved contract questions / 18 explicitly blocking rows / 12 physical-shape placeholders / 71 candidate entries.** These inventories overlap. A nonblocking row can still block its dependent feature.

Five selected policy questions were registered separately through [issue #66](https://github.com/peteywee/teach-v2/issues/66): OQ-IDN-6, OQ-AUD-1, OQ-REL-1, OQ-REL-4, OQ-OBS-3. See [registration and review](../owner-decisions/2026-10-04/review.md). Runtime, deletion, analytics, provisioning and production remain gated.

## First review-ready selections

| ID | Proposed option | What it affects |
| --- | --- | --- |
| OQ-IDN-1 | ARGON2ID_19M_T2_P1 | IDN-5 |
| OQ-IDN-3 | ALL_SESSIONS_ON_CREDENTIAL_CHANGE | IDN-15 |
| OQ-IDN-4 | EXPLICIT_REAUTHENTICATED_LINKING | IDN-2 |
| OQ-TEN-1 | NORMALIZED_MULTI_ORGANIZATION_MULTI_LOCATION | TEN-15 |
| OQ-TEN-2 | EXPLICIT_VALIDATED_SCOPE_TUPLE | TEN-7 |
| OQ-TEN-3 | NO_CROSS_TENANT_GRANTS | — |
| OQ-AUTHZ-2 | NO_CROSS_TENANT_GRANTS | AUTHZ-20 |
| OQ-CNT-1 | SEMVER_SCHEMA_AND_PACK_IMMUTABLE_REFERENCES | CNT-2 |
| OQ-LRN-3 | PIN_EXISTING_HISTORY_TO_ASSIGNED_VERSION | — |
| OQ-MGR-1 | DIRECT_REPORTS_WITHIN_APPROVED_SCOPE | MGR-3 |
| OQ-CERT-1 | PRIVATE_AUTHENTICATED_SCOPED_VERIFICATION | CERT-13 |
| OQ-CERT-4 | NO_SELF_OBSERVATION | CERT-15 |

Exact capability matrix, privacy values and actual cookie/host selection remain unresolved. OQ-AUTHZ-1 records new V2 matrix direction only; no V1 grants are adopted. Sentry and Vercel Analytics remain recommendations; certification approvers remain UNKNOWN.

## Complete contract-question inventory

### C00

| ID | Blocking row | Exact unresolved question | Proposed choice or required input |
| --- | --- | --- | --- |
| OQ-SYS-1 | No | Does numeric order within a group (for example C11 before C12) define precedence, or are contracts within a group peers? | Keep contracts within each group as peers; record conflicts and apply the more restrictive requirement. |
| OQ-SYS-2 | No | Where does the compatibility register live, and in what format (Markdown table, machine-readable file checked in CI, or both)? | Propose governance/compatibility-register.json as canonical, with a generated Markdown view and CI; the current recovery map is reference evidence, not that approved register. |
| OQ-SYS-5 | No | Which parts of C11–C15 and C21–C23 are applicable to the learner demo? | Approve a demo applicability matrix covering Identity/session/tenant/capability, isolation, database/transactions/audit, content/learning and API/web. Release proof remains required for any shared deployment. |

### C02

| ID | Blocking row | Exact unresolved question | Proposed choice or required input |
| --- | --- | --- | --- |
| OQ-AGT-1 | No | Where are AutomationActor execution identities and their capability sets registered? | Use backend execution-principal records plus explicit capability assignments; no product actor is registered merely because a CI job exists. |
| OQ-AGT-2 | No | What is the first runtime-agent use case, if any, that would trigger the revision of this contract? | Keep deterministic paths first and runtime agents disabled; select a use case only through a dedicated C02 revision. |
| OQ-AGT-3 | No | Which existing jobs, workers, and CLI commands (for example `pnpm cli`) carry forward as AutomationActors? | Inventory and approve each legacy job/worker/CLI separately, with capability, scope, transaction/reconciliation and audit ownership. |

### C11

| ID | Blocking row | Exact unresolved question | Proposed choice or required input |
| --- | --- | --- | --- |
| OQ-IDN-1 | Yes | Which password hashing algorithm and parameters are approved? | Argon2id minimum m=19456 KiB, t=2, p=1, unique random salts and versioned encoded hashes; benchmark the approved backend before implementation. V1 bcrypt is reference only, with its explicit 72-byte guard. |
| OQ-IDN-3 | Yes | Which sessions does a credential change revoke: all sessions, all other sessions, or another policy? | Revoke every session for the Identity atomically with successful credential change and audit; require a new sign-in. This is a proposed owner choice, not current authority. |
| OQ-IDN-4 | Yes | What is the OAuth linking rule: verified-email match, explicit user-initiated linking only, or another rule? | Use existing verified provider-subject links; matching email alone cannot link or create a duplicate Identity. Linking to an existing Identity requires explicit user initiation and reauthentication. |
| OQ-IDN-7 | No | Must password-reset and invitation responses be indistinguishable for registered and unregistered emails? | Use indistinguishable accepted responses for known/unknown email, with bounded abuse controls and no existence disclosure. |

### C12

| ID | Blocking row | Exact unresolved question | Proposed choice or required input |
| --- | --- | --- | --- |
| OQ-SES-1 | Yes | Which `SameSite` value is approved: `Strict` or `Lax`? | Propose SameSite=Lax to support provider redirects, with the separately approved Origin/CSRF control; Secure and HttpOnly remain mandatory. |
| OQ-SES-2 | Yes | Which cookie domain and path are approved given the web and API hostnames? | Propose a same-origin web/API boundary with a host-only cookie and Path=/; exact hosts/proxy topology must be selected in Transport/hosting authority first. Do not silently reuse V1 .t34ch.com-wide trust. |
| OQ-SES-5 | Yes | Is `SameSite` alone the approved CSRF control, or is an additional mechanism (token, origin check) required? | Require a canonical allowed Origin for unsafe cookie-authenticated requests, including logout. Missing, foreign, malformed or null origins deny before writes. |
| OQ-SES-6 | Yes | On which events must the session credential rotate (sign-in, privilege change, other)? | Issue a fresh credential at successful sign-in and privilege elevation; never upgrade a pre-authentication credential. Implement rotation/revocation atomically. |
| OQ-SES-7 | No | Is there a limit on concurrent sessions per identity? | Propose no count limit initially; preserve expiry/revocation controls. A later limit needs explicit selection and deterministic eviction semantics. |

### C13

| ID | Blocking row | Exact unresolved question | Proposed choice or required input |
| --- | --- | --- | --- |
| OQ-TEN-1 | Yes | Does v2 start with the Gate A single-location compatibility membership or a normalized multi-organization, multi-location membership model? | Choose normalized multi-organization, multi-location membership rather than V1 single-location compatibility. Exact Membership/Location/grant shapes still require promotion and admission. |
| OQ-TEN-2 | Yes | How does a request select its scope when an identity holds more than one membership (explicit path segment, header validated against membership, other)? | Require explicit organization/location scope in the typed request, validated against current membership; reject zero, multiple or ambiguous selections. Transport encoding follows separate authority. |
| OQ-TEN-3 | No | Does v2 keep platform-operator cross-tenant access? Until decided, no role holds cross-tenant capability. | Keep platform cross-tenant access absent initially. Global Identity lifecycle authority in a multi-tenant model needs a separately reviewed scope/actor policy. |

### C14

| ID | Blocking row | Exact unresolved question | Proposed choice or required input |
| --- | --- | --- | --- |
| OQ-AUTHZ-1 | Yes | Is the Gate A capability vocabulary and bundle table (accepted 2026-07-22) adopted verbatim for v2, amended, or replaced? | Owner selected creation of a new V2 capability matrix, not recovery of V1 grants; issue #67 must propose the exact command/capability/bundle matrix before owner approval can resolve this question. |
| OQ-AUTHZ-2 | No | Which cross-tenant platform capabilities, if any, exist in v2, and what audit do they require? | Approve no cross-tenant platform grants initially; do not import V1 platform_operator grants or role aliases. |

### C15

| ID | Blocking row | Exact unresolved question | Proposed choice or required input |
| --- | --- | --- | --- |
| OQ-PRIV-1 | Yes | What exactly do deleted, anonymized, retained, and offboarded mean in Teach? | Propose offboarding as access revocation with retained history; require exact owner-approved meanings and field actions for deletion, anonymization and retention before implementing erasure. |
| OQ-PRIV-2 | Yes | What retention periods apply to each record class? | Owner must supply periods per Identity/Credential/session/token/membership/learning/certification/audit class and legal-hold handling. No unsupported universal duration is proposed. |
| OQ-PRIV-3 | Yes | Which record classes are exempt from deletion, and on what legal or audit basis? | Owner must name each deletion-exempt class, retained fields and legal/audit basis. No blanket audit exemption is inferred. |
| OQ-PRIV-4 | No | What export format and fulfillment deadline apply? | Propose machine-readable JSON plus a readable summary; owner must supply fulfillment deadline and identity/scope verification requirements. |
| OQ-PRIV-5 | No | What deletion fulfillment deadline applies? | Owner must supply a deletion deadline, verification standard and exception/hold response policy. |
| OQ-PRIV-6 | No | Can export and deletion be fulfilled by an operator procedure at first, rather than self-service? | Propose a verified, scoped and audited operator procedure initially, before self-service export/deletion UI. |

### C21

| ID | Blocking row | Exact unresolved question | Proposed choice or required input |
| --- | --- | --- | --- |
| OQ-MIG-3 | No | Will any browser-reachable database role exist in v2 (for example a hosted-auth client), making RLS tests applicable? | Propose no browser-reachable application tables. If hosted-auth roles exist, prove every application table remains backend-only; no implicit RLS exemption. |
| OQ-MIG-4 | No | Are production migrations applied by the deployment pipeline or by a manual, owner-approved step? | Propose a manual exact-candidate owner-approved production apply after existing backup/restore/recovery gates. Development CI cannot grant production permission. |
| OQ-MIG-5 | No | Will v2 import any data from the legacy Teach database, and if so through which governed, audited path? Until decided, MIG-7's production baseline is the v2 production schema only. | Keep legacy data import absent; a later import needs its own source snapshot, transformation, reconciliation, audit and rollback plan. Code lessons are not data migration. |

### C22

| ID | Blocking row | Exact unresolved question | Proposed choice or required input |
| --- | --- | --- | --- |
| OQ-TXN-2 | No | Which external providers are in scope for v2 (email delivery, OAuth, payments, other), and which owns reconciliation for each? | Propose email and OAuth first; select actual providers and per-effect reconciliation adapters explicitly. Payments stay disabled. |

### C23

| ID | Blocking row | Exact unresolved question | Proposed choice or required input |
| --- | --- | --- | --- |
| OQ-AUD-2 | No | For which entities must current state be reconstructable from lifecycle history? | Propose reconstructable lifecycle history for Identity, Membership, Assignment and Certification, with derived projections kept separate from canonical state. |
| OQ-AUD-3 | No | Which denial types are operationally significant enough to record? | Propose scoped records for capability/tenant/target violations and invalid/revoked credential abuse, with rate limits and redaction; avoid turning every validation typo into permanent audit. |

### C31

| ID | Blocking row | Exact unresolved question | Proposed choice or required input |
| --- | --- | --- | --- |
| OQ-CNT-1 | No | What versioning scheme applies to the schema and to packs (semver, integer, other)? | Propose strict SemVer 2.0 for schema and pack versions, immutable published content and exact version/digest references. Do not copy V1 version helper leading-zero acceptance. Physical ContentVersion binding remains a separate shape gate. |
| OQ-CNT-2 | No | Where are customer content approvals recorded, and who may record one? | Propose version/digest-bound approvals in Content-owned records, written only by an authorized customer approver; record actor/scope/time and required audit. |
| OQ-CNT-3 | No | Which legacy pack formats must v2 accept through adapters? | Recover only named legacy formats with fixtures, version validation, deterministic conversion and removal conditions; no permissive catch-all parser. |

### C32

| ID | Blocking row | Exact unresolved question | Proposed choice or required input |
| --- | --- | --- | --- |
| OQ-LRN-2 | No | How are mastery, XP, streak, and rank derived from events? | Keep XP/mastery/streak/rank unavailable until exact versioned derivation formulas and replay evidence are owner-approved; persisted completion does not imply scoring. |
| OQ-LRN-3 | No | When a pack gets a new version, does in-progress learner history carry over, restart, or stay pinned? | Existing sessions/history stay pinned to their assigned content version; new assignments use an explicitly selected new version without rewriting past evidence. |

### C33

| ID | Blocking row | Exact unresolved question | Proposed choice or required input |
| --- | --- | --- | --- |
| OQ-MGR-1 | Yes | Is manager visibility limited to direct reports, the whole location, or configurable? | Propose direct reports intersected with current organization/location scope; reporting relationships narrow visibility and never create capabilities. |
| OQ-MGR-2 | No | May managers offboard directly, or only request offboarding for an operator to approve? | Propose manager offboarding only with its dedicated capability and canonical Identity service; global/multi-tenant effects need explicit policy before grants. |

### C34

| ID | Blocking row | Exact unresolved question | Proposed choice or required input |
| --- | --- | --- | --- |
| OQ-CERT-1 | Yes | Is credential verification public (anyone with the link) or private (authenticated, scoped)? (Deferred by Gate A.) | Propose private, authenticated and scoped certification verification initially. A public link feature requires a separate approved disclosure model. |
| OQ-CERT-2 | Yes | Who approves certification criteria versions, and where is approval recorded? | Propose version/digest-bound criteria approvals in Certification-owned records, with designated authorized customer approvers and audit. |
| OQ-CERT-3 | No | What evidence types are acceptable (observation notes, checklist, photo, other)? | Propose structured checklist results and scoped observation notes first; photo uploads require separate storage/privacy/retention decisions. |
| OQ-CERT-4 | No | May an actor ever be both learner and observer for the same certification? | Propose learner and observer must be distinct Identities for the same certification. |
| OQ-CERT-5 | No | Do certifications expire, and if so how is expiry represented? | Propose no automatic expiry initially; if expiry is desired, owner must approve its representation, effects and history/revocation rules. |

### C41

| ID | Blocking row | Exact unresolved question | Proposed choice or required input |
| --- | --- | --- | --- |
| OQ-API-1 | Yes | Which routes are boundary exceptions outside `/api/v1`? | Prepare an exact exception list for health/readiness and necessary sign-in/provider-callback routes; all product operations use the approved versioned boundary. No routes are authorized by this proposal. |
| OQ-API-2 | No | What is the error envelope shape? | Propose a uniform code/message/requestId envelope and identical non-disclosing target denials; publish the exact schema before handlers/client code. |
| OQ-API-3 | No | What is the API versioning and deprecation policy? | Propose /api/v1 for core operations and an explicit major-version/deprecation manifest with owner-selected sunset periods. |

### C42

| ID | Blocking row | Exact unresolved question | Proposed choice or required input |
| --- | --- | --- | --- |
| OQ-WEB-1 | Yes | Which accessibility standard and level is approved (for example WCAG 2.2 AA)? | Propose WCAG 2.2 AA with keyboard/focus, screen-reader, contrast, touch-target and low-end-device evidence; automation supplements manual checks. |
| OQ-WEB-2 | No | Is the core-path list above complete for v2? | Confirm the complete path list: login, assigned-content start, recorded completion, scoped manager view and logout; credentialless demo isolation/reset remains separately specified. |

### C51

| ID | Blocking row | Exact unresolved question | Proposed choice or required input |
| --- | --- | --- | --- |
| OQ-EVD-1 | No | Which contracts are high-risk and require independent verification? | Propose independent verification for C11-C15, C21-C23 and C51-C52 plus protected cross-domain mutations; self-audit is never the independent reviewer. |
| OQ-EVD-2 | No | Where are evidence records stored and for how long? | Propose repo metadata plus SHA-bound CI artifacts; owner must choose artifact duration and durable archival. Current GitHub artifacts are not assumed permanent. |
| OQ-EVD-3 | No | How do these four evidence states map to the TOS truth states (verified, declared, inferred, unknown, conflicting, stale)? | Propose PROVEN only with current verified evidence, BLOCKED for unmet gates, UNKNOWN for insufficient/stale evidence, CONTRADICTORY for conflicting facts; declared/inferred never auto-promote to PROVEN. |

### C52

| ID | Blocking row | Exact unresolved question | Proposed choice or required input |
| --- | --- | --- | --- |
| OQ-REL-3 | No | What does the deployed smoke test cover? | Propose exact deployment/config/schema identity, health/readiness, role/scope denials, assigned-content start/completion, atomic audit and logout replay plus recovery checks. URL 200 alone is insufficient. |

### C53

| ID | Blocking row | Exact unresolved question | Proposed choice or required input |
| --- | --- | --- | --- |
| OQ-OBS-1 | No | Which error-capture and alerting providers are approved, and where do alerts go? | Owner must select error/alert providers and verified alert destinations; recover V1 redaction/correlation tests independently of provider choice. |
| OQ-OBS-2 | No | Which learner fields, if any, may appear in logs? | Propose no credential or learner payload content in logs; permit only approved correlation and pseudonymous operational identifiers with scope-aware access. |

### C61

| ID | Blocking row | Exact unresolved question | Proposed choice or required input |
| --- | --- | --- | --- |
| OQ-ANL-1 | No | Will analytics be enabled for v2, and with which provider? | Keep analytics disabled initially; provider/enablement is a later dedicated decision. |
| OQ-ANL-2 | No | Which identifying fields, if any, may analytics events carry? | Keep identifying learner fields absent; approve a minimum schema before enabling analytics. |

### C62

| ID | Blocking row | Exact unresolved question | Proposed choice or required input |
| --- | --- | --- | --- |
| OQ-PWA-1 | No | Will offline writes ever be authorized, and for which operations? | Keep offline writes unauthorized. V1 queued completion is useful historical evidence, but cannot establish V2 durable completion or offline permission. |

### C63

| ID | Blocking row | Exact unresolved question | Proposed choice or required input |
| --- | --- | --- | --- |
| OQ-BIL-1 | No | When, if ever, is self-service billing enabled for v2? | Keep self-service billing disabled initially. |
| OQ-BIL-2 | No | Which payment provider is approved (the source proposal names Stripe)? | Do not select a payment provider or permit money movement in the foundation batch. |
| OQ-BIL-3 | No | How does an Organization relate to its billing account (for example one-to-one, owned by the organization)? | Propose Organization-owned local billing-account relationship and read-only entitlement projection; exact cardinality/provider linkage requires owner-approved semantics. |

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
