<!--tos-doc
{
  "doc_id": "TEACH-CON-C31",
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
    "TEACH-CON-C31@1.1.0"
  ],
  "superseded_by": null,
  "depends_on": [
    "contracts/"
  ]
}
-->

# C31 — Content & Teaching Engine Contract

| Field              | Value                                                                                                                                                           |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Contract ID        | C31                                                                                                                                                             |
| Group              | C30 Product Semantics                                                                                                                                           |
| Governed by        | C00 System Authority                                                                                                                                            |
| Version            | 1.2.0 |
| Status             | `active`                                                                                                                                                        |
| Owner              | Patrick Craven, Top Shelf Service LLC                                                                                                                           |
| Approved by        | Patrick Craven (owner), 2026-10-05; manifest-bound decision-closure r3.1, SYS-21 #75; see `APPROVAL-RECORD.md` |
| Requirement prefix | `CNT`                                                                                                                                                           |
| Activation         | Required for the core rebuild                                                                                                                                   |
| Legacy lineage     | Reference only — reworks legacy `.topshelf/contracts/domain/content-engine.json`.                                                                               |
| Supersedes         | 1.1.0 |
| Superseded by      | None                                                                                                                                                            |
| Created            | 2026-10-03                                                                                                                                                      |
| Last updated       | 2026-10-05 |

## 1. Purpose and Failure Prevented

A content pack is edited in place after cooks have already completed it. Their progress now points at questions that changed underneath them, and a certification issued last month cannot say what it actually certified. Or a pack is labelled as approved by a customer that never approved it. This contract makes published content immutable per version, validated before use, and honest about who approved it.

## 2. Scope

This contract owns:

- The canonical content-pack schema and its versions
- Content validation and publication
- Legacy format adapters
- Teaching engine core behavior

This contract does not own:

- Who may access content (C14, C33)
- Learner progress (C32)
- Commercial and IP terms (customer agreements, outside this contract set)

Related contracts: C00, C14, C32, C33.

## 3. Definitions

| Term         | Meaning                                                                                          |
| ------------ | ------------------------------------------------------------------------------------------------ |
| Content pack | A unit of teaching content conforming to the canonical schema.                                   |
| Published    | A pack version that has passed validation and may be assigned.                                   |
| Engine core  | The teaching logic that turns a pack and learner inputs into prompts, evaluations, and outcomes. |

## 4. Requirements

The keywords MUST, MUST NOT, SHOULD, and MAY are used in the RFC 2119 sense. Requirement IDs are stable and MUST NOT be renumbered or reused.

- **CNT-1** — Exactly one canonical content-pack schema MUST exist.
- **CNT-2** — The schema MUST be versioned using strict SemVer 2.0, and every pack MUST declare the exact schema version it conforms to. Published content is immutable. All references MUST use exact version/digest. Owner approved SEMVER_SCHEMA_AND_PACK_IMMUTABLE_REFERENCES on 2026-10-05.
- **CNT-3** — A pack MUST pass validation against its declared schema version before it can be published or assigned.
- **CNT-4** — An invalid pack MUST NOT be served, assigned, or used by the engine.
- **CNT-5** — Legacy formats MUST be accepted only through explicit adapters, each registered as compatibility code under C00.
- **CNT-6** — A published pack identity and version MUST NOT change; any change MUST produce a new version.
- **CNT-7** — The engine MUST produce identical outputs for the same pack version, inputs, and seed.
- **CNT-8** — Engine core code MUST NOT depend on a web framework, database client, network client, or browser API.
- **CNT-9** — Content existence MUST be separate from content assignment.
- **CNT-10** — Knowing or possessing a pack ID MUST NOT grant access to the pack; access MUST follow C14 and assignment.
- **CNT-11** — Customer-approval claims MUST be backed by a Content-owned append-only approval bound to content_pack_id, version and digest, recording authorized actor, organization scope, time and audit atomically. New versions inherit no approval; withdrawal is a new record. Approver role/title remains UNKNOWN, so no approval record or claim is authorized until selected. See `governance/decision-closure/09-governance-content-certification-web-packet.md`. (OQ-CNT-2 partially registered 2026-10-05).
- **CNT-12** — Challenge configuration and engine schema MUST remain in parity, enforced by an automated check.

## 5. Acceptance Cases

