# Proposed authority, audit and receipt definitions

These exact logical fields authorize neither a live table nor data insertion until semantic approval and each physical admission pass. Proposed table names are engineering mapping labels, not a second source of meaning. Existing migrations remain immutable; append only after the actual current migration head, never after an assumed P07 certification migration.

## Common representations

All existing identifiers retain their current opaque string meaning; transport lexical bounds remain the registered `[A-Za-z0-9_-]{1,128}` selector shape. Newly allocated IDs are backend-generated UUIDs, never browser-provided authority. RequestId and IdempotencyKey mean the already-approved identifier-family entries; their same-spelled candidate value-object entries are not consumed or promoted. Timestamp is proposed as a finite UTC point in time, PostgreSQL timestamptz/ISO-8601 Z at the boundary; clocks and representation add no lifecycle policy. A digest is lower-case SHA-256 hex over the package-defined canonical UTF-8 bytes. No raw credential can be a field.

## Organization-owned records

- Organization: id, classification DEMO_ONLY, createdAt. The classification is immutable and accepted here only via BeginDemoRun. Existing non-demo Organization semantics remain unchanged; no customer constructor is enabled. A proposed one-to-one DemoRun association proves classification, not an unauthenticated string or tenant label.
- Location: id, organizationId, createdAt. Exactly one owning Organization. Immutable within this demo.
- Membership: id, identityId, organizationId, locationId nullable, status ACTIVE|INACTIVE|REVOKED, createdAt, updatedAt. General normalized shape preserves null as organization-wide; every demo Membership uses the run's exact non-null location. Unique (identityId, organizationId, locationId) with NULL treated as equal. No retargeting of endpoints. Status uses existing transitions only; creation lifecycle snapshot and every transition must commit atomically. Demo activation only creates two fixed memberships; it does not mount general administration routes.
- MembershipGrant: id, membershipId, bundle: CapabilityBundle, createdAt. An immutable grant record has no invented lifecycle/status column. Its effectiveness is derived from current ACTIVE Membership, current Identity and (for synthetic personas) live DemoRun. Only BeginDemoRun creates these grants; no update/delete/regrant API is included. The exact bundle set is self, learner, observer, manager, org_admin, demo_visitor; self is never an issued MembershipGrant. Demo grant combinations are exactly learner+demo_visitor or manager+demo_visitor. Unique (membershipId,bundle). Future individually revocable grants need their own governed operation, not a hidden delete.
- ReportingRelationship: id, organizationId, locationId, managerIdentityId, learnerIdentityId, createdAt. Immutable direct edge; both endpoints must be distinct and hold ACTIVE Membership at the exact scope when created. Demo construction permits exactly the two fixed persona endpoints; no cycles, multiple managers, reassignment or transitive visibility is introduced. Unique (organizationId,locationId,managerIdentityId,learnerIdentityId). It narrows visibility and cannot create a capability.
- DemoRun: exact fields and lifecycle in demo-boundary.md. Scope relation is 1:1 with Organization and 1:1 with Location; no customer record can be attached. Location must belong to its run's organization. AdmissionPrefix is operational rate-limiting data, not a credential.

Same-organization checks and uniqueness must be enforced in admitted database constraints where expressible, and owner application invariants in the same transaction otherwise. Application writes to immutable classification, endpoints, grants or reporting history are denied; changes cannot hide in generic upsert methods.

## Identity-owned records

- DemoPersona: exact fields in demo-boundary.md; one-to-one with Identity, many-to-one with DemoRun, exactly one of each PersonaKind per run. No Credential is created. Its run association is immutable, and all downstream session access resolves through it.
- Existing Identity/ApplicationSession records remain their admitted P01/P02/P03/P04 shapes. There is no alternate authentication/session store and no raw session secret at rest. A new owner interface may read/bind a DemoPersona, but may not mutate Organization records. New tables or FKs referencing these existing records require explicit admission of their relationships.
- Existing session revocation is the only write path for ACTIVE→REVOKED. SwitchDemoPersona and RevokeDemoSessions orchestrate it and do not implement another writer. Sidecar persona classification does not change status enum or grant DELETED ingress.

## AuditLifecycle-owned records

AuditEvent fields:
- id: AuditEventId; occurredAt: Timestamp; requestId: approved RequestId; idempotencyKey: approved IdempotencyKey|null.
- actor: finite AuditActor tagged union: HumanActor {identityId}; AutomationActor {executionPrincipalId}; or UNAUTHENTICATED_DENIAL {ipPrefix|null}. The last is denial metadata only, not a new C02 actor class or privilege.
- action: exact declared command name or DENIAL / DENIAL_OVERFLOW; result SUCCEEDED|DENIED|OVERFLOW.
- target: finite AuditTarget tagged union with exactly one typed record reference: Identity, ApplicationSession, Organization, Location, Membership, MembershipGrant, ReportingRelationship, DemoRun, ContentPack(version,digest), Assignment or LearningSession. Denial target may be UNRESOLVED with no raw unvalidated identifier. No arbitrary JSON target or secret-bearing payload.
- organizationId: OrganizationId|null; locationId: LocationId|null. Null organization is allowed only for legitimate pre-tenant/SELF Identity/session operations or a denial before scope resolves. A successful tenant mutation always has its exact non-null organization; non-null location must belong to it.
- denialClass: CAPABILITY|TENANT_SCOPE|TARGET_SCOPE|CREDENTIAL_ABUSE|ORIGIN|null; ipPrefix|null, dedupBucketStart|null and overflowBucketStart|null exactly when C23 policy calls for them. No request body, password, answer text, credential, raw IP, header or token.

