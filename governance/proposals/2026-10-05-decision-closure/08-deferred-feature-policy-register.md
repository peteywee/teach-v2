<!--tos-doc
{
  "doc_id": "TEACH-PROP-DCS-08",
  "class": "decision-table",
  "version": "0.2.0",
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
    "TEACH-CON-C00"
  ],
  "resolves_if_approved": [
    "OQ-AGT-2",
    "OQ-ANL-1",
    "OQ-ANL-2",
    "OQ-PWA-1",
    "OQ-BIL-1",
    "OQ-BIL-2",
    "OQ-LRN-2",
    "OQ-CERT-3",
    "OQ-CERT-5",
    "OQ-MIG-5",
    "OQ-CNT-3"
  ],
  "partially_resolves": [
    "OQ-BIL-3"
  ],
  "machine_sources": [
    "deferred-feature-register.json"
  ]
}
-->

# Deferred-Feature Policy Register

| Field | Value |
| --- | --- |
| Status | `proposed` |
| Owner decision | Approved in chat 2026-10-05 04:05 America/Chicago (decision sheet A–D). Registration PENDING under SYS-21 #75; this document stays `proposed` until it lands. |
| Entries | 12 questions whose answer is disabled / none / deferred |
| Effect of approval | Each question closes as a **registered disabled state**. A later enablement is a new contract revision with its own issue, not a reopened question. |

## 1. Why register "disabled" instead of leaving it open

An open question tells implementers "undecided"; SYS-34 then allows only fail-closed behavior, but nothing states what fail-closed means for that feature or how to prove it is off. Registering the disabled state fixes three things: the exact fail-closed behavior, a check that proves the feature is absent, and the trigger that would require a revision. SYS-32 already says these features are not learner-demo prerequisites.

## 2. Register

| Question | Contract | Feature | Registered state | Fail-closed behavior | Proof it stays off | Re-enable trigger |
| --- | --- | --- | --- | --- | --- | --- |
| `OQ-AGT-2` | C02 | Runtime AI agents | `DISABLED` | No RuntimeAgent principal, capability or tool boundary exists; any request claiming RuntimeAgent actor class is rejected 403 at C14 step 4. | automation-principals.json contains no actor_class RuntimeAgent; static check: no LLM SDK import under src/ outside an approved module list (list empty). | Named use case + dedicated C02 revision defining AgentIdentity, AgentCapability, tool/command boundary, decision evidence, human approval/escalation, failure/recovery (AGT-16). |
| `OQ-ANL-1` | C61 | Product analytics | `DISABLED` | No analytics SDK, beacon or provider call; no analytics events emitted. | Bundle scan of built web assets for known analytics endpoints/SDK names returns zero; network capture during E2E core paths shows no third-party analytics request. | Owner enablement decision naming provider, event schema v1 and the ANL-7 field list (C61 revision). |
| `OQ-ANL-2` | C61 | Identifying fields in analytics | `NONE_PERMITTED` | If analytics is ever enabled, the approved identifying-field list starts empty. | Schema check on any future analytics event definitions: zero fields classified DIRECT_IDENTIFIER or OPAQUE_LINK to Identity. | C61 revision approving a minimum field list. |
| `OQ-PWA-1` | C62 | Offline writes | `NOT_AUTHORIZED` | Every mutation requires connectivity (LRN-12); offline UI shows a not-sent state and never claims success (PWA-4); no client write queue exists (PWA-9). | Service-worker source contains no fetch handler for non-GET methods and no IndexedDB/Cache Storage write of request bodies; E2E offline mutation attempt leaves zero server rows after reconnect without user resubmission. | Active C62 revision or dedicated contract defining PWA-6..8 queue binding. |
| `OQ-BIL-1` | C63 | Self-service billing | `DISABLED` | No checkout, webhook or billing route mounted; billing handled manually outside the application (BIL-1). | API manifest contains no billing route; route parity check enforces it. | Owner enables C63 by revision. |
| `OQ-BIL-2` | C63 | Payment provider / money movement | `NOT_SELECTED` | No payment provider SDK, key or webhook secret in any environment manifest (REL-6). | Config-manifest check: no key matching payment-provider patterns; dependency check: no payment SDK in package.json. | Owner authorization of a named provider and production money movement (BIL-12). |
| `OQ-BIL-3` | C63 | Organization ↔ billing-account relation | `MODEL_REGISTERED_CARDINALITY_OPEN` | Billing account is Organization-owned; entitlement is a read-only projection; no billing-account record is created while billing is disabled. | No billing-account table admitted. | Owner supplies cardinality when billing is enabled. |
| `OQ-LRN-2` | C32 | XP, mastery, streak, rank | `UNAVAILABLE` | No derived score is stored or displayed as real; any sample value is labelled sample/demo (LRN-11). | Verified at baseline: learning_sessions has no score columns. Check: no column matching xp\|mastery\|streak\|rank in any admitted table; UI test asserts label on any such display. | Owner-approved versioned derivation formulas with replay evidence (C32 revision). |
| `OQ-CERT-3` | C34 | Photo evidence | `DISABLED (checklist + observation notes ENABLED)` | IssueCertification accepts only structured checklist results and scoped observation notes; any file/photo field → 400. | Certification request schema has no binary/file/URL field; no object-storage bucket for certification media exists. | Separate decision on photo storage, privacy, retention (C15 matrix row) and access. |
| `OQ-CERT-5` | C34 | Certification expiry | `NONE` | Certifications have no expiry field and never change state by time; only RevokeCertification ends validity. | No expires_at column on the admitted certification table; verification surface shows no expiry. | Owner-defined representation, effects, history and revocation interaction (C34 revision). |
| `OQ-MIG-5` | C21 | Legacy Teach data import | `ABSENT` | No import job, script or route; production baseline is the V2 schema only (MIG-7). | No code path reads a legacy database URL; config manifest has no legacy DB credential. | Separate project with source snapshot, transformation spec, reconciliation, audit and rollback plan. |
| `OQ-CNT-3` | C31 | Legacy content-pack formats | `NONE_ACCEPTED` | Only the canonical V2 pack schema validates; any other format is rejected before parse beyond the format sniff. | compatibility-register.json has zero CNT-5 adapter entries; parser fuzz/negative fixtures (oversized, nested-entity, archive bomb, bad encoding) all rejected. | Per format: named adapter, positive + negative fixtures, version validation, deterministic conversion, removal condition, compatibility-register entry (CNT-5). |

