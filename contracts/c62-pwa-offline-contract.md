<!--tos-doc
{
  "doc_id": "TEACH-CON-C62",
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
    "TEACH-CON-C62@1.0.3"
  ],
  "superseded_by": null,
  "depends_on": [
    "contracts/"
  ]
}
-->

# C62 — PWA / Offline Contract

| Field              | Value                                                                                                                                                           |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Contract ID        | C62                                                                                                                                                             |
| Group              | C60 Optional Feature Contracts                                                                                                                                  |
| Governed by        | C00 System Authority                                                                                                                                            |
| Version            | 1.1.0 |
| Status             | `active`                                                                                                                                                        |
| Owner              | Patrick Craven, Top Shelf Service LLC                                                                                                                           |
| Approved by        | Patrick Craven (owner), 2026-10-05; manifest-bound decision-closure r3.1, SYS-21 #75; see `APPROVAL-RECORD.md` |
| Requirement prefix | `PWA`                                                                                                                                                           |
| Activation         | Conditional — binding only when the owner enables this feature                                                                                                  |
| Legacy lineage     | New. The legacy generic offline queue is not carried into v2.                                                                                                   |
| Supersedes         | 1.0.3 |
| Superseded by      | None                                                                                                                                                            |
| Created            | 2026-10-03                                                                                                                                                      |
| Last updated       | 2026-10-05 |

## 1. Purpose and Failure Prevented

A cook on a kitchen tablet with spotty Wi-Fi completes a module; the app shows "Saved" while the write sits in a generic queue. The cook logs out, the next cook logs in, the connection returns, and the first cook's queued submission replays under the second cook's session. This contract starts v2 with no offline writes at all, and defines the binding any future queue item must carry.

## 2. Scope

This contract owns:

- Service-worker caching scope
- Offline UI truthfulness
- Offline write queue (only if authorized)

This contract does not own:

- Session credentials (C12)
- Learner progress semantics (C32)

Related contracts: C00, C12, C32.

## 3. Definitions

| Term         | Meaning                                                             |
| ------------ | ------------------------------------------------------------------- |
| Static shell | HTML, CSS, JavaScript, fonts, and images that contain no user data. |

## 4. Requirements

The keywords MUST, MUST NOT, SHOULD, and MAY are used in the RFC 2119 sense. Requirement IDs are stable and MUST NOT be renumbered or reused.

This contract belongs to C60 (Good to Have). Its requirements bind only after the owner enables the feature it governs; until then, only the requirement that keeps the feature disabled is binding.

- **PWA-1** — The service worker MAY cache the static shell.
- **PWA-2** — Private API responses MUST NOT be cached by the service worker unless this contract is revised to permit specific responses.
- **PWA-3** — Authentication credentials MUST NOT be cached.
- **PWA-4** — Offline UI MUST NOT claim a mutation succeeded when it has not been accepted by the API.
- **PWA-5** — Offline writes remain NOT_AUTHORIZED. Every mutation requires connectivity; offline UI MUST show not-sent and MUST NOT claim success. No client write queue is authorized; re-enable only through an active C62 revision or dedicated offline-write contract. See `governance/decision-closure/08-deferred-feature-policy-register.md`. (OQ-PWA-1 resolved 2026-10-05).
- **PWA-6** — If offline writes are authorized, each queue item MUST bind: user, organization, operation, idempotency key, payload, creation time, and expiry.
- **PWA-7** — If offline writes are authorized, logout MUST make the previous user's queued items impossible to replay under any other identity.
- **PWA-8** — If offline writes are authorized, expired queue items MUST be discarded and reported, not replayed.
- **PWA-9** — The legacy Teach generic offline queue MUST NOT be carried into v2.

## 5. Acceptance Cases

| Case     | Proves              | Setup                                                                                                      | Expected                                                         |
| -------- | ------------------- | ---------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| PWA-AC-1 | PWA-1, PWA-2, PWA-3 | Enumerate Cache Storage after core paths                                                                   | Only static shell entries                                        |
| PWA-AC-2 | PWA-4, PWA-5        | Go offline; attempt each mutation                                                                          | UI shows not saved; nothing queued                               |
| PWA-AC-3 | PWA-6, PWA-7, PWA-8 | Only if writes authorized: queue as user A, log out, log in as B, reconnect; separately let an item expire | A's items not sent under B; expired items discarded and reported |
| PWA-AC-4 | PWA-9               | Code inventory of the v2 codebase                                                                          | Manual evidence: legacy queue module absent                      |

## 6. Open Questions

| ID       | Question                                                          | Blocks implementation | Affects |
| -------- | ----------------------------------------------------------------- | --------------------- | ------- |
| OQ-PWA-1 | **Resolved.** Owner, 2026-10-05: Offline writes remain NOT_AUTHORIZED. Every mutation requires connectivity; offline UI MUST show not-sent and MUST NOT claim success. No client write queue is authorized; re-enable only through an active C62 revision or dedicated offline-write contract. See `governance/decision-closure/08-deferred-feature-policy-register.md`. (Decision-closure r3.1) | No (resolved) | PWA-5 |

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

| Version | 1.1.0 |
| ------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- |
| 0.1.0   | 2026-10-03 | Initial proposed draft from the owner-supplied hierarchy proposal. Not approved.                                                                                                                | Claude (drafter) |
| 0.2.0   | 2026-10-03 | Group renamed to C60 Optional Feature Contracts; PWA-5 requires an explicit contract defining offline writes.                                                                                   | Claude (drafter) |
| 0.3.0   | 2026-10-03 | Retargeted to the Teach v2 codebase: legacy `peteywee/teach` is reference only; anchors and paths no longer point into the legacy repository. PWA-9 names the legacy queue explicitly.          | Claude (drafter) |
| 0.4.0   | 2026-10-03 | Anchored to `peteywee/teach-v2` branch `main` (owner-declared); the repository had no commits when cloned on 2026-10-03, so the anchor SHA stays Not yet verified.                              | Claude (drafter) |
| 1.0.0   | 2026-10-03 | Approved by the owner; status changed from `proposed` to `active`. Open questions remain open and block implementation of the requirements they affect (SYS-34) instead of blocking activation. | Claude (drafter) |
| 1.0.1   | 2026-10-03 | Non-normative document-governance metadata/provenance normalization; 1.0.0 owner approval remained controlling. | ChatGPT (governance) |
| 1.0.2   | 2026-10-03 | Non-normative baseline cleanup: corrected stale current-status provenance after the contract spine was committed; no behavioral requirement changed. | ChatGPT (governance) |
| 1.0.3   | 2026-10-03 | Non-normative truth-state cleanup: verification status now anchors the live v2 repository through governance baseline `292e8da9123987e9d94f09669c7bc6b6d43c4320`; no behavioral requirement changed. | ChatGPT (governance) |
| 1.1.0 | 2026-10-05 | Register OQ-PWA-1; preserve named residuals and existing requirement/acceptance IDs. Decision-closure r3.1 manifest sha256:ff7b51df1e3a235e9d226d9d7232f81c64bbeb451b359b6e0f2ea232b6e1757c; SYS-21 #75. | Patrick Craven (owner); ChatGPT (recorder) |
