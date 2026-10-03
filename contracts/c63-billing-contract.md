<!--tos-doc
{
  "doc_id": "TEACH-CON-C63",
  "class": "contract",
  "version": "1.0.1",
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
    "inheritance": "1.0.1 is a non-normative metadata/governance patch; 1.0.0 owner approval remains controlling"
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

# C63 — Self-Service Billing Contract

| Field              | Value                                                                                                                                                           |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Contract ID        | C63                                                                                                                                                             |
| Group              | C60 Optional Feature Contracts                                                                                                                                  |
| Governed by        | C00 System Authority                                                                                                                                            |
| Version            | 1.0.1                                                                                                                                                           |
| Status             | `active`                                                                                                                                                        |
| Owner              | Patrick Craven, Top Shelf Service LLC                                                                                                                           |
| Approved by        | Patrick Craven (owner), 2026-10-03 — approval instruction given in chat at 10:47 CDT; transcribed by Claude at the owner's direction — see `APPROVAL-RECORD.md` |
| Requirement prefix | `BIL`                                                                                                                                                           |
| Activation         | Conditional — binding only when the owner enables this feature                                                                                                  |
| Legacy lineage     | New.                                                                                                                                                            |
| Supersedes         | None                                                                                                                                                            |
| Superseded by      | None                                                                                                                                                            |
| Created            | 2026-10-03                                                                                                                                                      |
| Last updated       | 2026-10-03                                                                                                                                                      |

## 1. Purpose and Failure Prevented

A checkout endpoint takes `organizationId` from the request, so one customer can attach a subscription to another. A payment webhook arrives twice and grants two seats; a cancellation arrives before the creation event and is overwritten. This contract keeps money on the server's terms, makes provider events idempotent and ordered, and keeps self-service billing off until the owner turns it on.

## 2. Scope

This contract owns:

- Self-service checkout
- Payment-provider customer identity
- Provider event processing
- Entitlement reconciliation

This contract does not own:

- Capabilities (C14)
- Commercial terms (customer agreements, outside this contract set)
- Idempotency mechanics (C22)

Related contracts: C00, C01, C14, C22.

## 3. Definitions

| Term        | Meaning                                                                                       |
| ----------- | --------------------------------------------------------------------------------------------- |
| Entitlement | A plan-derived fact that can restrict capability effect but cannot create a capability (C14). |

## 4. Requirements

The keywords MUST, MUST NOT, SHOULD, and MAY are used in the RFC 2119 sense. Requirement IDs are stable and MUST NOT be renumbered or reused.

This contract belongs to C60 (Good to Have). Its requirements bind only after the owner enables the feature it governs; until then, only the requirement that keeps the feature disabled is binding.

- **BIL-1** — Self-service billing MUST remain disabled until the owner enables this contract; until then billing MUST be handled manually outside the application.
- **BIL-2** — The billing organization MUST come from authoritative server scope.
- **BIL-3** — Provider customer identity MUST be server-owned and never accepted from the client.
- **BIL-4** — Checkout MUST require a billing capability.
- **BIL-5** — Checkout redirect destinations MUST be allowlisted.
- **BIL-6** — Provider webhook signatures MUST be verified before processing; unverified events MUST be rejected.
- **BIL-7** — Provider event IDs MUST be durably recorded.
- **BIL-8** — Duplicate provider events MUST be idempotent.
- **BIL-9** — Out-of-order provider events MUST be reconciled and MUST NOT overwrite newer state.
- **BIL-10** — Payment success and local entitlement state MUST be reconciled against the provider.
- **BIL-11** — Billing state MUST NOT grant an application capability.
- **BIL-12** — Production money movement MUST require explicit owner authorization (see OQ-BIL-2; value Not yet verified).
- **BIL-13** — The ownership relationship between an Organization and its billing account MUST be defined in C01 even while self-service billing is disabled (see OQ-BIL-3; value Not yet verified).

## 5. Acceptance Cases

| Case      | Proves       | Setup                                                        | Expected                                       |
| --------- | ------------ | ------------------------------------------------------------ | ---------------------------------------------- |
| BIL-AC-1  | BIL-1        | Call checkout with self-service disabled                     | Denied; no provider call                       |
| BIL-AC-2  | BIL-2, BIL-3 | Send organizationId/customerId overrides                     | Ignored or rejected; server values used        |
| BIL-AC-3  | BIL-4        | Actor without billing capability calls checkout              | 403                                            |
| BIL-AC-4  | BIL-5        | Checkout with non-allowlisted return URL                     | Rejected                                       |
| BIL-AC-5  | BIL-6        | Webhook with bad signature                                   | Rejected; no write                             |
| BIL-AC-6  | BIL-7, BIL-8 | Same event delivered twice                                   | Processed once                                 |
| BIL-AC-7  | BIL-9        | Cancel event before create event                             | Final state reflects provider truth            |
| BIL-AC-8  | BIL-10       | Provider shows paid; local shows unpaid                      | Reconciliation corrects local state with audit |
| BIL-AC-9  | BIL-11       | Active subscription for actor lacking capability             | Protected operations still denied              |
| BIL-AC-10 | BIL-12       | Live-mode keys configured without owner authorization record | Release gate blocks                            |
| BIL-AC-11 | BIL-13       | Registry check for the Organization–billing relationship     | Relationship registered in C01                 |

## 6. Open Questions

| ID       | Question                                                                                                    | Blocks implementation | Affects |
| -------- | ----------------------------------------------------------------------------------------------------------- | --------------------- | ------- |
| OQ-BIL-1 | When, if ever, is self-service billing enabled for v2?                                                      | No                    | —       |
| OQ-BIL-2 | Which payment provider is approved (the source proposal names Stripe)?                                      | No                    | BIL-12  |
| OQ-BIL-3 | How does an Organization relate to its billing account (for example one-to-one, owned by the organization)? | No                    | BIL-13  |

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

| Version | Date       | Change                                                                                                                                                                                                | By               |
| ------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- |
| 0.1.0   | 2026-10-03 | Initial proposed draft from the owner-supplied hierarchy proposal. Not approved.                                                                                                                      | Claude (drafter) |
| 0.2.0   | 2026-10-03 | Retitled Self-Service Billing; group renamed to C60 Optional Feature Contracts; added BIL-13 (organization/billing ownership defined even while disabled), BIL-AC-11, and OQ-BIL-3.                   | Claude (drafter) |
| 0.3.0   | 2026-10-03 | Retargeted to the Teach v2 codebase: legacy `peteywee/teach` is reference only; anchors and paths no longer point into the legacy repository. Commercial terms no longer reference legacy file paths. | Claude (drafter) |
| 0.4.0   | 2026-10-03 | Anchored to `peteywee/teach-v2` branch `main` (owner-declared); the repository had no commits when cloned on 2026-10-03, so the anchor SHA stays Not yet verified.                                    | Claude (drafter) |
| 1.0.0   | 2026-10-03 | Approved by the owner; status changed from `proposed` to `active`. Open questions remain open and block implementation of the requirements they affect (SYS-34) instead of blocking activation.       | Claude (drafter) |
