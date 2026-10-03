<!-- Non-normative source record. Owner-supplied proposal pasted into Claude on 2026-10-03, preserved verbatim except for whitespace and table formatting normalized by Prettier. The contracts in the parent directory are normative; this file is not. -->

Yes. After the repo audit, I would **strip the contract system down hard**.

For a clean Teach rebuild, I would create **exactly these contracts**, in this hierarchy. Higher contracts govern lower ones; **a lower contract is never allowed to weaken or reinterpret a higher one**.

```text
C00 SYSTEM AUTHORITY
│
├── C10 TRUST & SECURITY
│   ├── C11 Identity & Credentials
│   ├── C12 Application Sessions
│   ├── C13 Tenancy & Membership
│   ├── C14 Authorization & Capabilities
│   └── C15 Data Isolation & Privacy
│
├── C20 DATA INTEGRITY
│   ├── C21 Database & Migration
│   ├── C22 Transaction / Idempotency / Reconciliation
│   └── C23 Audit & Lifecycle Events
│
├── C30 CORE PRODUCT
│   ├── C31 Content & Teaching Engine
│   ├── C32 Learning Sessions & Progress
│   ├── C33 Manager Operations
│   └── C34 Certification & Credentials
│
├── C40 APPLICATION BOUNDARIES
│   ├── C41 API Boundary
│   └── C42 Web Client Boundary
│
├── C50 PRODUCTION PROOF
│   ├── C51 Verification & Evidence
│   ├── C52 Deployment / Release / Recovery
│   └── C53 Observability
│
└── C60 GOOD TO HAVE
    ├── C61 Analytics
    ├── C62 PWA / Offline
    └── C63 Billing
```

## C00 — System Authority Contract

**Required before writing application code.**

This is the constitution of Teach.

Its exact rules should be:

- Contracts are authoritative over implementation.
- Contract precedence follows the hierarchy above.
- A lower layer cannot weaken an earlier contract.
- Exactly one component owns each piece of mutable state.
- Exactly one canonical path exists for each security-sensitive operation.
- Unknown, ambiguous, contradictory, or unavailable authority **fails closed**.
- Compatibility code must be explicitly identified, bounded, tested, and have a removal condition.
- Production truth requires exact-code + exact-environment + authoritative runtime evidence.
- CI success alone is not production proof.
- External side effects with ambiguous outcomes require canonical reconciliation before retry.
- Implementation may add behavior only when an owning contract permits it.

