<!--tos-doc
{
  "doc_id": "TEACH-CON-C21",
  "class": "contract",
  "version": "1.1.0",
  "claims_truth_state": "declared",
  "status": "superseded",
  "owner": "Patrick Craven, Top Shelf Service LLC",
  "created_on": "2026-10-03",
  "updated_on": "2026-10-04",
  "effective_on": "2026-10-03",
  "approval": {
    "state": "approved",
    "approved_version": "1.1.0",
    "approved_on": "2026-10-04",
    "record": "contracts/APPROVAL-RECORD.md",
    "basis": "Owner approved production backup and restore-proof policy; GitHub issue #30"
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
    "TEACH-CON-C21@1.0.3"
  ],
  "superseded_by": "TEACH-CON-C21@1.2.0",
  "depends_on": [
    "contracts/"
  ]
}
-->

# Superseded TEACH-CON-C21 1.1.0

Superseded by `TEACH-CON-C21@1.2.0` under SYS-21 #75.

The original body below is preserved, including its former current-status wording.
# C21 — Database & Migration Contract

| Field              | Value                                                                                                                                                           |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Contract ID        | C21                                                                                                                                                             |
| Group              | C20 Data Correctness                                                                                                                                            |
| Governed by        | C00 System Authority                                                                                                                                            |
| Version            | 1.1.0                                                                                                                                                           |
| Status             | `active`                                                                                                                                                        |
| Owner              | Patrick Craven, Top Shelf Service LLC                                                                                                                           |
| Approved by        | Patrick Craven (owner), 2026-10-04 — production backup/restore decisions approved through GitHub issue #30; see `APPROVAL-RECORD.md` |
| Requirement prefix | `MIG`                                                                                                                                                           |
| Activation         | Required for the core rebuild                                                                                                                                   |
| Legacy lineage     | Reference only — reworks legacy `.topshelf/contracts/domain/database-migration.json`.                                                                           |
| Supersedes         | C21 1.0.3                                                                                                                                                            |
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

- Specific backup provider/product selection; C21 defines the provider-neutral backup/restore policy
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
- **MIG-9** — Production containing non-reconstructable data MUST have platform-native transactionally consistent backup/restore capability with automated backups at least daily. A production migration that changes schema or data MUST NOT run without a fresh named restorable backup or restore point captured after the release candidate is frozen and before promotion; release evidence MUST record its identity and timestamp.
- **MIG-10** — A production migration MUST NOT run unless the current backup method/configuration has been restored successfully in a disposable isolated environment using the same database-engine major version as production. The restore proof MUST be no older than 30 days at promotion time and MUST be repeated after any backup mechanism or backup-configuration change regardless of age. Evidence MUST identify the source backup, isolated restore target, database version, start/end timestamps, result, and verification checks.
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
| MIG-AC-6 | MIG-9, MIG-10  | Production migration evidence lacks a post-freeze named backup, daily-capable platform-native policy, current matching restore proof, isolated target, same engine major, or proof within 30 days | Release gate blocks |
| MIG-AC-7 | MIG-11, MIG-12 | Query backend-owned tables using browser-reachable role credentials           | Permission denied on every table                                                      |
| MIG-AC-8 | MIG-13         | Destructive migration in a candidate without approval record                  | Release gate blocks                                                                   |
| MIG-AC-9 | MIG-14         | Introduce a column in the deployed test database not in migrations            | Reconciliation check fails release                                                    |

## 6. Open Questions

| ID       | Question                                                                                                                                                                             | Blocks implementation | Affects |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------- | ------- |
| OQ-MIG-3 | Will any browser-reachable database role exist in v2 (for example a hosted-auth client), making RLS tests applicable?                                                                | No                    | MIG-12  |
| OQ-MIG-4 | Are production migrations applied by the deployment pipeline or by a manual, owner-approved step?                                                                                    | No                    | —       |
| OQ-MIG-5 | Will v2 import any data from the legacy Teach database, and if so through which governed, audited path? Until decided, MIG-7's production baseline is the v2 production schema only. | No                    | —       |

### Resolved owner decisions in 1.1.0

- **OQ-MIG-1 — `MIGRATION_SCOPED_PLATFORM_NATIVE_BACKUP`:** use the selected platform's native transactionally consistent backup/snapshot/PITR mechanism; automated backups run at least daily when production contains non-reconstructable data; every schema/data migration requires a fresh named restorable point captured after candidate freeze and before promotion. A platform that cannot provide this capability cannot host a production migration.
- **OQ-MIG-2 — `ISOLATED_RESTORE_MAX_30D`:** restore proof runs in a disposable isolated environment on the same database-engine major version; proof is valid for at most 30 days and becomes stale immediately when the backup mechanism/configuration changes. Destructive migrations retain MIG-13's explicit owner-approval and recovery-plan requirement.

## 7. Verification Status

| Item                         | State                    | Detail                                                                                                                                                                                                                                                |
| ---------------------------- | ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Target codebase              | verified (limited scope) | `peteywee/teach-v2` default branch `main`; SLICE-P01 implementation is verified through exact-main commit `dbec8199a240c41c32f01c09b0a5b8ee1c5381ec` on 2026-10-04. |
| Legacy repository consulted  | reference only           | `peteywee/teach` `work/TR-0010-production-cutover` at `79fdce5cc3b2` (`main` at `99162f17eace`), read 2026-10-03 for lineage: legacy domain contract JSON files and the Gate A decision record. Legacy code was not inspected and does not govern v2. |
| Implementation conformance   | partial PROVEN           | SLICE-P01 proves Drizzle migration authority, same-change-set schema/migration, deterministic from-zero replay, and PostgreSQL integration for MIG-1/MIG-4/MIG-6/MIG-8. Production backup/restore capability and upgrade-from-production proof remain unproven. |
| Acceptance cases implemented | partial PROVEN           | MIG-AC-4 is implemented for SLICE-P01 with two independently empty PostgreSQL databases. Issue #30 adds provider-neutral fail-closed evidence validation for MIG-AC-6; actual provider evidence is still required before production. |
| Blocking open questions      | 0 open                   | OQ-MIG-1 and OQ-MIG-2 are resolved by owner decision in 1.1.0. OQ-MIG-3/4/5 remain open and non-blocking; concrete production migration execution still fails closed until required runtime/provider evidence exists. |
| Owner approval               | declared                 | 1.1.0 backup/restore policy approved by Patrick Craven on 2026-10-04 through GitHub issue #30 and recorded in `APPROVAL-RECORD.md`. |
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
| 1.1.0   | 2026-10-04 | Normative production-proof revision: resolve OQ-MIG-1 with `MIGRATION_SCOPED_PLATFORM_NATIVE_BACKUP` and OQ-MIG-2 with `ISOLATED_RESTORE_MAX_30D`; refine MIG-9/MIG-10 and MIG-AC-6; GitHub issue #30. | Patrick Craven (owner approval) |
