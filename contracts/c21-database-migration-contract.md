<!--tos-doc
{
  "doc_id": "TEACH-CON-C21",
  "class": "contract",
  "version": "1.0.3",
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
  "superseded_by": null,
  "depends_on": [
    "contracts/"
  ]
}
-->

# C21 — Database & Migration Contract

| Field              | Value                                                                                                                                                           |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Contract ID        | C21                                                                                                                                                             |
| Group              | C20 Data Correctness                                                                                                                                            |
| Governed by        | C00 System Authority                                                                                                                                            |
| Version            | 1.0.3                                                                                                                                                           |
| Status             | `active`                                                                                                                                                        |
| Owner              | Patrick Craven, Top Shelf Service LLC                                                                                                                           |
| Approved by        | Patrick Craven (owner), 2026-10-03 — approval instruction given in chat at 10:47 CDT; transcribed by Claude at the owner's direction — see `APPROVAL-RECORD.md` |
| Requirement prefix | `MIG`                                                                                                                                                           |
| Activation         | Required for the core rebuild                                                                                                                                   |
| Legacy lineage     | Reference only — reworks legacy `.topshelf/contracts/domain/database-migration.json`.                                                                           |
| Supersedes         | None                                                                                                                                                            |
| Superseded by      | None                                                                                                                                                            |
| Created            | 2026-10-03                                                                                                                                                      |
| Last updated       | 2026-10-03                                                                                                                                                      |

## 1. Purpose and Failure Prevented

Someone runs a schema push straight against the shared database to unblock a demo. The deployed database now has a column no migration file knows about. The next real migration fails in production, or worse, succeeds against a schema nobody can reproduce from zero, and there is no restore that has ever been tested. This contract makes migration history the only way the schema changes and requires proof of backup and restore before production data is touched.

## 2. Scope

This contract owns:

- Application schema history
- Migration ordering and application
- Database privilege posture for browser-reachable roles
- Schema/deployment reconciliation

This contract does not own:

- Backup infrastructure selection (see OQ-MIG-1; value Not yet verified)
- Release promotion (C52)

Related contracts: C00, C52.

## 3. Definitions

| Term                  | Meaning                                                                                |
| --------------------- | -------------------------------------------------------------------------------------- |
| Shared environment    | Any database used by more than one developer or by any deployed environment.           |
| Destructive migration | A migration that removes, or irreversibly transforms, existing data or schema objects. |
| Backend-owned table   | A table written only by the API, never directly by the browser.                        |

## 4. Requirements

The keywords MUST, MUST NOT, SHOULD, and MAY are used in the RFC 2119 sense. Requirement IDs are stable and MUST NOT be renumbered or reused.

- **MIG-1** — Drizzle migration history MUST be the sole authority for the application schema unless a later contract revision explicitly replaces that technology; PostgreSQL and Drizzle are replaceable choices, not canonical concepts.
- **MIG-2** — `db push` and equivalent direct schema synchronization MUST NOT be run against shared or production environments.
- **MIG-3** — Manual DDL MUST NOT be applied to shared or production environments outside a migration.
- **MIG-4** — Every schema change MUST be accompanied by a migration in the same change set.
- **MIG-5** — A migration applied to any shared environment MUST NOT be edited; corrections MUST be new migrations.
- **MIG-6** — Applying all migrations to an empty database MUST succeed in CI on every candidate.
- **MIG-7** — Applying pending migrations to a copy of the current production schema MUST succeed before release.
- **MIG-8** — Migration ordering MUST be deterministic.
- **MIG-9** — A production migration MUST NOT run without evidence of a backup taken for that migration.
- **MIG-10** — A production migration MUST NOT run without evidence that the backup method has been restored successfully (see OQ-MIG-2; value Not yet verified).
- **MIG-11** — Browser-reachable database roles MUST NOT have read or write access to backend-owned tables.
- **MIG-12** — Database privilege and row-level-security posture MUST be tested where browser-reachable roles exist (see OQ-MIG-3; value Not yet verified).
- **MIG-13** — A destructive migration MUST NOT run without explicit owner approval and a written rollback or recovery plan.
- **MIG-14** — Schema code and the deployed database MUST be reconciled before release; any drift MUST block release.

## 5. Acceptance Cases

| Case     | Proves         | Setup                                                                         | Expected                                                                              |
| -------- | -------------- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| MIG-AC-1 | MIG-1, MIG-4   | PR changes schema definitions without a migration                             | CI fails                                                                              |
| MIG-AC-2 | MIG-2, MIG-3   | Review of deployment scripts and CI for push commands; production drift check | Manual evidence plus drift check: no push commands in shared paths; drift check clean |
| MIG-AC-3 | MIG-5          | PR modifies a migration file already recorded as applied                      | CI fails                                                                              |
| MIG-AC-4 | MIG-6, MIG-8   | CI applies all migrations to an empty database twice                          | Both succeed with identical resulting schema                                          |
| MIG-AC-5 | MIG-7          | Apply pending migrations to a production-schema snapshot                      | Succeeds; result matches from-zero schema                                             |
| MIG-AC-6 | MIG-9, MIG-10  | Production migration attempted without recorded backup or restore evidence    | Release gate blocks                                                                   |
| MIG-AC-7 | MIG-11, MIG-12 | Query backend-owned tables using browser-reachable role credentials           | Permission denied on every table                                                      |
| MIG-AC-8 | MIG-13         | Destructive migration in a candidate without approval record                  | Release gate blocks                                                                   |
| MIG-AC-9 | MIG-14         | Introduce a column in the deployed test database not in migrations            | Reconciliation check fails release                                                    |

