<!--tos-doc
{
  "doc_id": "TEACH-CON-C33",
  "class": "contract",
  "claims_truth_state": "declared",
  "status": "active",
  "written_against": {
    "repo": "peteywee/teach-v2",
    "ref": "main",
    "head_sha": "Not yet verified",
    "note": "repository had no commits when cloned 2026-10-03"
  },
  "legacy_reference": {
    "repo": "peteywee/teach",
    "ref": "work/TR-0010-production-cutover",
    "head_sha": "79fdce5cc3b207750888e5c2c1c198159ad17077",
    "use": "reference only; does not govern and is not governed by this contract"
  },
  "depends_on": [
    "contracts/"
  ]
}
-->

# C33 — Manager Operations Contract

| Field              | Value                                                                                                                                                           |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Contract ID        | C33                                                                                                                                                             |
| Group              | C30 Product Semantics                                                                                                                                           |
| Governed by        | C00 System Authority                                                                                                                                            |
| Version            | 1.0.0                                                                                                                                                           |
| Status             | `active`                                                                                                                                                        |
| Owner              | Patrick Craven, Top Shelf Service LLC                                                                                                                           |
| Approved by        | Patrick Craven (owner), 2026-10-03 — approval instruction given in chat at 10:47 CDT; transcribed by Claude at the owner's direction — see `APPROVAL-RECORD.md` |
| Requirement prefix | `MGR`                                                                                                                                                           |
| Activation         | Required for the core rebuild                                                                                                                                   |
| Legacy lineage     | Reference only — reworks legacy `.topshelf/contracts/domain/manager-operations.json` (operations half); certification moves to C34.                             |
| Supersedes         | None                                                                                                                                                            |
| Superseded by      | None                                                                                                                                                            |
| Created            | 2026-10-03                                                                                                                                                      |
| Last updated       | 2026-10-03                                                                                                                                                      |

## 1. Purpose and Failure Prevented

A manager's dashboard is built with its own idea of who the manager can see, separate from the API's. The two drift: the screen shows a cook from another location, or a cook the manager can see is one the API would refuse. Meanwhile the dashboard shows progress numbers computed in the browser. This contract keeps the manager surface as a view over authoritative data and capabilities, never a second authorization system.

## 2. Scope

This contract owns:

- Manager team views
- Content assignment operations
- Manager-initiated setup and offboarding requests

This contract does not own:

- Identity lifecycle execution (C11)
- Capabilities (C14)
- Learner progress (C32)
- Certification (C34)

Related contracts: C00, C11, C14, C23, C32, C34.

## 3. Definitions

| Term       | Meaning                                                                                                        |
| ---------- | -------------------------------------------------------------------------------------------------------------- |
| Manager    | An actor holding manager capabilities within a scope. Being someone's reporting manager is not the same thing. |
| Assignment | The scoped act of making a content version available to a learner.                                             |

## 4. Requirements

The keywords MUST, MUST NOT, SHOULD, and MAY are used in the RFC 2119 sense. Requirement IDs are stable and MUST NOT be renumbered or reused.

- **MGR-1** — Manager capability MUST be separate from reporting relationships.
- **MGR-2** — Managers MUST act only within their authorized organization and location scope.
- **MGR-3** — Reporting relationships MAY narrow which learners a manager can see and MUST NOT grant capabilities (see OQ-MGR-1; value Not yet verified).
- **MGR-4** — Team reads MUST derive from authoritative membership and scope.
- **MGR-5** — Each manager action MUST require its own capability.
- **MGR-6** — Managers MUST see only persisted learner state.
- **MGR-7** — Assignment operations MUST be scoped and MUST produce an audit record per C23.
- **MGR-8** — Manager-initiated offboarding MUST call the canonical identity lifecycle service of C11.
- **MGR-9** — The manager UI MUST NOT implement an authorization model of its own.
- **MGR-10** — Managers MUST NOT be able to create or retrieve employee passwords or PINs.

## 5. Acceptance Cases

| Case     | Proves       | Setup                                                                                     | Expected                                            |
| -------- | ------------ | ----------------------------------------------------------------------------------------- | --------------------------------------------------- |
| MGR-AC-1 | MGR-1, MGR-3 | Actor with reports but no manager capability; manager with capability and limited reports | First: 403; second: sees only reports in scope      |
| MGR-AC-2 | MGR-2, MGR-4 | Manager lists team in two-location fixture                                                | Only in-scope members                               |
| MGR-AC-3 | MGR-5        | Manager holding view capability but not assign/offboard attempts each action              | Each lacking action denied 403                      |
| MGR-AC-4 | MGR-6        | Dashboard for learner with client-only progress fixture                                   | Shows only persisted values                         |
| MGR-AC-5 | MGR-7        | Assign in scope and out of scope                                                          | In-scope succeeds with audit; out-of-scope 404      |
| MGR-AC-6 | MGR-8        | Manager offboards a learner; architecture test                                            | Calls lifecycle service; C11 offboarding cases pass |
| MGR-AC-7 | MGR-9        | Static check of manager UI for permission logic beyond reading API-supplied capabilities  | None found                                          |
| MGR-AC-8 | MGR-10       | Covered by IDN mgr_no_cred cases                                                          | See IDN acceptance cases                            |

## 6. Open Questions

| ID       | Question                                                                                | Blocks implementation | Affects |
| -------- | --------------------------------------------------------------------------------------- | --------------------- | ------- |
| OQ-MGR-1 | Is manager visibility limited to direct reports, the whole location, or configurable?   | Yes                   | MGR-3   |
| OQ-MGR-2 | May managers offboard directly, or only request offboarding for an operator to approve? | No                    | —       |

## 7. Verification Status

| Item                         | State                    | Detail                                                                                                                                                                                                                                                |
| ---------------------------- | ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Target codebase              | verified (limited scope) | `peteywee/teach-v2`, default branch `main` (owner-declared). Cloned 2026-10-03: repository exists and has no commits, so no SHA is anchored. Teach v2 is a new build on these contracts (owner statement, 2026-10-03).                                |
| Legacy repository consulted  | reference only           | `peteywee/teach` `work/TR-0010-production-cutover` at `79fdce5cc3b2` (`main` at `99162f17eace`), read 2026-10-03 for lineage: legacy domain contract JSON files and the Gate A decision record. Legacy code was not inspected and does not govern v2. |
| Implementation conformance   | unknown                  | Not yet verified. No v2 implementation was inspected; the owner states v2 is yet to be built.                                                                                                                                                         |
| Acceptance cases implemented | unknown                  | Not yet verified. No mapping between repository tests and these IDs has been established.                                                                                                                                                             |
| Blocking open questions      | 1 open                   | Contract is `active` with these open. Each blocks implementation of the requirements it affects beyond fail-closed behavior until decided (SYS-34).                                                                                                   |
| Owner approval               | declared                 | Approved by the owner on 2026-10-03 (chat instruction); recorded in `APPROVAL-RECORD.md`. Not yet committed to `peteywee/teach-v2`: no commit was visible on `main` when checked.                                                                     |
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
