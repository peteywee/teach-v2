<!--tos-doc
{
  "doc_id": "TEACH-CON-INDEX",
  "class": "contract-index",
  "version": "0.5.0",
  "claims_truth_state": "declared",
  "status": "active",
  "owner": "Patrick Craven, Top Shelf Service LLC",
  "created_on": "2026-10-03",
  "updated_on": "2026-10-03",
  "effective_on": "2026-10-03",
  "approval": {
    "state": "approved",
    "approved_on": "2026-10-03",
    "record": "contracts/APPROVAL-RECORD.md"
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
    "use": "reference only"
  },
  "depends_on": [
    "contracts/"
  ]
}
-->

# Teach v2 Contracts

- Package version: `0.5.0`
- Status: `active` — approved by the owner on 2026-10-03 (see `APPROVAL-RECORD.md`)
- Owner: Patrick Craven, Top Shelf Service LLC
- Created: 2026-10-03
- Last updated: 2026-10-03

These are the normative behavior contracts Teach v2 is built on. They state what the system MUST and
MUST NOT do. Implementation is measured against them, not the other way round.

Teach v2 is a new build in `peteywee/teach-v2` (default branch `main`). The legacy Teach repository (`peteywee/teach`) is a reference and evidence
source only: its code, contracts, and decision records do not govern v2 (SYS-23), and legacy code
enters v2 only through named reuse (SYS-28). Where a contract cites the legacy repository, it is
recording lineage or a lesson, not a dependency.

## Hierarchy and precedence

```text
C00 SYSTEM AUTHORITY
│
├── C01 CANONICAL SEMANTICS (semantic kernel, K00)
│
├── C02 AUTOMATION & AGENT AUTHORITY
│
├── C10 TRUST & SECURITY
│   ├── C11 Identity & Credentials
│   ├── C12 Application Sessions
│   ├── C13 Tenancy & Membership
│   ├── C14 Authorization & Capabilities
│   └── C15 Data Isolation & Privacy
│
├── C20 DATA CORRECTNESS
│   ├── C21 Database & Migration
│   ├── C22 Transaction / Idempotency / Reconciliation
│   └── C23 Audit & Lifecycle Events
│
├── C30 PRODUCT SEMANTICS
│   ├── C31 Content & Teaching Engine
│   ├── C32 Learning Sessions & Progress
│   ├── C33 Manager Operations
│   └── C34 Certification & Credentials
│
├── C40 APPLICATION BOUNDARIES
│   ├── C41 Application / Command / API Boundary
│   └── C42 Web Client Boundary
│
├── C50 PRODUCTION PROOF
│   ├── C51 Verification & Evidence
│   ├── C52 Deployment / Release / Recovery
│   └── C53 Observability
│
└── C60 OPTIONAL FEATURE CONTRACTS (conditional)
    ├── C61 Analytics
    ├── C62 PWA / Offline
    └── C63 Self-Service Billing
```

The order of authority is C00, C01, C02, then the C10 to C60 groups; an earlier one governs a later one (SYS-3). A lower contract cannot weaken, reinterpret, or carve an
exception out of a higher one (SYS-5). Precedence inside a group is open question
OQ-SYS-1; until it is decided, an intra-group conflict is recorded and the more restrictive
requirement applies (SYS-4).

C60 contracts are conditional. Each binds only after the owner enables its feature; until then only
the requirement that keeps the feature off applies.

## Index

