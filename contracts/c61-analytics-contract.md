<!--tos-doc
{
  "doc_id": "TEACH-CON-C61",
  "class": "contract",
  "version": "1.1.0",
  "claims_truth_state": "declared",
  "status": "active",
  "owner": "Patrick Craven, Top Shelf Service LLC",
  "created_on": "2026-10-03",
  "updated_on": "2026-10-05",
  "effective_on": "2026-10-05",
  "approval": {
    "state": "approved",
    "approved_version": "1.1.0",
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
    "TEACH-CON-C61@1.0.3"
  ],
  "superseded_by": null,
  "depends_on": [
    "contracts/"
  ]
}
-->

# C61 — Analytics Contract

| Field              | Value                                                                                                                                                           |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Contract ID        | C61                                                                                                                                                             |
| Group              | C60 Optional Feature Contracts                                                                                                                                  |
| Governed by        | C00 System Authority                                                                                                                                            |
| Version            | 1.1.0 |
| Status             | `active`                                                                                                                                                        |
| Owner              | Patrick Craven, Top Shelf Service LLC                                                                                                                           |
| Approved by        | Patrick Craven (owner), 2026-10-05; manifest-bound decision-closure r3.1, SYS-21 #75; see `APPROVAL-RECORD.md` |
| Requirement prefix | `ANL`                                                                                                                                                           |
| Activation         | Conditional — binding only when the owner enables this feature                                                                                                  |
| Legacy lineage     | Reference only — reworks legacy `.topshelf/contracts/domain/analytics-audit.json` (analytics half).                                                             |
| Supersedes         | 1.0.3 |
| Superseded by      | None                                                                                                                                                            |
| Created            | 2026-10-03                                                                                                                                                      |
| Last updated       | 2026-10-05 |

## 1. Purpose and Failure Prevented

Demo sessions run by the founder get counted as real customer engagement, and a pitch cites the number. Or a broken analytics script throws, and the learner's challenge submission fails with it. This contract keeps analytics advisory, separable from demo traffic, and unable to break learning.

## 2. Scope

This contract owns:

- Analytics event names and schemas
- Demo/tenant classification of events
- Analytics data minimization

This contract does not own:

- Audit (C23)
- Business state (all other contracts)

Related contracts: C00, C23.

## 3. Definitions

| Term            | Meaning                                      |
| --------------- | -------------------------------------------- |
| Analytics event | A non-authoritative record of product usage. |

## 4. Requirements

The keywords MUST, MUST NOT, SHOULD, and MAY are used in the RFC 2119 sense. Requirement IDs are stable and MUST NOT be renumbered or reused.

This contract belongs to C60 (Good to Have). Its requirements bind only after the owner enables the feature it governs; until then, only the requirement that keeps the feature disabled is binding.

- **ANL-1** — This contract MUST become binding only when the owner enables analytics; until then, product analytics MUST NOT be collected.
- **ANL-2** — Event names and schemas MUST be versioned.
- **ANL-3** — An analytics event MUST NOT be used as authoritative business state.
- **ANL-4** — Analytics failure MUST NOT block or fail a learning or manager operation.
- **ANL-5** — Every event MUST carry tenant classification and a real, demo, or synthetic traffic classification.
- **ANL-6** — Product KPIs MUST be computable with demo and synthetic traffic excluded.
- **ANL-7** — The identifying-field allowlist is empty: no identifying analytics field is permitted. Any later minimum field list requires a C61 revision; this decision does not enable analytics. See `governance/decision-closure/08-deferred-feature-policy-register.md`. (OQ-ANL-2 resolved 2026-10-05).
- **ANL-8** — Analytics events MUST remain separate from audit records.

## 5. Acceptance Cases

| Case     | Proves       | Setup                                              | Expected                     |
| -------- | ------------ | -------------------------------------------------- | ---------------------------- |
| ANL-AC-1 | ANL-1        | Analytics disabled; run core paths                 | No events emitted            |
| ANL-AC-2 | ANL-2, ANL-5 | Validate emitted events against registry           | All versioned and classified |
| ANL-AC-3 | ANL-3        | Static check: domain code reads no analytics store | Passes                       |
| ANL-AC-4 | ANL-4        | Analytics endpoint unavailable; run core paths     | All succeed                  |
| ANL-AC-5 | ANL-6        | KPI query with demo filter on mixed fixture        | Demo events excluded         |
| ANL-AC-6 | ANL-7        | Scan events for non-approved fields                | None                         |
| ANL-AC-7 | ANL-8        | Covered by AUD not_analytics case                  | See AUD acceptance cases     |

## 6. Open Questions

