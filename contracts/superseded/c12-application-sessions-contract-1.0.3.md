<!--tos-doc
{
  "doc_id": "TEACH-CON-C12",
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
  "superseded_by": "TEACH-CON-C12@1.1.0",
  "depends_on": [
    "contracts/"
  ]
}
-->

# C12 — Application Sessions Contract

| Field              | Value                                                                                                                                                           |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Contract ID        | C12                                                                                                                                                             |
| Group              | C10 Trust & Security                                                                                                                                            |
| Governed by        | C00 System Authority                                                                                                                                            |
| Version            | 1.0.3                                                                                                                                                           |
| Status             | `superseded`                                                                                                                                                        |
| Owner              | Patrick Craven, Top Shelf Service LLC                                                                                                                           |
| Approved by        | Patrick Craven (owner), 2026-10-03 — approval instruction given in chat at 10:47 CDT; transcribed by Claude at the owner's direction — see `APPROVAL-RECORD.md` |
| Requirement prefix | `SES`                                                                                                                                                           |
| Activation         | Required for the core rebuild                                                                                                                                   |
| Legacy lineage     | Reference only — reworks legacy `.topshelf/contracts/domain/identity-access.json` (session half).                                                               |
| Supersedes         | None                                                                                                                                                            |
| Superseded by      | C12 1.1.0                                                                                                                                                            |
| Created            | 2026-10-03                                                                                                                                                      |
| Last updated       | 2026-10-03                                                                                                                                                      |

## 1. Purpose and Failure Prevented

The legacy Gate A record states that legacy Teach's session architecture stored authentication state in the browser's local storage. That design fails in three concrete ways. Any injected script can read the token and replay it from anywhere. Logout clears the browser but leaves the server-side session valid, so a copied token keeps working. And role or organization claims baked into a token stay true after a manager is demoted, until the token happens to expire. This contract allows one session model only: an opaque, HttpOnly cookie whose server record is the single source of truth and which carries no authority of its own.

## 2. Scope

This contract owns:

- Application session records
- The browser session cookie
- Session issuance, expiry, revocation, and last-use state

This contract does not own:

- Identity and credentials (C11)
- Membership and scope (C13)
- Capabilities (C14)
- Browser state other than the session cookie (C42)

Related contracts: C00, C01, C11, C13, C14, C42.

## 3. Definitions

| Term               | Meaning                                                                  |
| ------------------ | ------------------------------------------------------------------------ |
| Session credential | The opaque random value the browser presents to authenticate.            |
| Session record     | The server-side row holding the credential's hash and lifecycle fields.  |
| Revoked            | A session record that MUST no longer authenticate, regardless of expiry. |

## 4. Requirements

The keywords MUST, MUST NOT, SHOULD, and MAY are used in the RFC 2119 sense. Requirement IDs are stable and MUST NOT be renumbered or reused.

- **SES-1** — Teach MUST have exactly one application-session model; any other token or session mechanism MUST NOT authenticate application API requests.
- **SES-2** — The session credential MUST be opaque: it MUST NOT encode identity, role, organization, location, or capability data.
- **SES-3** — The session credential MUST be generated from a cryptographically secure random source.
- **SES-4** — The session credential MUST be delivered to the browser only in a cookie with the `Secure` and `HttpOnly` attributes set.
- **SES-5** — The session cookie MUST set `SameSite` to the owner-approved value (see OQ-SES-1; value Not yet verified).
- **SES-6** — The session cookie's domain and path MUST be the owner-approved scope (see OQ-SES-2; value Not yet verified).
- **SES-7** — Authentication credentials MUST NOT be written to localStorage, sessionStorage, IndexedDB, Cache Storage, or service-worker storage.
- **SES-8** — PostgreSQL MUST store only a cryptographic hash or verifier of the session credential, never the credential itself (see OQ-SES-3; value Not yet verified).
- **SES-9** — Session lookup MUST hash the presented credential and look up by the hash.
- **SES-10** — Every session record MUST hold issuance time, absolute expiry, revocation state, and last-use time.
- **SES-11** — Absolute and idle expiry MUST be enforced server-side on every request (values: see OQ-SES-4; value Not yet verified).
- **SES-12** — Logout MUST revoke the server-side session record; clearing browser state alone MUST NOT be treated as logout.
- **SES-13** — The logout response MUST expire the session cookie.
- **SES-14** — Credential change, identity deactivation, and offboarding MUST revoke affected sessions through one canonical revocation path.
- **SES-15** — An expired, revoked, unknown, or malformed session credential MUST produce `401` and no side effect.
- **SES-16** — A session MUST NOT establish organization, location scope, role, or capability state; that state MUST be resolved from database-current records per C13 and C14 on each protected request.
- **SES-17** — A JWT claim MUST NOT be treated as current authorization state; an identity-provider JWT MAY be used only at sign-in to establish identity.
- **SES-18** — Cookie-authenticated state-changing requests MUST be protected against cross-site request forgery by the owner-approved mechanism (see OQ-SES-5; value Not yet verified).
- **SES-19** — Session credentials MUST be rotated on the events the owner approves (see OQ-SES-6; value Not yet verified); a credential issued before authentication MUST NOT become an authenticated session.
- **SES-20** — Session status MUST be one of the C01 canonical values ACTIVE, EXPIRED, REVOKED, and the only permitted transitions MUST be ACTIVE → EXPIRED and ACTIVE → REVOKED.

