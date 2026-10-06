<!--tos-doc
{
  "doc_id": "TEACH-CON-C12",
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
    "TEACH-CON-C12@1.0.3",
    "TEACH-CON-C12@1.1.0"
  ],
  "superseded_by": null,
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
| Version            | 1.2.0 |
| Status             | `active`                                                                                                                                                        |
| Owner              | Patrick Craven, Top Shelf Service LLC                                                                                                                           |
| Approved by        | Patrick Craven (owner), 2026-10-05; manifest-bound decision-closure r3.1, SYS-21 #75; see `APPROVAL-RECORD.md` |
| Requirement prefix | `SES`                                                                                                                                                           |
| Activation         | Required for the core rebuild                                                                                                                                   |
| Legacy lineage     | Reference only — reworks legacy `.topshelf/contracts/domain/identity-access.json` (session half).                                                               |
| Supersedes         | 1.1.0 |
| Superseded by      | None                                                                                                                                                            |
| Created            | 2026-10-03                                                                                                                                                      |
| Last updated       | 2026-10-05 |

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
- **SES-3** — The session credential MUST be generated as exactly 32 cryptographically secure random bytes (256 bits) and serialized to the browser as unpadded base64url.
- **SES-4** — The session credential MUST be delivered to the browser only in a cookie with the `Secure` and `HttpOnly` attributes set.
- **SES-5** — The session cookie MUST set `SameSite=Lax` together with SES-18's exact-origin CSRF control. See `governance/decision-closure/04-session-transport-security-spec.md`. (OQ-SES-1 resolved 2026-10-05).
- **SES-6** — The approved topology is same-origin `https://t34ch.com` with API prefix `/api/v1`. The cookie MUST be `__Host-teach_session`, host-only with no Domain, `Path=/`, Secure and HttpOnly; issuance Max-Age is 43200 and logout Max-Age is 0. Each isolated preview uses exactly its own deployment origin, without production credentials. See `governance/decision-closure/04-session-transport-security-spec.md`. (OQ-SES-2 resolved 2026-10-05).
- **SES-7** — Authentication credentials MUST NOT be written to localStorage, sessionStorage, IndexedDB, Cache Storage, or service-worker storage.
- **SES-8** — PostgreSQL MUST store only a versioned verifier of the session credential, never the credential itself. Verifier version `v1` MUST be the 32-byte SHA-256 digest of the byte sequence `teach-session-v1\\0` followed by the raw 32-byte session credential. No per-session salt is required for this uniformly random 256-bit credential because deterministic indexed lookup is required.
- **SES-9** — Session lookup MUST decode the presented unpadded base64url credential to exactly 32 bytes, compute the stored verifier using the record's supported verifier version, and look up by that verifier. A stored verifier value MUST NOT itself authenticate as a session credential.
- **SES-10** — Every session record MUST hold issuance time, absolute expiry, revocation state, and last-use time.
- **SES-11** — Absolute and idle expiry MUST be enforced server-side on every request: absolute lifetime is 12 hours from immutable issuance time and idle lifetime is 30 minutes from authoritative server-side last-use time. A request authenticates only while status is ACTIVE and current time is before both limits. Crossing either limit MUST fail closed as 401 with no side effect; denial MUST NOT depend on a best-effort EXPIRED-state write succeeding.
- **SES-12** — Logout MUST revoke the server-side session record; clearing browser state alone MUST NOT be treated as logout.
- **SES-13** — The logout response MUST expire the session cookie.
- **SES-14** — Credential change, identity deactivation, and offboarding MUST revoke affected sessions through one canonical revocation path.
- **SES-15** — An expired, revoked, unknown, or malformed session credential MUST produce `401` and no side effect.
- **SES-16** — A session MUST NOT establish organization, location scope, role, or capability state; that state MUST be resolved from database-current records per C13 and C14 on each protected request.
- **SES-17** — A JWT claim MUST NOT be treated as current authorization state; an identity-provider JWT MAY be used only at sign-in to establish identity.
- **SES-18** — Every cookie-authenticated unsafe request (POST, PUT, PATCH, DELETE), including logout, MUST enforce a byte-exact deployment allowed Origin before session lookup; missing, foreign, malformed or `null` Origin is denied with zero writes. There is no Referer fallback; a present Sec-Fetch-Site other than same-origin is denied; unsafe API requests require application/json. Missing allowed-origin configuration fails closed. Safe methods MUST NOT mutate state except the separately bound state/PKCE OAuth callback. See `governance/decision-closure/04-session-transport-security-spec.md`. (OQ-SES-5 resolved 2026-10-05).
- **SES-19** — Successful sign-in and step-up reauthentication MUST create a new session and revoke the presenting session, atomically with audit; a pre-authentication credential MUST NOT be upgraded. Failed commit sets no new cookie. ChangeCredential instead revokes ALL sessions and issues none under IDN-15; deactivation/offboarding revoke all, logout revokes the presented session. Membership/grant/entitlement changes require no rotation because authority is database-current under SES-16. See `governance/decision-closure/04-session-transport-security-spec.md`. (OQ-SES-6 resolved 2026-10-05).
- **SES-20** — Session status MUST be one of the C01 canonical values ACTIVE, EXPIRED, REVOKED, and the only permitted transitions MUST be ACTIVE → EXPIRED and ACTIVE → REVOKED.

