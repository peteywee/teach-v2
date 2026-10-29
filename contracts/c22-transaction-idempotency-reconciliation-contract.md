<!--tos-doc
{
  "doc_id": "TEACH-CON-C22",
  "class": "contract",
  "version": "1.5.0",
  "claims_truth_state": "declared",
  "status": "active",
  "owner": "Patrick Craven, Top Shelf Service LLC",
  "created_on": "2026-10-03",
  "updated_on": "2026-10-26",
  "effective_on": "2026-10-26",
  "approval": {
    "state": "approved",
    "approved_version": "1.5.0",
    "approved_on": "2026-10-26",
    "record": "domains/demo-authoring/owner-approval.json",
    "basis": "Owner-approved bounded manager-authoring increment and narrow private storage/access scope; actual execution remains conditional on review/tests."
  },
  "baseline": {
    "repo": "peteywee/teach-v2",
    "ref": "main",
    "commit": "2c9b1c849a520ba817efc91150be9a37797f4238",
    "purpose": "contract-spine approval baseline"
  },
  "legacy_reference": {
    "repo": "peteywee/teach",
    "ref": "work/TR-0010-production-cutover",
    "head_sha": "79fdce5cc3b207750888e5c2c1c198159ad17077",
    "use": "reference only; does not govern and is not governed by this contract"
  },
  "supersedes": [
    "TEACH-CON-C22@1.1.0",
    "TEACH-CON-C22@1.2.0",
    "TEACH-CON-C22@1.3.0",
    "TEACH-CON-C22@1.4.0"
  ],
  "superseded_by": null,
  "depends_on": [
    "contracts/"
  ],
  "demo_runtime_registration": {
    "package": "TEACH-DEMO-RUNTIME-2026-10-17@0.1.0",
    "approval_record": "domains/demo-runtime/owner-approval.json",
    "issue": "#82",
    "source_package": "domains/demo-runtime/proposal-0.1.0",
    "sha256sums_sha256": "a1df23b03a0f0660a072cff00eb40d3d2fb60bc8c521f12b56977f559601196a",
    "semantic_authority_only": true,
    "physical_schema_admission": false,
    "runtime_activation": false,
    "deployment_authority": false
  },
  "demo_authoring_registration": {
    "package": "TEACH-DEMO-AUTHORING-2026-10-26@0.1.0",
    "impact_issue": null,
    "approval_record": "domains/demo-authoring/owner-approval.json",
    "source_package": "domains/demo-authoring/proposal-0.1.0",
    "source_registration_only": true,
    "physical_schema_admission": false,
    "runtime_proof": "NOT_ESTABLISHED_BY_REGISTRATION"
  }
}
-->

# C22 — Transaction, Idempotency & Reconciliation Contract

| Field              | Value                                                                                                                                                           |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Contract ID        | C22                                                                                                                                                             |
| Group              | C20 Data Correctness                                                                                                                                            |
| Governed by        | C00 System Authority                                                                                                                                            |
| Version | 1.5.0 |
| Status             | `active`                                                                                                                                                        |
| Owner              | Patrick Craven, Top Shelf Service LLC                                                                                                                           |
| Approved by | Patrick Craven (owner), 2026-10-17; TEACH-DEMO-RUNTIME-2026-10-17@0.1.0; SYS-21 #82; see `domains/demo-runtime/owner-approval.json` |
| Requirement prefix | `TXN`                                                                                                                                                           |
| Activation         | Required for the core rebuild                                                                                                                                   |
| Legacy lineage     | New. Carries the ambiguous-outcome lessons from xqueue into Teach.                                                                                              |
| Supersedes | 1.3.0 |
| Superseded by      | None                                                                                                                                                            |
| Created            | 2026-10-03                                                                                                                                                      |
| Last updated | 2026-10-17 |

## 1. Purpose and Failure Prevented

