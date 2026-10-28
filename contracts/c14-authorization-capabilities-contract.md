<!--tos-doc
{
  "doc_id": "TEACH-CON-C14",
  "class": "contract",
  "version": "1.5.0",
  "claims_truth_state": "declared",
  "status": "active",
  "owner": "Patrick Craven, Top Shelf Service LLC",
  "created_on": "2026-10-03",
  "updated_on": "2026-10-26",
  "effective_on": "2026-10-26",
  "approval": {
    "state": "approved",
    "approved_version": "1.5.0",
    "approved_on": "2026-10-26",
    "record": "domains/demo-authoring/owner-approval.json",
    "basis": "Owner-approved bounded manager-authoring increment and narrow private storage/access scope; actual execution remains conditional on review/tests."
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
    "TEACH-CON-C14@1.0.3",
    "TEACH-CON-C14@1.2.0",
    "TEACH-CON-C14@1.3.0",
    "TEACH-CON-C14@1.4.0"
  ],
  "superseded_by": null,
  "depends_on": [
    "contracts/"
  ],
  "demo_runtime_registration": {
    "package": "TEACH-DEMO-RUNTIME-2026-10-17@0.1.0",
    "approval_record": "domains/demo-runtime/owner-approval.json",
    "issue": "#82",
    "source_package": "domains/demo-runtime/proposal-0.1.0",
    "sha256sums_sha256": "a1df23b03a0f0660a072cff00eb40d3d2fb60bc8c521f12b56977f559601196a",
    "semantic_authority_only": true,
    "physical_schema_admission": false,
    "runtime_activation": false,
    "deployment_authority": false
  },
  "demo_authoring_registration": {
    "package": "TEACH-DEMO-AUTHORING-2026-10-26@0.1.0",
    "impact_issue": null,
    "approval_record": "domains/demo-authoring/owner-approval.json",
    "source_package": "domains/demo-authoring/proposal-0.1.0",
    "source_registration_only": true,
    "physical_schema_admission": false,
    "runtime_proof": "NOT_ESTABLISHED_BY_REGISTRATION"
  }
}
-->

# C14 — Authorization & Capabilities Contract

| Field              | Value                                                                                                                                                           |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Contract ID        | C14                                                                                                                                                             |
| Group              | C10 Trust & Security                                                                                                                                            |
| Governed by        | C00 System Authority                                                                                                                                            |
| Version | 1.5.0 |
| Status             | `active`                                                                                                                                                        |
| Owner              | Patrick Craven, Top Shelf Service LLC                                                                                                                           |
| Approved by | Patrick Craven (owner), 2026-10-17; TEACH-DEMO-RUNTIME-2026-10-17@0.1.0; SYS-21 #82; see `domains/demo-runtime/owner-approval.json` |
| Requirement prefix | `AUTHZ`                                                                                                                                                         |
| Activation         | Required for the core rebuild                                                                                                                                   |
| Legacy lineage     | Reference only — reworks legacy `.topshelf/contracts/domain/tenancy.json` (capability resolution half); carries forward Gate A denial semantics.                |
| Supersedes | 1.3.0 |
| Superseded by      | None                                                                                                                                                            |
| Created            | 2026-10-03                                                                                                                                                      |
| Last updated | 2026-10-17 |

## 1. Purpose and Failure Prevented

A developer adds a new manager endpoint and forgets to wire the authorization check. It ships, because nothing requires every route to be registered. Any signed-in learner can call it. Separately, a screen hides the "Export" button from cooks, and everyone treats that as the security control. This contract makes authorization default-deny at a single registry, so an unregistered route cannot run, and makes the API, never the UI, the place where permission lives.

## 2. Scope

This contract owns:

- The protected-operation registry
- Authorization semantics for the C01-registered capability vocabulary
- Role-to-capability bundles
- Authorization decisions and denial semantics

This contract does not own:

- Capability identifier registration and canonical naming (C01)
- Membership and authoritative local entitlement facts (C13)
- Session validity (C12)
- Billing/provider facts and entitlement reconciliation process (C63)

Related contracts: C00, C12, C13, C23, C63.

## 3. Definitions

| Term                | Meaning                                                                      |
| ------------------- | ---------------------------------------------------------------------------- |
| Protected operation | Any API method and path that reads or mutates non-public data.               |
| Capability          | A typed, dot-delimited action constant (for example `team.member.offboard`). |
| Role                | A named bundle of capabilities. Roles are not checked directly.              |
| Entitlement         | An Organization-owned local access fact that authorization may consume to restrict capability effect but may never use to create a capability. |
| Target              | The record an operation acts on.                                             |

## 4. Requirements