## 5. Acceptance Cases

| Case      | Proves              | Setup                                                                                                | Expected                                                  |
| --------- | ------------------- | ---------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| SES-AC-1  | SES-1, SES-17       | Send API requests authenticated only by a bearer JWT, a legacy token header, or a query-string token | All return 401                                            |
| SES-AC-2  | SES-2, SES-3        | Issue 10,000 sessions; base64url-decode each credential                                               | Every credential decodes to exactly 32 random bytes; no duplicates or embedded authority structure |
| SES-AC-3  | SES-4, SES-5, SES-6 | Sign in and inspect Set-Cookie                                                                       | Secure, HttpOnly, approved SameSite, approved Domain/Path |
| SES-AC-4  | SES-7               | Browser E2E: sign in, use core paths, then enumerate all web storage and caches                      | No credential value in any storage                        |
| SES-AC-5  | SES-8, SES-9        | Inspect session table after sign-in; recompute v1 verifier; present stored verifier text/bytes as a credential | Only versioned verifier stored; recomputation matches; stored verifier itself returns 401 |
| SES-AC-6  | SES-10              | Inspect session record across sign-in, request, logout                                               | All four fields populated and updated                     |
| SES-AC-7  | SES-11              | Advance clock beyond 30 minutes since last use; separately beyond 12 hours since issuance; simulate expiry-write failure | All cases return 401 with no protected side effect; denial remains effective even if EXPIRED-state persistence fails |
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
| OQ-SES-1 | **Resolved.** Owner, 2026-10-05: The session cookie MUST set `SameSite=Lax` together with SES-18's exact-origin CSRF control. See `governance/decision-closure/04-session-transport-security-spec.md`. (Decision-closure r3.1) | No (resolved) | SES-5 |
| OQ-SES-2 | **Resolved.** Owner, 2026-10-05: The approved topology is same-origin `https://t34ch.com` with API prefix `/api/v1`. The cookie MUST be `__Host-teach_session`, host-only with no Domain, `Path=/`, Secure and HttpOnly; issuance Max-Age is 43200 and logout Max-Age is 0. Each isolated preview uses exactly its own deployment origin, without production credentials. See `governance/decision-closure/04-session-transport-security-spec.md`. (Decision-closure r3.1) | No (resolved) | SES-6 |
| OQ-SES-5 | **Resolved.** Owner, 2026-10-05: Every cookie-authenticated unsafe request (POST, PUT, PATCH, DELETE), including logout, MUST enforce a byte-exact deployment allowed Origin before session lookup; missing, foreign, malformed or `null` Origin is denied with zero writes. There is no Referer fallback; a present Sec-Fetch-Site other than same-origin is denied; unsafe API requests require application/json. Missing allowed-origin configuration fails closed. Safe methods MUST NOT mutate state except the separately bound state/PKCE OAuth callback. See `governance/decision-closure/04-session-transport-security-spec.md`. (Decision-closure r3.1) | No (resolved) | SES-18 |
| OQ-SES-6 | **Resolved.** Owner, 2026-10-05: Successful sign-in and step-up reauthentication MUST create a new session and revoke the presenting session, atomically with audit; a pre-authentication credential MUST NOT be upgraded. Failed commit sets no new cookie. ChangeCredential instead revokes ALL sessions and issues none under IDN-15; deactivation/offboarding revoke all, logout revokes the presented session. Membership/grant/entitlement changes require no rotation because authority is database-current under SES-16. See `governance/decision-closure/04-session-transport-security-spec.md`. (Decision-closure r3.1) | No (resolved) | SES-19 |
| OQ-SES-7 | **Resolved.** Owner, 2026-10-05: No concurrent-session count limit is imposed. Existing expiry/revocation still apply; a later limit requires an explicit value and deterministic eviction rule through a C12 revision. See `governance/decision-closure/04-session-transport-security-spec.md`. (Decision-closure r3.1) | No (resolved) | — |

