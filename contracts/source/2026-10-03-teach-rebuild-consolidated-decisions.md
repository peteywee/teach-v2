<!-- Non-normative source record. Owner-supplied consolidated decisions provided to Claude on 2026-10-03, preserved verbatim except for whitespace and table formatting normalized by Prettier. The contracts in the parent directory are normative; this file is not. -->

# Teach Rebuild — Consolidated Decisions

## 0. Rebuild Strategy

**Decision:** Teach will be rebuilt as a **controlled, contract-driven rebuild**, not patched indefinitely and not rewritten blindly from scratch.

The current Teach repository remains a **reference/evidence source** for proven behavior, tests, migrations, failure modes, domain knowledge, security lessons, and reusable implementation.

No existing implementation is automatically carried forward. Reuse requires an identified contract, owner, and purpose.

The new system will be built in layers from a small authoritative semantic foundation.

---

# 1. Governing Development Model

Teach will use:

```text
Contract-driven
+ Semantic-kernel-driven
+ Domain-oriented
+ Decision-explicit
+ Modular-monolith architecture
+ Vertical-slice delivery
+ Agile execution
+ Evidence-gated completion
```

Agile governs execution and delivery.

Object-oriented programming is **not** the architecture.

Programming style is selected according to the domain behavior:

```text
Stateful domain behavior
→ state machines / objects where appropriate

Deterministic rules
→ pure functions / policies

Use-case coordination
→ application services

Validated concepts
→ schemas / value objects

Persistence
→ repositories / adapters

Presentation
→ UI components
```

---

# 2. Constitutional Authority

## C00 — System Authority

C00 is the highest governing contract.

The following rules are constitutional:

```text
Meaning is explicit.

Authority is explicit.

Every mutable fact has one authoritative owner.

Unknown authority fails closed.

Unknown evidence remains UNKNOWN.

Ambiguous external side effects require reconciliation before retry.

Implementation cannot silently redefine contracts.

Implementation cannot silently redefine canonical vocabulary.

Lower-level contracts cannot weaken higher-level contracts.

Contracts are versioned authorities.

An accepted contract governs until explicitly superseded.

Contract changes precede implementation changes that depend on them.

Production truth requires exact code,
exact environment,
and authoritative runtime evidence.

CI success alone is not production proof.
```

Contracts are **not permanently immutable**.

They are versioned and change-controlled.

The change sequence is:

```text
Problem discovered
↓
Contract change proposed
↓
Impact analyzed
↓
New contract version approved
↓
Implementation changed
↓
Evidence regenerated
```

---

# 3. Semantic Kernel

## K00 / C01 — Canonical Vocabulary & Semantic Registry

Teach will have a small authoritative semantic kernel.

It defines the canonical vocabulary used by:

```text
developers
AI development agents
runtime agents
contracts
domain models
decision trees
APIs
tests
documentation
generated types
```

Canonical concepts will be deliberately limited.

Initial core concept classes include:

```text
Identity
Credential
ApplicationSession

Organization
Location
Membership
Capability
Entitlement

ContentPack
ContentBlock
Assignment

LearningSession
ProgressEvent
LearnerState

Certification

AuditEvent
LifecycleEvent

IdempotencyKey
RequestId

Evidence
```

The exact final kernel is established during domain discovery.

---

# 4. Semantic Identity vs Representation

A concept's **meaning** is authoritative.

Its technical representation is separate.

Example:

```text
Canonical concept:
Organization

Semantic identifier:
OrganizationId

Possible representations:

PostgreSQL
organizations.id
organization_id

TypeScript
Organization
organizationId

JSON/API
organizationId
```

Changing a database column, JSON key, package, or framework does not redefine the concept.

The semantic kernel therefore separates:

```text
definition
identity
relationships
ownership
lifecycle
authority implications
```

from:

```text
SQL representation
TypeScript representation
API representation
UI representation
```

---

# 5. Canonical Keys and Values

The semantic registry will define canonical identifiers and values.

Examples:

```text
IdentityId
OrganizationId
LocationId
MembershipId
ApplicationSessionId
ContentPackId
LearningSessionId
CertificationId
RequestId
IdempotencyKey
```

States will use explicit canonical values.

Example:

```text
IdentityStatus

ACTIVE
INACTIVE
DELETED
```

