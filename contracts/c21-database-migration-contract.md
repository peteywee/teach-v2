<!--tos-doc
{
  "doc_id": "TEACH-CON-C21",
  "class": "contract",
  "version": "4.0.0",
  "claims_truth_state": "declared",
  "status": "active",
  "owner": "Patrick Craven, Top Shelf Service LLC",
  "created_on": "2026-10-03",
  "updated_on": "2026-10-28",
  "approval": {
    "state": "approved",
    "approved_version": "4.0.0",
    "approved_on": "2026-10-28",
    "record": "docs/proposals/demo-authoring-recovery-exception/owner-adoption.json",
    "basis": "Owner approved preparing and adopting one authoring migration exception conditional on fresh encrypted backup and successful PostgreSQL restore/preservation proof; no future waiver or paid service."
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
    "TEACH-CON-C21@1.0.3",
    "TEACH-CON-C21@1.1.0",
    "TEACH-CON-C21@1.2.0",
    "TEACH-CON-C21@2.0.0",
    "TEACH-CON-C21@3.0.0"
  ],
  "superseded_by": null,
  "depends_on": [
    "contracts/"
  ],
  "demo_schema_isolation_registration": {
    "registration": "governance/demo-schema-isolation/registration.json",
    "approval_record": "governance/demo-schema-isolation/owner-approval.json",
    "scope": "LOCAL_CODE_AND_TESTS_ONLY",
    "schema": "teach_v2_demo",
    "node_major": 24,
    "runtime_activation": false,
    "live_database_changes": false,
    "deployment_authority": false,
    "spending_authority": false
  },
  "effective_on": "2026-10-28",
  "demo_recovery_exception_registration": {
    "registration": "docs/proposals/demo-recovery-exception/adoption-registration.json",
    "owner_decision": "docs/proposals/demo-recovery-exception/owner-adoption.json",
    "scope": "POLICY_ONLY",
    "actual_recovery_evidence": "UNKNOWN",
    "live_database_changes": false,
    "runtime_activation": false,
    "deployment_authority": false,
    "spending_authority": false
  },
  "authoring_recovery_exception_registration": {
    "id": "TEACH-DEMO-AUTHORING-RECOVERY-2026-10-28",
    "record": "docs/proposals/demo-authoring-recovery-exception/adoption-registration.json",
    "scope": "ONE_EXACT_AUTHORING_MIGRATION_POLICY_ONLY",
    "actual_recovery_evidence": "UNKNOWN"
  }
}
-->

# C21 — Database & Migration Contract