## 3. Constraints

1. A disabled feature has no route, no dependency, no configuration secret and no schema column. Presence of any of these without a revision is a SYS-16 violation.
2. "Disabled" is not "hidden in the UI". The proof column is a server-side or build-artifact check, never a UI visibility check (AUTHZ-9).
3. Enabling one feature does not enable another (e.g. enabling analytics does not authorize identifying fields; ANL-2 is separate).
4. `OQ-CERT-3` registers an *enabled* subset (checklist + notes) and a disabled subset (photos).

## 4. Proposed registration tokens

| Question | Token | Residual |
| --- | --- | --- |
| `OQ-AGT-2` | `DEFER_RUNTIME_AGENTS` | — |
| `OQ-ANL-1` | `REMAIN_DISABLED` | — |
| `OQ-ANL-2` | `NO_IDENTIFYING_ANALYTICS_FIELDS` | — |
| `OQ-PWA-1` | `NO_OFFLINE_WRITES` | — |
| `OQ-BIL-1` | `REMAIN_DISABLED` | — |
| `OQ-BIL-2` | `DEFER_PAYMENT_PROVIDER` | — |
| `OQ-BIL-3` | `ORGANIZATION_OWNED_BILLING_RELATION_PROPOSAL` | Organization-to-billing-account cardinality |
| `OQ-LRN-2` | `DEFER_SCORING_FORMULAS` | — |
| `OQ-CERT-3` | `STRUCTURED_CHECKLIST_AND_OBSERVATION_NOTES_FIRST` | — |
| `OQ-CERT-5` | `NO_IMPLICIT_EXPIRY` | — |
| `OQ-MIG-5` | `NO_LEGACY_DATA_IMPORT_YET` | — |
| `OQ-CNT-3` | `ONE_NAMED_ADAPTER_PER_LEGACY_FORMAT` | — |

## 5. Definition of Done

1. Owner approves the register. 2. Registrations land per contract (C02, C21, C31, C32, C34, C61, C62, C63) — combined with other documents' changes to the same contract (see `00-README.md` §5). 3. Inventory drops by 11; `OQ-BIL-3` narrows. 4. The proof-it-stays-off checks are added to CI before the first feature-adjacent code merges.

## 6. Change log

| Version | Date | Change |
| --- | --- | --- |
| 0.1.0 | 2026-10-05 | Initial proposed register. |
| 0.2.0 | 2026-10-05 | Re-checked on `6553eb4`: all 12 rows still open; C34 is now 1.2.0, so CERT-3/CERT-5 target C34 1.3.0. Owner chat approval recorded; registration pending #75. |
