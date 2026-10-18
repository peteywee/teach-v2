<!--tos-doc
{
  "doc_id": "TEACH-CON-C32",
  "class": "contract",
  "version": "1.4.0",
  "claims_truth_state": "declared",
  "status": "active",
  "owner": "Patrick Craven, Top Shelf Service LLC",
  "created_on": "2026-10-03",
  "updated_on": "2026-10-17",
  "effective_on": "2026-10-17",
  "approval": {
    "state": "approved",
    "approved_version": "1.4.0",
    "approved_on": "2026-10-17",
    "record": "domains/demo-runtime/owner-approval.json",
    "basis": "TEACH-DEMO-RUNTIME-2026-10-17@0.1.0; SYS-21 #82; SHA256SUMS sha256:a1df23b03a0f0660a072cff00eb40d3d2fb60bc8c521f12b56977f559601196a"
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
    "TEACH-CON-C32@1.0.3",
    "TEACH-CON-C32@1.2.0",
    "TEACH-CON-C32@1.3.0"
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
  }
}
-->

# C32 — Learning Sessions & Progress Contract

| Field              | Value                                                                                                                                                           |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Contract ID        | C32                                                                                                                                                             |
| Group              | C30 Product Semantics                                                                                                                                           |
| Governed by        | C00 System Authority                                                                                                                                            |
| Version | 1.4.0 |
| Status             | `active`                                                                                                                                                        |
| Owner              | Patrick Craven, Top Shelf Service LLC                                                                                                                           |
| Approved by | Patrick Craven (owner), 2026-10-17; TEACH-DEMO-RUNTIME-2026-10-17@0.1.0; SYS-21 #82; see `domains/demo-runtime/owner-approval.json` |
| Requirement prefix | `LRN`                                                                                                                                                           |
| Activation         | Required for the core rebuild                                                                                                                                   |
| Legacy lineage     | Reference only — reworks legacy `.topshelf/contracts/domain/frontline-learning.json`.                                                                           |
| Supersedes | 1.3.0 |
| Superseded by      | None                                                                                                                                                            |
| Created            | 2026-10-03                                                                                                                                                      |
| Last updated | 2026-10-17 |

## 1. Purpose and Failure Prevented

A cook finishes a station challenge in the Kitchen view and sees progress and XP go up. None of it was saved; it lived only in browser state. The manager's dashboard shows nothing, the cook loses it on refresh, and the demo told a story the system cannot back up. This contract makes persisted learner events the only source of progress, and forbids showing numbers as real when they are not.

## 2. Scope

This contract owns:

- Learning sessions
- Learner events
- Progress, mastery, XP, streak, and rank derivation

This contract does not own:

- Content (C31)
- Certification (C34)
- Offline mutation queues (C62)

Related contracts: C00, C31, C34, C62.

## 3. Definitions

| Term             | Meaning                                                                                               |
| ---------------- | ----------------------------------------------------------------------------------------------------- |
| Learning session | A bounded attempt by one learner against one assigned content version.                                |
| Learner event    | A persisted record of a learner action within a session.                                              |
| Progress         | Any learner-facing or manager-facing measure of advancement, including mastery, XP, streak, and rank. |

## 4. Requirements

The keywords MUST, MUST NOT, SHOULD, and MAY are used in the RFC 2119 sense. Requirement IDs are stable and MUST NOT be renumbered or reused.