| Field              | Value                                                                                                                                                           |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Contract ID        | C21                                                                                                                                                             |
| Group              | C20 Data Correctness                                                                                                                                            |
| Governed by        | C00 System Authority                                                                                                                                            |
| Version | 4.0.0 |
| Status             | `active`                                                                                                                                                        |
| Owner              | Patrick Craven, Top Shelf Service LLC                                                                                                                           |
| Approved by | Owner-approved policy adoption only. See docs/proposals/demo-authoring-recovery-exception/owner-adoption.json. |
| Requirement prefix | `MIG`                                                                                                                                                           |
| Activation         | Required for the core rebuild                                                                                                                                   |
| Legacy lineage     | Reference only — reworks legacy `.topshelf/contracts/domain/database-migration.json`.                                                                           |
| Supersedes | 2.0.0; historical body preserved |
| Superseded by      | None                                                                                                                                                            |
| Created            | 2026-10-03                                                                                                                                                      |
| Last updated | 2026-10-19 |

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
- **MIG-9** — Production containing non-reconstructable data MUST have platform-native transactionally consistent backup/restore capability with automated backups at least daily. A production migration that changes schema or data MUST NOT run without a fresh named restorable backup or restore point captured after the release candidate is frozen and before promotion; release evidence MUST record its identity and timestamp. Only bounded alternatives: the individually bound operations in §4.1 and §4.2 below; outside those exact operations this requirement is unchanged.
- **MIG-10** — A production migration MUST NOT run unless the current backup method/configuration has been restored successfully in a disposable isolated environment using the same database-engine major version as production. The restore proof MUST be no older than 30 days at promotion time and MUST be repeated after any backup mechanism or backup-configuration change regardless of age. Evidence MUST identify the source backup, isolated restore target, database version, start/end timestamps, result, and verification checks. Only bounded alternatives: the individually bound operations in §4.1 and §4.2 below; outside those exact operations this requirement is unchanged.
- **MIG-11** — Browser-reachable database roles MUST NOT have read or write access to backend-owned tables.
- **MIG-12** — Application tables MUST NOT be browser-reachable and have no implicit RLS exemption. The default remains project-wide Data API disabled. Only the bounded synthetic demo in the dedicated `teach_v2_demo` schema MAY share the legacy Supabase project while its Data API remains enabled for legacy: `teach_v2_demo` MUST be absent from every Data API exposed-schema setting; `anon`, `authenticated` and `PUBLIC` MUST have no effective schema access or table/sequence/function privileges, including effective defaults for every object-creating role; every demo table MUST have RLS enabled with no browser policies. Schema-specific default revocation alone MUST NOT be accepted if a global or inherited grant survives. Every candidate requires exact-target authoritative readback of Data API/exposed schemas, existing/effective default privileges, role inheritance and RLS, plus database-role and HTTP denial probes. Missing, unreadable, contradictory or provider-default-only evidence MUST block promotion. Non-demo application schemas retain the default policy. The exception authorizes local preparation only, not live migration, roles/credentials, runtime activation or deployment; MIG-9/MIG-10 remain the default except for the individually bounded §4.1 or §4.2; exact-candidate owner apply/release gates remain unchanged. See `governance/decision-closure/07-evidence-release-operations-spec.md` §5 and `governance/demo-schema-isolation/design.md`. (OQ-MIG-3 bounded revision recorded 2026-10-19).
- **MIG-13** — A destructive migration MUST NOT run without explicit owner approval and a written rollback or recovery plan.
- **MIG-14** — Schema code and the deployed database MUST be reconciled before release; any drift MUST block release.

### 4.1. First additive synthetic demo recovery exception

Only the first additive synthetic teach_v2_demo installation in t34ch project acqafjkdkdmtpnsxiesw on PostgreSQL 17 MAY use the encrypted consistent application recovery set specified in `docs/proposals/demo-recovery-exception/proposal.md`, Required evidence and procedure steps 1–8, instead of the native/daily mechanism prerequisite and native restore point. Those eight conditions are normative and MUST all pass actual independent evidence review. A source-only validator result is insufficient. Missing, unknown, stale or contradictory required coverage MUST block. Exact-candidate post-freeze capture, actual same-major isolated restore within 30 days, preservation rehearsal, immutable migration history, exact manual owner apply approval and post-apply readback remain mandatory. This exception is consumed on first successful installation and grants no live action, full platform recovery, later migration or future customer production permission. No active service is permitted to rely on it as an ongoing backup policy.

### 4.2 One authoring migration — encrypted recovery alternative

For exactly migration `0008_demo_manager_authoring.sql` (isolated SHA256 `6c6e568354e95cb5012e369dca6a3f0c9a3c2d72ac49d05127d1b77f3ba941ab`) in existing t34ch project `acqafjkdkdmtpnsxiesw`, private schema `teach_v2_demo`, MIG-9/MIG-10 MAY be satisfied by the following one-time alternative instead of a platform-native restore point. This exception concerns the approved two private authoring tables and their necessary reviewed support objects only. It authorizes no paid upgrade and creates no recurring exception.