Example:

```text
ApplicationSessionStatus

ACTIVE
EXPIRED
REVOKED
```

Example:

```text
EvidenceState

PROVEN
BLOCKED
UNKNOWN
CONTRADICTORY
```

Synonyms that represent different business meanings will not be casually interchanged.

For example:

```text
inactive
deleted
offboarded
revoked
expired
```

remain distinct concepts.

---

# 6. Semantic Drift Rules

AI agents and developers may not silently invent domain terminology.

If implementation requires a new:

```text
entity
identifier
state
relationship
capability
command
event
```

and it does not exist in the semantic model, that is treated as a **semantic change**, not merely a coding choice.

The expected behavior is:

```text
unknown concept
↓
search canonical vocabulary
↓
determine whether existing concept applies
↓
if not:
propose semantic/domain change
↓
approve change
↓
implement
```

Deprecated aliases may map to canonical terms.

Ambiguous terms are prohibited where ambiguity affects correctness, authority, persistence, or interfaces.

---

# 7. Immutable Meaning vs Mutable State

The definition and identity of a concept are stable within a contract version.

The state of an entity may change.

Example:

```text
Membership
```

has a stable semantic definition.

Its lifecycle may change:

```text
ACTIVE
↓
INACTIVE
↓
REVOKED
```

Therefore Teach distinguishes:

```text
immutable semantic definition
```

from:

```text
mutable domain state
```

---

# 8. Value Objects

Immutable values will be explicitly modeled where useful.

Examples:

```text
OrganizationId
IdentityId
LocationId
CapabilityId
ContentPackId
ContentVersion
LearningSessionId
EmailAddress
IdempotencyKey
RequestId
Timestamp
```

Value objects have meaning but no independent business lifecycle.

---

# 9. Domain Entities

Entities possess:

```text
stable identity
+
mutable state
+
defined ownership
+
defined lifecycle
```

Expected core entities include:

```text
Identity
Organization
Location
Membership
ApplicationSession
ContentPack
Assignment
LearningSession
Certification
```

---

# 10. Relationships Are Explicit

Relationships will be modeled as semantic concepts rather than inferred from arbitrary foreign keys.

Example:

```text
Identity
  ↓
Membership
  ↓
Organization
  ↓
Location
```

A relationship must specify what it does and does not imply.

Example:

```text
Membership

connects:
Identity → Organization

may scope:
Location

enables:
capability resolution

does not itself grant:
capability
entitlement
manager authority
```

---

# 11. Domain Ownership Map

After the semantic kernel, Teach will define a Domain Ownership Map.

Every authoritative concept gets one owning domain.

Initial expected boundaries:

```text
Identity
├── Identity
├── Credential
├── ApplicationSession
├── Invitation
└── SetupToken

Organization / Authority
├── Organization
├── Location
├── Membership
├── Capability
└── Entitlement

Content
├── ContentPack
├── ContentBlock
└── ContentVersion

Learning
├── Assignment
├── LearningSession
├── ProgressEvent
└── LearnerState

Certification
└── Certification

Audit / Lifecycle
├── AuditEvent
└── LifecycleEvent
```

One mutable fact has **one authoritative owner**.

Other domains reference or request behavior from the owning domain rather than modifying that state directly.

---

# 12. Runtime Agents Are Optional

## C02 — Automation & Agent Authority

Teach must remain correct with:

```text
ZERO runtime AI agents
```

Runtime AI is not foundational infrastructure.

Core correctness is deterministic.

This includes:

```text
authentication
authorization
tenant isolation
session validity
database integrity
transactions
idempotency
credential issuance
offboarding
certification integrity
payment authority
data deletion
audit requirements
retry safety
```

---

# 13. Actor Types

Teach explicitly distinguishes:

```text
HumanActor

RuntimeAgent

AutomationActor

DevelopmentAgent
```

A DevelopmentAgent helps build or maintain Teach.

A RuntimeAgent operates as part of the Teach product.

An AutomationActor is deterministic software such as:

```text
scheduler
worker
background job
CLI
deployment automation
```

These concepts will not be conflated.

---

# 14. No Actor Is Automatically Trusted

Human, AI, CLI, scheduler, worker, or internal application code does not receive authority merely because of its execution type.

Privileged activity follows:

```text
Actor
↓
Identity / execution identity
↓
Capability
↓
Scope
↓
Command
↓
Domain invariant
↓
Transaction
↓
Audit
```

---

# 15. Agent Transport Is Not the Security Boundary

A future agent does **not** have to use the exact same HTTP endpoint as a human.

Different actors may use different transports.

They must cross the same:

```text
authorization boundary
command boundary
domain invariants
transaction rules
audit rules
```

No runtime agent receives direct privileged database access as a substitute for domain commands.

---

# 16. Deterministic vs Agentic Logic

Teach logic is divided into three categories.

### Deterministic invariants

Never delegated to AI.

```text
authentication
authorization
scope
tenant isolation
database constraints
transactional guarantees
idempotency
credential validity
offboarding
audit requirements
```

### Deterministic business decisions

Implemented through explicit decision logic.

Examples:

```text
CanStartLearningSession
CanViewLearner
CanIssueCertification
CanAssignContent
CanRetryOperation
IsVerificationComplete
```

### Agentic judgment

May be added later for activities such as:

```text
coaching suggestions
content recommendations
explanations
summaries
draft training content
pattern identification
action-plan suggestions
```

Agents may decide what to **propose or attempt**.

Teach determines whether the action is valid and authorized.

---

# 17. Contract Hierarchy

The current intended contract hierarchy is:

```text
C00 SYSTEM AUTHORITY

C01 CANONICAL SEMANTICS

C02 AUTOMATION & AGENT AUTHORITY

C10 TRUST & SECURITY
├── C11 Identity & Credentials
├── C12 Application Sessions
├── C13 Tenancy & Membership
├── C14 Authorization & Capabilities
└── C15 Data Isolation & Privacy

C20 DATA CORRECTNESS
├── C21 Database & Migration
├── C22 Transactions / Idempotency / Reconciliation
└── C23 Audit & Lifecycle

C30 PRODUCT SEMANTICS
├── C31 Content & Teaching Engine
├── C32 Learning Sessions & Progress
├── C33 Manager Operations
└── C34 Certification & Credentials

C40 APPLICATION BOUNDARIES
├── C41 Application / Command / API Boundary
└── C42 Web Client Boundary

C50 PRODUCTION PROOF
├── C51 Verification & Evidence
├── C52 Deployment / Release / Recovery
└── C53 Observability

OPTIONAL FEATURE CONTRACTS
├── C61 Analytics
├── C62 PWA / Offline
└── C63 Self-Service Billing
```

---

# 18. Trust and Security Decisions

## C11 Identity & Credentials

Identity owns:

```text
identity
credentials
OAuth identity
invitations
setup tokens
reset tokens
identity lifecycle
```

Rules include:

```text
credentials do not determine authorization

reusable secrets are securely hashed

setup/reset/invitation tokens are:
random
short-lived
single-use
revocable
hashed at rest

inactive/deleted identity cannot authenticate

managers cannot know reusable employee credentials

OAuth linking cannot silently create duplicate application identities

identity lifecycle changes are auditable

offboarding is idempotent
```

---

# 19. Session Decisions

## C12 Application Sessions

Teach uses one application-session model.

Browser authentication uses:

```text
opaque session credential
+
Secure HttpOnly cookie
```

Rules:

```text
no authentication credential in localStorage

server stores only verifier/hash

sessions have explicit:
issuance
expiry
revocation
last-use semantics

logout revokes server session

identity lifecycle can revoke sessions

expired/revoked session → 401

browser cannot manufacture:
role
organization
capability
scope
```

---

# 20. Tenancy Decisions

## C13 Tenancy & Membership

```text
Organization
= primary customer/security boundary

Location
= workplace scope beneath Organization
```

Database-current membership is authoritative.

Client-provided values do not establish tenant authority.

This includes:

```text
request body
query parameters
frontend state
editable metadata
stale token claims
```

Rules:

```text
zero matching scope → fail closed

ambiguous scope → fail closed

wrong organization → fail closed

wrong location → fail closed

inactive/deleted membership → fail closed

reporting relationship can narrow scope
but cannot grant authority
```

---

# 21. Authorization Decisions

## C14 Authorization & Capabilities

Every protected operation has exactly one registered authorization definition.

Roles are compatibility/convenience bundles.

Capabilities are the actual action vocabulary.