### Resolved owner decisions in 1.1.0

- **OQ-SES-3 — `SESSION_VERIFIER_V1_SHA256_256BIT`:** session credentials are exactly 32 CSPRNG bytes serialized as unpadded base64url; PostgreSQL stores only verifier version metadata plus `SHA-256("teach-session-v1\\0" || rawCredentialBytes)`; no per-session salt is required; stored verifier material is never accepted as the credential.
- **OQ-SES-4 — `ABSOLUTE_12H_IDLE_30M`:** absolute lifetime is 12 hours from immutable issuance and idle lifetime is 30 minutes from authoritative server-side last use; expiry fails closed independently of whether lazy EXPIRED-state persistence succeeds.

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
| ------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- |
| 0.1.0   | 2026-10-03 | Initial proposed draft from the owner-supplied hierarchy proposal. Not approved.                                                                                                                        | Claude (drafter) |
| 0.2.0   | 2026-10-03 | Applied the 2026-10-03 consolidated decisions: added scope to SES-16; added SES-20 (ApplicationSessionStatus state machine) and SES-AC-14.                                                              | Claude (drafter) |
| 0.3.0   | 2026-10-03 | Retargeted to the Teach v2 codebase: legacy `peteywee/teach` is reference only; anchors and paths no longer point into the legacy repository. Failure story labels the legacy session design as legacy. | Claude (drafter) |
| 0.4.0   | 2026-10-03 | Anchored to `peteywee/teach-v2` branch `main` (owner-declared); the repository had no commits when cloned on 2026-10-03, so the anchor SHA stays Not yet verified.                                      | Claude (drafter) |
| 1.0.0   | 2026-10-03 | Approved by the owner; status changed from `proposed` to `active`. Open questions remain open and block implementation of the requirements they affect (SYS-34) instead of blocking activation.         | Claude (drafter) |
| 1.0.1   | 2026-10-03 | Non-normative document-governance metadata/provenance normalization; 1.0.0 owner approval remained controlling. | ChatGPT (governance) |
| 1.0.2   | 2026-10-03 | Non-normative baseline cleanup: corrected stale current-status provenance after the contract spine was committed; no behavioral requirement changed. | ChatGPT (governance) |
| 1.0.3   | 2026-10-03 | Non-normative truth-state cleanup: verification status now anchors the live v2 repository through governance baseline `292e8da9123987e9d94f09669c7bc6b6d43c4320`; no behavioral requirement changed. | ChatGPT (governance) |
| 1.1.0   | 2026-10-04 | Normative SLICE-P02 revision: resolve OQ-SES-3 with `SESSION_VERIFIER_V1_SHA256_256BIT` and OQ-SES-4 with `ABSOLUTE_12H_IDLE_30M`; refine SES-3/8/9/11 and acceptance cases 2/5/7; GitHub issue #32. | Patrick Craven (owner approval) |
| 1.2.0 | 2026-10-05 | Register OQ-SES-1, OQ-SES-2, OQ-SES-5, OQ-SES-6, OQ-SES-7; preserve named residuals and existing requirement/acceptance IDs. Decision-closure r3.1 manifest sha256:ff7b51df1e3a235e9d226d9d7232f81c64bbeb451b359b6e0f2ea232b6e1757c; SYS-21 #75. | Patrick Craven (owner); ChatGPT (recorder) |