This absorbs the strongest part of the current Gate A decision rather than carrying the entire historical document forward. [Current Gate A contract](https://github.com/peteywee/teach/blob/work/TR-0010-production-cutover/docs/decisions/gate-a-saas-foundation-contracts.md)

---

# C10 — Trust & Security

These are the most important application contracts.

If one of these is wrong, **nothing above it should be considered trustworthy**.

## C11 — Identity & Credentials Contract

Owns:

`users`, passwords, OAuth identities, invitations, setup tokens, password-reset tokens, identity lifecycle.

Exact invariants:

- One canonical identity per user.
- Authentication credentials never determine authorization.
- Passwords are salted/hashed using the approved password hashing implementation.
- Invitation/setup/reset tokens are random, short-lived, single-use, revocable and hashed at rest.
- Managers can initiate employee setup but can never retrieve or know reusable employee credentials.
- Inactive or deleted identities cannot authenticate.
- Credential change revokes whatever existing sessions the security policy requires.
- OAuth identity linking cannot silently create a second application identity.
- Identity lifecycle changes are auditable.
- Offboarding is idempotent.

The current repo combines this with sessions. I would **split them** because session security deserves an independent contract. [Current identity contract](https://github.com/peteywee/teach/blob/work/TR-0010-production-cutover/.topshelf/contracts/domain/identity-access.json)

---

## C12 — Application Session Contract

Owns application sessions and browser authentication state.

Exact invariants:

- Teach has **one application-session model**.
- Browser authentication uses one opaque session credential.
- Browser receives it through a `Secure`, `HttpOnly`, appropriate `SameSite` cookie.
- Authentication credentials are never persisted in `localStorage`.
- PostgreSQL stores only a cryptographic hash/verifier of the session credential.
- Session lookup hashes the presented credential before lookup.
- Sessions have explicit issuance, expiry, revocation and last-use semantics.
- Logout revokes the authoritative server session, not merely browser state.
- Password/identity/offboarding events revoke affected sessions.
- Expired/revoked sessions fail `401`.
- A browser session cannot manufacture organization, role or capability state.
- No JWT claim is treated as current authorization state when the database is authoritative.

This directly fixes one of the major architectural contradictions found in the audit.

---

## C13 — Tenancy & Membership Contract

Owns organizations, locations, memberships and organizational scope.

Exact invariants:

- **Organization is the customer/security boundary.**
- Location is the workplace scope beneath organization.
- Membership determines whether an identity belongs to an organization/location.
- Database-current membership is authoritative.
- Request bodies, query parameters, frontend state, JWT claims and editable metadata never establish tenant authority.
- Zero matching scopes fails closed.
- Multiple ambiguous scopes fail closed.
- Wrong organization fails closed.
- Wrong location fails closed.
- Deleted/inactive membership fails closed.
- Reporting relationships may narrow visibility but can never grant authority.
- Every tenant-owned record has an unambiguous tenant owner.
- No tenant can read, modify, delete or infer another tenant's protected data.

This is the strongest part of the current active tenancy contract and should survive. [Current tenancy contract](https://github.com/peteywee/teach/blob/work/TR-0010-production-cutover/.topshelf/contracts/domain/tenancy.json)

---

## C14 — Authorization & Capability Contract

I would pull this **out of tenancy** and make it first-class.

Exact invariants:

- Every protected API operation is registered.
- Every registered operation has exactly one owning capability.
- The protected-operation registry is default-deny.
- Unknown protected operations deny before handler execution.
- Roles are merely bundles of capabilities.
- Entitlements cannot create capabilities.
- UI visibility never constitutes authorization.
- API authorization reloads database-current actor/scope state.
- Authorization evaluates:
  `identity → membership → tenant/location → capability → target → entitlement`.
- Failure semantics are fixed:

```text
invalid/no session       → 401
authenticated but denied → 403
wrong/out-of-scope target→ non-disclosing 404
```

- A target ID supplied by a client never establishes authorization.
- Every sensitive mutation receives both actor scope and target scope.
- Capability changes require negative tests.

This should be one of the best-tested packages in the repository.

---

## C15 — Data Isolation & Privacy Contract

This is missing as a clean standalone contract today.

Exact invariants:

- Every protected record has explicit ownership.
- Cross-tenant access is impossible through normal API paths.
- Sensitive queries always include authoritative ownership/scope predicates.
- Private data does not leak through error messages, analytics, logs, cache, service worker or browser persistence.
- Data-export requests have an implemented fulfillment lifecycle.
- Data-deletion requests have an implemented fulfillment lifecycle.
- Retention periods correspond to actual executable behavior.
- “Deleted,” “anonymized,” “retained” and “offboarded” have separate explicit meanings.
- A hard-purge promise cannot exist unless an executable purge mechanism exists.
- Legal/audit records exempt from deletion must be explicitly identified.
- Shared-device behavior must not expose the previous user's data.

That closes the policy/runtime gap discovered during this audit.

---

# C20 — Data Integrity

## C21 — Database & Migration Contract

Owns schema evolution.

Exact invariants:

- Drizzle migration history is the sole application schema authority.
- No `db push` against shared or production environments.
- Every schema change receives a migration.
- Fresh migration from zero must succeed.
- Upgrade from current production schema must succeed.
- Migration ordering is deterministic.
- Production migration requires backup proof.
- Production migration requires restore proof.
- Browser roles cannot directly access backend-owned tables.
- RLS/privilege posture is tested where applicable.
- Destructive migrations require explicit owner approval and rollback/recovery planning.
- Schema code and deployed database must be reconciled before release.

This is largely the current `database-migration` contract, cleaned up. [Current migration contract](https://github.com/peteywee/teach/blob/work/TR-0010-production-cutover/.topshelf/contracts/domain/database-migration.json)

---

## C22 — Transaction, Idempotency & Reconciliation Contract

This is another contract Teach currently needs badly.

Exact invariants:

- Operations that must succeed together use one database transaction.
- Every retryable mutation has a defined idempotency strategy.
- Repeating the same idempotent request produces the same final state.
- Retry cannot create duplicate certifications, assignments, payments, seats, invitations or lifecycle events.
- Ambiguous external side effects are **never blindly retried**.
- Canonical provider/readback reconciliation happens before retry.
- External webhook delivery is assumed to be duplicate and out-of-order.
- Webhook processing stores enough provider-event state to reject/reconcile duplicates and stale state.
- Cleanup operations are bounded to their exact owner/run/tenant.
- Partial failure states are explicitly represented rather than treated as success.

This is one of the direct lessons from XQueue that Teach should inherit.

---

## C23 — Audit & Lifecycle Events Contract

Exact invariants:

- Security-sensitive mutations emit immutable audit evidence.
- Business mutation and required audit event commit in the same transaction.
- Audit records contain at minimum:

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

- Audit logs never contain credentials, raw tokens or secrets.
- Identity lifecycle events are append-only.
- Current state may be reconstructed/explained from lifecycle history where required.
- Failed authorization attempts that matter operationally can be distinguished from successful mutations.
- Audit records are not analytics events.

The existing `analytics-audit` contract should be **split here**; audit is foundational, analytics is not. [Current combined analytics/audit contract](https://github.com/peteywee/teach/blob/work/TR-0010-production-cutover/.topshelf/contracts/domain/analytics-audit.json)

---

# C30 — Core Product

Only after C10 and C20 are stable do we define what Teach actually does.

## C31 — Content & Teaching Engine Contract

Exact invariants:

- One canonical content-pack schema.
- Content schema is versioned.
- Content is validated before becoming available.
- Legacy formats require explicit adapters.
- Content identity/version cannot silently mutate beneath learner evidence.
- Engine behavior is deterministic for the same inputs.
- Core engine code is runtime-independent.
- Content assignment is separate from content existence.
- A user possessing a pack ID does not mean that user may access the pack.
- Production content cannot claim customer approval without recorded authorization.
- Challenge configuration and engine schema remain in parity.

This is essentially the useful core of the current `content-engine` contract. [Current content contract](https://github.com/peteywee/teach/blob/work/TR-0010-production-cutover/.topshelf/contracts/domain/content-engine.json)

---

## C32 — Learning Sessions & Progress Contract

Owns the actual learning truth.

Exact invariants:

- Learning sessions belong to exactly one learner.
- Learning sessions operate only against assigned/authorized content.
- Session start, event recording and session completion have explicit semantics.
- Progress derives from persisted canonical learner events/state.
- Challenge completion that claims learning/progress must enter the same canonical persistence model.
- Mastery/progress cannot exist only inside React/Zustand.
- Retry cannot duplicate progress.
- Learners can read only their own learner state.
- Managers cannot manufacture learner progress.
- Progress history has a defined relationship to content version.
- XP/streak/rank cannot be displayed as “real” unless derived from authoritative persisted state.
- Offline mutation behavior must be explicitly permitted by C62; otherwise mutations require connectivity.

This is the contract that fixes the current Kitchen/demo disconnect. [Current frontline-learning contract](https://github.com/peteywee/teach/blob/work/TR-0010-production-cutover/.topshelf/contracts/domain/frontline-learning.json)

---

## C33 — Manager Operations Contract

Exact invariants:

- Manager capability is separate from reporting relationship.
- Managers act only within authorized organization/location scope.
- Reporting relationships narrow which learners a manager can see.
- Reporting relationships never grant capabilities.
- Team reads are derived from authoritative membership/scope.
- Manager actions have separate capabilities.
- Manager can see only persisted learner truth.
- Assignment operations are scoped and auditable.
- Offboarding calls the canonical identity lifecycle service.
- Manager UI cannot implement its own authorization model.
- Manager cannot create/retrieve employee passwords or PINs.

This keeps the useful parts of the current manager contract. [Current manager contract](https://github.com/peteywee/teach/blob/work/TR-0010-production-cutover/.topshelf/contracts/domain/manager-operations.json)

---

## C34 — Certification & Credential Contract

I would extract this from manager operations because it has stronger integrity requirements.

Exact invariants:

Certification requires:

```text
active learner membership
+ assigned content
+ exact content/version
+ approved criteria version
+ authorized observer
+ timestamp
+ evidence
+ immutable audit event
```

And:

- Certification mutation and audit commit atomically.
- Duplicate certification requests are idempotent.
- Revocation is explicit and auditable.
- Credential history is preserved.
- Public badge/credential verification must be explicitly declared public or private—never accidentally protected/unprotected by router placement.
- Verification reveals only intentionally public fields.

---

# C40 — Application Boundaries

## C41 — API Boundary Contract

Exact invariants:

- `/api/v1` is the canonical application API boundary.
- Every external input is schema-validated.
- No raw unvalidated `req.json()` reaches business logic.
- Response structures are typed/schema-defined.
- Protected operations must exist in C14's registry.
- Business rules live below route handlers.
- Database queries don't derive tenant scope from client data.
- API errors use stable semantics.
- Internal exceptions do not expose stack traces/secrets in production.
- Request IDs propagate into audit/observability.
- API version changes that break consumers require explicit version handling.

---

## C42 — Web Client Boundary Contract

Exact invariants:

- The browser is **not an authority**.
- Authentication state comes from the application session.
- Capability state is hydrated from authoritative API state.
- Direct protected URLs are guarded.
- Hidden navigation is not security.
- No protected data is silently replaced with fake/mock data.
- Missing authentication → login.
- Known authorization denial → shared accessible forbidden surface.
- Failed API request → explicit error state.
- Loading → explicit loading state.
- No stale previous-user state survives logout.
- Sensitive credentials never enter browser persistence.
- All application writes go through owned APIs.
- Accessibility requirements apply to core user paths.

---

# C50 — Production Proof

These contracts determine whether the thing is actually finished.

## C51 — Verification & Evidence Contract

Exact evidence states:

```text
PROVEN
BLOCKED
UNKNOWN
CONTRADICTORY
```

Never:

```text
UNKNOWN → PASS
```

Required rules:

- Unit tests prove component behavior.
- Contract tests prove boundaries.
- Integration tests prove components together.
- Negative tests prove forbidden behavior.
- E2E proves the actual user journey.
- Tenant A/B tests prove isolation.
- Cross-session tests prove session isolation.
- Exact-SHA evidence identifies exactly what code was tested.
- CI success means tests passed, **not that production conforms**.
- Runtime claims require runtime evidence.
- Evidence from a different SHA cannot prove the candidate.
- Skipped checks cannot count as pass.
- Required gates fail closed.

This should incorporate the lessons we've already learned from XQueue/TSAL.

---

## C52 — Deployment, Release & Recovery Contract

Exact invariants:

A releasable candidate must bind:

```text
source SHA
+ build identity
+ deployment identity
+ environment
+ database migration state
+ configuration identity
```

Release requires:

- exact candidate frozen,
- required CI green on that candidate,
- no required skipped gates,
- migration reconciliation,
- production configuration validation,
- health/readiness,
- deployed smoke test,
- canonical runtime readback,
- rollback path,
- backup/restore proof where data changes are involved.

And:

- Production cannot be “accepted” and then silently receive unverified commits.
- Evidence becomes stale when the candidate changes.
- Rollback identifies exactly what state is being restored.
- Deployment success alone is not product success.

---

## C53 — Observability Contract

Exact invariants:

- Every request receives a correlation/request ID.
- Production errors are captured.
- Health answers process availability.
- Readiness answers dependency readiness.
- Alerts correspond to actionable conditions.
- Logs do not contain passwords, session credentials, reset tokens or protected learner data unnecessarily.
- Security-sensitive failures have sufficient diagnostic context without leaking protected details.
- Critical external integrations expose failure/reconciliation state.
- Observability failures cannot alter authorization decisions.

---

# C60 — Good to Have

These should **not block the clean core rebuild**.

They become required only when the corresponding feature is enabled.

## C61 — Analytics Contract

Good to have.

- Versioned event names/schema.
- No analytics event is authoritative business state.
- Analytics failure never blocks learning.
- Events carry proper tenant/demo classification.
- Demo traffic can be excluded from real product KPIs.
- No unnecessary PII.
- Analytics events and audit events remain separate.

---

## C62 — PWA / Offline Contract

Good to have.

For initial rebuild I would keep this extremely small:

- static shell may be cached;
- private API responses are not cached by default;
- authentication credentials are never cached;
- offline UI never claims a mutation succeeded when it did not;
- **no offline writes by default**.

If offline writes are later authorized:

```text
each queue item must bind:
user
organization
operation
idempotency key
payload
creation time
expiry
```

and logout must make previous-user submissions impossible to replay under the next identity.

I would **not bring the current generic offline queue into v2**.

---

## C63 — Billing Contract

Good to have until Teach actually needs self-service payments.

When enabled:

- organization comes from authoritative server scope;
- customer identity is server-owned;
- checkout requires billing capability;
- redirect destinations are allowlisted;
- Stripe signatures are verified;
- provider event IDs are durably recorded;
- duplicate events are idempotent;
- out-of-order events are reconciled;
- payment success and local entitlement state are reconciled;
- billing cannot grant an application capability;
- production money movement requires explicit owner authorization.

For the first rebuild, **manual billing/no self-service is substantially safer and simpler**.

---

# What happens to the current Teach contracts

I would **not carry the current `.topshelf/contracts` directory forward verbatim**.

| Current              | Rebuild                                               |
| -------------------- | ----------------------------------------------------- |
| `identity-access`    | split into **C11 Identity** + **C12 Session**         |
| `tenancy`            | split into **C13 Tenancy** + **C14 Authorization**    |
| `database-migration` | becomes **C21**                                       |
| `content-engine`     | becomes **C31**                                       |
| `frontline-learning` | becomes **C32**                                       |
| `manager-operations` | split into **C33 Manager** + **C34 Certification**    |
| `analytics-audit`    | split into **C23 Audit** + optional **C61 Analytics** |
| nothing adequate     | add **C00, C15, C22, C41, C42, C51, C52, C53**        |

That is the contract system I would build Teach v2 around.

Anything below **C53** is product enhancement. Anything above it is part of making Teach **correct, secure, recoverable and provable**.

And the implementation order should follow the hierarchy literally:

```text
C00
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
C61–C63 only when wanted
```

I would not allow us to begin building the guided demo—or any other new feature—until **C00 through C23 are frozen**, because those contracts define what identity, authority, tenancy, persistence and evidence actually mean. That is exactly where the existing Teach accumulated most of its architectural ambiguity.
