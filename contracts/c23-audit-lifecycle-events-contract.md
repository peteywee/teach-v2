<!--tos-doc
{
  "doc_id": "TEACH-CON-C23",
  "class": "contract",
  "version": "1.2.0",
  "claims_truth_state": "declared",
  "status": "active",
  "owner": "Patrick Craven, Top Shelf Service LLC",
  "created_on": "2026-10-03",
  "updated_on": "2026-10-05",
  "effective_on": "2026-10-05",
  "approval": {
    "state": "approved",
    "approved_version": "1.2.0",
    "approved_on": "2026-10-05",
    "record": "contracts/APPROVAL-RECORD.md",
    "basis": "Owner manifest-bound decision-closure r3.1 approval under SYS-21 #75; sha256:ff7b51df1e3a235e9d226d9d7232f81c64bbeb451b359b6e0f2ea232b6e1757c"
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
    "TEACH-CON-C23@1.0.3",
    "TEACH-CON-C23@1.1.0"
  ],
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
| Version | 1.2.0 |
| Status             | `active`                                                                                                                                                        |
| Owner              | Patrick Craven, Top Shelf Service LLC                                                                                                                           |
| Approved by | Patrick Craven (owner), 2026-10-05; manifest-bound decision-closure r3.1, SYS-21 #75; see `APPROVAL-RECORD.md` |
| Requirement prefix | `AUD`                                                                                                                                                           |
| Activation         | Required for the core rebuild                                                                                                                                   |
| Legacy lineage     | Reference only — reworks legacy `.topshelf/contracts/domain/analytics-audit.json` (audit half); analytics moves to C61.                                         |
| Supersedes | 1.1.0 |
| Superseded by      | None                                                                                                                                                            |
| Created            | 2026-10-03                                                                                                                                                      |
| Last updated | 2026-10-05 |

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
- **AUD-7** — Identity, Membership, Assignment and Certification state MUST be reconstructable from lifecycle history; every transition appends its LifecycleEvent in the same transaction and replay MUST equal current lifecycle fields. Projections remain separate from canonical state. See `governance/decision-closure/07-evidence-release-operations-spec.md`. (OQ-AUD-2 resolved 2026-10-05).
- **AUD-8** — Capability, tenant-scope, target-scope, credential-abuse and Origin denials MUST be recorded separately from successful mutations; validation errors and plain unauthenticated requests are excluded. Records contain only the specified redacted fields, deduplicate per actor/IP-prefix, class, operation and 5-minute bucket, cap at 100 rows per actor/hour and record one overflow row/hour. Audit immutability and one-year retention remain binding. See `governance/decision-closure/07-evidence-release-operations-spec.md`. (OQ-AUD-3 resolved 2026-10-05).
- **AUD-9** — Audit records MUST NOT be analytics events; they MUST be stored and transported separately, and analytics failure MUST NOT affect audit writes.
- **AUD-10** — Reading audit records MUST require an audit-read capability and MUST be tenant-scoped per C13 and C14.

- **AUD-11** — The audit-retention policy MUST be one year, fixed centrally, with no tenant overrides. Selecting this duration MUST NOT authorize audit deletion or weaken AUD-4/AUD-6. Audit deletion remains BLOCKED; the retention clock, privileged expiry mechanism and conformance evidence require a separate implementation/admission review. C15 privacy/exemption drafts do not become approved through this selection.

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
| AUD-AC-9 | AUD-4, AUD-6, AUD-11 | Review retention policy; attempt tenant override or application DELETE; inspect expiry mechanism evidence | One-year central policy; tenant overrides and application deletion denied; deletion remains BLOCKED and absent retention mechanism remains UNKNOWN |

## 6. Open Questions

| ID       | Question                                                                         | Blocks implementation | Affects |
| -------- | -------------------------------------------------------------------------------- | --------------------- | ------- |
| OQ-AUD-1 | Resolved: one-year audit retention; fixed central policy with no tenant overrides. Audit deletion remains BLOCKED. | No (resolved) | — |
| OQ-AUD-2 | **Resolved.** Owner, 2026-10-05: Identity, Membership, Assignment and Certification state MUST be reconstructable from lifecycle history; every transition appends its LifecycleEvent in the same transaction and replay MUST equal current lifecycle fields. Projections remain separate from canonical state. See `governance/decision-closure/07-evidence-release-operations-spec.md`. (Decision-closure r3.1) | No (resolved) | AUD-7 |
| OQ-AUD-3 | **Resolved.** Owner, 2026-10-05: Capability, tenant-scope, target-scope, credential-abuse and Origin denials MUST be recorded separately from successful mutations; validation errors and plain unauthenticated requests are excluded. Records contain only the specified redacted fields, deduplicate per actor/IP-prefix, class, operation and 5-minute bucket, cap at 100 rows per actor/hour and record one overflow row/hour. Audit immutability and one-year retention remain binding. See `governance/decision-closure/07-evidence-release-operations-spec.md`. (Decision-closure r3.1) | No (resolved) | AUD-8 |

## 7. Verification Status

| Item                         | State                    | Detail                                                                                                                                                                                                                                                |
| ---------------------------- | ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Target codebase | verified (limited scope) | Consulted current V2 main 3fe92889aa55fa4a69d3b1e28c3a1211719b1b3f: foundation source and governance inspected for issue #66. Source inspection is not deployed conformance. |
| Legacy repository consulted | reference only | Historical lineage is preserved in the superseded version and pinned V1 recovery records. No V1 policy/grants are adopted by issue #66; the new capability matrix is governed separately by #67. |
| Implementation conformance | partial foundations / UNKNOWN runtime | Required-audit Application ports and Identity/session transaction mechanics have unit/disposable PostgreSQL probe evidence. Admitted AuditEvent storage, real append adapter and one-year retention clock/executor evidence remain absent or UNKNOWN; deletion BLOCKED. |
| Acceptance cases implemented | structural / UNKNOWN operational | Existing transaction probe tests prove mechanics only. AUD-AC-9 policy/permission declarations are structural; real audit persistence privileges and retention enforcement remain UNKNOWN. |
| Blocking open questions | 0 open | Only unresolved question rows govern blocking; registration is not implementation evidence |
| Owner approval | declared | 1.2.0 owner approval recorded in APPROVAL-RECORD.md under #75; runtime implementation conformance remains UNKNOWN |
| Independent review | not performed | No independent reviewer is claimed for this revision; self-audit supplements review and does not replace independent verification. |
| Source of intent | declared | Explicit owner policy selections supplied on 2026-10-04 America/Chicago, recorded through issue #66 and APPROVAL-RECORD.md. Other attachment recommendations/drafts remain unapproved. |

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
| 1.1.0 | 2026-10-04 | Record owner-selected OQ-AUD-1 policy values, append requirement/acceptance cases and preserve prior version; SYS-21 #66. No runtime implementation or production permission. | Patrick Craven (owner selection) |
| 1.2.0 | 2026-10-05 | Register OQ-AUD-2, OQ-AUD-3; preserve named residuals and existing requirement/acceptance IDs. Decision-closure r3.1 manifest sha256:ff7b51df1e3a235e9d226d9d7232f81c64bbeb451b359b6e0f2ea232b6e1757c; SYS-21 #75. | Patrick Craven (owner); ChatGPT (recorder) |
