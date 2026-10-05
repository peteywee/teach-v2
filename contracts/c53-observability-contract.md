<!--tos-doc
{
  "doc_id": "TEACH-CON-C53",
  "class": "contract",
  "version": "1.1.0",
  "claims_truth_state": "declared",
  "status": "active",
  "owner": "Patrick Craven, Top Shelf Service LLC",
  "created_on": "2026-10-03",
  "updated_on": "2026-10-04",
  "effective_on": "2026-10-03",
  "approval": {
    "state": "approved",
    "approved_version": "1.1.0",
    "approved_on": "2026-10-04",
    "record": "contracts/APPROVAL-RECORD.md",
    "basis": "Explicit owner-selected policy values in chat; SYS-21 issue #66; implementation conformance remains separate"
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
    "TEACH-CON-C53@1.0.3"
  ],
  "superseded_by": null,
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
| Version | 1.1.0 |
| Status             | `active`                                                                                                                                                        |
| Owner              | Patrick Craven, Top Shelf Service LLC                                                                                                                           |
| Approved by | Patrick Craven (owner), 2026-10-04 — selected policy values; SYS-21 issue #66 |
| Requirement prefix | `OBS`                                                                                                                                                           |
| Activation         | Required for the core rebuild                                                                                                                                   |
| Legacy lineage     | New.                                                                                                                                                            |
| Supersedes | C53 1.0.3 |
| Superseded by      | None                                                                                                                                                            |
| Created            | 2026-10-03                                                                                                                                                      |
| Last updated | 2026-10-04 |

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

- **OBS-11** — The operational-log retention policy MUST be 90 days and MUST remain distinct from canonical audit retention. A provider default with a shorter horizon MUST NOT establish conformance; a selected sink/archive and executable retention mechanism require evidence. Provider selection, alert destination and analytics activation remain separate owner gates.

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
| OBS-AC-9 | OBS-11 | Evaluate a sink with less than 90-day retention and inspect archive/enforcement evidence | Shorter provider defaults cannot establish conformance; missing 90-day mechanism is UNKNOWN and blocks the affected release claim; audit storage remains separate |

## 6. Open Questions

| ID       | Question                                                                         | Blocks implementation | Affects |
| -------- | -------------------------------------------------------------------------------- | --------------------- | ------- |
| OQ-OBS-1 | Which error-capture and alerting providers are approved, and where do alerts go? | No                    | OBS-2   |
| OQ-OBS-2 | Which learner fields, if any, may appear in logs?                                | No                    | OBS-7   |
| OQ-OBS-3 | Resolved: operational logs retained for 90 days, separately from the one-year canonical audit-retention policy. Provider/archival mechanism proof remains UNKNOWN. | No (resolved) | — |

## 7. Verification Status

| Item                         | State                    | Detail                                                                                                                                                                                                                                                |
| ---------------------------- | ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Target codebase | verified (limited scope) | Consulted current V2 main 3fe92889aa55fa4a69d3b1e28c3a1211719b1b3f: foundation source and governance inspected for issue #66. Source inspection is not deployed conformance. |
| Legacy repository consulted | reference only | Historical lineage is preserved in the superseded version and pinned V1 recovery records. No V1 policy/grants are adopted by issue #66; the new capability matrix is governed separately by #67. |
| Implementation conformance | partial foundations / UNKNOWN runtime | Development self-audit exists and is separate from product observability. Runtime request/health/readiness/error/alert/log sinks, provider/archive selection and executable 90-day retention proof remain absent or UNKNOWN. Analytics remains unapproved. |
| Acceptance cases implemented | structural / UNKNOWN operational | OBS-AC-9 policy/acceptance declarations are checked structurally; runtime log retention, sink failures, correlation/redaction and alert acceptance remain UNKNOWN. |
| Blocking open questions      | 0 open                   | Contract is `active` with these open. Each blocks implementation of the requirements it affects beyond fail-closed behavior until decided (SYS-34).                                                                                                   |
| Owner approval | declared | 1.1.0 approved policy selections recorded under #66; no runtime conformance, provisioning, deletion or production authority is inferred. |
| Independent review | not performed | No independent reviewer is claimed for this revision; self-audit supplements review and does not replace independent verification. |
| Source of intent | declared | Explicit owner policy selections supplied on 2026-10-04 America/Chicago, recorded through issue #66 and APPROVAL-RECORD.md. Other attachment recommendations/drafts remain unapproved. |

## 8. Change Log

| Version | Date | Change | By |
| ------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- |
| 0.1.0   | 2026-10-03 | Initial proposed draft from the owner-supplied hierarchy proposal. Not approved.                                                                                                                | Claude (drafter) |
| 0.2.0   | 2026-10-03 | Retargeted to the Teach v2 codebase: legacy `peteywee/teach` is reference only; anchors and paths no longer point into the legacy repository.                                                   | Claude (drafter) |
| 0.3.0   | 2026-10-03 | Anchored to `peteywee/teach-v2` branch `main` (owner-declared); the repository had no commits when cloned on 2026-10-03, so the anchor SHA stays Not yet verified.                              | Claude (drafter) |
| 1.0.0   | 2026-10-03 | Approved by the owner; status changed from `proposed` to `active`. Open questions remain open and block implementation of the requirements they affect (SYS-34) instead of blocking activation. | Claude (drafter) |
| 1.0.1   | 2026-10-03 | Non-normative document-governance metadata/provenance normalization; 1.0.0 owner approval remained controlling. | ChatGPT (governance) |
| 1.0.2   | 2026-10-03 | Non-normative baseline cleanup: corrected stale current-status provenance after the contract spine was committed; no behavioral requirement changed. | ChatGPT (governance) |
| 1.0.3   | 2026-10-03 | Non-normative truth-state cleanup: verification status now anchors the live v2 repository through governance baseline `292e8da9123987e9d94f09669c7bc6b6d43c4320`; no behavioral requirement changed. | ChatGPT (governance) |
| 1.1.0 | 2026-10-04 | Record owner-selected OQ-OBS-3 policy values, append requirement/acceptance cases and preserve prior version; SYS-21 #66. No runtime implementation or production permission. | Patrick Craven (owner selection) |
