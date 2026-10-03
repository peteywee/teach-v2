<!--tos-doc
{
  "doc_id": "TEACH-CON-C23",
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

# C23 — Audit & Lifecycle Events Contract

| Field              | Value                                                                                                                                                           |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Contract ID        | C23                                                                                                                                                             |
| Group              | C20 Data Correctness                                                                                                                                            |
| Governed by        | C00 System Authority                                                                                                                                            |
| Version            | 1.0.2                                                                                                                                                           |
| Status             | `active`                                                                                                                                                        |
| Owner              | Patrick Craven, Top Shelf Service LLC                                                                                                                           |
| Approved by        | Patrick Craven (owner), 2026-10-03 — approval instruction given in chat at 10:47 CDT; transcribed by Claude at the owner's direction — see `APPROVAL-RECORD.md` |
| Requirement prefix | `AUD`                                                                                                                                                           |
| Activation         | Required for the core rebuild                                                                                                                                   |
| Legacy lineage     | Reference only — reworks legacy `.topshelf/contracts/domain/analytics-audit.json` (audit half); analytics moves to C61.                                         |
| Supersedes         | None                                                                                                                                                            |
| Superseded by      | None                                                                                                                                                            |
| Created            | 2026-10-03                                                                                                                                                      |
| Last updated       | 2026-10-03                                                                                                                                                      |

## 1. Purpose and Failure Prevented

An employee is offboarded, a certification is revoked, and a manager's access changes, and when the customer asks who did what and when, the only record is an analytics event that may or may not have been sent, sitting next to page-view counts. Or the action committed and its audit row failed silently. This contract makes the audit record part of the same commit as the action it describes, and keeps it separate from analytics.

## 2. Scope

This contract owns:

- Audit records
- Identity lifecycle event history
- Audit read access

This contract does not own:

- Analytics events (C61)
- Operational logs (C53)

Related contracts: C00, C11, C13, C14, C15, C33, C34, C53, C61, C63.

## 3. Definitions

| Term                        | Meaning                                                                                                                                                                                                                                         |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Security-sensitive mutation | Identity lifecycle changes (C11), membership changes (C13), role or capability grant changes (C14), content assignment (C33), certification issue and revoke (C34), privacy request state changes (C15), and billing entitlement changes (C63). |
| Audit record                | An immutable record of a security-sensitive mutation or a recorded denial.                                                                                                                                                                      |

## 4. Requirements

The keywords MUST, MUST NOT, SHOULD, and MAY are used in the RFC 2119 sense. Requirement IDs are stable and MUST NOT be renumbered or reused.

- **AUD-1** — Every security-sensitive mutation MUST produce an audit record.
- **AUD-2** — The mutation and its required audit record MUST commit in the same transaction; if the audit write fails, the mutation MUST roll back.
- **AUD-3** — Each audit record MUST contain: actor, action, target, organization, location when applicable, request or idempotency identity, timestamp, and result.
- **AUD-4** — Audit records MUST NOT be updated or deleted through application paths, enforced at the persistence layer (privileges or equivalent), not by convention.
- **AUD-5** — Audit records MUST NOT contain passwords, PINs, session credentials, raw single-use tokens, or secrets.
- **AUD-6** — Identity lifecycle events MUST be append-only.
- **AUD-7** — For entities the owner designates (see OQ-AUD-2; value Not yet verified), current state MUST be explainable from lifecycle history.
- **AUD-8** — Operationally significant authorization denials MUST be recordable and distinguishable from successful mutations (see OQ-AUD-3; value Not yet verified).
- **AUD-9** — Audit records MUST NOT be analytics events; they MUST be stored and transported separately, and analytics failure MUST NOT affect audit writes.
- **AUD-10** — Reading audit records MUST require an audit-read capability and MUST be tenant-scoped per C13 and C14.

## 5. Acceptance Cases

| Case     | Proves       | Setup                                                                          | Expected                                                    |
| -------- | ------------ | ------------------------------------------------------------------------------ | ----------------------------------------------------------- |
| AUD-AC-1 | AUD-1, AUD-3 | Perform each security-sensitive mutation                                       | Exactly one audit record each, all fields present           |
| AUD-AC-2 | AUD-2        | Force audit insert failure during each mutation type                           | Mutation rolled back                                        |
| AUD-AC-3 | AUD-4, AUD-6 | Attempt UPDATE/DELETE on audit and lifecycle tables using the application role | Permission denied                                           |
| AUD-AC-4 | AUD-5        | Scan audit records after credential and token flows for seeded canaries        | No canaries present                                         |
| AUD-AC-5 | AUD-7        | Replay lifecycle history for a designated entity                               | Derived state equals current state                          |
| AUD-AC-6 | AUD-8        | Trigger designated denial types                                                | Recorded with result = denied, distinguishable from success |
| AUD-AC-7 | AUD-9        | Disable analytics pipeline; perform audited mutations                          | Audit writes succeed; no audit records in analytics store   |
| AUD-AC-8 | AUD-10       | Tenant A actor with and without audit capability reads audit                   | Without: 403; with: only tenant A records                   |

## 6. Open Questions

| ID       | Question                                                                         | Blocks implementation | Affects |
| -------- | -------------------------------------------------------------------------------- | --------------------- | ------- |
| OQ-AUD-1 | How long are audit records retained, and is retention per tenant configurable?   | Yes                   | —       |
| OQ-AUD-2 | For which entities must current state be reconstructable from lifecycle history? | No                    | AUD-7   |
| OQ-AUD-3 | Which denial types are operationally significant enough to record?               | No                    | AUD-8   |

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
| 0.2.0   | 2026-10-03 | Group renamed to C20 Data Correctness. No requirement changes.                                                                                                                                  | Claude (drafter) |
| 0.3.0   | 2026-10-03 | Retargeted to the Teach v2 codebase: legacy `peteywee/teach` is reference only; anchors and paths no longer point into the legacy repository.                                                   | Claude (drafter) |
| 0.4.0   | 2026-10-03 | Anchored to `peteywee/teach-v2` branch `main` (owner-declared); the repository had no commits when cloned on 2026-10-03, so the anchor SHA stays Not yet verified.                              | Claude (drafter) |
| 1.0.0   | 2026-10-03 | Approved by the owner; status changed from `proposed` to `active`. Open questions remain open and block implementation of the requirements they affect (SYS-34) instead of blocking activation. | Claude (drafter) |
| 1.0.1   | 2026-10-03 | Non-normative document-governance metadata/provenance normalization; 1.0.0 owner approval remained controlling. | ChatGPT (governance) |
| 1.0.2   | 2026-10-03 | Non-normative baseline cleanup: corrected stale current-status provenance after the contract spine was committed; no behavioral requirement changed. | ChatGPT (governance) |
