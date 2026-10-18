<!--tos-doc
{
  "doc_id": "TEACH-CON-C33",
  "class": "contract",
  "version": "1.3.0",
  "claims_truth_state": "declared",
  "status": "active",
  "owner": "Patrick Craven, Top Shelf Service LLC",
  "created_on": "2026-10-03",
  "updated_on": "2026-10-17",
  "effective_on": "2026-10-17",
  "approval": {
    "state": "approved",
    "approved_version": "1.3.0",
    "approved_on": "2026-10-17",
    "record": "domains/demo-runtime/owner-approval.json",
    "basis": "TEACH-DEMO-RUNTIME-2026-10-17@0.1.0; SYS-21 #82; SHA256SUMS sha256:a1df23b03a0f0660a072cff00eb40d3d2fb60bc8c521f12b56977f559601196a"
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
    "TEACH-CON-C33@1.1.0",
    "TEACH-CON-C33@1.2.0"
  ],
  "superseded_by": null,
  "depends_on": [
    "contracts/"
  ],
  "demo_runtime_registration": {
    "package": "TEACH-DEMO-RUNTIME-2026-10-17@0.1.0",
    "approval_record": "domains/demo-runtime/owner-approval.json",
    "issue": "#82",
    "source_package": "domains/demo-runtime/proposal-0.1.0",
    "sha256sums_sha256": "a1df23b03a0f0660a072cff00eb40d3d2fb60bc8c521f12b56977f559601196a",
    "semantic_authority_only": true,
    "physical_schema_admission": false,
    "runtime_activation": false,
    "deployment_authority": false
  }
}
-->

# C33 — Manager Operations Contract

| Field              | Value                                                                                                                                                           |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Contract ID        | C33                                                                                                                                                             |
| Group              | C30 Product Semantics                                                                                                                                           |
| Governed by        | C00 System Authority                                                                                                                                            |
| Version | 1.3.0 |
| Status             | `active`                                                                                                                                                        |
| Owner              | Patrick Craven, Top Shelf Service LLC                                                                                                                           |
| Approved by | Patrick Craven (owner), 2026-10-17; TEACH-DEMO-RUNTIME-2026-10-17@0.1.0; SYS-21 #82; see `domains/demo-runtime/owner-approval.json` |
| Requirement prefix | `MGR`                                                                                                                                                           |
| Activation         | Required for the core rebuild                                                                                                                                   |
| Legacy lineage     | Reference only — reworks legacy `.topshelf/contracts/domain/manager-operations.json` (operations half); certification moves to C34.                             |
| Supersedes | 1.2.0 |
| Superseded by      | None                                                                                                                                                            |
| Created            | 2026-10-03                                                                                                                                                      |
| Last updated | 2026-10-17 |

## 1. Purpose and Failure Prevented

A manager's dashboard is built with its own idea of who the manager can see, separate from the API's. The two drift: the screen shows a cook from another location, or a cook the manager can see is one the API would refuse. Meanwhile the dashboard shows progress numbers computed in the browser. This contract keeps the manager surface as a view over authoritative data and capabilities, never a second authorization system.

## 2. Scope

This contract owns:

- Manager team views
- Content assignment operations
- Manager-initiated setup and offboarding requests

This contract does not own:

- Identity lifecycle execution (C11)
- Capabilities (C14)
- Learner progress (C32)
- Certification (C34)

Related contracts: C00, C11, C14, C23, C32, C34.

## 3. Definitions

| Term       | Meaning                                                                                                        |
| ---------- | -------------------------------------------------------------------------------------------------------------- |
| Manager    | An actor holding manager capabilities within a scope. Being someone's reporting manager is not the same thing. |
| Assignment | The scoped act of making a content version available to a learner.                                             |

## 4. Requirements

The keywords MUST, MUST NOT, SHOULD, and MAY are used in the RFC 2119 sense. Requirement IDs are stable and MUST NOT be renumbered or reused.