| Case     | Proves        | Setup                                                                    | Expected                                                    |
| -------- | ------------- | ------------------------------------------------------------------------ | ----------------------------------------------------------- |
| CNT-AC-1 | CNT-1, CNT-2  | Schema inventory; every pack fixture                                     | One schema module; every pack declares a version            |
| CNT-AC-2 | CNT-3, CNT-4  | Publish and assign an invalid pack                                       | Both rejected                                               |
| CNT-AC-3 | CNT-5         | Load a legacy-format pack                                                | Only via a registered adapter; unregistered format rejected |
| CNT-AC-4 | CNT-6         | Attempt to modify a published pack version                               | Rejected; new version required                              |
| CNT-AC-5 | CNT-7         | Run engine twice with same pack, inputs, seed                            | Byte-identical outputs                                      |
| CNT-AC-6 | CNT-8         | Dependency check on engine core package                                  | No forbidden imports                                        |
| CNT-AC-7 | CNT-9, CNT-10 | Learner requests an existing but unassigned pack by ID                   | Non-disclosing 404                                          |
| CNT-AC-8 | CNT-11        | Pack metadata contains an approval claim without an authorization record | Validation fails                                            |
| CNT-AC-9 | CNT-12        | Change challenge config without schema update                            | Parity check fails CI                                       |

## 6. Open Questions

| ID       | Question                                                                            | Blocks implementation | Affects |
| -------- | ----------------------------------------------------------------------------------- | --------------------- | ------- |
| OQ-CNT-1 | **Resolved** What versioning scheme applies to the schema and to packs (semver, integer, other)? | No                    | CNT-2 (approved 2026-10-05) |
| OQ-CNT-2 | **Open — residual only.** Which customer content-approver role/title is approved? Owner, 2026-10-05: Customer-approval claims MUST be backed by a Content-owned append-only approval bound to content_pack_id, version and digest, recording authorized actor, organization scope, time and audit atomically. New versions inherit no approval; withdrawal is a new record. Approver role/title remains UNKNOWN, so no approval record or claim is authorized until selected. See `governance/decision-closure/09-governance-content-certification-web-packet.md`. (Decision-closure r3.1; partial registration) | No | CNT-11 |
| OQ-CNT-3 | **Resolved.** Owner, 2026-10-05: No legacy content format is accepted. Admission requires one named adapter per format, deterministic conversion/version validation, positive and negative fixtures and a C00 compatibility-register entry with removal condition. See `governance/decision-closure/08-deferred-feature-policy-register.md`. (Decision-closure r3.1) | No (resolved) | — |

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
| ------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- |
| 0.1.0   | 2026-10-03 | Initial proposed draft from the owner-supplied hierarchy proposal. Not approved.                                                                                                                      | Claude (drafter) |
| 0.2.0   | 2026-10-03 | Group renamed to C30 Product Semantics. No requirement changes.                                                                                                                                       | Claude (drafter) |
| 0.3.0   | 2026-10-03 | Retargeted to the Teach v2 codebase: legacy `peteywee/teach` is reference only; anchors and paths no longer point into the legacy repository. Commercial terms no longer reference legacy file paths. | Claude (drafter) |
| 0.4.0   | 2026-10-03 | Anchored to `peteywee/teach-v2` branch `main` (owner-declared); the repository had no commits when cloned on 2026-10-03, so the anchor SHA stays Not yet verified.                                    | Claude (drafter) |
| 1.0.0   | 2026-10-03 | Approved by the owner; status changed from `proposed` to `active`. Open questions remain open and block implementation of the requirements they affect (SYS-34) instead of blocking activation.       | Claude (drafter) |
| 1.0.1   | 2026-10-03 | Non-normative document-governance metadata/provenance normalization; 1.0.0 owner approval remained controlling. | ChatGPT (governance) |
| 1.0.2   | 2026-10-03 | Non-normative baseline cleanup: corrected stale current-status provenance after the contract spine was committed; no behavioral requirement changed. | ChatGPT (governance) |
| 1.0.3   | 2026-10-03 | Non-normative truth-state cleanup: verification status now anchors the live v2 repository through governance baseline `292e8da9123987e9d94f09669c7bc6b6d43c4320`; no behavioral requirement changed. | ChatGPT (governance) |
| 1.2.0 | 2026-10-05 | Register OQ-CNT-2, OQ-CNT-3; preserve named residuals and existing requirement/acceptance IDs. Decision-closure r3.1 manifest sha256:ff7b51df1e3a235e9d226d9d7232f81c64bbeb451b359b6e0f2ea232b6e1757c; SYS-21 #75. | Patrick Craven (owner); ChatGPT (recorder) |
