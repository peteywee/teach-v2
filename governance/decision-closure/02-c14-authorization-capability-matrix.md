<!--tos-doc
{
  "doc_id": "TEACH-PROP-DCS-02",
  "class": "decision-table",
  "version": "1.1.0",
  "claims_truth_state": "declared",
  "status": "active",
  "owner": "Patrick Craven, Top Shelf Service LLC",
  "created_on": "2026-10-05",
  "updated_on": "2026-10-17",
  "baseline": {
    "repo": "peteywee/teach-v2",
    "ref": "main",
    "commit": "6553eb465e469dc9e60368cde40d259f86262997",
    "purpose": "decision-closure super-batch input baseline"
  },
  "governed_by": [
    "TEACH-CON-C00",
    "TEACH-CON-C01",
    "TEACH-CON-C14"
  ],
  "resolves_if_approved": [
    "OQ-AUTHZ-1",
    "OQ-AGT-1",
    "OQ-AGT-3"
  ],
  "machine_sources": [
    "c14-capability-matrix.json",
    "c14-negative-test-matrix.json"
  ],
  "effective_on": "2026-10-17",
  "approval": {
    "state": "approved",
    "approved_on": "2026-10-17",
    "record": "domains/demo-runtime/owner-approval.json",
    "basis": "TEACH-DEMO-RUNTIME-2026-10-17@0.1.0; SYS-21 #82"
  },
  "supersedes": [
    "TEACH-PROP-DCS-02@0.2.0",
    "TEACH-PROP-DCS-02@1.0.0"
  ]
}
-->

# C14 V2 Authorization Capability Matrix

Registered on 2026-10-05 by the owner-approved r3.1 manifest under SYS-21 #75. The normative sections below are binding policy selections; baseline facts, proposed metadata and registration instructions describe the preserved source snapshot, not current runtime evidence. Capability promotion, physical schema/executor admission, provider selection, implementation and production execution retain their separate gates. Implementation conformance: UNKNOWN.


| Field | Value |
| --- | --- |
| Status | `active` logical authority; implementation conformance UNKNOWN; no route mounting or physical admission |
| Resolves if approved | `OQ-AUTHZ-1` (AUTHZ-19), `OQ-AGT-1` (AGT-9), `OQ-AGT-3` |
| Supports | `OQ-MGR-2` (registration in `06-…`). Depends on rows already registered by #74: MGR-3 manager visibility, TEN-7 scope tuple, TEN-15 membership model, CERT-13 private verification; and AUTHZ-20 (#73). |
| Owner decision | Prior #75 selections preserved except explicit #82 changes; exact demo approval in `domains/demo-runtime/owner-approval.json` |
| Issue #67 definition of done | Traced in §6–§7 (Application Interfaces), §12 (registry and denial cases), §10–§11 (cross-tenant, manager-visibility and global Identity effects exposed) |
| Controlling contracts | C01 SEM-28 (capability identifiers), C14 1.2.0 (semantics), C13 1.4.0, C02 1.0.3, C11 1.4.0, C12 1.1.0, C23 1.1.0 |
| Source direction | Owner follow-up item 1: create a NEW V2 matrix; do not recover V1. `legacy_grants_adopted = false` |
| Machine sources | `c14-capability-matrix.json` (operations, bundles, scopes), `c14-negative-test-matrix.json` (test cases) |

## 1. Current truth at baseline