The keywords MUST, MUST NOT, SHOULD, and MAY are used in the RFC 2119 sense. Requirement IDs are stable and MUST NOT be renumbered or reused.

- **AUTHZ-1** — Every protected API operation MUST be listed in the protected-operation registry.
- **AUTHZ-2** — Every registered operation MUST map to exactly one owning capability.
- **AUTHZ-3** — Exactly one protected-operation registry MUST exist.
- **AUTHZ-4** — The registry MUST be default-deny: an operation absent from it MUST be denied.
- **AUTHZ-5** — Denial of an unknown or unauthorized operation MUST occur before handler code executes.
- **AUTHZ-6** — A mounted protected route without a registry entry MUST fail CI or application startup.
- **AUTHZ-7** — Roles MUST be defined only as bundles of capabilities; authorization code MUST NOT check role names directly.
- **AUTHZ-8** — Entitlements MAY remove a capability's effect but MUST NOT create a capability.
- **AUTHZ-9** — UI visibility MUST NOT constitute authorization; every protected operation MUST be enforced at the API.
- **AUTHZ-10** — Each authorization decision MUST reload database-current actor, membership, and scope state.
- **AUTHZ-11** — Authorization MUST evaluate, in order: identity, membership, tenant/location scope, capability, target, entitlement; failure at any step MUST stop evaluation.
- **AUTHZ-12** — A missing, invalid, expired, or revoked session MUST produce `401`.
- **AUTHZ-13** — An authenticated actor lacking the required capability or active membership MUST receive `403`.
- **AUTHZ-14** — A wrong-tenant, wrong-location, out-of-reporting-scope, inactive, deleted, or nonexistent target MUST produce a non-disclosing `404` that is indistinguishable from a nonexistent target and contains no target fields.
- **AUTHZ-15** — A denied request MUST produce no state change and no external side effect, other than audit records permitted by C23.
- **AUTHZ-16** — A target ID supplied by the client MUST NOT establish authorization; the target MUST be resolved and checked against actor scope.
- **AUTHZ-17** — Every sensitive mutation MUST be evaluated with both actor scope and target scope.
- **AUTHZ-18** — Every capability addition or change MUST ship with negative tests proving denial for actors that lack it, in the same change.
- **AUTHZ-19** — The capability vocabulary and bundles MUST be the NEW_V2 matrix in the registered C14 specification and `c14-capability-matrix.json`: 39 operation capabilities, explicit self/learner/observer/manager/org_admin/demo_visitor bundles, and no imported legacy grants or cross-tenant platform capabilities. Evaluation, bootstrap exceptions, conditional/blocked grants and negative tests MUST follow that matrix. The prior 34 capability identifiers remain governed by their historical admission; exactly five demo capability names are registered by the approved demo package. All physical and runtime dependencies remain separate gates. See `governance/decision-closure/02-c14-authorization-capability-matrix.md`. (OQ-AUTHZ-1 resolved 2026-10-05).
- **AUTHZ-20** — A role MUST NOT hold a cross-tenant capability. Owner approved NO_CROSS_TENANT_GRANTS on 2026-10-05: no cross-tenant platform grants exist; V1 platform_operator grants are not imported.
- **AUTHZ-21** — Authorization MUST treat entitlement as a read-only input loaded from authoritative Organization-owned state; authorization code MUST NOT create or mutate entitlement state.

## 5. Acceptance Cases

| Case        | Proves                                           | Setup                                                                                                                    | Expected                                                                                                     |
| ----------- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------ |
| AUTHZ-AC-1  | AUTHZ-1, AUTHZ-6, AUTHZ-3                        | Mount a protected route with no registry entry                                                                           | CI or startup fails                                                                                          |
| AUTHZ-AC-2  | AUTHZ-4, AUTHZ-5                                 | Call an unregistered path that exists in code; instrument handler                                                        | Denied; handler never invoked                                                                                |
| AUTHZ-AC-3  | AUTHZ-2                                          | Registry validation                                                                                                      | Every entry names exactly one capability                                                                     |
| AUTHZ-AC-4  | AUTHZ-7                                          | Static check for role-name comparisons in authorization paths                                                            | None found                                                                                                   |
| AUTHZ-AC-5  | AUTHZ-8                                          | Entitlement grants a feature to an actor without the capability                                                          | Request still denied 403                                                                                     |
| AUTHZ-AC-6  | AUTHZ-9                                          | Call every protected operation directly with actors whose UI hides it                                                    | Denied per matrix                                                                                            |
| AUTHZ-AC-7  | AUTHZ-10                                         | Revoke a capability mid-session; repeat request                                                                          | Denied on next request                                                                                       |
| AUTHZ-AC-8  | AUTHZ-11, AUTHZ-12, AUTHZ-13, AUTHZ-14, AUTHZ-15 | Authorization matrix: every operation × {no session, no capability, wrong tenant, wrong location, deleted target, valid} | 401/403/404/2xx exactly per matrix; zero writes on denial; 404 bodies identical to nonexistent-target bodies |
| AUTHZ-AC-9  | AUTHZ-16, AUTHZ-17                               | Valid actor supplies a guessed target ID outside scope for each mutation                                                 | Non-disclosing 404; no write                                                                                 |
| AUTHZ-AC-10 | AUTHZ-18                                         | PR adds a capability without a denial test                                                                               | CI check fails                                                                                               |
| AUTHZ-AC-11 | AUTHZ-19                                         | Owner decision record                                                                                                    | Manual evidence: approved vocabulary recorded                                                                |
| AUTHZ-AC-12 | AUTHZ-20                                         | Enumerate role bundles for cross-tenant capabilities                                                                     | None unless owner approval recorded                                                                          |
| AUTHZ-AC-13 | AUTHZ-8, AUTHZ-11, AUTHZ-21                       | Evaluate authorization with entitlement input, then attempt entitlement mutation from authorization code                | Entitlement may restrict effect; mutation is rejected outside Organization boundary                          |

