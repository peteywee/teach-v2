<!--tos-doc
{
  "doc_id": "TEACH-CON-C11",
  "class": "contract",
  "version": "1.2.0",
  "claims_truth_state": "declared",
  "status": "superseded",
  "owner": "Patrick Craven, Top Shelf Service LLC",
  "created_on": "2026-10-03",
  "updated_on": "2026-10-04",
  "effective_on": "2026-10-03",
  "approval": {
    "state": "approved",
    "approved_version": "1.2.0",
    "approved_on": "2026-10-04",
    "record": "contracts/APPROVAL-RECORD.md",
    "basis": "Owner explicitly approved C11 1.2.0 canonical lifecycle event definitions (IdentityDeactivated, IdentityReactivated) by direct owner direction on 2026-10-04"
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
  "supersedes": ["TEACH-CON-C11@1.1.0"],
  "superseded_by": "TEACH-CON-C11@1.3.0",
  "depends_on": [
    "contracts/"
  ]
}
-->

# C11 — Identity & Credentials Contract

> Superseded by C11 version 1.3.0 on 2026-10-04. Preserved under SYS-21 through GitHub issue #12.

| Field              | Value                                                                                                                                                           |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Contract ID        | C11                                                                                                                                                             |
| Group              | C10 Trust & Security                                                                                                                                            |
| Governed by        | C00 System Authority                                                                                                                                            |
| Version            | 1.2.0                                                                                                                                                           |
| Status             | `superseded`                                                                                                                                                        |
| Owner              | Patrick Craven, Top Shelf Service LLC                                                                                                                           |
| Approved by        | Patrick Craven (owner), 2026-10-04 — C11 1.2.0 canonical lifecycle event definitions by direct owner direction |
| Requirement prefix | `IDN`                                                                                                                                                           |
| Activation         | Required for the core rebuild                                                                                                                                   |
| Legacy lineage     | Reference only — reworks legacy `.topshelf/contracts/domain/identity-access.json` (identity half); session half moves to C12.                                   |
| Supersedes         | C11 1.1.0 |
| Superseded by      | C11 1.3.0 |
| Created            | 2026-10-03                                                                                                                                                      |
| Last updated       | 2026-10-04                                                                                                                                                      |

## 1. Purpose and Failure Prevented

A manager sets up a new line cook and, to be helpful, picks the cook's PIN and writes it on a ticket. Weeks later the cook signs in with Google, which silently creates a second Teach identity with no membership history. When the cook is offboarded, only the first identity is deactivated; the Google identity still signs in. The manager still knows the PIN. Nothing in the system was hacked; the identity model simply allowed two identities per person and let a manager hold an employee's credential. This contract makes one person equal one identity, keeps credentials out of anyone else's hands, and makes offboarding total.

## 2. Scope

This contract owns:

- User identity records
- Password credentials
- OAuth identity links
- Invitations
- Frontline setup tokens
- Password-reset tokens
- Identity lifecycle state (`ACTIVE`, `INACTIVE`, `DELETED`) and the offboarding lifecycle operation/event

This contract does not own:

- Application sessions (C12)
- Organization/location membership (C13)
- Capabilities and roles (C14)
- Audit storage (C23)

Related contracts: C00, C01, C12, C13, C14, C23.

## 3. Definitions

| Term             | Meaning                                                                                                                                                                                                                                                                          |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Identity         | The single application record representing one human user.                                                                                                                                                                                                                       |
| Credential       | Anything that proves identity: a password, a PIN, an OAuth link, or a single-use token.                                                                                                                                                                                          |
| Single-use token | An invitation, frontline setup, or password-reset token.                                                                                                                                                                                                                         |
| Offboarded       | The result of the `OffboardIdentity` lifecycle operation: `IdentityOffboarded` is emitted, IdentityStatus is `INACTIVE`, authentication is disabled, sessions/tokens are revoked, and effective membership/grants are removed. It is distinct from `DELETED`. |

## 4. Requirements

The keywords MUST, MUST NOT, SHOULD, and MAY are used in the RFC 2119 sense. Requirement IDs are stable and MUST NOT be renumbered or reused.

- **IDN-1** — Each human user MUST map to exactly one canonical application identity.
- **IDN-2** — Linking or signing in with an OAuth identity MUST NOT create a second application identity for a person who already has one (linking rule: see OQ-IDN-4; value Not yet verified).
- **IDN-3** — An OAuth sign-in that cannot be matched to exactly one identity under the linking rule MUST fail closed and create no identity.
- **IDN-4** — Possession of a valid credential MUST NOT, by itself, establish any membership, role, or capability.
- **IDN-5** — Passwords MUST be stored only as salted hashes produced by the approved password hashing implementation (see OQ-IDN-1; value Not yet verified).
- **IDN-6** — Plaintext passwords and PINs MUST NOT be persisted, logged, returned in any response, or sent to any component other than the hashing step.
- **IDN-7** — Single-use tokens MUST be generated from a cryptographically secure random source.
- **IDN-8** — Single-use tokens MUST be stored only as hashes.
- **IDN-9** — Every single-use token MUST carry an expiry, and an expired token MUST be rejected (lifetimes: see OQ-IDN-2; value Not yet verified).
- **IDN-10** — A single-use token MUST be consumable at most once; a second consumption MUST fail with no side effect.
- **IDN-11** — A single-use token MUST be revocable before expiry, and a revoked token MUST be rejected.
- **IDN-12** — A manager with the setup capability MAY initiate frontline setup for a learner in scope.
- **IDN-13** — A manager MUST NOT be able to choose, submit, receive, view, or retrieve an employee's password, PIN, or any reusable credential, through any API, UI, log, export, or notification.
- **IDN-14** — Inactive, deleted, and offboarded identities MUST NOT authenticate by any method: password, PIN, OAuth, setup token, or reset token.
- **IDN-15** — A credential change MUST revoke the sessions designated by the session-revocation policy (see OQ-IDN-3; value Not yet verified) through C12's canonical revocation path.
- **IDN-16** — Every identity lifecycle change (create, invite, accept, credential change, deactivate, offboard, reactivate) MUST emit an audit event per C23 in the same transaction as the change.
- **IDN-17** — Offboarding MUST execute only through one shared identity lifecycle service.
- **IDN-18** — Offboarding MUST, in one transaction: set IdentityStatus to `INACTIVE`, emit `IdentityOffboarded`, revoke all its sessions, revoke its frontline credentials and pending single-use tokens, and remove its effective membership and grants.
- **IDN-19** — Repeating an offboarding request with the same idempotency key MUST return the same final state, preserve the original offboarding timestamp, and append no duplicate lifecycle or audit event.
- **IDN-20** — An invitation to an email that belongs to an offboarded identity MUST follow exactly one owner-chosen rule (see OQ-IDN-5; value Not yet verified); until chosen, such invitations MUST be rejected.
- **IDN-21** — IdentityStatus lifecycle MUST permit only `ACTIVE -> INACTIVE` and `INACTIVE -> ACTIVE` for current application behavior. `OffboardIdentity` MUST result in `INACTIVE`; repeating offboarding while already `INACTIVE` MAY preserve `INACTIVE` while applying idempotent offboarding guarantees. `DELETED` MUST be terminal, and no application transition into `DELETED` is authorized until C15 deletion semantics are owner-approved.
- **IDN-22** — Deactivating an identity for any reason other than offboarding MUST emit `IdentityDeactivated` as the canonical lifecycle event for the `ACTIVE -> INACTIVE` transition. Offboarding emits `IdentityOffboarded`, not `IdentityDeactivated` (see IDN-18).
- **IDN-23** — Reactivating an identity MUST emit `IdentityReactivated` as the canonical lifecycle event for the `INACTIVE -> ACTIVE` transition.

## 5. Acceptance Cases

| Case      | Proves         | Setup                                                                                                              | Expected                                                                                                                      |
| --------- | -------------- | ------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------- |
| IDN-AC-1  | IDN-1, IDN-2   | Existing password identity signs in via OAuth with the matching email under the approved linking rule              | Identity count for that person remains 1                                                                                      |
| IDN-AC-2  | IDN-3          | OAuth sign-in whose email matches two identities (seeded fixture)                                                  | Sign-in fails; zero identities created; audit records the failure                                                             |
| IDN-AC-3  | IDN-4          | Valid password for an identity with no active membership                                                           | Authentication may succeed; every protected tenant operation returns 403 or 404 per C14                                       |
| IDN-AC-4  | IDN-5, IDN-6   | Create identity with password; inspect stored row, logs, and API responses                                         | Stored value is a salted hash in the approved format; plaintext appears nowhere                                               |
| IDN-AC-5  | IDN-7, IDN-8   | Issue each token type; inspect storage                                                                             | Only hashes stored; token values differ across 1,000 issuances                                                                |
| IDN-AC-6  | IDN-9          | Consume a token after its expiry                                                                                   | Rejected; no state change                                                                                                     |
| IDN-AC-7  | IDN-10         | Consume the same token twice, including two concurrent requests                                                    | Exactly one success; the other fails with no side effect                                                                      |
| IDN-AC-8  | IDN-11         | Revoke a token, then consume it                                                                                    | Rejected; no state change                                                                                                     |
| IDN-AC-9  | IDN-12, IDN-13 | Manager initiates frontline setup and inspects every manager-reachable API response, export, notification, and log | Setup token delivered to learner channel only; no credential value reachable by manager; manager cannot set a PIN or password |
| IDN-AC-10 | IDN-14         | Offboarded identity attempts password, PIN, OAuth, setup token, and reset token authentication                     | All five fail with 401; zero sessions issued                                                                                  |
| IDN-AC-11 | IDN-15         | Change password with two active sessions                                                                           | Sessions designated by the policy are revoked and return 401                                                                  |
| IDN-AC-12 | IDN-16         | Perform each lifecycle change; force audit insert to fail on one                                                   | Each successful change has exactly one audit event; the forced failure rolls back the change                                  |
| IDN-AC-13 | IDN-17         | Architecture test enumerates writes to identity lifecycle state                                                    | Single writer: the lifecycle service                                                                                          |
| IDN-AC-14 | IDN-18         | Offboard an identity with sessions, pending tokens, and membership; inject failure midway                          | Either all effects are present or none are                                                                                    |
| IDN-AC-15 | IDN-19         | Send the same offboarding request three times with one idempotency key                                             | Same final state; original timestamp preserved; exactly one lifecycle and one audit event                                     |
| IDN-AC-16 | IDN-20         | Invite an email belonging to an offboarded identity before the OQ is decided                                       | Invitation rejected; no token issued                                                                                          |
| IDN-AC-17 | IDN-18, IDN-21 | Exercise deactivate, reactivate, offboard, invalid reactivation-from-DELETED, and attempted deletion before C15 approval | Only ACTIVE→INACTIVE and INACTIVE→ACTIVE succeed; offboarding ends INACTIVE; DELETED has no authorized ingress and is terminal |

## 6. Open Questions

| ID       | Question                                                                                                                                              | Blocks implementation | Affects |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------- | ------- |
| OQ-IDN-1 | Which password hashing algorithm and parameters are approved?                                                                                         | Yes                   | IDN-5   |
| OQ-IDN-2 | What are the lifetimes of invitation, frontline setup, and password-reset tokens?                                                                     | Yes                   | IDN-9   |
| OQ-IDN-3 | Which sessions does a credential change revoke: all sessions, all other sessions, or another policy?                                                  | Yes                   | IDN-15  |
| OQ-IDN-4 | What is the OAuth linking rule: verified-email match, explicit user-initiated linking only, or another rule?                                          | Yes                   | IDN-2   |
| OQ-IDN-5 | For an offboarded identity's email, is a new invitation a controlled reactivation or a controlled rejection? (Required decision carried from Gate A.) | Yes                   | IDN-20  |
| OQ-IDN-6 | Are PINs an approved frontline credential type in v2, and if so what are their length and lockout rules?                                              | No                    | —       |
| OQ-IDN-7 | Must password-reset and invitation responses be indistinguishable for registered and unregistered emails?                                             | No                    | —       |

## 7. Verification Status

| Item                         | State                    | Detail                                                                                                                                                                                                                                                |
| ---------------------------- | ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Target codebase              | verified (limited scope) | `peteywee/teach-v2` default branch `main`, verified through governance baseline commit `292e8da9123987e9d94f09669c7bc6b6d43c4320` on 2026-10-03. The repository contains the contract/governance foundation; application implementation remains not yet built.                                |
| Legacy repository consulted  | reference only           | `peteywee/teach` `work/TR-0010-production-cutover` at `79fdce5cc3b2` (`main` at `99162f17eace`), read 2026-10-03 for lineage: legacy domain contract JSON files and the Gate A decision record. Legacy code was not inspected and does not govern v2. |
| Implementation conformance   | unknown                  | Not yet verified. No v2 implementation was inspected; the owner states v2 is yet to be built.                                                                                                                                                         |
| Acceptance cases implemented | unknown                  | Not yet verified. No mapping between repository tests and these IDs has been established.                                                                                                                                                             |
| Blocking open questions      | 5 open                   | Contract is `active` with these open. Each blocks implementation of the requirements it affects beyond fail-closed behavior until decided (SYS-34).                                                                                                   |
| Owner approval               | declared                 | C11 1.2.0 approved by Patrick Craven on 2026-10-04 by direct owner direction (canonical lifecycle event definitions). |
| Independent review           | not performed            | Drafted and self-checked by Claude against the contract-authoring checklist only.                                                                                                                                                                     |
| Source of intent             | declared                 | Owner-supplied rebuild proposal (`source/2026-10-03-teach-v2-contract-hierarchy-proposal.md`), consolidated decisions (`source/2026-10-03-teach-rebuild-consolidated-decisions.md`), and legacy Gate A owner decisions (2026-07-22) where cited.      |

## 8. Change Log

| Version | Date       | Change                                                                                                                                                                                          | By               |
| ------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- |
| 0.1.0   | 2026-10-03 | Initial proposed draft from the owner-supplied hierarchy proposal. Not approved.                                                                                                                | Claude (drafter) |
| 0.2.0   | 2026-10-03 | Aligned with C01: `Offboarded` no longer asserted to be a status value; IDN-18 now refers to the offboarded outcome pending C01 OQ-SEM-2.                                                       | Claude (drafter) |
| 0.3.0   | 2026-10-03 | Retargeted to the Teach v2 codebase: legacy `peteywee/teach` is reference only; anchors and paths no longer point into the legacy repository.                                                   | Claude (drafter) |
| 0.4.0   | 2026-10-03 | Anchored to `peteywee/teach-v2` branch `main` (owner-declared); the repository had no commits when cloned on 2026-10-03, so the anchor SHA stays Not yet verified.                              | Claude (drafter) |
| 1.0.0   | 2026-10-03 | Approved by the owner; status changed from `proposed` to `active`. Open questions remain open and block implementation of the requirements they affect (SYS-34) instead of blocking activation. | Claude (drafter) |
| 1.0.1   | 2026-10-03 | Non-normative document-governance metadata/provenance normalization; 1.0.0 owner approval remained controlling. | ChatGPT (governance) |
| 1.0.2   | 2026-10-03 | Non-normative baseline cleanup: corrected stale current-status provenance after the contract spine was committed; no behavioral requirement changed. | ChatGPT (governance) |
| 1.0.3   | 2026-10-03 | Non-normative truth-state cleanup: verification status now anchors the live v2 repository through governance baseline `292e8da9123987e9d94f09669c7bc6b6d43c4320`; no behavioral requirement changed. | ChatGPT (governance) |
| 1.1.0   | 2026-10-03 | Approved bootstrap IdentityStatus transition graph; offboarding now explicitly results in INACTIVE; DELETED ingress remains fail-closed pending C15 privacy semantics. GitHub issue #4. | Patrick Craven (owner approval) |
| 1.2.0   | 2026-10-04 | Defined canonical lifecycle events for deactivation and reactivation: IDN-22 requires `IdentityDeactivated` on non-offboarding `ACTIVE -> INACTIVE`; IDN-23 requires `IdentityReactivated` on `INACTIVE -> ACTIVE`. | Patrick Craven (owner direction) |
