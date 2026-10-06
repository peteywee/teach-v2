<!--tos-doc
{
  "doc_id": "TEACH-PROP-DCS-02",
  "class": "decision-table",
  "version": "0.2.0",
  "claims_truth_state": "declared",
  "status": "proposed",
  "owner": "Patrick Craven, Top Shelf Service LLC",
  "created_on": "2026-10-05",
  "updated_on": "2026-10-05",
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
  ]
}
-->

# C14 V2 Authorization Capability Matrix

| Field | Value |
| --- | --- |
| Status | `proposed` — no capability, bundle or grant here is authority until registered (SYS-19, SYS-34) |
| Resolves if approved | `OQ-AUTHZ-1` (AUTHZ-19), `OQ-AGT-1` (AGT-9), `OQ-AGT-3` |
| Supports | `OQ-MGR-2` (registration in `06-…`). Depends on rows already registered by #74: MGR-3 manager visibility, TEN-7 scope tuple, TEN-15 membership model, CERT-13 private verification; and AUTHZ-20 (#73). |
| Owner decision | Approved in chat 2026-10-05 04:05 America/Chicago. Registration PENDING under SYS-21 #75; issue #67 requires the matrix to stay `PROPOSED` with runtime BLOCKED until then. |
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
| HumanActor | Via Membership grants → bundles | Application session cookie (C12) | The only class holding bundles |
| AutomationActor | Explicit capability list per registered principal (§9) | Workload credential (secret-version reference only) | Zero principals registered at baseline |
| RuntimeAgent | None | — | Disabled (OQ-AGT-2, see `08-…`) |
| DevelopmentAgent | None | — | CI jobs, Claude, ChatGPT, Codex. Not product actors (OQ-AGT-1 answer) |
| Unauthenticated requester | Only the `BOOTSTRAP` operations in §8 | Credential proof or single-use secret in the request | Not an AGT-6 class; it becomes a HumanActor only after a session exists |

## 4. Scopes and bundles

| Scope | Exact rule |
| --- | --- |
| `BOOTSTRAP` | No application session. Authority comes only from a presented credential proof or single-use secret verified server-side. Membership/scope steps are not evaluated; the operation never reads or writes tenant data beyond the secret's own bound target. |
| `SELF` | Target identity is the session identity, resolved server-side. No client-supplied identity ID is accepted. Membership step is skipped; capability comes from the `self` baseline bundle held by every ACTIVE Identity. |
| `LOCATION` | Request carries an explicit (organizationId, locationId) tuple (TEN-2). Actor must hold an ACTIVE Membership for exactly that organization and location, or an ACTIVE organization-wide Membership for that organization. |
| `ORGANIZATION` | Request carries an explicit organizationId. Actor must hold an ACTIVE organization-wide Membership (locationId NULL) for that organization. |
| `RECORD` | AutomationActor only. Scope is the record's immutable `authoritative_scope`; the principal must be registered for that operation and scope class (AGT-9). |
| `INTERNAL` | Not exposed on any route and holds no grant. Invoked only inside another governed operation's transaction by the owning module's command boundary. |
| `BLOCKED` | No bundle holds the capability. Every request fails closed (403 when routed). Unblocking requires the named dependency. |

| Bundle | Holder | Scope | Capabilities |
| --- | --- | --- | --- |
| `self` | Every ACTIVE Identity, independent of membership | `SELF` | `certification.credential.read_self`, `identity.credential.change`, `identity.session.read`, `identity.session.revoke`, `organization.membership.read_self` |
| `learner` | Holder of an ACTIVE learner grant on a Membership | `LOCATION` | `content.pack.read_assigned`, `learning.assignment.read_self`, `learning.progress.record`, `learning.session.complete`, `learning.session.start`, `learning.state.read_self` |
| `observer` | Holder of an ACTIVE observer grant on a Membership | `LOCATION` | `certification.credential.issue`, `certification.credential.verify` |
| `manager` | Holder of an ACTIVE manager grant on a location Membership | `LOCATION` | `certification.credential.verify`, `identity.invitation.create`, `identity.invitation.read`, `identity.invitation.revoke`, `identity.lifecycle.offboard`, `identity.token.revoke`, `learning.assignment.create`, `learning.state.read_team`, `organization.membership.deactivate`, `organization.team.read` |
| `org_admin` | Holder of an ACTIVE org_admin grant on an organization-wide Membership (locationId NULL) | `ORGANIZATION` | `audit.event.read`, `certification.credential.revoke`, `certification.credential.verify`, `identity.invitation.create`, `identity.invitation.read`, `identity.invitation.revoke`, `identity.lifecycle.deactivate`, `identity.lifecycle.offboard`, `identity.lifecycle.reactivate`, `identity.token.revoke`, `learning.assignment.create`, `learning.state.read_team`, `organization.membership.deactivate`, `organization.membership.revoke`, `organization.team.read` |

Bundle rules:

- A Membership carries zero or more grants. A grant names one bundle. Grants on a location Membership apply only to that (organizationId, locationId). Grants on an organization-wide Membership (`locationId` NULL) apply to every location of that organization.
- An actor's capability set for a request = union of capabilities of bundles granted on ACTIVE Memberships that match the validated scope tuple, plus `self`.
- `org_admin` includes the manager operations at organization scope and is **not** narrowed by reporting relationships. This is a proposed choice the owner approves with this matrix; MGR-3 (registered by #74) narrows the `manager` bundle only.
- Bundle names never appear in authorization code (AUTHZ-AC-4 static check).

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

| # | Operation | Kind | Capability | Scope | Bundles | Grant state | Owner / interface | Ledger (#63) | Idempotency (proposed) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `AuthenticateIdentity` | command | `identity.credential.authenticate` | `BOOTSTRAP` | — | `PROPOSED` | Identity / command boundary | BLOCKED | NONE (each success creates a new session; replay of the request is a new sign-in) |
| 2 | `CreateApplicationSession` | command | `identity.session.issue` | `INTERNAL` | — | `PROPOSED` | Identity / command boundary | PARTIAL | NONE (internal) |
| 3 | `ChangeCredential` | command | `identity.credential.change` | `SELF` | `self` | `PROPOSED` | Identity / command boundary | BLOCKED | SERVER_DERIVED from token ID on the token path; SELF path is not retried automatically |
| 4 | `CreateIdentity` | command | `identity.identity.create` | `INTERNAL` | — | `PROPOSED` | Identity / command boundary | PARTIAL | Inherited from invoking operation |
| 5 | `InviteIdentity` | command | `identity.invitation.create` | `LOCATION` | `manager`, `org_admin` | `PROPOSED` | Identity / command boundary | PARTIAL | CLIENT_SUPPLIED key (TXN-5: no duplicate invitations) |
| 6 | `RevokeInvitation` | command | `identity.invitation.revoke` | `LOCATION` | `manager`, `org_admin` | `PROPOSED` | Identity / command boundary | PARTIAL | STATE_GUARDED: repeat on REVOKED returns 409 with no side effect |
| 7 | `AcceptInvitation` | command | `identity.invitation.accept` | `BOOTSTRAP` | — | `PROPOSED` | Identity / command boundary | PARTIAL | SERVER_DERIVED from invitation ID (second consumption fails, IDN-10) |
| 8 | `RevokeSingleUseToken` | command | `identity.token.revoke` | `LOCATION` | `manager`, `org_admin` | `PROPOSED` | Identity / command boundary | PARTIAL | STATE_GUARDED |
| 9 | `DeactivateIdentity` | command | `identity.lifecycle.deactivate` | `ORGANIZATION` | `org_admin` | `CONDITIONAL` | Identity / command boundary | PARTIAL | STATE_GUARDED |
| 10 | `ReactivateIdentity` | command | `identity.lifecycle.reactivate` | `ORGANIZATION` | `org_admin` | `CONDITIONAL` | Identity / command boundary | PARTIAL | STATE_GUARDED |
| 11 | `OffboardIdentity` | command | `identity.lifecycle.offboard` | `LOCATION` | `manager`, `org_admin` | `CONDITIONAL` | Identity / command boundary | BLOCKED | CLIENT_SUPPLIED key; repeat returns same final state and original timestamp (IDN-19) |
| 12 | `RevokeApplicationSession` | command | `identity.session.revoke` | `SELF` | `self` | `PROPOSED` | Identity / command boundary | PARTIAL | STATE_GUARDED: replay of a revoked cookie returns 401 |
| 13 | `CreateMembership` | command | `organization.membership.create` | `INTERNAL` | — | `PROPOSED` | Organization / command boundary | BLOCKED | Inherited |
| 14 | `DeactivateMembership` | command | `organization.membership.deactivate` | `LOCATION` | `manager`, `org_admin` | `PROPOSED` | Organization / command boundary | BLOCKED | STATE_GUARDED |
| 15 | `RevokeMembership` | command | `organization.membership.revoke` | `ORGANIZATION` | `org_admin` | `PROPOSED` | Organization / command boundary | BLOCKED | STATE_GUARDED |
| 16 | `AssignContent` | command | `learning.assignment.create` | `LOCATION` | `manager`, `org_admin` | `CONDITIONAL` | Learning / command boundary | BLOCKED | CLIENT_SUPPLIED key (TXN-5: no duplicate assignments) |
| 17 | `StartLearningSession` | command | `learning.session.start` | `SELF` | `learner` | `PROPOSED` | Learning / command boundary | PARTIAL | CLIENT_SUPPLIED key |
| 18 | `RecordProgressEvent` | command | `learning.progress.record` | `SELF` | `learner` | `PROPOSED` | Learning / command boundary | BLOCKED | CLIENT_SUPPLIED key (LRN-7) |
| 19 | `CompleteLearningSession` | command | `learning.session.complete` | `SELF` | `learner` | `PROPOSED` | Learning / command boundary | PARTIAL | STATE_GUARDED |
| 20 | `PublishContentPack` | command | `content.pack.publish` | `BLOCKED` | — | `BLOCKED` | Content / command boundary | BLOCKED | N/A while blocked |
| 21 | `IssueCertification` | command | `certification.credential.issue` | `LOCATION` | `observer` | `CONDITIONAL` | Certification / command boundary | BLOCKED | CLIENT_SUPPLIED key (CERT-10) |
| 22 | `RevokeCertification` | command | `certification.credential.revoke` | `ORGANIZATION` | `org_admin` | `PROPOSED` | Certification / command boundary | BLOCKED | STATE_GUARDED |
| 23 | `ReconcileExternalEffect` | command | `transaction.reconciliation.resolve` | `RECORD` | — | `BLOCKED` | TransactionControl / command boundary | PARTIAL | STATE_GUARDED (RESOLVED is terminal) |
| 24 | `ReadCurrentSession` | query | `identity.session.read` | `SELF` | `self` | `PROPOSED` | Identity / **missing query interface** | n/a (read) | N/A (safe method) |
| 25 | `ListOwnMemberships` | query | `organization.membership.read_self` | `SELF` | `self` | `PROPOSED` | Organization / **missing query interface** | n/a (read) | N/A (safe method) |
| 26 | `ListOwnAssignments` | query | `learning.assignment.read_self` | `LOCATION` | `learner` | `PROPOSED` | Learning / **missing query interface** | n/a (read) | N/A (safe method) |
| 27 | `ReadAssignedContentVersion` | query | `content.pack.read_assigned` | `LOCATION` | `learner` | `PROPOSED` | Content / **missing query interface** | n/a (read) | N/A (safe method) |
| 28 | `ReadOwnLearnerState` | query | `learning.state.read_self` | `LOCATION` | `learner` | `PROPOSED` | Learning / **missing query interface** | n/a (read) | N/A (safe method) |
| 29 | `ListOwnCertifications` | query | `certification.credential.read_self` | `SELF` | `self` | `PROPOSED` | Certification / **missing query interface** | n/a (read) | N/A (safe method) |
| 30 | `ListTeam` | query | `organization.team.read` | `LOCATION` | `manager`, `org_admin` | `CONDITIONAL` | Organization / **missing query interface** | n/a (read) | N/A (safe method) |
| 31 | `ReadTeamMemberLearnerState` | query | `learning.state.read_team` | `LOCATION` | `manager`, `org_admin` | `CONDITIONAL` | Learning / **missing query interface** | n/a (read) | N/A (safe method) |
| 32 | `ListInvitations` | query | `identity.invitation.read` | `LOCATION` | `manager`, `org_admin` | `PROPOSED` | Identity / **missing query interface** | n/a (read) | N/A (safe method) |
| 33 | `VerifyCertification` | query | `certification.credential.verify` | `LOCATION` | `manager`, `org_admin`, `observer` | `PROPOSED` | Certification / **missing query interface** | n/a (read) | N/A (safe method) |
| 34 | `ReadAuditEvents` | query | `audit.event.read` | `ORGANIZATION` | `org_admin` | `PROPOSED` | AuditLifecycle / **missing query interface** | n/a (read) | N/A (safe method) |

Grant states: `PROPOSED` = grantable on approval. `CONDITIONAL` = grantable, but a recorded guard or missing concept limits it (see §10). `BLOCKED` = in no bundle; fails closed.

## 7. Operation detail

### `AuthenticateIdentity` — `identity.credential.authenticate`

- Kind / scope / actors: command / `BOOTSTRAP` / Unauthenticated
- Target resolution: Identity resolved from the credential proof only (password; OAuth provider subject after IDN-4 linking). Never from a client-supplied identity ID.
- Precondition: Identity status ACTIVE (IDN-14)
- Precondition: PIN credential type rejected: PIN authentication unavailable (IDN-30)
- Precondition: Unknown identity, wrong secret and inactive identity return byte-identical 401 bodies
- Audit on success: Success: AuthenticateIdentity audit in same transaction as session creation. Failure: credential-abuse denial record, rate-limited (OQ-AUD-3).
- Same-transaction participants: CreateApplicationSession (Identity, internal)
- Application Interface: Identity application-command-boundary (APP-1)
- Policy interfaces: AuthorizationDecisionInterface, AuditAppendInterface
- Ledger (#63): BLOCKED, runtime UNKNOWN, 2 missing obligations in `command-coverage.json`
- Contract refs: IDN-14, IDN-30, SES-17, SES-19

### `CreateApplicationSession` — `identity.session.issue`

- Kind / scope / actors: command / `INTERNAL` / none (internal)
- Target resolution: Identity already authenticated by the invoking operation.
- Precondition: Invoked only by AuthenticateIdentity or step-up reauthentication
- Precondition: Any credential presented before authentication is never upgraded (SES-19)
- Audit on success: Covered by the invoking operation's audit record.
- Application Interface: Identity application-command-boundary (APP-1)
- Ledger (#63): PARTIAL, runtime UNKNOWN, 2 missing obligations in `command-coverage.json`
- Contract refs: SES-1, SES-3, SES-8, SES-19

### `ChangeCredential` — `identity.credential.change`

- Kind / scope / actors: command / `SELF` / HumanActor
- Target resolution: SELF path: session identity. Token path (BOOTSTRAP): the identity bound to the ACTIVE SetupToken/PasswordResetToken.
- Precondition: SELF path requires reverification of the current credential in the same request
- Precondition: Token path requires an ACTIVE, unexpired token; token consumed in the same transaction (IDN-26)
- Precondition: Revokes ALL sessions of the identity atomically (OQ-IDN-3 proposed value)
- Precondition: No manager path exists (IDN-13)
- Audit on success: ChangeCredential audit + session-revocation effects in one transaction.
- Same-transaction participants: RevokeApplicationSession canonical path (Identity, internal)
- Application Interface: Identity application-command-boundary (APP-1)
- Policy interfaces: AuthorizationDecisionInterface, AuditAppendInterface
- Ledger (#63): BLOCKED, runtime UNKNOWN, 2 missing obligations in `command-coverage.json`
- Contract refs: IDN-13, IDN-15, IDN-26, SES-14

### `CreateIdentity` — `identity.identity.create`

- Kind / scope / actors: command / `INTERNAL` / none (internal)
- Target resolution: New Identity created only inside AcceptInvitation (new person) or the tenant-bootstrap procedure.
- Precondition: Email match never links to or creates a duplicate Identity (IDN-2, OQ-IDN-4)
- Audit on success: Covered by invoking operation audit (IDN-16).
- Application Interface: Identity application-command-boundary (APP-1)
- Ledger (#63): PARTIAL, runtime UNKNOWN, 2 missing obligations in `command-coverage.json`
- Contract refs: IDN-1, IDN-16

### `InviteIdentity` — `identity.invitation.create`

- Kind / scope / actors: command / `LOCATION` / HumanActor
- Target resolution: Invitation target is a prospective person; scope is the requested (organizationId, locationId) tuple.
- Precondition: Invitation to an email bound to an offboarded Identity is rejected, creating no Invitation (IDN-20)
- Precondition: Response is indistinguishable for known/unknown email (OQ-IDN-7)
- Precondition: Delivery requires an approved email provider (OQ-TXN-2 residual); until then invitations can be created but not delivered
- Audit on success: InviteIdentity audit in same transaction.
- Application Interface: Identity application-command-boundary (APP-1)
- Policy interfaces: AuthorizationDecisionInterface, AuditAppendInterface
- Ledger (#63): PARTIAL, runtime UNKNOWN, 2 missing obligations in `command-coverage.json`
- Contract refs: IDN-20, IDN-24, IDN-25
- **Limit:** identity_invitations has no email/recipient column at baseline; recipient storage needs schema admission.

### `RevokeInvitation` — `identity.invitation.revoke`

- Kind / scope / actors: command / `LOCATION` / HumanActor
- Target resolution: Invitation resolved by ID, then checked: invitation scope tuple must be within actor scope; otherwise 404.
- Precondition: Only PENDING -> REVOKED (IDN-24); acceptance secret unusable in the same transaction (IDN-28)
- Audit on success: RevokeInvitation audit in same transaction.
- Application Interface: Identity application-command-boundary (APP-1)
- Policy interfaces: AuthorizationDecisionInterface, AuditAppendInterface
- Ledger (#63): PARTIAL, runtime UNKNOWN, 2 missing obligations in `command-coverage.json`
- Contract refs: IDN-28

### `AcceptInvitation` — `identity.invitation.accept`

- Kind / scope / actors: command / `BOOTSTRAP` / Unauthenticated, HumanActor
- Target resolution: Invitation resolved from the presented acceptance secret verifier. An already-authenticated Identity may accept only after explicit reauthentication (same rule as OQ-IDN-4).
- Precondition: Invitation PENDING and unexpired (IDN-27)
- Precondition: Membership created only through Organization CreateMembership command boundary (IDN-27)
- Audit on success: AcceptInvitation + CreateMembership (+ CreateIdentity if new) audits in one transaction.
- Same-transaction participants: CreateIdentity (Identity, internal); CreateMembership (Organization, internal)
- Application Interface: Identity application-command-boundary (APP-1); explicit cross-domain orchestration, Identity application layer (APP-8)
- Policy interfaces: AuthorizationDecisionInterface, AuditAppendInterface
- Ledger (#63): PARTIAL, runtime UNKNOWN, 2 missing obligations in `command-coverage.json`
- Contract refs: IDN-10, IDN-27

### `RevokeSingleUseToken` — `identity.token.revoke`

- Kind / scope / actors: command / `LOCATION` / HumanActor
- Target resolution: Token resolved by ID; bound identity must be in actor visibility (MGR-3 for manager); otherwise 404.
- Precondition: Only ACTIVE -> REVOKED (IDN-26)
- Audit on success: RevokeSingleUseToken audit.
- Application Interface: Identity application-command-boundary (APP-1)
- Policy interfaces: AuthorizationDecisionInterface, AuditAppendInterface
- Ledger (#63): PARTIAL, runtime UNKNOWN, 2 missing obligations in `command-coverage.json`
- Contract refs: IDN-11, IDN-26
- **Limit:** No registered command ISSUES SetupToken/PasswordResetToken; revocation is grantable but issuance requires a C01 semantic change.

### `DeactivateIdentity` — `identity.lifecycle.deactivate`

- Kind / scope / actors: command / `ORGANIZATION` / HumanActor
- Target resolution: Identity resolved by ID through actor organization memberships; otherwise 404.
- Precondition: Only ACTIVE -> INACTIVE (IDN-21)
- Precondition: GLOBAL-EFFECT GUARD: every non-REVOKED Membership of the target belongs to the actor organization
- Audit on success: DeactivateIdentity + IdentityDeactivated + session revocation in one transaction.
- Same-transaction participants: RevokeApplicationSession canonical path (Identity, internal)
- Application Interface: Identity application-command-boundary (APP-1)
- Policy interfaces: AuthorizationDecisionInterface, AuditAppendInterface
- Ledger (#63): PARTIAL, runtime UNKNOWN, 3 missing obligations in `command-coverage.json`
- Contract refs: IDN-21, IDN-22, SES-14
- **Limit:** Multi-organization targets are BLOCKED pending the global Identity lifecycle policy recorded under OQ-TEN-3.

### `ReactivateIdentity` — `identity.lifecycle.reactivate`

- Kind / scope / actors: command / `ORGANIZATION` / HumanActor
- Target resolution: Identity resolved by ID through actor organization memberships (including INACTIVE memberships); otherwise 404.
- Precondition: Only INACTIVE -> ACTIVE (IDN-21)
- Precondition: Same GLOBAL-EFFECT GUARD as DeactivateIdentity
- Audit on success: ReactivateIdentity + IdentityReactivated in one transaction.
- Application Interface: Identity application-command-boundary (APP-1)
- Policy interfaces: AuthorizationDecisionInterface, AuditAppendInterface
- Ledger (#63): PARTIAL, runtime UNKNOWN, 3 missing obligations in `command-coverage.json`
- Contract refs: IDN-21, IDN-23
- **Limit:** Same multi-organization block as DeactivateIdentity.

### `OffboardIdentity` — `identity.lifecycle.offboard`

- Kind / scope / actors: command / `LOCATION` / HumanActor
- Target resolution: Manager: target must be a direct report within the location scope (MGR-3, registered by #74). org_admin: any member of the organization.
- Precondition: One shared identity lifecycle service (IDN-17, MGR-8)
- Precondition: Same GLOBAL-EFFECT GUARD as DeactivateIdentity
- Audit on success: OffboardIdentity + IdentityOffboarded + revocations in one transaction (IDN-18).
- Same-transaction participants: RevokeApplicationSession canonical path (Identity); RevokeSingleUseToken (Identity); DeactivateMembership/RevokeMembership (Organization command boundary)
- Application Interface: Identity application-command-boundary (APP-1); explicit cross-domain orchestration, Identity application layer (APP-8)
- Policy interfaces: AuthorizationDecisionInterface, AuditAppendInterface
- Ledger (#63): BLOCKED, runtime UNKNOWN, 2 missing obligations in `command-coverage.json`
- Contract refs: IDN-17, IDN-18, IDN-19, MGR-8
- **Limit:** Multi-organization targets BLOCKED (OQ-TEN-3 global-lifecycle policy). Manager grant is empty until ReportingRelationship is registered.

### `RevokeApplicationSession` — `identity.session.revoke`

- Kind / scope / actors: command / `SELF` / HumanActor
- Target resolution: Session resolved by ID and must belong to the session identity; otherwise 404. Logout targets the presented session.
- Precondition: Only ACTIVE -> REVOKED (SES-20)
- Precondition: Logout response expires the cookie (SES-13)
- Precondition: Unsafe method: Origin check required (OQ-SES-5)
- Audit on success: RevokeApplicationSession audit (atomic session audit already connected at baseline).
- Application Interface: Identity application-command-boundary (APP-1)
- Policy interfaces: AuthorizationDecisionInterface, AuditAppendInterface
- Ledger (#63): PARTIAL, runtime UNKNOWN, 3 missing obligations in `command-coverage.json`
- Contract refs: SES-12, SES-13, SES-20

### `CreateMembership` — `organization.membership.create`

- Kind / scope / actors: command / `INTERNAL` / none (internal)
- Target resolution: Invoked by AcceptInvitation (or tenant bootstrap) with the invitation's bound scope tuple.
- Precondition: New Membership starts ACTIVE (TEN-18)
- Audit on success: Covered by invoking operation audit.
- Application Interface: Organization application-command-boundary (APP-1)
- Ledger (#63): BLOCKED, runtime UNKNOWN, 3 missing obligations in `command-coverage.json`
- Contract refs: TEN-3, TEN-18

### `DeactivateMembership` — `organization.membership.deactivate`

- Kind / scope / actors: command / `LOCATION` / HumanActor
- Target resolution: Membership resolved by ID; manager: membership location equals actor location AND member is a direct report. Otherwise 404.
- Precondition: Only ACTIVE -> INACTIVE (TEN-18)
- Audit on success: DeactivateMembership + MembershipDeactivated in one transaction.
- Application Interface: Organization application-command-boundary (APP-1)
- Policy interfaces: AuthorizationDecisionInterface, AuditAppendInterface
- Ledger (#63): BLOCKED, runtime UNKNOWN, 2 missing obligations in `command-coverage.json`
- Contract refs: TEN-10, TEN-18

### `RevokeMembership` — `organization.membership.revoke`

- Kind / scope / actors: command / `ORGANIZATION` / HumanActor
- Target resolution: Membership resolved by ID within actor organization; otherwise 404.
- Precondition: Only INACTIVE -> REVOKED; REVOKED terminal (TEN-18, TEN-19)
- Audit on success: RevokeMembership + MembershipRevoked in one transaction.
- Application Interface: Organization application-command-boundary (APP-1)
- Policy interfaces: AuthorizationDecisionInterface, AuditAppendInterface
- Ledger (#63): BLOCKED, runtime UNKNOWN, 2 missing obligations in `command-coverage.json`
- Contract refs: TEN-18, TEN-19

### `AssignContent` — `learning.assignment.create`

- Kind / scope / actors: command / `LOCATION` / HumanActor
- Target resolution: Learner resolved by ID through MGR-3 visibility (manager) or org membership (org_admin); ContentPack version resolved by exact version/digest (CNT-2). Otherwise 404.
- Precondition: ContentPack version published and valid (CNT-3, CNT-4)
- Precondition: ContentPack available to the organization (ownership scope UNDEFINED — see PublishContentPack)
- Audit on success: AssignContent + ContentAssigned audit (MGR-7).
- Application Interface: Learning application-command-boundary (APP-1)
- Policy interfaces: AuthorizationDecisionInterface, AuditAppendInterface
- Ledger (#63): BLOCKED, runtime UNKNOWN, 4 missing obligations in `command-coverage.json`
- Contract refs: MGR-7, LRN-2, CNT-10
- **Limit:** Usable only after ContentPack ownership/availability scope is defined in C31.

### `StartLearningSession` — `learning.session.start`

- Kind / scope / actors: command / `SELF` / HumanActor
- Target resolution: Assignment resolved by ID; must be assigned to the session identity within an ACTIVE learner Membership; otherwise 404.
- Precondition: Assignment ACTIVE and content version valid (LRN-2)
- Precondition: Requires connectivity (LRN-12)
- Audit on success: StartLearningSession + LearningSessionStarted.
- Application Interface: Learning application-command-boundary (APP-1)
- Policy interfaces: AuthorizationDecisionInterface, AuditAppendInterface
- Ledger (#63): PARTIAL, runtime UNKNOWN, 2 missing obligations in `command-coverage.json`
- Contract refs: LRN-1, LRN-2, LRN-3

### `RecordProgressEvent` — `learning.progress.record`

- Kind / scope / actors: command / `SELF` / HumanActor
- Target resolution: LearningSession resolved by ID; must belong to session identity; otherwise 404.
- Precondition: Session ACTIVE (LRN-3)
- Precondition: Event records content identity + version (LRN-10)
- Audit on success: ProgressRecorded fact; audit only if classified security-sensitive (not by default).
- Application Interface: Learning application-command-boundary (APP-1)
- Policy interfaces: AuthorizationDecisionInterface, AuditAppendInterface
- Ledger (#63): BLOCKED, runtime UNKNOWN, 3 missing obligations in `command-coverage.json`
- Contract refs: LRN-3, LRN-7, LRN-10

### `CompleteLearningSession` — `learning.session.complete`

- Kind / scope / actors: command / `SELF` / HumanActor
- Target resolution: LearningSession resolved by ID; must belong to session identity; otherwise 404.
- Precondition: Only ACTIVE -> COMPLETED (LRN-3)
- Audit on success: CompleteLearningSession + LearningSessionCompleted.
- Application Interface: Learning application-command-boundary (APP-1)
- Policy interfaces: AuthorizationDecisionInterface, AuditAppendInterface
- Ledger (#63): PARTIAL, runtime UNKNOWN, 2 missing obligations in `command-coverage.json`
- Contract refs: LRN-3, LRN-5

### `PublishContentPack` — `content.pack.publish`

- Kind / scope / actors: command / `BLOCKED` / none (internal)
- Target resolution: Undefined: C31 does not state whether a ContentPack is organization-owned or a global catalog item.
- Precondition: Pack validates against declared schema version (CNT-3)
- Audit on success: N/A
- Application Interface: Content application-command-boundary (APP-1)
- Policy interfaces: AuthorizationDecisionInterface, AuditAppendInterface
- Ledger (#63): BLOCKED, runtime UNKNOWN, 2 missing obligations in `command-coverage.json`
- Contract refs: CNT-3, CNT-6, AUTHZ-20
- **Limit:** A global-catalog publish would be a cross-tenant platform capability, which AUTHZ-20 forbids. Requires a C31/C13 decision on ContentPack ownership scope; an AutomationActor content-release principal is one candidate (AGT-1).

### `IssueCertification` — `certification.credential.issue`

- Kind / scope / actors: command / `LOCATION` / HumanActor
- Target resolution: Learner resolved by ID; must hold ACTIVE learner Membership in the same organization and location; otherwise 404.
- Precondition: Actor != learner (CERT-15)
- Precondition: Active learner membership and active assignment (CERT-1, CERT-2)
- Precondition: Approved criteria version bound (CERT-4) — impossible until OQ-CERT-2 is resolved
- Precondition: Evidence: checklist + observation note only (OQ-CERT-3)
- Audit on success: IssueCertification + CertificationIssued atomically (CERT-9).
- Application Interface: Certification application-command-boundary (APP-1)
- Policy interfaces: AuthorizationDecisionInterface, AuditAppendInterface
- Ledger (#63): BLOCKED, runtime UNKNOWN, 3 missing obligations in `command-coverage.json`
- Contract refs: CERT-1, CERT-4, CERT-5, CERT-9, CERT-15
- **Limit:** Every request fails closed with 409 PRECONDITION_FAILED until OQ-CERT-2 supplies an approver and an approved criteria version exists.

### `RevokeCertification` — `certification.credential.revoke`

- Kind / scope / actors: command / `ORGANIZATION` / HumanActor
- Target resolution: Certification resolved by ID within actor organization; otherwise 404.
- Precondition: Reason required; record preserved (CERT-11, CERT-12)
- Audit on success: RevokeCertification + CertificationRevoked.
- Application Interface: Certification application-command-boundary (APP-1)
- Policy interfaces: AuthorizationDecisionInterface, AuditAppendInterface
- Ledger (#63): BLOCKED, runtime UNKNOWN, 2 missing obligations in `command-coverage.json`
- Contract refs: CERT-11, CERT-12

### `ReconcileExternalEffect` — `transaction.reconciliation.resolve`

- Kind / scope / actors: command / `RECORD` / AutomationActor
- Target resolution: ReconciliationRecord resolved by ID; principal must be registered for the record's operation_name.
- Precondition: Record OPEN; resolves only after canonical provider readback (TXN-7, TXN-14)
- Audit on success: Reconciliation audit with actor type + execution identity (AGT-14).
- Application Interface: TransactionControl application-command-boundary (APP-1)
- Policy interfaces: AuthorizationDecisionInterface, AuditAppendInterface, ExternalProviderReadbackInterface
- Ledger (#63): PARTIAL, runtime UNKNOWN, 2 missing obligations in `command-coverage.json`
- Contract refs: TXN-7, TXN-14, AGT-9, AGT-14
- **Limit:** No AutomationActor principal is registered (OQ-AGT-1). No human tenant role receives this capability.

### `ReadCurrentSession` — `identity.session.read`

- Kind / scope / actors: query / `SELF` / HumanActor
- Target resolution: Presented session only.
- Audit on success: None by default; denials per OQ-AUD-3.
- Application Interface: MISSING: Application Interfaces 1.0.0 defines command entry points (APP-1) and module-to-module reads (APP-6) only; a transport-facing owner query interface is required (Application Interface revision)
- Policy interfaces: AuthorizationDecisionInterface
- Contract refs: WEB-2

### `ListOwnMemberships` — `organization.membership.read_self`

- Kind / scope / actors: query / `SELF` / HumanActor
- Target resolution: Memberships of session identity only; returns the scope tuples the client may select (TEN-2).
- Audit on success: None by default; denials per OQ-AUD-3.
- Application Interface: MISSING: Application Interfaces 1.0.0 defines command entry points (APP-1) and module-to-module reads (APP-6) only; a transport-facing owner query interface is required (Application Interface revision)
- Policy interfaces: AuthorizationDecisionInterface
- Contract refs: TEN-4

### `ListOwnAssignments` — `learning.assignment.read_self`

- Kind / scope / actors: query / `LOCATION` / HumanActor
- Target resolution: Assignments of session identity in the selected scope.
- Audit on success: None by default; denials per OQ-AUD-3.
- Application Interface: MISSING: Application Interfaces 1.0.0 defines command entry points (APP-1) and module-to-module reads (APP-6) only; a transport-facing owner query interface is required (Application Interface revision)
- Policy interfaces: AuthorizationDecisionInterface
- Contract refs: LRN-2

### `ReadAssignedContentVersion` — `content.pack.read_assigned`

- Kind / scope / actors: query / `LOCATION` / HumanActor
- Target resolution: ContentPack version reachable only through an ACTIVE assignment of the session identity (CNT-10).
- Audit on success: None by default; denials per OQ-AUD-3.
- Application Interface: MISSING: Application Interfaces 1.0.0 defines command entry points (APP-1) and module-to-module reads (APP-6) only; a transport-facing owner query interface is required (Application Interface revision)
- Policy interfaces: AuthorizationDecisionInterface
- Contract refs: CNT-10

### `ReadOwnLearnerState` — `learning.state.read_self`

- Kind / scope / actors: query / `LOCATION` / HumanActor
- Target resolution: Session identity only (LRN-8).
- Audit on success: None by default; denials per OQ-AUD-3.
- Application Interface: MISSING: Application Interfaces 1.0.0 defines command entry points (APP-1) and module-to-module reads (APP-6) only; a transport-facing owner query interface is required (Application Interface revision)
- Policy interfaces: AuthorizationDecisionInterface
- Contract refs: LRN-8

### `ListOwnCertifications` — `certification.credential.read_self`

- Kind / scope / actors: query / `SELF` / HumanActor
- Target resolution: Session identity only.
- Audit on success: None by default; denials per OQ-AUD-3.
- Application Interface: MISSING: Application Interfaces 1.0.0 defines command entry points (APP-1) and module-to-module reads (APP-6) only; a transport-facing owner query interface is required (Application Interface revision)
- Policy interfaces: AuthorizationDecisionInterface
- Contract refs: CERT-1

### `ListTeam` — `organization.team.read`

- Kind / scope / actors: query / `LOCATION` / HumanActor
- Target resolution: Manager: direct reports within location (MGR-3, registered by #74). org_admin: organization members.
- Audit on success: None by default; denials per OQ-AUD-3.
- Application Interface: MISSING: Application Interfaces 1.0.0 defines command entry points (APP-1) and module-to-module reads (APP-6) only; a transport-facing owner query interface is required (Application Interface revision)
- Policy interfaces: AuthorizationDecisionInterface
- Contract refs: MGR-3, MGR-4
- **Limit:** Manager result is empty until ReportingRelationship exists.

### `ReadTeamMemberLearnerState` — `learning.state.read_team`

- Kind / scope / actors: query / `LOCATION` / HumanActor
- Target resolution: Same visibility predicate as ListTeam; persisted state only (MGR-6).
- Audit on success: None by default; denials per OQ-AUD-3.
- Application Interface: MISSING: Application Interfaces 1.0.0 defines command entry points (APP-1) and module-to-module reads (APP-6) only; a transport-facing owner query interface is required (Application Interface revision)
- Policy interfaces: AuthorizationDecisionInterface
- Contract refs: MGR-6

### `ListInvitations` — `identity.invitation.read`

- Kind / scope / actors: query / `LOCATION` / HumanActor
- Target resolution: Invitations whose scope tuple is within actor scope.
- Audit on success: None by default; denials per OQ-AUD-3.
- Application Interface: MISSING: Application Interfaces 1.0.0 defines command entry points (APP-1) and module-to-module reads (APP-6) only; a transport-facing owner query interface is required (Application Interface revision)
- Policy interfaces: AuthorizationDecisionInterface
- Contract refs: IDN-24

### `VerifyCertification` — `certification.credential.verify`

- Kind / scope / actors: query / `LOCATION` / HumanActor
- Target resolution: Certification issued within actor organization/location scope; non-public fields only per registry (CERT-13, CERT-14).
- Audit on success: None by default; denials per OQ-AUD-3.
- Application Interface: MISSING: Application Interfaces 1.0.0 defines command entry points (APP-1) and module-to-module reads (APP-6) only; a transport-facing owner query interface is required (Application Interface revision)
- Policy interfaces: AuthorizationDecisionInterface
- Contract refs: CERT-13, CERT-14

### `ReadAuditEvents` — `audit.event.read`

- Kind / scope / actors: query / `ORGANIZATION` / HumanActor
- Target resolution: Audit events whose organization equals actor organization (AUD-10).
- Audit on success: None by default; denials per OQ-AUD-3.
- Application Interface: MISSING: Application Interfaces 1.0.0 defines command entry points (APP-1) and module-to-module reads (APP-6) only; a transport-facing owner query interface is required (Application Interface revision)
- Policy interfaces: AuthorizationDecisionInterface
- Contract refs: AUD-10
- **Limit:** AuditEvent entity is candidate; storage not admitted.

## 8. Bootstrap exceptions (exhaustive)

Only these operations run without an application session. Any other operation reached without a valid session returns 401 before scope evaluation.

| Operation | Proof accepted | Proof storage | Must never |
| --- | --- | --- | --- |
| `AuthenticateIdentity` | Password (Argon2id-verified, `06-…`); OAuth provider subject after explicit linking | Credential hash only (IDN-5) | Accept PIN (IDN-30); distinguish unknown user from wrong password; accept a bearer JWT as a session (SES-17) |
| `AcceptInvitation` | Invitation acceptance secret (32 random bytes, hashed v1 verifier) | `identity_invitations.secret_verifier` | Link to an existing Identity by email match; accept after 7 days; accept twice |
| `ChangeCredential` (token path) | ACTIVE SetupToken (15 min) or PasswordResetToken (1 h) | `identity_*_tokens.secret_verifier` | Leave other sessions alive (OQ-IDN-3); reuse a consumed token |

Tenant bootstrap (first Organization, Location and org_admin) has **no registered command** at baseline. It cannot be performed through the API. It requires a C01 semantic change registering `CreateOrganization` and `CreateLocation` (or equivalent) and an AutomationActor or operator principal under §9. Until then no legitimate path exists: hand-inserted Organization/Location/Membership rows would bypass the command boundary (API-14) and the single canonical path rule (SYS-8), and this matrix does not authorize them.

## 9. Automation principals (OQ-AGT-1, OQ-AGT-3)

Registry location (proposed): `governance/automation-principals.json`, validated in CI. One record per principal:

```json
{
  "principal_id": "stable string, e.g. automation:reconciliation-worker",
  "actor_class": "AutomationActor",
  "capabilities": "explicit list of capability IDs; never a bundle name",
  "scope_class": "RECORD | ORGANIZATION (explicit organizationId)",
  "credential": "workload credential reference (secret-version ID only, never the secret, REL-6)",
  "owner": "named human owner",
  "approved_on": "ISO date",
  "removal_condition": "text",
  "audit_actor_fields": [
    "actor_type",
    "execution_identity"
  ]
}
```

Baseline inventory (verified by reading `package.json` scripts and `.github/workflows/`):

| Candidate | Classification | Product capabilities |
| --- | --- | --- |
| 45 GitHub workflows (44 producers + 1 observer) | DevelopmentAgent / CI — read-only verification | None |
| `pnpm db:migrate` → `scripts/db/migrate.ts` | C21 migration runner — the single AGT-11 exception, schema only | None |
| `pnpm self-audit`, validators, replay verifiers | DevelopmentAgent tooling | None |
| Reconciliation worker for `ReconcileExternalEffect` | **Not yet existing.** First expected AutomationActor | `transaction.reconciliation.resolve` (RECORD scope) once registered |

Result: `automation_principals: []` at baseline. Each future principal is adopted individually (NAMED_JOB_BY_JOB); no blanket grandfathering.

## 10. Conditional and blocked grants

| Operation | Limit | Exact unblock condition |
| --- | --- | --- |
| `DeactivateIdentity`, `ReactivateIdentity`, `OffboardIdentity` | GLOBAL-EFFECT GUARD: allowed only when every non-REVOKED Membership of the target belongs to the actor's organization. Otherwise 404, byte-identical to a nonexistent target, so the actor learns nothing about other tenants (TEN-14). | Owner-approved global Identity lifecycle policy (recorded as required in the OQ-TEN-3 resolution). Until then a multi-organization person can only lose access to one organization through `DeactivateMembership`/`RevokeMembership`. |
| `OffboardIdentity`, `ListTeam`, `ReadTeamMemberLearnerState`, manager `DeactivateMembership` | Manager visibility = direct reports ∩ location (MGR-3, registered by #74). No ReportingRelationship concept is registered, so the set is empty. | C01 semantic change registering a reporting relationship (Organization-owned) plus Persistence admission. |
| `AssignContent` | ContentPack availability to an organization is undefined | C31 decision on ContentPack ownership scope |
| `PublishContentPack` | BLOCKED. A global-catalog publish would be a cross-tenant platform capability (AUTHZ-20). | C31/C13 decision on ContentPack ownership; if catalog, a registered AutomationActor content-release principal |
| `IssueCertification` | Always `409 PRECONDITION_FAILED` | `OQ-CERT-2` approver + an approved criteria version |
| `ReconcileExternalEffect` | BLOCKED | First AutomationActor principal registered under §9 |
| `InviteIdentity` | Created but not deliverable; no recipient column | Email provider (OQ-TXN-2 residual) + schema admission for recipient |

## 11. Gaps found while building the matrix

These are facts about the baseline, not new decisions. Each is a C01/C31/C13 change outside this matrix.

1. **No command issues SetupToken or PasswordResetToken.** `issueIdentityToken` exists in `identity-token-service.ts`, but no C01 command authorizes it. IDN-12 (manager initiates setup) therefore has no grantable operation.
2. **No command creates Organization or Location.** Tenant bootstrap has no governed path (§8).
3. **ContentPack ownership scope is undefined** (catalog vs organization-owned).
4. **No ReportingRelationship concept** exists, so MGR-3 visibility evaluates to empty.
5. **`identity_invitations` has no recipient/email column** and **`identity_credentials` has no OAuth provider/subject columns.** Invitation delivery and OAuth linking need schema admission.

6. **No transport-facing query interface.** Application Interfaces 1.0.0 covers command entry points and module-to-module reads only. All 11 protected reads in §6 need owner query interfaces in an Application Interface revision before any read route is built (APP-6, APP-12).
## 12. Test matrix

`c14-negative-test-matrix.json` holds **495 cases** generated from §6. Distribution by expected status:

| Expected | Cases |
| --- | --- |
| `2xx` | 28 |
| `400` | 16 |
| `401` | 128 |
| `403` | 230 |
| `404` | 89 |
| `409` | 1 |
| `None` | 3 |

Per routed operation the generator emits: four session failures (401); a foreign/missing Origin case for unsafe methods (403, SES-AC-12); membership, inactive/revoked membership, missing/ambiguous tuple and wrong location (403); one case per bundle that does not hold the capability (403); nonexistent target and other-tenant target with byte-equality assertion (404); other-location, other-identity and non-direct-report targets (404); entitlement removal (403); capability revoked mid-session without re-login (403, AUTHZ-AC-7); invalid body after authorization (400); and one VALID case. Internal operations assert that no route maps to them.

Fixture actors:

- `self_only`: ACTIVE Identity, no Membership
- `learner`: learner grant @ (orgA, loc1)
- `observer`: observer grant @ (orgA, loc1)
- `manager`: manager grant @ (orgA, loc1) with direct report L1
- `org_admin`: org_admin grant @ (orgA, NULL)
- `foreign`: org_admin grant @ (orgB, NULL)

Registry-level cases (`registry_cases`, issue #67 acceptance):

| Case | Setup | Expected |
| --- | --- | --- |
| `C14-REG-UNREGISTERED-ROUTE` | A mounted route with no registry entry | CI and startup fail (AUTHZ-AC-1) |
| `C14-REG-UNKNOWN-OPERATION-REQUEST` | Request to a path that exists in code but not in the registry | Denied before handler; handler_not_invoked (AUTHZ-AC-2) |
| `C14-REG-UNKNOWN-CAPABILITY-IN-BUNDLE` | A bundle lists a capability absent from the matrix or K00 | Matrix validation fails; startup refuses to load |
| `C14-REG-UNKNOWN-SCOPE-CLASS` | An operation declares a scope not in the scopes table | Matrix validation fails |
| `C14-REG-DUPLICATE-CAPABILITY` | Two operations share one capability | Matrix validation fails (AUTHZ-2) |
| `C14-REG-DUPLICATE-OPERATION` | Two rows for one command | Matrix validation fails |
| `C14-REG-MISSING-OWNER` | An operation with no owning domain or transaction owner | Matrix validation fails (#67) |
| `C14-REG-MEMBERSHIP-SCOPE-CHANGED` | Actor membership moves to another location between two requests | Second request 403 on the old tuple without re-login (AUTHZ-10, TEN-4) |

Every 401/403 case asserts `handler_not_invoked`; every denial asserts `zero_persisted_writes` and `zero_external_effects`. A capability added without its generated cases fails `validate-decision-closure.mjs` (AUTHZ-AC-10).

## 13. Registration steps (after owner approval)

1. Open a SYS-21 GitHub issue naming C01, C14, and C02.
2. C01 semantic change: add the 34 capability identifiers to `kernel/capabilities.json` as `candidate`, then promote to `approved` with this matrix as `approval_basis`.
3. C14 1.2.0 → 1.3.0: AUTHZ-19 names `governance/proposals/2026-10-05-decision-closure/c14-capability-matrix.json` (moved to its permanent path, e.g. `governance/authorization/capability-matrix.json`) as the approved set; mark OQ-AUTHZ-1 Resolved `NEW_V2_MATRIX`.
4. C02 1.0.3 → 1.1.0: AGT-9 names `governance/automation-principals.json`; mark OQ-AGT-1 and OQ-AGT-3 Resolved.
5. Record the approval in `contracts/APPROVAL-RECORD.md`; regenerate the owner inventory; confirm the unresolved count drops by exactly 3.

## 14. Definition of Done

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