## 5. Acceptance Cases

| Case      | Proves              | Setup                                                                                                | Expected                                                  |
| --------- | ------------------- | ---------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| SES-AC-1  | SES-1, SES-17       | Send API requests authenticated only by a bearer JWT, a legacy token header, or a query-string token | All return 401                                            |
| SES-AC-2  | SES-2, SES-3        | Decode issued credentials; issue 10,000 sessions                                                     | No decodable structure; no duplicates                     |
| SES-AC-3  | SES-4, SES-5, SES-6 | Sign in and inspect Set-Cookie                                                                       | Secure, HttpOnly, approved SameSite, approved Domain/Path |
| SES-AC-4  | SES-7               | Browser E2E: sign in, use core paths, then enumerate all web storage and caches                      | No credential value in any storage                        |
| SES-AC-5  | SES-8, SES-9        | Inspect session table after sign-in; present the stored hash value as a cookie                       | Only hash stored; presenting the hash itself returns 401  |
| SES-AC-6  | SES-10              | Inspect session record across sign-in, request, logout                                               | All four fields populated and updated                     |
| SES-AC-7  | SES-11              | Advance clock past idle expiry; separately past absolute expiry                                      | Both return 401; no side effect                           |
| SES-AC-8  | SES-12, SES-13      | Copy the cookie, log out, replay the copied cookie                                                   | Logout expires the cookie; replay returns 401             |
| SES-AC-9  | SES-14              | Hold sessions open; perform credential change, deactivation, offboarding                             | Affected sessions return 401 on next request              |
| SES-AC-10 | SES-15              | Present malformed, unknown, expired, and revoked credentials to a mutating endpoint                  | All 401; zero writes                                      |
| SES-AC-11 | SES-16              | Demote a manager while their session is open; issue a manager-only request                           | Request denied 403 without re-login                       |
| SES-AC-12 | SES-18              | Cross-origin form post to a mutating endpoint with a valid cookie                                    | Rejected; no state change                                 |
| SES-AC-13 | SES-19              | Capture pre-auth cookie value; authenticate                                                          | Post-auth credential differs; pre-auth value returns 401  |
| SES-AC-14 | SES-20              | Attempt REVOKED → ACTIVE, EXPIRED → ACTIVE, and a non-canonical status value                         | All rejected; status unchanged                            |

## 6. Open Questions

| ID       | Question                                                                                                     | Blocks implementation | Affects |
| -------- | ------------------------------------------------------------------------------------------------------------ | --------------------- | ------- |
| OQ-SES-1 | Which `SameSite` value is approved: `Strict` or `Lax`?                                                       | Yes                   | SES-5   |
| OQ-SES-2 | Which cookie domain and path are approved given the web and API hostnames?                                   | Yes                   | SES-6   |
| OQ-SES-3 | Which hash or verifier construction is approved for session credentials at rest?                             | Yes                   | SES-8   |
| OQ-SES-4 | What are the absolute and idle session lifetimes?                                                            | Yes                   | SES-11  |
| OQ-SES-5 | Is `SameSite` alone the approved CSRF control, or is an additional mechanism (token, origin check) required? | Yes                   | SES-18  |
| OQ-SES-6 | On which events must the session credential rotate (sign-in, privilege change, other)?                       | Yes                   | SES-19  |
| OQ-SES-7 | Is there a limit on concurrent sessions per identity?                                                        | No                    | —       |

