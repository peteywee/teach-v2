<!--tos-doc
{
  "doc_id": "TEACH-PROP-DCS-05",
  "class": "specification",
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
  "effective_on": "2026-10-17",
  "approval": {
    "state": "approved",
    "approved_on": "2026-10-17",
    "record": "domains/demo-runtime/owner-approval.json",
    "basis": "TEACH-DEMO-RUNTIME-2026-10-17@0.1.0; SYS-21 #82"
  },
  "supersedes": [
    "TEACH-PROP-DCS-05@0.3.0",
    "TEACH-PROP-DCS-05@1.0.0"
  ]
}
-->

# API Boundary Manifest

Registered on 2026-10-05 by the owner-approved r3.1 manifest under SYS-21 #75. The normative sections below are binding policy selections; baseline facts, proposed metadata and registration instructions describe the preserved source snapshot, not current runtime evidence. Capability promotion, physical schema/executor admission, provider selection, implementation and production execution retain their separate gates. Implementation conformance: UNKNOWN.


| Field | Value |
| --- | --- |
| Status | `active` logical authority; implementation conformance UNKNOWN; no route mounting or physical admission |
| Owner decision | Prior #75 selections preserved except explicit #82 changes; exact demo approval in `domains/demo-runtime/owner-approval.json` |
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

Canonical authority: `api-boundary-manifest.json` version 1.1.0. All 34 routes remain unmounted and unimplemented; logical registration grants no activation. Ordinary identifier selectors match `^[A-Za-z0-9_-]{1,128}$`. ContentVersion uses strict SemVer 2.0 including prerelease/build, maximum 38 characters, with the exact regex in the manifest. Percent-encode the version segment; decode once and never normalize exact identity. Malformed path selectors and missing targets use the existing 404 behavior.

Explicit organization/location path selectors never establish authority. The exact package-defined request, path, query and response schema references are attached to each demo route in the machine manifest; unsafe routes require exact allowed Origin and application/json, protected responses no-store.

| Method | Path | Operation | Scope | Mounted |
| --- | --- | --- | --- | --- |
| POST | `/api/v1/session` | `AuthenticateIdentity` | BOOTSTRAP | false |
| GET | `/api/v1/session` | `ReadCurrentSession` | SELF | false |
| DELETE | `/api/v1/session` | `RevokeApplicationSession` | SELF | false |
| DELETE | `/api/v1/sessions/{sessionId}` | `RevokeApplicationSession` | SELF | false |
| POST | `/api/v1/credential` | `ChangeCredential` | SELF | false |
| POST | `/api/v1/credential/token-change` | `ChangeCredential` | SELF | false |
| POST | `/api/v1/invitations/accept` | `AcceptInvitation` | BOOTSTRAP | false |
| GET | `/api/v1/memberships` | `ListOwnMemberships` | SELF | false |
| GET | `/api/v1/certifications/mine` | `ListOwnCertifications` | SELF | false |
| POST | `/api/v1/organizations/{organizationId}/locations/{locationId}/invitations` | `InviteIdentity` | LOCATION | false |
| GET | `/api/v1/organizations/{organizationId}/locations/{locationId}/invitations` | `ListInvitations` | LOCATION | false |
| POST | `/api/v1/organizations/{organizationId}/locations/{locationId}/invitations/{invitationId}/revoke` | `RevokeInvitation` | LOCATION | false |
| POST | `/api/v1/organizations/{organizationId}/locations/{locationId}/tokens/{tokenId}/revoke` | `RevokeSingleUseToken` | LOCATION | false |
| POST | `/api/v1/organizations/{organizationId}/locations/{locationId}/members/{identityId}/offboard` | `OffboardIdentity` | LOCATION | false |
| POST | `/api/v1/organizations/{organizationId}/locations/{locationId}/memberships/{membershipId}/deactivate` | `DeactivateMembership` | LOCATION | false |
| GET | `/api/v1/organizations/{organizationId}/locations/{locationId}/team` | `ListTeam` | LOCATION | false |
| GET | `/api/v1/organizations/{organizationId}/locations/{locationId}/team/{identityId}/learner-state` | `ReadTeamMemberLearnerState` | LOCATION | false |
| POST | `/api/v1/organizations/{organizationId}/locations/{locationId}/assignments` | `AssignContent` | LOCATION | false |
| GET | `/api/v1/organizations/{organizationId}/locations/{locationId}/assignments/mine` | `ListOwnAssignments` | LOCATION | false |
| GET | `/api/v1/organizations/{organizationId}/locations/{locationId}/content/{contentPackId}/versions/{contentVersion}` | `ReadAssignedContentVersion` | LOCATION | false |
| POST | `/api/v1/organizations/{organizationId}/locations/{locationId}/learning-sessions` | `StartLearningSession` | LOCATION | false |
| POST | `/api/v1/organizations/{organizationId}/locations/{locationId}/learning-sessions/{learningSessionId}/progress-events` | `RecordProgressEvent` | LOCATION | false |
| POST | `/api/v1/organizations/{organizationId}/locations/{locationId}/learning-sessions/{learningSessionId}/complete` | `CompleteLearningSession` | LOCATION | false |
| GET | `/api/v1/organizations/{organizationId}/locations/{locationId}/learner-state/mine` | `ReadOwnLearnerState` | LOCATION | false |
| POST | `/api/v1/organizations/{organizationId}/locations/{locationId}/certifications` | `IssueCertification` | LOCATION | false |
| GET | `/api/v1/organizations/{organizationId}/locations/{locationId}/certifications/{certificationId}/verification` | `VerifyCertification` | LOCATION | false |
| POST | `/api/v1/organizations/{organizationId}/identities/{identityId}/deactivate` | `DeactivateIdentity` | ORGANIZATION | false |
| POST | `/api/v1/organizations/{organizationId}/identities/{identityId}/reactivate` | `ReactivateIdentity` | ORGANIZATION | false |
| POST | `/api/v1/organizations/{organizationId}/memberships/{membershipId}/revoke` | `RevokeMembership` | ORGANIZATION | false |
| POST | `/api/v1/organizations/{organizationId}/certifications/{certificationId}/revoke` | `RevokeCertification` | ORGANIZATION | false |
| GET | `/api/v1/organizations/{organizationId}/audit-events` | `ReadAuditEvents` | ORGANIZATION | false |
| POST | `/api/v1/demo/start` | `BeginDemoRun` | DEMO_NEW_RUN | false |
| POST | `/api/v1/demo/persona` | `SwitchDemoPersona` | LOCATION | false |
| POST | `/api/v1/demo/close` | `CloseDemoRun` | LOCATION | false |

Unrouted operations: `CreateApplicationSession`, `CreateIdentity`, `CreateMembership`, `PublishContentPack`, `ReconcileExternalEffect`, `CreateDemoPersona`, `RevokeDemoSessions`. Seven exact demo protected-query interfaces are registered in Application Interfaces 1.1.0; four other historical read interfaces remain missing. No broader route is admitted by this revision.

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

## Exact synthetic transport registration

The prior error envelope and fixed status/message mapping are unchanged. New secret-issuing BeginDemoRun and SwitchDemoPersona are NON-RETRYABLE; their secrets never enter saved responses. Close is state-guarded and revoked visitor cookies deny. Reset is deliberately Close then Begin, with visible partial failure, not an atomic retryable route. The immutable package schemas at `domains/demo-runtime/proposal-0.1.0/transport-schemas.json` and definitions in `domains/demo-runtime/proposal-0.1.0/transport-and-queries.json` control only the selected synthetic payloads.
