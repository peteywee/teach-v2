# Teach V2 — preserved answers and implementation handoff

Captured 2026-10-05 America/Chicago against main `b45cde5202ebf137e9cc5aaa0647b88a9faddf86`.

All 66 original question IDs are included. **61 have a supplied response: 5 policies are registered and 56 responses remain available for reconciliation.** Five IDs have no entry in the supplied sheet; their existing proposals are preserved. “Response received” includes partial answers, recommendations, drafts and explicit unknowns. It does not mean every exact value was supplied.

## Reuse rules

Read this register before asking an owner question. Reuse the recorded answer and ask only for a specifically missing value, a real contradiction or a new changed requirement. An implementation blocker does not erase the answer. Keep receipt, registration, implementation and evidence statuses independent.

Original packet wording and its 99% labels are preserved as source claims, not verification. Security/legal/provider claims in the source are not independently revalidated by this capture. Five registrations remain authoritative as recorded in #66/PR #69. Other captured material is available for reconciliation without silently amending contracts.

Retain the original files and add dated amendments with stable OQ IDs and explicit supersession references. Do not overwrite earlier answers when a later value changes.

## Index

| ID | Answer record | Contract | Remaining work |
| --- | --- | --- | --- |
| [OQ-AGT-1](#oq-agt-1) | ANSWER_RECEIVED_UNREGISTERED / SUPPLIED_PACKET_RESPONSE | C02 | Reconcile supplied direction with controlling contract, prepare registration, then implement and verify the dependent workflow. No repeated request for the same supplied choice. |
| [OQ-AGT-2](#oq-agt-2) | ANSWER_RECEIVED_UNREGISTERED / SUPPLIED_PACKET_RESPONSE | C02 | Reconcile supplied direction with controlling contract, prepare registration, then implement and verify the dependent workflow. No repeated request for the same supplied choice. |
| [OQ-AGT-3](#oq-agt-3) | ANSWER_RECEIVED_UNREGISTERED / SUPPLIED_PACKET_RESPONSE | C02 | Reconcile supplied direction with controlling contract, prepare registration, then implement and verify the dependent workflow. No repeated request for the same supplied choice. |
| [OQ-ANL-1](#oq-anl-1) | ANSWER_RECEIVED_UNREGISTERED / SUPPLIED_PACKET_RESPONSE | C61 | Reconcile supplied direction with controlling contract, prepare registration, then implement and verify the dependent workflow. No repeated request for the same supplied choice. |
| [OQ-ANL-2](#oq-anl-2) | ANSWER_RECEIVED_UNREGISTERED / SUPPLIED_PACKET_RESPONSE | C61 | Reconcile supplied direction with controlling contract, prepare registration, then implement and verify the dependent workflow. No repeated request for the same supplied choice. |
| [OQ-API-1](#oq-api-1) | ANSWER_RECEIVED_UNREGISTERED / SOURCE_SCAN_PENDING_SELECTION | C41 | Exact path/method/owner/authentication exception list; zero implemented V2 routes at the registered scan. |
| [OQ-API-2](#oq-api-2) | ANSWER_RECEIVED_UNREGISTERED / SUPPLIED_PACKET_RESPONSE | C41 | Reconcile supplied direction with controlling contract, prepare registration, then implement and verify the dependent workflow. No repeated request for the same supplied choice. |
| [OQ-API-3](#oq-api-3) | ANSWER_RECEIVED_UNREGISTERED / SUPPLIED_PACKET_RESPONSE | C41 | Exact sunset periods and deprecation manifest. |
| [OQ-AUD-1](#oq-aud-1) | REGISTERED_POLICY / CONFIRMED | C23 | Retention clock/executor and proof while audit deletion stays blocked. |
| [OQ-AUD-2](#oq-aud-2) | ANSWER_RECEIVED_UNREGISTERED / SUPPLIED_PACKET_RESPONSE | C23 | Reconcile supplied direction with controlling contract, prepare registration, then implement and verify the dependent workflow. No repeated request for the same supplied choice. |
| [OQ-AUD-3](#oq-aud-3) | ANSWER_RECEIVED_UNREGISTERED / SUPPLIED_PACKET_RESPONSE | C23 | Reconcile supplied direction with controlling contract, prepare registration, then implement and verify the dependent workflow. No repeated request for the same supplied choice. |
| [OQ-AUTHZ-1](#oq-authz-1) | ANSWER_RECEIVED_UNREGISTERED / DIRECTION_RECORDED | C14 | Exact V2 command/capability/bundle/read/bootstrap/scope matrix, including denial cases (#67). |
| [OQ-AUTHZ-2](#oq-authz-2) | NO_SUPPLIED_ENTRY / EXISTING_RECOMMENDATION_ONLY | C14 | Original supplied sheet has no entry for this ID. Existing proposal is preserved below; it is not an owner answer. |
| [OQ-BIL-1](#oq-bil-1) | ANSWER_RECEIVED_UNREGISTERED / SUPPLIED_PACKET_RESPONSE | C63 | Reconcile supplied direction with controlling contract, prepare registration, then implement and verify the dependent workflow. No repeated request for the same supplied choice. |
| [OQ-BIL-2](#oq-bil-2) | ANSWER_RECEIVED_UNREGISTERED / SUPPLIED_PACKET_RESPONSE | C63 | Reconcile supplied direction with controlling contract, prepare registration, then implement and verify the dependent workflow. No repeated request for the same supplied choice. |
| [OQ-BIL-3](#oq-bil-3) | ANSWER_RECEIVED_UNREGISTERED / SUPPLIED_PACKET_RESPONSE | C63 | Exact billing cardinality and business linkage; billing remains disabled. |
| [OQ-CERT-1](#oq-cert-1) | ANSWER_RECEIVED_UNREGISTERED / SUPPLIED_PACKET_RESPONSE | C34 | Reconcile supplied direction with controlling contract, prepare registration, then implement and verify the dependent workflow. No repeated request for the same supplied choice. |
| [OQ-CERT-2](#oq-cert-2) | ANSWER_RECEIVED_UNREGISTERED / UNKNOWN | C34 | Designated approver role/title and approval-record ownership. |
| [OQ-CERT-3](#oq-cert-3) | ANSWER_RECEIVED_UNREGISTERED / SUPPLIED_PACKET_RESPONSE | C34 | Reconcile supplied direction with controlling contract, prepare registration, then implement and verify the dependent workflow. No repeated request for the same supplied choice. |
| [OQ-CERT-4](#oq-cert-4) | NO_SUPPLIED_ENTRY / EXISTING_RECOMMENDATION_ONLY | C34 | Original supplied sheet has no entry for this ID. Existing proposal is preserved below; it is not an owner answer. |
| [OQ-CERT-5](#oq-cert-5) | ANSWER_RECEIVED_UNREGISTERED / SUPPLIED_PACKET_RESPONSE | C34 | Reconcile supplied direction with controlling contract, prepare registration, then implement and verify the dependent workflow. No repeated request for the same supplied choice. |
| [OQ-CNT-1](#oq-cnt-1) | NO_SUPPLIED_ENTRY / EXISTING_RECOMMENDATION_ONLY | C31 | Original supplied sheet has no entry for this ID. Existing proposal is preserved below; it is not an owner answer. |
| [OQ-CNT-2](#oq-cnt-2) | ANSWER_RECEIVED_UNREGISTERED / SUPPLIED_PACKET_RESPONSE | C31 | Content-criteria approver identity and CNT-1 versioning dependency. |
| [OQ-CNT-3](#oq-cnt-3) | ANSWER_RECEIVED_UNREGISTERED / SUPPLIED_PACKET_RESPONSE | C31 | Exact allowed import formats plus negative fixtures. |
| [OQ-EVD-1](#oq-evd-1) | ANSWER_RECEIVED_UNREGISTERED / SUPPLIED_PACKET_RESPONSE | C51 | Reconcile supplied direction with controlling contract, prepare registration, then implement and verify the dependent workflow. No repeated request for the same supplied choice. |
| [OQ-EVD-2](#oq-evd-2) | ANSWER_RECEIVED_UNREGISTERED / SUPPLIED_PACKET_RESPONSE | C51 | Evidence retention duration and durable archival mechanism beyond expiring CI artifacts. |
| [OQ-EVD-3](#oq-evd-3) | ANSWER_RECEIVED_UNREGISTERED / SUPPLIED_PACKET_RESPONSE | C51 | Reconcile supplied direction with controlling contract, prepare registration, then implement and verify the dependent workflow. No repeated request for the same supplied choice. |
| [OQ-IDN-1](#oq-idn-1) | ANSWER_RECEIVED_UNREGISTERED / SUPPLIED_PACKET_RESPONSE | C11 | Register supplied Argon2id parameters after authority review and backend performance/security validation. |
| [OQ-IDN-3](#oq-idn-3) | ANSWER_RECEIVED_UNREGISTERED / SUPPLIED_PACKET_RESPONSE | C11 | Reconcile supplied direction with controlling contract, prepare registration, then implement and verify the dependent workflow. No repeated request for the same supplied choice. |
| [OQ-IDN-4](#oq-idn-4) | ANSWER_RECEIVED_UNREGISTERED / SUPPLIED_PACKET_RESPONSE | C11 | Reconcile supplied direction with controlling contract, prepare registration, then implement and verify the dependent workflow. No repeated request for the same supplied choice. |
| [OQ-IDN-6](#oq-idn-6) | REGISTERED_POLICY / CONFIRMED | C11 | PIN hashing, attempt/reset semantics, reset authority and runtime proof; selected parameters already captured. |
| [OQ-IDN-7](#oq-idn-7) | ANSWER_RECEIVED_UNREGISTERED / SUPPLIED_PACKET_RESPONSE | C11 | Reconcile supplied direction with controlling contract, prepare registration, then implement and verify the dependent workflow. No repeated request for the same supplied choice. |
| [OQ-LRN-2](#oq-lrn-2) | ANSWER_RECEIVED_UNREGISTERED / SUPPLIED_PACKET_RESPONSE | C32 | Reconcile supplied direction with controlling contract, prepare registration, then implement and verify the dependent workflow. No repeated request for the same supplied choice. |
| [OQ-LRN-3](#oq-lrn-3) | NO_SUPPLIED_ENTRY / EXISTING_RECOMMENDATION_ONLY | C32 | Original supplied sheet has no entry for this ID. Existing proposal is preserved below; it is not an owner answer. |
| [OQ-MGR-1](#oq-mgr-1) | ANSWER_RECEIVED_UNREGISTERED / SUPPLIED_PACKET_RESPONSE | C33 | Reconcile supplied direction with controlling contract, prepare registration, then implement and verify the dependent workflow. No repeated request for the same supplied choice. |
| [OQ-MGR-2](#oq-mgr-2) | ANSWER_RECEIVED_UNREGISTERED / SUPPLIED_PACKET_RESPONSE | C33 | Reconcile supplied direction with controlling contract, prepare registration, then implement and verify the dependent workflow. No repeated request for the same supplied choice. |
| [OQ-MIG-3](#oq-mig-3) | ANSWER_RECEIVED_UNREGISTERED / SUPPLIED_PACKET_RESPONSE | C21 | Reconcile supplied direction with controlling contract, prepare registration, then implement and verify the dependent workflow. No repeated request for the same supplied choice. |
| [OQ-MIG-4](#oq-mig-4) | ANSWER_RECEIVED_UNREGISTERED / SUPPLIED_PACKET_RESPONSE | C21 | Reconcile supplied direction with controlling contract, prepare registration, then implement and verify the dependent workflow. No repeated request for the same supplied choice. |
| [OQ-MIG-5](#oq-mig-5) | ANSWER_RECEIVED_UNREGISTERED / SUPPLIED_PACKET_RESPONSE | C21 | Reconcile supplied direction with controlling contract, prepare registration, then implement and verify the dependent workflow. No repeated request for the same supplied choice. |
| [OQ-OBS-1](#oq-obs-1) | ANSWER_RECEIVED_UNREGISTERED / RECOMMENDED | C53 | Provider/alert-destination selection; reconcile recommended Analytics with ANL-1 disabled direction; cost and provider limits require current verification. |
| [OQ-OBS-2](#oq-obs-2) | ANSWER_RECEIVED_UNREGISTERED / SUPPLIED_PACKET_RESPONSE | C53 | Reconcile supplied direction with controlling contract, prepare registration, then implement and verify the dependent workflow. No repeated request for the same supplied choice. |
| [OQ-OBS-3](#oq-obs-3) | REGISTERED_POLICY / CONFIRMED | C53 | Redacted storage/archive mechanism and evidence for 90-day retention. |
| [OQ-PRIV-1](#oq-priv-1) | ANSWER_RECEIVED_UNREGISTERED / DRAFT_FOR_REVIEW | C15 | Per-field and dependent-copy deletion/anonymization actions; address the recorded hashing finding (#68). |
| [OQ-PRIV-2](#oq-priv-2) | ANSWER_RECEIVED_UNREGISTERED / DRAFT_FOR_REVIEW | C15 | Retention start clocks, legal-hold authority, executor and dependent/archive-copy behavior (#68). |
| [OQ-PRIV-3](#oq-priv-3) | ANSWER_RECEIVED_UNREGISTERED / DRAFT_FOR_REVIEW | C15 | Exact exemption basis and interaction with audit expiry and holds (#68). |
| [OQ-PRIV-4](#oq-priv-4) | ANSWER_RECEIVED_UNREGISTERED / SUPPLIED_PACKET_RESPONSE | C15 | Export response deadline; format direction is already captured. |
| [OQ-PRIV-5](#oq-priv-5) | ANSWER_RECEIVED_UNREGISTERED / SUPPLIED_PACKET_RESPONSE | C15 | Deletion response/completion deadline. |
| [OQ-PRIV-6](#oq-priv-6) | ANSWER_RECEIVED_UNREGISTERED / SUPPLIED_PACKET_RESPONSE | C15 | Reconcile supplied direction with controlling contract, prepare registration, then implement and verify the dependent workflow. No repeated request for the same supplied choice. |
| [OQ-PWA-1](#oq-pwa-1) | ANSWER_RECEIVED_UNREGISTERED / SUPPLIED_PACKET_RESPONSE | C62 | Reconcile supplied direction with controlling contract, prepare registration, then implement and verify the dependent workflow. No repeated request for the same supplied choice. |
| [OQ-REL-1](#oq-rel-1) | REGISTERED_POLICY / CONFIRMED | C52 | Actual Supabase/Vercel project identities and deployment proof. |
| [OQ-REL-3](#oq-rel-3) | ANSWER_RECEIVED_UNREGISTERED / SUPPLIED_PACKET_RESPONSE | C52 | Reconcile supplied direction with controlling contract, prepare registration, then implement and verify the dependent workflow. No repeated request for the same supplied choice. |
| [OQ-REL-4](#oq-rel-4) | REGISTERED_POLICY / CONFIRMED | C52 | Migration compatibility and previous-candidate rollback evidence for the selected 24-hour window. |
| [OQ-SES-1](#oq-ses-1) | ANSWER_RECEIVED_UNREGISTERED / RECOMMENDED | C12 | Register supplied SameSite direction together with transport and CSRF proof. |
| [OQ-SES-2](#oq-ses-2) | ANSWER_RECEIVED_UNREGISTERED / RECOMMENDED | C12 | Register exact supplied topology and cookie settings; prove host/transport behavior. |
| [OQ-SES-5](#oq-ses-5) | ANSWER_RECEIVED_UNREGISTERED / SUPPLIED_PACKET_RESPONSE | C12 | Reconcile supplied direction with controlling contract, prepare registration, then implement and verify the dependent workflow. No repeated request for the same supplied choice. |
| [OQ-SES-6](#oq-ses-6) | ANSWER_RECEIVED_UNREGISTERED / SUPPLIED_PACKET_RESPONSE | C12 | Reconcile supplied direction with controlling contract, prepare registration, then implement and verify the dependent workflow. No repeated request for the same supplied choice. |
| [OQ-SES-7](#oq-ses-7) | ANSWER_RECEIVED_UNREGISTERED / SUPPLIED_PACKET_RESPONSE | C12 | Reconcile supplied direction with controlling contract, prepare registration, then implement and verify the dependent workflow. No repeated request for the same supplied choice. |
| [OQ-SYS-1](#oq-sys-1) | ANSWER_RECEIVED_UNREGISTERED / SUPPLIED_PACKET_RESPONSE | C00 | Reconcile supplied direction with controlling contract, prepare registration, then implement and verify the dependent workflow. No repeated request for the same supplied choice. |
| [OQ-SYS-2](#oq-sys-2) | ANSWER_RECEIVED_UNREGISTERED / SUPPLIED_PACKET_RESPONSE | C00 | Canonical register path and generator implementation; preserve source/evidence distinctions. |
| [OQ-SYS-5](#oq-sys-5) | ANSWER_RECEIVED_UNREGISTERED / SUPPLIED_PACKET_RESPONSE | C00 | Exact demo applicability matrix and its authority registration. |
| [OQ-TEN-1](#oq-ten-1) | ANSWER_RECEIVED_UNREGISTERED / SUPPLIED_PACKET_RESPONSE | C13 | Reconcile supplied direction with controlling contract, prepare registration, then implement and verify the dependent workflow. No repeated request for the same supplied choice. |
| [OQ-TEN-2](#oq-ten-2) | ANSWER_RECEIVED_UNREGISTERED / SUPPLIED_PACKET_RESPONSE | C13 | Reconcile supplied direction with controlling contract, prepare registration, then implement and verify the dependent workflow. No repeated request for the same supplied choice. |
| [OQ-TEN-3](#oq-ten-3) | NO_SUPPLIED_ENTRY / EXISTING_RECOMMENDATION_ONLY | C13 | Original supplied sheet has no entry for this ID. Existing proposal is preserved below; it is not an owner answer. |
| [OQ-TXN-2](#oq-txn-2) | ANSWER_RECEIVED_UNREGISTERED / SUPPLIED_PACKET_RESPONSE | C22 | Exact email/OAuth providers and operation-specific failure/reconciliation policy. |
| [OQ-WEB-1](#oq-web-1) | ANSWER_RECEIVED_UNREGISTERED / SUPPLIED_PACKET_RESPONSE | C42 | Reconcile supplied direction with controlling contract, prepare registration, then implement and verify the dependent workflow. No repeated request for the same supplied choice. |
| [OQ-WEB-2](#oq-web-2) | ANSWER_RECEIVED_UNREGISTERED / SUPPLIED_PACKET_RESPONSE | C42 | Reconcile supplied direction with controlling contract, prepare registration, then implement and verify the dependent workflow. No repeated request for the same supplied choice. |

## Full records

### OQ-AGT-1

**Question:** Where are AutomationActor execution identities and their capability sets registered?

Contract: `contracts/c02-automation-agent-authority-contract.md` • affects `AGT-9`

Answer status: **ANSWER_RECEIVED_UNREGISTERED**. Detail: `SUPPLIED_PACKET_RESPONSE`.

Supplied sheet ([source](sources/supplied-answer-sheet.md), line 53):

> Backend principals + explicit caps. 99%. CI jobs are not product actors; conflating them is a privilege-escalation risk.

Remaining work:

- Reconcile supplied direction with controlling contract, prepare registration, then implement and verify the dependent workflow. No repeated request for the same supplied choice.

Next action: Reuse supplied answer; perform remaining reconciliation/proposal work before claiming contract closure.

### OQ-AGT-2

**Question:** What is the first runtime-agent use case, if any, that would trigger the revision of this contract?

Contract: `contracts/c02-automation-agent-authority-contract.md` • affects `AGT-16`

Answer status: **ANSWER_RECEIVED_UNREGISTERED**. Detail: `SUPPLIED_PACKET_RESPONSE`.

Supplied sheet ([source](sources/supplied-answer-sheet.md), line 54):

> Keep disabled. 99%. Runtime agents are a major attack surface. No enablement without specific use case + dedicated C02 revision.

Remaining work:

- Reconcile supplied direction with controlling contract, prepare registration, then implement and verify the dependent workflow. No repeated request for the same supplied choice.

Next action: Reuse supplied answer; perform remaining reconciliation/proposal work before claiming contract closure.

### OQ-AGT-3

**Question:** Which existing jobs, workers, and CLI commands (for example `pnpm cli`) carry forward as AutomationActors?

Contract: `contracts/c02-automation-agent-authority-contract.md` • affects `—`

Answer status: **ANSWER_RECEIVED_UNREGISTERED**. Detail: `SUPPLIED_PACKET_RESPONSE`.

Supplied sheet ([source](sources/supplied-answer-sheet.md), line 55):

> Inventory each separately. 99%. Blanket grandfathering violates least privilege.

Remaining work:

- Reconcile supplied direction with controlling contract, prepare registration, then implement and verify the dependent workflow. No repeated request for the same supplied choice.

Next action: Reuse supplied answer; perform remaining reconciliation/proposal work before claiming contract closure.

### OQ-ANL-1

**Question:** Will analytics be enabled for v2, and with which provider?

Contract: `contracts/c61-analytics-contract.md` • affects `—`

Answer status: **ANSWER_RECEIVED_UNREGISTERED**. Detail: `SUPPLIED_PACKET_RESPONSE`.

Supplied sheet ([source](sources/supplied-answer-sheet.md), line 133):

> Disabled initially. 99%. Adds privacy scope; enable later with explicit decision.

Remaining work:

- Reconcile supplied direction with controlling contract, prepare registration, then implement and verify the dependent workflow. No repeated request for the same supplied choice.

Next action: Reuse supplied answer; perform remaining reconciliation/proposal work before claiming contract closure.

### OQ-ANL-2

**Question:** Which identifying fields, if any, may analytics events carry?

Contract: `contracts/c61-analytics-contract.md` • affects `ANL-7`

Answer status: **ANSWER_RECEIVED_UNREGISTERED**. Detail: `SUPPLIED_PACKET_RESPONSE`.

Supplied sheet ([source](sources/supplied-answer-sheet.md), line 134):

> No identifying fields. 99%. If enabled later, start minimal.

Remaining work:

- Reconcile supplied direction with controlling contract, prepare registration, then implement and verify the dependent workflow. No repeated request for the same supplied choice.

Next action: Reuse supplied answer; perform remaining reconciliation/proposal work before claiming contract closure.

### OQ-API-1

**Question:** Which routes are boundary exceptions outside `/api/v1`?

Contract: `contracts/c41-api-boundary-contract.md` • affects `—`

Answer status: **ANSWER_RECEIVED_UNREGISTERED**. Detail: `SOURCE_SCAN_PENDING_SELECTION`.

Supplied sheet ([source](sources/supplied-answer-sheet.md), line 39):

> Health/readiness + auth callbacks as exceptions; all product ops under /api/v1: 99% on principle. Exact list requires implementation knowledge I don't have. No routes authorized by principle alone.

Follow-up ([source](sources/follow-up-answers.md), item 10):

> OQ-API-1 — I'll scan the codebase for routes now.

Remaining work:

- Exact path/method/owner/authentication exception list; zero implemented V2 routes at the registered scan.

Next action: Reuse supplied answer; perform remaining reconciliation/proposal work before claiming contract closure.

### OQ-API-2

**Question:** What is the error envelope shape?

Contract: `contracts/c41-api-boundary-contract.md` • affects `API-10`

Answer status: **ANSWER_RECEIVED_UNREGISTERED**. Detail: `SUPPLIED_PACKET_RESPONSE`.

Supplied sheet ([source](sources/supplied-answer-sheet.md), line 107):

> Uniform code/message/requestId; identical non-disclosing denials. 99%. Prevents information leakage via inconsistent errors; aids debugging.

Remaining work:

- Reconcile supplied direction with controlling contract, prepare registration, then implement and verify the dependent workflow. No repeated request for the same supplied choice.

Next action: Reuse supplied answer; perform remaining reconciliation/proposal work before claiming contract closure.

### OQ-API-3

**Question:** What is the API versioning and deprecation policy?

Contract: `contracts/c41-api-boundary-contract.md` • affects `API-13`

Answer status: **ANSWER_RECEIVED_UNREGISTERED**. Detail: `SUPPLIED_PACKET_RESPONSE`.

Supplied sheet ([source](sources/supplied-answer-sheet.md), line 108):

> /api/v1 + deprecation manifest with your sunset periods. 99%. Industry standard.

Remaining work:

- Exact sunset periods and deprecation manifest.

Next action: Reuse supplied answer; perform remaining reconciliation/proposal work before claiming contract closure.

### OQ-AUD-1

**Question:** Resolved: one-year audit retention; fixed central policy with no tenant overrides. Audit deletion remains BLOCKED.

Contract: `contracts/c23-audit-lifecycle-events-contract.md` • affects `—`

Answer status: **REGISTERED_POLICY**. Detail: `CONFIRMED`.

Supplied sheet ([source](sources/supplied-answer-sheet.md), line 31):

> Fixed central policy, no tenant overrides, deletion blocked: 99% on principle. Tenant-configurable retention lets a tenant delete evidence of their own misconduct. Duration requires your input (legal requirement dependent).

Follow-up ([source](sources/follow-up-answers.md), item 3):

> OQ-AUD-1 — 1 year retention. Fixed central policy, no tenant overrides. Audit deletion blocked.

Registered value:

```json
{
  "duration": 1,
  "unit": "year",
  "policy": "fixed-central",
  "tenant_overrides": false,
  "deletion_authorized": false
}
```

Remaining work:

- Retention clock/executor and proof while audit deletion stays blocked.

Next action: Reuse registered value; implement only when dependencies/admission authorize it and collect evidence.

### OQ-AUD-2

**Question:** For which entities must current state be reconstructable from lifecycle history?

Contract: `contracts/c23-audit-lifecycle-events-contract.md` • affects `AUD-7`

Answer status: **ANSWER_RECEIVED_UNREGISTERED**. Detail: `SUPPLIED_PACKET_RESPONSE`.

Supplied sheet ([source](sources/supplied-answer-sheet.md), line 84):

> Identity, Membership, Assignment, Certification reconstructable. 99%. Lifecycle-significant entities; supports audit and debugging. Projections stay separate from canonical state.

Remaining work:

- Reconcile supplied direction with controlling contract, prepare registration, then implement and verify the dependent workflow. No repeated request for the same supplied choice.

Next action: Reuse supplied answer; perform remaining reconciliation/proposal work before claiming contract closure.

### OQ-AUD-3

**Question:** Which denial types are operationally significant enough to record?

Contract: `contracts/c23-audit-lifecycle-events-contract.md` • affects `AUD-8`

Answer status: **ANSWER_RECEIVED_UNREGISTERED**. Detail: `SUPPLIED_PACKET_RESPONSE`.

Supplied sheet ([source](sources/supplied-answer-sheet.md), line 85):

> Scoped denials (capability/tenant/target/credential abuse) with rate limits. 99%. Auditing every validation typo creates noise and cost.

Remaining work:

- Reconcile supplied direction with controlling contract, prepare registration, then implement and verify the dependent workflow. No repeated request for the same supplied choice.

Next action: Reuse supplied answer; perform remaining reconciliation/proposal work before claiming contract closure.

### OQ-AUTHZ-1

**Question:** Is the Gate A capability vocabulary and bundle table (accepted 2026-07-22) adopted verbatim for v2, amended, or replaced?

Contract: `contracts/c14-authorization-capabilities-contract.md` • affects `AUTHZ-19`

Answer status: **ANSWER_RECEIVED_UNREGISTERED**. Detail: `DIRECTION_RECORDED`.

Supplied sheet ([source](sources/supplied-answer-sheet.md), line 23):

> Cannot answer at 99%. Requires the capability/command/bundle matrix to be proposed first. I do not have V1's Gate A vocabulary or the V2 amendments. Any answer I give would be invention. Blocked until the matrix exists.

Follow-up ([source](sources/follow-up-answers.md), item 1):

> OQ-AUTHZ-1 — Create new capability matrix (not recover V1). I'll draft this as a separate work item.

Remaining work:

- Exact V2 command/capability/bundle/read/bootstrap/scope matrix, including denial cases (#67).

Next action: Reuse supplied answer; perform remaining reconciliation/proposal work before claiming contract closure.

### OQ-AUTHZ-2

**Question:** Which cross-tenant platform capabilities, if any, exist in v2, and what audit do they require?

Contract: `contracts/c14-authorization-capabilities-contract.md` • affects `AUTHZ-20`

Answer status: **NO_SUPPLIED_ENTRY**. Detail: `EXISTING_RECOMMENDATION_ONLY`.

Existing proposal, preserved separately: Approve no cross-tenant platform grants initially; do not import V1 platform_operator grants or role aliases.

Remaining work:

- Original supplied sheet has no entry for this ID. Existing proposal is preserved below; it is not an owner answer.

Next action: Prepare the preserved recommendation with its exact impact for an eventual targeted owner selection.

### OQ-BIL-1

**Question:** When, if ever, is self-service billing enabled for v2?

Contract: `contracts/c63-billing-contract.md` • affects `—`

Answer status: **ANSWER_RECEIVED_UNREGISTERED**. Detail: `SUPPLIED_PACKET_RESPONSE`.

Supplied sheet ([source](sources/supplied-answer-sheet.md), line 142):

> Disabled. 99%. Out of foundation scope.

Remaining work:

- Reconcile supplied direction with controlling contract, prepare registration, then implement and verify the dependent workflow. No repeated request for the same supplied choice.

Next action: Reuse supplied answer; perform remaining reconciliation/proposal work before claiming contract closure.

### OQ-BIL-2

**Question:** Which payment provider is approved (the source proposal names Stripe)?

Contract: `contracts/c63-billing-contract.md` • affects `BIL-12`

Answer status: **ANSWER_RECEIVED_UNREGISTERED**. Detail: `SUPPLIED_PACKET_RESPONSE`.

Supplied sheet ([source](sources/supplied-answer-sheet.md), line 143):

> No provider selection. 99%. Don't move money in foundation batch.

Remaining work:

- Reconcile supplied direction with controlling contract, prepare registration, then implement and verify the dependent workflow. No repeated request for the same supplied choice.

Next action: Reuse supplied answer; perform remaining reconciliation/proposal work before claiming contract closure.

### OQ-BIL-3

**Question:** How does an Organization relate to its billing account (for example one-to-one, owned by the organization)?

Contract: `contracts/c63-billing-contract.md` • affects `BIL-13`

Answer status: **ANSWER_RECEIVED_UNREGISTERED**. Detail: `SUPPLIED_PACKET_RESPONSE`.

Supplied sheet ([source](sources/supplied-answer-sheet.md), line 144):

> Org-owned, read-only entitlement projection: 99% on model. Cardinality requires your business input.

Remaining work:

- Exact billing cardinality and business linkage; billing remains disabled.

Next action: Reuse supplied answer; perform remaining reconciliation/proposal work before claiming contract closure.

### OQ-CERT-1

**Question:** Is credential verification public (anyone with the link) or private (authenticated, scoped)? (Deferred by Gate A.)

Contract: `contracts/c34-certification-credentials-contract.md` • affects `CERT-13`

Answer status: **ANSWER_RECEIVED_UNREGISTERED**. Detail: `SUPPLIED_PACKET_RESPONSE`.

Supplied sheet ([source](sources/supplied-answer-sheet.md), line 35):

> Private, authenticated, scoped. 99%. Public links enable enumeration (sequential ID probing) and privacy violations. A public feature needs its own disclosure model later.

Remaining work:

- Reconcile supplied direction with controlling contract, prepare registration, then implement and verify the dependent workflow. No repeated request for the same supplied choice.

Next action: Reuse supplied answer; perform remaining reconciliation/proposal work before claiming contract closure.

### OQ-CERT-2

**Question:** Who approves certification criteria versions, and where is approval recorded?

Contract: `contracts/c34-certification-credentials-contract.md` • affects `CERT-4`

Answer status: **ANSWER_RECEIVED_UNREGISTERED**. Detail: `UNKNOWN`.

Supplied sheet ([source](sources/supplied-answer-sheet.md), line 37):

> Version/digest-bound, designated approvers, audit: 99% on mechanism. Approver identity requires your input. I can specify how approval works, not who approves.

Follow-up ([source](sources/follow-up-answers.md), item 8):

> OQ-CERT-2 — Unknown. Flagged for follow-up. When you know who approves certification criteria (role/title), I'll record it.

Remaining work:

- Designated approver role/title and approval-record ownership.

Next action: Reuse supplied answer; perform remaining reconciliation/proposal work before claiming contract closure.

### OQ-CERT-3

**Question:** What evidence types are acceptable (observation notes, checklist, photo, other)?

Contract: `contracts/c34-certification-credentials-contract.md` • affects `CERT-7`

Answer status: **ANSWER_RECEIVED_UNREGISTERED**. Detail: `SUPPLIED_PACKET_RESPONSE`.

Supplied sheet ([source](sources/supplied-answer-sheet.md), line 102):

> Checklists + observation notes first. 99%. Photos add storage/privacy/retention complexity — separate decision.

Remaining work:

- Reconcile supplied direction with controlling contract, prepare registration, then implement and verify the dependent workflow. No repeated request for the same supplied choice.

Next action: Reuse supplied answer; perform remaining reconciliation/proposal work before claiming contract closure.

### OQ-CERT-4

**Question:** May an actor ever be both learner and observer for the same certification?

Contract: `contracts/c34-certification-credentials-contract.md` • affects `CERT-15`

Answer status: **NO_SUPPLIED_ENTRY**. Detail: `EXISTING_RECOMMENDATION_ONLY`.

Existing proposal, preserved separately: Propose learner and observer must be distinct Identities for the same certification.

Remaining work:

- Original supplied sheet has no entry for this ID. Existing proposal is preserved below; it is not an owner answer.

Next action: Prepare the preserved recommendation with its exact impact for an eventual targeted owner selection.

### OQ-CERT-5

**Question:** Do certifications expire, and if so how is expiry represented?

Contract: `contracts/c34-certification-credentials-contract.md` • affects `—`

Answer status: **ANSWER_RECEIVED_UNREGISTERED**. Detail: `SUPPLIED_PACKET_RESPONSE`.

Supplied sheet ([source](sources/supplied-answer-sheet.md), line 103):

> No auto-expiry. 99%. Don't invent expiry semantics. If desired, you must define representation, effects, and history rules.

Remaining work:

- Reconcile supplied direction with controlling contract, prepare registration, then implement and verify the dependent workflow. No repeated request for the same supplied choice.

Next action: Reuse supplied answer; perform remaining reconciliation/proposal work before claiming contract closure.

### OQ-CNT-1

**Question:** What versioning scheme applies to the schema and to packs (semver, integer, other)?

Contract: `contracts/c31-content-teaching-engine-contract.md` • affects `CNT-2`

Answer status: **NO_SUPPLIED_ENTRY**. Detail: `EXISTING_RECOMMENDATION_ONLY`.

Existing proposal, preserved separately: Propose strict SemVer 2.0 for schema and pack versions, immutable published content and exact version/digest references. Do not copy V1 version helper leading-zero acceptance. Physical ContentVersion binding remains a separate shape gate.

Remaining work:

- Original supplied sheet has no entry for this ID. Existing proposal is preserved below; it is not an owner answer.

Next action: Prepare the preserved recommendation with its exact impact for an eventual targeted owner selection.

### OQ-CNT-2

**Question:** Where are customer content approvals recorded, and who may record one?

Contract: `contracts/c31-content-teaching-engine-contract.md` • affects `CNT-11`

Answer status: **ANSWER_RECEIVED_UNREGISTERED**. Detail: `SUPPLIED_PACKET_RESPONSE`.

Supplied sheet ([source](sources/supplied-answer-sheet.md), line 89):

> Version/digest-bound, authorized approver, actor/scope/time/audit: 99% on mechanism. Approver identity requires your input. Dependency: requires CNT-1 versioning defined first.

Remaining work:

- Content-criteria approver identity and CNT-1 versioning dependency.

Next action: Reuse supplied answer; perform remaining reconciliation/proposal work before claiming contract closure.

### OQ-CNT-3

**Question:** Which legacy pack formats must v2 accept through adapters?

Contract: `contracts/c31-content-teaching-engine-contract.md` • affects `—`

Answer status: **ANSWER_RECEIVED_UNREGISTERED**. Detail: `SUPPLIED_PACKET_RESPONSE`.

Supplied sheet ([source](sources/supplied-answer-sheet.md), line 90):

> Named formats only with fixtures. 99%. Permissive parsers risk billion-laughs, zip bombs, and encoding attacks.

Remaining work:

- Exact allowed import formats plus negative fixtures.

Next action: Reuse supplied answer; perform remaining reconciliation/proposal work before claiming contract closure.

### OQ-EVD-1

**Question:** Which contracts are high-risk and require independent verification?

Contract: `contracts/c51-verification-evidence-contract.md` • affects `EVD-16`

Answer status: **ANSWER_RECEIVED_UNREGISTERED**. Detail: `SUPPLIED_PACKET_RESPONSE`.

Supplied sheet ([source](sources/supplied-answer-sheet.md), line 116):

> C11–C15, C21–C23, C51–C52 + cross-domain mutations. 99%. Security-critical and foundation contracts warrant independent verification. Self-audit is never independent.

Remaining work:

- Reconcile supplied direction with controlling contract, prepare registration, then implement and verify the dependent workflow. No repeated request for the same supplied choice.

Next action: Reuse supplied answer; perform remaining reconciliation/proposal work before claiming contract closure.

### OQ-EVD-2

**Question:** Where are evidence records stored and for how long?

Contract: `contracts/c51-verification-evidence-contract.md` • affects `—`

Answer status: **ANSWER_RECEIVED_UNREGISTERED**. Detail: `SUPPLIED_PACKET_RESPONSE`.

Supplied sheet ([source](sources/supplied-answer-sheet.md), line 117):

> Repo + SHA-bound artifacts: 99% on principle. Duration requires your input. Critical gap: GitHub artifacts expire. Need durable content-addressed archival, not just "you choose duration."

Remaining work:

- Evidence retention duration and durable archival mechanism beyond expiring CI artifacts.

Next action: Reuse supplied answer; perform remaining reconciliation/proposal work before claiming contract closure.

### OQ-EVD-3

**Question:** How do these four evidence states map to the TOS truth states (verified, declared, inferred, unknown, conflicting, stale)?

Contract: `contracts/c51-verification-evidence-contract.md` • affects `—`

Answer status: **ANSWER_RECEIVED_UNREGISTERED**. Detail: `SUPPLIED_PACKET_RESPONSE`.

Supplied sheet ([source](sources/supplied-answer-sheet.md), line 118):

> PROVEN/BLOCKED/UNKNOWN/CONTRADICTORY mapping. 99%. Prevents "declared" being mistaken for "proven." Declared/inferred never auto-promote.

Remaining work:

- Reconcile supplied direction with controlling contract, prepare registration, then implement and verify the dependent workflow. No repeated request for the same supplied choice.

Next action: Reuse supplied answer; perform remaining reconciliation/proposal work before claiming contract closure.

### OQ-IDN-1

**Question:** Which password hashing algorithm and parameters are approved?

Contract: `contracts/c11-identity-credentials-contract.md` • affects `IDN-5`

Answer status: **ANSWER_RECEIVED_UNREGISTERED**. Detail: `SUPPLIED_PACKET_RESPONSE`.

Supplied sheet ([source](sources/supplied-answer-sheet.md), line 5):

> Argon2id, m=19456, t=2, p=1. 99%. OWASP Password Storage Cheat Sheet recommendation. RFC 9106 parameters for interactive logins. V1 bcrypt's 72-byte limit is a known truncation vulnerability.

Remaining work:

- Register supplied Argon2id parameters after authority review and backend performance/security validation.

Next action: Reuse supplied answer; perform remaining reconciliation/proposal work before claiming contract closure.

### OQ-IDN-3

**Question:** Which sessions does a credential change revoke: all sessions, all other sessions, or another policy?

Contract: `contracts/c11-identity-credentials-contract.md` • affects `IDN-15`

Answer status: **ANSWER_RECEIVED_UNREGISTERED**. Detail: `SUPPLIED_PACKET_RESPONSE`.

Supplied sheet ([source](sources/supplied-answer-sheet.md), line 7):

> Revoke ALL sessions. 99%. If the credential is compromised, the current session may be the attacker's. "All other" leaves the breach active. The re-login friction is the security property working.

Remaining work:

- Reconcile supplied direction with controlling contract, prepare registration, then implement and verify the dependent workflow. No repeated request for the same supplied choice.

Next action: Reuse supplied answer; perform remaining reconciliation/proposal work before claiming contract closure.

### OQ-IDN-4

**Question:** What is the OAuth linking rule: verified-email match, explicit user-initiated linking only, or another rule?

Contract: `contracts/c11-identity-credentials-contract.md` • affects `IDN-2`

Answer status: **ANSWER_RECEIVED_UNREGISTERED**. Detail: `SUPPLIED_PACKET_RESPONSE`.

Supplied sheet ([source](sources/supplied-answer-sheet.md), line 9):

> Explicit reauthenticated linking. 99%. Email-match linking enables account takeover via domain/plus-address control. Industry standard (Google, GitHub) requires explicit initiation + reauthentication.

Remaining work:

- Reconcile supplied direction with controlling contract, prepare registration, then implement and verify the dependent workflow. No repeated request for the same supplied choice.

Next action: Reuse supplied answer; perform remaining reconciliation/proposal work before claiming contract closure.

### OQ-IDN-6

**Question:** Resolved: PIN parameters selected as 6 digits, 5 attempts, 15-minute lock. PIN authentication remains unavailable until implementation and all applicable authentication gates pass.

Contract: `contracts/c11-identity-credentials-contract.md` • affects `—`

Answer status: **REGISTERED_POLICY**. Detail: `CONFIRMED`.

Supplied sheet ([source](sources/supplied-answer-sheet.md), line 59):

> Keep PIN unavailable. 99%. Cannot invent length/lockout/reset values — these are security parameters requiring your approval.

Follow-up ([source](sources/follow-up-answers.md), item 9):

> OQ-IDN-6 — 6-digit PIN, 5 attempts, 15-minute lock. Recorded. PIN auth stays unavailable until implementation.

Registered value:

```json
{
  "pin_digits": 6,
  "attempts": 5,
  "lock_minutes": 15,
  "authentication_available": false
}
```

Remaining work:

- PIN hashing, attempt/reset semantics, reset authority and runtime proof; selected parameters already captured.

Next action: Reuse registered value; implement only when dependencies/admission authorize it and collect evidence.

### OQ-IDN-7

**Question:** Must password-reset and invitation responses be indistinguishable for registered and unregistered emails?

Contract: `contracts/c11-identity-credentials-contract.md` • affects `—`

Answer status: **ANSWER_RECEIVED_UNREGISTERED**. Detail: `SUPPLIED_PACKET_RESPONSE`.

Supplied sheet ([source](sources/supplied-answer-sheet.md), line 60):

> Indistinguishable responses. 99%. Existence disclosure enables user enumeration. Standard control.

Remaining work:

- Reconcile supplied direction with controlling contract, prepare registration, then implement and verify the dependent workflow. No repeated request for the same supplied choice.

Next action: Reuse supplied answer; perform remaining reconciliation/proposal work before claiming contract closure.

### OQ-LRN-2

**Question:** How are mastery, XP, streak, and rank derived from events?

Contract: `contracts/c32-learning-sessions-progress-contract.md` • affects `LRN-13`

Answer status: **ANSWER_RECEIVED_UNREGISTERED**. Detail: `SUPPLIED_PACKET_RESPONSE`.

Supplied sheet ([source](sources/supplied-answer-sheet.md), line 94):

> Keep unavailable. 99%. Cannot score without approved formulas. Flag: verify LearningSession field set before implementation — if it persists XP, this becomes blocking despite the "non-blocking" label.

Remaining work:

- Reconcile supplied direction with controlling contract, prepare registration, then implement and verify the dependent workflow. No repeated request for the same supplied choice.

Next action: Reuse supplied answer; perform remaining reconciliation/proposal work before claiming contract closure.

### OQ-LRN-3

**Question:** When a pack gets a new version, does in-progress learner history carry over, restart, or stay pinned?

Contract: `contracts/c32-learning-sessions-progress-contract.md` • affects `—`

Answer status: **NO_SUPPLIED_ENTRY**. Detail: `EXISTING_RECOMMENDATION_ONLY`.

Existing proposal, preserved separately: Existing sessions/history stay pinned to their assigned content version; new assignments use an explicitly selected new version without rewriting past evidence.

Remaining work:

- Original supplied sheet has no entry for this ID. Existing proposal is preserved below; it is not an owner answer.

Next action: Prepare the preserved recommendation with its exact impact for an eventual targeted owner selection.

### OQ-MGR-1

**Question:** Is manager visibility limited to direct reports, the whole location, or configurable?

Contract: `contracts/c33-manager-operations-contract.md` • affects `MGR-3`

Answer status: **ANSWER_RECEIVED_UNREGISTERED**. Detail: `SUPPLIED_PACKET_RESPONSE`.

Supplied sheet ([source](sources/supplied-answer-sheet.md), line 33):

> Direct reports ∩ org/location scope. 99%. Least privilege. "Whole location" gives visibility into non-reports. "Configurable" adds complexity without a use case. Reporting narrows, never expands.

Remaining work:

- Reconcile supplied direction with controlling contract, prepare registration, then implement and verify the dependent workflow. No repeated request for the same supplied choice.

Next action: Reuse supplied answer; perform remaining reconciliation/proposal work before claiming contract closure.

### OQ-MGR-2

**Question:** May managers offboard directly, or only request offboarding for an operator to approve?

Contract: `contracts/c33-manager-operations-contract.md` • affects `—`

Answer status: **ANSWER_RECEIVED_UNREGISTERED**. Detail: `SUPPLIED_PACKET_RESPONSE`.

Supplied sheet ([source](sources/supplied-answer-sheet.md), line 98):

> Dedicated capability + canonical Identity service. 99%. Offboarding is destructive; single path prevents inconsistencies. Global effects need separate policy.

Remaining work:

- Reconcile supplied direction with controlling contract, prepare registration, then implement and verify the dependent workflow. No repeated request for the same supplied choice.

Next action: Reuse supplied answer; perform remaining reconciliation/proposal work before claiming contract closure.

### OQ-MIG-3

**Question:** Will any browser-reachable database role exist in v2 (for example a hosted-auth client), making RLS tests applicable?

Contract: `contracts/c21-database-migration-contract.md` • affects `MIG-12`

Answer status: **ANSWER_RECEIVED_UNREGISTERED**. Detail: `SUPPLIED_PACKET_RESPONSE`.

Supplied sheet ([source](sources/supplied-answer-sheet.md), line 74):

> No browser tables. 99%. Browser-reachable DB is an attack surface; backend-only is the secure architecture.

Remaining work:

- Reconcile supplied direction with controlling contract, prepare registration, then implement and verify the dependent workflow. No repeated request for the same supplied choice.

Next action: Reuse supplied answer; perform remaining reconciliation/proposal work before claiming contract closure.

### OQ-MIG-4

**Question:** Are production migrations applied by the deployment pipeline or by a manual, owner-approved step?

Contract: `contracts/c21-database-migration-contract.md` • affects `—`

Answer status: **ANSWER_RECEIVED_UNREGISTERED**. Detail: `SUPPLIED_PACKET_RESPONSE`.

Supplied sheet ([source](sources/supplied-answer-sheet.md), line 75):

> Manual owner-approved apply. 99%. CI cannot grant production permission. Needs backup/restore verification by a human.

Remaining work:

- Reconcile supplied direction with controlling contract, prepare registration, then implement and verify the dependent workflow. No repeated request for the same supplied choice.

Next action: Reuse supplied answer; perform remaining reconciliation/proposal work before claiming contract closure.

### OQ-MIG-5

**Question:** Will v2 import any data from the legacy Teach database, and if so through which governed, audited path? Until decided, MIG-7's production baseline is the v2 production schema only.

Contract: `contracts/c21-database-migration-contract.md` • affects `—`

Answer status: **ANSWER_RECEIVED_UNREGISTERED**. Detail: `SUPPLIED_PACKET_RESPONSE`.

Supplied sheet ([source](sources/supplied-answer-sheet.md), line 76):

> Keep absent. 99%. Data import is a separate project with its own risks. Don't bundle with foundation.

Remaining work:

- Reconcile supplied direction with controlling contract, prepare registration, then implement and verify the dependent workflow. No repeated request for the same supplied choice.

Next action: Reuse supplied answer; perform remaining reconciliation/proposal work before claiming contract closure.

### OQ-OBS-1

**Question:** Which error-capture and alerting providers are approved, and where do alerts go?

Contract: `contracts/c53-observability-contract.md` • affects `OBS-2`

Answer status: **ANSWER_RECEIVED_UNREGISTERED**. Detail: `RECOMMENDED`.

Supplied sheet ([source](sources/supplied-answer-sheet.md), line 127):

> Requires your input. Provider depends on cost, features, existing contracts.

Follow-up ([source](sources/follow-up-answers.md), item 6):

> OQ-OBS-1 — My recommendation: Sentry for error tracking (free tier 5k errors/month, excellent Vercel integration). Use Vercel's built-in Analytics for basic traffic. Datadog is overkill for foundation. Total cost: $0 to start.

Remaining work:

- Provider/alert-destination selection; reconcile recommended Analytics with ANL-1 disabled direction; cost and provider limits require current verification.

Next action: Reuse supplied answer; perform remaining reconciliation/proposal work before claiming contract closure.

### OQ-OBS-2

**Question:** Which learner fields, if any, may appear in logs?

Contract: `contracts/c53-observability-contract.md` • affects `OBS-7`

Answer status: **ANSWER_RECEIVED_UNREGISTERED**. Detail: `SUPPLIED_PACKET_RESPONSE`.

Supplied sheet ([source](sources/supplied-answer-sheet.md), line 128):

> No credential/payload in logs; only approved correlation/pseudonymous IDs. 99%. Logs are often less protected than DBs; leakage is a breach.

Remaining work:

- Reconcile supplied direction with controlling contract, prepare registration, then implement and verify the dependent workflow. No repeated request for the same supplied choice.

Next action: Reuse supplied answer; perform remaining reconciliation/proposal work before claiming contract closure.

### OQ-OBS-3

**Question:** Resolved: operational logs retained for 90 days, separately from the one-year canonical audit-retention policy. Provider/archival mechanism proof remains UNKNOWN.

Contract: `contracts/c53-observability-contract.md` • affects `—`

Answer status: **REGISTERED_POLICY**. Detail: `CONFIRMED`.

Supplied sheet ([source](sources/supplied-answer-sheet.md), line 129):

> Requires your input. Depends on compliance and cost, separate from audit retention.

Follow-up ([source](sources/follow-up-answers.md), item 7):

> OQ-OBS-3 — 90 days log retention. Separate from audit retention (1 year).

Registered value:

```json
{
  "duration": 90,
  "unit": "days",
  "store_kind": "operational-log",
  "canonical_audit_policy_separate": true
}
```

Remaining work:

- Redacted storage/archive mechanism and evidence for 90-day retention.

Next action: Reuse registered value; implement only when dependencies/admission authorize it and collect evidence.

### OQ-PRIV-1

**Question:** What exactly do deleted, anonymized, retained, and offboarded mean in Teach?

Contract: `contracts/c15-data-isolation-privacy-contract.md` • affects `—`

Answer status: **ANSWER_RECEIVED_UNREGISTERED**. Detail: `DRAFT_FOR_REVIEW`.

Supplied sheet ([source](sources/supplied-answer-sheet.md), line 25):

> Cannot define at 99%. "Deleted," "anonymized," "retained" have legal meanings under GDPR/CCPA/Texas DPR. I propose offboarding = access revocation + retained history as a starting point, but deletion/anonymization field-actions require your explicit definitions (with legal counsel if applicable). I will not invent legal semantics.

Follow-up ([source](sources/follow-up-answers.md), item 2):

> OQ-PRIV-1/2/3 — Conservative defaults (option b). Drafting below for your review:
> 
> - Deletion = hard delete from database. Anonymization = PII replaced with irreversible hash. Retention = keep as-is. Offboarding = revoke access, retain history.
> - Retention: 1 year for all record classes (Identity, Credential, session, token, membership, learning, certification, audit). Legal hold suspends deletion.
> - Exemptions: Audit records only (per AUD-1). No blanket exemptions. Legal hold is a suspension, not an exemption.

Remaining work:

- Per-field and dependent-copy deletion/anonymization actions; address the recorded hashing finding (#68).

Next action: Reuse supplied answer; perform remaining reconciliation/proposal work before claiming contract closure.

### OQ-PRIV-2

**Question:** What retention periods apply to each record class?

Contract: `contracts/c15-data-isolation-privacy-contract.md` • affects `PRIV-12`

Answer status: **ANSWER_RECEIVED_UNREGISTERED**. Detail: `DRAFT_FOR_REVIEW`.

Supplied sheet ([source](sources/supplied-answer-sheet.md), line 27):

> Cannot specify at 99%. Periods depend on legal requirements (vary by data type/jurisdiction), business needs, and risk tolerance. No universal duration is defensible. Requires your input.

Follow-up ([source](sources/follow-up-answers.md), item 2):

> OQ-PRIV-1/2/3 — Conservative defaults (option b). Drafting below for your review:
> 
> - Deletion = hard delete from database. Anonymization = PII replaced with irreversible hash. Retention = keep as-is. Offboarding = revoke access, retain history.
> - Retention: 1 year for all record classes (Identity, Credential, session, token, membership, learning, certification, audit). Legal hold suspends deletion.
> - Exemptions: Audit records only (per AUD-1). No blanket exemptions. Legal hold is a suspension, not an exemption.

Remaining work:

- Retention start clocks, legal-hold authority, executor and dependent/archive-copy behavior (#68).

Next action: Reuse supplied answer; perform remaining reconciliation/proposal work before claiming contract closure.

### OQ-PRIV-3

**Question:** Which record classes are exempt from deletion, and on what legal or audit basis?

Contract: `contracts/c15-data-isolation-privacy-contract.md` • affects `PRIV-15`

Answer status: **ANSWER_RECEIVED_UNREGISTERED**. Detail: `DRAFT_FOR_REVIEW`.

Supplied sheet ([source](sources/supplied-answer-sheet.md), line 29):

> Cannot name at 99%. Requires knowing applicable laws and audit requirements. I will not infer a blanket audit exemption — that's how indefinite retention happens by default.

Follow-up ([source](sources/follow-up-answers.md), item 2):

> OQ-PRIV-1/2/3 — Conservative defaults (option b). Drafting below for your review:
> 
> - Deletion = hard delete from database. Anonymization = PII replaced with irreversible hash. Retention = keep as-is. Offboarding = revoke access, retain history.
> - Retention: 1 year for all record classes (Identity, Credential, session, token, membership, learning, certification, audit). Legal hold suspends deletion.
> - Exemptions: Audit records only (per AUD-1). No blanket exemptions. Legal hold is a suspension, not an exemption.

Remaining work:

- Exact exemption basis and interaction with audit expiry and holds (#68).

Next action: Reuse supplied answer; perform remaining reconciliation/proposal work before claiming contract closure.

### OQ-PRIV-4

**Question:** What export format and fulfillment deadline apply?

Contract: `contracts/c15-data-isolation-privacy-contract.md` • affects `—`

Answer status: **ANSWER_RECEIVED_UNREGISTERED**. Detail: `SUPPLIED_PACKET_RESPONSE`.

Supplied sheet ([source](sources/supplied-answer-sheet.md), line 68):

> JSON + readable summary: 99% on format. Deadline requires your input (operational decision).

Remaining work:

- Export response deadline; format direction is already captured.

Next action: Reuse supplied answer; perform remaining reconciliation/proposal work before claiming contract closure.

### OQ-PRIV-5

**Question:** What deletion fulfillment deadline applies?

Contract: `contracts/c15-data-isolation-privacy-contract.md` • affects `—`

Answer status: **ANSWER_RECEIVED_UNREGISTERED**. Detail: `SUPPLIED_PACKET_RESPONSE`.

Supplied sheet ([source](sources/supplied-answer-sheet.md), line 69):

> Requires your input. Deletion deadline has legal implications I cannot determine.

Remaining work:

- Deletion response/completion deadline.

Next action: Reuse supplied answer; perform remaining reconciliation/proposal work before claiming contract closure.

### OQ-PRIV-6

**Question:** Can export and deletion be fulfilled by an operator procedure at first, rather than self-service?

Contract: `contracts/c15-data-isolation-privacy-contract.md` • affects `—`

Answer status: **ANSWER_RECEIVED_UNREGISTERED**. Detail: `SUPPLIED_PACKET_RESPONSE`.

Supplied sheet ([source](sources/supplied-answer-sheet.md), line 70):

> Operator procedure first. 99%. Self-service deletion needs verification, scope, and audit UI — complex. Operator procedure is simpler and more controllable.

Remaining work:

- Reconcile supplied direction with controlling contract, prepare registration, then implement and verify the dependent workflow. No repeated request for the same supplied choice.

Next action: Reuse supplied answer; perform remaining reconciliation/proposal work before claiming contract closure.

### OQ-PWA-1

**Question:** Will offline writes ever be authorized, and for which operations?

Contract: `contracts/c62-pwa-offline-contract.md` • affects `PWA-5`

Answer status: **ANSWER_RECEIVED_UNREGISTERED**. Detail: `SUPPLIED_PACKET_RESPONSE`.

Supplied sheet ([source](sources/supplied-answer-sheet.md), line 138):

> No offline writes. 99%. Conflict resolution complexity; V1 queue is historical evidence, not V2 permission.

Remaining work:

- Reconcile supplied direction with controlling contract, prepare registration, then implement and verify the dependent workflow. No repeated request for the same supplied choice.

Next action: Reuse supplied answer; perform remaining reconciliation/proposal work before claiming contract closure.

### OQ-REL-1

**Question:** Resolved: Supabase PostgreSQL for the database and Vercel for web/API hosting. This does not approve a project, hostname, plan, provider authorization model or deployment.

Contract: `contracts/c52-deployment-release-recovery-contract.md` • affects `—`

Answer status: **REGISTERED_POLICY**. Detail: `CONFIRMED`.

Follow-up ([source](sources/follow-up-answers.md), item 4):

> OQ-REL-1 — Supabase (Postgres) + Vercel. Confirmed.

Registered value:

```json
{
  "database": "Supabase PostgreSQL",
  "web_api": "Vercel"
}
```

Remaining work:

- Actual Supabase/Vercel project identities and deployment proof.

Next action: Reuse registered value; implement only when dependencies/admission authorize it and collect evidence.

### OQ-REL-3

**Question:** What does the deployed smoke test cover?

Contract: `contracts/c52-deployment-release-recovery-contract.md` • affects `REL-8`

Answer status: **ANSWER_RECEIVED_UNREGISTERED**. Detail: `SUPPLIED_PACKET_RESPONSE`.

Supplied sheet ([source](sources/supplied-answer-sheet.md), line 122):

> Comprehensive smoke (deployment/config/schema, health, denials, start/completion, audit, logout, recovery). 99%. URL 200 alone proves nothing.

Remaining work:

- Reconcile supplied direction with controlling contract, prepare registration, then implement and verify the dependent workflow. No repeated request for the same supplied choice.

Next action: Reuse supplied answer; perform remaining reconciliation/proposal work before claiming contract closure.

### OQ-REL-4

**Question:** Resolved: rollback to the prior candidate is supported for 24 hours after deployment/promotion; migrations remain backward-compatible during that full window.

Contract: `contracts/c52-deployment-release-recovery-contract.md` • affects `—`

Answer status: **REGISTERED_POLICY**. Detail: `CONFIRMED`.

Supplied sheet ([source](sources/supplied-answer-sheet.md), line 123):

> Requires your input. Window depends on data compatibility and business risk tolerance.

Follow-up ([source](sources/follow-up-answers.md), item 5):

> OQ-REL-4 — 24-hour rollback window. Migrations must be backward-compatible for 24h post-deploy.

Registered value:

```json
{
  "rollback_window_hours": 24,
  "migration_backward_compatibility_hours": 24
}
```

Remaining work:

- Migration compatibility and previous-candidate rollback evidence for the selected 24-hour window.

Next action: Reuse registered value; implement only when dependencies/admission authorize it and collect evidence.

### OQ-SES-1

**Question:** Which `SameSite` value is approved: `Strict` or `Lax`?

Contract: `contracts/c12-application-sessions-contract.md` • affects `SES-5`

Answer status: **ANSWER_RECEIVED_UNREGISTERED**. Detail: `RECOMMENDED`.

Supplied sheet ([source](sources/supplied-answer-sheet.md), line 11):

> SameSite=Lax. 99%. Strict breaks OAuth redirect flows (IdP returns cross-site). Lax permits top-level GET redirects while blocking CSRF POSTs. SES-5's origin check closes the remaining gap.

Follow-up ([source](sources/follow-up-answers.md), item 11):

> OQ-SES-2 — Derived from Vercel hosting:
> 
> - Recommended: Same-origin. Web at `https://t34ch.com`, API at `https://t34ch.com/api/*`.
> - Cookie: Host-only (no `Domain` attribute), `Path=/`, `Secure`, `HttpOnly`, `SameSite=Lax`.
> - Rationale: Same-origin eliminates CORS complexity and cookie cross-domain issues. The API boundary is path-based (`/api/v1/*`), not subdomain-based. If you later need `api.t34ch.com`, that's a separate decision with CORS implications.
> 
> Scanning for API routes now.

Remaining work:

- Register supplied SameSite direction together with transport and CSRF proof.

Next action: Reuse supplied answer; perform remaining reconciliation/proposal work before claiming contract closure.

### OQ-SES-2

**Question:** Which cookie domain and path are approved given the web and API hostnames?

Contract: `contracts/c12-application-sessions-contract.md` • affects `SES-6`

Answer status: **ANSWER_RECEIVED_UNREGISTERED**. Detail: `RECOMMENDED`.

Supplied sheet ([source](sources/supplied-answer-sheet.md), line 13):

> Host-only, Path=/, same-origin. 99% on principle. Blocked on REL-1 for exact hosts — I cannot specify domains without the hosting topology. The principle is non-negotiable; the values await your REL-1 decision.

Follow-up ([source](sources/follow-up-answers.md), item 11):

> OQ-SES-2 — Derived from Vercel hosting:
> 
> - Recommended: Same-origin. Web at `https://t34ch.com`, API at `https://t34ch.com/api/*`.
> - Cookie: Host-only (no `Domain` attribute), `Path=/`, `Secure`, `HttpOnly`, `SameSite=Lax`.
> - Rationale: Same-origin eliminates CORS complexity and cookie cross-domain issues. The API boundary is path-based (`/api/v1/*`), not subdomain-based. If you later need `api.t34ch.com`, that's a separate decision with CORS implications.
> 
> Scanning for API routes now.

Remaining work:

- Register exact supplied topology and cookie settings; prove host/transport behavior.

Next action: Reuse supplied answer; perform remaining reconciliation/proposal work before claiming contract closure.

### OQ-SES-5

**Question:** Is `SameSite` alone the approved CSRF control, or is an additional mechanism (token, origin check) required?

Contract: `contracts/c12-application-sessions-contract.md` • affects `SES-18`

Answer status: **ANSWER_RECEIVED_UNREGISTERED**. Detail: `SUPPLIED_PACKET_RESPONSE`.

Supplied sheet ([source](sources/supplied-answer-sheet.md), line 15):

> Require origin check, deny on missing/foreign/malformed/null. 99%. Lax alone doesn't stop all CSRF (top-level GET side effects, legacy browsers). Fail-closed is the only safe default.

Remaining work:

- Reconcile supplied direction with controlling contract, prepare registration, then implement and verify the dependent workflow. No repeated request for the same supplied choice.

Next action: Reuse supplied answer; perform remaining reconciliation/proposal work before claiming contract closure.

### OQ-SES-6

**Question:** On which events must the session credential rotate (sign-in, privilege change, other)?

Contract: `contracts/c12-application-sessions-contract.md` • affects `SES-19`

Answer status: **ANSWER_RECEIVED_UNREGISTERED**. Detail: `SUPPLIED_PACKET_RESPONSE`.

Supplied sheet ([source](sources/supplied-answer-sheet.md), line 17):

> Rotate at sign-in and privilege elevation; never upgrade pre-auth credential. 99%. Defeats session fixation (planted pre-auth ID) and privilege escalation via session upgrade. Atomic rotation/revocation prevents TOCTOU.

Remaining work:

- Reconcile supplied direction with controlling contract, prepare registration, then implement and verify the dependent workflow. No repeated request for the same supplied choice.

Next action: Reuse supplied answer; perform remaining reconciliation/proposal work before claiming contract closure.

### OQ-SES-7

**Question:** Is there a limit on concurrent sessions per identity?

Contract: `contracts/c12-application-sessions-contract.md` • affects `—`

Answer status: **ANSWER_RECEIVED_UNREGISTERED**. Detail: `SUPPLIED_PACKET_RESPONSE`.

Supplied sheet ([source](sources/supplied-answer-sheet.md), line 64):

> No limit initially. 99%. With SES-6 rotation and IDN-3 revocation, unlimited sessions are mitigated. A limit needs eviction semantics — defer until needed.

Remaining work:

- Reconcile supplied direction with controlling contract, prepare registration, then implement and verify the dependent workflow. No repeated request for the same supplied choice.

Next action: Reuse supplied answer; perform remaining reconciliation/proposal work before claiming contract closure.

### OQ-SYS-1

**Question:** Does numeric order within a group (for example C11 before C12) define precedence, or are contracts within a group peers?

Contract: `contracts/c00-system-authority-contract.md` • affects `SYS-4`

Answer status: **ANSWER_RECEIVED_UNREGISTERED**. Detail: `SUPPLIED_PACKET_RESPONSE`.

Supplied sheet ([source](sources/supplied-answer-sheet.md), line 47):

> Peers, more-restrictive wins on conflict. 99%. Numeric order implying precedence is fragile; explicit conflict resolution is robust.

Remaining work:

- Reconcile supplied direction with controlling contract, prepare registration, then implement and verify the dependent workflow. No repeated request for the same supplied choice.

Next action: Reuse supplied answer; perform remaining reconciliation/proposal work before claiming contract closure.

### OQ-SYS-2

**Question:** Where does the compatibility register live, and in what format (Markdown table, machine-readable file checked in CI, or both)?

Contract: `contracts/c00-system-authority-contract.md` • affects `SYS-11`

Answer status: **ANSWER_RECEIVED_UNREGISTERED**. Detail: `SUPPLIED_PACKET_RESPONSE`.

Supplied sheet ([source](sources/supplied-answer-sheet.md), line 48):

> JSON canonical in CI + generated Markdown. 99% on format. Flag: does `governance/compatibility-register.json` exist? Who generates the Markdown? Needs implementation, not just agreement.

Remaining work:

- Canonical register path and generator implementation; preserve source/evidence distinctions.

Next action: Reuse supplied answer; perform remaining reconciliation/proposal work before claiming contract closure.

### OQ-SYS-5

**Question:** Which parts of C11–C15 and C21–C23 are applicable to the learner demo?

Contract: `contracts/c00-system-authority-contract.md` • affects `SYS-29`

Answer status: **ANSWER_RECEIVED_UNREGISTERED**. Detail: `SUPPLIED_PACKET_RESPONSE`.

Supplied sheet ([source](sources/supplied-answer-sheet.md), line 49):

> Approve the applicability matrix. 99%. Reasonable scoping; no shared deployment without release proof.

Remaining work:

- Exact demo applicability matrix and its authority registration.

Next action: Reuse supplied answer; perform remaining reconciliation/proposal work before claiming contract closure.

### OQ-TEN-1

**Question:** Does v2 start with the Gate A single-location compatibility membership or a normalized multi-organization, multi-location membership model?

Contract: `contracts/c13-tenancy-membership-contract.md` • affects `TEN-15`

Answer status: **ANSWER_RECEIVED_UNREGISTERED**. Detail: `SUPPLIED_PACKET_RESPONSE`.

Supplied sheet ([source](sources/supplied-answer-sheet.md), line 19):

> Normalized multi-org multi-location. 99%. V1's single-location model is a compatibility shim. Greenfield v2 carrying that tech debt guarantees a painful migration later. Get it right now.

Remaining work:

- Reconcile supplied direction with controlling contract, prepare registration, then implement and verify the dependent workflow. No repeated request for the same supplied choice.

Next action: Reuse supplied answer; perform remaining reconciliation/proposal work before claiming contract closure.

### OQ-TEN-2

**Question:** How does a request select its scope when an identity holds more than one membership (explicit path segment, header validated against membership, other)?

Contract: `contracts/c13-tenancy-membership-contract.md` • affects `TEN-7`

Answer status: **ANSWER_RECEIVED_UNREGISTERED**. Detail: `SUPPLIED_PACKET_RESPONSE`.

Supplied sheet ([source](sources/supplied-answer-sheet.md), line 21):

> Explicit validated scope tuple. 99%. Implicit scope ("user's only membership") creates confused-deputy vulnerabilities. With multiple memberships, ambiguity is exploitable. Validation against current membership prevents tampering.

Remaining work:

- Reconcile supplied direction with controlling contract, prepare registration, then implement and verify the dependent workflow. No repeated request for the same supplied choice.

Next action: Reuse supplied answer; perform remaining reconciliation/proposal work before claiming contract closure.

### OQ-TEN-3

**Question:** Does v2 keep platform-operator cross-tenant access? Until decided, no role holds cross-tenant capability.

Contract: `contracts/c13-tenancy-membership-contract.md` • affects `—`

Answer status: **NO_SUPPLIED_ENTRY**. Detail: `EXISTING_RECOMMENDATION_ONLY`.

Existing proposal, preserved separately: Keep platform cross-tenant access absent initially. Global Identity lifecycle authority in a multi-tenant model needs a separately reviewed scope/actor policy.

Remaining work:

- Original supplied sheet has no entry for this ID. Existing proposal is preserved below; it is not an owner answer.

Next action: Prepare the preserved recommendation with its exact impact for an eventual targeted owner selection.

### OQ-TXN-2

**Question:** Which external providers are in scope for v2 (email delivery, OAuth, payments, other), and which owns reconciliation for each?

Contract: `contracts/c22-transaction-idempotency-reconciliation-contract.md` • affects `—`

Answer status: **ANSWER_RECEIVED_UNREGISTERED**. Detail: `SUPPLIED_PACKET_RESPONSE`.

Supplied sheet ([source](sources/supplied-answer-sheet.md), line 80):

> Email + OAuth first; payments disabled. 99%. Essential for identity; payments add PCI scope. Note: provider selection constrains IDN-4 implementation — dependency I missed earlier.

Remaining work:

- Exact email/OAuth providers and operation-specific failure/reconciliation policy.

Next action: Reuse supplied answer; perform remaining reconciliation/proposal work before claiming contract closure.

### OQ-WEB-1

**Question:** Which accessibility standard and level is approved (for example WCAG 2.2 AA)?

Contract: `contracts/c42-web-client-boundary-contract.md` • affects `WEB-15`

Answer status: **ANSWER_RECEIVED_UNREGISTERED**. Detail: `SUPPLIED_PACKET_RESPONSE`.

Supplied sheet ([source](sources/supplied-answer-sheet.md), line 41):

> WCAG 2.2 AA. 99%. 2.2 is current W3C (2.1 superseded). AA is the legal standard (ADA case law, EU EAA). AAA is often impractical (contrast ratios break brand palettes).

Remaining work:

- Reconcile supplied direction with controlling contract, prepare registration, then implement and verify the dependent workflow. No repeated request for the same supplied choice.

Next action: Reuse supplied answer; perform remaining reconciliation/proposal work before claiming contract closure.

### OQ-WEB-2

**Question:** Is the core-path list above complete for v2?

Contract: `contracts/c42-web-client-boundary-contract.md` • affects `—`

Answer status: **ANSWER_RECEIVED_UNREGISTERED**. Detail: `SUPPLIED_PACKET_RESPONSE`.

Supplied sheet ([source](sources/supplied-answer-sheet.md), line 112):

> Confirm list (login, start, completion, manager view, logout). 99%. Covers core journeys. Demo isolation correctly separate.

Remaining work:

- Reconcile supplied direction with controlling contract, prepare registration, then implement and verify the dependent workflow. No repeated request for the same supplied choice.

Next action: Reuse supplied answer; perform remaining reconciliation/proposal work before claiming contract closure.

