<!--tos-doc
{
  "doc_id": "TEACH-CON-C32",
  "class": "contract",
  "version": "1.0.3",
  "claims_truth_state": "declared",
  "status": "superseded",
  "owner": "Patrick Craven, Top Shelf Service LLC",
  "created_on": "2026-10-03",
  "updated_on": "2026-10-03",
  "effective_on": "2026-10-03",
  "approval": {
    "state": "approved",
    "approved_version": "1.0.0",
    "approved_on": "2026-10-03",
    "record": "contracts/APPROVAL-RECORD.md",
    "inheritance": "1.0.1, 1.0.2, and 1.0.3 are non-normative governance/truth-state cleanup patches; 1.0.0 owner approval remains controlling"
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
  "supersedes": [],
  "superseded_by": "TEACH-CON-C32@1.1.0",
  "depends_on": [
    "contracts/"
  ]
}
-->

# C32 — Learning Sessions & Progress Contract

> Superseded by C32 version 1.1.0 on 2026-10-03. Preserved under SYS-21.

| Field              | Value                                                                                                                                                           |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Contract ID        | C32                                                                                                                                                             |
| Group              | C30 Product Semantics                                                                                                                                           |
| Governed by        | C00 System Authority                                                                                                                                            |
| Version            | 1.0.3                                                                                                                                                           |
| Status             | `superseded`                                                                                                                                                        |
| Owner              | Patrick Craven, Top Shelf Service LLC                                                                                                                           |
| Approved by        | Patrick Craven (owner), 2026-10-03 — approval instruction given in chat at 10:47 CDT; transcribed by Claude at the owner's direction — see `APPROVAL-RECORD.md` |
| Requirement prefix | `LRN`                                                                                                                                                           |
| Activation         | Required for the core rebuild                                                                                                                                   |
| Legacy lineage     | Reference only — reworks legacy `.topshelf/contracts/domain/frontline-learning.json`.                                                                           |
| Supersedes         | None                                                                                                                                                            |
| Superseded by      | C32 1.1.0 |
| Created            | 2026-10-03                                                                                                                                                      |
| Last updated       | 2026-10-03                                                                                                                                                      |

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
- **LRN-3** — Session start, event recording, and completion MUST follow the owner-approved state machine (see OQ-LRN-1; value Not yet verified); events MUST NOT be accepted for a session outside the states that permit them.
- **LRN-4** — Progress MUST derive only from persisted canonical learner events or state.
- **LRN-5** — Challenge completion that claims learning or progress MUST be recorded in the same canonical persistence model.
- **LRN-6** — Progress MUST NOT exist only in client state (React, Zustand, or browser storage).
- **LRN-7** — Retrying an event submission MUST NOT duplicate progress.
- **LRN-8** — A learner MUST be able to read only their own learner state.
- **LRN-9** — A manager MUST NOT be able to create, alter, or delete a learner's events or progress.
- **LRN-10** — Every learner event MUST record the content identity and version it applies to.
- **LRN-11** — XP, streak, rank, and mastery MUST NOT be displayed as real unless derived from authoritative persisted state; any other value MUST be visibly labelled as sample or demo.
- **LRN-12** — Learning mutations MUST require connectivity unless C62 explicitly permits offline writes.
- **LRN-13** — Mastery and XP derivation rules MUST be the owner-approved rules (see OQ-LRN-2; value Not yet verified).

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

## 6. Open Questions

| ID       | Question                                                                                              | Blocks implementation | Affects |
| -------- | ----------------------------------------------------------------------------------------------------- | --------------------- | ------- |
| OQ-LRN-1 | What is the learning-session state machine (states and allowed transitions)?                          | Yes                   | LRN-3   |
| OQ-LRN-2 | How are mastery, XP, streak, and rank derived from events?                                            | No                    | LRN-13  |
| OQ-LRN-3 | When a pack gets a new version, does in-progress learner history carry over, restart, or stay pinned? | No                    | —       |

## 7. Verification Status

| Item                         | State                    | Detail                                                                                                                                                                                                                                                |
| ---------------------------- | ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Target codebase              | verified (limited scope) | `peteywee/teach-v2` default branch `main`, verified through governance baseline commit `292e8da9123987e9d94f09669c7bc6b6d43c4320` on 2026-10-03. The repository contains the contract/governance foundation; application implementation remains not yet built.                                |
| Legacy repository consulted  | reference only           | `peteywee/teach` `work/TR-0010-production-cutover` at `79fdce5cc3b2` (`main` at `99162f17eace`), read 2026-10-03 for lineage: legacy domain contract JSON files and the Gate A decision record. Legacy code was not inspected and does not govern v2. |
| Implementation conformance   | unknown                  | Not yet verified. No v2 implementation was inspected; the owner states v2 is yet to be built.                                                                                                                                                         |
| Acceptance cases implemented | unknown                  | Not yet verified. No mapping between repository tests and these IDs has been established.                                                                                                                                                             |
| Blocking open questions      | 1 open                   | Contract is `active` with these open. Each blocks implementation of the requirements it affects beyond fail-closed behavior until decided (SYS-34).                                                                                                   |
| Owner approval               | declared                 | Approved by the owner on 2026-10-03; recorded in `APPROVAL-RECORD.md`. Initial owner-approval baseline is commit `2c9b1c849a520ba817efc91150be9a37797f4238`; this 1.0.3 revision is tracked by Git history.                                                                     |
| Independent review           | not performed            | Drafted and self-checked by Claude against the contract-authoring checklist only.                                                                                                                                                                     |
| Source of intent             | declared                 | Owner-supplied rebuild proposal (`source/2026-10-03-teach-v2-contract-hierarchy-proposal.md`), consolidated decisions (`source/2026-10-03-teach-rebuild-consolidated-decisions.md`), and legacy Gate A owner decisions (2026-07-22) where cited.      |

## 8. Change Log

| Version | Date       | Change                                                                                                                                                                                          | By               |
| ------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- |
| 0.1.0   | 2026-10-03 | Initial proposed draft from the owner-supplied hierarchy proposal. Not approved.                                                                                                                | Claude (drafter) |
| 0.2.0   | 2026-10-03 | Group renamed to C30 Product Semantics. No requirement changes.                                                                                                                                 | Claude (drafter) |
| 0.3.0   | 2026-10-03 | Retargeted to the Teach v2 codebase: legacy `peteywee/teach` is reference only; anchors and paths no longer point into the legacy repository.                                                   | Claude (drafter) |
| 0.4.0   | 2026-10-03 | Anchored to `peteywee/teach-v2` branch `main` (owner-declared); the repository had no commits when cloned on 2026-10-03, so the anchor SHA stays Not yet verified.                              | Claude (drafter) |
| 1.0.0   | 2026-10-03 | Approved by the owner; status changed from `proposed` to `active`. Open questions remain open and block implementation of the requirements they affect (SYS-34) instead of blocking activation. | Claude (drafter) |
| 1.0.1   | 2026-10-03 | Non-normative document-governance metadata/provenance normalization; 1.0.0 owner approval remained controlling. | ChatGPT (governance) |
| 1.0.2   | 2026-10-03 | Non-normative baseline cleanup: corrected stale current-status provenance after the contract spine was committed; no behavioral requirement changed. | ChatGPT (governance) |
| 1.0.3   | 2026-10-03 | Non-normative truth-state cleanup: verification status now anchors the live v2 repository through governance baseline `292e8da9123987e9d94f09669c7bc6b6d43c4320`; no behavioral requirement changed. | ChatGPT (governance) |
