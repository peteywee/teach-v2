<!--tos-doc
{
  "doc_id": "TEACH-CON-C34",
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

# C34 — Certification & Credentials Contract

| Field              | Value                                                                                                                                                           |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Contract ID        | C34                                                                                                                                                             |
| Group              | C30 Product Semantics                                                                                                                                           |
| Governed by        | C00 System Authority                                                                                                                                            |
| Version            | 1.0.2                                                                                                                                                           |
| Status             | `active`                                                                                                                                                        |
| Owner              | Patrick Craven, Top Shelf Service LLC                                                                                                                           |
| Approved by        | Patrick Craven (owner), 2026-10-03 — approval instruction given in chat at 10:47 CDT; transcribed by Claude at the owner's direction — see `APPROVAL-RECORD.md` |
| Requirement prefix | `CERT`                                                                                                                                                          |
| Activation         | Required for the core rebuild                                                                                                                                   |
| Legacy lineage     | Reference only — reworks legacy `.topshelf/contracts/domain/manager-operations.json` (sign-off/certification half).                                             |
| Supersedes         | None                                                                                                                                                            |
| Superseded by      | None                                                                                                                                                            |
| Created            | 2026-10-03                                                                                                                                                      |
| Last updated       | 2026-10-03                                                                                                                                                      |

## 1. Purpose and Failure Prevented

A cook gets certified on the grill station with no record of which version of the training they took, who watched them, or what evidence was seen. Later the certification is quietly deleted instead of revoked, and nobody can tell it ever existed. Or a public badge link exposes the cook's full name and location because the route happened to sit outside the auth middleware. A certification is a claim other people rely on; this contract makes it complete, atomic, permanent in history, and deliberately public or private.

## 2. Scope

This contract owns:

- Certification records
- Certification criteria versions
- Revocation records
- Credential verification surface

This contract does not own:

- Learner progress (C32)
- Content (C31)
- Audit storage (C23)

Related contracts: C00, C14, C23, C31, C32.

## 3. Definitions

| Term                 | Meaning                                                                                               |
| -------------------- | ----------------------------------------------------------------------------------------------------- |
| Certification        | A record that a learner met approved criteria for specific content, observed by an authorized person. |
| Criteria version     | An approved, versioned definition of what certification requires.                                     |
| Verification surface | Any route that confirms a certification to a party other than the learner.                            |

## 4. Requirements

The keywords MUST, MUST NOT, SHOULD, and MAY are used in the RFC 2119 sense. Requirement IDs are stable and MUST NOT be renumbered or reused.

- **CERT-1** — Issuance MUST require an active learner membership.
- **CERT-2** — Issuance MUST require an active assignment of the content to the learner.
- **CERT-3** — Issuance MUST bind the exact content identity and version.
- **CERT-4** — Issuance MUST bind an approved criteria/checklist version (see OQ-CERT-2; value Not yet verified).
- **CERT-5** — Issuance MUST record an observer who holds the observe/issue capability in the learner's scope.
- **CERT-6** — Issuance MUST record a server-assigned timestamp.
- **CERT-7** — Issuance MUST record evidence of the observed performance (see OQ-CERT-3; value Not yet verified).
- **CERT-8** — If any required issuance element is missing, issuance MUST be rejected and a certification record MUST NOT be created.
- **CERT-9** — The certification record and its audit record MUST commit atomically.
- **CERT-10** — Duplicate issuance requests MUST be idempotent and MUST NOT create a second certification.
- **CERT-11** — Revocation MUST be an explicit action that records actor, reason, timestamp, and an audit record.
- **CERT-12** — Certification and revocation history MUST be preserved; certification records MUST NOT be deleted through application paths.
- **CERT-13** — Every verification surface MUST be explicitly declared public or private in the C14 registry (see OQ-CERT-1; value Not yet verified); router placement MUST NOT determine it.
- **CERT-14** — A verification surface MUST reveal only the fields explicitly listed as public.
- **CERT-15** — Whether a learner may observe their own certification MUST follow the owner's decision (see OQ-CERT-4; value Not yet verified); until decided, self-observation MUST be rejected.

## 5. Acceptance Cases

| Case      | Proves                                                         | Setup                                                  | Expected                                                                   |
| --------- | -------------------------------------------------------------- | ------------------------------------------------------ | -------------------------------------------------------------------------- |
| CERT-AC-1 | CERT-1, CERT-2, CERT-3, CERT-4, CERT-5, CERT-6, CERT-7, CERT-8 | Issue with each required element missing in turn       | Each rejected; zero certification records                                  |
| CERT-AC-2 | CERT-9                                                         | Force audit failure during issuance                    | No certification record                                                    |
| CERT-AC-3 | CERT-10                                                        | Submit issuance 3× with one key, including double-tap  | One certification                                                          |
| CERT-AC-4 | CERT-11, CERT-12                                               | Revoke a certification; attempt delete via app role    | Revocation record + audit present; original record retained; delete denied |
| CERT-AC-5 | CERT-13                                                        | Registry validation for verification routes            | Each declares public or private                                            |
| CERT-AC-6 | CERT-14                                                        | Call public verification                               | Response contains only listed public fields                                |
| CERT-AC-7 | CERT-15                                                        | Learner submits issuance naming themselves as observer | Rejected until decided                                                     |

## 6. Open Questions

| ID        | Question                                                                                                           | Blocks implementation | Affects |
| --------- | ------------------------------------------------------------------------------------------------------------------ | --------------------- | ------- |
| OQ-CERT-1 | Is credential verification public (anyone with the link) or private (authenticated, scoped)? (Deferred by Gate A.) | Yes                   | CERT-13 |
| OQ-CERT-2 | Who approves certification criteria versions, and where is approval recorded?                                      | Yes                   | CERT-4  |
| OQ-CERT-3 | What evidence types are acceptable (observation notes, checklist, photo, other)?                                   | No                    | CERT-7  |
| OQ-CERT-4 | May an actor ever be both learner and observer for the same certification?                                         | No                    | CERT-15 |
| OQ-CERT-5 | Do certifications expire, and if so how is expiry represented?                                                     | No                    | —       |

## 7. Verification Status

| Item                         | State                    | Detail                                                                                                                                                                                                                                                |
| ---------------------------- | ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Target codebase              | verified (limited scope) | `peteywee/teach-v2`, default branch `main` (owner-declared). Cloned 2026-10-03: repository exists and has no commits, so no SHA is anchored. Teach v2 is a new build on these contracts (owner statement, 2026-10-03).                                |
| Legacy repository consulted  | reference only           | `peteywee/teach` `work/TR-0010-production-cutover` at `79fdce5cc3b2` (`main` at `99162f17eace`), read 2026-10-03 for lineage: legacy domain contract JSON files and the Gate A decision record. Legacy code was not inspected and does not govern v2. |
| Implementation conformance   | unknown                  | Not yet verified. No v2 implementation was inspected; the owner states v2 is yet to be built.                                                                                                                                                         |
| Acceptance cases implemented | unknown                  | Not yet verified. No mapping between repository tests and these IDs has been established.                                                                                                                                                             |
| Blocking open questions      | 2 open                   | Contract is `active` with these open. Each blocks implementation of the requirements it affects beyond fail-closed behavior until decided (SYS-34).                                                                                                   |
| Owner approval               | declared                 | Approved by the owner on 2026-10-03; recorded in `APPROVAL-RECORD.md`. Initial owner-approval baseline is commit `2c9b1c849a520ba817efc91150be9a37797f4238`; this 1.0.2 revision is tracked by Git history.                                                                     |
| Independent review           | not performed            | Drafted and self-checked by Claude against the contract-authoring checklist only.                                                                                                                                                                     |
| Source of intent             | declared                 | Owner-supplied rebuild proposal (`source/2026-10-03-teach-v2-contract-hierarchy-proposal.md`), consolidated decisions (`source/2026-10-03-teach-rebuild-consolidated-decisions.md`), and legacy Gate A owner decisions (2026-07-22) where cited.      |

## 8. Change Log

| Version | Date       | Change                                                                                                                                                                                          | By               |
| ------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- |
| 0.1.0   | 2026-10-03 | Initial proposed draft from the owner-supplied hierarchy proposal. Not approved.                                                                                                                | Claude (drafter) |
| 0.2.0   | 2026-10-03 | Group renamed to C30 Product Semantics; CERT-2 requires an active assignment; CERT-4 names the criteria/checklist version.                                                                      | Claude (drafter) |
| 0.3.0   | 2026-10-03 | Retargeted to the Teach v2 codebase: legacy `peteywee/teach` is reference only; anchors and paths no longer point into the legacy repository.                                                   | Claude (drafter) |
| 0.4.0   | 2026-10-03 | Anchored to `peteywee/teach-v2` branch `main` (owner-declared); the repository had no commits when cloned on 2026-10-03, so the anchor SHA stays Not yet verified.                              | Claude (drafter) |
| 1.0.0   | 2026-10-03 | Approved by the owner; status changed from `proposed` to `active`. Open questions remain open and block implementation of the requirements they affect (SYS-34) instead of blocking activation. | Claude (drafter) |
| 1.0.1   | 2026-10-03 | Non-normative document-governance metadata/provenance normalization; 1.0.0 owner approval remained controlling. | ChatGPT (governance) |
| 1.0.2   | 2026-10-03 | Non-normative baseline cleanup: corrected stale current-status provenance after the contract spine was committed; no behavioral requirement changed. | ChatGPT (governance) |
