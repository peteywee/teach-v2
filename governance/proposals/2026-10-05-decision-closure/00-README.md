<!--tos-doc
{
  "doc_id": "TEACH-PROP-DCS-00",
  "class": "evidence-summary",
  "version": "0.3.1",
  "claims_truth_state": "declared",
  "status": "proposed",
  "owner": "Patrick Craven, Top Shelf Service LLC",
  "created_on": "2026-10-05",
  "updated_on": "2026-10-05",
  "baseline": {
    "repo": "peteywee/teach-v2",
    "ref": "main",
    "commit": "6553eb465e469dc9e60368cde40d259f86262997",
    "purpose": "revision baseline: main after PR #74"
  },
  "governed_by": [
    "TEACH-CON-C00",
    "TEACH-GOV-DOCS"
  ]
}
-->

# Decision-Closure Super-Batch — Package Index

| Field | Value |
| --- | --- |
| Status | `proposed`. Grants no approval, changes no contract, activates nothing (SYS-18, SYS-19). |
| Baseline | `peteywee/teach-v2` `main` @ `6553eb465e469dc9e60368cde40d259f86262997` (merge of PR #74). Classification was done on `2b5714d` (merge of PR #73) |
| Owner decision | Approved in chat 2026-10-05 04:05 America/Chicago: decision sheet A–D (§4). Registration PENDING under SYS-21 issue #75; every document stays `proposed` until it lands. **Revision 3 contains normative corrections (§A); revision 3.1 only clarifies package inventory/manifest terminology. Registration still needs your approval of the exact revision-3.1 manifest (§M)** |
| Purpose | Convert the 56 preserved-but-unregistered owner answers into registrable artifacts so the backlog closes by registration, not by re-asking. |
| Author | Claude (DevelopmentAgent). Not independent verification of itself (AGT-17). |

## A. Audit response (revision 3 / packaging clarification 3.1, 2026-10-05)

An external audit of revision 2 returned `BLOCKED_BEFORE_IMPLEMENTATION` with four blockers and four corrections. Each was checked against the files before changing anything; all eight were confirmed.

| # | Finding | Verified | Fix in revision 3 / 3.1 | Files | Normative? |
| --- | --- | --- | --- | --- | --- |
| 1 | #75 says no requirement/acceptance IDs are added; documents proposed PRIV-18, IDN-31, TEN-20, MGR-11, SES-AC-15…24 and C41 cases | Yes (grep) | One answer: **no new IDs** (§R). Values go into existing requirement text or the resolved question row; test cases are document-level verification cases. The validator now fails any document proposing a new ID | 03, 04, 05, 06, validator | No — same behavior, different location |
| 2 | Approval at 04:05 is not bound to exact bytes; revision 2 was made at 04:24 | Yes | `package-manifest.json` binds every artifact's SHA-256, the baseline, the approved revision-1 archive hash and a per-file change classification; sidecar `package-manifest.sha256` holds the manifest's own hash for your approval token | manifest, validator | — |
| 3 | Validator checked answer hashes and OQ mentions, not that the artifact carries the approved value | Yes (`SameSite=Strict` would have passed) | Every closure row carries `semantic_assertions` (values that must and must not appear); manifest hashes catch any byte change; totals are recomputed; extra or missing files fail | 01, validator, tests | No |
| 4 | `/api/ready` 503 body contradicted "every non-2xx … from the exceptions uses the envelope" | Yes | Health and readiness are `EXEMPT_MINIMAL_STATUS_BODY` with exact bodies; callback is `STANDARD_ENVELOPE`; machine-readable and CI-checked | 05, `api-boundary-manifest.json`, validator | **Yes** |
| 5 | "Supabase grants CRUD by default" is too absolute | Yes: opt-in default for new projects from 2026-05-30, enforced on existing projects 2026-10-30 ([Supabase changelog](https://supabase.com/changelog/45329-breaking-change-tables-not-exposed-to-data-and-graphql-api-automatically)) | Exposure is project-specific and proven only by readback from the target project; blocker kept, readback table added | 07, 01 | **Yes** (stricter pass criteria) |
| 6 | Proposed PRIV-18 gave unknown record classes a one-year default | Yes | An unregistered class is retention UNKNOWN, automatic deletion BLOCKED, no retention claim; PRIV-X-15 tests it | 03 | **Yes** |
| 7 | HSTS `includeSubDomains` binds every `t34ch.com` subdomain | Yes | Header is `max-age=31536000` only; `includeSubDomains` needs its own decision with a subdomain HTTPS inventory | 04 | **Yes** |
| 8 | #75 says 10 Markdown + 7 JSON; package had 8 JSON | Yes | Revision 3.1 distinguishes `listed_artifact_counts` (10 Markdown + 8 JSON + 2 scripts listed by the manifest) from the complete `archive_inventory` (10 Markdown + 9 JSON including the manifest + 1 sidecar + 2 scripts). Both are validator-checked. Correction text for #75 in §R | manifest, §R | No |

Not done by Claude: the independent exact-head audit the auditor lists last. Self-checks below are not independent review (AGT-17).

## R. Registration form (authoritative)

1. **No requirement IDs and no acceptance-case IDs are added to any contract.** Contract totals stay 391 requirements / 267 acceptance cases.
2. Each value is written into the existing requirement named in the question's `Affects` column. When `Affects` is `—`, the value is written into the resolved open-question row.
3. Requirement text cites the governing document by path. That document's test cases (PRIV-X-n, TRS-n, C14 cases, API checks) are verification cases and C51 evidence targets, not contract acceptance IDs.
4. Residuals keep their original question ID with the question narrowed to the missing value. IDs with a letter suffix are rejected by `scanContractQuestions`.
5. This matches the #75 dry run: 21 contracts, 49 → 9 unresolved, 11 → 1 blocker.

Correction to post on #75 (text only; not posted at package build): "Package inventory correction: the complete revision-3.1 archive contains 10 Markdown + 9 JSON (the ninth JSON is `package-manifest.json`) + `package-manifest.sha256` + 2 proposed scripts = 22 files. `package-manifest.json` lists and hashes the other 20 artifacts as 10 Markdown + 8 JSON + 2 scripts. Registration binds to the exact revision-3.1 manifest hash approved by the owner. Supabase exposure is project-specific and release proof requires authoritative target-project readback of grants, exposed schemas/Data API configuration, and RLS state."

## M. Manifest and approval binding

- `package-manifest.json` lists every package artifact (path, SHA-256, bytes, document version, role) and records: baseline `6553eb4`, classification baseline `2b5714d`, issue #75, the registration form, and the change classification of each file against **revision 1** — the archive you approved at 04:05 (`teach-v2-decision-closure-2026-10-05.zip`, SHA-256 `0e5cb74b68a1e8c82ca1a80153e53987715507b977b7b9d5c98fe77c01aa6449`).
- `package-manifest.sha256` holds the manifest's SHA-256. The manifest cannot contain its own hash, so the sidecar is checked by the validator instead.
- Revision 3 changes approved behavior in four places (§A rows 4–7). Revision 3.1 changes no owner decision or engineering semantic; it only removes package-count ambiguity and strengthens the validator around that inventory. Your 04:05 approval still does **not** cover the corrected package. The approval needed is: **"approve decision-closure manifest sha256:<value in package-manifest.sha256>"**. Registration must reproduce exactly the bytes that manifest lists.

## 0. Repository survey (2026-10-05 04:24 America/Chicago)

Read: all 12 branches, every PR since #53, all 6 open issues with comments, `main` history since `2b5714d`, the Application Interface authority and the #63 command ledger. Read-only; nothing was pushed.

| Item | Observed state | Effect on this package |
| --- | --- | --- |
| `main` | `6553eb4`, merge of PR #74 at 08:57Z | All documents revised against it (0.2.0) |
| PR #74 | Registered `OQ-IDN-1/3/4`, `OQ-TEN-1/2`, `OQ-MGR-1`, `OQ-CERT-1` with this package's values. Inventory 56 → 49 unresolved, 18 → 11 blockers. Package 0.17.0 | Rows kept as `RESOLVED (#74)` in `01-…`; `06-…` §0 and `09-…` §5 mark them registered; `06-…` §0 lists engineering values #74 did not adopt |
| PR #74 process | No SYS-21 issue; superseded copy only for C11; no change-log rows for C11, C13, C33, C34; contract-index rows not updated | Index rows for C11, C13, C14, C31, C32, C33, C34 are stale (per-row column sums to 61 while the total reads 49). Fix in the next registration |
| PR #74 workflow change | Closure observer now skips non-`main` runs | `07-…` §1: a skipped PR closure is UNKNOWN, never PASS (EVD-14) |
| Open PRs | None | No merge conflict pending; a parallel session registered #73/#74, so check `main` again before registering |
| Issue #75 | Opened by Claude 2026-10-05 for this registration (SYS-21) | Registration pending; dry run on a scratch export of `6553eb4` gave 49 → 9 unresolved, 11 → 1 blocker (OQ-CERT-2) |
| Issue #67 | Requires command → Application Interface tracing, registry denial cases, missing-owner failure, matrix stays PROPOSED with runtime BLOCKED | `02-…` 0.2.0 adds interface and ledger columns, 8 registry cases, gap 6 |
| Issue #68 | Requires field/action/retention/hold matrix, corrected anonymization proposal, residual-linkage evidence | `03-…` 0.2.0 adds §4.2 residual linkage (L-1…L-7) and PRIV-X-11…14 |
| Issue #63 | Command ledger: 12 PARTIAL, 11 BLOCKED, 0 full-runtime | Copied per command into `02-…` §6 |
| Issues #58, #60 | P05 runtime atomic start and P06 Assignment shape gates, both open | `AssignContent` stays CONDITIONAL in `02-…`; Assignment rows in `03-…` stay PLANNED |
| Application Interfaces 1.0.0 | Commands and module reads only; HTTP paths and error envelope deferred to Transport Interfaces | `02-…` gap 6 (no transport query interfaces for 11 reads); `05-…` is the Transport Interfaces input |
| Branches `feat/p05-required-assignment-admission`, `fix/p05-admission-gate` | 78–79 commits behind; outcome already on `main` (P05 ADMIT, IMPLEMENTED) | None; stale |
| Branch `checkpoint/2026-10-05-foundation-recovery` | 2 unmerged commits: restore-drill record under `verification/checkpoints/`; its note says development is paused | None for this package; unmerged evidence record — merge or delete is your call |
| Other branches | All merged through PRs #65–#74 | None |

## 1. Result in one table

| Measure | Value | Truth state |
| --- | --- | --- |
| Live unresolved questions on `6553eb4` | 49 | Verified (repo inventory script rerun) |
| Registered since classification (PR #74) | 7 | Verified |
| Explicit implementation blockers (live) | 11 | Verified |
| Unresolved IDs with a preserved owner response | 49 / 49 | Verified (all are register records) |
| Ready to register with no new information | 13 | Proposed classification |
| Need an artifact in this package approved with them | 12 | Proposed |
| Close as registered disabled state | 10 | Proposed |
| Register supplied part, keep a narrower residual | 6 | Proposed |
| Owner draft corrected, needs approval | 3 | Proposed |
| Recommendation needs yes/no | 3 | Proposed |
| No value in any source | 2 (`OQ-CERT-2`, `OQ-PRIV-5`) | Verified absent |
| Rows still missing a named owner value | 9 (only `OQ-CERT-2` is a blocker) | Verified |

**Correction to the prior summary:** it said only one genuine owner unknown remained. One *explicit blocker* (`OQ-CERT-2`) remains unknown, but nine rows still lack a named owner value: export deadline, deletion deadline, email/OAuth providers, content approver, certification approver, API sunset period, evidence retention + archive, alert destination, billing cardinality. None of the other eight blocks implementation of what is being built now.

## 2. Files (paths mirror the repository)

| Path | Kind | Content |
| --- | --- | --- |
| `governance/proposals/2026-10-05-decision-closure/00-README.md` | index | This file |
| `…/01-closure-matrix.md` + `closure-matrix.json` + `closure-matrix.schema.json` | decision table | All 56 rows: preserved value, answer hashes, class, owner action, artifact, missing values, dependencies, conflicts, resolution evidence |
| `…/02-c14-authorization-capability-matrix.md` + `c14-capability-matrix.json` + `c14-negative-test-matrix.json` | decision table | 23 commands + 11 protected reads → 34 capabilities, 5 bundles, scopes, denial order, bootstrap exceptions, automation principals, 495 generated test cases |
| `…/03-c15-data-lifecycle-privacy-matrix.md` + `c15-data-lifecycle-matrix.json` | specification | Corrected privacy draft; 20 record classes with clocks, durations, expiry/offboard/deletion actions; legal hold; executor; request lifecycle |
| `…/04-session-transport-security-spec.md` | specification | Exact cookie headers, Origin CSRF rules, rotation events, headers (HSTS without `includeSubDomains`), verification cases TRS-1…TRS-10 |
| `…/05-api-boundary-manifest.md` + `api-boundary-manifest.json` + `api-error-envelope.schema.json` | specification | 3 exceptions, 31 routes (all unmounted), error envelope schema, versioning/deprecation rules, CI checks |
| `…/06-identity-tenancy-manager-registration-packet.md` | specification | Argon2id format, revocation, OAuth linking, enumeration resistance, membership DDL, scope algorithm, manager visibility |
| `…/07-evidence-release-operations-spec.md` | specification | Independence, evidence storage, truth mapping, Supabase exposure blocker, denial audit, smoke matrix, manual migration apply, logging |
| `…/08-deferred-feature-policy-register.md` + `deferred-feature-register.json` | decision table | 12 disabled/none features with fail-closed behavior, proof-of-absence checks, re-enable triggers |
| `…/09-governance-content-certification-web-packet.md` | specification | Precedence rule, compatibility register, demo applicability, content approvals, certification verification, CERT-2 unknown, WCAG 2.2 AA |
| `scripts/verification/validate-decision-closure.mjs` | proposed validator | Checks the package against the live inventory, register hashes, kernel commands, C14 invariants, API parity, deferred register |
| `scripts/tests/validate-decision-closure.test.mjs` | proposed tests | 1 positive + 36 negative cases (structure, semantic binding, manifest, totals, envelope policy, registration form) |
| `…/package-manifest.json` + `package-manifest.sha256` | manifest | SHA-256 and byte count of every package artifact, baseline, approval reference, registration form, change classification against the approved revision 1 (§M) |

## 3. Findings that are new facts about the baseline

| # | Finding | Evidence | Impact |
| --- | --- | --- | --- |
| F-1 | Supabase grants `anon`/`authenticated` CRUD on `public` tables by default; all V2 tables are created in `public` | Migrations; Supabase "Hardening the Data API" docs | **Release blocker** for any Supabase-backed environment until `07-…` §5 controls pass |
| F-2 | No registered command issues SetupToken/PasswordResetToken | `kernel/commands.json` vs `identity-token-service.ts` | IDN-12 manager setup has no grantable operation |
| F-3 | No command creates Organization or Location | `kernel/commands.json` | Tenant bootstrap and REL-3 smoke tenant impossible |
| F-4 | ContentPack ownership scope undefined | C31 text | `PublishContentPack` BLOCKED; `AssignContent` conditional |
| F-5 | No ReportingRelationship concept | `kernel/entities.json` | Manager visibility (OQ-MGR-1) evaluates to empty |
| F-6 | `learning_sessions` lacks `organization_id` and timestamps | `drizzle/0004_slice_p05_learning_session.sql` | PRIV-1/TEN-13 ownership and retention clock incomplete |
| F-7 | `identity_invitations` has no recipient column; `identity_credentials` has no OAuth provider/subject | Migrations | Invitation delivery and OAuth linking need schema admission |
| F-8 | Global Identity lifecycle commands have cross-organization effects in a multi-org model | IDN-18 + TEN-1 + OQ-TEN-3 resolution note | Multi-org targets blocked behind a guard until a policy exists |
| F-9 | No `deactivated_at` on identities | Migration 0001 | Retention clock for non-offboard deactivation undefined |

## 4. Owner decision sheet — approved 2026-10-05 04:05 (A–D); E stays open

A. **Approve or reject each document 02–09.** Approval of a document approves its engineering-proposed values; rejection sends specific rows back with the recorded values preserved.

B. **Confirm three recorded recommendations (yes/no):** `OQ-SES-1` SameSite=Lax; `OQ-SES-2` same-origin `https://t34ch.com`, host-only `__Host-` cookie, `Path=/`; `OQ-OBS-1` Sentry for errors with analytics left off.

C. **Choose in the corrected privacy draft (`03-…` §6):** C-1 tombstone via C11 revision (recommended); C-2 certification expiry via C34 revision (recommended); C-3 add `organization_id`/timestamps to learning sessions (recommended); R-1 null revoked password hashes (recommended).

D. **Approve three interpretations embedded in `02-…`:** `org_admin` sees the whole organization (not narrowed by reporting); AUTHZ-14 "inactive target" means out-of-visibility, while lifecycle-state mismatch is `409`; request-body validation runs after capability check.

E. **Values that stay open until their layer is next** (do not answer now unless you already know): export deadline, deletion deadline, email + OAuth providers, content approver, certification approver, API sunset period, evidence retention duration + archive location, alert destination, billing cardinality.

## 5. Registration plan per contract (one SYS-21 revision each)

Open rows only, versions as on `6553eb4`. This is the content of issue #75.

| Contract | Live → proposed | Questions closed or narrowed | Controlling documents |
| --- | --- | --- | --- |
| `c00-system-authority-contract.md` | 1.0.3 → 1.1.0 | `OQ-SYS-1`, `OQ-SYS-2`, `OQ-SYS-5` | 09 |
| `c02-automation-agent-authority-contract.md` | 1.0.3 → 1.1.0 | `OQ-AGT-1`, `OQ-AGT-2`, `OQ-AGT-3` | 02, 08 |
| `c11-identity-credentials-contract.md` | 1.5.0 → 1.6.0 | `OQ-IDN-7` | 06 |
| `c12-application-sessions-contract.md` | 1.1.0 → 1.2.0 | `OQ-SES-1`, `OQ-SES-2`, `OQ-SES-5`, `OQ-SES-6`, `OQ-SES-7` | 04 |
| `c14-authorization-capabilities-contract.md` | 1.2.0 → 1.3.0 | `OQ-AUTHZ-1` | 02 |
| `c15-data-isolation-privacy-contract.md` | 1.0.3 → 1.1.0 | `OQ-PRIV-1`, `OQ-PRIV-2`, `OQ-PRIV-3`, `OQ-PRIV-4`, `OQ-PRIV-5`, `OQ-PRIV-6` | 03 |
| `c21-database-migration-contract.md` | 1.1.0 → 1.2.0 | `OQ-MIG-3`, `OQ-MIG-4`, `OQ-MIG-5` | 07, 08 |
| `c22-transaction-idempotency-reconciliation-contract.md` | 1.2.0 → 1.3.0 | `OQ-TXN-2` | 07 |
| `c23-audit-lifecycle-events-contract.md` | 1.1.0 → 1.2.0 | `OQ-AUD-2`, `OQ-AUD-3` | 07 |
| `c31-content-teaching-engine-contract.md` | 1.1.0 → 1.2.0 | `OQ-CNT-2`, `OQ-CNT-3` | 08, 09 |
| `c32-learning-sessions-progress-contract.md` | 1.2.0 → 1.3.0 | `OQ-LRN-2` | 08 |
| `c33-manager-operations-contract.md` | 1.1.0 → 1.2.0 | `OQ-MGR-2` | 06 |
| `c34-certification-credentials-contract.md` | 1.2.0 → 1.3.0 | `OQ-CERT-2`, `OQ-CERT-3`, `OQ-CERT-5` | 08, 09 |
| `c41-api-boundary-contract.md` | 1.0.3 → 1.1.0 | `OQ-API-1`, `OQ-API-2`, `OQ-API-3` | 05 |
| `c42-web-client-boundary-contract.md` | 1.0.3 → 1.1.0 | `OQ-WEB-1`, `OQ-WEB-2` | 09 |
| `c51-verification-evidence-contract.md` | 1.0.3 → 1.1.0 | `OQ-EVD-1`, `OQ-EVD-2`, `OQ-EVD-3` | 07 |
| `c52-deployment-release-recovery-contract.md` | 1.2.0 → 1.3.0 | `OQ-REL-3` | 07 |
| `c53-observability-contract.md` | 1.1.0 → 1.2.0 | `OQ-OBS-1`, `OQ-OBS-2` | 07 |
| `c61-analytics-contract.md` | 1.0.3 → 1.1.0 | `OQ-ANL-1`, `OQ-ANL-2` | 08 |
| `c62-pwa-offline-contract.md` | 1.0.3 → 1.1.0 | `OQ-PWA-1` | 08 |
| `c63-billing-contract.md` | 1.1.0 → 1.2.0 | `OQ-BIL-1`, `OQ-BIL-2`, `OQ-BIL-3` | 08 |

21 contracts, 49 open rows. Where two documents feed one contract (C02, C21, C31, C34), they land in **one** revision so each contract version bumps once.

Order (dependency-first): C00 → C02 → C11 → C12 → C13 → C14 (needs C13 shape and C02 principals) → C15 → C21/C22/C23 → C31–C34 → C41/C42 → C51–C53 → C61–C63. C01 semantic changes for the 34 capability identifiers ride with C14.

## 6. How to apply

```bash
cd teach-v2                       # clean checkout of main at or after the baseline
unzip -o teach-v2-decision-closure-2026-10-05.zip   # paths mirror the repo; nothing outside them is touched
node scripts/docs/validate-document-metadata.mjs
node scripts/verification/validate-decision-closure.mjs
node --test scripts/tests/validate-decision-closure.test.mjs
pnpm audit:whole
```

Apply to a clean checkout of `main` at `6553eb4` or later. Expected: every command exits 0; the closure validator prints 7 "kept as history" notes for the #74 rows. If `validate-decision-closure.mjs` reports `stale`, a contract changed after the baseline — regenerate the affected rows before registering. `RESOLVED_SINCE_BASELINE` notes are informational.

Rollback: delete `governance/proposals/2026-10-05-decision-closure/` and the two proposed script files. No other file is changed.

## 7. What this package does not do

- Does not edit any contract, kernel registry, ownership map, migration, workflow, `package.json` or runtime code.
- Does not register any answer; registration is the owner-approved SYS-21 step per §5.
- Does not claim implementation, deployment or production conformance for anything.
- Did not read GitHub issues #67, #68 or PR #72 bodies (API access not attached); their scope was taken from repository files that cite them.
- The two scripts are proposals: they are not wired into any workflow.

## 8. Verification performed on this package

Run 2026-10-05 on a fresh scratch export of `main` @ `6553eb4` (re-checked unchanged) with revision 3.1 overlaid. Author self-check, not independent review (AGT-17).

| Check | Command | Result |
| --- | --- | --- |
| Package consistency, semantic binding, manifest, totals, envelope policy, registration form | `node scripts/verification/validate-decision-closure.mjs` | PASS, exit 0 (7 "kept as history" notes for the #74 rows) |
| Package tests | `node --test scripts/tests/validate-decision-closure.test.mjs` | 37 / 37 (1 positive, 36 negative); file-mutating cases run on a temporary copy |
| Document governance | `node scripts/docs/validate-document-metadata.mjs` | PASS, 83 governed docs (73 on `main` + these 10) |
| Whole-repository audit | `node scripts/architecture/validate-whole-repository.mjs` | PASS, 53 validators |
| Existing owner-inventory and validator tests | `node --test scripts/tests/validate-owner-decision-inventory.test.mjs scripts/tests/validate-validators.mjs` | 6 / 6 |
| No authority claimed | `deriveOwnerDecisionInventory` after overlay | Unchanged: 49 unresolved, 11 blockers, 12 physical-shape, 71 candidates |
| Defect found by the new tests and fixed | Missing artifact made the validator crash (ENOENT) | Now reports `manifest: listed artifact missing …` and stops fail-closed |

Not verified: GitHub CI on these files (nothing pushed); the registration itself; the independent exact-head audit; provider configuration; legal sufficiency of `03-…`.

## 9. Change log

| Version | Date | Change |
| --- | --- | --- |
| 0.1.0 | 2026-10-05 | Initial proposed package. |
| 0.2.0 | 2026-10-05 | Repository survey (§0); all documents revised against `6553eb4` after PR #74; owner chat approval recorded; registration pending #75. |
| 0.3.0 | 2026-10-05 | Audit response (§A): all 8 findings verified and fixed; registration form made authoritative (§R); manifest and approval binding added (§M); revision 3 needs approval of its exact manifest. |
| 0.3.1 | 2026-10-05 | Non-normative packaging clarification: split listed-artifact counts from complete archive inventory; corrected #75 inventory/Supabase reconciliation text; no decision, requirement, acceptance case, route, capability, privacy policy, or runtime authority changed. |
