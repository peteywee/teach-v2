<!--tos-doc
{
  "doc_id": "TEACH-CON-C00",
  "class": "contract",
  "claims_truth_state": "declared",
  "status": "active",
  "written_against": {
    "repo": "peteywee/teach-v2",
    "ref": "main",
    "head_sha": "Not yet verified",
    "note": "repository had no commits when cloned 2026-10-03"
  },
  "legacy_reference": {
    "repo": "peteywee/teach",
    "ref": "work/TR-0010-production-cutover",
    "head_sha": "79fdce5cc3b207750888e5c2c1c198159ad17077",
    "use": "reference only; does not govern and is not governed by this contract"
  },
  "depends_on": [
    "contracts/"
  ]
}
-->

# C00 — System Authority Contract

| Field              | Value                                                                                                                                                           |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Contract ID        | C00                                                                                                                                                             |
| Group              | C00 System Authority                                                                                                                                            |
| Governed by        | None (root contract)                                                                                                                                            |
| Version            | 1.0.0                                                                                                                                                           |
| Status             | `active`                                                                                                                                                        |
| Owner              | Patrick Craven, Top Shelf Service LLC                                                                                                                           |
| Approved by        | Patrick Craven (owner), 2026-10-03 — approval instruction given in chat at 10:47 CDT; transcribed by Claude at the owner's direction — see `APPROVAL-RECORD.md` |
| Requirement prefix | `SYS`                                                                                                                                                           |
| Activation         | Required for the core rebuild                                                                                                                                   |
| Legacy lineage     | Reference only — absorbs the binding principles of legacy `docs/decisions/gate-a-saas-foundation-contracts.md`; does not replace that historical record.        |
| Supersedes         | None                                                                                                                                                            |
| Superseded by      | None                                                                                                                                                            |
| Created            | 2026-10-03                                                                                                                                                      |
| Last updated       | 2026-10-03                                                                                                                                                      |

## 1. Purpose and Failure Prevented

The audited legacy Teach codebase accumulated parallel answers to the same question: more than one session mechanism, compatibility shims with no removal condition, and CI-green branches described as production truth. The concrete failure looks like this: a manager offboards an employee; the offboarding path revokes one kind of session but not the other; the employee keeps working in the app on a still-valid credential; and when someone asks which rule was supposed to stop that, two documents and three code paths give three different answers. This contract exists so that every behavior question has exactly one governing document, every security-sensitive operation has exactly one path, and anything the system cannot prove it is allowed to do, it does not do.

## 2. Scope

This contract owns:

- Contract authority, precedence, and the rule that lower contracts cannot weaken higher ones
- Contract status lifecycle (`proposed`, `active`, `superseded`) and owner approval
- The compatibility-code register
- Demo and vertical-slice contract gates
- The fail-closed default for unknown, ambiguous, contradictory, or unavailable authority

This contract does not own:

- Any specific domain behavior (owned by C11–C63)
- Evidence mechanics (C51) and release mechanics (C52)

Related contracts: C01, C02, C11, C12, C14, C21, C22, C23, C31, C32, C33, C34, C41, C42, C51, C52, C61.

## 3. Definitions

| Term                         | Meaning                                                                                                                                                                                                         |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Contract                     | A document in the v2 repository's `contracts/` directory that states required behavior using MUST / MUST NOT / SHOULD / MAY in the RFC 2119 sense.                                                              |
| Owning contract              | The single contract whose Scope section lists a given piece of state or behavior.                                                                                                                               |
| Security-sensitive operation | Authentication, session issuance and revocation, membership resolution, authorization, identity lifecycle (including offboarding), certification issue and revocation, schema migration, and release promotion. |
| Compatibility code           | Code that exists only to bridge a legacy shape, path, or data model to the contracted one.                                                                                                                      |
| Fail closed                  | Deny the operation, perform no state change and no external side effect, and return the denial semantics of C14.                                                                                                |
| Owner                        | Patrick Craven, Top Shelf Service LLC.                                                                                                                                                                          |

## 4. Requirements

The keywords MUST, MUST NOT, SHOULD, and MAY are used in the RFC 2119 sense. Requirement IDs are stable and MUST NOT be renumbered or reused.

