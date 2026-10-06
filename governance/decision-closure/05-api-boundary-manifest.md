<!--tos-doc
{
  "doc_id": "TEACH-PROP-DCS-05",
  "class": "specification",
  "version": "1.0.0",
  "claims_truth_state": "declared",
  "status": "active",
  "owner": "Patrick Craven, Top Shelf Service LLC",
  "created_on": "2026-10-05",
  "updated_on": "2026-10-05",
  "baseline": {
    "repo": "peteywee/teach-v2",
    "ref": "main",
    "commit": "6553eb465e469dc9e60368cde40d259f86262997",
    "purpose": "revision baseline: main after PR #74"
  },
  "governed_by": [
    "TEACH-CON-C00",
    "TEACH-CON-C41",
    "TEACH-CON-C14"
  ],
  "resolves_if_approved": [
    "OQ-API-1",
    "OQ-API-2"
  ],
  "partially_resolves": [
    "OQ-API-3"
  ],
  "machine_sources": [
    "api-boundary-manifest.json",
    "api-error-envelope.schema.json"
  ],
  "effective_on": "2026-10-05",
  "approval": {
    "state": "approved",
    "approved_on": "2026-10-05",
    "record": "contracts/APPROVAL-RECORD.md",
    "basis": "SYS-21 #75; manifest sha256:ff7b51df1e3a235e9d226d9d7232f81c64bbeb451b359b6e0f2ea232b6e1757c"
  },
  "supersedes": [
    "TEACH-PROP-DCS-05@0.3.0"
  ]
}
-->

# API Boundary Manifest

Registered on 2026-10-05 by the owner-approved r3.1 manifest under SYS-21 #75. The normative sections below are binding policy selections; baseline facts, proposed metadata and registration instructions describe the preserved source snapshot, not current runtime evidence. Capability promotion, physical schema/executor admission, provider selection, implementation and production execution retain their separate gates. Implementation conformance: UNKNOWN.


| Field | Value |
| --- | --- |
| Status | `proposed` — **no route is authorized**. Every entry is `mounted: false`, `implemented: false`. |
| Owner decision | Approved in chat 2026-10-05 04:05 America/Chicago (decision sheet A–D). Registration PENDING under SYS-21 #75; this document stays `proposed` until it lands. |
| Resolves if approved | `OQ-API-1` (API-1), `OQ-API-2` (API-10); registers the mechanism half of `OQ-API-3` (API-13) |
| Stays open | `OQ-API-3` sunset period |
| Baseline route scan | `verification/owner-decisions/2026-10-04/route-scan.json` — **0 implemented routes** (verified) |
| Machine sources | `api-boundary-manifest.json`, `api-error-envelope.schema.json` |

## 1. Approach

The repo has zero routes, so the boundary is defined before code: the manifest is the allow-list. When routes are implemented, CI generates the mounted-route set and compares it to `routes[] + boundary_exceptions[]` where `mounted: true`. Any difference fails CI (API-6, AUTHZ-AC-1). Flipping `mounted` to `true` is a reviewed change in the same PR that adds the route and its C14 negative cases.

## 2. Boundary exceptions outside `/api/v1` (exhaustive)

| Method | Path | Purpose | Auth | State | Must not |
| --- | --- | --- | --- | --- | --- |
| `GET` | `/api/health` | process liveness (OBS-3) | NONE | `PROPOSED` | read the database; return version, dependency or host details |
| `GET` | `/api/ready` | dependency readiness (OBS-4) | NONE | `PROPOSED` | name the failing dependency in the body; return connection strings or timings |
| `GET` | `/api/auth/callback/{provider}` | OAuth provider redirect target; path stays stable across API major versions because it is registered at the provider | OAUTH_STATE_PKCE (bound to __Host-teach_oauth_flow) | `BLOCKED_UNTIL_OQ-TXN-2_PROVIDER_SELECTED` | accept a provider not in provider_allowlist (404); create a session without matching state and PKCE verifier; link by email match (OQ-IDN-4) |

Bodies and envelope policy (machine-readable as `error_envelope` on each exception in `api-boundary-manifest.json`): `/api/health` → `200 {"status":"ok"}`; `/api/ready` → `200 {"status":"ready"}` or `503 {"status":"not_ready"}`. Both are `EXEMPT_MINIMAL_STATUS_BODY`: they never use the error envelope, so a load balancer or uptime probe reads one fixed shape. The failing dependency is logged with the request ID, never returned. `/api/auth/callback/{provider}` is `STANDARD_ENVELOPE` and answers `404 NOT_FOUND` for every provider while `provider_allowlist` is empty.