1. Freeze and independently review the complete candidate (including this governance change), raw migration, activation wrapper, dependency-closed recovery selectors, renderer and verification checks before capture. Record exact source and wrapper hashes, target identity and owner approval. A candidate change affecting recovery coverage, resulting objects or activation invalidates the binding and requires a fresh qualifying capture/proof.
2. Capture a fresh named, transactionally consistent recovery set after freeze and before migration, encrypted before any recoverable payload leaves PostgreSQL. The set MUST cover the entire current private schema and its actual rows, sequence state, constraints/indexes, functions/triggers, RLS/policies, owners/ACLs/defaults, and all dependencies necessary to restore that scope faithfully. Current demo authentication/session rows, if present, are confidential recovery material; do not publish them or their plaintext. Existing nonsecret supporting role/default/platform-hook metadata may be included only through a reviewed closed inventory. Unknown dependencies, omitted required data, unreadable state or uncovered side effects block activation.
3. Recovery coverage does not authorize copying other legacy application data, Supabase auth/storage rows, role password/verifier values, environment secrets or credentials. If any excluded dependency is essential, stop for a separately reviewed exact scope/security decision; do not label the partial set complete. Use only approved data-transfer destinations and supported approved key access. Never bypass Library/file selection boundaries or policy denials.
4. Retain ciphertext and a nonsecret manifest in a verified owner-only approved destination. Record snapshot identity/time, database major, candidate/selector hashes, ciphertext hash/length, destination identity and ACL evidence, and encryption public-key fingerprint. Verify a readback of retained ciphertext. Keep private key custody separate; an inaccessible key is a failed recovery gate, not a successful backup.
5. Retrieve the retained ciphertext—not a working plaintext copy—and prove decryption and full scoped restoration into a disposable isolated PostgreSQL17 environment. Reproduce required metadata/roles without production credential material. Validate exact baseline schema/security, every covered row and sequence, and prerequisite dependencies. Then apply the exact frozen migration and activation wrapper to that restored state; verify old immutable versions and retained history are preserved, the intended authoring changes alone occur, and restricted runtime operations/denials pass. Synthetic rehearsal is additional evidence, not a substitute for this actual recovery proof.
6. Independently review source-bound capture coverage, retained-only restore results, upgrade/preservation checks, final target preflight and uncertainty handling. Evidence MUST identify the retained backup, snapshot/capture time, isolated target/PG version, start/end times, checks/results and exact hashes. No missing/ambiguous coverage may be waived by a passing schema-only replay. This same-candidate actual proof is required now; the thirty-day maximum does not excuse use of the old first-install backup.
7. MIG-11/MIG-12 isolation, exact-target provider exposure readback, least-privilege runtime rights, required CI, manual owner-approved release and postflight gates remain unchanged. After any uncertain apply outcome, reconcile ledger/sequence/schema before any retry; no automatic sequence reset or destructive rollback.
8. Consume this exception only on successful exact migration application. It cannot authorize a successor/replacement migration, recurring operations, destructive data work or a general alternative backup policy. Future migrations remain blocked by MIG-9/MIG-10 unless a separately adopted policy qualifies their recovery method. Existing ongoing backup requirements for non-reconstructable production data are not waived.


## 5. Acceptance Cases

| Case     | Proves         | Setup                                                                         | Expected                                                                              |
| -------- | -------------- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| MIG-AC-1 | MIG-1, MIG-4   | PR changes schema definitions without a migration                             | CI fails                                                                              |
| MIG-AC-2 | MIG-2, MIG-3   | Review of deployment scripts and CI for push commands; production drift check | Manual evidence plus drift check: no push commands in shared paths; drift check clean |
| MIG-AC-3 | MIG-5          | PR modifies a migration file already recorded as applied                      | CI fails                                                                              |
| MIG-AC-4 | MIG-6, MIG-8   | CI applies all migrations to an empty database twice                          | Both succeed with identical resulting schema                                          |
| MIG-AC-5 | MIG-7          | Apply pending migrations to a production-schema snapshot                      | Succeeds; result matches from-zero schema                                             |
| MIG-AC-6 | MIG-9, MIG-10  | Production migration evidence lacks a post-freeze named backup, daily-capable platform-native policy, current matching restore proof, isolated target, same engine major, or proof within 30 days | Release gate blocks unless every condition of the applicable §4.1 first-install or §4.2 exact authoring operation is independently evidenced; unknown coverage, changed binding or any other operation blocks the exception |
| MIG-AC-7 | MIG-11, MIG-12 | Probe exact target as anon/authenticated and an unprivileged role inheriting PUBLIC, including fresh objects/defaults; inspect API exposure, role inheritance and RLS | All backend-owned table access denied; default project Data API disabled and RLS with no policies; exact demo exception additionally denies schema/sequence/function access and effective defaults, remains unexposed with no browser policies and leaves legacy inventory/settings unchanged; missing readback blocks |
| MIG-AC-8 | MIG-13         | Destructive migration in a candidate without approval record                  | Release gate blocks                                                                   |
| MIG-AC-9 | MIG-14         | Introduce a column in the deployed test database not in migrations            | Reconciliation check fails release                                                    |

