<!--tos-doc
{
  "doc_id": "TEACH-CON-C51",
  "class": "contract",
  "version": "1.0.1",
  "claims_truth_state": "declared",
  "status": "active",
  "owner": "Patrick Craven, Top Shelf Service LLC",
  "created_on": "2026-10-03",
  "updated_on": "2026-10-03",
  "effective_on": "2026-10-03",
  "approval": {
    "state": "approved",
    "approved_version": "1.0.0",
    "approved_on": "2026-10-03",
    "record": "contracts/APPROVAL-RECORD.md",
    "inheritance": "1.0.1 is a non-normative metadata/governance patch; 1.0.0 owner approval remains controlling"
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
  "superseded_by": null,
  "depends_on": [
    "contracts/"
  ]
}
-->

# C51 — Verification & Evidence Contract

| Field              | Value                                                                                                                                                           |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Contract ID        | C51                                                                                                                                                             |
| Group              | C50 Production Proof                                                                                                                                            |
| Governed by        | C00 System Authority                                                                                                                                            |
| Version            | 1.0.1                                                                                                                                                           |
| Status             | `active`                                                                                                                                                        |
| Owner              | Patrick Craven, Top Shelf Service LLC                                                                                                                           |
| Approved by        | Patrick Craven (owner), 2026-10-03 — approval instruction given in chat at 10:47 CDT; transcribed by Claude at the owner's direction — see `APPROVAL-RECORD.md` |
| Requirement prefix | `EVD`                                                                                                                                                           |
| Activation         | Required for the core rebuild                                                                                                                                   |
| Legacy lineage     | New. Carries the xqueue/TSAL evidence lessons into Teach.                                                                                                       |
| Supersedes         | None                                                                                                                                                            |
| Superseded by      | None                                                                                                                                                            |
| Created            | 2026-10-03                                                                                                                                                      |
| Last updated       | 2026-10-03                                                                                                                                                      |

## 1. Purpose and Failure Prevented

A branch goes green in CI and a status report says the feature is done. The tests ran against a commit two pushes old, three required checks were skipped, and nothing was ever observed in production. Every sentence in the report was technically traceable to something, and the conclusion was still false. This contract defines what counts as proof, for which exact code, and makes "unknown" stay unknown.

## 2. Scope

This contract owns:

- Evidence states
- Evidence records
- Test-layer obligations
- Gate semantics

This contract does not own:

- Release mechanics (C52)
- Runtime telemetry (C53)

Related contracts: C00, C52, C53.

## 3. Definitions

| Term          | Meaning                                                               |
| ------------- | --------------------------------------------------------------------- |
| PROVEN        | Evidence for the exact candidate demonstrates the requirement is met. |
| BLOCKED       | Evidence cannot be produced because a named dependency is missing.    |
| UNKNOWN       | No adequate evidence exists.                                          |
| CONTRADICTORY | Evidence sources disagree.                                            |
| Candidate     | The exact source SHA under evaluation.                                |

## 4. Requirements

The keywords MUST, MUST NOT, SHOULD, and MAY are used in the RFC 2119 sense. Requirement IDs are stable and MUST NOT be renumbered or reused.

- **EVD-1** — Every evidence-bearing claim MUST carry exactly one of: PROVEN, BLOCKED, UNKNOWN, CONTRADICTORY.
- **EVD-2** — UNKNOWN, BLOCKED, and CONTRADICTORY MUST NOT be reported or treated as pass.
- **EVD-3** — Component behavior claims MUST be supported by unit tests.
- **EVD-4** — Boundary claims MUST be supported by contract tests.
- **EVD-5** — Claims about components working together MUST be supported by integration tests.
- **EVD-6** — Every forbidden behavior in an `active` contract MUST have a negative test.
- **EVD-7** — User-journey claims MUST be supported by end-to-end tests of that journey.
- **EVD-8** — Isolation claims MUST be supported by tenant A/B tests.
- **EVD-9** — Session isolation claims MUST be supported by cross-session tests.
- **EVD-10** — Every evidence record MUST identify the exact source SHA tested, the environment, the command, the timestamp, and the result.
- **EVD-11** — Evidence from a different SHA MUST NOT prove the candidate.
- **EVD-12** — CI success MUST be described only as tests passing for that SHA, not as production conformance.
- **EVD-13** — Runtime claims MUST be supported by runtime evidence from the named environment.
- **EVD-14** — A skipped required check MUST count as not passed.
- **EVD-15** — Required gates MUST fail closed when their evidence is missing, stale, or unreadable.
- **EVD-16** — For contracts the owner designates as high-risk (see OQ-EVD-1; value Not yet verified), verification MUST be performed by someone other than the implementer.

## 5. Acceptance Cases

| Case     | Proves                                          | Setup                                                                                            | Expected                                           |
| -------- | ----------------------------------------------- | ------------------------------------------------------------------------------------------------ | -------------------------------------------------- |
| EVD-AC-1 | EVD-1, EVD-2                                    | Gate evaluator fed UNKNOWN, BLOCKED, CONTRADICTORY inputs                                        | Gate does not pass                                 |
| EVD-AC-2 | EVD-3, EVD-4, EVD-5, EVD-6, EVD-7, EVD-8, EVD-9 | Traceability check: each `active` requirement ID maps to at least one test of the required layer | Unmapped IDs fail the check                        |
| EVD-AC-3 | EVD-10, EVD-11                                  | Submit evidence recorded at SHA X for candidate Y                                                | Rejected                                           |
| EVD-AC-4 | EVD-12, EVD-13                                  | Review of status and release records                                                             | Manual evidence: no production claim cites only CI |
| EVD-AC-5 | EVD-14                                          | Required check reports skipped                                                                   | Gate fails                                         |
| EVD-AC-6 | EVD-15                                          | Remove evidence file referenced by a gate                                                        | Gate fails                                         |
| EVD-AC-7 | EVD-16                                          | Release record for a designated contract lists implementer = verifier                            | Rejected                                           |

## 6. Open Questions

| ID       | Question                                                                                                                   | Blocks implementation | Affects |
| -------- | -------------------------------------------------------------------------------------------------------------------------- | --------------------- | ------- |
| OQ-EVD-1 | Which contracts are high-risk and require independent verification?                                                        | No                    | EVD-16  |
| OQ-EVD-2 | Where are evidence records stored and for how long?                                                                        | No                    | —       |
| OQ-EVD-3 | How do these four evidence states map to the TOS truth states (verified, declared, inferred, unknown, conflicting, stale)? | No                    | —       |

## 7. Verification Status

| Item                         | State                    | Detail                                                                                                                                                                                                                                                |
| ---------------------------- | ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Target codebase              | verified (limited scope) | `peteywee/teach-v2`, default branch `main` (owner-declared). Cloned 2026-10-03: repository exists and has no commits, so no SHA is anchored. Teach v2 is a new build on these contracts (owner statement, 2026-10-03).                                |
| Legacy repository consulted  | reference only           | `peteywee/teach` `work/TR-0010-production-cutover` at `79fdce5cc3b2` (`main` at `99162f17eace`), read 2026-10-03 for lineage: legacy domain contract JSON files and the Gate A decision record. Legacy code was not inspected and does not govern v2. |
| Implementation conformance   | unknown                  | Not yet verified. No v2 implementation was inspected; the owner states v2 is yet to be built.                                                                                                                                                         |
| Acceptance cases implemented | unknown                  | Not yet verified. No mapping between repository tests and these IDs has been established.                                                                                                                                                             |
| Blocking open questions      | 0 open                   | Contract is `active` with these open. Each blocks implementation of the requirements it affects beyond fail-closed behavior until decided (SYS-34).                                                                                                   |
| Owner approval               | declared                 | Approved by the owner on 2026-10-03 (chat instruction); recorded in `APPROVAL-RECORD.md`. Not yet committed to `peteywee/teach-v2`: no commit was visible on `main` when checked.                                                                     |
| Independent review           | not performed            | Drafted and self-checked by Claude against the contract-authoring checklist only.                                                                                                                                                                     |
| Source of intent             | declared                 | Owner-supplied rebuild proposal (`source/2026-10-03-teach-v2-contract-hierarchy-proposal.md`), consolidated decisions (`source/2026-10-03-teach-rebuild-consolidated-decisions.md`), and legacy Gate A owner decisions (2026-07-22) where cited.      |

## 8. Change Log

| Version | Date       | Change                                                                                                                                                                                          | By               |
| ------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- |
| 0.1.0   | 2026-10-03 | Initial proposed draft from the owner-supplied hierarchy proposal. Not approved.                                                                                                                | Claude (drafter) |
| 0.2.0   | 2026-10-03 | Retargeted to the Teach v2 codebase: legacy `peteywee/teach` is reference only; anchors and paths no longer point into the legacy repository.                                                   | Claude (drafter) |
| 0.3.0   | 2026-10-03 | Anchored to `peteywee/teach-v2` branch `main` (owner-declared); the repository had no commits when cloned on 2026-10-03, so the anchor SHA stays Not yet verified.                              | Claude (drafter) |
| 1.0.0   | 2026-10-03 | Approved by the owner; status changed from `proposed` to `active`. Open questions remain open and block implementation of the requirements they affect (SYS-34) instead of blocking activation. | Claude (drafter) |