- **MGR-1** — Manager capability MUST be separate from reporting relationships.
- **MGR-2** — Managers MUST act only within their authorized organization and location scope.
- **MGR-3** — Manager visibility is `DIRECT_REPORTS_WITHIN_APPROVED_SCOPE`: a manager sees only their direct reports intersected with their current organization/location scope. Reporting relationships narrow visibility and MUST NOT grant capabilities. Owner approved on 2026-10-05.
- **MGR-4** — Team reads MUST derive from authoritative membership and scope.
- **MGR-5** — Each manager action MUST require its own capability.
- **MGR-6** — Managers MUST see only persisted learner state.
- **MGR-7** — Assignment operations MUST be scoped and MUST produce an audit record per C23.
- **MGR-8** — Manager-initiated offboarding MUST call the canonical identity lifecycle service of C11.
- **MGR-9** — The manager UI MUST NOT implement an authorization model of its own.
- **MGR-10** — Managers MUST NOT be able to create or retrieve employee passwords or PINs.

## 5. Acceptance Cases

| Case     | Proves       | Setup                                                                                     | Expected                                            |
| -------- | ------------ | ----------------------------------------------------------------------------------------- | --------------------------------------------------- |
| MGR-AC-1 | MGR-1, MGR-3 | Actor with reports but no manager capability; manager with capability and limited reports | First: 403; second: sees only reports in scope      |
| MGR-AC-2 | MGR-2, MGR-4 | Manager lists team in two-location fixture                                                | Only in-scope members                               |
| MGR-AC-3 | MGR-5        | Manager holding view capability but not assign/offboard attempts each action              | Each lacking action denied 403                      |
| MGR-AC-4 | MGR-6        | Dashboard for learner with client-only progress fixture                                   | Shows only persisted values                         |
| MGR-AC-5 | MGR-7        | Assign in scope and out of scope                                                          | In-scope succeeds with audit; out-of-scope 404      |
| MGR-AC-6 | MGR-8        | Manager offboards a learner; architecture test                                            | Calls lifecycle service; C11 offboarding cases pass |
| MGR-AC-7 | MGR-9        | Static check of manager UI for permission logic beyond reading API-supplied capabilities  | None found                                          |
| MGR-AC-8 | MGR-10       | Covered by IDN mgr_no_cred cases                                                          | See IDN acceptance cases                            |

## 6. Open Questions

| ID       | Question                                                                                | Blocks implementation | Affects |
| -------- | --------------------------------------------------------------------------------------- | --------------------- | ------- |
| OQ-MGR-1 | **Resolved** Is manager visibility limited to direct reports, the whole location, or configurable? | Yes                   | MGR-3   |
| OQ-MGR-2 | **Resolved.** Owner, 2026-10-05: Manager offboarding requires a dedicated capability through the canonical Identity lifecycle service and current scope. It grants no credential control or global lifecycle authority; multi-organization effects remain BLOCKED until a separate policy exists. See `governance/decision-closure/06-identity-tenancy-manager-registration-packet.md`. (Decision-closure r3.1) | No (resolved) | — |

## 7. Verification Status

| Item                         | State                    | Detail                                                                                                                                                                                                                                                |
| ---------------------------- | ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Target codebase              | verified (limited scope) | `peteywee/teach-v2` default branch `main`, verified through governance baseline commit `292e8da9123987e9d94f09669c7bc6b6d43c4320` on 2026-10-03. The repository contains the contract/governance foundation; application implementation remains not yet built.                                |
| Legacy repository consulted  | reference only           | `peteywee/teach` `work/TR-0010-production-cutover` at `79fdce5cc3b2` (`main` at `99162f17eace`), read 2026-10-03 for lineage: legacy domain contract JSON files and the Gate A decision record. Legacy code was not inspected and does not govern v2. |
| Implementation conformance   | unknown                  | Not yet verified. No v2 implementation was inspected; the owner states v2 is yet to be built.                                                                                                                                                         |
| Acceptance cases implemented | unknown                  | Not yet verified. No mapping between repository tests and these IDs has been established.                                                                                                                                                             |
| Blocking open questions      | 0 open | Only unresolved question rows govern blocking; registration is not implementation evidence |
| Owner approval               | declared | 1.2.0 owner approval recorded in APPROVAL-RECORD.md under #75; runtime implementation conformance remains UNKNOWN |
| Independent review           | not performed            | Drafted and self-checked by Claude against the contract-authoring checklist only.                                                                                                                                                                     |
| Source of intent             | declared                 | Owner-supplied rebuild proposal (`source/2026-10-03-teach-v2-contract-hierarchy-proposal.md`), consolidated decisions (`source/2026-10-03-teach-rebuild-consolidated-decisions.md`), and legacy Gate A owner decisions (2026-07-22) where cited.      |