- **LRN-1** — Each learning session MUST belong to exactly one learner.
- **LRN-2** — A learning session MUST only be started against content assigned to and authorized for that learner.
- **LRN-3** — A started learning session MUST be `ACTIVE`. `RecordProgressEvent` MUST be accepted only while `ACTIVE`. The only lifecycle transition is `ACTIVE -> COMPLETED` through completion; `COMPLETED` is terminal, and every unlisted transition or post-completion learner event MUST be rejected.
- **LRN-4** — Progress MUST derive only from persisted canonical learner events or state.
- **LRN-5** — Challenge completion that claims learning or progress MUST be recorded in the same canonical persistence model.
- **LRN-6** — Progress MUST NOT exist only in client state (React, Zustand, or browser storage).
- **LRN-7** — Retrying an event submission MUST NOT duplicate progress.
- **LRN-8** — A learner MUST be able to read only their own learner state.
- **LRN-9** — A manager MUST NOT be able to create, alter, or delete a learner's events or progress.
- **LRN-10** — Every learner event MUST record the content identity and version it applies to.
- **LRN-11** — XP, streak, rank, and mastery MUST NOT be displayed as real unless derived from authoritative persisted state; any other value MUST be visibly labelled as sample or demo.
- **LRN-12** — Learning mutations MUST require connectivity unless C62 explicitly permits offline writes.
- **LRN-13** — XP, mastery, streak and rank remain UNAVAILABLE until owner-approved versioned derivation formulas and replay evidence exist. No real score may be stored or displayed; sample/demo scores MUST be labelled. See `governance/decision-closure/08-deferred-feature-policy-register.md`. (OQ-LRN-2 resolved 2026-10-05).

## 5. Acceptance Cases

| Case      | Proves              | Setup                                                             | Expected                                         |
| --------- | ------------------- | ----------------------------------------------------------------- | ------------------------------------------------ |
| LRN-AC-1  | LRN-1, LRN-8        | Learner A requests learner B's sessions and progress              | Non-disclosing 404                               |
| LRN-AC-2  | LRN-2               | Start a session on unassigned content                             | Denied; no session                               |
| LRN-AC-3  | LRN-3               | Submit events to a completed session and to a nonexistent session | Rejected; no write                               |
| LRN-AC-4  | LRN-4, LRN-5, LRN-6 | Complete a challenge; reload in a fresh browser profile           | Progress identical; server events present        |
| LRN-AC-5  | LRN-7               | Submit the same event 3× with one idempotency key                 | One event; progress unchanged by repeats         |
| LRN-AC-6  | LRN-9               | Manager calls every learner-event write path for a report         | Denied 403                                       |
| LRN-AC-7  | LRN-10              | Inspect stored events                                             | Each has content ID and version                  |
| LRN-AC-8  | LRN-11              | Render progress UI with no persisted events                       | Values are zero/empty or visibly labelled sample |
| LRN-AC-9  | LRN-12              | Submit a learning event offline                                   | UI reports not saved; no false success           |
| LRN-AC-10 | LRN-13              | Owner decision record                                             | Manual evidence: approved rules recorded         |
| LRN-AC-11 | LRN-3               | Attempt event after completion, completion twice, reopening, and an unregistered state | All rejected; ACTIVE→COMPLETED is the only lifecycle transition |

## 6. Open Questions