## 6. Open Questions

| ID       | Question                                                                                                                                                                             | Blocks implementation | Affects |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------- | ------- |
| OQ-MIG-1 | What backup mechanism and cadence are approved for production?                                                                                                                       | Yes                   | —       |
| OQ-MIG-2 | Where is restore proof performed (disposable environment, staging), and how recent must it be?                                                                                       | Yes                   | MIG-10  |
| OQ-MIG-3 | Will any browser-reachable database role exist in v2 (for example a hosted-auth client), making RLS tests applicable?                                                                | No                    | MIG-12  |
| OQ-MIG-4 | Are production migrations applied by the deployment pipeline or by a manual, owner-approved step?                                                                                    | No                    | —       |
| OQ-MIG-5 | Will v2 import any data from the legacy Teach database, and if so through which governed, audited path? Until decided, MIG-7's production baseline is the v2 production schema only. | No                    | —       |

## 7. Verification Status

| Item                         | State                    | Detail                                                                                                                                                                                                                                                |
| ---------------------------- | ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Target codebase              | verified (limited scope) | `peteywee/teach-v2` default branch `main`, verified through governance baseline commit `292e8da9123987e9d94f09669c7bc6b6d43c4320` on 2026-10-03. The repository contains the contract/governance foundation; application implementation remains not yet built.                                |
| Legacy repository consulted  | reference only           | `peteywee/teach` `work/TR-0010-production-cutover` at `79fdce5cc3b2` (`main` at `99162f17eace`), read 2026-10-03 for lineage: legacy domain contract JSON files and the Gate A decision record. Legacy code was not inspected and does not govern v2. |
| Implementation conformance   | unknown                  | Not yet verified. No v2 implementation was inspected; the owner states v2 is yet to be built.                                                                                                                                                         |
| Acceptance cases implemented | unknown                  | Not yet verified. No mapping between repository tests and these IDs has been established.                                                                                                                                                             |
| Blocking open questions      | 2 open                   | Contract is `active` with these open. Each blocks implementation of the requirements it affects beyond fail-closed behavior until decided (SYS-34).                                                                                                   |
| Owner approval               | declared                 | Approved by the owner on 2026-10-03; recorded in `APPROVAL-RECORD.md`. Initial owner-approval baseline is commit `2c9b1c849a520ba817efc91150be9a37797f4238`; this 1.0.3 revision is tracked by Git history.                                                                     |
| Independent review           | not performed            | Drafted and self-checked by Claude against the contract-authoring checklist only.                                                                                                                                                                     |
| Source of intent             | declared                 | Owner-supplied rebuild proposal (`source/2026-10-03-teach-v2-contract-hierarchy-proposal.md`), consolidated decisions (`source/2026-10-03-teach-rebuild-consolidated-decisions.md`), and legacy Gate A owner decisions (2026-07-22) where cited.      |

## 8. Change Log

| Version | Date       | Change                                                                                                                                                                                          | By               |
| ------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- |
| 0.1.0   | 2026-10-03 | Initial proposed draft from the owner-supplied hierarchy proposal. Not approved.                                                                                                                | Claude (drafter) |
| 0.2.0   | 2026-10-03 | Group renamed to C20 Data Correctness; MIG-1 notes Drizzle and PostgreSQL are replaceable by contract revision.                                                                                 | Claude (drafter) |
| 0.3.0   | 2026-10-03 | Retargeted to the Teach v2 codebase: legacy `peteywee/teach` is reference only; anchors and paths no longer point into the legacy repository. Added OQ-MIG-5 (legacy data import).              | Claude (drafter) |
| 0.4.0   | 2026-10-03 | Anchored to `peteywee/teach-v2` branch `main` (owner-declared); the repository had no commits when cloned on 2026-10-03, so the anchor SHA stays Not yet verified.                              | Claude (drafter) |
| 1.0.0   | 2026-10-03 | Approved by the owner; status changed from `proposed` to `active`. Open questions remain open and block implementation of the requirements they affect (SYS-34) instead of blocking activation. | Claude (drafter) |
| 1.0.1   | 2026-10-03 | Non-normative document-governance metadata/provenance normalization; 1.0.0 owner approval remained controlling. | ChatGPT (governance) |
| 1.0.2   | 2026-10-03 | Non-normative baseline cleanup: corrected stale current-status provenance after the contract spine was committed; no behavioral requirement changed. | ChatGPT (governance) |
| 1.0.3   | 2026-10-03 | Non-normative truth-state cleanup: verification status now anchors the live v2 repository through governance baseline `292e8da9123987e9d94f09669c7bc6b6d43c4320`; no behavioral requirement changed. | ChatGPT (governance) |