## 6. Open Questions

| ID         | Question                                                                                                                  | Blocks implementation | Affects  |
| ---------- | ------------------------------------------------------------------------------------------------------------------------- | --------------------- | -------- |
| OQ-AUTHZ-1 | **Resolved.** Owner, 2026-10-05: The capability vocabulary and bundles MUST be the NEW_V2 matrix in the registered C14 specification and `c14-capability-matrix.json`: 34 operation capabilities, explicit self/learner/manager/org_admin bundles, and no imported legacy grants or cross-tenant platform capabilities. Evaluation, bootstrap exceptions, conditional/blocked grants and negative tests MUST follow that matrix. This registration does not promote the 34 capability identifiers into C01/K00; implementation remains BLOCKED until their semantic registration and all matrix dependencies pass. See `governance/decision-closure/02-c14-authorization-capability-matrix.md`. (Decision-closure r3.1) | No (resolved) | AUTHZ-19 |
| OQ-AUTHZ-2 | **Resolved** Which cross-tenant platform capabilities, if any, exist in v2, and what audit do they require? | No                    | AUTHZ-20 (approved 2026-10-05) |

## 7. Verification Status

| Item                         | State                    | Detail                                                                                                                                                                                                                                                |
| ---------------------------- | ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Target codebase              | verified (limited scope) | `peteywee/teach-v2` default branch `main`, verified through governance baseline commit `292e8da9123987e9d94f09669c7bc6b6d43c4320` on 2026-10-03. The repository contains the contract/governance foundation; application implementation remains not yet built.                                |
| Legacy repository consulted  | reference only           | `peteywee/teach` `work/TR-0010-production-cutover` at `79fdce5cc3b2` (`main` at `99162f17eace`), read 2026-10-03 for lineage: legacy domain contract JSON files and the Gate A decision record. Legacy code was not inspected and does not govern v2. |
| Implementation conformance   | unknown                  | Not yet verified. No v2 implementation was inspected; the owner states v2 is yet to be built.                                                                                                                                                         |
| Acceptance cases implemented | unknown                  | Not yet verified. No mapping between repository tests and these IDs has been established.                                                                                                                                                             |
| Blocking open questions      | 0 open | Only unresolved question rows govern blocking; registration is not implementation evidence |
| Owner approval               | declared | 1.3.0 owner approval recorded in APPROVAL-RECORD.md under #75; runtime implementation conformance remains UNKNOWN |
| Independent review           | not performed            | Drafted and self-checked by Claude against the contract-authoring checklist only.                                                                                                                                                                     |
| Source of intent             | declared                 | Owner-supplied rebuild proposal (`source/2026-10-03-teach-v2-contract-hierarchy-proposal.md`), consolidated decisions (`source/2026-10-03-teach-rebuild-consolidated-decisions.md`), and legacy Gate A owner decisions (2026-07-22) where cited.      |

## 8. Change Log