| ID  | Contract                                                                                            | Version | Prefix  | Requirements | Acceptance cases | Open questions | Blocking implementation | Status   |
| --- | --------------------------------------------------------------------------------------------------- | ------- | ------- | ------------ | ---------------- | -------------- | ----------------------- | -------- |
| C00 | [System Authority](c00-system-authority-contract.md)                                                | 1.0.3   | `SYS`   | 34           | 20               | 6              | 0                       | `active` |
| C01 | [Canonical Semantics](c01-canonical-semantics-contract.md)                                          | 1.1.0   | `SEM`   | 29           | 18               | 2              | 0                       | `active` |
| C02 | [Automation & Agent Authority](c02-automation-agent-authority-contract.md)                          | 1.0.3   | `AGT`   | 17           | 13               | 3              | 0                       | `active` |
| C11 | [Identity & Credentials](c11-identity-credentials-contract.md)                                      | 1.0.3   | `IDN`   | 20           | 16               | 7              | 5                       | `active` |
| C12 | [Application Sessions](c12-application-sessions-contract.md)                                        | 1.0.3   | `SES`   | 20           | 14               | 7              | 6                       | `active` |
| C13 | [Tenancy & Membership](c13-tenancy-membership-contract.md)                                          | 1.0.3   | `TEN`   | 15           | 10               | 3              | 2                       | `active` |
| C14 | [Authorization & Capabilities](c14-authorization-capabilities-contract.md)                          | 1.0.3   | `AUTHZ` | 20           | 12               | 2              | 1                       | `active` |
| C15 | [Data Isolation & Privacy](c15-data-isolation-privacy-contract.md)                                  | 1.0.3   | `PRIV`  | 17           | 10               | 6              | 3                       | `active` |
| C21 | [Database & Migration](c21-database-migration-contract.md)                                          | 1.0.3   | `MIG`   | 14           | 9                | 5              | 2                       | `active` |
| C22 | [Transaction, Idempotency & Reconciliation](c22-transaction-idempotency-reconciliation-contract.md) | 1.0.3   | `TXN`   | 13           | 10               | 2              | 1                       | `active` |
| C23 | [Audit & Lifecycle Events](c23-audit-lifecycle-events-contract.md)                                  | 1.0.3   | `AUD`   | 10           | 8                | 3              | 1                       | `active` |
| C31 | [Content & Teaching Engine](c31-content-teaching-engine-contract.md)                                | 1.0.3   | `CNT`   | 12           | 9                | 3              | 0                       | `active` |
| C32 | [Learning Sessions & Progress](c32-learning-sessions-progress-contract.md)                          | 1.0.3   | `LRN`   | 13           | 10               | 3              | 1                       | `active` |
| C33 | [Manager Operations](c33-manager-operations-contract.md)                                            | 1.0.3   | `MGR`   | 10           | 8                | 2              | 1                       | `active` |
| C34 | [Certification & Credentials](c34-certification-credentials-contract.md)                            | 1.0.3   | `CERT`  | 15           | 7                | 5              | 2                       | `active` |
| C41 | [Application / Command / API Boundary](c41-api-boundary-contract.md)                                | 1.0.3   | `API`   | 15           | 11               | 3              | 1                       | `active` |
| C42 | [Web Client Boundary](c42-web-client-boundary-contract.md)                                          | 1.0.3   | `WEB`   | 15           | 10               | 2              | 1                       | `active` |
| C51 | [Verification & Evidence](c51-verification-evidence-contract.md)                                    | 1.0.3   | `EVD`   | 16           | 7                | 3              | 0                       | `active` |
| C52 | [Deployment, Release & Recovery](c52-deployment-release-recovery-contract.md)                       | 1.0.3   | `REL`   | 16           | 9                | 4              | 1                       | `active` |
| C53 | [Observability](c53-observability-contract.md)                                                      | 1.0.3   | `OBS`   | 10           | 8                | 3              | 0                       | `active` |
| C61 | [Analytics](c61-analytics-contract.md)                                                              | 1.0.3   | `ANL`   | 8            | 7                | 2              | 0                       | `active` |
| C62 | [PWA / Offline](c62-pwa-offline-contract.md)                                                        | 1.0.3   | `PWA`   | 9            | 4                | 1              | 0                       | `active` |
| C63 | [Self-Service Billing](c63-billing-contract.md)                                                     | 1.0.3   | `BIL`   | 13           | 11               | 3              | 0                       | `active` |
|     | **Total**                                                                                           |         |         | **361**      | **241**          | **80**         | **28**                  |          |

## K00 semantic-kernel bootstrap

Package `0.5.0` establishes the canonical `kernel/` JSON registry structure under C01 1.1.0, resolves OQ-SEM-1 through OQ-SEM-3, and keeps all initial domain vocabulary entries `candidate` until domain discovery promotes them through an approved semantic change. GitHub issue: #1.

## Contract activation order

```text
C00
↓
C01
↓
C02
↓
C11–C15
↓
C21–C23
↓
C31–C34
↓
C41–C42
↓
C51–C53
↓
C61–C63 only when enabled
```

Requirement counts above include retired requirements (SYS-20), which stay listed so their IDs are
never reused.

## Demo and slice gates

The demo does not wait for every contract (SYS-29 to SYS-33).

| Demonstration      | Contracts that must be `active`                                                       |
| ------------------ | ------------------------------------------------------------------------------------- |
| Learner demo       | C00, C01, C02, applicable parts of C11–C15 and C21–C23 (OQ-SYS-5), C31, C32, C41, C42 |
| Manager demo       | Learner demo set + C33                                                                |
| Certification demo | Learner demo set + C34                                                                |
| Not prerequisites  | Runtime AI, C61 Analytics, C62 PWA/Offline, C63 Self-Service Billing                  |