| ID       | Question                                                                                              | Blocks implementation | Affects |
| -------- | ----------------------------------------------------------------------------------------------------- | --------------------- | ------- |
| OQ-LRN-1 | Resolved 2026-10-03: bootstrap lifecycle is `ACTIVE -> COMPLETED`; progress events are allowed only in ACTIVE and COMPLETED is terminal. GitHub issue #4. | No | LRN-3 |
| OQ-LRN-2 | **Resolved.** Owner, 2026-10-05: XP, mastery, streak and rank remain UNAVAILABLE until owner-approved versioned derivation formulas and replay evidence exist. No real score may be stored or displayed; sample/demo scores MUST be labelled. See `governance/decision-closure/08-deferred-feature-policy-register.md`. (Decision-closure r3.1) | No (resolved) | LRN-13 |
| OQ-LRN-3 | **Resolved** When a pack gets a new version, does in-progress learner history carry over, restart, or stay pinned? Owner approved PIN_EXISTING_HISTORY_TO_ASSIGNED_VERSION on 2026-10-05. | No                    | PIN_EXISTING_HISTORY_TO_ASSIGNED_VERSION |

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
| 0.2.0   | 2026-10-03 | Group renamed to C30 Product Semantics. No requirement changes.                                                                                                                                 | Claude (drafter) |
| 0.3.0   | 2026-10-03 | Retargeted to the Teach v2 codebase: legacy `peteywee/teach` is reference only; anchors and paths no longer point into the legacy repository.                                                   | Claude (drafter) |
| 0.4.0   | 2026-10-03 | Anchored to `peteywee/teach-v2` branch `main` (owner-declared); the repository had no commits when cloned on 2026-10-03, so the anchor SHA stays Not yet verified.                              | Claude (drafter) |
| 1.0.0   | 2026-10-03 | Approved by the owner; status changed from `proposed` to `active`. Open questions remain open and block implementation of the requirements they affect (SYS-34) instead of blocking activation. | Claude (drafter) |
| 1.0.1   | 2026-10-03 | Non-normative document-governance metadata/provenance normalization; 1.0.0 owner approval remained controlling. | ChatGPT (governance) |
| 1.0.2   | 2026-10-03 | Non-normative baseline cleanup: corrected stale current-status provenance after the contract spine was committed; no behavioral requirement changed. | ChatGPT (governance) |
| 1.0.3   | 2026-10-03 | Non-normative truth-state cleanup: verification status now anchors the live v2 repository through governance baseline `292e8da9123987e9d94f09669c7bc6b6d43c4320`; no behavioral requirement changed. | ChatGPT (governance) |
| 1.1.0   | 2026-10-03 | Resolved OQ-LRN-1 with minimal ACTIVE→COMPLETED LearningSession state machine; no paused/abandoned/reopen state invented. GitHub issue #4. | Patrick Craven (owner approval) |
| 1.3.0 | 2026-10-05 | Register OQ-LRN-2; preserve named residuals and existing requirement/acceptance IDs. Decision-closure r3.1 manifest sha256:ff7b51df1e3a235e9d226d9d7232f81c64bbeb451b359b6e0f2ea232b6e1757c; SYS-21 #75. | Patrick Craven (owner); ChatGPT (recorder) |

## Registered demo runtime amendment (1.4.0)

Exact owner-approved scope: `TEACH-DEMO-RUNTIME-2026-10-17@0.1.0`, SYS-21 [#82](https://github.com/peteywee/teach-v2/issues/82). Approval provenance: `domains/demo-runtime/owner-approval.json`; immutable source: `domains/demo-runtime/proposal-0.1.0/contract-amendments.md`. The addendum below is the approved revision, not an exception inferred by an implementer. It changes only its explicitly named demo behavior; ordinary/customer semantics and unrelated gates remain unchanged. Proposal labels in the immutable package preserve its pre-approval history; this registration supplies current authority. Physical schema admission, runtime activation and shared deployment remain separate.

Admit only the canonical synthetic content and learning definitions in learning-definition.md/JSON. Organization-owned copies do not select a future customer/global catalog policy. Publish remains internal/control-plane, scoped to the fresh run and frozen synthetic template. Customer approval remains absent. AssignContent accepts exact immutable version/digest and explicit target learner with current scope/reporting eligibility; new deliberate keys may create new practice assignments, while retries cannot duplicate.

Single-choice teaching responses are server-evaluated against authored answer data. Per-response answer-match feedback is not XP, mastery, rank, certification or an aggregate score. Completion is permitted only when all ordered required responses are recorded; correctness is not a completion gate. One session per Assignment; new practice requires an explicit new Assignment. Maximum ten assignments and thirty accepted response events per run. Session completion stays terminal; manager reads persisted state and cannot edit learning events.

Exact definitions and field constraints are incorporated from `domains/demo-runtime/proposal-0.1.0/demo-boundary.md`, `domains/demo-runtime/proposal-0.1.0/authority-and-audit.md`, `domains/demo-runtime/proposal-0.1.0/learning-definition.md`, `domains/demo-runtime/proposal-0.1.0/learning-definition.json`, and `domains/demo-runtime/proposal-0.1.0/transport-and-queries.json` with its referenced schemas. No definition beyond that approved package is introduced.
