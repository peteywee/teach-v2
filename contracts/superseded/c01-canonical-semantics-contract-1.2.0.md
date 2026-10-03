<!--tos-doc
{
  "doc_id": "TEACH-CON-C01",
  "class": "contract",
  "version": "1.2.0",
  "claims_truth_state": "declared",
  "status": "superseded",
  "owner": "Patrick Craven, Top Shelf Service LLC",
  "created_on": "2026-10-03",
  "updated_on": "2026-10-03",
  "effective_on": "2026-10-03",
  "approval": {
    "state": "approved",
    "approved_version": "1.2.0",
    "approved_on": "2026-10-03",
    "record": "contracts/APPROVAL-RECORD.md",
    "basis": "Owner explicitly approved C01 1.2.0 through domain-ownership approval token; GitHub issue #2"
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
  "supersedes": ["TEACH-CON-C01@1.1.0"],
  "superseded_by": "TEACH-CON-C01@1.3.0",
  "depends_on": [
    "contracts/"
  ]
}
-->

# C01 — Canonical Semantics Contract

> Superseded by C01 version 1.3.0 on 2026-10-03. Preserved under SYS-21.

| Field              | Value                                                                                                                                                           |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Contract ID        | C01                                                                                                                                                             |
| Group              | C01 Canonical Semantics (Semantic Kernel, K00)                                                                                                                  |
| Governed by        | C00 System Authority                                                                                                                                            |
| Version            | 1.2.0                                                                                                                                                           |
| Status             | `superseded`                                                                                                                                                        |
| Owner              | Patrick Craven, Top Shelf Service LLC                                                                                                                           |
| Approved by        | Patrick Craven (owner), 2026-10-03 — C01 1.2.0 explicit domain-ownership approval; see `APPROVAL-RECORD.md` and GitHub issue #2 |
| Requirement prefix | `SEM`                                                                                                                                                           |
| Activation         | Required for the core rebuild                                                                                                                                   |
| Legacy lineage     | New. Also referred to as K00, the semantic kernel.                                                                                                              |
| Supersedes         | C01 1.1.0                                                                                                                                                            |
| Superseded by      | C01 1.3.0 |
| Created            | 2026-10-03                                                                                                                                                      |
| Last updated       | 2026-10-03                                                                                                                                                      |

## 1. Purpose and Failure Prevented

The Gate A record lists `tenantId` used as an alias for organization in the legacy codebase. That is the small version of this failure. The large version: one module calls a user "deactivated," another "offboarded," a third "deleted," and a query that filters `status != 'deleted'` lets an INACTIVE identity straight through. A development agent asked to add a feature invents `disabledAt` because it could not find the existing term. Every word looked reasonable on its own, and together they made authority checks mean different things in different files. This contract gives every concept one name, one meaning, and one owner, and makes inventing a new one a decision instead of a keystroke.

## 2. Scope

This contract owns:

- The canonical semantic registry: concepts, canonical identifiers, value objects, entities, relationships, states and state machines, commands, and events
- The separation between a concept's meaning and its SQL, TypeScript, API, and UI representations
- The Domain Ownership Map (which domain owns each authoritative concept)
- The semantic change procedure and alias rules
- Rules for artifacts generated from the registry

This contract does not own:

- The behavior rules of each domain (C11–C63)
- Canonical capability identifier registration and naming (C01); C14 owns capability authorization semantics, assignment, scope, evaluation, and denial behavior
- Persistence technology and migrations (C21)
- Actor trust rules (C02)

Related contracts: C00, C02, C11, C14, C21.

## 3. Definitions

| Term              | Meaning                                                                                                                                  |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Semantic registry | The single authoritative source under `kernel/`; canonical machine-readable source files use JSON and are validated against the kernel schema and deterministic validator. |
| Concept           | A named unit of meaning: an entity, value object, relationship, state, capability, command, or event.                                    |
| Entity            | A concept with stable identity, mutable state, a defined owner, and a defined lifecycle.                                                 |
| Value object      | An immutable value with meaning but no independent business lifecycle (for example `EmailAddress`, `IdempotencyKey`).                    |
| Representation    | How a concept appears in a technology: a column, a TypeScript type, a JSON key, a UI label.                                              |
| Semantic change   | Any addition, removal, or change of meaning of a concept, identifier, state, relationship, capability, command, or event.                |
| Owning domain     | The single domain module permitted to change a concept's authoritative state.                                                            |

### Initial candidate vocabulary (declared, not final)

The consolidated decisions name the following as initial candidates. The decisions also state that the exact final kernel is established during domain discovery, so none of these is approved until the registry marks it approved (see **SEM-2**).

| Kind             | Candidates                                                                                                                                                                                                                                                                                                                                                                    |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Concepts         | Identity, Credential, ApplicationSession, Organization, Location, Membership, Capability, Entitlement, ContentPack, ContentBlock, Assignment, LearningSession, ProgressEvent, LearnerState, Certification, AuditEvent, LifecycleEvent, IdempotencyKey, RequestId, Evidence                                                                                                    |
| Identifiers      | IdentityId, OrganizationId, LocationId, MembershipId, ApplicationSessionId, ContentPackId, LearningSessionId, CertificationId, CapabilityId, RequestId, IdempotencyKey                                                                                                                                                                                                        |
| Value objects    | OrganizationId, IdentityId, LocationId, CapabilityId, ContentPackId, ContentVersion, LearningSessionId, EmailAddress, IdempotencyKey, RequestId, Timestamp                                                                                                                                                                                                                    |
| Canonical values | IdentityStatus: ACTIVE, INACTIVE, DELETED · ApplicationSessionStatus: ACTIVE, EXPIRED, REVOKED · EvidenceState: PROVEN, BLOCKED, UNKNOWN, CONTRADICTORY · Membership lifecycle (example): ACTIVE, INACTIVE, REVOKED                                                                                                                                                           |
| Commands         | AuthenticateIdentity, CreateApplicationSession, RevokeApplicationSession, CreateMembership, DeactivateMembership, AssignContent, StartLearningSession, RecordProgressEvent, CompleteLearningSession, IssueCertification, RevokeCertification, OffboardIdentity                                                                                                                |
| Events           | ApplicationSessionCreated, ApplicationSessionRevoked, MembershipCreated, MembershipDeactivated, ContentAssigned, LearningSessionStarted, ProgressRecorded, LearningSessionCompleted, CertificationIssued, CertificationRevoked, IdentityOffboarded                                                                                                                            |
| Domains          | Identity (Identity, Credential, ApplicationSession, Invitation, SetupToken) · Organization/Authority (Organization, Location, Membership, Capability, Entitlement) · Content (ContentPack, ContentBlock, ContentVersion) · Learning (Assignment, LearningSession, ProgressEvent, LearnerState) · Certification (Certification) · Audit/Lifecycle (AuditEvent, LifecycleEvent) |

Registering an event is not a commitment to event sourcing; events are canonical facts where event semantics are useful.

## 4. Requirements

The keywords MUST, MUST NOT, SHOULD, and MAY are used in the RFC 2119 sense. Requirement IDs are stable and MUST NOT be renumbered or reused.

- **SEM-1** — Exactly one semantic registry MUST exist, and it MUST be the source of truth for canonical concept names, identifiers, values, relationships, states, commands, and events.
- **SEM-2** — Each registry entry MUST be marked `candidate` or `approved`; a `candidate` entry MUST NOT be relied on by an `active` contract or by merged implementation.
- **SEM-3** — A concept MUST become `approved` only through an approved semantic change.
- **SEM-4** — Each concept entry MUST record: definition, identifier, relationships, owning domain, lifecycle (where it has one), and authority implications.
- **SEM-5** — A concept's meaning MUST be defined independently of its SQL, TypeScript, API, and UI representations.
- **SEM-6** — Each representation of a canonical concept MUST map to exactly one canonical concept.
- **SEM-7** — Changing a representation (column, JSON key, package, or framework) MUST NOT change a concept's meaning; a change of meaning MUST be a semantic change.
- **SEM-8** — A concept's definition and identity MUST NOT change within a contract version; an entity's state MAY change.
- **SEM-9** — Each entity MUST have exactly one canonical identifier type.
- **SEM-10** — Every canonical state or status MUST be drawn from a registered, enumerated set of values; free-form strings MUST NOT represent canonical state.
- **SEM-11** — `inactive`, `deleted`, `offboarded`, `revoked`, and `expired` MUST remain distinct concepts and MUST NOT be used interchangeably in code, contracts, APIs, tests, or documentation. `offboarded` MUST describe a lifecycle operation/event and MUST NOT be an `IdentityStatus` value.
- **SEM-12** — Developers and development agents MUST NOT introduce an entity, identifier, state, relationship, capability, command, or event that is absent from the registry without an approved semantic change.
- **SEM-13** — A proposed semantic change MUST state which existing concepts were considered and why none applies.
- **SEM-14** — A deprecated alias MAY map to a canonical term; each alias MUST map to exactly one canonical term and MUST be registered as compatibility code under C00.
- **SEM-15** — An ambiguous term MUST NOT be used where the ambiguity affects correctness, authority, persistence, or an interface.
- **SEM-16** — Immutable values that carry validation or meaning SHOULD be modeled as value objects; a value object MUST NOT have an independent business lifecycle.
- **SEM-17** — Each entity MUST have stable identity, exactly one owning domain, and a defined lifecycle.
- **SEM-18** — Each relationship MUST be registered with what it connects, what it may scope, what it enables, and what it does not grant.
- **SEM-19** — Every authoritative concept MUST have exactly one owning domain in the Domain Ownership Map.
- **SEM-20** — A domain MUST NOT modify state owned by another domain directly; it MUST request the change through the owning domain's commands.
- **SEM-21** — Every entity with lifecycle transitions MUST have an explicit state machine; a transition absent from it MUST be rejected in the domain layer, and persisted values MUST be constrained to the canonical set.
- **SEM-22** — The command vocabulary MUST be finite and registered; every state-changing operation MUST be a registered command.
- **SEM-23** — Every business event the system emits MUST be a registered canonical event.
- **SEM-24** — Artifacts generated from the registry (types, constants, documentation, AI context, validation rules, decision-test fixtures, architecture checks) MUST derive only from registry content and MUST NOT introduce semantics absent from it.
- **SEM-25** — Drift between generated artifacts and the registry MUST fail CI.
- **SEM-26** — Persistence models MUST be derived from registered concepts, ownership, relationships, states, invariants, and commands; a table or column MUST NOT introduce a canonical concept by itself.
- **SEM-27** — The canonical semantic registry MUST live under `kernel/`. Canonical machine-readable source files MUST use JSON. Structural validation MUST be deterministic and dependency-free at bootstrap; human-readable views MAY be generated from the canonical JSON.
- **SEM-28** — C01 MUST own registration and canonical naming of capability identifiers. C14 MUST own what each capability authorizes, who or what may receive it, applicable scope, evaluation semantics, and denial behavior.
- **SEM-29** — `IdentityOffboarded` MUST be represented as a lifecycle event associated with the offboarding operation and MUST NOT be a member of `IdentityStatus`. Offboarding MUST result only in canonical identity/access state transitions defined by the owning domain contracts.
- **SEM-30** — Promotion of a semantic registry entry from `candidate` to `approved` MUST require an explicit owner approval naming the semantic revision or approval package; an AI assistant, development agent, runtime agent, or automation actor MUST NOT approve promotion on the owner's behalf.
- **SEM-31** — Exactly one `active` Domain Ownership Map MUST define the owning semantic domain for every authoritative concept. Changing an approved ownership assignment MUST be treated as a semantic change and MUST identify every affected domain contract.

## 5. Acceptance Cases

| Case      | Proves                        | Setup                                                                                                                    | Expected                                                                                            |
| --------- | ----------------------------- | ------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------- |
| SEM-AC-1  | SEM-1                         | Repository scan for parallel vocabularies (enum files, constant maps) defining canonical values outside generated output | None found                                                                                          |
| SEM-AC-2  | SEM-2, SEM-3                  | Registry validation: an `active` contract or merged code references a `candidate` entry                                  | Check fails                                                                                         |
| SEM-AC-3  | SEM-4, SEM-17, SEM-18, SEM-19 | Registry schema validation                                                                                               | Every entry has all required fields; every concept names exactly one owning domain                  |
| SEM-AC-4  | SEM-5, SEM-6                  | Representation map check: each column, TS type, and API field tagged as canonical maps to one registry concept           | Unmapped or multiply-mapped representations fail                                                    |
| SEM-AC-5  | SEM-7, SEM-8                  | PR renames a column without a registry change                                                                            | Manual evidence: review confirms meaning unchanged; any meaning change has a semantic change record |
| SEM-AC-6  | SEM-9                         | Registry validation                                                                                                      | Each entity has one identifier type                                                                 |
| SEM-AC-7  | SEM-10, SEM-21                | Attempt to persist a non-canonical status string and an unlisted transition                                              | Both rejected (domain layer and database constraint)                                                |
| SEM-AC-8  | SEM-11, SEM-15                | Lint for the five lifecycle terms used as synonyms, and for registered ambiguous terms                                   | Violations fail                                                                                     |
| SEM-AC-9  | SEM-12, SEM-13                | PR introduces a new status value or event name absent from the registry                                                  | CI fails until a semantic change record exists                                                      |
| SEM-AC-10 | SEM-14                        | Alias map validation                                                                                                     | Each alias maps to one term and appears in the compatibility register                               |
| SEM-AC-11 | SEM-16                        | Review of value-object definitions                                                                                       | Manual evidence: none carries its own lifecycle                                                     |
| SEM-AC-12 | SEM-20                        | Architecture check: domain modules writing tables owned by another domain                                                | None found                                                                                          |
| SEM-AC-13 | SEM-22, SEM-23                | Enumerate state-changing operations and emitted events                                                                   | Each maps to a registered command or event                                                          |
| SEM-AC-14 | SEM-24, SEM-25                | Edit generated output by hand; separately change the registry without regenerating                                       | Both fail CI                                                                                        |
| SEM-AC-15 | SEM-26                        | Schema review: each table and column traces to a registered concept                                                      | Manual evidence plus check: untraced schema objects fail                                            |
| SEM-AC-16 | SEM-27                        | Validate repository kernel layout and parse every canonical source file                                                    | `kernel/` contains the registered JSON files; schema and deterministic validator pass                |
| SEM-AC-17 | SEM-28                        | Register a capability identifier, then inspect C14 authorization metadata                                                   | Identifier ownership is C01; authorization meaning and scope are C14                                |
| SEM-AC-18 | SEM-11, SEM-29                | Inspect IdentityStatus and lifecycle events                                                                                 | OFFBOARDED is absent from IdentityStatus; IdentityOffboarded exists as a canonical event             |
| SEM-AC-19 | SEM-30                        | Attempt candidate-to-approved promotion without owner approval                                                             | Promotion is rejected; agent/automation approval is insufficient                                    |
| SEM-AC-20 | SEM-19, SEM-31                | Validate active Domain Ownership Map against K00                                                                            | Each ownership assignment has exactly one approved owner                                            |

## 6. Open Questions

| ID       | Status   | Decision / Question | Blocks implementation | Affects |
| -------- | -------- | ------------------- | --------------------- | ------- |
| OQ-SEM-1 | Resolved | Canonical semantic registry lives under `kernel/`. Canonical source format is JSON. JSON Schema plus the dependency-free kernel validator enforce structure; Markdown views may be generated. Decision approved 2026-10-03; GitHub issue #1. | No | SEM-27 |
| OQ-SEM-2 | Resolved | `OFFBOARDED` is not an `IdentityStatus`. `IdentityStatus` remains `ACTIVE`, `INACTIVE`, `DELETED`; `IdentityOffboarded` is the canonical lifecycle event for the offboarding operation. Decision approved 2026-10-03; GitHub issue #1. | No | SEM-11, SEM-29 |
| OQ-SEM-3 | Resolved | C01 owns capability identifier registration and canonical naming. C14 owns authorization meaning, assignment, scope, evaluation, and denial semantics. Decision approved 2026-10-03; GitHub issue #1. | No | SEM-28 |
| OQ-SEM-4 | Open     | Is the Membership lifecycle ACTIVE → INACTIVE → REVOKED the approved state machine? | No | — |
| OQ-SEM-5 | Resolved | Only Patrick Craven, as owner, may approve promotion of `candidate` entries to `approved`; an explicit approval token naming the revision/package is a valid approval record. Decision approved 2026-10-03; GitHub issue #2. | No | SEM-30 |

## 7. Verification Status

| Item                         | State                    | Detail                                                                                                                                                                                                                                                |
| ---------------------------- | ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Target codebase              | verified (limited scope) | `peteywee/teach-v2` default branch `main`, verified through governance baseline commit `292e8da9123987e9d94f09669c7bc6b6d43c4320` on 2026-10-03. The repository contains the contract/governance foundation; application implementation remains not yet built.                                |
| Legacy repository consulted  | reference only           | `peteywee/teach` `work/TR-0010-production-cutover` at `79fdce5cc3b2` (`main` at `99162f17eace`), read 2026-10-03 for lineage: legacy domain contract JSON files and the Gate A decision record. Legacy code was not inspected and does not govern v2. |
| Implementation conformance   | unknown                  | Not yet verified. No v2 implementation was inspected; the owner states v2 is yet to be built.                                                                                                                                                         |
| Acceptance cases implemented | unknown                  | Not yet verified. No mapping between repository tests and these IDs has been established.                                                                                                                                                             |
| Blocking open questions      | 0 open                   | OQ-SEM-1/2/3/5 are resolved. OQ-SEM-4 remains open and non-blocking. |
| Owner approval               | declared                 | C01 1.2.0 approved by Patrick Craven on 2026-10-03 through explicit domain-ownership approval; GitHub issue #2. |
| Independent review           | not performed            | Drafted and self-checked by Claude against the contract-authoring checklist only.                                                                                                                                                                     |
| Source of intent             | declared                 | Owner-supplied rebuild proposal (`source/2026-10-03-teach-v2-contract-hierarchy-proposal.md`), consolidated decisions (`source/2026-10-03-teach-rebuild-consolidated-decisions.md`), and legacy Gate A owner decisions (2026-07-22) where cited.      |

## 8. Change Log

| Version | Date       | Change                                                                                                                                                                                          | By               |
| ------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- |
| 0.1.0   | 2026-10-03 | Initial proposed draft from the owner-supplied consolidated decisions (`source/2026-10-03-teach-rebuild-consolidated-decisions.md`). Not approved.                                              | Claude (drafter) |
| 0.2.0   | 2026-10-03 | Retargeted to the Teach v2 codebase: legacy `peteywee/teach` is reference only; anchors and paths no longer point into the legacy repository. Failure story labels the legacy codebase.         | Claude (drafter) |
| 0.3.0   | 2026-10-03 | Anchored to `peteywee/teach-v2` branch `main` (owner-declared); the repository had no commits when cloned on 2026-10-03, so the anchor SHA stays Not yet verified.                              | Claude (drafter) |
| 1.0.0   | 2026-10-03 | Approved by the owner; status changed from `proposed` to `active`. Open questions remain open and block implementation of the requirements they affect (SYS-34) instead of blocking activation. | Claude (drafter) |
| 1.0.1   | 2026-10-03 | Non-normative document-governance metadata/provenance normalization; 1.0.0 owner approval remained controlling. | ChatGPT (governance) |
| 1.0.2   | 2026-10-03 | Non-normative baseline cleanup: corrected stale current-status provenance after the contract spine was committed; no behavioral requirement changed. | ChatGPT (governance) |
| 1.1.0   | 2026-10-03 | Normative K00 bootstrap revision: resolved OQ-SEM-1/2/3; fixed kernel location/JSON format, offboarding semantics, and C01/C14 capability ownership; added SEM-27–SEM-29 and SEM-AC-16–18. GitHub issue #1. | Patrick Craven (owner approval via K00 bootstrap) |
| 1.2.0   | 2026-10-03 | Approved first active Domain Ownership Map; resolved OQ-SEM-5; added SEM-30/31 and SEM-AC-19/20. K00 entries remain candidate. GitHub issue #2. | Patrick Craven (owner approval) |