- **SYS-1** — Where implementation and an `active` contract disagree, the implementation MUST be treated as non-conforming.
- **SYS-2** — A contract MUST NOT be edited to match existing implementation except through the revision procedure in **SYS-21**.
- **SYS-3** — Precedence MUST follow the order C00, C01, C02, C10, C20, C30, C40, C50, C60, where an earlier contract or group governs a later one.
- **SYS-4** — Until the owner decides intra-group precedence (see OQ-SYS-1; value Not yet verified), a conflict between two contracts in the same group MUST be recorded as a conflict and the more restrictive requirement MUST apply.
- **SYS-5** — A lower contract MUST NOT weaken, reinterpret, or create an exception to a requirement in a higher contract; any clause that attempts to do so MUST be treated as void.
- **SYS-6** — Each piece of mutable state MUST have exactly one owning contract, recorded in that contract's Scope section.
- **SYS-7** — Each piece of mutable state MUST have exactly one owning component permitted to write it.
- **SYS-8** — Each security-sensitive operation MUST have exactly one canonical implementation path; a second path MUST NOT exist unless it is registered compatibility code.
- **SYS-9** — When the authority for an operation is unknown, ambiguous, contradictory, or cannot be read, the operation MUST fail closed.
- **SYS-10** — Unavailability of an authority source (database, provider, registry, configuration) MUST NOT be interpreted as permission.
- **SYS-11** — Every piece of compatibility code MUST be listed in the compatibility register with: identifier, location, bounded scope, owning contract, tests, and removal condition (register location: see OQ-SYS-2; value Not yet verified).
- **SYS-12** — Compatibility code that is not in the register MUST be treated as a contract violation and a release blocker.
- **SYS-13** — A claim that production conforms to any contract MUST be supported by evidence that binds the exact source SHA, the exact environment, and authoritative runtime readback, as defined in C51 and C52.
- **SYS-14** — CI success MUST NOT be cited as evidence that production conforms.
- **SYS-15** — An external side effect whose outcome is ambiguous MUST be reconciled against canonical provider state before any retry, as defined in C22.
- **SYS-16** — Implementation MUST NOT add externally observable behavior (a route, persisted state, an external call, or a capability) unless an owning contract permits it.
- **SYS-17** — A contract MUST NOT take status `active` without a recorded owner approval that names the contract ID and version.
- **SYS-18** — An AI assistant or automated agent MUST NOT set a contract's status to `active` or record approval on the owner's behalf.
- **SYS-19** — A `proposed` contract MUST NOT be cited as authority for an implementation decision.
- **SYS-20** — _Retired._ Was: new product features, including the guided demo, could not begin until C00 through C23 were `active`. Replaced in 0.2.0 by the demo and slice gates **SYS-29** to **SYS-33**.
- **SYS-21** — A material change to an `active` contract MUST: have a GitHub issue; include an impact analysis naming the affected contracts, implementation, and evidence; preserve the prior version under `contracts/superseded/` with status `superseded`; bump `Version`; record the change and reason in the Change Log; update acceptance cases before code changes; and regenerate dependent evidence after the implementation changes.
- **SYS-22** — Requirement IDs MUST NOT be renumbered or reused; a removed requirement MUST be marked retired.
- **SYS-23** — This contract set MUST be the only contract authority for the Teach v2 codebase; contracts and decision records from the legacy Teach repository MUST NOT govern v2 and MAY be consulted only as reference.
- **SYS-24** — Implementation MUST NOT silently redefine canonical vocabulary; vocabulary changes MUST follow C01.
- **SYS-25** — Unknown evidence MUST remain UNKNOWN until evidence resolves it, as defined in C51.
- **SYS-26** — An `active` contract MUST govern until it is explicitly superseded; age, disuse, or implementation drift MUST NOT be treated as supersession.
- **SYS-27** — A contract change MUST be approved before any implementation change that depends on it is merged.
- **SYS-28** — Legacy Teach implementation MUST NOT be carried into v2 unless the reuse names an owning contract, an owner, and a purpose; the legacy repository MAY be used freely as a reference and evidence source.
- **SYS-29** — A learner demo MUST NOT be presented until C00, C01, C02, the applicable parts of C11–C15 and C21–C23 (see OQ-SYS-5; value Not yet verified), C31, C32, C41, and C42 are `active`.
- **SYS-30** — A manager demonstration MUST NOT be presented until, in addition, C33 is `active`.
- **SYS-31** — A certification demonstration MUST NOT be presented until, in addition, C34 is `active`.
- **SYS-32** — Runtime AI, analytics, PWA/offline, and self-service billing MUST NOT be treated as prerequisites for the learner demo.
- **SYS-33** — Implementation of a vertical slice MUST NOT begin until every contract the slice depends on is `active`.
- **SYS-34** — A requirement whose value depends on an undecided open question MUST NOT be implemented beyond its fail-closed behavior until the owner decides the question and the decision is written into the contract through the revision procedure.

## 5. Acceptance Cases