## 6. Open Questions

| ID       | Question                                                                                                                                                                             | Blocks implementation | Affects |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------- | ------- |
| OQ-MIG-3 | **Resolved; bounded successor.** The original 2026-10-05 backend-only rule remains the non-demo default. Owner approved local preparation of the dedicated `teach_v2_demo` schema exception, recorded 2026-10-19: legacy may retain the project Data API only while the demo schema is unexposed, anon/authenticated/PUBLIC existing and effective default privileges are denied and all demo tables have RLS with no browser policies. Exact-target readback and denial probes remain release blockers. See MIG-12, `governance/decision-closure/07-evidence-release-operations-spec.md` §5 and the minimal owner decision summary in `governance/demo-schema-isolation/owner-approval.json`. No live changes, credentials, runtime activation, deployment or spending are approved. | No (resolved) | MIG-12 |
| OQ-MIG-4 | **Resolved.** Owner, 2026-10-05: Production migration apply MUST be manual and owner-approved for the exact frozen candidate, migration IDs and fresh named restore point (or exact §4.1/§4.2 recovery set only inside its respective exception), after replay and restore gates. Apply output and journal/drift readback are evidence. CI holds no production database credential and cannot grant production permission. See `governance/decision-closure/07-evidence-release-operations-spec.md`. (Decision-closure r3.1) | No (resolved) | — |
| OQ-MIG-5 | **Resolved.** Owner, 2026-10-05: Legacy Teach data import is ABSENT; this registration adopts no import job, script or route. Future import requires a separate source snapshot, transformation, reconciliation, audit and rollback plan. MIG-7's baseline remains the V2 production schema. See `governance/decision-closure/08-deferred-feature-policy-register.md`. (Decision-closure r3.1) | No (resolved) | — |

### Resolved owner decisions in 1.1.0

- **OQ-MIG-1 — `MIGRATION_SCOPED_PLATFORM_NATIVE_BACKUP`:** use the selected platform's native transactionally consistent backup/snapshot/PITR mechanism; automated backups run at least daily when production contains non-reconstructable data; every schema/data migration requires a fresh named restorable point captured after candidate freeze and before promotion. A platform that cannot provide this capability cannot host a production migration outside the individually bounded §4.1 first-install or §4.2 authoring exception.
- **OQ-MIG-2 — `ISOLATED_RESTORE_MAX_30D`:** restore proof runs in a disposable isolated environment on the same database-engine major version; proof is valid for at most 30 days and becomes stale immediately when the backup mechanism/configuration changes. Destructive migrations retain MIG-13's explicit owner-approval and recovery-plan requirement.

## 7. Verification Status

| Item                         | State                    | Detail                                                                                                                                                                                                                                                |
| ---------------------------- | ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Target codebase              | verified (limited scope) | `peteywee/teach-v2` default branch `main`; SLICE-P01 implementation is verified through exact-main commit `dbec8199a240c41c32f01c09b0a5b8ee1c5381ec` on 2026-10-04. |
| Legacy repository consulted  | reference only           | `peteywee/teach` `work/TR-0010-production-cutover` at `79fdce5cc3b2` (`main` at `99162f17eace`), read 2026-10-03 for lineage: legacy domain contract JSON files and the Gate A decision record. Legacy code was not inspected and does not govern v2. |
| Implementation conformance   | partial PROVEN           | SLICE-P01 proves Drizzle migration authority, same-change-set schema/migration, deterministic from-zero replay, and PostgreSQL integration for MIG-1/MIG-4/MIG-6/MIG-8. Production backup/restore capability and upgrade-from-production proof remain unproven. |
| Acceptance cases implemented | partial PROVEN           | MIG-AC-4 is implemented for SLICE-P01 with two independently empty PostgreSQL databases. Issue #30 adds provider-neutral fail-closed evidence validation for MIG-AC-6; actual provider evidence is still required before production. |
| Blocking open questions      | 0 open | Only unresolved question rows govern blocking; registration is not implementation evidence |
| Owner approval | policy adoption approved | 4.0.0 adds exactly §4.2; source registration grants no live operation and actual recovery evidence remains UNKNOWN |
| Independent review           | not performed            | Drafted and self-checked by Claude against the contract-authoring checklist only.                                                                                                                                                                     |
| Source of intent             | declared                 | Owner-supplied rebuild proposal (`source/2026-10-03-teach-v2-contract-hierarchy-proposal.md`), consolidated decisions (`source/2026-10-03-teach-rebuild-consolidated-decisions.md`), and legacy Gate A owner decisions (2026-07-22) where cited.      |