| ID       | Question                                                      | Blocks implementation | Affects |
| -------- | ------------------------------------------------------------- | --------------------- | ------- |
| OQ-ANL-1 | **Resolved.** Owner, 2026-10-05: Product analytics remains DISABLED with no selected provider, SDK, beacon or emitted analytics event. Enablement requires an owner decision naming provider, versioned event schema and approved fields through a C61 revision. See `governance/decision-closure/08-deferred-feature-policy-register.md`. (Decision-closure r3.1) | No (resolved) | — |
| OQ-ANL-2 | **Resolved.** Owner, 2026-10-05: The identifying-field allowlist is empty: no identifying analytics field is permitted. Any later minimum field list requires a C61 revision; this decision does not enable analytics. See `governance/decision-closure/08-deferred-feature-policy-register.md`. (Decision-closure r3.1) | No (resolved) | ANL-7 |

## 7. Verification Status

| Item                         | State                    | Detail                                                                                                                                                                                                                                                |
| ---------------------------- | ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Target codebase              | verified (limited scope) | `peteywee/teach-v2` default branch `main`, verified through governance baseline commit `292e8da9123987e9d94f09669c7bc6b6d43c4320` on 2026-10-03. The repository contains the contract/governance foundation; application implementation remains not yet built.                                |
| Legacy repository consulted  | reference only           | `peteywee/teach` `work/TR-0010-production-cutover` at `79fdce5cc3b2` (`main` at `99162f17eace`), read 2026-10-03 for lineage: legacy domain contract JSON files and the Gate A decision record. Legacy code was not inspected and does not govern v2. |
| Implementation conformance   | unknown                  | Not yet verified. No v2 implementation was inspected; the owner states v2 is yet to be built.                                                                                                                                                         |
| Acceptance cases implemented | unknown                  | Not yet verified. No mapping between repository tests and these IDs has been established.                                                                                                                                                             |
| Blocking open questions      | 0 open | Only unresolved question rows govern blocking; registration is not implementation evidence |
| Owner approval               | declared | 1.1.0 owner approval recorded in APPROVAL-RECORD.md under #75; runtime implementation conformance remains UNKNOWN |
| Independent review           | not performed            | Drafted and self-checked by Claude against the contract-authoring checklist only.                                                                                                                                                                     |
| Source of intent             | declared                 | Owner-supplied rebuild proposal (`source/2026-10-03-teach-v2-contract-hierarchy-proposal.md`), consolidated decisions (`source/2026-10-03-teach-rebuild-consolidated-decisions.md`), and legacy Gate A owner decisions (2026-07-22) where cited.      |

## 8. Change Log

| Version | Date | Change | By |
| ------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- |
| 0.1.0   | 2026-10-03 | Initial proposed draft from the owner-supplied hierarchy proposal. Not approved.                                                                                                                | Claude (drafter) |
| 0.2.0   | 2026-10-03 | Group renamed to C60 Optional Feature Contracts; ANL-5 and ANL-6 cover synthetic as well as demo traffic.                                                                                       | Claude (drafter) |
| 0.3.0   | 2026-10-03 | Retargeted to the Teach v2 codebase: legacy `peteywee/teach` is reference only; anchors and paths no longer point into the legacy repository.                                                   | Claude (drafter) |
| 0.4.0   | 2026-10-03 | Anchored to `peteywee/teach-v2` branch `main` (owner-declared); the repository had no commits when cloned on 2026-10-03, so the anchor SHA stays Not yet verified.                              | Claude (drafter) |
| 1.0.0   | 2026-10-03 | Approved by the owner; status changed from `proposed` to `active`. Open questions remain open and block implementation of the requirements they affect (SYS-34) instead of blocking activation. | Claude (drafter) |
| 1.0.1   | 2026-10-03 | Non-normative document-governance metadata/provenance normalization; 1.0.0 owner approval remained controlling. | ChatGPT (governance) |
| 1.0.2   | 2026-10-03 | Non-normative baseline cleanup: corrected stale current-status provenance after the contract spine was committed; no behavioral requirement changed. | ChatGPT (governance) |
| 1.0.3   | 2026-10-03 | Non-normative truth-state cleanup: verification status now anchors the live v2 repository through governance baseline `292e8da9123987e9d94f09669c7bc6b6d43c4320`; no behavioral requirement changed. | ChatGPT (governance) |
| 1.1.0 | 2026-10-05 | Register OQ-ANL-1, OQ-ANL-2; preserve named residuals and existing requirement/acceptance IDs. Decision-closure r3.1 manifest sha256:ff7b51df1e3a235e9d226d9d7232f81c64bbeb451b359b6e0f2ea232b6e1757c; SYS-21 #75. | Patrick Craven (owner); ChatGPT (recorder) |
