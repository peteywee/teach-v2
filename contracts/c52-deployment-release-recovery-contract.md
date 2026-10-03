<!--tos-doc
{
  "doc_id": "TEACH-CON-C52",
  "class": "contract",
  "version": "1.0.2",
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
    "inheritance": "1.0.1 and 1.0.2 are non-normative governance/baseline cleanup patches; 1.0.0 owner approval remains controlling"
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

# C52 — Deployment, Release & Recovery Contract

| Field              | Value                                                                                                                                                           |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Contract ID        | C52                                                                                                                                                             |
| Group              | C50 Production Proof                                                                                                                                            |
| Governed by        | C00 System Authority                                                                                                                                            |
| Version            | 1.0.2                                                                                                                                                           |
| Status             | `active`                                                                                                                                                        |
| Owner              | Patrick Craven, Top Shelf Service LLC                                                                                                                           |
| Approved by        | Patrick Craven (owner), 2026-10-03 — approval instruction given in chat at 10:47 CDT; transcribed by Claude at the owner's direction — see `APPROVAL-RECORD.md` |
| Requirement prefix | `REL`                                                                                                                                                           |
| Activation         | Required for the core rebuild                                                                                                                                   |
| Legacy lineage     | New.                                                                                                                                                            |
| Supersedes         | None                                                                                                                                                            |
| Superseded by      | None                                                                                                                                                            |
| Created            | 2026-10-03                                                                                                                                                      |
| Last updated       | 2026-10-03                                                                                                                                                      |

## 1. Purpose and Failure Prevented

A deployment is accepted on Monday. On Tuesday two small commits land on the same branch and auto-deploy; nobody re-runs the checks because the release was already "accepted." Wednesday something breaks, and the rollback target is "the last good one," which nobody can identify by SHA, artifact, or migration state. This contract makes a release an exact, frozen bundle of identities and makes rollback name exactly what it restores.

## 2. Scope

This contract owns:

- Release candidate identity
- Release gates
- Production promotion
- Rollback and recovery

This contract does not own:

- Evidence semantics (C51)
- Migration rules (C21)
- Hosting platform choice (see OQ-REL-1; value Not yet verified)

Related contracts: C00, C21, C51.

## 3. Definitions

| Term              | Meaning                                                                                                                            |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Release candidate | The binding of source SHA, build identity, deployment identity, environment, database migration state, and configuration identity. |
| Stale evidence    | Evidence recorded for any binding other than the current candidate.                                                                |

## 4. Requirements

The keywords MUST, MUST NOT, SHOULD, and MAY are used in the RFC 2119 sense. Requirement IDs are stable and MUST NOT be renumbered or reused.

- **REL-1** — A releasable candidate MUST bind source SHA, build identity, deployment identity, environment, database migration state, and configuration identity.
- **REL-2** — The candidate MUST be frozen before release gates run.
- **REL-3** — Required CI MUST be green on the exact candidate SHA.
- **REL-4** — A required gate MUST NOT be skipped.
- **REL-5** — Migration state MUST be reconciled per C21.
- **REL-6** — Production configuration MUST be validated for the candidate (see OQ-REL-2; value Not yet verified).
- **REL-7** — Health and readiness MUST pass on the deployed candidate.
- **REL-8** — A deployed smoke test MUST pass on the candidate (see OQ-REL-3; value Not yet verified).
- **REL-9** — Canonical runtime readback MUST confirm the deployed identity equals the candidate.
- **REL-10** — A rollback path MUST exist and be named before promotion.
- **REL-11** — Releases that change data MUST have backup and restore proof per C21.
- **REL-12** — Production promotion MUST require explicit owner approval.
- **REL-13** — An accepted production release MUST NOT receive unverified commits; any new commit MUST create a new candidate.
- **REL-14** — Evidence MUST become stale when any element of the candidate binding changes.
- **REL-15** — A rollback MUST identify exactly the candidate binding being restored.
- **REL-16** — Deployment success alone MUST NOT be reported as product success.

## 5. Acceptance Cases

| Case     | Proves               | Setup                                                                                   | Expected                                                            |
| -------- | -------------------- | --------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| REL-AC-1 | REL-1, REL-2, REL-14 | Change configuration after gates pass                                                   | Candidate invalidated; gates must re-run                            |
| REL-AC-2 | REL-3, REL-4         | Candidate with one skipped required check                                               | Promotion blocked                                                   |
| REL-AC-3 | REL-5, REL-11        | Candidate with pending migration and no backup proof                                    | Promotion blocked                                                   |
| REL-AC-4 | REL-6                | Candidate with missing required production config value                                 | Promotion blocked                                                   |
| REL-AC-5 | REL-7, REL-8, REL-9  | Deploy candidate; deployed SHA reported by runtime differs from candidate (test double) | Promotion blocked                                                   |
| REL-AC-6 | REL-10, REL-15       | Release record without named rollback binding                                           | Promotion blocked                                                   |
| REL-AC-7 | REL-12               | Promotion attempted without owner approval record                                       | Blocked                                                             |
| REL-AC-8 | REL-13               | Push commit to the production branch after acceptance                                   | New candidate created; production not updated until gates pass      |
| REL-AC-9 | REL-16               | Review of release communications                                                        | Manual evidence: no product-success claim based on deployment alone |

## 6. Open Questions

| ID       | Question                                                                            | Blocks implementation | Affects |
| -------- | ----------------------------------------------------------------------------------- | --------------------- | ------- |
| OQ-REL-1 | Which hosting platform(s) are approved for v2 web and API?                          | No                    | —       |
| OQ-REL-2 | How is configuration identity computed and recorded without exposing secret values? | Yes                   | REL-6   |
| OQ-REL-3 | What does the deployed smoke test cover?                                            | No                    | REL-8   |
| OQ-REL-4 | How long after promotion is rollback to the prior candidate supported?              | No                    | —       |

## 7. Verification Status

| Item                         | State                    | Detail                                                                                                                                                                                                                                                |
| ---------------------------- | ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Target codebase              | verified (limited scope) | `peteywee/teach-v2`, default branch `main` (owner-declared). Cloned 2026-10-03: repository exists and has no commits, so no SHA is anchored. Teach v2 is a new build on these contracts (owner statement, 2026-10-03).                                |
| Legacy repository consulted  | reference only           | `peteywee/teach` `work/TR-0010-production-cutover` at `79fdce5cc3b2` (`main` at `99162f17eace`), read 2026-10-03 for lineage: legacy domain contract JSON files and the Gate A decision record. Legacy code was not inspected and does not govern v2. |
| Implementation conformance   | unknown                  | Not yet verified. No v2 implementation was inspected; the owner states v2 is yet to be built.                                                                                                                                                         |
| Acceptance cases implemented | unknown                  | Not yet verified. No mapping between repository tests and these IDs has been established.                                                                                                                                                             |
| Blocking open questions      | 1 open                   | Contract is `active` with these open. Each blocks implementation of the requirements it affects beyond fail-closed behavior until decided (SYS-34).                                                                                                   |
| Owner approval               | declared                 | Approved by the owner on 2026-10-03; recorded in `APPROVAL-RECORD.md`. Initial owner-approval baseline is commit `2c9b1c849a520ba817efc91150be9a37797f4238`; this 1.0.2 revision is tracked by Git history.                                                                     |
| Independent review           | not performed            | Drafted and self-checked by Claude against the contract-authoring checklist only.                                                                                                                                                                     |
| Source of intent             | declared                 | Owner-supplied rebuild proposal (`source/2026-10-03-teach-v2-contract-hierarchy-proposal.md`), consolidated decisions (`source/2026-10-03-teach-rebuild-consolidated-decisions.md`), and legacy Gate A owner decisions (2026-07-22) where cited.      |

## 8. Change Log

| Version | Date       | Change                                                                                                                                                                                          | By               |
| ------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- |
| 0.1.0   | 2026-10-03 | Initial proposed draft from the owner-supplied hierarchy proposal. Not approved.                                                                                                                | Claude (drafter) |
| 0.2.0   | 2026-10-03 | Retargeted to the Teach v2 codebase: legacy `peteywee/teach` is reference only; anchors and paths no longer point into the legacy repository.                                                   | Claude (drafter) |
| 0.3.0   | 2026-10-03 | Anchored to `peteywee/teach-v2` branch `main` (owner-declared); the repository had no commits when cloned on 2026-10-03, so the anchor SHA stays Not yet verified.                              | Claude (drafter) |
| 1.0.0   | 2026-10-03 | Approved by the owner; status changed from `proposed` to `active`. Open questions remain open and block implementation of the requirements they affect (SYS-34) instead of blocking activation. | Claude (drafter) |
| 1.0.1   | 2026-10-03 | Non-normative document-governance metadata/provenance normalization; 1.0.0 owner approval remained controlling. | ChatGPT (governance) |
| 1.0.2   | 2026-10-03 | Non-normative baseline cleanup: corrected stale current-status provenance after the contract spine was committed; no behavioral requirement changed. | ChatGPT (governance) |
