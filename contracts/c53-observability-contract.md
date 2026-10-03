<!--tos-doc
{
  "doc_id": "TEACH-CON-C53",
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

# C53 — Observability Contract

| Field              | Value                                                                                                                                                           |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Contract ID        | C53                                                                                                                                                             |
| Group              | C50 Production Proof                                                                                                                                            |
| Governed by        | C00 System Authority                                                                                                                                            |
| Version            | 1.0.0                                                                                                                                                           |
| Status             | `active`                                                                                                                                                        |
| Owner              | Patrick Craven, Top Shelf Service LLC                                                                                                                           |
| Approved by        | Patrick Craven (owner), 2026-10-03 — approval instruction given in chat at 10:47 CDT; transcribed by Claude at the owner's direction — see `APPROVAL-RECORD.md` |
| Requirement prefix | `OBS`                                                                                                                                                           |
| Activation         | Required for the core rebuild                                                                                                                                   |
| Legacy lineage     | New.                                                                                                                                                            |
| Supersedes         | None                                                                                                                                                            |
| Superseded by      | None                                                                                                                                                            |
| Created            | 2026-10-03                                                                                                                                                      |
| Last updated       | 2026-10-03                                                                                                                                                      |

## 1. Purpose and Failure Prevented

Production returns errors for twenty minutes and nobody knows until a manager texts. When someone looks, the health endpoint said "ok" the whole time because it only checked that the process was running, and the logs that would explain the failure also contain session tokens. This contract separates "the process is up" from "the app can serve," makes errors visible, and keeps secrets out of the diagnostic trail.

## 2. Scope

This contract owns:

- Request/correlation IDs
- Error capture
- Health and readiness semantics
- Alerts
- Log content rules

This contract does not own:

- Audit records (C23)
- Analytics (C61)

Related contracts: C00, C23, C61.

## 3. Definitions

| Term      | Meaning                                                                     |
| --------- | --------------------------------------------------------------------------- |
| Health    | Whether the process is running and able to respond.                         |
| Readiness | Whether the dependencies the process needs to serve requests are available. |

## 4. Requirements

The keywords MUST, MUST NOT, SHOULD, and MAY are used in the RFC 2119 sense. Requirement IDs are stable and MUST NOT be renumbered or reused.

- **OBS-1** — Every request MUST receive a correlation/request ID that is returned in the response.
- **OBS-2** — Production errors MUST be captured in an owner-approved error store (see OQ-OBS-1; value Not yet verified).
- **OBS-3** — The health signal MUST report process availability only.
- **OBS-4** — The readiness signal MUST report dependency readiness and MUST fail when a required dependency is unavailable.
- **OBS-5** — Every alert MUST correspond to a condition with a documented action.
- **OBS-6** — Logs MUST NOT contain passwords, PINs, session credentials, single-use tokens, or secrets.
- **OBS-7** — Logs MUST NOT contain protected learner data beyond what diagnosis requires (see OQ-OBS-2; value Not yet verified).
- **OBS-8** — Security-sensitive failures MUST be logged with enough context to diagnose (request ID, operation, denial reason class) without protected details.
- **OBS-9** — Critical external integrations MUST expose failure and reconciliation state.
- **OBS-10** — Observability failures MUST NOT alter authorization decisions or request outcomes.

## 5. Acceptance Cases

| Case     | Proves       | Setup                                                                 | Expected                                                      |
| -------- | ------------ | --------------------------------------------------------------------- | ------------------------------------------------------------- |
| OBS-AC-1 | OBS-1        | Send request                                                          | Response header carries ID; same ID in logs                   |
| OBS-AC-2 | OBS-2        | Throw a test error in production-mode staging                         | Error appears in the error store with request ID              |
| OBS-AC-3 | OBS-3, OBS-4 | Stop the database                                                     | Health passes; readiness fails                                |
| OBS-AC-4 | OBS-5        | Alert inventory review                                                | Manual evidence: every alert links to an action               |
| OBS-AC-5 | OBS-6, OBS-7 | Run credential and learning flows with log capture; scan for canaries | No canaries                                                   |
| OBS-AC-6 | OBS-8        | Trigger denials                                                       | Logs include ID, operation, reason class; no protected fields |
| OBS-AC-7 | OBS-9        | Force provider failure                                                | Integration state exposed as failed/needs reconciliation      |
| OBS-AC-8 | OBS-10       | Make the log/error sink unavailable; run the authorization matrix     | Identical outcomes                                            |

## 6. Open Questions

| ID       | Question                                                                         | Blocks implementation | Affects |
| -------- | -------------------------------------------------------------------------------- | --------------------- | ------- |
| OQ-OBS-1 | Which error-capture and alerting providers are approved, and where do alerts go? | No                    | OBS-2   |
| OQ-OBS-2 | Which learner fields, if any, may appear in logs?                                | No                    | OBS-7   |
| OQ-OBS-3 | How long are logs retained?                                                      | No                    | —       |

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