An invitation email request times out. The code cannot tell whether the provider sent it, so it retries, and the new cook gets two invitations with two different setup links. Elsewhere a manager double-taps "Certify" on a slow connection and the learner ends up with two certification records. In xqueue the same shape of bug meant a post could publish twice. This contract makes every retryable write idempotent and forbids retrying anything whose outcome is unknown until the real state has been checked.

## 2. Scope

This contract owns:

- Transaction boundaries
- Idempotency keys and their semantics
- Ambiguous-outcome and reconciliation state
- Webhook event dedupe and ordering state
- Cleanup scoping

This contract does not own:

- Audit content (C23)
- Billing semantics (C63)

Related contracts: C00, C23, C63.

## 3. Definitions

| Term               | Meaning                                                                                                                |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------- |
| Idempotent request | A request that, repeated with the same idempotency key and payload, yields the same final state and the same response. |
| Ambiguous outcome  | An external call whose success or failure cannot be determined (timeout, dropped connection, 5xx after send).          |
| Reconciliation     | Reading canonical provider state to determine what actually happened.                                                  |
| ReconciliationRecordStatus | Canonical lifecycle state of a ReconciliationRecord: `OPEN` or `RESOLVED`. |
| ExternalEffectOutcome | Canonical explicit outcome state: `AMBIGUOUS`, `PARTIAL_FAILURE`, `CONFIRMED_SUCCESS`, or `CONFIRMED_NO_EFFECT`. |

## 4. Requirements

The keywords MUST, MUST NOT, SHOULD, and MAY are used in the RFC 2119 sense. Requirement IDs are stable and MUST NOT be renumbered or reused.

- **TXN-1** — Operations that a contract requires to succeed together MUST execute in one database transaction; a partial result MUST NOT be committed or observable.
- **TXN-2** — Every retryable mutation MUST have a documented idempotency strategy that explicitly declares whether its idempotency key is client-supplied or server-derived; the runtime MUST NOT infer or fall back between key sources. Each retryable mutation MUST also declare an idempotency-evidence retention duration that is not shorter than its complete retry and reconciliation horizon.
- **TXN-3** — Repeating an idempotent request with the same key and payload MUST produce the same final state and response.
- **TXN-4** — Reusing an idempotency key with a different payload MUST be rejected with no side effect.
- **TXN-5** — Retries MUST NOT create duplicate certifications, assignments, payments, seats, invitations, or lifecycle events.
- **TXN-6** — An ambiguous external side effect MUST NOT be retried automatically by any layer: HTTP client retry, job or queue redelivery, workflow step retry, client auto-retry, or operator retry tooling.
- **TXN-7** — Before any retry of an ambiguous external side effect, canonical provider state MUST be read and the local record updated to match.
- **TXN-8** — If reconciliation cannot read provider state, the item MUST remain in the ambiguous state and MUST NOT be retried.
- **TXN-9** — Ambiguous and partial-failure outcomes MUST be represented as explicit states and MUST NOT be reported as success.
- **TXN-10** — Webhook handlers MUST assume delivery can be duplicated and out of order.
- **TXN-11** — Webhook processing MUST durably record provider event identity and enough ordering state to reject duplicates and stale events.
- **TXN-12** — A stale webhook event MUST NOT overwrite newer local state.
- **TXN-13** — Cleanup operations MUST be bounded to an exact owner, run, and tenant; unscoped deletes MUST NOT exist.
- **TXN-14** — A ReconciliationRecord MUST start `OPEN` when an external-effect outcome requires reconciliation and MUST transition `OPEN -> RESOLVED` only through `ReconcileExternalEffect` after canonical provider readback establishes either `CONFIRMED_SUCCESS` or `CONFIRMED_NO_EFFECT`. If provider state is unreadable, the record MUST remain `OPEN`.
- **TXN-15** — ExternalEffectOutcome MUST be one of `AMBIGUOUS`, `PARTIAL_FAILURE`, `CONFIRMED_SUCCESS`, or `CONFIRMED_NO_EFFECT`. A newly opened ReconciliationRecord MUST record `AMBIGUOUS` or `PARTIAL_FAILURE`; provider-specific identifiers and payload details are data on the generic record and MUST NOT create provider-specific semantic subtypes.
- **TXN-16** — A `CONFIRMED_NO_EFFECT` reconciliation MAY permit retry only when the mutation has a documented safe idempotency strategy. `CONFIRMED_SUCCESS` MUST prohibit resending the external effect. Any unresolved `OPEN` record MUST prohibit retry.