Entitlements are separate from capabilities.

Authorization evaluates:

```text
identity
↓
membership
↓
organization/location scope
↓
capability
↓
target
↓
entitlement when required
```

Canonical failure behavior:

```text
missing/invalid session
→ 401

authenticated but missing authority
→ 403

wrong/out-of-scope target
→ non-disclosing 404
```

UI hiding does not provide security.

---

# 22. Privacy and Isolation

## C15 Data Isolation & Privacy

Rules:

```text
every protected record has explicit ownership

tenant isolation is enforced server-side

sensitive queries include authoritative scope

private data cannot leak through:
errors
logs
analytics
browser storage
service workers
cache

data export has an implemented lifecycle

data deletion has an implemented lifecycle

retention documentation must match executable behavior

shared-device state cannot expose previous-user data
```

---

# 23. Database and Migration

## C21

Drizzle migrations are the application schema authority unless a later contract explicitly replaces that technology.

Rules:

```text
no db push against shared/production

schema changes require migrations

fresh migration must work

production upgrade migration must work

ordering deterministic

production data changes require backup evidence

restore capability must be proven

backend-owned tables inaccessible to browser roles

destructive migrations require explicit approval/recovery plan
```

PostgreSQL and Drizzle themselves remain replaceable architectural choices, not constitutional concepts.

---

# 24. Transactions, Idempotency and Reconciliation

## C22

Rules:

```text
operations that must succeed together
→ one transaction

retryable mutations
→ explicit idempotency strategy

same idempotent request
→ same final effect

retries cannot duplicate:
certifications
assignments
payments
seats
invitations
lifecycle events

ambiguous external result
→ reconcile before retry

webhooks assumed:
duplicate
out-of-order

partial/unknown result
must not be represented as success
```

---

# 25. Audit and Lifecycle

## C23

Audit is separate from analytics.

Security-sensitive mutations create immutable audit evidence.

Where required:

```text
business mutation
+
audit event
=
same transaction
```

Canonical audit information includes:

```text
actor
action
target
organization
location when applicable
request/idempotency identity
timestamp
result
```

Secrets and raw credentials are excluded.

Lifecycle history is append-oriented where history must be retained.

---

# 26. Product Domain Contracts

## C31 Content & Teaching Engine

Rules:

```text
one canonical content contract

versioned content schema

content validated before activation

legacy formats require explicit adapters

content version cannot silently change beneath evidence

engine behavior deterministic for equivalent inputs

engine runtime independent

assignment separate from content existence

possessing content ID does not authorize access
```

---

# 27. Learning Contract

## C32 Learning Sessions & Progress

Rules:

```text
learning session belongs to one learner

session uses authorized/assigned content

progress derives from canonical persisted state/events

challenge completion that claims progress must reach canonical persistence

mastery cannot exist only in UI/Zustand state

retry cannot duplicate progress

learner reads only own learner state

manager cannot manufacture progress

progress retains relationship to content version

XP/streak/rank shown as real only when derived from authoritative state
```

---

# 28. Manager Contract

## C33 Manager Operations

Rules:

```text
manager capability != reporting relationship

manager actions require capability

manager target must be within authorized organization/location

reporting relationships narrow learner visibility

manager reads canonical learning state

assignment operations are scoped and audited

offboarding uses canonical identity lifecycle

manager UI cannot invent authorization
```

---

# 29. Certification Contract

## C34 Certification & Credentials

Certification requires:

```text
active membership
+
active assignment
+
content version
+
criteria/checklist version
+
authorized observer
+
timestamp
+
evidence
+
audit
```

Rules:

```text
certification + required audit commit atomically

duplicate issue requests idempotent

revocation explicit

credential history retained

public verification explicitly declared public/private

verification exposes only intentionally public data
```

---

# 30. State Machines

Entities with meaningful lifecycle transitions will have explicit state machines.

Example:

```text
ApplicationSession

ACTIVE
├── expire → EXPIRED
└── revoke → REVOKED
```

Invalid transitions do not exist merely because application code can assign another string.

The Teaching/Kitchen engine may continue using explicit state-machine modeling where appropriate.

---

# 31. Invariants

Domain invariants are defined after concepts, ownership, relationships, and state are established.

Example:

```text
Membership

Identity must exist.
Organization must exist.
Location must belong to Organization.
Inactive Membership cannot produce effective authority.
```