The successful audit action allowlist for this demo is BeginDemoRun, CreateDemoPersona, CreateMembership, PublishContentPack, AssignContent, CreateApplicationSession, StartLearningSession, CompleteLearningSession, SwitchDemoPersona, CloseDemoRun, RevokeApplicationSession, RevokeDemoSessions. Existing admitted Identity lifecycle operations keep their required audits but are not exposed/granted by this package. RecordProgressEvent success is its canonical append plus receipt, not an invented separate audit requirement. Nested commands each append their own required action fact once; top-level orchestration audit is distinguishable, not a second copy of a nested event.

Denial records retain approved 5-minute deduplication, 100 rows/actor/hour and one overflow row/hour. Exclude plain unauthenticated requests and ordinary validation errors. Immutable insert-only records use a uniqueness key for dedup rather than updating counts inside an audit row. Successful mutation and its audit fail atomically; denial audit failure never turns denial into permission. Application roles cannot UPDATE/DELETE audit or lifecycle records.

LifecycleEvent fields: id: LifecycleEventId, occurredAt: Timestamp, requestId, ownerCommand, organizationId|null, locationId|null, aggregateType: Identity|Membership|Assignment|DemoRun, aggregateId of that exact type, sequence positive integer, previousState|null and nextState with a finite versioned snapshot.
- Identity snapshot: IdentityId, status, offboardedAt|null, createdAt, updatedAt; initial creation plus existing approved transitions. DemoPersona creation records Identity creation under CreateDemoPersona, not a new canonical business event.
- Membership snapshot: all Membership lifecycle fields and immutable endpoints above.
- Assignment snapshot: exact immutable fields and ACTIVE state from learning-definition.md.
- DemoRun snapshot: id, organizationId, locationId, status, createdAt, expiresAt, closedAt, closeReason (admission prefix is not needed in lifecycle history).
Unique (aggregateType,aggregateId,sequence); the sequence is allocated under the aggregate lock. Replay starts with one creation snapshot, applies only allowed changes and exactly equals current lifecycle fields. This is immutable lifecycle history, not a broker/event bus. No candidate business event is emitted merely because a LifecycleEvent row exists.

## TransactionControl-owned CommandReceipt

CommandReceipt fields: id; actor: CommandActor (HumanActor identityId or exact admitted AutomationActor principalId); organizationId; locationId; operation enum AssignContent|StartLearningSession|RecordProgressEvent; key: identifier IdempotencyKey; canonicalPayloadDigest; responseSchemaVersion: 1; response: exact operation success DTO; createdAt; replayUntil = createdAt + 24 hours.

Unique (canonicalActorReference,organizationId,locationId,operation,key). The actor reference includes its type; initial AssignContent uses automation:demo-admission-v1, never a fabricated human identity. The response contains no session cookie/credential. There is no cross-tenant lookup or key-only receipt API. Owner commands use a TransactionControl application receipt port within the same SQL transaction as their effect/audit. No foreign repository import. Existing P05 session key fields remain consistent with the same validated request but do not become a conflicting second idempotency authority.

Current session, run, membership, capability and scope checks precede any replay response. Same key+same canonical payload within the horizon returns the original non-secret DTO and no new effect/audit. Same key+changed payload is 422 IDEMPOTENCY_KEY_REUSED. Expired accepted keys/tombstones cannot be silently reused; they return 409 after current authorization. Receipts and key/digest evidence are retained with the synthetic run, including beyond the 24-hour retry horizon; no deletion executor is added. Run expiry normally ends demo retry access sooner than 24 hours. Switch/begin secrets never enter this store.

## Owner read interfaces (query names are not grants)

- OrganizationAuthorityReadInterface extends consumers to Content, Learning and Identity for database-current Membership, granted capability inputs, exact scope/reporting and DemoRun availability. Its locking variant returns transaction-bound facts and holds the run fence until caller commit; a consumer never writes Organization rows.
- IdentityAuthorityReadInterface includes demo binding/current Identity and sessions needed by Organization; only Identity can create/revoke them. Include the authoritative total historical ApplicationSession count for the exact run, used under its lock to enforce the 100-session issuance cap; do not infer it from browser state.
- DemoRunAuthorityReadInterface: Organization owner, consumers Identity, Authorization, Content, Learning; finite live-run/scope/fixed-persona association and expiry facts, never a broad cross-tenant enumeration. ListExpiredDemoRuns is a separate exact named sweeper-only query, batch limit100, returns due DemoRun IDs and immutable scopes only.
- ContentReadInterface returns canonical published version/digest/schema/evaluation facts to Learning. LearningAssignmentReadInterface returns current exact assignment/learner/scope/version binding to Content.
- LearningStateReadInterface serves server projections to manager queries; Organization direct-report predicate must be applied in storage/query scope, not after returning all learners.
- AuditAppendInterface and LifecycleAppendInterface are write ports owned by AuditLifecycle, bound to caller transaction.
- CommandReceiptInterface is owned by TransactionControl and scoped to the already-authorized command transaction; no transport route.

## Physical admission mapping

Proposed fresh tables: organization_organizations, organization_locations, organization_memberships, organization_membership_grants, organization_reporting_relationships, organization_demo_runs; identity_demo_personas; audit_events, lifecycle_events; transaction_command_receipts; content/assignment/progress tables specified by the learning artifact. The exact SQL spelling may change before admission without changing business meaning. No destructive migration, customer seed, broad service-role credential or production execution is permitted by this proposal.

Each physical slice must bind every field/FK/enum/unique check to a typed proposed/approved semantic dependency, list ownership, preserve prior migrations, include fresh and upgrade replay, rollback/recovery and real PostgreSQL isolation/privilege tests. A named-package approval permits completing those engineering admission proofs; it is not permission to mark an unproved shape ADMIT.