## 5. Acceptance Cases

| Case      | Proves         | Setup                                                                                            | Expected                                                                      |
| --------- | -------------- | ------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------- |
| TXN-AC-1  | TXN-1          | Inject failure after the first write of each multi-write operation                               | No partial rows committed                                                     |
| TXN-AC-2  | TXN-2          | Registry/inventory of retryable mutations with declared retry/reconciliation horizons            | Each explicitly declares client-supplied or server-derived key policy with no implicit fallback, plus retention not shorter than its full retry/reconciliation horizon |
| TXN-AC-3  | TXN-3, TXN-5   | Replay each idempotent mutation 3× and concurrently                                              | One effect; identical responses                                               |
| TXN-AC-4  | TXN-4          | Reuse a key with a changed payload                                                               | Rejected; no write                                                            |
| TXN-AC-5  | TXN-6, TXN-9   | Provider double times out after send                                                             | State is ambiguous/needs-reconciliation; zero retries observed at every layer |
| TXN-AC-6  | TXN-7          | Ambiguous item; provider readback shows success                                                  | Local state set to success; no second send                                    |
| TXN-AC-7  | TXN-8          | Ambiguous item; provider readback unavailable                                                    | Item stays ambiguous; zero sends                                              |
| TXN-AC-8  | TXN-10, TXN-11 | Deliver the same webhook twice                                                                   | Processed once; second recorded as duplicate                                  |
| TXN-AC-9  | TXN-12         | Deliver newer event, then older event                                                            | Final state reflects newer event                                              |
| TXN-AC-10 | TXN-13         | Static check for DELETE without owner/run/tenant predicates; run cleanup in a two-tenant fixture | No unscoped deletes; other tenant untouched                                   |
| TXN-AC-11 | TXN-14, TXN-15 | Create reconciliation records for ambiguous and partial-failure outcomes; exercise success, no-effect, and unreadable readback | Records start OPEN; success/no-effect become RESOLVED with canonical confirmed outcomes; unreadable readback remains OPEN with unresolved outcome |
| TXN-AC-12 | TXN-16 | Reconcile one external effect to CONFIRMED_SUCCESS and another to CONFIRMED_NO_EFFECT with/without safe idempotency strategy | Success is never resent; no-effect retries only when safe strategy exists; otherwise retry remains forbidden |


## 6. Open Questions

OQ-TXN-1 was resolved in C22 1.2.0: each retryable operation explicitly selects a client-supplied or server-derived idempotency-key policy with no implicit fallback, and declares a retention duration not shorter than its complete retry/reconciliation horizon.

| ID       | Question                                                                                                                       | Blocks implementation | Affects |
| -------- | ------------------------------------------------------------------------------------------------------------------------------ | --------------------- | ------- |
| OQ-TXN-2 | **Open — residual only.** Which email delivery provider and OAuth provider(s) are approved? Owner, 2026-10-05: External-effect scope is email delivery and OAuth sign-in; payments remain DISABLED. TransactionControl owns ambiguous email-send reconciliation, and canonical provider readback MUST precede any retry. Failed OAuth exchange fails sign-in. Email and OAuth providers remain unselected: no provider adapter/delivery or mounted OAuth callback is authorized. See `governance/decision-closure/07-evidence-release-operations-spec.md`. (Decision-closure r3.1; partial registration) | No | — |

## 7. Verification Status