Any vertical slice starts only when every contract it depends on is `active` (SYS-33). C00, C01,
C02, C11–C15, and C21–C23 currently carry 21 blocking open questions.

## Build sequence (declared, from the consolidated decisions)

```text
C00 System Authority → C01 Semantic Kernel → C02 Automation & Agent Authority
→ Domain Discovery → Domain Ownership Map → Domain Contracts → Relationships
→ States / State Machines → Invariants → Decision Trees / Tables → Commands → Events
→ Architecture → Application Interfaces → Persistence Model → Transport Interfaces
→ Vertical Product Slices → Implementation → Verification → Production Evidence
```

Execution hierarchy: Contract → Epic → Vertical Slice → Work Package → Bounded Task → Evidence.

## Decisions recorded outside these contracts

The consolidated decisions also set direction that is architectural rather than behavioral. These
are owner-declared and are not yet captured in an architecture decision record:

- Development model: contract-driven, semantic-kernel-driven, domain-oriented, decision-explicit,
  modular monolith, vertical-slice delivery, Agile execution, evidence-gated completion.
- Programming style follows the behavior (state machines for stateful domains, pure functions for
  rules, application services for coordination, schemas/value objects for validated concepts,
  repositories/adapters for persistence, components for presentation). OOP is not the architecture.
- Modular monolith with domain modules (identity, organization, authorization, content, learning,
  certification, audit); microservices deferred until evidence justifies extraction.
- Layer direction: Constitution → Semantic Kernel → Contracts → Domain → Application →
  Infrastructure → Interfaces. Lower layers do not redefine higher ones.
- Repository concept: `kernel/`, `contracts/`, `domains/`, `architecture/`, `packages/`, `apps/`,
  `tests/`; exact filenames and formats remain an implementation decision.

## Lineage from the legacy Teach contracts

For reference only. Nothing in the legacy repository is superseded, edited, or governed by this set
(OQ-SYS-3, resolved).

| Legacy `peteywee/teach`             | Teach v2                                                    |
| ----------------------------------- | ----------------------------------------------------------- |
| `identity-access.json`              | C11 Identity & Credentials + C12 Application Sessions       |
| `tenancy.json`                      | C13 Tenancy & Membership + C14 Authorization & Capabilities |
| `database-migration.json`           | C21 Database & Migration                                    |
| `content-engine.json`               | C31 Content & Teaching Engine                               |
| `frontline-learning.json`           | C32 Learning Sessions & Progress                            |
| `manager-operations.json`           | C33 Manager Operations + C34 Certification & Credentials    |
| `analytics-audit.json`              | C23 Audit & Lifecycle Events + C61 Analytics                |
| Gate A decision record (2026-07-22) | Carried into C00, C11, C14, C34, C41, and C42 where cited   |
| No legacy counterpart               | C01, C02, C15, C22, C51, C52, C53, C62, C63                 |

## Activation and open questions

All 23 contracts were approved by the owner on 2026-10-03 at version 1.0.0 and are `active`. They
govern Teach v2 from that date.

They were activated with 31 blocking open questions still undecided. Those questions no longer
block activation; they block implementation. Under SYS-34, a requirement whose value depends on an
undecided question may ship only its fail-closed behavior until the owner decides the question and
the decision is written into the contract.

Deciding an open question, or any other change, now follows the revision procedure for `active`
contracts (SYS-21): GitHub issue, impact analysis, superseded copy under `superseded/`, version
bump, Change Log entry, acceptance cases updated before code, and evidence regenerated after.

## What this package does not claim

- It does not claim any part of Teach currently conforms to these contracts. Implementation
  conformance is `Not yet verified` in every contract.
- It does not claim any acceptance case exists as a test yet.
- It does not decide any open question. Every undecided value reads `Not yet verified` and points
  to an `OQ-` entry.
- Owner approval is not independent review. The contracts were drafted and checked by Claude against
  the contract-authoring checklist only.

## Source

Owner-supplied documents are preserved as non-normative records in `source/`:

- `2026-10-03-teach-v2-contract-hierarchy-proposal.md` — the original hierarchy (package 0.1.0)
- `2026-10-03-teach-rebuild-consolidated-decisions.md` — the consolidated decisions (package 0.2.0:
  C01 and C02 created; C00, C11, C12, C21–C23, C31–C34, C41, C42, C61–C63 revised)

Retargeting to v2 and anchoring to `peteywee/teach-v2` `main` (owner statements, 2026-10-03) each
bumped every contract one minor version; see each Change Log.