Nothing else may exist outside `/api/v1`. Web pages and static assets served from the canonical origin are governed by C42, not this manifest. They MUST NOT perform state changes.

## 3. Product routes under `/api/v1`

Path parameters match `^[A-Za-z0-9_-]{1,128}$` (PROPOSED (kernel identifiers are typed opaque-id with no lexical format)). `contentVersion` matches strict SemVer `^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$` (CNT-2). A parameter that fails the pattern returns `404 NOT_FOUND` (the route does not match), never `400`, so malformed IDs and missing IDs are indistinguishable.

Scope encoding: TEN-7, registered by #74, requires an explicit typed organization/location tuple and says transport encoding follows separate authority. Application Interfaces 1.0.0 defers the HTTP method/path inventory and the error envelope to Transport Interfaces (APP-11, APP-12). This manifest is that Transport Interfaces authority. Location-scoped operations carry `{organizationId}` and `{locationId}` as path segments; organization-scoped operations carry `{organizationId}`. Path segments are chosen over headers because they cannot be stripped by an intermediary, are always present in logs with the request ID, and make a missing scope a non-match instead of an implicit default. The values select; C13/C14 decide.

| # | Method | Path | Operation | Capability | Auth | Origin check | `Idempotency-Key` |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `POST` | `/api/v1/session` | `AuthenticateIdentity` | `identity.credential.authenticate` | BOOTSTRAP_PROOF | yes | — |
| 2 | `GET` | `/api/v1/session` | `ReadCurrentSession` | `identity.session.read` | SESSION_COOKIE | no | — |
| 3 | `DELETE` | `/api/v1/session` | `RevokeApplicationSession` | `identity.session.revoke` | SESSION_COOKIE | yes | — |
| 4 | `DELETE` | `/api/v1/sessions/{sessionId}` | `RevokeApplicationSession` | `identity.session.revoke` | SESSION_COOKIE | yes | — |
| 5 | `POST` | `/api/v1/credential` | `ChangeCredential` | `identity.credential.change` | SESSION_COOKIE | yes | — |
| 6 | `POST` | `/api/v1/credential/token-change` | `ChangeCredential` | `identity.credential.change` | BOOTSTRAP_PROOF | yes | — |
| 7 | `POST` | `/api/v1/invitations/accept` | `AcceptInvitation` | `identity.invitation.accept` | BOOTSTRAP_PROOF | yes | — |
| 8 | `GET` | `/api/v1/memberships` | `ListOwnMemberships` | `organization.membership.read_self` | SESSION_COOKIE | no | — |
| 9 | `GET` | `/api/v1/certifications/mine` | `ListOwnCertifications` | `certification.credential.read_self` | SESSION_COOKIE | no | — |
| 10 | `POST` | `/api/v1/organizations/{organizationId}/locations/{locationId}/invitations` | `InviteIdentity` | `identity.invitation.create` | SESSION_COOKIE | yes | required |
| 11 | `GET` | `/api/v1/organizations/{organizationId}/locations/{locationId}/invitations` | `ListInvitations` | `identity.invitation.read` | SESSION_COOKIE | no | — |
| 12 | `POST` | `/api/v1/organizations/{organizationId}/locations/{locationId}/invitations/{invitationId}/revoke` | `RevokeInvitation` | `identity.invitation.revoke` | SESSION_COOKIE | yes | — |
| 13 | `POST` | `/api/v1/organizations/{organizationId}/locations/{locationId}/tokens/{tokenId}/revoke` | `RevokeSingleUseToken` | `identity.token.revoke` | SESSION_COOKIE | yes | — |
| 14 | `POST` | `/api/v1/organizations/{organizationId}/locations/{locationId}/members/{identityId}/offboard` | `OffboardIdentity` | `identity.lifecycle.offboard` | SESSION_COOKIE | yes | required |
| 15 | `POST` | `/api/v1/organizations/{organizationId}/locations/{locationId}/memberships/{membershipId}/deactivate` | `DeactivateMembership` | `organization.membership.deactivate` | SESSION_COOKIE | yes | — |
| 16 | `GET` | `/api/v1/organizations/{organizationId}/locations/{locationId}/team` | `ListTeam` | `organization.team.read` | SESSION_COOKIE | no | — |
| 17 | `GET` | `/api/v1/organizations/{organizationId}/locations/{locationId}/team/{identityId}/learner-state` | `ReadTeamMemberLearnerState` | `learning.state.read_team` | SESSION_COOKIE | no | — |
| 18 | `POST` | `/api/v1/organizations/{organizationId}/locations/{locationId}/assignments` | `AssignContent` | `learning.assignment.create` | SESSION_COOKIE | yes | required |
| 19 | `GET` | `/api/v1/organizations/{organizationId}/locations/{locationId}/assignments/mine` | `ListOwnAssignments` | `learning.assignment.read_self` | SESSION_COOKIE | no | — |
| 20 | `GET` | `/api/v1/organizations/{organizationId}/locations/{locationId}/content/{contentPackId}/versions/{contentVersion}` | `ReadAssignedContentVersion` | `content.pack.read_assigned` | SESSION_COOKIE | no | — |
| 21 | `POST` | `/api/v1/organizations/{organizationId}/locations/{locationId}/learning-sessions` | `StartLearningSession` | `learning.session.start` | SESSION_COOKIE | yes | required |
| 22 | `POST` | `/api/v1/organizations/{organizationId}/locations/{locationId}/learning-sessions/{learningSessionId}/progress-events` | `RecordProgressEvent` | `learning.progress.record` | SESSION_COOKIE | yes | required |
| 23 | `POST` | `/api/v1/organizations/{organizationId}/locations/{locationId}/learning-sessions/{learningSessionId}/complete` | `CompleteLearningSession` | `learning.session.complete` | SESSION_COOKIE | yes | — |
| 24 | `GET` | `/api/v1/organizations/{organizationId}/locations/{locationId}/learner-state/mine` | `ReadOwnLearnerState` | `learning.state.read_self` | SESSION_COOKIE | no | — |
| 25 | `POST` | `/api/v1/organizations/{organizationId}/locations/{locationId}/certifications` | `IssueCertification` | `certification.credential.issue` | SESSION_COOKIE | yes | required |
| 26 | `GET` | `/api/v1/organizations/{organizationId}/locations/{locationId}/certifications/{certificationId}/verification` | `VerifyCertification` | `certification.credential.verify` | SESSION_COOKIE | no | — |
| 27 | `POST` | `/api/v1/organizations/{organizationId}/identities/{identityId}/deactivate` | `DeactivateIdentity` | `identity.lifecycle.deactivate` | SESSION_COOKIE | yes | — |
| 28 | `POST` | `/api/v1/organizations/{organizationId}/identities/{identityId}/reactivate` | `ReactivateIdentity` | `identity.lifecycle.reactivate` | SESSION_COOKIE | yes | — |
| 29 | `POST` | `/api/v1/organizations/{organizationId}/memberships/{membershipId}/revoke` | `RevokeMembership` | `organization.membership.revoke` | SESSION_COOKIE | yes | — |
| 30 | `POST` | `/api/v1/organizations/{organizationId}/certifications/{certificationId}/revoke` | `RevokeCertification` | `certification.credential.revoke` | SESSION_COOKIE | yes | — |
| 31 | `GET` | `/api/v1/organizations/{organizationId}/audit-events` | `ReadAuditEvents` | `audit.event.read` | SESSION_COOKIE | no | — |