| Item                         | State                    | Detail                                                                                                                                                                                                                                                |
| ---------------------------- | ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Target codebase              | verified (limited scope) | `peteywee/teach-v2` default branch `main`, verified through governance baseline commit `292e8da9123987e9d94f09669c7bc6b6d43c4320` on 2026-10-03. The repository contains the contract/governance foundation; application implementation remains not yet built.                                |
| Legacy repository consulted  | reference only           | `peteywee/teach` `work/TR-0010-production-cutover` at `79fdce5cc3b2` (`main` at `99162f17eace`), read 2026-10-03 for lineage: legacy domain contract JSON files and the Gate A decision record. Legacy code was not inspected and does not govern v2. |
| Implementation conformance   | unknown                  | Not yet verified. No v2 implementation was inspected; the owner states v2 is yet to be built.                                                                                                                                                         |
| Acceptance cases implemented | unknown                  | Not yet verified. No mapping between repository tests and these IDs has been established.                                                                                                                                                             |
| Blocking open questions      | 0 open | Only unresolved question rows govern blocking; registration is not implementation evidence |
| Owner approval               | declared | 1.3.0 owner approval recorded in APPROVAL-RECORD.md under #75; runtime implementation conformance remains UNKNOWN |
| Independent review           | not performed            | Drafted and self-checked by Claude against the contract-authoring checklist only.                                                                                                                                                                     |
| Source of intent             | declared                 | Owner-supplied rebuild proposal (`source/2026-10-03-teach-v2-contract-hierarchy-proposal.md`), consolidated decisions (`source/2026-10-03-teach-rebuild-consolidated-decisions.md`), and legacy Gate A owner decisions (2026-07-22) where cited.      |

## 8. Change Log

| Version | Date | Change | By |
| ------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- |
| 0.1.0   | 2026-10-03 | Initial proposed draft from the owner-supplied hierarchy proposal. Not approved.                                                                                                                | Claude (drafter) |
| 0.2.0   | 2026-10-03 | Group renamed to C20 Data Correctness. No requirement changes.                                                                                                                                  | Claude (drafter) |
| 0.3.0   | 2026-10-03 | Retargeted to the Teach v2 codebase: legacy `peteywee/teach` is reference only; anchors and paths no longer point into the legacy repository.                                                   | Claude (drafter) |
| 0.4.0   | 2026-10-03 | Anchored to `peteywee/teach-v2` branch `main` (owner-declared); the repository had no commits when cloned on 2026-10-03, so the anchor SHA stays Not yet verified.                              | Claude (drafter) |
| 1.0.0   | 2026-10-03 | Approved by the owner; status changed from `proposed` to `active`. Open questions remain open and block implementation of the requirements they affect (SYS-34) instead of blocking activation. | Claude (drafter) |
| 1.0.1   | 2026-10-03 | Non-normative document-governance metadata/provenance normalization; 1.0.0 owner approval remained controlling. | ChatGPT (governance) |
| 1.0.2   | 2026-10-03 | Non-normative baseline cleanup: corrected stale current-status provenance after the contract spine was committed; no behavioral requirement changed. | ChatGPT (governance) |
| 1.0.3   | 2026-10-03 | Non-normative truth-state cleanup: verification status now anchors the live v2 repository through governance baseline `292e8da9123987e9d94f09669c7bc6b6d43c4320`; no behavioral requirement changed. | ChatGPT (governance) |
| 1.1.0   | 2026-10-04 | Established canonical ReconciliationRecord lifecycle, external-effect outcome vocabulary, provider-neutral detail rule, and safe retry disposition. GitHub issue #12. | Patrick Craven (owner approval) |
| 1.2.0   | 2026-10-04 | Resolved OQ-TXN-1: each retryable operation explicitly selects client-supplied or server-derived idempotency-key policy with no implicit fallback and declares retention at least as long as its complete retry/reconciliation horizon. GitHub issue #20. | Patrick Craven (owner approval) |
| 1.3.0 | 2026-10-05 | Register OQ-TXN-2; preserve named residuals and existing requirement/acceptance IDs. Decision-closure r3.1 manifest sha256:ff7b51df1e3a235e9d226d9d7232f81c64bbeb451b359b6e0f2ea232b6e1757c; SYS-21 #75. | Patrick Craven (owner); ChatGPT (recorder) |

