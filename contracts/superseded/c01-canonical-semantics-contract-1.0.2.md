<!--tos-doc
{
  "doc_id": "TEACH-CON-C01",
  "class": "contract",
  "version": "1.0.2",
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
    "inheritance": "1.0.1 and 1.0.2 are non-normative governance/baseline cleanup patches; 1.0.0 owner approval remains controlling"
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
  "superseded_by": "TEACH-CON-C01@1.1.0",
  "depends_on": [
    "contracts/"
  ]
}
-->

# C01 — Canonical Semantics Contract

> Superseded by C01 version 1.1.0 on 2026-10-03. Preserved under SYS-21.

| Field              | Value                                                                                                                                                           |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Contract ID        | C01                                                                                                                                                             |
| Group              | C01 Canonical Semantics (Semantic Kernel, K00)                                                                                                                  |
| Governed by        | C00 System Authority                                                                                                                                            |
| Version            | 1.0.2                                                                                                                                                           |
| Status             | `superseded`                                                                                                                                                        |
| Owner              | Patrick Craven, Top Shelf Service LLC                                                                                                                           |
| Approved by        | Patrick Craven (owner), 2026-10-03 — approval instruction given in chat at 10:47 CDT; transcribed by Claude at the owner's direction — see `APPROVAL-RECORD.md` |
| Requirement prefix | `SEM`                                                                                                                                                           |
| Activation         | Required for the core rebuild                                                                                                                                   |
| Legacy lineage     | New. Also referred to as K00, the semantic kernel.                                                                                                              |
| Supersedes         | None                                                                                                                                                            |
| Superseded by      | None                                                                                                                                                            |
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
- Which capabilities exist and what they authorize (C14); how capability identifiers are split between C01 and C14 is open (see OQ-SEM-3; value Not yet verified)
- Persistence technology and migrations (C21)
- Actor trust rules (C02)

Related contracts: C00, C02, C11, C14, C21.

## 3. Definitions

| Term              | Meaning                                                                                                                                  |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Semantic registry | The single authoritative source of canonical concepts and their definitions (location and format: see OQ-SEM-1; value Not yet verified). |
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
- **SEM-11** — `inactive`, `deleted`, `offboarded`, `revoked`, and `expired` MUST remain distinct concepts and MUST NOT be used interchangeably in code, contracts, APIs, tests, or documentation (see OQ-SEM-2; value Not yet verified).
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

## 6. Open Questions

| ID       | Question                                                                                                                                                                                                                      | Blocks implementation | Affects |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------- | ------- |
| OQ-SEM-1 | Where does the semantic registry live (the decisions suggest a `kernel/` tree with manifest, entities, values, relationships, states, capabilities, commands, events, evidence) and in what machine-readable format?          | Yes                   | —       |
| OQ-SEM-2 | The decisions give IdentityStatus as ACTIVE, INACTIVE, DELETED, and also require `offboarded` to stay distinct. Is offboarded an IdentityStatus value, or the `IdentityOffboarded` event whose result is INACTIVE or DELETED? | Yes                   | SEM-11  |
| OQ-SEM-3 | Capability identifiers appear in both the kernel concept list and C14's vocabulary. Does C01 own capability identifiers while C14 owns what they authorize, or does C14 own capabilities entirely?                            | Yes                   | —       |
| OQ-SEM-4 | Is the Membership lifecycle ACTIVE → INACTIVE → REVOKED (given as an example) the approved state machine?                                                                                                                     | No                    | —       |
| OQ-SEM-5 | Who approves the output of domain discovery that turns candidate entries into approved entries?                                                                                                                               | No                    | —       |

## 7. Verification Status

| Item                         | State                    | Detail                                                                                                                                                                                                                                                |
| ---------------------------- | ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Target codebase              | verified (limited scope) | `peteywee/teach-v2`, default branch `main` (owner-declared). Cloned 2026-10-03: repository exists and has no commits, so no SHA is anchored. Teach v2 is a new build on these contracts (owner statement, 2026-10-03).                                |
| Legacy repository consulted  | reference only           | `peteywee/teach` `work/TR-0010-production-cutover` at `79fdce5cc3b2` (`main` at `99162f17eace`), read 2026-10-03 for lineage: legacy domain contract JSON files and the Gate A decision record. Legacy code was not inspected and does not govern v2. |
| Implementation conformance   | unknown                  | Not yet verified. No v2 implementation was inspected; the owner states v2 is yet to be built.                                                                                                                                                         |
| Acceptance cases implemented | unknown                  | Not yet verified. No mapping between repository tests and these IDs has been established.                                                                                                                                                             |
| Blocking open questions      | 3 open                   | Contract is `active` with these open. Each blocks implementation of the requirements it affects beyond fail-closed behavior until decided (SYS-34).                                                                                                   |
| Owner approval               | declared                 | Approved by the owner on 2026-10-03; recorded in `APPROVAL-RECORD.md`. Initial owner-approval baseline is commit `2c9b1c849a520ba817efc91150be9a37797f4238`; this 1.0.2 revision is tracked by Git history.                                                                     |
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