Operations with no route (internal, blocked or automation-only): `CreateApplicationSession`, `CreateIdentity`, `CreateMembership`, `PublishContentPack`, `ReconcileExternalEffect`. A route mapping to any of them fails CI. The 11 protected-read routes additionally wait for owner query interfaces in an Application Interface revision (`02-…` §11 gap 6).

`Idempotency-Key` rules (C22): header value 16–128 chars `[A-Za-z0-9_-]`; missing on a route that requires it → `400 INVALID_REQUEST`; same key + same payload hash → original response replayed; same key + different payload → `422 IDEMPOTENCY_KEY_REUSED`, no side effect (TXN-3, TXN-4).

## 4. Error envelope (OQ-API-2, API-10)

Every non-2xx response from `/api/v1` and from the OAuth callback exception uses exactly this shape. `/api/health` and `/api/ready` are exempt (§2). Schema: (`api-error-envelope.schema.json`, `additionalProperties: false` at every level):

```json
{"error":{"code":"INVALID_REQUEST","message":"The request is not valid.","requestId":"5f0c8c1e-3b7a-4c2e-9f1d-2a4b6c8d0e1f","details":[{"path":"/displayName","rule":"max_length"}]}}
```

| `code` | Status | Fixed `message` |
| --- | --- | --- |
| `UNAUTHENTICATED` | `401` | Sign in to continue. |
| `FORBIDDEN` | `403` | You do not have access to this action. |
| `NOT_FOUND` | `404` | Not found. |
| `INVALID_REQUEST` | `400` | The request is not valid. |
| `UNSUPPORTED_MEDIA_TYPE` | `415` | Send JSON. |
| `CONFLICT` | `409` | The request conflicts with the current state. |
| `PRECONDITION_FAILED` | `409` | This action is not available yet. |
| `IDEMPOTENCY_KEY_REUSED` | `422` | This idempotency key was used with a different request. |
| `RATE_LIMITED` | `429` | Too many requests. Try again later. |
| `INTERNAL_ERROR` | `500` | Something went wrong. |
| `SERVICE_UNAVAILABLE` | `503` | Service unavailable. |

