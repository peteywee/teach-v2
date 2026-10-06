<!--tos-doc
{
  "doc_id": "TEACH-CON-C63",
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
    "TEACH-CON-C63@1.0.3",
    "TEACH-CON-C63@1.1.0"
  ],
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
| Version            | 1.2.0 |
| Status             | `active`                                                                                                                                                        |
| Owner              | Patrick Craven, Top Shelf Service LLC                                                                                                                           |
| Approved by        | Patrick Craven (owner), 2026-10-05; manifest-bound decision-closure r3.1, SYS-21 #75; see `APPROVAL-RECORD.md` |
| Requirement prefix | `BIL`                                                                                                                                                           |
| Activation         | Conditional — binding only when the owner enables this feature                                                                                                  |
| Legacy lineage     | New.                                                                                                                                                            |
| Supersedes         | 1.1.0 |
| Superseded by      | None                                                                                                                                                            |
| Created            | 2026-10-03                                                                                                                                                      |
| Last updated       | 2026-10-05 |

## 1. Purpose and Failure Prevented

A checkout endpoint takes `organizationId` from the request, so one customer can attach a subscription to another. A payment webhook arrives twice and grants two seats; a cancellation arrives before the creation event and is overwritten. This contract keeps money on the server's terms, makes provider events idempotent and ordered, and keeps self-service billing off until the owner turns it on.

## 2. Scope

This contract owns:

- Self-service checkout
- Payment-provider customer identity
- Provider event processing
- Billing/provider-to-entitlement reconciliation process

This contract does not own:

- Capabilities and authorization semantics (C14)
- The canonical Entitlement entity and authoritative local entitlement state (C13)
- Commercial terms (customer agreements, outside this contract set)
- Idempotency mechanics (C22)

Related contracts: C00, C01, C13, C14, C22.

## 3. Definitions

| Term        | Meaning                                                                                       |
| ----------- | --------------------------------------------------------------------------------------------- |
| Entitlement | Organization-owned authoritative local access state; billing/provider reconciliation may request updates but does not own the entity (C13, C14). |

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
- **BIL-12** — No payment provider is selected, and production money movement remains NOT_AUTHORIZED. A named provider and explicit owner authorization are required before enablement; this registration introduces no SDK, key or webhook secret. See `governance/decision-closure/08-deferred-feature-policy-register.md`. (OQ-BIL-2 resolved 2026-10-05).
- **BIL-13** — Billing accounts are Organization-owned and entitlement is a read-only Organization-owned projection; the relationship requires separate C01 semantic registration. Organization-to-billing-account cardinality remains UNKNOWN; no billing-account creation is authorized while billing is disabled. See `governance/decision-closure/08-deferred-feature-policy-register.md`. (OQ-BIL-3 partially registered 2026-10-05).
- **BIL-14** — Billing/provider reconciliation MUST request local entitlement changes through the Organization domain's registered command boundary and MUST NOT directly mutate the Organization-owned `Entitlement` entity or persistence.

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
| BIL-AC-12 | BIL-10, BIL-14 | Provider event requires a local entitlement correction       | Reconciliation crosses Organization command boundary; direct entitlement persistence write is rejected |

## 6. Open Questions

| ID       | Question                                                                                                    | Blocks implementation | Affects |
| -------- | ----------------------------------------------------------------------------------------------------------- | --------------------- | ------- |
| OQ-BIL-1 | **Resolved.** Owner, 2026-10-05: Self-service billing remains DISABLED. No checkout, webhook or billing route is authorized; billing remains manual outside the application until an owner-enabled C63 revision. See `governance/decision-closure/08-deferred-feature-policy-register.md`. (Decision-closure r3.1) | No (resolved) | — |
| OQ-BIL-2 | **Resolved.** Owner, 2026-10-05: No payment provider is selected, and production money movement remains NOT_AUTHORIZED. A named provider and explicit owner authorization are required before enablement; this registration introduces no SDK, key or webhook secret. See `governance/decision-closure/08-deferred-feature-policy-register.md`. (Decision-closure r3.1) | No (resolved) | BIL-12 |
| OQ-BIL-3 | **Open — residual only.** What Organization-to-billing-account cardinality is approved? Owner, 2026-10-05: Billing accounts are Organization-owned and entitlement is a read-only Organization-owned projection; the relationship requires separate C01 semantic registration. Organization-to-billing-account cardinality remains UNKNOWN; no billing-account creation is authorized while billing is disabled. See `governance/decision-closure/08-deferred-feature-policy-register.md`. (Decision-closure r3.1; partial registration) | No | BIL-13 |

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
| ------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- |
| 0.1.0   | 2026-10-03 | Initial proposed draft from the owner-supplied hierarchy proposal. Not approved.                                                                                                                      | Claude (drafter) |
| 0.2.0   | 2026-10-03 | Retitled Self-Service Billing; group renamed to C60 Optional Feature Contracts; added BIL-13 (organization/billing ownership defined even while disabled), BIL-AC-11, and OQ-BIL-3.                   | Claude (drafter) |
| 0.3.0   | 2026-10-03 | Retargeted to the Teach v2 codebase: legacy `peteywee/teach` is reference only; anchors and paths no longer point into the legacy repository. Commercial terms no longer reference legacy file paths. | Claude (drafter) |
| 0.4.0   | 2026-10-03 | Anchored to `peteywee/teach-v2` branch `main` (owner-declared); the repository had no commits when cloned on 2026-10-03, so the anchor SHA stays Not yet verified.                                    | Claude (drafter) |
| 1.0.0   | 2026-10-03 | Approved by the owner; status changed from `proposed` to `active`. Open questions remain open and block implementation of the requirements they affect (SYS-34) instead of blocking activation.       | Claude (drafter) |
| 1.0.1   | 2026-10-03 | Non-normative document-governance metadata/provenance normalization; 1.0.0 owner approval remained controlling. | ChatGPT (governance) |
| 1.0.2   | 2026-10-03 | Non-normative baseline cleanup: corrected stale current-status provenance after the contract spine was committed; no behavioral requirement changed. | ChatGPT (governance) |
| 1.0.3   | 2026-10-03 | Non-normative truth-state cleanup: verification status now anchors the live v2 repository through governance baseline `292e8da9123987e9d94f09669c7bc6b6d43c4320`; no behavioral requirement changed. | ChatGPT (governance) |
| 1.1.0   | 2026-10-03 | Billing owns provider reconciliation process, not local Entitlement state; reconciliation must cross Organization boundary. GitHub issue #2. | Patrick Craven (owner approval) |
| 1.2.0 | 2026-10-05 | Register OQ-BIL-1, OQ-BIL-2, OQ-BIL-3; preserve named residuals and existing requirement/acceptance IDs. Decision-closure r3.1 manifest sha256:ff7b51df1e3a235e9d226d9d7232f81c64bbeb451b359b6e0f2ea232b6e1757c; SYS-21 #75. | Patrick Craven (owner); ChatGPT (recorder) |