| Fact | State | Evidence |
| --- | --- | --- |
| Approved C01 commands | **Verified: 23** | `kernel/commands.json` entries, all `approved` |
| Registered capability identifiers | **Verified: 0** | `kernel/capabilities.json` `entries: []` |
| Authorization adapters (real C14 evaluation) | **Verified: none** | Only port interfaces exist: `src/modules/authorization/application/ports/{identity,session}-command-authorization.ts` covering DeactivateIdentity, ReactivateIdentity, RevokeApplicationSession |
| Mounted HTTP routes | **Verified: 0** | `verification/owner-decisions/2026-10-04/route-scan.json` (59 source files scanned); no route code at baseline |
| Application Interfaces | **Verified:** `application-interfaces/authority.json` 1.0.0 maps all 23 commands to six module command boundaries (APP-1) and two explicit orchestrations (AcceptInvitation, OffboardIdentity). It defines **no transport-facing query interface**; HTTP paths and the error envelope are deferred to Transport Interfaces | §6 Interface column; §11 gap 6 |
| Command ledger (#63) | **Verified: 12 PARTIAL, 11 BLOCKED, 0 full-runtime** | `verification/whole-repository/command-coverage.json`; copied per command into §6 Ledger column |
| V1 Gate A vocabulary | Not used | Owner selected NEW_V2. V1 grants and `platform_operator` aliases are not imported (AUTHZ-20, OQ-AUTHZ-2 resolved) |
| Cross-tenant capabilities | **Verified: none permitted** | C14 AUTHZ-20 as amended 2026-10-05 |

## 2. Constraints this matrix enforces

Positive (MUST):

1. Every operation in §6 maps to exactly one capability, and no capability maps to two operations (AUTHZ-2). Verified by the generator assertion and by `validate-decision-closure.mjs`.
2. Capability identifiers match `^[a-z]+\.[a-z]+\.[a-z_]+$` — `<domain>.<resource>.<action>`. C01 registers the identifier; C14 owns its meaning (SEM-28).
3. Authorization code checks capabilities, never bundle names (AUTHZ-7). Bundles exist only to compute an actor's capability set from Membership grants.
4. Every decision reloads actor Identity, Membership, grants and entitlement from the database on each request (AUTHZ-10, TEN-4, SES-16).
5. Evaluation order is fixed (§5); the first failing step ends evaluation and determines the status (AUTHZ-11).
6. Every protected operation, including reads, appears in the registry; an unregistered mounted route fails CI and startup (AUTHZ-1, AUTHZ-6).
7. Every capability ships with the denial cases in `c14-negative-test-matrix.json` in the same change (AUTHZ-18).

Negative (MUST NOT):

1. No bundle holds a capability whose scope is `PLATFORM` or spans organizations. The `PLATFORM` scope does not exist in this matrix.
2. No client-supplied ID establishes identity, organization, location or target authority (AUTHZ-16, TEN-5). Path IDs select; the database decides.
3. No `INTERNAL` operation is mounted on a route.
4. No `BLOCKED` capability is placed in any bundle.
5. No manager path exists to set, view or retrieve another person's password or PIN (IDN-13, MGR-10).
6. Entitlement never adds a capability (AUTHZ-8); authorization never writes entitlement (AUTHZ-21).
7. A RuntimeAgent or DevelopmentAgent holds zero product capabilities (AGT-2, AGT-17).

## 3. Actor classes

| Actor class (C02 AGT-6) | Product grants | How it authenticates | Notes |
| --- | --- | --- | --- |
| HumanActor | Via Membership grants → bundles | Application session cookie (C12) | Includes the fixed synthetic personas; does not identify the actual visitor; only class holding bundles |
| AutomationActor | Explicit capability list per registered principal (§9) | Registered method only | The two demo principals use the immutable boot-validated in-process dispatcher manifest; no external credentials |
| RuntimeAgent | None | — | Disabled (OQ-AGT-2, see `08-…`) |
| DevelopmentAgent | None | — | CI jobs, Claude, ChatGPT, Codex. Not product actors (OQ-AGT-1 answer) |
| Unauthenticated requester | Only the `BOOTSTRAP` proofs in §8 or an empty demo admission trigger (which grants no principal authority) | Credential proof or single-use secret in the request | Not an AGT-6 class; it becomes a HumanActor only after a session exists |

## 4. Scopes and bundles

| Scope | Exact rule |
| --- | --- |
| `BOOTSTRAP` | No application session. Authority comes only from a presented credential proof or single-use secret verified server-side. Membership/scope steps are not evaluated; the operation never reads or writes tenant data beyond the secret's own bound target. |
| `SELF` | Target identity is the session identity, resolved server-side. No client-supplied identity ID is accepted. Membership step is skipped; capability comes from the `self` baseline bundle held by every ACTIVE Identity. |
| `LOCATION` | Request carries an explicit (organizationId, locationId) tuple (TEN-2). Actor must hold an ACTIVE Membership for exactly that organization and location, or an ACTIVE organization-wide Membership for that organization. |
| `ORGANIZATION` | Request carries an explicit organizationId. Actor must hold an ACTIVE organization-wide Membership (locationId NULL) for that organization. |
| `RECORD` | AutomationActor only. Scope is the record's immutable `authoritative_scope`; the principal must be registered for that operation and scope class (AGT-9). The exact admitted demo-expiry record scope resolves one due or terminal DemoRun and its immutable organization/location; no live visitor authority is required for terminalization. |
| `INTERNAL` | Not exposed on any route and holds no grant. Invoked only inside another governed operation's transaction by the owning module's command boundary. |
| `BLOCKED` | No bundle holds the capability. Every request fails closed (403 when routed). Unblocking requires the named dependency. |
| `DEMO_NEW_RUN` | Only automation:demo-admission-v1 may allocate a fresh server-minted DEMO_ONLY organization/location/run. No existing scope selector, read, enumeration or customer authority. |

| Bundle | Holder | Scope | Capabilities |
| --- | --- | --- | --- |
| `self` | Every ACTIVE Identity, independent of membership | `SELF` | `certification.credential.read_self`, `identity.credential.change`, `identity.session.read`, `identity.session.revoke`, `organization.membership.read_self` |
| `learner` | Holder of an ACTIVE learner grant on a Membership | `LOCATION` | `content.pack.read_assigned`, `learning.assignment.read_self`, `learning.progress.record`, `learning.session.complete`, `learning.session.start`, `learning.state.read_self` |
| `observer` | Holder of an ACTIVE observer grant on a Membership | `LOCATION` | `certification.credential.issue`, `certification.credential.verify` |
| `manager` | Holder of an ACTIVE manager grant on a location Membership | `LOCATION` | `certification.credential.verify`, `identity.invitation.create`, `identity.invitation.read`, `identity.invitation.revoke`, `identity.lifecycle.offboard`, `identity.token.revoke`, `learning.assignment.create`, `learning.state.read_team`, `organization.membership.deactivate`, `organization.team.read` |
| `org_admin` | Holder of an ACTIVE org_admin grant on an organization-wide Membership (locationId NULL) | `ORGANIZATION` | `audit.event.read`, `certification.credential.revoke`, `certification.credential.verify`, `identity.invitation.create`, `identity.invitation.read`, `identity.invitation.revoke`, `identity.lifecycle.deactivate`, `identity.lifecycle.offboard`, `identity.lifecycle.reactivate`, `identity.token.revoke`, `learning.assignment.create`, `learning.state.read_team`, `organization.membership.deactivate`, `organization.membership.revoke`, `organization.team.read` |
| `demo_visitor` | Each of the two fixed DemoPersona location Memberships, alongside exactly learner or manager | `LOCATION` | `identity.demo.persona.switch`, `organization.demo.close` |

A Membership carries immutable bundle grant records; effectiveness is derived from current ACTIVE Membership, Identity and, for synthetic personas, live DemoRun. Location grants apply only at their exact scope; organization-wide grants apply within their organization. The baseline self capabilities are not issued MembershipGrant records. Organization-admin scope remains unaffected, but demo provision gives neither org_admin nor observer. Bundle names are never an authorization-code substitute for capability checks.

## 5. Evaluation order and denial semantics

| Step | Check | On failure | `error.code` |
| --- | --- | --- | --- |
| 1. identity | Valid, ACTIVE, unexpired session (SES-11, SES-15) | `401` | `UNAUTHENTICATED` |
| 2. membership | ACTIVE Membership in the requested organization (TEN-8, TEN-10) | `403` | `FORBIDDEN` |
| 3. scope | Requested tuple exactly matches an authorized scope; zero or ambiguous selection fails (TEN-6, TEN-7, TEN-9) | `403` | `FORBIDDEN` |
| 4. capability | A held bundle includes the operation capability (AUTHZ-7, AUTHZ-13) | `403` | `FORBIDDEN` |
| 5. target | Target resolved server-side and inside actor scope; wrong tenant / location / reporting scope / nonexistent all identical (AUTHZ-14, AUTHZ-16) | `404` | `NOT_FOUND` |
| 6. entitlement | Organization-owned entitlement does not remove the capability effect (AUTHZ-8, AUTHZ-21) | `403` | `FORBIDDEN` |

After authorization passes:

| Stage | Status | `error.code` | Rule |
| --- | --- | --- | --- |
| request body schema | `400` | `INVALID_REQUEST` | Evaluated after step 4 so unauthorized actors cannot probe payload schemas; before any handler effect (API-2, API-3). |
| domain precondition / state machine | `409` | `CONFLICT` | Only after steps 1-6 pass; no side effect. |
| fail-closed unmet policy dependency | `409` | `PRECONDITION_FAILED` | E.g. IssueCertification while no approved criteria version can exist. |

Exact denial bodies (envelope from `05-…`). Every 403 body is byte-identical apart from `requestId`; every 404 body is byte-identical to the nonexistent-target body apart from `requestId`:

```json
{"error":{"code":"UNAUTHENTICATED","message":"Sign in to continue.","requestId":"<uuid>"}}
{"error":{"code":"FORBIDDEN","message":"You do not have access to this action.","requestId":"<uuid>"}}
{"error":{"code":"NOT_FOUND","message":"Not found.","requestId":"<uuid>"}}
```

Rules that apply to every denial: zero persisted writes except C23-permitted denial audit; zero external effects; for steps 1–4 the handler is never invoked (AUTHZ-5, AUTHZ-15).

**Interpretation requiring approval (AUTHZ-14):** AUTHZ-14 lists "inactive" targets as non-disclosing 404. This matrix applies that to targets that fall *out of the actor's visibility* because a Membership or assignment is inactive. It does **not** apply it to lifecycle commands whose precondition *is* the target's inactive state (ReactivateIdentity targets an INACTIVE Identity). For those, a target in the wrong lifecycle state returns `409 CONFLICT` after authorization. Approving this matrix approves that reading.

## 6. Operation matrix

Canonical current authority: `c14-capability-matrix.json` version 1.1.0. Every new operation remains subject to physical admission and implementation verification.

| Operation | Capability | Scope | Bundles | Exposure | Retry |
| --- | --- | --- | --- | --- | --- |
| `AuthenticateIdentity` | `identity.credential.authenticate` | `BOOTSTRAP` | none | ROUTED | NONE (each success creates a new session; replay of the request is a new sign-in) |
| `CreateApplicationSession` | `identity.session.issue` | `INTERNAL` | none | INTERNAL | NONE (internal) |
| `ChangeCredential` | `identity.credential.change` | `SELF` | self | ROUTED | SERVER_DERIVED from token ID on the token path; SELF path is not retried automatically |
| `CreateIdentity` | `identity.identity.create` | `INTERNAL` | none | INTERNAL | Inherited from invoking operation |
| `InviteIdentity` | `identity.invitation.create` | `LOCATION` | manager, org_admin | ROUTED | CLIENT_SUPPLIED key (TXN-5: no duplicate invitations) |
| `RevokeInvitation` | `identity.invitation.revoke` | `LOCATION` | manager, org_admin | ROUTED | STATE_GUARDED: repeat on REVOKED returns 409 with no side effect |
| `AcceptInvitation` | `identity.invitation.accept` | `BOOTSTRAP` | none | ROUTED | SERVER_DERIVED from invitation ID (second consumption fails, IDN-10) |
| `RevokeSingleUseToken` | `identity.token.revoke` | `LOCATION` | manager, org_admin | ROUTED | STATE_GUARDED |
| `DeactivateIdentity` | `identity.lifecycle.deactivate` | `ORGANIZATION` | org_admin | ROUTED | STATE_GUARDED |
| `ReactivateIdentity` | `identity.lifecycle.reactivate` | `ORGANIZATION` | org_admin | ROUTED | STATE_GUARDED |
| `OffboardIdentity` | `identity.lifecycle.offboard` | `LOCATION` | manager, org_admin | ROUTED | CLIENT_SUPPLIED key; repeat returns same final state and original timestamp (IDN-19) |
| `RevokeApplicationSession` | `identity.session.revoke` | `SELF` | self | ROUTED | STATE_GUARDED: replay of a revoked cookie returns 401 |
| `CreateMembership` | `organization.membership.create` | `INTERNAL` | none | INTERNAL | Inherited |
| `DeactivateMembership` | `organization.membership.deactivate` | `LOCATION` | manager, org_admin | ROUTED | STATE_GUARDED |
| `RevokeMembership` | `organization.membership.revoke` | `ORGANIZATION` | org_admin | ROUTED | STATE_GUARDED |
| `AssignContent` | `learning.assignment.create` | `LOCATION` | manager, org_admin | ROUTED | CLIENT_SUPPLIED key (TXN-5: no duplicate assignments) |
| `StartLearningSession` | `learning.session.start` | `LOCATION` | learner | ROUTED | CLIENT_SUPPLIED key |
| `RecordProgressEvent` | `learning.progress.record` | `LOCATION` | learner | ROUTED | CLIENT_SUPPLIED key (LRN-7) |
| `CompleteLearningSession` | `learning.session.complete` | `LOCATION` | learner | ROUTED | STATE_GUARDED |
| `PublishContentPack` | `content.pack.publish` | `INTERNAL` | none | UNROUTED | Exact version/digest publication within enclosing fresh-run transaction |
| `IssueCertification` | `certification.credential.issue` | `LOCATION` | observer | ROUTED | CLIENT_SUPPLIED key (CERT-10) |
| `RevokeCertification` | `certification.credential.revoke` | `ORGANIZATION` | org_admin | ROUTED | STATE_GUARDED |
| `ReconcileExternalEffect` | `transaction.reconciliation.resolve` | `RECORD` | none | ROUTED | STATE_GUARDED (RESOLVED is terminal) |
| `ReadCurrentSession` | `identity.session.read` | `SELF` | self | ROUTED | N/A (safe method) |
| `ListOwnMemberships` | `organization.membership.read_self` | `SELF` | self | ROUTED | N/A (safe method) |
| `ListOwnAssignments` | `learning.assignment.read_self` | `LOCATION` | learner | ROUTED | N/A (safe method) |
| `ReadAssignedContentVersion` | `content.pack.read_assigned` | `LOCATION` | learner | ROUTED | N/A (safe method) |
| `ReadOwnLearnerState` | `learning.state.read_self` | `LOCATION` | learner | ROUTED | N/A (safe method) |
| `ListOwnCertifications` | `certification.credential.read_self` | `SELF` | self | ROUTED | N/A (safe method) |
| `ListTeam` | `organization.team.read` | `LOCATION` | manager, org_admin | ROUTED | N/A (safe method) |
| `ReadTeamMemberLearnerState` | `learning.state.read_team` | `LOCATION` | manager, org_admin | ROUTED | N/A (safe method) |
| `ListInvitations` | `identity.invitation.read` | `LOCATION` | manager, org_admin | ROUTED | N/A (safe method) |
| `VerifyCertification` | `certification.credential.verify` | `LOCATION` | manager, org_admin, observer | ROUTED | N/A (safe method) |
| `ReadAuditEvents` | `audit.event.read` | `ORGANIZATION` | org_admin | ROUTED | N/A (safe method) |
| `BeginDemoRun` | `organization.demo.begin` | `DEMO_NEW_RUN` | none | ROUTED | NON_RETRYABLE |
| `CreateDemoPersona` | `identity.demo.persona.create` | `INTERNAL` | none | INTERNAL | INHERITED_TRANSACTION |
| `SwitchDemoPersona` | `identity.demo.persona.switch` | `LOCATION` | demo_visitor | ROUTED | NON_RETRYABLE |
| `CloseDemoRun` | `organization.demo.close` | `LOCATION` | demo_visitor | ROUTED | STATE_GUARDED |
| `RevokeDemoSessions` | `identity.demo.sessions.revoke` | `INTERNAL` | none | INTERNAL | STATE_GUARDED |

## 7. Operation detail

### `AuthenticateIdentity` — `identity.credential.authenticate`

- Owner: Identity; interface: Identity application-command-boundary (APP-1)
- Target: Identity resolved from the credential proof only (password; OAuth provider subject after IDN-4 linking). Never from a client-supplied identity ID.
- Preconditions: Identity status ACTIVE (IDN-14); PIN credential type rejected: PIN authentication unavailable (IDN-30); Unknown identity, wrong secret and inactive identity return byte-identical 401 bodies
- Required success record: Success: AuthenticateIdentity audit in same transaction as session creation. Failure: credential-abuse denial record, rate-limited (OQ-AUD-3).

### `CreateApplicationSession` — `identity.session.issue`

- Owner: Identity; interface: Identity application-command-boundary (APP-1)
- Target: Existing authenticated Identity or exact fixed DemoPersona resolved through BeginDemoRun/SwitchDemoPersona synthetic admission proof.
- Preconditions: Invoked only by AuthenticateIdentity, step-up reauthentication, BeginDemoRun or SwitchDemoPersona after their respective current approved authentication/admission proof; Any credential presented before authentication is never upgraded (SES-19); Demo issuance count below 100 total historical sessions under run lock; Failed commit sets no cookie; raw secret never replay-stored
- Required success record: CreateApplicationSession action audit once for demo issuance in the enclosing transaction; top-level audit remains distinguishable.

### `ChangeCredential` — `identity.credential.change`

- Owner: Identity; interface: Identity application-command-boundary (APP-1)
- Target: SELF path: session identity. Token path (BOOTSTRAP): the identity bound to the ACTIVE SetupToken/PasswordResetToken.
- Preconditions: SELF path requires reverification of the current credential in the same request; Token path requires an ACTIVE, unexpired token; token consumed in the same transaction (IDN-26); Revokes ALL sessions of the identity atomically (OQ-IDN-3 proposed value); No manager path exists (IDN-13)
- Required success record: ChangeCredential audit + session-revocation effects in one transaction.

### `CreateIdentity` — `identity.identity.create`

- Owner: Identity; interface: Identity application-command-boundary (APP-1)
- Target: New Identity created only inside AcceptInvitation (new person) or the tenant-bootstrap procedure.
- Preconditions: Email match never links to or creates a duplicate Identity (IDN-2, OQ-IDN-4)
- Required success record: Covered by invoking operation audit (IDN-16).

### `InviteIdentity` — `identity.invitation.create`

- Owner: Identity; interface: Identity application-command-boundary (APP-1)
- Target: Invitation target is a prospective person; scope is the requested (organizationId, locationId) tuple.
- Preconditions: Invitation to an email bound to an offboarded Identity is rejected, creating no Invitation (IDN-20); Response is indistinguishable for known/unknown email (OQ-IDN-7); Delivery requires an approved email provider (OQ-TXN-2 residual); until then invitations can be created but not delivered
- Required success record: InviteIdentity audit in same transaction.
- Gate: identity_invitations has no email/recipient column at baseline; recipient storage needs schema admission.

### `RevokeInvitation` — `identity.invitation.revoke`

- Owner: Identity; interface: Identity application-command-boundary (APP-1)
- Target: Invitation resolved by ID, then checked: invitation scope tuple must be within actor scope; otherwise 404.
- Preconditions: Only PENDING -> REVOKED (IDN-24); acceptance secret unusable in the same transaction (IDN-28)
- Required success record: RevokeInvitation audit in same transaction.

### `AcceptInvitation` — `identity.invitation.accept`

- Owner: Identity; interface: Identity application-command-boundary (APP-1)
- Target: Invitation resolved from the presented acceptance secret verifier. An already-authenticated Identity may accept only after explicit reauthentication (same rule as OQ-IDN-4).
- Preconditions: Invitation PENDING and unexpired (IDN-27); Membership created only through Organization CreateMembership command boundary (IDN-27)
- Required success record: AcceptInvitation + CreateMembership (+ CreateIdentity if new) audits in one transaction.

### `RevokeSingleUseToken` — `identity.token.revoke`

- Owner: Identity; interface: Identity application-command-boundary (APP-1)
- Target: Token resolved by ID; bound identity must be in actor visibility (MGR-3 for manager); otherwise 404.
- Preconditions: Only ACTIVE -> REVOKED (IDN-26)
- Required success record: RevokeSingleUseToken audit.
- Gate: No registered command ISSUES SetupToken/PasswordResetToken; revocation is grantable but issuance requires a C01 semantic change.

### `DeactivateIdentity` — `identity.lifecycle.deactivate`

- Owner: Identity; interface: Identity application-command-boundary (APP-1)
- Target: Identity resolved by ID through actor organization memberships; otherwise 404.
- Preconditions: Only ACTIVE -> INACTIVE (IDN-21); GLOBAL-EFFECT GUARD: every non-REVOKED Membership of the target belongs to the actor organization
- Required success record: DeactivateIdentity + IdentityDeactivated + session revocation in one transaction.
- Gate: Multi-organization targets are BLOCKED pending the global Identity lifecycle policy recorded under OQ-TEN-3.

### `ReactivateIdentity` — `identity.lifecycle.reactivate`

- Owner: Identity; interface: Identity application-command-boundary (APP-1)
- Target: Identity resolved by ID through actor organization memberships (including INACTIVE memberships); otherwise 404.
- Preconditions: Only INACTIVE -> ACTIVE (IDN-21); Same GLOBAL-EFFECT GUARD as DeactivateIdentity
- Required success record: ReactivateIdentity + IdentityReactivated in one transaction.
- Gate: Same multi-organization block as DeactivateIdentity.

### `OffboardIdentity` — `identity.lifecycle.offboard`

- Owner: Identity; interface: Identity application-command-boundary (APP-1)
- Target: Manager: target must be a direct report within the location scope (MGR-3, registered by #74). org_admin: any member of the organization.
- Preconditions: One shared identity lifecycle service (IDN-17, MGR-8); Same GLOBAL-EFFECT GUARD as DeactivateIdentity
- Required success record: OffboardIdentity + IdentityOffboarded + revocations in one transaction (IDN-18).
- Gate: Multi-organization targets BLOCKED (OQ-TEN-3 global-lifecycle policy). Manager grant is empty until ReportingRelationship is registered.

### `RevokeApplicationSession` — `identity.session.revoke`

- Owner: Identity; interface: Identity application-command-boundary (APP-1)
- Target: Session resolved by ID and must belong to the session identity; otherwise 404. Logout targets the presented session.
- Preconditions: Only ACTIVE -> REVOKED (SES-20); Logout response expires the cookie (SES-13); Unsafe method: Origin check required (OQ-SES-5)
- Required success record: RevokeApplicationSession audit (atomic session audit already connected at baseline).

### `CreateMembership` — `organization.membership.create`

- Owner: Organization; interface: Organization application-command-boundary (APP-1)
- Target: Invoked by AcceptInvitation (or tenant bootstrap) with the invitation's bound scope tuple. BeginDemoRun may also create exactly the two fixed persona Memberships at its new run location.
- Preconditions: New Membership starts ACTIVE (TEN-18)
- Required success record: For demo construction, CreateMembership action audit plus Membership creation lifecycle snapshot in the enclosing transaction.

### `DeactivateMembership` — `organization.membership.deactivate`

- Owner: Organization; interface: Organization application-command-boundary (APP-1)
- Target: Membership resolved by ID; manager: membership location equals actor location AND member is a direct report. Otherwise 404.
- Preconditions: Only ACTIVE -> INACTIVE (TEN-18)
- Required success record: DeactivateMembership + MembershipDeactivated in one transaction.

### `RevokeMembership` — `organization.membership.revoke`

- Owner: Organization; interface: Organization application-command-boundary (APP-1)
- Target: Membership resolved by ID within actor organization; otherwise 404.
- Preconditions: Only INACTIVE -> REVOKED; REVOKED terminal (TEN-18, TEN-19)
- Required success record: RevokeMembership + MembershipRevoked in one transaction.

### `AssignContent` — `learning.assignment.create`

- Owner: Learning; interface: Learning application-command-boundary (APP-1)
- Target: Learner resolved by ID through MGR-3 visibility (manager) or org membership (org_admin); ContentPack version resolved by exact version/digest (CNT-2). Otherwise 404.
- Preconditions: Published canonical exact version/digest and valid schema; Synthetic ContentPack owned by the same fresh run organization; non-demo catalog policy is not selected; Current active target learner Membership and direct-report/scope eligibility; At most ten assignments per run under shared run fence; fresh deliberate key creates distinct practice assignment
- Required success record: AssignContent action audit plus Assignment lifecycle creation snapshot atomically; no candidate ContentAssigned event.
- Gate: Only the approved synthetic ownership/availability policy is registered; physical admission and implementation remain separately gated.

### `StartLearningSession` — `learning.session.start`

- Owner: Learning; interface: Learning application-command-boundary (APP-1)
- Target: Assignment resolved by ID; must be assigned to the session identity within an ACTIVE learner Membership; otherwise 404.
- Preconditions: Assignment ACTIVE and content version valid (LRN-2); Requires connectivity (LRN-12); Current demo run fence and fixed allowlist for synthetic personas; One LearningSession per Assignment; fresh second start conflicts; at most ten sessions per run
- Required success record: StartLearningSession action audit in same transaction; no candidate LearningSessionStarted event is admitted.

### `RecordProgressEvent` — `learning.progress.record`

- Owner: Learning; interface: Learning application-command-boundary (APP-1)
- Target: LearningSession resolved by ID; must belong to session identity; otherwise 404.
- Preconditions: Session ACTIVE (LRN-3); Event records content identity + version (LRN-10); Current demo run fence and fixed allowlist for synthetic personas; Next ordered block only; selected option in authored bounds; server evaluation only; at most 30 accepted responses per run
- Required success record: Canonical immutable response event plus receipt atomically; no mandatory success audit by default and no candidate ProgressRecorded business event.

### `CompleteLearningSession` — `learning.session.complete`

- Owner: Learning; interface: Learning application-command-boundary (APP-1)
- Target: LearningSession resolved by ID; must belong to session identity; otherwise 404.
- Preconditions: Only ACTIVE -> COMPLETED (LRN-3); Current demo run fence and fixed allowlist for synthetic personas; All ordered required responses recorded; correctness is not a completion gate; terminal completion preserves original timestamp on repeats
- Required success record: CompleteLearningSession action audit in same transaction; no candidate LearningSessionCompleted event is admitted.

### `PublishContentPack` — `content.pack.publish`

- Owner: Content; interface: Content application-command-boundary (APP-1)
- Target: Fresh run Organization-owned canonical synthetic ContentPack only, invoked by BeginDemoRun fixed-template graph.
- Preconditions: Frozen synthetic template only; Canonical schema version and exact SemVer 2.0/digest validation; Fresh run ownership and immutable publication; no customer approval claim
- Required success record: PublishContentPack action audit in same transaction.
- Gate: General customer/global-catalog publication remains blocked and ungranted.

### `IssueCertification` — `certification.credential.issue`

- Owner: Certification; interface: Certification application-command-boundary (APP-1)
- Target: Learner resolved by ID; must hold ACTIVE learner Membership in the same organization and location; otherwise 404.
- Preconditions: Actor != learner (CERT-15); Active learner membership and active assignment (CERT-1, CERT-2); Approved criteria version bound (CERT-4) — impossible until OQ-CERT-2 is resolved; Evidence: checklist + observation note only (OQ-CERT-3)
- Required success record: IssueCertification + CertificationIssued atomically (CERT-9).
- Gate: Every request fails closed with 409 PRECONDITION_FAILED until OQ-CERT-2 supplies an approver and an approved criteria version exists.

### `RevokeCertification` — `certification.credential.revoke`

- Owner: Certification; interface: Certification application-command-boundary (APP-1)
- Target: Certification resolved by ID within actor organization; otherwise 404.
- Preconditions: Reason required; record preserved (CERT-11, CERT-12)
- Required success record: RevokeCertification + CertificationRevoked.

### `ReconcileExternalEffect` — `transaction.reconciliation.resolve`

- Owner: TransactionControl; interface: TransactionControl application-command-boundary (APP-1)
- Target: ReconciliationRecord resolved by ID; principal must be registered for the record's operation_name.
- Preconditions: Record OPEN; resolves only after canonical provider readback (TXN-7, TXN-14)
- Required success record: Reconciliation audit with actor type + execution identity (AGT-14).
- Gate: No AutomationActor principal is registered (OQ-AGT-1). No human tenant role receives this capability.

### `ReadCurrentSession` — `identity.session.read`

- Owner: Identity; interface: Identity owner-query-boundary ReadCurrentSession (Application Interfaces 1.1.0)
- Target: current Identity/ApplicationSession + live DemoRun; capability data is presentation only
- Preconditions: Ordinary current authorization and target checks
- Required success record: None by default; denials per OQ-AUD-3.

### `ListOwnMemberships` — `organization.membership.read_self`

- Owner: Organization; interface: Organization owner-query-boundary ListOwnMemberships (Application Interfaces 1.1.0)
- Target: current identity only, ACTIVE memberships; scopes read from database
- Preconditions: Ordinary current authorization and target checks
- Required success record: None by default; denials per OQ-AUD-3.

### `ListOwnAssignments` — `learning.assignment.read_self`

- Owner: Learning; interface: Learning owner-query-boundary ListOwnAssignments (Application Interfaces 1.1.0)
- Target: current LOCATION learner grant; assignment.identityId == authenticated identity; scope exact
- Preconditions: Ordinary current authorization and target checks
- Required success record: None by default; denials per OQ-AUD-3.

### `ReadAssignedContentVersion` — `content.pack.read_assigned`

- Owner: Content; interface: Content owner-query-boundary ReadAssignedContentVersion (Application Interfaces 1.1.0)
- Target: current LOCATION learner grant and current ACTIVE own Assignment for exact version through Learning owner read; never return expectedOptionIndex or feedback before response
- Preconditions: Ordinary current authorization and target checks
- Required success record: None by default; denials per OQ-AUD-3.

### `ReadOwnLearnerState` — `learning.state.read_self`

- Owner: Learning; interface: Learning owner-query-boundary ReadOwnLearnerState (Application Interfaces 1.1.0)
- Target: current LOCATION learner grant and exact authenticated learner; no client learnerId
- Preconditions: Ordinary current authorization and target checks
- Required success record: None by default; denials per OQ-AUD-3.

### `ListOwnCertifications` — `certification.credential.read_self`

- Owner: Certification; interface: MISSING: Application Interfaces 1.1.0 admits only the seven named demo queries; this non-demo protected query requires a separate owner query revision.
- Target: Session identity only.
- Preconditions: Ordinary current authorization and target checks
- Required success record: None by default; denials per OQ-AUD-3.

### `ListTeam` — `organization.team.read`

- Owner: Organization; interface: Organization owner-query-boundary ListTeam (Application Interfaces 1.1.0)
- Target: current manager capability plus exact direct-report scope; no arbitrary people or public profiles
- Preconditions: Ordinary current authorization and target checks
- Required success record: None by default; denials per OQ-AUD-3.
- Gate: Manager result is empty until ReportingRelationship exists.

### `ReadTeamMemberLearnerState` — `learning.state.read_team`

- Owner: Learning; interface: Learning owner-query-boundary ReadTeamMemberLearnerState (Application Interfaces 1.1.0)
- Target: same authoritative current visibility as ListTeam (manager direct reports intersected with scope; org_admin organization membership); this demo grants only manager, never org_admin
- Preconditions: Ordinary current authorization and target checks
- Required success record: None by default; denials per OQ-AUD-3.

### `ListInvitations` — `identity.invitation.read`

- Owner: Identity; interface: MISSING: Application Interfaces 1.1.0 admits only the seven named demo queries; this non-demo protected query requires a separate owner query revision.
- Target: Invitations whose scope tuple is within actor scope.
- Preconditions: Ordinary current authorization and target checks
- Required success record: None by default; denials per OQ-AUD-3.

### `VerifyCertification` — `certification.credential.verify`

- Owner: Certification; interface: MISSING: Application Interfaces 1.1.0 admits only the seven named demo queries; this non-demo protected query requires a separate owner query revision.
- Target: Certification issued within actor organization/location scope; non-public fields only per registry (CERT-13, CERT-14).
- Preconditions: Ordinary current authorization and target checks
- Required success record: None by default; denials per OQ-AUD-3.

### `ReadAuditEvents` — `audit.event.read`

- Owner: AuditLifecycle; interface: MISSING: Application Interfaces 1.1.0 admits only the seven named demo queries; this non-demo protected query requires a separate owner query revision.
- Target: Audit events whose organization equals actor organization (AUD-10).
- Preconditions: Ordinary current authorization and target checks
- Required success record: None by default; denials per OQ-AUD-3.
- Gate: AuditEvent entity is candidate; storage not admitted.

### `BeginDemoRun` — `organization.demo.begin`

- Owner: Organization; interface: Organization application-command-boundary (APP-1)
- Target: domains/demo-runtime/proposal-0.1.0/demo-boundary.md#five-new-commands-no-hidden-general-provisioning-path
- Preconditions: Exact package-defined command proof, scope, limits and transaction invariants; no general provisioning or foreign writes
- Required success record: BeginDemoRun finite typed action audit in owning transaction; required lifecycle history per approved definition.
- Gate: Physical admission, implementation proof and runtime mounting are separate gates.

### `CreateDemoPersona` — `identity.demo.persona.create`

- Owner: Identity; interface: Identity application-command-boundary (APP-1)
- Target: domains/demo-runtime/proposal-0.1.0/demo-boundary.md#five-new-commands-no-hidden-general-provisioning-path
- Preconditions: Exact package-defined command proof, scope, limits and transaction invariants; no general provisioning or foreign writes
- Required success record: CreateDemoPersona finite typed action audit in owning transaction; required lifecycle history per approved definition.
- Gate: Physical admission, implementation proof and runtime mounting are separate gates.

### `SwitchDemoPersona` — `identity.demo.persona.switch`

- Owner: Identity; interface: Identity application-command-boundary (APP-1)
- Target: domains/demo-runtime/proposal-0.1.0/demo-boundary.md#five-new-commands-no-hidden-general-provisioning-path
- Preconditions: Exact package-defined command proof, scope, limits and transaction invariants; no general provisioning or foreign writes
- Required success record: SwitchDemoPersona finite typed action audit in owning transaction; required lifecycle history per approved definition.
- Gate: Physical admission, implementation proof and runtime mounting are separate gates.

### `CloseDemoRun` — `organization.demo.close`

- Owner: Organization; interface: Organization application-command-boundary (APP-1)
- Target: domains/demo-runtime/proposal-0.1.0/demo-boundary.md#five-new-commands-no-hidden-general-provisioning-path
- Preconditions: Exact package-defined command proof, scope, limits and transaction invariants; no general provisioning or foreign writes
- Required success record: CloseDemoRun finite typed action audit in owning transaction; required lifecycle history per approved definition.
- Gate: Physical admission, implementation proof and runtime mounting are separate gates.

### `RevokeDemoSessions` — `identity.demo.sessions.revoke`

- Owner: Identity; interface: Identity application-command-boundary (APP-1)
- Target: domains/demo-runtime/proposal-0.1.0/demo-boundary.md#five-new-commands-no-hidden-general-provisioning-path
- Preconditions: Exact package-defined command proof, scope, limits and transaction invariants; no general provisioning or foreign writes
- Required success record: RevokeDemoSessions finite typed action audit in owning transaction; required lifecycle history per approved definition.
- Gate: Physical admission, implementation proof and runtime mounting are separate gates.

## 8. Bootstrap exceptions (exhaustive)

Only these operations run without an application session. Any other operation reached without a valid session returns 401 before scope evaluation.

| Operation | Proof accepted | Proof storage | Must never |
| --- | --- | --- | --- |
| `AuthenticateIdentity` | Password (Argon2id-verified, `06-…`); OAuth provider subject after explicit linking | Credential hash only (IDN-5) | Accept PIN (IDN-30); distinguish unknown user from wrong password; accept a bearer JWT as a session (SES-17) |
| `AcceptInvitation` | Invitation acceptance secret (32 random bytes, hashed v1 verifier) | `identity_invitations.secret_verifier` | Link to an existing Identity by email match; accept after 7 days; accept twice |
| `ChangeCredential` (token path) | ACTIVE SetupToken (15 min) or PasswordResetToken (1 h) | `identity_*_tokens.secret_verifier` | Leave other sessions alive (OQ-IDN-3); reuse a consumed token |

Tenant bootstrap (first Organization, Location and org_admin) has **no registered command** at baseline. It cannot be performed through the API. It requires a C01 semantic change registering `CreateOrganization` and `CreateLocation` (or equivalent) and an AutomationActor or operator principal under §9. For customer provisioning no legitimate path exists: hand-inserted Organization/Location/Membership rows would bypass the command boundary (API-14) and the single canonical path rule (SYS-8), and this matrix does not authorize them.

## 9. Automation principals (OQ-AGT-1, OQ-AGT-3)

The single canonical principal registry is `governance/automation-principals.json`. Exactly `automation:demo-admission-v1` and `automation:demo-expiry-v1` are registered by #82. The first allocates only a new DEMO_ONLY scope through the frozen internal graph; the second enumerates at most 100 due synthetic runs and terminalizes one exact run per transaction. Neither has customer, cross-tenant, deletion or general internal-code authority.

Their exact in-process dispatcher authentication is immutable and boot-validated, never supplied by request headers/body/environment strings. Missing or contradictory configuration disables admission/cleanup. Registration does not set runtime_enabled or provision credentials. CI and development tooling remain DevelopmentAgents with zero product capabilities; the C21 schema-migration exception remains unchanged. Every other job still needs named individual adoption.

## 10. Conditional and blocked grants

| Operation | Limit | Exact unblock condition |
| --- | --- | --- |
| `DeactivateIdentity`, `ReactivateIdentity`, `OffboardIdentity` | GLOBAL-EFFECT GUARD: allowed only when every non-REVOKED Membership of the target belongs to the actor's organization. Otherwise 404, byte-identical to a nonexistent target, so the actor learns nothing about other tenants (TEN-14). | Owner-approved global Identity lifecycle policy (recorded as required in the OQ-TEN-3 resolution). Until then a multi-organization person can only lose access to one organization through `DeactivateMembership`/`RevokeMembership`. |
| `OffboardIdentity`, `ListTeam`, `ReadTeamMemberLearnerState`, manager `DeactivateMembership` | Manager visibility = direct reports ∩ location (MGR-3, registered by #74). Exact immutable demo ReportingRelationship is registered; ordinary/customer reporting policy is not broadened. | Fresh physical admission and implementation evidence for the exact registered relationship. |
| `AssignContent` | Organization-owned synthetic content only; ordinary/customer availability remains unselected | Exact demo C31 definitions plus physical admission and implementation evidence |
| `PublishContentPack` | INTERNAL/UNROUTED synthetic template only through BeginDemoRun; no bundle grant | General customer/global-catalog publication remains blocked |
| `IssueCertification` | Always `409 PRECONDITION_FAILED` | `OQ-CERT-2` approver + an approved criteria version |
| `ReconcileExternalEffect` | BLOCKED | A separately approved principal with the reconciliation capability; demo principals do not qualify |
| `InviteIdentity` | Created but not deliverable; no recipient column | Email provider (OQ-TXN-2 residual) + schema admission for recipient |

## 11. Remaining gaps and narrowed demo closure

No general customer/bootstrap, token issuance, invitation-delivery, OAuth-linking, certification or reconciliation path is enabled by this package. Those prior gates remain. BeginDemoRun creates only its fresh synthetic scope; ContentPack ownership and ReportingRelationship are selected only as expressly defined by the approved package. Seven named protected queries have logical Application Interfaces 1.1.0 authority; the other four prior query interfaces remain absent. All physical and runtime proofs are still separate.

## 12. Test matrix

`c14-negative-test-matrix.json` version 1.1.0 contains 519 specified cases and 11 registry cases. These are required tests, not evidence of runtime success. The superseded 0.2.0 file preserves baseline cases. Current cases include scope correction, unrouteable internal commands, named principal denial, run/session expiry, quota/capacity, and current-authority-before-receipt checks.

## 13. Historical #75 registration steps (preserved context)

1. Open a SYS-21 GitHub issue naming C01, C14, and C02.
2. C01 semantic change: add the 34 capability identifiers to `kernel/capabilities.json` as `candidate`, then promote to `approved` with this matrix as `approval_basis`.
3. C14 1.2.0 → 1.3.0: AUTHZ-19 names `governance/proposals/2026-10-05-decision-closure/c14-capability-matrix.json` (moved to its permanent path, e.g. `governance/authorization/capability-matrix.json`) as the approved set; mark OQ-AUTHZ-1 Resolved `NEW_V2_MATRIX`.
4. C02 1.0.3 → 1.1.0: AGT-9 names `governance/automation-principals.json`; mark OQ-AGT-1 and OQ-AGT-3 Resolved.
5. Record the approval in `contracts/APPROVAL-RECORD.md`; regenerate the owner inventory; confirm the unresolved count drops by exactly 3.

## 14. Historical #75 Definition of Done (not current evidence)

| Gate | Evidence | Truth state now |
| --- | --- | --- |
| Matrix approved | APPROVAL-RECORD entry naming C14 1.3.0 | UNKNOWN (not done) |
| Identifiers registered | `kernel/capabilities.json` has exactly the 34 IDs | UNKNOWN |
| Registry implemented | One registry module; startup + CI fail on an unregistered route (AUTHZ-AC-1) | UNKNOWN |
| Tests implemented | All generated cases pass on the exact SHA; static role-name check passes (AUTHZ-AC-4) | UNKNOWN |
| Independent review | Reviewer other than the implementer (OQ-EVD-1 proposes C14 as high-risk) | UNKNOWN |

## 15. Change log

| Version | Date | Change |
| --- | --- | --- |
| 0.1.0 | 2026-10-05 | Initial proposed V2 matrix: 23 commands + 11 protected reads, 34 capabilities, 5 bundles, generated test matrix. |
| 0.2.0 | 2026-10-05 | Recomputed on `6553eb4`: traced every operation to its Application Interface (#67), copied #63 ledger state per command, added policy interfaces, 8 registry-level cases and gap 6 (no transport-facing query interfaces); MGR-1 references now cite registered MGR-3 (#74); owner chat approval recorded, registration pending #75. |

## Registered demo controls

Every synthetic session request, including SELF, additionally requires the database-current live run fence. Authorization step 6 uses the DEMO_ONLY availability projection, not an Entitlement instance. Availability and the fixed common/learner/manager operation allowlists only remove capability effect. Run lock precedes session/personas, membership/assignment/session, receipt/audit; current authority and clock are rechecked under that fence. The exact-record expiry path is separately bounded so it can revoke expired access. Exact policy and schema sources: `domains/demo-runtime/proposal-0.1.0/demo-boundary.md`, `domains/demo-runtime/proposal-0.1.0/authority-and-audit.md`, `domains/demo-runtime/proposal-0.1.0/learning-definition.md`.
