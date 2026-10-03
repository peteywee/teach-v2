<!--tos-doc
{
  "doc_id": "TEACH-CON-C15",
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

# C15 — Data Isolation & Privacy Contract

| Field              | Value                                                                                                                                                           |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Contract ID        | C15                                                                                                                                                             |
| Group              | C10 Trust & Security                                                                                                                                            |
| Governed by        | C00 System Authority                                                                                                                                            |
| Version            | 1.0.2                                                                                                                                                           |
| Status             | `active`                                                                                                                                                        |
| Owner              | Patrick Craven, Top Shelf Service LLC                                                                                                                           |
| Approved by        | Patrick Craven (owner), 2026-10-03 — approval instruction given in chat at 10:47 CDT; transcribed by Claude at the owner's direction — see `APPROVAL-RECORD.md` |
| Requirement prefix | `PRIV`                                                                                                                                                          |
| Activation         | Required for the core rebuild                                                                                                                                   |
| Legacy lineage     | New. No adequate predecessor.                                                                                                                                   |
| Supersedes         | None                                                                                                                                                            |
| Superseded by      | None                                                                                                                                                            |
| Created            | 2026-10-03                                                                                                                                                      |
| Last updated       | 2026-10-03                                                                                                                                                      |

## 1. Purpose and Failure Prevented

The audit found a gap between what Teach's privacy and data-processing language promised and what the system could actually execute. A pilot employee asks to have their data deleted; the policy says it will be purged; there is no purge mechanism, so the honest answer is that nothing happens. Separately, a cook logs out on a shared kitchen tablet and the next cook opens the app to the first cook's progress screen from a cache. This contract forbids promises the system cannot keep and makes "deleted" mean one thing.

## 2. Scope

This contract owns:

- Record ownership rules
- Data export and deletion request lifecycles
- Retention and purge semantics
- Meanings of deleted, anonymized, retained, offboarded
- Shared-device data exposure rules

This contract does not own:

- Tenant scope resolution (C13)
- Authorization decisions (C14)
- Audit record content (C23)

Related contracts: C00, C13, C14, C23, C53, C61, C62.

## 3. Definitions

| Term                                      | Meaning                                                                                                                                                     |
| ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Deleted, anonymized, retained, offboarded | Distinct lifecycle terms whose exact meanings MUST be recorded in this contract; content pending an owner decision (see OQ-PRIV-1; value Not yet verified). |
| Protected record                          | Any record that is not intentionally public.                                                                                                                |
| Shared device                             | A device used by more than one identity, such as a kitchen tablet.                                                                                          |

## 4. Requirements

The keywords MUST, MUST NOT, SHOULD, and MAY are used in the RFC 2119 sense. Requirement IDs are stable and MUST NOT be renumbered or reused.

- **PRIV-1** — Every protected record MUST have explicit ownership (organization and, where applicable, identity).
- **PRIV-2** — Cross-tenant access MUST be impossible through normal API paths.
- **PRIV-3** — Every query over protected records MUST include an ownership/scope predicate derived from authoritative scope, enforced in the data-access layer rather than in route handlers alone.
- **PRIV-4** — Protected data MUST NOT appear in error messages returned to a party not authorized to read it.
- **PRIV-5** — Protected data MUST NOT be sent to analytics beyond what C61 permits.
- **PRIV-6** — Protected data MUST NOT be written to logs beyond what C53 permits.
- **PRIV-7** — Private API responses MUST NOT be stored in shared HTTP caches.
- **PRIV-8** — Private API responses MUST NOT be cached by the service worker unless C62 permits it.
- **PRIV-9** — Protected data MUST NOT persist in browser storage after logout.
- **PRIV-10** — Data-export requests MUST have an implemented fulfillment lifecycle with explicit states, an owner, and a terminal outcome.
- **PRIV-11** — Data-deletion requests MUST have an implemented fulfillment lifecycle with explicit states, an owner, and a terminal outcome.
- **PRIV-12** — Every stated retention period MUST correspond to an executable mechanism that enforces it (see OQ-PRIV-2; value Not yet verified).
- **PRIV-13** — The terms deleted, anonymized, retained, and offboarded MUST each have one recorded meaning, and code and documents MUST NOT use them interchangeably.
- **PRIV-14** — A policy, contract template, or UI MUST NOT promise hard purge unless an executable purge mechanism exists.
- **PRIV-15** — Legal and audit records exempt from deletion MUST be explicitly listed with the reason for exemption (see OQ-PRIV-3; value Not yet verified).
- **PRIV-16** — After logout on a shared device, the next user MUST NOT be able to see the previous user's data in UI, memory, caches, or storage.
- **PRIV-17** — Published privacy statements MUST NOT describe behavior the system does not execute.

## 5. Acceptance Cases

| Case       | Proves                             | Setup                                                                                              | Expected                                                                               |
| ---------- | ---------------------------------- | -------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| PRIV-AC-1  | PRIV-1                             | Schema inventory of protected tables                                                               | Each has ownership columns; none nullable where required                               |
| PRIV-AC-2  | PRIV-2, PRIV-3                     | Tenant A/B suite plus static check of data-access functions for scope predicates                   | No cross-tenant reads; every protected query function requires a scope argument        |
| PRIV-AC-3  | PRIV-4                             | Trigger validation, not-found, and server errors on protected resources from an unauthorized actor | Bodies contain no protected field values                                               |
| PRIV-AC-4  | PRIV-5, PRIV-6                     | Run core paths with log and analytics capture; scan for seeded canary values                       | No canary values found                                                                 |
| PRIV-AC-5  | PRIV-7                             | Inspect cache headers on private responses                                                         | Responses are marked non-storable by shared caches                                     |
| PRIV-AC-6  | PRIV-8, PRIV-9, PRIV-16            | Browser E2E: user A signs in, uses core paths, logs out; user B signs in on same profile           | No A data in UI, storage, or Cache Storage                                             |
| PRIV-AC-7  | PRIV-10                            | Submit export request; drive to completion and to rejection                                        | Each terminal state reachable; audit trail present                                     |
| PRIV-AC-8  | PRIV-11                            | Submit deletion request; drive to completion                                                       | Records reach the defined deleted/anonymized state; exempt records retained and listed |
| PRIV-AC-9  | PRIV-12                            | Seed records past each retention period; run the retention mechanism                               | Records are processed per contract; any period without a mechanism fails the check     |
| PRIV-AC-10 | PRIV-13, PRIV-14, PRIV-17, PRIV-15 | Review of privacy policy, DPA template, and UI copy against this contract                          | Manual evidence: every promise maps to a requirement and a passing acceptance case     |

## 6. Open Questions

| ID        | Question                                                                                          | Blocks implementation | Affects |
| --------- | ------------------------------------------------------------------------------------------------- | --------------------- | ------- |
| OQ-PRIV-1 | What exactly do deleted, anonymized, retained, and offboarded mean in Teach?                      | Yes                   | —       |
| OQ-PRIV-2 | What retention periods apply to each record class?                                                | Yes                   | PRIV-12 |
| OQ-PRIV-3 | Which record classes are exempt from deletion, and on what legal or audit basis?                  | Yes                   | PRIV-15 |
| OQ-PRIV-4 | What export format and fulfillment deadline apply?                                                | No                    | —       |
| OQ-PRIV-5 | What deletion fulfillment deadline applies?                                                       | No                    | —       |
| OQ-PRIV-6 | Can export and deletion be fulfilled by an operator procedure at first, rather than self-service? | No                    | —       |

## 7. Verification Status

| Item                         | State                    | Detail                                                                                                                                                                                                                                                |
| ---------------------------- | ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Target codebase              | verified (limited scope) | `peteywee/teach-v2`, default branch `main` (owner-declared). Cloned 2026-10-03: repository exists and has no commits, so no SHA is anchored. Teach v2 is a new build on these contracts (owner statement, 2026-10-03).                                |
| Legacy repository consulted  | reference only           | `peteywee/teach` `work/TR-0010-production-cutover` at `79fdce5cc3b2` (`main` at `99162f17eace`), read 2026-10-03 for lineage: legacy domain contract JSON files and the Gate A decision record. Legacy code was not inspected and does not govern v2. |
| Implementation conformance   | unknown                  | Not yet verified. No v2 implementation was inspected; the owner states v2 is yet to be built.                                                                                                                                                         |
| Acceptance cases implemented | unknown                  | Not yet verified. No mapping between repository tests and these IDs has been established.                                                                                                                                                             |
| Blocking open questions      | 3 open                   | Contract is `active` with these open. Each blocks implementation of the requirements it affects beyond fail-closed behavior until decided (SYS-34).                                                                                                   |
| Owner approval               | declared                 | Approved by the owner on 2026-10-03; recorded in `APPROVAL-RECORD.md`. Initial owner-approval baseline is commit `2c9b1c849a520ba817efc91150be9a37797f4238`; this 1.0.2 revision is tracked by Git history.                                                                     |
| Independent review           | not performed            | Drafted and self-checked by Claude against the contract-authoring checklist only.                                                                                                                                                                     |
| Source of intent             | declared                 | Owner-supplied rebuild proposal (`source/2026-10-03-teach-v2-contract-hierarchy-proposal.md`), consolidated decisions (`source/2026-10-03-teach-rebuild-consolidated-decisions.md`), and legacy Gate A owner decisions (2026-07-22) where cited.      |

## 8. Change Log

| Version | Date       | Change                                                                                                                                                                                          | By               |
| ------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- |
| 0.1.0   | 2026-10-03 | Initial proposed draft from the owner-supplied hierarchy proposal. Not approved.                                                                                                                | Claude (drafter) |
| 0.2.0   | 2026-10-03 | Retargeted to the Teach v2 codebase: legacy `peteywee/teach` is reference only; anchors and paths no longer point into the legacy repository.                                                   | Claude (drafter) |
| 0.3.0   | 2026-10-03 | Anchored to `peteywee/teach-v2` branch `main` (owner-declared); the repository had no commits when cloned on 2026-10-03, so the anchor SHA stays Not yet verified.                              | Claude (drafter) |
| 1.0.0   | 2026-10-03 | Approved by the owner; status changed from `proposed` to `active`. Open questions remain open and block implementation of the requirements they affect (SYS-34) instead of blocking activation. | Claude (drafter) |
| 1.0.1   | 2026-10-03 | Non-normative document-governance metadata/provenance normalization; 1.0.0 owner approval remained controlling. | ChatGPT (governance) |
| 1.0.2   | 2026-10-03 | Non-normative baseline cleanup: corrected stale current-status provenance after the contract spine was committed; no behavioral requirement changed. | ChatGPT (governance) |