## 8. Change Log

| Version | Date | Change | By |
| ------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- |
| 0.1.0   | 2026-10-03 | Initial proposed draft from the owner-supplied hierarchy proposal. Not approved.                                                                                                                | Claude (drafter) |
| 0.2.0   | 2026-10-03 | Group renamed to C20 Data Correctness; MIG-1 notes Drizzle and PostgreSQL are replaceable by contract revision.                                                                                 | Claude (drafter) |
| 0.3.0   | 2026-10-03 | Retargeted to the Teach v2 codebase: legacy `peteywee/teach` is reference only; anchors and paths no longer point into the legacy repository. Added OQ-MIG-5 (legacy data import).              | Claude (drafter) |
| 0.4.0   | 2026-10-03 | Anchored to `peteywee/teach-v2` branch `main` (owner-declared); the repository had no commits when cloned on 2026-10-03, so the anchor SHA stays Not yet verified.                              | Claude (drafter) |
| 1.0.0   | 2026-10-03 | Approved by the owner; status changed from `active` to `active`. Open questions remain open and block implementation of the requirements they affect (SYS-34) instead of blocking activation. | Claude (drafter) |
| 1.0.1   | 2026-10-03 | Non-normative document-governance metadata/provenance normalization; 1.0.0 owner approval remained controlling. | ChatGPT (governance) |
| 1.0.2   | 2026-10-03 | Non-normative baseline cleanup: corrected stale current-status provenance after the contract spine was committed; no behavioral requirement changed. | ChatGPT (governance) |
| 1.0.3   | 2026-10-03 | Non-normative truth-state cleanup: verification status now anchors the live v2 repository through governance baseline `292e8da9123987e9d94f09669c7bc6b6d43c4320`; no behavioral requirement changed. | ChatGPT (governance) |
| 1.1.0   | 2026-10-04 | Normative production-proof revision: resolve OQ-MIG-1 with `MIGRATION_SCOPED_PLATFORM_NATIVE_BACKUP` and OQ-MIG-2 with `ISOLATED_RESTORE_MAX_30D`; refine MIG-9/MIG-10 and MIG-AC-6; GitHub issue #30. | Patrick Craven (owner approval) |
| 1.2.0 | 2026-10-05 | Register OQ-MIG-3, OQ-MIG-4, OQ-MIG-5; preserve named residuals and existing requirement/acceptance IDs. Decision-closure r3.1 manifest sha256:ff7b51df1e3a235e9d226d9d7232f81c64bbeb451b359b6e0f2ea232b6e1757c; SYS-21 #75. | Patrick Craven (owner); ChatGPT (recorder) |

| 2.0.0 | 2026-10-19 | Bounded MIG-12 exception for the unexposed `teach_v2_demo` schema sharing the legacy Supabase project; project-wide Data API disabling remains the nonexception default. Major revision because one mandatory control is narrowed. Existing/default PUBLIC and browser-role denial, RLS, target readback and backup/restore/exact-candidate gates remain required. Local preparation only. | Patrick Craven (owner); dot (recorder) |

| 3.0.0 | 2026-10-19 | Narrow first-additive synthetic install recovery alternative; default native policy retained elsewhere. Policy adoption approved; actual recovery evidence remains UNKNOWN. | Patrick Craven (owner); ace (recorder) |

| 4.0.0 | 2026-10-28 | One exact authoring migration encrypted recovery alternative with complete post-freeze actual retained-onlyPG17 restore/preservation proof; no future or daily-policy waiver. | Patrick Craven (owner); ace (recorder) |