## 7. Verification Status

| Item                         | State                    | Detail                                                                                                                                                                                                                                                |
| ---------------------------- | ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Target codebase              | verified (limited scope) | `peteywee/teach-v2` default branch `main`, verified through governance baseline commit `292e8da9123987e9d94f09669c7bc6b6d43c4320` on 2026-10-03. The repository contains the contract/governance foundation; application implementation remains not yet built.                                |
| Legacy repository consulted  | reference only           | `peteywee/teach` `work/TR-0010-production-cutover` at `79fdce5cc3b2` (`main` at `99162f17eace`), read 2026-10-03 for lineage: legacy domain contract JSON files and the Gate A decision record. Legacy code was not inspected and does not govern v2. |
| Implementation conformance   | unknown                  | Not yet verified. No v2 implementation was inspected; the owner states v2 is yet to be built.                                                                                                                                                         |
| Acceptance cases implemented | unknown                  | Not yet verified. No mapping between repository tests and these IDs has been established.                                                                                                                                                             |
| Blocking open questions      | 6 open                   | Contract is `active` with these open. Each blocks implementation of the requirements it affects beyond fail-closed behavior until decided (SYS-34).                                                                                                   |
| Owner approval               | declared                 | Approved by the owner on 2026-10-03; recorded in `APPROVAL-RECORD.md`. Initial owner-approval baseline is commit `2c9b1c849a520ba817efc91150be9a37797f4238`; this 1.0.3 revision is tracked by Git history.                                                                     |
| Independent review           | not performed            | Drafted and self-checked by Claude against the contract-authoring checklist only.                                                                                                                                                                     |
| Source of intent             | declared                 | Owner-supplied rebuild proposal (`source/2026-10-03-teach-v2-contract-hierarchy-proposal.md`), consolidated decisions (`source/2026-10-03-teach-rebuild-consolidated-decisions.md`), and legacy Gate A owner decisions (2026-07-22) where cited.      |

## 8. Change Log

| Version | Date       | Change                                                                                                                                                                                                  | By               |
| ------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- |
| 0.1.0   | 2026-10-03 | Initial proposed draft from the owner-supplied hierarchy proposal. Not approved.                                                                                                                        | Claude (drafter) |
| 0.2.0   | 2026-10-03 | Applied the 2026-10-03 consolidated decisions: added scope to SES-16; added SES-20 (ApplicationSessionStatus state machine) and SES-AC-14.                                                              | Claude (drafter) |
| 0.3.0   | 2026-10-03 | Retargeted to the Teach v2 codebase: legacy `peteywee/teach` is reference only; anchors and paths no longer point into the legacy repository. Failure story labels the legacy session design as legacy. | Claude (drafter) |
| 0.4.0   | 2026-10-03 | Anchored to `peteywee/teach-v2` branch `main` (owner-declared); the repository had no commits when cloned on 2026-10-03, so the anchor SHA stays Not yet verified.                                      | Claude (drafter) |
| 1.0.0   | 2026-10-03 | Approved by the owner; status changed from `proposed` to `active`. Open questions remain open and block implementation of the requirements they affect (SYS-34) instead of blocking activation.         | Claude (drafter) |
| 1.0.1   | 2026-10-03 | Non-normative document-governance metadata/provenance normalization; 1.0.0 owner approval remained controlling. | ChatGPT (governance) |
| 1.0.2   | 2026-10-03 | Non-normative baseline cleanup: corrected stale current-status provenance after the contract spine was committed; no behavioral requirement changed. | ChatGPT (governance) |
| 1.0.3   | 2026-10-03 | Non-normative truth-state cleanup: verification status now anchors the live v2 repository through governance baseline `292e8da9123987e9d94f09669c7bc6b6d43c4320`; no behavioral requirement changed. | ChatGPT (governance) |
