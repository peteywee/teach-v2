<!--tos-doc
{
  "doc_id": "TEACH-CON-C22",
  "class": "contract",
  "version": "1.2.0",
  "claims_truth_state": "declared",
  "status": "superseded",
  "owner": "Patrick Craven, Top Shelf Service LLC",
  "created_on": "2026-10-03",
  "updated_on": "2026-10-04",
  "effective_on": "2026-10-03",
  "approval": {
    "state": "approved",
    "approved_version": "1.2.0",
    "approved_on": "2026-10-04",
    "record": "contracts/APPROVAL-RECORD.md",
    "basis": "Owner explicitly approved TransactionControl first-slice idempotency source/retention decisions; GitHub issue #20"
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
    "TEACH-CON-C22@1.1.0"
  ],
  "superseded_by": "TEACH-CON-C22@1.3.0",
  "depends_on": [
    "contracts/"
  ]
}
-->

# Superseded TEACH-CON-C22 1.2.0

Superseded by `TEACH-CON-C22@1.3.0` under SYS-21 #75.

The original body below is preserved, including its former current-status wording.
# C22 — Transaction, Idempotency & Reconciliation Contract

| Field              | Value                                                                                                                                                           |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Contract ID        | C22                                                                                                                                                             |
| Group              | C20 Data Correctness                                                                                                                                            |
| Governed by        | C00 System Authority                                                                                                                                            |
| Version            | 1.2.0                                                                                                                                                           |
| Status             | `active`                                                                                                                                                        |
| Owner              | Patrick Craven, Top Shelf Service LLC                                                                                                                           |
| Approved by        | Patrick Craven (owner), 2026-10-04 — C22 1.2.0 idempotency source/retention closure; GitHub issue #20 |
| Requirement prefix | `TXN`                                                                                                                                                           |
| Activation         | Required for the core rebuild                                                                                                                                   |
| Legacy lineage     | New. Carries the ambiguous-outcome lessons from xqueue into Teach.                                                                                              |
| Supersedes         | C22 1.1.0 |
| Superseded by      | None                                                                                                                                                            |
| Created            | 2026-10-03                                                                                                                                                      |
| Last updated       | 2026-10-04                                                                                                                                                      |

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
| OQ-TXN-2 | Which external providers are in scope for v2 (email delivery, OAuth, payments, other), and which owns reconciliation for each? | No                    | —       |

## 7. Verification Status

| Item                         | State                    | Detail                                                                                                                                                                                                                                                |
| ---------------------------- | ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Target codebase              | verified (limited scope) | `peteywee/teach-v2` default branch `main`, verified through governance baseline commit `292e8da9123987e9d94f09669c7bc6b6d43c4320` on 2026-10-03. The repository contains the contract/governance foundation; application implementation remains not yet built.                                |
| Legacy repository consulted  | reference only           | `peteywee/teach` `work/TR-0010-production-cutover` at `79fdce5cc3b2` (`main` at `99162f17eace`), read 2026-10-03 for lineage: legacy domain contract JSON files and the Gate A decision record. Legacy code was not inspected and does not govern v2. |
| Implementation conformance   | unknown                  | Not yet verified. No v2 implementation was inspected; the owner states v2 is yet to be built.                                                                                                                                                         |
| Acceptance cases implemented | unknown                  | Not yet verified. No mapping between repository tests and these IDs has been established.                                                                                                                                                             |
| Blocking open questions      | 0 open                   | OQ-TXN-1 is resolved by owner approval in GitHub issue #20. OQ-TXN-2 remains open and non-blocking.                                                                                                   |
| Owner approval               | declared                 | C22 1.2.0 approved by Patrick Craven on 2026-10-04 for OQ-TXN-1 idempotency source/retention closure; recorded in `APPROVAL-RECORD.md` under GitHub issue #20.                                                                     |
| Independent review           | not performed            | Drafted and self-checked by Claude against the contract-authoring checklist only.                                                                                                                                                                     |
| Source of intent             | declared                 | Owner-supplied rebuild proposal (`source/2026-10-03-teach-v2-contract-hierarchy-proposal.md`), consolidated decisions (`source/2026-10-03-teach-rebuild-consolidated-decisions.md`), and legacy Gate A owner decisions (2026-07-22) where cited.      |

## 8. Change Log

| Version | Date       | Change                                                                                                                                                                                          | By               |
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