Example:

```text
Certification

requires active membership
AND assignment
AND content version
AND criteria version
AND authorized observer
AND evidence
```

---

# 32. Decision Models

Detailed decision trees are built **after domain semantics and contracts are defined**.

Decision models may be represented machine-readably.

They may generate or drive:

```text
documentation
test cases
negative test cases
decision tables
AI context
parity validation
```

Teach will **not initially build a generic rules engine**.

Initial model:

```text
machine-readable decision specification
↓
explicit implementation
↓
generated/derived tests where practical
↓
parity validation
```

---

# 33. Commands

Teach will define a finite canonical command vocabulary.

Expected examples:

```text
AuthenticateIdentity
CreateApplicationSession
RevokeApplicationSession

CreateMembership
DeactivateMembership

AssignContent

StartLearningSession
RecordProgressEvent
CompleteLearningSession

IssueCertification
RevokeCertification

OffboardIdentity
```

Commands express intent.

HTTP routes, UI interactions, jobs, and future agents invoke commands rather than owning business rules.

---

# 34. Events

Canonical business events will be defined where useful.

Examples:

```text
ApplicationSessionCreated
ApplicationSessionRevoked

MembershipCreated
MembershipDeactivated

ContentAssigned

LearningSessionStarted
ProgressRecorded
LearningSessionCompleted

CertificationIssued
CertificationRevoked

IdentityOffboarded
```

This does **not** commit Teach to event sourcing.

Events are canonical facts where event semantics are useful.

---

# 35. Architecture

Teach will default to a **modular monolith**.

One backend deployment may contain multiple strongly bounded domain modules.

Expected module direction:

```text
identity
organization
authorization
content
learning
certification
audit
```

Domains communicate through explicit application/domain interfaces.

Cross-domain database modification is not used as an architectural shortcut.

Microservices are deferred unless evidence later justifies extraction.

---

# 36. Persistence Comes After Domain Semantics

The database model is derived from the domain requirements.

Order:

```text
concept
↓
ownership
↓
relationship
↓
state
↓
invariant
↓
command
↓
required persistence
```

Not:

```text
table
↓
API
↓
business meaning
```

---

# 37. Application Interfaces

## C41

Application commands/use cases form the important system boundary.

HTTP/API routes expose those capabilities but do not define their semantics.

Every external input is validated.

Protected operations use canonical authorization.

Client-provided scope does not become authoritative.

Stable errors and request correlation are required.

---

# 38. Web Client Boundary

## C42

The browser is not an authority.

Rules:

```text
authentication state comes from authoritative session

capability state comes from authoritative backend state

direct protected URLs are guarded

navigation hiding is not security

protected data is not silently replaced by mocks

logout clears user-specific client state

credentials are not persisted insecurely

writes go through application commands/API

loading/error/denied states are explicit
```

---

# 39. Verification

## C51

Canonical evidence states are:

```text
PROVEN
BLOCKED
UNKNOWN
CONTRADICTORY
```

Rules:

```text
UNKNOWN never becomes PASS

skipped check is not PASS

unit tests prove local behavior

contract tests prove boundaries

integration tests prove cooperation

negative tests prove forbidden behavior

E2E proves user journeys

tenant A/B tests prove isolation

runtime claims require runtime evidence

evidence belongs to exact candidate SHA/environment
```

---

# 40. Deployment and Release

## C52

A production candidate binds:

```text
source SHA
build identity
deployment identity
environment
database migration state
relevant configuration identity
```

Release requires the applicable:

```text
required tests
negative tests
migration verification
configuration validation
health/readiness
runtime smoke proof
canonical readback
rollback path
backup/restore evidence
```

Changing the candidate invalidates evidence that depends on the previous candidate.

---

# 41. Observability

## C53

Teach will have:

```text
request/correlation IDs
production error capture
health
readiness
actionable alerts
external-integration failure state
reconciliation visibility
```

Logs must not expose:

```text
passwords
session credentials
reset/setup tokens
unnecessary protected learner information
```

Observability does not influence authorization.

---

# 42. Optional Contracts

These are not foundational blockers unless product requirements promote them.

## C61 Analytics

Analytics is non-authoritative.

Analytics failure does not block learning.

Audit and analytics remain separate.

