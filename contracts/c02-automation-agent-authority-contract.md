<!--tos-doc
{
  "doc_id": "TEACH-CON-C02",
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

# C02 — Automation & Agent Authority Contract

| Field              | Value                                                                                                                                                           |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Contract ID        | C02                                                                                                                                                             |
| Group              | C02 Automation & Agent Authority                                                                                                                                |
| Governed by        | C00 System Authority                                                                                                                                            |
| Version            | 1.0.1                                                                                                                                                           |
| Status             | `active`                                                                                                                                                        |
| Owner              | Patrick Craven, Top Shelf Service LLC                                                                                                                           |
| Approved by        | Patrick Craven (owner), 2026-10-03 — approval instruction given in chat at 10:47 CDT; transcribed by Claude at the owner's direction — see `APPROVAL-RECORD.md` |
| Requirement prefix | `AGT`                                                                                                                                                           |
| Activation         | Required for the core rebuild                                                                                                                                   |
| Legacy lineage     | New.                                                                                                                                                            |
| Supersedes         | None                                                                                                                                                            |
| Superseded by      | None                                                                                                                                                            |
| Created            | 2026-10-03                                                                                                                                                      |
| Last updated       | 2026-10-03                                                                                                                                                      |

## 1. Purpose and Failure Prevented

Someone adds an "AI coach" and, to get it working quickly, gives it a service-role database key so it can update learner progress directly. It skips capability checks, skips the transaction rules, and writes no audit record, so nobody can tell later which progress was earned and which was written by the coach. Separately, a nightly job offboards expired accounts with no execution identity, and the audit log records the actor as null. Both happened because "internal" or "automated" was treated as trusted. This contract makes Teach correct with zero agents, and makes every non-human actor cross the same gates a human does.

## 2. Scope

This contract owns:

- The actor-type taxonomy: HumanActor, RuntimeAgent, AutomationActor, DevelopmentAgent
- Trust rules for non-human actors
- The boundary between deterministic logic and agentic judgment
- Preconditions for introducing runtime agents

This contract does not own:

- Human identity and credentials (C11)
- Authorization mechanics (C14)
- Audit storage (C23)
- Contract approval rules (C00) and semantic change rules (C01)

Related contracts: C00, C01, C11, C14, C21, C23, C31, C51.

## 3. Definitions

| Term               | Meaning                                                                                                                                                                    |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| HumanActor         | A person acting through an authenticated identity.                                                                                                                         |
| RuntimeAgent       | An AI component operating as part of the Teach product.                                                                                                                    |
| AutomationActor    | Deterministic software acting on its own schedule or trigger: scheduler, worker, background job, CLI, deployment automation.                                               |
| DevelopmentAgent   | An AI assistant that helps build or maintain Teach. It is not part of the product.                                                                                         |
| Execution identity | The registered identity under which an AutomationActor or RuntimeAgent acts.                                                                                               |
| Agentic judgment   | Proposal-type output: coaching suggestions, content recommendations, explanations, summaries, draft training content, pattern identification, and action-plan suggestions. |

## 4. Requirements

The keywords MUST, MUST NOT, SHOULD, and MAY are used in the RFC 2119 sense. Requirement IDs are stable and MUST NOT be renumbered or reused.

- **AGT-1** — Teach MUST be fully correct with zero runtime agents enabled.
- **AGT-2** — Authentication, authorization, scope resolution, tenant isolation, session validity, database integrity, transactions, idempotency, credential issuance, offboarding, certification integrity, payment authority, data deletion, audit requirements, and retry safety MUST be implemented deterministically and MUST NOT be delegated to a runtime agent.
- **AGT-3** — Deterministic business decisions (for example CanStartLearningSession, CanViewLearner, CanIssueCertification, CanAssignContent, CanRetryOperation, IsVerificationComplete) MUST be implemented as explicit decision logic and MUST NOT be delegated to a runtime agent.
- **AGT-4** — Where a decision has a machine-readable specification, its implementation MUST be verified against that specification by derived tests or parity validation.
- **AGT-5** — A generic rules engine MUST NOT be introduced without a revision of this contract.
- **AGT-6** — Every actor MUST be classified as exactly one of HumanActor, RuntimeAgent, AutomationActor, or DevelopmentAgent, and the types MUST NOT be conflated.
- **AGT-7** — Execution type (human, AI, CLI, scheduler, worker, or internal application code) MUST NOT by itself confer authority.
- **AGT-8** — Privileged activity by any actor MUST pass, in order: identity or execution identity, capability, scope, command, domain invariants, transaction, audit.
- **AGT-9** — Each AutomationActor MUST act under a registered execution identity with an explicit capability set (see OQ-AGT-1; value Not yet verified).
- **AGT-10** — An actor MAY use a different transport than a human, but MUST cross the same authorization boundary, command boundary, domain invariants, transaction rules, and audit rules as a human performing the same command.
- **AGT-11** — A RuntimeAgent or AutomationActor MUST NOT receive direct privileged database access as a substitute for domain commands; the migration runner governed by C21 is the only exception, and only for schema migration.
- **AGT-12** — A RuntimeAgent MAY propose or attempt actions; whether an action is valid and authorized MUST be decided by Teach's deterministic logic, and agent output MUST NOT be accepted as authorization.
- **AGT-13** — Agentic judgment MUST be limited to proposal-type output; draft training content produced by an agent MUST pass C31 validation and approval before use.
- **AGT-14** — Audit records of actions by a RuntimeAgent or AutomationActor MUST record the actor type and execution identity.
- **AGT-15** — Runtime agents MUST NOT redefine identity, authorization, scope, transactions, state machines, idempotency, audit, or data ownership.
- **AGT-16** — Runtime agents MUST NOT be enabled until the deterministic paths they depend on are `active` and evidenced, and a revision of this contract defines AgentIdentity, AgentCapability, the tool/command boundary, agent decision evidence, human approval and escalation, and agent failure and recovery (see OQ-AGT-2; value Not yet verified).
- **AGT-17** — A DevelopmentAgent MUST NOT approve contracts (C00), MUST NOT introduce canonical semantics without an approved semantic change (C01), and its output MUST NOT count as independent verification of its own work (C51).

## 5. Acceptance Cases

| Case      | Proves         | Setup                                                                                                 | Expected                                                                                 |
| --------- | -------------- | ----------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| AGT-AC-1  | AGT-1          | Run the full acceptance suite with every runtime agent disabled                                       | All non-agent acceptance cases pass                                                      |
| AGT-AC-2  | AGT-2, AGT-3   | Architecture check: listed operations and decisions call no model or agent client                     | None found                                                                               |
| AGT-AC-3  | AGT-4          | Change a decision implementation without updating its specification                                   | Derived or parity tests fail                                                             |
| AGT-AC-4  | AGT-5          | Dependency review for rules-engine packages                                                           | Manual evidence: none without a contract revision                                        |
| AGT-AC-5  | AGT-6          | Actor registry validation                                                                             | Every actor has exactly one type                                                         |
| AGT-AC-6  | AGT-7, AGT-8   | Invoke a privileged command from a CLI and a worker with no execution identity or capability          | Denied; no side effect                                                                   |
| AGT-AC-7  | AGT-9          | Enumerate scheduled jobs, workers, and CLI commands that mutate state                                 | Each has a registered execution identity and capability set                              |
| AGT-AC-8  | AGT-10         | Invoke the same command through the HTTP route and through a job/CLI path in the authorization matrix | Identical authorization, invariant, transaction, and audit outcomes                      |
| AGT-AC-9  | AGT-11         | Inventory database credentials issued to non-human actors                                             | Only the migration runner holds schema privileges; no actor holds privileged data access |
| AGT-AC-10 | AGT-12, AGT-13 | Agent output asserts a learner is authorized or certified                                             | Teach ignores the assertion; outcome decided by deterministic checks                     |
| AGT-AC-11 | AGT-14         | Perform an audited command as an AutomationActor                                                      | Audit record carries actor type and execution identity                                   |
| AGT-AC-12 | AGT-15, AGT-16 | Configuration review before any runtime agent is enabled                                              | Manual evidence: contract revision and dependent `active` contracts recorded             |
| AGT-AC-13 | AGT-17         | Covered by SYS-AC-7, SEM-AC-9, and EVD-AC-7                                                           | See those acceptance cases                                                               |

## 6. Open Questions

| ID       | Question                                                                                                   | Blocks implementation | Affects |
| -------- | ---------------------------------------------------------------------------------------------------------- | --------------------- | ------- |
| OQ-AGT-1 | Where are AutomationActor execution identities and their capability sets registered?                       | No                    | AGT-9   |
| OQ-AGT-2 | What is the first runtime-agent use case, if any, that would trigger the revision of this contract?        | No                    | AGT-16  |
| OQ-AGT-3 | Which existing jobs, workers, and CLI commands (for example `pnpm cli`) carry forward as AutomationActors? | No                    | —       |

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

| Version | Date       | Change                                                                                                                                                                                          | By               |
| ------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- |
| 0.1.0   | 2026-10-03 | Initial proposed draft from the owner-supplied consolidated decisions (`source/2026-10-03-teach-rebuild-consolidated-decisions.md`). Not approved.                                              | Claude (drafter) |
| 0.2.0   | 2026-10-03 | Retargeted to the Teach v2 codebase: legacy `peteywee/teach` is reference only; anchors and paths no longer point into the legacy repository.                                                   | Claude (drafter) |
| 0.3.0   | 2026-10-03 | Anchored to `peteywee/teach-v2` branch `main` (owner-declared); the repository had no commits when cloned on 2026-10-03, so the anchor SHA stays Not yet verified.                              | Claude (drafter) |
| 1.0.0   | 2026-10-03 | Approved by the owner; status changed from `proposed` to `active`. Open questions remain open and block implementation of the requirements they affect (SYS-34) instead of blocking activation. | Claude (drafter) |