| Version | Date | Change | By |
| ------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- |
| 0.1.0   | 2026-10-03 | Initial proposed draft from the owner-supplied hierarchy proposal. Not approved.                                                                                                                | Claude (drafter) |
| 0.2.0   | 2026-10-03 | Retargeted to the Teach v2 codebase: legacy `peteywee/teach` is reference only; anchors and paths no longer point into the legacy repository.                                                   | Claude (drafter) |
| 0.3.0   | 2026-10-03 | Anchored to `peteywee/teach-v2` branch `main` (owner-declared); the repository had no commits when cloned on 2026-10-03, so the anchor SHA stays Not yet verified.                              | Claude (drafter) |
| 1.0.0   | 2026-10-03 | Approved by the owner; status changed from `proposed` to `active`. Open questions remain open and block implementation of the requirements they affect (SYS-34) instead of blocking activation. | Claude (drafter) |
| 1.0.1   | 2026-10-03 | Non-normative document-governance metadata/provenance normalization; 1.0.0 owner approval remained controlling. | ChatGPT (governance) |
| 1.0.2   | 2026-10-03 | Non-normative baseline cleanup: corrected stale current-status provenance after the contract spine was committed; no behavioral requirement changed. | ChatGPT (governance) |
| 1.0.3   | 2026-10-03 | Non-normative truth-state cleanup: verification status now anchors the live v2 repository through governance baseline `292e8da9123987e9d94f09669c7bc6b6d43c4320`; no behavioral requirement changed. | ChatGPT (governance) |
| 1.1.0   | 2026-10-03 | C01 registers capability identifiers; C14 owns authorization semantics and consumes Organization-owned entitlement state read-only. GitHub issue #2. | Patrick Craven (owner approval) |
| 1.3.0 | 2026-10-05 | Register OQ-AUTHZ-1; preserve named residuals and existing requirement/acceptance IDs. Decision-closure r3.1 manifest sha256:ff7b51df1e3a235e9d226d9d7232f81c64bbeb451b359b6e0f2ea232b6e1757c; SYS-21 #75. | Patrick Craven (owner); ChatGPT (recorder) |

## Registered demo runtime amendment (1.4.0)

Exact owner-approved scope: `TEACH-DEMO-RUNTIME-2026-10-17@0.1.0`, SYS-21 [#82](https://github.com/peteywee/teach-v2/issues/82). Approval provenance: `domains/demo-runtime/owner-approval.json`; immutable source: `domains/demo-runtime/proposal-0.1.0/contract-amendments.md`. The addendum below is the approved revision, not an exception inferred by an implementer. It changes only its explicitly named demo behavior; ordinary/customer semantics and unrelated gates remain unchanged. Proposal labels in the immutable package preserve its pre-approval history; this registration supplies current authority. Physical schema admission, runtime activation and shared deployment remain separate.

Admit exact normal Membership/Location shape and immutable demo grant/reporting records defined here. Add DEMO_ONLY as an immutable synthetic organization classification, never a customer authorization shortcut. BeginDemoRun is the sole demo allocation writer and cannot target existing organizations. Register five new command/capability rows, demo_visitor bundle, named principals, DEMO_NEW_RUN and exact demo-record scope rules. All internal operations remain unrouted and ungrantable.

For DEMO_ONLY organizations bound one-to-one to DemoRun, step 6 evaluates the Organization-owned database-current run availability projection: ACTIVE status, deadline, fixed operation allowlist. Missing or contradictory inputs deny. Availability restricts existing capability effect and grants nothing. No Entitlement instance is created; non-demo entitlement rules remain unchanged.

StartLearningSession, RecordProgressEvent and CompleteLearningSession are LOCATION plus mandatory SELF-target binding, not baseline SELF bundle operations. Every mutation revalidates current actor Membership/grants and exact assignment/session under the transaction fence. DT-002 and DT-008 are reconciled to registered evaluation order and explicit selector meaning. The demo allowlist denies extra ordinary manager/self capabilities at the server. Expiry cleanup uses a separately specified exact-record terminalization policy so it can revoke expired access without requiring live visitor authority.

Exact definitions and field constraints are incorporated from `domains/demo-runtime/proposal-0.1.0/demo-boundary.md`, `domains/demo-runtime/proposal-0.1.0/authority-and-audit.md`, `domains/demo-runtime/proposal-0.1.0/learning-definition.md`, `domains/demo-runtime/proposal-0.1.0/learning-definition.json`, and `domains/demo-runtime/proposal-0.1.0/transport-and-queries.json` with its referenced schemas. No definition beyond that approved package is introduced.


## Bounded private manager-authoring successor — 2026-10-26

Five named operations require the current HumanActor manager, exact live demo run/session and existing fixed membership in the immutable organization/location. Learners and other visitors are denied server-side, including direct requests. Existing manager membership alone does not authorize general/customer content authoring. The old automation-only PublishContentPack capability/command is not granted or impersonated. Workspace allowedOperations is presentation, never server authority.

This amendment takes precedence only for the exact source package `domains/demo-authoring/proposal-0.1.0`; all unrelated requirements, historical decisions, recovery gates and permission boundaries remain unchanged. It does not itself execute migrations, grant credentials, or establish runtime conformance.