## Registered demo runtime amendment (1.4.0)

Exact owner-approved scope: `TEACH-DEMO-RUNTIME-2026-10-17@0.1.0`, SYS-21 [#82](https://github.com/peteywee/teach-v2/issues/82). Approval provenance: `domains/demo-runtime/owner-approval.json`; immutable source: `domains/demo-runtime/proposal-0.1.0/contract-amendments.md`. The addendum below is the approved revision, not an exception inferred by an implementer. It changes only its explicitly named demo behavior; ordinary/customer semantics and unrelated gates remain unchanged. Proposal labels in the immutable package preserve its pre-approval history; this registration supplies current authority. Physical schema admission, runtime activation and shared deployment remain separate.

Add DemoRun/DemoPersona/MembershipGrant/ReportingRelationship/content/assignment/progress/receipt synthetic record classes with creation, fixed run deadline and terminal clocks. Disposition in this isolated milestone is RETAIN_NO_AUTOMATED_DELETE; expiry/reset revoke access but do not delete, anonymize, rewind or promise erasure. Reduced-resolution admission prefixes are potentially identifying network data, used only for bounded admission and included in this retention classification. No full IP, free-text learner data or customer personal data is collected. Audit policy remains centrally one year with deletion blocked; this package adds no expiry purge mechanism.

Begin and Switch are explicitly NON-RETRYABLE secret issuance. Close is state-guarded, preserving original terminal outcome on internal retry; a revoked visitor cookie still fails. Reset is two sequential operations, with a truthful partial outcome if new Begin fails. The three existing learning retryable mutations use CommandReceipt with CLIENT_SUPPLIED keys, current authority before replay, exact payload binding, original non-secret response, 24-hour horizon and retained tombstones. No client retry layer reissues secrets.

Register finite typed audit actor/target/result and lifecycle snapshot definitions. Required audit/lifecycle history is append-only and transaction-bound; failure rolls back effects. Initial synthetic provisioning has separately typed principal attribution. Identity, Membership, Assignment and DemoRun replay must exactly reproduce their lifecycle fields. Preserve approved denial dedup/rate/overflow rules and do not promote business-event candidates.

Exact definitions and field constraints are incorporated from `domains/demo-runtime/proposal-0.1.0/demo-boundary.md`, `domains/demo-runtime/proposal-0.1.0/authority-and-audit.md`, `domains/demo-runtime/proposal-0.1.0/learning-definition.md`, `domains/demo-runtime/proposal-0.1.0/learning-definition.json`, and `domains/demo-runtime/proposal-0.1.0/transport-and-queries.json` with its referenced schemas. No definition beyond that approved package is introduced.


## Bounded private manager-authoring successor — 2026-10-26

SaveContentDraft and PublishContentDraft use separate append-only AuthoringReceipt records bound to run + manager + key, exact operation and canonical request digest. Operation is not part of key identity. Current authority is revalidated before replay/readback; altered payload or cross-operation reuse conflicts. A saved response remains valid after draft revision advances. Compare-and-swap prevents stale overwrite; lost responses require canonical readback, not assumed success. At most 100 saves, 10 new publications and 256 distinct receipt keys per visit; identical replay is free. Publication compares the saved catalog against the current latest published catalog in the same pack. If they match, no new version is created. Restoring an older catalog that differs from the latest publication creates a new immutable version; old published versions and attempts are never rewritten.

This amendment takes precedence only for the exact source package `domains/demo-authoring/proposal-0.1.0`; all unrelated requirements, historical decisions, recovery gates and permission boundaries remain unchanged. It does not itself execute migrations, grant credentials, or establish runtime conformance.