| Case      | Proves                            | Setup                                                                                                                                         | Expected                                                                                                                            |
| --------- | --------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| SYS-AC-1  | SYS-9, SYS-10                     | Authorization's database read is forced to fail during a protected mutation                                                                   | Request is denied; zero rows written; zero external calls observed                                                                  |
| SYS-AC-2  | SYS-9                             | Two authority sources return contradictory answers for one request (test double)                                                              | Request is denied; no side effect                                                                                                   |
| SYS-AC-3  | SYS-11, SYS-12                    | CI check scans for compatibility markers and compares to the register                                                                         | Any unlisted marker fails the check; every register entry names a removal condition                                                 |
| SYS-AC-4  | SYS-8                             | Static/architecture test enumerates call sites of session issuance, session revocation, offboarding, certification issue, and migration apply | Exactly one implementation per operation, or the extra path is a register entry                                                     |
| SYS-AC-5  | SYS-6, SYS-7                      | Contract index check lists every state item named in Scope sections                                                                           | No state item appears in two contracts' Scope; each item names one writer component                                                 |
| SYS-AC-6  | SYS-16                            | Route inventory diffed against C14 registry and contract Scope sections                                                                       | Any route, table, external call, or capability without an owning contract fails the check                                           |
| SYS-AC-7  | SYS-17, SYS-18, SYS-19            | Contract index check reads each file's status and the approval record                                                                         | Every `active` contract has a matching owner approval entry; no `active` status without one                                         |
| SYS-AC-8  | SYS-13, SYS-14                    | A release record cites only CI results                                                                                                        | Release record is rejected as insufficient under C51/C52                                                                            |
| SYS-AC-9  | SYS-3, SYS-5, SYS-4, SYS-1, SYS-2 | Manual review of each new or revised contract against higher contracts                                                                        | Manual evidence: review record lists every cross-contract reference and confirms no weakening; conflicts are filed, not edited away |
| SYS-AC-10 | —                                 | Retired in 0.2.0 with **SYS-20**                                                                                                              | Replaced by the demo and slice gate cases                                                                                           |
| SYS-AC-11 | SYS-21, SYS-22                    | A contract revision PR                                                                                                                        | Superseded copy exists; version bumped; change log entry present; no requirement ID changed meaning or number                       |
| SYS-AC-12 | SYS-15                            | Covered by C22 acceptance cases                                                                                                               | See TXN-AC cases                                                                                                                    |
| SYS-AC-13 | SYS-23                            | v2 repository scan for governing references to legacy `.topshelf/contracts/` files or legacy decision records                                 | None found; any such reference fails the check                                                                                      |
| SYS-AC-14 | SYS-24                            | Covered by C01 SEM-AC-9                                                                                                                       | See SEM-AC-9                                                                                                                        |
| SYS-AC-15 | SYS-25                            | Covered by C51 EVD-AC-1                                                                                                                       | See EVD-AC-1                                                                                                                        |
| SYS-AC-16 | SYS-26, SYS-27                    | Implementation PR depends on a contract change that has no approval record                                                                    | Manual evidence: PR blocked until approval recorded                                                                                 |
| SYS-AC-17 | SYS-28                            | v2 PR copies a module from the legacy repository                                                                                              | Manual evidence: PR names owning contract, owner, and purpose, or is rejected                                                       |
| SYS-AC-18 | SYS-29, SYS-30, SYS-31, SYS-32    | Demo readiness check reads contract statuses against the demo gate table                                                                      | Demo blocked when a required contract is not `active`; not blocked by C61–C63 or runtime AI                                         |
| SYS-AC-19 | SYS-33                            | Slice work order lists its contracts; one is `proposed`                                                                                       | Manual evidence: work order blocked at DEFINE                                                                                       |
| SYS-AC-20 | SYS-34                            | Work order or PR implements a requirement whose open question is undecided (for example a session lifetime value)                             | Manual evidence: blocked at DEFINE; only fail-closed behavior may ship                                                              |

## 6. Open Questions