## 8. Change Log

| Version | Date | Change | By |
| ------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- |
| 0.1.0   | 2026-10-03 | Initial proposed draft from the owner-supplied hierarchy proposal. Not approved.                                                                                                                | Claude (drafter) |
| 0.2.0   | 2026-10-03 | Group renamed to C30 Product Semantics. No requirement changes.                                                                                                                                 | Claude (drafter) |
| 0.3.0   | 2026-10-03 | Retargeted to the Teach v2 codebase: legacy `peteywee/teach` is reference only; anchors and paths no longer point into the legacy repository.                                                   | Claude (drafter) |
| 0.4.0   | 2026-10-03 | Anchored to `peteywee/teach-v2` branch `main` (owner-declared); the repository had no commits when cloned on 2026-10-03, so the anchor SHA stays Not yet verified.                              | Claude (drafter) |
| 1.0.0   | 2026-10-03 | Approved by the owner; status changed from `proposed` to `active`. Open questions remain open and block implementation of the requirements they affect (SYS-34) instead of blocking activation. | Claude (drafter) |
| 1.0.1   | 2026-10-03 | Non-normative document-governance metadata/provenance normalization; 1.0.0 owner approval remained controlling. | ChatGPT (governance) |
| 1.0.2   | 2026-10-03 | Non-normative baseline cleanup: corrected stale current-status provenance after the contract spine was committed; no behavioral requirement changed. | ChatGPT (governance) |
| 1.0.3   | 2026-10-03 | Non-normative truth-state cleanup: verification status now anchors the live v2 repository through governance baseline `292e8da9123987e9d94f09669c7bc6b6d43c4320`; no behavioral requirement changed. | ChatGPT (governance) |
| 1.2.0 | 2026-10-05 | Register OQ-MGR-2; preserve named residuals and existing requirement/acceptance IDs. Decision-closure r3.1 manifest sha256:ff7b51df1e3a235e9d226d9d7232f81c64bbeb451b359b6e0f2ea232b6e1757c; SYS-21 #75. | Patrick Craven (owner); ChatGPT (recorder) |

## Registered demo runtime amendment (1.3.0)

Exact owner-approved scope: `TEACH-DEMO-RUNTIME-2026-10-17@0.1.0`, SYS-21 [#82](https://github.com/peteywee/teach-v2/issues/82). Approval provenance: `domains/demo-runtime/owner-approval.json`; immutable source: `domains/demo-runtime/proposal-0.1.0/contract-amendments.md`. The addendum below is the approved revision, not an exception inferred by an implementer. It changes only its explicitly named demo behavior; ordinary/customer semantics and unrelated gates remain unchanged. Proposal labels in the immutable package preserve its pre-approval history; this registration supplies current authority. Physical schema admission, runtime activation and shared deployment remain separate.

Admit only the canonical synthetic content and learning definitions in learning-definition.md/JSON. Organization-owned copies do not select a future customer/global catalog policy. Publish remains internal/control-plane, scoped to the fresh run and frozen synthetic template. Customer approval remains absent. AssignContent accepts exact immutable version/digest and explicit target learner with current scope/reporting eligibility; new deliberate keys may create new practice assignments, while retries cannot duplicate.

Single-choice teaching responses are server-evaluated against authored answer data. Per-response answer-match feedback is not XP, mastery, rank, certification or an aggregate score. Completion is permitted only when all ordered required responses are recorded; correctness is not a completion gate. One session per Assignment; new practice requires an explicit new Assignment. Maximum ten assignments and thirty accepted response events per run. Session completion stays terminal; manager reads persisted state and cannot edit learning events.

Exact definitions and field constraints are incorporated from `domains/demo-runtime/proposal-0.1.0/demo-boundary.md`, `domains/demo-runtime/proposal-0.1.0/authority-and-audit.md`, `domains/demo-runtime/proposal-0.1.0/learning-definition.md`, `domains/demo-runtime/proposal-0.1.0/learning-definition.json`, and `domains/demo-runtime/proposal-0.1.0/transport-and-queries.json` with its referenced schemas. No definition beyond that approved package is introduced.