Constraints:

1. `message` is a constant per code. It is never built from input, target data, SQL, stack traces or another tenant's identifiers (API-11, PRIV-4).
2. `details` appears only with `INVALID_REQUEST` and lists JSON-Pointer paths and rule names, never submitted values.
3. `requestId` is a UUID v4 generated server-side, equal to the `X-Request-Id` response header, and propagated into audit and logs (API-12, OBS-1). A client-supplied request ID is ignored.
4. All 403 bodies are identical except `requestId`; all 404 bodies are identical except `requestId` (AUTHZ-14, OQ-API-2 "identical non-disclosing denials").
5. `500` bodies never contain exception text; the exception is logged with the request ID.

## 5. Versioning and deprecation (OQ-API-3, API-13)

| Change | Allowed in `/api/v1`? |
| --- | --- |
| Add an endpoint; add an optional request field; add a response field | Yes |
| Add an error `code` | Yes, if clients treat unknown codes as generic failure (documented in C42) |
| Remove or rename a field, endpoint or code; change a type, meaning or status code; make an optional field required; tighten validation that rejects previously valid input | **No** — requires `/api/v2` |

Deprecation manifest: `governance/api/deprecations.json` (entries empty). Entry shape: `{"method": "", "path": "", "deprecated_on": "ISO date", "sunset_on": "ISO date", "replacement": "method + path or null", "reason": ""}`. Deprecated routes send `Deprecation` (RFC 9745), `Sunset` (RFC 8594) and `Link: rel="successor-version"`. **Sunset period: UNKNOWN** (owner residual). Until it is set, no `/api/v1` route may be removed or sunset.

## 6. CI checks this manifest requires (to implement with the first route)

| Check | Fails when |
| --- | --- |
| Route parity | A mounted route is not in the manifest, or a `mounted: true` entry is not mounted (API-6, AUTHZ-AC-1) |
| Registry parity | A route's `operation` or `capability` differs from `c14-capability-matrix.json` (API-7) |
| Unrouted guard | Any route maps to an operation in `unrouted_operations` |
| Exception guard | Any path outside `/api/v1` other than the three exceptions is served |
| Exception envelope policy | `/api/health` or `/api/ready` returns anything other than its declared minimal body, or the callback returns a non-envelope error |
| Envelope | Any non-2xx contract-test response fails `api-error-envelope.schema.json` |
| Denial equality | Two 404 (or two 403) bodies for different denial reasons differ in any byte except `requestId` |
| Safe-method purity | A `GET`/`HEAD` route other than the OAuth callback is registered for a command operation |

## 7. Proposed registration text (C41 1.0.3 → 1.1.0)

- **OQ-API-1 → Resolved `EXACT_EXCEPTION_LIST`:** API-1 exceptions are exactly §2; the manifest path is named in API-1.
- **OQ-API-2 → Resolved `CODE_MESSAGE_REQUEST_ID_ENVELOPE`:** API-10 names `api-error-envelope.schema.json` and §4 constraints.
- **OQ-API-3 → split:** register §5 compatibility table and deprecation-manifest mechanism; residual narrowed `OQ-API-3` holds the sunset period.
- No acceptance IDs are appended to C41. API-1 and API-10 text names this manifest and its schema; the §6 checks are their verification cases.

## 8. Definition of Done

1. Owner approves §2–§5. 2. C41 1.1.0 registered; inventory drops by exactly 2 and `OQ-API-3` narrows. 3. Implementation evidence (separate): §6 checks exist and pass on the SHA that mounts the first route.

## 9. Change log

| Version | Date | Change |
| --- | --- | --- |
| 0.1.0 | 2026-10-05 | Initial proposed manifest: 3 exceptions, 31 routes, error envelope schema. |
| 0.2.0 | 2026-10-05 | Revised on `6553eb4`: tied the scope-tuple encoding to registered TEN-7 (#74) and to the Transport Interfaces deferrals in Application Interfaces 1.0.0 (APP-11, APP-12); noted that protected reads also need owner query interfaces (`02-…` gap 6); narrowed-residual naming fixed; owner chat approval recorded, registration pending #75. |
| 0.3.0 | 2026-10-05 | Audit corrections: `/api/health` and `/api/ready` are explicitly exempt from the error envelope, with machine-readable `error_envelope` policy and a CI check (finding 4); no acceptance IDs appended to C41 (finding 1). |