| ID       | Question                                                                                                                                                                                                                             | Blocks implementation | Affects |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------- | ------- |
| OQ-SYS-1 | Does numeric order within a group (for example C11 before C12) define precedence, or are contracts within a group peers?                                                                                                             | No                    | SYS-4   |
| OQ-SYS-2 | Where does the compatibility register live, and in what format (Markdown table, machine-readable file checked in CI, or both)?                                                                                                       | No                    | SYS-11  |
| OQ-SYS-3 | **Resolved.** Owner, 2026-10-03: v2 is a new build governed only by these contracts. Legacy `.topshelf/contracts/domain/*.json` does not govern v2 and is not superseded in place; it stays with the legacy repository as reference. | No (resolved)         | —       |
| OQ-SYS-4 | **Resolved.** Owner, 2026-10-03: these contracts govern the Teach v2 codebase, not the legacy repository or its branches.                                                                                                            | No (resolved)         | —       |
| OQ-SYS-5 | Which parts of C11–C15 and C21–C23 are applicable to the learner demo?                                                                                                                                                               | No                    | SYS-29  |
| OQ-SYS-6 | **Resolved.** Owner, 2026-10-03: Teach v2 lives in `peteywee/teach-v2`; default branch `main`. The repository had no commits when cloned on 2026-10-03, so anchors carry no SHA yet.                                                 | No (resolved)         | —       |

## 7. Verification Status

| Item                         | State                    | Detail                                                                                                                                                                                                                                                |
| ---------------------------- | ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Target codebase              | verified (limited scope) | `peteywee/teach-v2`, default branch `main` (owner-declared). Cloned 2026-10-03: repository exists and has no commits, so no SHA is anchored. Teach v2 is a new build on these contracts (owner statement, 2026-10-03).                                |
| Legacy repository consulted  | reference only           | `peteywee/teach` `work/TR-0010-production-cutover` at `79fdce5cc3b2` (`main` at `99162f17eace`), read 2026-10-03 for lineage: legacy domain contract JSON files and the Gate A decision record. Legacy code was not inspected and does not govern v2. |
| Implementation conformance   | unknown                  | Not yet verified. No v2 implementation was inspected; the owner states v2 is yet to be built.                                                                                                                                                         |
| Acceptance cases implemented | unknown                  | Not yet verified. No mapping between repository tests and these IDs has been established.                                                                                                                                                             |
| Blocking open questions      | 0 open                   | Contract is `active` with these open. Each blocks implementation of the requirements it affects beyond fail-closed behavior until decided (SYS-34).                                                                                                   |
| Owner approval               | declared                 | Approved by the owner on 2026-10-03 (chat instruction); recorded in `APPROVAL-RECORD.md`. Not yet committed to `peteywee/teach-v2`: no commit was visible on `main` when checked.                                                                     |
| Independent review           | not performed            | Drafted and self-checked by Claude against the contract-authoring checklist only.                                                                                                                                                                     |
| Source of intent             | declared                 | Owner-supplied rebuild proposal (`source/2026-10-03-teach-v2-contract-hierarchy-proposal.md`), consolidated decisions (`source/2026-10-03-teach-rebuild-consolidated-decisions.md`), and legacy Gate A owner decisions (2026-07-22) where cited.      |

## 8. Change Log

| Version | Date       | Change                                                                                                                                                                                                                                                                                                                                                                             | By               |
| ------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- |
| 0.1.0   | 2026-10-03 | Initial proposed draft from the owner-supplied hierarchy proposal. Not approved.                                                                                                                                                                                                                                                                                                   | Claude (drafter) |
| 0.2.0   | 2026-10-03 | Applied the 2026-10-03 consolidated decisions: added C01 and C02 to precedence (SYS-3); retired SYS-20 in favor of the demo and slice gates (SYS-29 to SYS-33); added impact analysis and evidence regeneration to the revision procedure (SYS-21); added SYS-24 to SYS-28 (vocabulary, UNKNOWN evidence, supersession, contract-first, reuse); retired SYS-AC-10; added OQ-SYS-5. | Claude (drafter) |
| 0.3.0   | 2026-10-03 | Retargeted to the Teach v2 codebase: legacy `peteywee/teach` is reference only; anchors and paths no longer point into the legacy repository. SYS-23 rewritten (this set is the only authority for v2; legacy contracts are reference only); SYS-28 reworded for legacy-to-v2 reuse; OQ-SYS-3 and OQ-SYS-4 resolved by owner statement; added OQ-SYS-6 (v2 repository).            | Claude (drafter) |
| 0.4.0   | 2026-10-03 | Anchored to `peteywee/teach-v2` branch `main` (owner-declared); the repository had no commits when cloned on 2026-10-03, so the anchor SHA stays Not yet verified. OQ-SYS-6 resolved by owner statement.                                                                                                                                                                           | Claude (drafter) |
| 1.0.0   | 2026-10-03 | Approved by the owner; status changed from `proposed` to `active`. Open questions remain open and block implementation of the requirements they affect (SYS-34) instead of blocking activation. Added SYS-34 and SYS-AC-20 at activation.                                                                                                                                          | Claude (drafter) |
