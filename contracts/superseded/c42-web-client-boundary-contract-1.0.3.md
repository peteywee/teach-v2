<!--tos-doc
{
  "doc_id": "TEACH-CON-C42",
  "class": "contract",
  "version": "1.0.3",
  "claims_truth_state": "declared",
  "status": "superseded",
  "owner": "Patrick Craven, Top Shelf Service LLC",
  "created_on": "2026-10-03",
  "updated_on": "2026-10-03",
  "effective_on": "2026-10-03",
  "approval": {
    "state": "approved",
    "approved_version": "1.0.0",
    "approved_on": "2026-10-03",
    "record": "contracts/APPROVAL-RECORD.md",
    "inheritance": "1.0.1, 1.0.2, and 1.0.3 are non-normative governance/truth-state cleanup patches; 1.0.0 owner approval remains controlling"
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
  "superseded_by": "TEACH-CON-C42@1.1.0",
  "depends_on": [
    "contracts/"
  ]
}
-->

# Superseded TEACH-CON-C42 1.0.3

Superseded by `TEACH-CON-C42@1.1.0` under SYS-21 #75.

The original body below is preserved, including its former current-status wording.
# C42 — Web Client Boundary Contract

| Field              | Value                                                                                                                                                           |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Contract ID        | C42                                                                                                                                                             |
| Group              | C40 Application Boundaries                                                                                                                                      |
| Governed by        | C00 System Authority                                                                                                                                            |
| Version            | 1.0.3                                                                                                                                                           |
| Status             | `active`                                                                                                                                                        |
| Owner              | Patrick Craven, Top Shelf Service LLC                                                                                                                           |
| Approved by        | Patrick Craven (owner), 2026-10-03 — approval instruction given in chat at 10:47 CDT; transcribed by Claude at the owner's direction — see `APPROVAL-RECORD.md` |
| Requirement prefix | `WEB`                                                                                                                                                           |
| Activation         | Required for the core rebuild                                                                                                                                   |
| Legacy lineage     | New. Carries forward the legacy Gate A shared forbidden-surface requirements.                                                                                   |
| Supersedes         | None                                                                                                                                                            |
| Superseded by      | None                                                                                                                                                            |
| Created            | 2026-10-03                                                                                                                                                      |
| Last updated       | 2026-10-03                                                                                                                                                      |

## 1. Purpose and Failure Prevented

A cook pastes a manager URL into the browser and the page renders for a second, fires five API calls, then redirects in a loop. Another screen shows a demo team list because the real API call failed and a fallback quietly filled in fake data. A shared tablet shows the last user's name after logout. This contract treats the browser as a display, not an authority, and makes every failure visible instead of papered over.

## 2. Scope

This contract owns:

- Web client authentication and capability hydration
- Route guarding
- Loading, error, and forbidden states
- Client state lifecycle across logout

This contract does not own:

- Session issuance (C12)
- Authorization (C14)
- Service worker caching (C62)

Related contracts: C00, C12, C14, C62.

## 3. Definitions

| Term              | Meaning                                                                                                                                    |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Core user paths   | Sign-in, learning session, progress view, manager team view, assignment, certification, and logout (see OQ-WEB-2; value Not yet verified). |
| Forbidden surface | The shared page shown when the API has denied access with 403.                                                                             |

## 4. Requirements

The keywords MUST, MUST NOT, SHOULD, and MAY are used in the RFC 2119 sense. Requirement IDs are stable and MUST NOT be renumbered or reused.

- **WEB-1** — The browser MUST NOT be treated as an authority for identity, scope, or capability.
- **WEB-2** — Authentication state MUST come from the application session as reported by the API.
- **WEB-3** — Capability state MUST be hydrated from authoritative API responses.
- **WEB-4** — Direct navigation to a protected URL MUST be guarded.
- **WEB-5** — When a missing route capability is already known, the client MUST make zero protected page calls for that route.
- **WEB-6** — Hiding navigation MUST NOT be relied on as access control.
- **WEB-7** — Protected data MUST NOT be silently replaced with fake, sample, or mock data.
- **WEB-8** — Missing authentication MUST route to login while preserving the attempted URL.
- **WEB-9** — A known authorization denial MUST render the shared accessible forbidden surface: heading "Access denied.", factual copy that does not name roles or capabilities, a "Back to dashboard" action, focus moved to the heading, and no redirect loop, stale data, retry storm, or cross-scope metadata.
- **WEB-10** — A failed API request MUST render an explicit error state.
- **WEB-11** — Pending data MUST render an explicit loading state.
- **WEB-12** — Previous-user state MUST NOT survive logout in memory, storage, or caches.
- **WEB-13** — Sensitive credentials MUST NOT enter browser persistence.
- **WEB-14** — All application writes MUST go through application commands exposed by owned API endpoints; the browser MUST NOT write directly to the database or a third-party data store.
- **WEB-15** — Core user paths MUST meet the owner-approved accessibility standard (see OQ-WEB-1; value Not yet verified), including controls of at least 44 by 44 CSS pixels.

## 5. Acceptance Cases

| Case      | Proves              | Setup                                                                                          | Expected                                                                |
| --------- | ------------------- | ---------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| WEB-AC-1  | WEB-1, WEB-2, WEB-3 | Tamper with client-side capability/auth state in devtools                                      | Protected calls still denied by API; UI re-hydrates from API            |
| WEB-AC-2  | WEB-4, WEB-8        | Open protected URL with no session                                                             | Login shown; after login returns to the URL                             |
| WEB-AC-3  | WEB-5, WEB-9        | Learner opens a manager URL                                                                    | Zero protected page calls; forbidden surface per spec; focus on heading |
| WEB-AC-4  | WEB-6               | Covered by AUTHZ ui_not_authz case                                                             | See AUTHZ acceptance cases                                              |
| WEB-AC-5  | WEB-7, WEB-10       | Force API failure on each core path                                                            | Explicit error state; no mock data                                      |
| WEB-AC-6  | WEB-11              | Throttle network                                                                               | Explicit loading state                                                  |
| WEB-AC-7  | WEB-12              | Covered by PRIV shared_device case                                                             | See PRIV acceptance cases                                               |
| WEB-AC-8  | WEB-13              | Covered by SES no_browser_storage case                                                         | See SES acceptance cases                                                |
| WEB-AC-9  | WEB-14              | Network inspection across core paths; static check for direct data-store clients in web bundle | All writes to `/api/v1`; no direct clients                              |
| WEB-AC-10 | WEB-15              | Automated accessibility scan plus manual keyboard pass on core paths                           | No violations at the approved level; targets ≥ 44×44                    |

## 6. Open Questions

| ID       | Question                                                                      | Blocks implementation | Affects |
| -------- | ----------------------------------------------------------------------------- | --------------------- | ------- |
| OQ-WEB-1 | Which accessibility standard and level is approved (for example WCAG 2.2 AA)? | Yes                   | WEB-15  |
| OQ-WEB-2 | Is the core-path list above complete for v2?                                  | No                    | —       |

## 7. Verification Status

| Item                         | State                    | Detail                                                                                                                                                                                                                                                |
| ---------------------------- | ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Target codebase              | verified (limited scope) | `peteywee/teach-v2` default branch `main`, verified through governance baseline commit `292e8da9123987e9d94f09669c7bc6b6d43c4320` on 2026-10-03. The repository contains the contract/governance foundation; application implementation remains not yet built.                                |
| Legacy repository consulted  | reference only           | `peteywee/teach` `work/TR-0010-production-cutover` at `79fdce5cc3b2` (`main` at `99162f17eace`), read 2026-10-03 for lineage: legacy domain contract JSON files and the Gate A decision record. Legacy code was not inspected and does not govern v2. |
| Implementation conformance   | unknown                  | Not yet verified. No v2 implementation was inspected; the owner states v2 is yet to be built.                                                                                                                                                         |
| Acceptance cases implemented | unknown                  | Not yet verified. No mapping between repository tests and these IDs has been established.                                                                                                                                                             |
| Blocking open questions      | 1 open                   | Contract is `active` with these open. Each blocks implementation of the requirements it affects beyond fail-closed behavior until decided (SYS-34).                                                                                                   |
| Owner approval               | declared                 | Approved by the owner on 2026-10-03; recorded in `APPROVAL-RECORD.md`. Initial owner-approval baseline is commit `2c9b1c849a520ba817efc91150be9a37797f4238`; this 1.0.3 revision is tracked by Git history.                                                                     |
| Independent review           | not performed            | Drafted and self-checked by Claude against the contract-authoring checklist only.                                                                                                                                                                     |
| Source of intent             | declared                 | Owner-supplied rebuild proposal (`source/2026-10-03-teach-v2-contract-hierarchy-proposal.md`), consolidated decisions (`source/2026-10-03-teach-rebuild-consolidated-decisions.md`), and legacy Gate A owner decisions (2026-07-22) where cited.      |

## 8. Change Log

| Version | Date       | Change                                                                                                                                                                                          | By               |
| ------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- |
| 0.1.0   | 2026-10-03 | Initial proposed draft from the owner-supplied hierarchy proposal. Not approved.                                                                                                                | Claude (drafter) |
| 0.2.0   | 2026-10-03 | WEB-14 now routes writes through application commands exposed by owned API endpoints.                                                                                                           | Claude (drafter) |
| 0.3.0   | 2026-10-03 | Retargeted to the Teach v2 codebase: legacy `peteywee/teach` is reference only; anchors and paths no longer point into the legacy repository.                                                   | Claude (drafter) |
| 0.4.0   | 2026-10-03 | Anchored to `peteywee/teach-v2` branch `main` (owner-declared); the repository had no commits when cloned on 2026-10-03, so the anchor SHA stays Not yet verified.                              | Claude (drafter) |
| 1.0.0   | 2026-10-03 | Approved by the owner; status changed from `proposed` to `active`. Open questions remain open and block implementation of the requirements they affect (SYS-34) instead of blocking activation. | Claude (drafter) |
| 1.0.1   | 2026-10-03 | Non-normative document-governance metadata/provenance normalization; 1.0.0 owner approval remained controlling. | ChatGPT (governance) |
| 1.0.2   | 2026-10-03 | Non-normative baseline cleanup: corrected stale current-status provenance after the contract spine was committed; no behavioral requirement changed. | ChatGPT (governance) |
| 1.0.3   | 2026-10-03 | Non-normative truth-state cleanup: verification status now anchors the live v2 repository through governance baseline `292e8da9123987e9d94f09669c7bc6b6d43c4320`; no behavioral requirement changed. | ChatGPT (governance) |
