<!--tos-doc
{
  "doc_id": "TEACH-CON-C13",
  "class": "contract",
  "version": "1.5.0",
  "claims_truth_state": "declared",
  "status": "active",
  "owner": "Patrick Craven, Top Shelf Service LLC",
  "created_on": "2026-10-03",
  "updated_on": "2026-10-04",
  "effective_on": "2026-10-03",
  "approval": {
    "state": "approved",
    "approved_version": "1.5.0",
    "approved_on": "2026-10-04",
    "record": "contracts/APPROVAL-RECORD.md",
    "basis": "Owner explicitly approved C13 1.3.0 canonical lifecycle event definition (MembershipRevoked) by direct owner direction on 2026-10-04"
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
  "supersedes": ["TEACH-CON-C13@1.2.0"],
  "superseded_by": null,
  "depends_on": [
    "contracts/"
  ]
}
-->

# C13 — Tenancy & Membership Contract

| Field              | Value                                                                                                                                                           |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Contract ID        | C13                                                                                                                                                             |
| Group              | C10 Trust & Security                                                                                                                                            |
| Governed by        | C00 System Authority                                                                                                                                            |
| Version            | 1.5.0                                                                                                                                                           |
| Status             | `active`                                                                                                                                                        |
| Owner              | Patrick Craven, Top Shelf Service LLC                                                                                                                           |
| Approved by        | Patrick Craven (owner), 2026-10-04 — C13 1.3.0 canonical lifecycle event definition by direct owner direction |
| Requirement prefix | `TEN`                                                                                                                                                           |
| Activation         | Required for the core rebuild                                                                                                                                   |
| Legacy lineage     | Reference only — reworks legacy `.topshelf/contracts/domain/tenancy.json` (tenancy half); capability resolution moves to C14.                                   |
| Supersedes         | C13 1.2.0 |
| Superseded by      | None                                                                                                                                                            |
| Created            | 2026-10-03                                                                                                                                                      |
| Last updated       | 2026-10-04                                                                                                                                                      |

## 1. Purpose and Failure Prevented

A manager at one restaurant edits an `organizationId` in a request and reads another customer's learner list. Or a user with two locations hits an endpoint that quietly picks the first location it finds, and a manager approves training for a cook at a store they do not run. Both failures come from letting the client name its own tenant, or from falling back when scope is unclear. This contract makes the organization the hard customer boundary and makes every ambiguity a denial.

## 2. Scope

This contract owns:

- Organizations
- Locations
- Memberships
- Entitlements and authoritative local entitlement state
- Reporting relationships
- Scope resolution for a request

This contract does not own:

- Capabilities and authorization decisions (C14)
- Billing/provider integration and entitlement reconciliation process (C63)
- Identity (C11)
- Record-level privacy lifecycle (C15)

Related contracts: C00, C11, C14, C15, C63.

## 3. Definitions

| Term                   | Meaning                                                                                   |
| ---------------------- | ----------------------------------------------------------------------------------------- |
| Organization           | The customer and security boundary.                                                       |
| Location               | A workplace scope beneath exactly one organization.                                       |
| Membership             | The record that an identity belongs to an organization and, where applicable, a location. |
| Entitlement            | Organization-owned local resource/plan access state. It may restrict capability effect but cannot create a capability. |
| Reporting relationship | A record that a learner reports to a manager. It narrows visibility only.                 |
| Tenant-owned record    | Any record whose access depends on organization membership.                               |

## 4. Requirements

The keywords MUST, MUST NOT, SHOULD, and MAY are used in the RFC 2119 sense. Requirement IDs are stable and MUST NOT be renumbered or reused.

- **TEN-1** — The organization MUST be the customer and security boundary; data and authority MUST NOT cross organizations except through platform capabilities explicitly defined in C14.
- **TEN-2** — Every location MUST belong to exactly one organization.
- **TEN-3** — Whether an identity belongs to an organization or location MUST be determined only by membership records.
- **TEN-4** — Membership MUST be resolved from database-current state on every protected request.
- **TEN-5** — Request bodies, query parameters, path parameters, client-set headers, frontend state, JWT claims, and user-editable metadata MUST NOT establish tenant or location authority.
- **TEN-6** — A request with zero matching authorized scopes MUST fail closed.
- **TEN-7** — A request MUST carry an explicit organization/location scope as a typed tuple, validated against the actor's current membership; a request with zero, multiple, or ambiguous scope selections MUST fail closed. The system MUST NOT fall back to a default or first-found scope. Transport encoding follows separate authority. Owner approved EXPLICIT_VALIDATED_SCOPE_TUPLE on 2026-10-05.
- **TEN-8** — A request targeting an organization the actor has no active membership in MUST fail closed.
- **TEN-9** — A request targeting a location outside the actor's active membership MUST fail closed.
- **TEN-10** — Inactive or revoked memberships MUST confer no scope.
- **TEN-11** — Reporting relationships MAY narrow which learners a manager can see.
- **TEN-12** — Reporting relationships MUST NOT grant membership, capability, or authority.
- **TEN-13** — Every tenant-owned record MUST have exactly one non-null owning organization.
- **TEN-14** — An actor in one tenant MUST NOT be able to read, modify, delete, or infer the existence of another tenant's protected data through any API path.
- **TEN-15** — The membership model is `NORMALIZED_MULTI_ORGANIZATION_MULTI_LOCATION`: normalized multi-organization, multi-location membership. V1 single-location compatibility is not adopted. Exact Membership/Location/grant shapes require promotion and admission. Owner approved on 2026-10-05.
- **TEN-16** — The Organization domain MUST own the canonical `Entitlement` entity and authoritative local entitlement state; billing/provider state MUST NOT be the application authority for entitlement.
- **TEN-17** — A change to local entitlement state originating from billing/provider reconciliation MUST cross the Organization domain's registered command boundary; C63 MUST NOT directly mutate Organization-owned entitlement state.
- **TEN-18** — A created membership MUST begin `ACTIVE`. The only permitted MembershipStatus transitions are `ACTIVE -> INACTIVE` and `INACTIVE -> REVOKED`; `REVOKED` is terminal. `DELETED` is not a MembershipStatus, and an unlisted transition MUST fail closed.
- **TEN-19** — Revoking a membership MUST emit `MembershipRevoked` as the canonical lifecycle event for the `INACTIVE -> REVOKED` transition. `REVOKED` is terminal (see TEN-18); no membership lifecycle event is emitted for any transition out of `REVOKED` because none is permitted.

## 5. Acceptance Cases

| Case      | Proves               | Setup                                                                                   | Expected                                                                              |
| --------- | -------------------- | --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| TEN-AC-1  | TEN-1, TEN-14, TEN-8 | Tenant A/B fixture: actor in A requests every tenant-owned read and write using B's IDs | All return non-disclosing 404; zero B rows changed; response bodies contain no B data |
| TEN-AC-2  | TEN-2, TEN-13        | Schema/constraint test on locations and every tenant-owned table                        | Owning organization column is NOT NULL with a foreign key; orphan inserts fail        |
| TEN-AC-3  | TEN-5                | Send `organizationId`/`locationId` overrides in body, query, path, and header           | Server ignores or rejects them; scope equals database-resolved scope                  |
| TEN-AC-4  | TEN-3, TEN-4         | Remove membership while actor's session is open; repeat request                         | Next request denied                                                                   |
| TEN-AC-5  | TEN-6                | Authenticated identity with no membership calls a tenant operation                      | Fails closed (403)                                                                    |
| TEN-AC-6  | TEN-7                | Identity with two memberships calls an operation without a valid scope selection        | Fails closed; no fallback scope used                                                  |
| TEN-AC-7  | TEN-9                | Location-A manager targets a location-B learner in the same organization                | Non-disclosing 404                                                                    |
| TEN-AC-8  | TEN-10               | Soft-deleted membership attempts access                                                 | Denied                                                                                |
| TEN-AC-9  | TEN-11, TEN-12       | Add a reporting relationship to an actor lacking manager capability                     | Actor gains no capability; manager with relationship sees only reports in scope       |
| TEN-AC-10 | TEN-15               | Owner decision record                                                                   | Manual evidence: approved model recorded before C13 activation                        |
| TEN-AC-11 | TEN-16               | Compare local entitlement state with provider/billing state                             | Application authority remains the Organization-owned local entitlement record          |
| TEN-AC-12 | TEN-17               | Attempt billing adapter direct write to entitlement persistence                         | Domain-boundary validation rejects direct foreign-domain mutation                      |
| TEN-AC-13 | TEN-10, TEN-18       | Attempt ACTIVE→REVOKED, INACTIVE→ACTIVE, REVOKED→ACTIVE, and non-canonical membership states | All rejected; only ACTIVE→INACTIVE→REVOKED is accepted; inactive/revoked confer no scope |

## 6. Open Questions

| ID       | Question                                                                                                                                                 | Blocks implementation | Affects |
| -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------- | ------- |
| OQ-TEN-1 | **Resolved** Does v2 start with the Gate A single-location compatibility membership or a normalized multi-organization, multi-location membership model? | Yes                   | TEN-15  |
| OQ-TEN-2 | **Resolved** How does a request select its scope when an identity holds more than one membership (explicit path segment, header validated against membership, other)? | Yes                   | TEN-7   |
| OQ-TEN-3 | **Resolved** Does v2 keep platform-operator cross-tenant access? Owner approved NO_CROSS_TENANT_GRANTS on 2026-10-05. | No                    | NO_CROSS_TENANT_GRANTS |

## 7. Verification Status

| Item                         | State                    | Detail                                                                                                                                                                                                                                                |
| ---------------------------- | ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Target codebase              | verified (limited scope) | `peteywee/teach-v2` default branch `main`, verified through governance baseline commit `292e8da9123987e9d94f09669c7bc6b6d43c4320` on 2026-10-03. The repository contains the contract/governance foundation; application implementation remains not yet built.                                |
| Legacy repository consulted  | reference only           | `peteywee/teach` `work/TR-0010-production-cutover` at `79fdce5cc3b2` (`main` at `99162f17eace`), read 2026-10-03 for lineage: legacy domain contract JSON files and the Gate A decision record. Legacy code was not inspected and does not govern v2. |
| Implementation conformance   | unknown                  | Not yet verified. No v2 implementation was inspected; the owner states v2 is yet to be built.                                                                                                                                                         |
| Acceptance cases implemented | unknown                  | Not yet verified. No mapping between repository tests and these IDs has been established.                                                                                                                                                             |
| Blocking open questions      | 2 open                   | Contract is `active` with these open. Each blocks implementation of the requirements it affects beyond fail-closed behavior until decided (SYS-34).                                                                                                   |
| Owner approval               | declared                 | C13 1.3.0 approved by Patrick Craven on 2026-10-04 by direct owner direction (canonical lifecycle event definition). |
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
| 1.0.3   | 2026-10-03 | Non-normative truth-state cleanup: verification status now anchors the live v2 repository through governance baseline `292e8da9123987e9d94f09669c7bc6b6d43c4320`; no behavioral requirement changed. | ChatGPT (governance) |
| 1.1.0   | 2026-10-03 | Organization owns Entitlement/local entitlement state; provider reconciliation must cross the Organization command boundary. GitHub issue #2. | Patrick Craven (owner approval) |
| 1.2.0   | 2026-10-03 | Approved MembershipStatus state machine ACTIVE→INACTIVE→REVOKED and corrected TEN-10 `deleted` wording to `revoked`. GitHub issue #4. | Patrick Craven (owner approval) |
| 1.3.0   | 2026-10-04 | Defined the canonical lifecycle event for membership revocation: TEN-19 requires `MembershipRevoked` on `INACTIVE -> REVOKED`; no event is emitted out of terminal `REVOKED`. | Patrick Craven (owner direction) |