Demo/synthetic traffic can be distinguished from real customer metrics.

---

## C62 PWA / Offline

Initial default:

```text
safe offline shell allowed

private API caching denied by default

credential caching denied

offline writes denied by default
```

Offline write support requires its own explicit contract.

No generic offline mutation queue is carried forward automatically.

---

## C63 Self-Service Billing

Self-service billing is deferred from the initial core unless required.

The organization/billing ownership relationship must still be defined.

When enabled:

```text
server-derived organization scope
signature verification
durable provider event identity
idempotency
out-of-order reconciliation
explicit capability
payment/local-state reconciliation
```

---

# 43. Build Order

The agreed design/build sequence is:

```text
C00
System Authority
↓
K00 / C01
Semantic Kernel
↓
C02
Automation & Agent Authority
↓
Domain Discovery
↓
Domain Ownership Map
↓
Domain Contracts
↓
Relationships
↓
States / State Machines
↓
Invariants
↓
Decision Trees / Decision Tables
↓
Commands
↓
Events
↓
Architecture
↓
Application Interfaces
↓
Persistence Model
↓
Transport Interfaces
↓
Vertical Product Slices
↓
Implementation
↓
Verification
↓
Production Evidence
```

---

# 44. Repository Layering Direction

The architectural dependency direction will be:

```text
Constitution
↓
Semantic Kernel
↓
Contracts
↓
Domain
↓
Application
↓
Infrastructure
↓
Interfaces
```

Higher layers may constrain lower layers.

Lower layers do not redefine higher layers.

---

# 45. Initial Repository Concept

The rebuild should support an authoritative structure broadly like:

```text
kernel/
├── manifest
├── entities
├── values
├── relationships
├── states
├── capabilities
├── commands
├── events
└── evidence

contracts/
├── authority
├── security
├── data
├── product
├── application
└── production

domains/

architecture/

packages/

apps/

tests/
```

Exact filenames/formats remain an implementation decision.

---

# 46. Generated Artifacts

The canonical semantic source may generate:

```text
developer dictionary
AI context
TypeScript identifiers/types
enums/constants
documentation
validation rules
decision-test fixtures
architecture checks
```

Generated output is derived from authoritative source definitions.

Generated code must not invent business semantics absent from the source contracts.

---

# 47. Vertical-Slice Development

Implementation will proceed as usable vertical slices.

Execution hierarchy:

```text
Contract
↓
Epic
↓
Vertical Slice
↓
Work Package
↓
Bounded Task
↓
Evidence
```

Example learner slice:

```text
Authenticate
↓
Dashboard
↓
Assigned content
↓
Start learning session
↓
Complete challenge
↓
Persist progress
↓
Read persisted result
```

Then manager visibility can build on the persisted learner truth.

---

# 48. Demo Gate

The demo does **not** wait for every possible Teach contract.

A learner demo requires approved baselines for the relevant:

```text
C00
C01
C02

C11–C15 applicable trust/security

C21–C23 applicable data correctness

C31 content

C32 learning

C41 command/API boundary

C42 web boundary
```

Manager demonstration additionally requires:

```text
C33
```

Certification demonstration requires:

```text
C34
```

The following do not inherently block the learner demo:

```text
runtime AI
analytics
PWA/offline
self-service billing
```

---

# 49. Future Agent Integration

Runtime agents are added **after** deterministic Teach works.

They consume bounded capabilities/commands.

They do not redefine:

```text
identity
authorization
scope
transactions
state machines
idempotency
audit
data ownership
```

Potential future agent-specific additions may define:

```text
AgentIdentity
AgentCapability
Tool/Command Boundary
Agent Decision Evidence
Human Approval/Escalation
Agent Failure/Recovery
```

Those are deferred until an actual runtime-agent use case exists.

---

# 50. Final Foundational Principle

The rebuilt Teach will be constructed from the inside out:

```text
stable meaning
↓
explicit ownership
↓
legal relationships
↓
legal states
↓
invariants
↓
deterministic decisions
↓
commands
↓
persistence
↓
interfaces
↓
product experiences
↓
optional intelligence
```

The database does not define the business.

The UI does not define the business.

The API does not define the business.

The AI does not define the business.

**The semantic kernel, contracts, domain ownership, and invariants define Teach. Everything else implements them.**
