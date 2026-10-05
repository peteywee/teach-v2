<!--tos-doc
{
  "doc_id": "TEACH-CON-C52",
  "class": "contract",
  "version": "1.2.0",
  "claims_truth_state": "declared",
  "status": "active",
  "owner": "Patrick Craven, Top Shelf Service LLC",
  "created_on": "2026-10-03",
  "updated_on": "2026-10-04",
  "effective_on": "2026-10-03",
  "approval": {
    "state": "approved",
    "approved_version": "1.2.0",
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
    "TEACH-CON-C52@1.1.0"
  ],
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
| Version | 1.2.0 |
| Status             | `active`                                                                                                                                                        |
| Owner              | Patrick Craven, Top Shelf Service LLC                                                                                                                           |
| Approved by | Patrick Craven (owner), 2026-10-04 — selected policy values; SYS-21 issue #66 |
| Requirement prefix | `REL`                                                                                                                                                           |
| Activation         | Required for the core rebuild                                                                                                                                   |
| Legacy lineage     | New.                                                                                                                                                            |
| Supersedes | C52 1.1.0 |
| Superseded by      | None                                                                                                                                                            |
| Created            | 2026-10-03                                                                                                                                                      |
| Last updated | 2026-10-04 |

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
- Hosting platform provisioning (OQ-REL-1 now records the approved release targets only)

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
- **REL-6** — Production configuration MUST be represented by a deterministic canonical manifest. Runtime-affecting non-secret values MUST be represented directly; secrets MUST be represented only by stable deployment-bound provider secret-version/revision identifiers or equivalent opaque revision identifiers, never raw secret values or secret-derived hashes. The candidate configuration identity MUST be the SHA-256 of the sorted canonical manifest. A required config/secret without a stable revision identity MUST block release.
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

- **REL-17** — Rollback to the prior named candidate MUST remain supported for 24 hours after deployment/promotion. Data migrations MUST remain backward-compatible with the prior candidate throughout that window. Promotion MUST block when compatibility or the exact prior-candidate rollback path is UNKNOWN; selecting the window MUST NOT authorize migration execution or deployment.
- **REL-18** — The owner-selected release hosting targets are Supabase PostgreSQL for the database and Vercel for web/API hosting. Target project/environment/configuration identities and concrete provider capabilities MUST be evidenced for an actual candidate; selecting platforms MUST NOT substitute for C21/C52 release gates or authorize provisioning, spending or production execution.

## 5. Acceptance Cases

| Case     | Proves               | Setup                                                                                   | Expected                                                            |
| -------- | -------------------- | --------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| REL-AC-1 | REL-1, REL-2, REL-14 | Change configuration after gates pass                                                   | Candidate invalidated; gates must re-run                            |
| REL-AC-2 | REL-3, REL-4         | Candidate with one skipped required check                                               | Promotion blocked                                                   |
| REL-AC-3 | REL-5, REL-11        | Candidate with pending migration and no backup proof                                    | Promotion blocked                                                   |
| REL-AC-4 | REL-6                | Build configuration identity twice with reordered keys, then change a non-secret value or secret revision; omit one required secret revision | Reordering preserves identity; any effective config/revision change changes identity; missing stable revision blocks promotion |
| REL-AC-5 | REL-7, REL-8, REL-9  | Deploy candidate; deployed SHA reported by runtime differs from candidate (test double) | Promotion blocked                                                   |
| REL-AC-6 | REL-10, REL-15       | Release record without named rollback binding                                           | Promotion blocked                                                   |
| REL-AC-7 | REL-12               | Promotion attempted without owner approval record                                       | Blocked                                                             |
| REL-AC-8 | REL-13               | Push commit to the production branch after acceptance                                   | New candidate created; production not updated until gates pass      |
| REL-AC-9 | REL-16               | Review of release communications                                                        | Manual evidence: no product-success claim based on deployment alone |
| REL-AC-10 | REL-10, REL-15, REL-17 | Evaluate rollback compatibility at deployment and throughout 24 hours; omit prior candidate or use an incompatible migration | Support covers the full 24-hour window; missing/UNKNOWN compatibility or rollback binding blocks promotion |
| REL-AC-11 | REL-1, REL-18 | Inspect hosting selection and attempt release without concrete project/environment/config/provider evidence | Supabase PostgreSQL + Vercel selection recorded; missing actual target/capability proof blocks release |

## 6. Open Questions

| ID       | Question                                                                            | Blocks implementation | Affects |
| -------- | ----------------------------------------------------------------------------------- | --------------------- | ------- |
| OQ-REL-1 | Resolved: Supabase PostgreSQL for the database and Vercel for web/API hosting. This does not approve a project, hostname, plan, provider authorization model or deployment. | No (resolved) | — |
| OQ-REL-3 | What does the deployed smoke test cover?                                            | No                    | REL-8   |
| OQ-REL-4 | Resolved: rollback to the prior candidate is supported for 24 hours after deployment/promotion; migrations remain backward-compatible during that full window. | No (resolved) | — |

### Resolved owner decision in 1.1.0

- **OQ-REL-2 — `CANONICAL_CONFIG_MANIFEST_SHA256`:** every candidate uses a deterministic sorted configuration manifest; runtime-affecting non-secret values are represented directly; secrets are represented only by stable deployment-bound revision identifiers; raw secret values and secret-derived hashes are excluded; SHA-256 of the canonical manifest is the candidate configuration identity. Missing stable revision identity fails closed.

## 7. Verification Status

| Item                         | State                    | Detail                                                                                                                                                                                                                                                |
| ---------------------------- | ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Target codebase | verified (limited scope) | Consulted current V2 main 3fe92889aa55fa4a69d3b1e28c3a1211719b1b3f: foundation source and governance inspected for issue #66. Source inspection is not deployed conformance. |
| Legacy repository consulted | reference only | Historical lineage is preserved in the superseded version and pinned V1 recovery records. No V1 policy/grants are adopted by issue #66; the new capability matrix is governed separately by #67. |
| Implementation conformance | partial foundations / UNKNOWN runtime | Provider-neutral configuration-identity and production-migration evidence gates exist. Supabase PostgreSQL + Vercel and the 24-hour rollback window are selected policy; actual provider targets/capabilities, deployments, prior-candidate rollback and compatibility proof remain UNKNOWN. |
| Acceptance cases implemented | structural / UNKNOWN operational | REL-AC-4 has deterministic configuration-identity tests. New REL-AC-10/11 declarations are checked structurally; actual 24-hour rollback/provider release acceptance remains UNKNOWN. |
| Blocking open questions | 0 open | OQ-REL-1/2/4 resolved; OQ-REL-3 smoke coverage remains open. Actual production promotion still requires every applicable gate and explicit owner approval. |
| Owner approval | declared | 1.2.0 approved policy selections recorded under #66; no runtime conformance, provisioning, deletion or production authority is inferred. |
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
| 1.1.0   | 2026-10-04 | Normative production-proof revision: resolve OQ-REL-2 with `CANONICAL_CONFIG_MANIFEST_SHA256`; refine REL-6 and REL-AC-4; GitHub issue #30. | Patrick Craven (owner approval) |
| 1.2.0 | 2026-10-04 | Record owner-selected OQ-REL-1, OQ-REL-4 policy values, append requirement/acceptance cases and preserve prior version; SYS-21 #66. No runtime implementation or production permission. | Patrick Craven (owner selection) |
