<!--tos-doc
{
  "doc_id": "TEACH-PROP-DCS-04",
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
    "TEACH-CON-C12",
    "TEACH-CON-C52"
  ],
  "resolves_if_approved": [
    "OQ-SES-1",
    "OQ-SES-2",
    "OQ-SES-5",
    "OQ-SES-6",
    "OQ-SES-7"
  ],
  "effective_on": "2026-10-05",
  "approval": {
    "state": "approved",
    "approved_on": "2026-10-05",
    "record": "contracts/APPROVAL-RECORD.md",
    "basis": "SYS-21 #75; manifest sha256:ff7b51df1e3a235e9d226d9d7232f81c64bbeb451b359b6e0f2ea232b6e1757c"
  },
  "supersedes": [
    "TEACH-PROP-DCS-04@0.3.0"
  ]
}
-->

# Session and Transport Security Specification

Registered on 2026-10-05 by the owner-approved r3.1 manifest under SYS-21 #75. The normative sections below are binding policy selections; baseline facts, proposed metadata and registration instructions describe the preserved source snapshot, not current runtime evidence. Capability promotion, physical schema/executor admission, provider selection, implementation and production execution retain their separate gates. Implementation conformance: UNKNOWN.


| Field | Value |
| --- | --- |
| Status | `proposed` — no cookie, origin, DNS, Vercel or route setting is changed or authorized by this document |
| Owner decision | Approved in chat 2026-10-05 04:05 America/Chicago (decision sheet A–D). Registration PENDING under SYS-21 #75; this document stays `proposed` until it lands. |
| Resolves if approved | `OQ-SES-1` (SES-5), `OQ-SES-2` (SES-6), `OQ-SES-5` (SES-18), `OQ-SES-6` (SES-19), `OQ-SES-7` |
| Owner confirmations needed | `OQ-SES-1` and `OQ-SES-2` are **recommendations** in the register. Approving this document is the confirmation. Rejecting either sends that row back to the owner with these values preserved. |
| Already binding (not changed here) | SES-3 32-byte credential; SES-8 v1 verifier; SES-11 12 h absolute / 30 min idle; OQ-REL-1 Vercel + Supabase |

## 1. Current truth at baseline

| Fact | State |
| --- | --- |
| Session table and verifier | **Verified** — `identity_application_sessions` with 32-byte v1 verifier, 12 h absolute CHECK, terminal-state trigger |
| Cookie issuance code, HTTP routes, Origin middleware | **Verified: absent** (0 routes) |
| Vercel project, domain binding, DNS for `t34ch.com` for V2 | UNKNOWN — no V2 project identity evidenced (REL-18 requires evidence per candidate) |
| Legacy V1 used `api.t34ch.com` and `.t34ch.com`-wide cookie trust | Owner-declared historical (2026-07-31 incident, memory). V2 MUST NOT reuse it (SES-2 recommendation text). |

## 2. Topology (OQ-SES-2)

| Item | Value |
| --- | --- |
| Canonical origin | `https://t34ch.com` (scheme `https`, host `t34ch.com`, default port; serialized with no trailing slash) |
| Web client | Served from the canonical origin |
| API | Same origin, path prefix `/api/v1` (see `05-…`) |
| `www.t34ch.com` | 308 redirect to `https://t34ch.com` with path and query preserved; serves no API and sets no cookie |
| `api.t34ch.com` | **Not used by V2.** Introducing it is a new decision with CORS and cookie implications |
| CORS | None. API responses carry no `Access-Control-Allow-*` headers. Cross-origin preflights receive no allow headers and therefore fail in the browser |
| Vercel preview deployments | Each preview is its own origin. Its allowed origin is exactly its own deployment URL. A preview MUST NOT hold production database credentials or production secrets (REL-6 manifest proves this per candidate) |

## 3. Session cookie (SES-4, SES-5, SES-6)

Exact issuance header:

```http
Set-Cookie: __Host-teach_session=<43-char unpadded base64url>; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=43200
```

Exact logout / clearing header:

```http
Set-Cookie: __Host-teach_session=; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=0
```

| Attribute | Value | Why |
| --- | --- | --- |
| Name | `__Host-teach_session` | The `__Host-` prefix makes the browser reject the cookie unless it has `Secure`, `Path=/` and **no** `Domain`. This enforces "host-only" in the browser, not only in our code. |
| Value | Unpadded base64url of 32 CSPRNG bytes → exactly 43 characters, alphabet `[A-Za-z0-9_-]` | SES-3 |
| `Domain` | **Absent** | Host-only: never sent to `www.` or any subdomain |
| `Path` | `/` | Required by `__Host-`; one cookie for web and `/api/v1` |
| `Secure` | Present | SES-4 |
| `HttpOnly` | Present | SES-4, SES-7 (script cannot read it) |
| `SameSite` | `Lax` (OQ-SES-1) | `Strict` would drop the cookie on the top-level redirect back from an OAuth provider. `Lax` still blocks cross-site POST. The gap Lax leaves (cross-site top-level GET) is closed by §5 and §6. |
| `Max-Age` | `43200` (12 h) | Mirrors SES-11 absolute lifetime. The server is the authority; the browser lifetime is only an upper bound. Idle expiry (30 min) is server-only. |

Parsing rules for an incoming request (SES-9, SES-15): exactly one `__Host-teach_session` cookie; value matches `^[A-Za-z0-9_-]{43}$`; decodes to exactly 32 bytes. Zero, duplicate, wrong length or wrong alphabet → `401 UNAUTHENTICATED`, no lookup, no write. Any other cookie name, bearer header or query token is ignored for authentication (SES-1, SES-17).

## 4. OAuth flow cookie (supports SES-19)

| Item | Value |
| --- | --- |
| Name | `__Host-teach_oauth_flow` |
| Content | Opaque random handle (32 bytes) referencing server-side flow state: `state`, PKCE `code_verifier`, provider, created_at, intent (`sign_in` or `link`) |
| Lifetime | `Max-Age=600` (10 min); server-side flow record expires at the same time |
| Attributes | `Path=/; Secure; HttpOnly; SameSite=Lax` |
| Rule | It is never an application session. The callback deletes it in the same response that issues a new `__Host-teach_session`. It cannot be upgraded into a session (SES-19). |

Mounted only after an OAuth provider is selected (OQ-TXN-2 residual).

## 5. Cross-site request forgery control (OQ-SES-5, SES-18)

Applies to every request that carries `__Host-teach_session` and uses an unsafe method (`POST`, `PUT`, `PATCH`, `DELETE`), including logout. Evaluated **before** session lookup and before authorization.

| `Origin` header | Result |
| --- | --- |
| Byte-equal to the canonical origin of this deployment (`https://t34ch.com` in production) | Continue |
| Missing | `403 FORBIDDEN`, no write |
| `null` | `403 FORBIDDEN`, no write |
| Malformed (not `scheme://host[:port]`) | `403 FORBIDDEN`, no write |
| Any other origin, including `https://www.t34ch.com`, `http://t34ch.com`, `https://t34ch.com.evil.example` | `403 FORBIDDEN`, no write |

Additional constraints:

1. No `Referer` fallback. A missing `Origin` is denied.
2. When `Sec-Fetch-Site` is present and is not `same-origin`, deny (defense in depth; absence alone does not deny).
3. Unsafe API requests MUST send `Content-Type: application/json`; anything else → `415 UNSUPPORTED_MEDIA_TYPE` (removes HTML-form "simple request" bodies).
4. Safe methods (`GET`, `HEAD`) MUST NOT change state. The single exception is the OAuth callback (`05-…`), which is protected by `state` + PKCE bound to `__Host-teach_oauth_flow`, not by Origin.
5. The allowed-origin value is read from the release configuration manifest (REL-6). A missing or empty value fails closed: every unsafe request is denied (SYS-9).

Tradeoff: browsers released before Origin was sent on same-origin POST will be unable to write. Teach targets current mobile browsers on kitchen tablets and phones; this is accepted.

## 6. Rotation and revocation events (OQ-SES-6, SES-19)

SES-16 says a session carries no organization, role or capability. "Privilege elevation" therefore cannot mean "the session gained a role". It is defined here as **step-up reauthentication**: a successful re-verification of a credential during an existing session.

| Event | Effect, in one transaction |
| --- | --- |
| Successful `AuthenticateIdentity` (password or OAuth callback) | Create a new session. If the request presented any `__Host-teach_session` value (any identity), revoke that session. Never reuse or upgrade a presented value. |
| Step-up reauthentication (required for OAuth linking per OQ-IDN-4, accepting an invitation while signed in, SELF `ChangeCredential`) | Create a new session; revoke the presenting session. |
| `ChangeCredential` succeeds (OQ-IDN-3) | Revoke **all** sessions of the identity, including the current one. Issue no new session; respond with a clearing cookie. The user signs in again. |
| `DeactivateIdentity`, `OffboardIdentity` | Revoke all sessions (SES-14, IDN-18). |
| Logout (`RevokeApplicationSession` on the presented session) | Revoke it; respond with the clearing cookie (SES-12, SES-13). |
| Membership, grant or entitlement change | **No rotation.** Authority is reloaded from the database on each request (SES-16, AUTHZ-10), so the next request already sees the change. |

"Atomic" means: the new session row, the revocation of the old row and the audit record commit together or not at all. If the commit fails, the response sets no new cookie.

## 7. Concurrent sessions (OQ-SES-7)

No count limit. Every session expires by SES-11 and can be revoked individually (own sessions, `02-…` `RevokeApplicationSession`) or all at once by credential change or offboarding. A later limit requires an explicit value and a deterministic eviction rule (e.g. revoke least-recently-used) through a C12 revision.

## 8. Response headers on every `/api/v1` response

| Header | Value | Rule |
| --- | --- | --- |
| `Cache-Control` | `no-store` | PRIV-7: private responses never stored by shared caches |
| `X-Request-Id` | Request ID (also in error body) | OBS-1, API-12 |
| `Strict-Transport-Security` | `max-age=31536000` | `includeSubDomains` and `preload` are intentionally omitted: they would bind every `t34ch.com` subdomain, which this decision does not cover. Adding `includeSubDomains` requires a separate decision backed by an inventory proving HTTPS on every `t34ch.com` subdomain |
| `X-Content-Type-Options` | `nosniff` | — |
| `Referrer-Policy` | `same-origin` | Prevents leaking IDs in paths to other origins |

## 9. Proposed registration text (C12 1.1.0 → 1.2.0)

- **OQ-SES-1 → Resolved `LAX_WITH_EXACT_ORIGIN_CSRF`.** SES-5 value: `SameSite=Lax`.
- **OQ-SES-2 → Resolved `SAME_ORIGIN_HOST_ONLY_COOKIE`.** SES-6 value: cookie `__Host-teach_session`, no `Domain`, `Path=/`; canonical origin `https://t34ch.com`; API under `/api/v1` on the same origin.
- **OQ-SES-5 → Resolved `EXACT_ALLOWED_ORIGIN_ON_UNSAFE_METHODS`.** SES-18 value: §5 table and constraints 1–5.
- **OQ-SES-6 → Resolved `ROTATE_AT_SIGN_IN_AND_STEP_UP`.** SES-19 value: §6 table.
- **OQ-SES-7 → Resolved `NO_CONCURRENT_SESSION_LIMIT`.**
- No acceptance IDs are appended to C12. SES-5, SES-6, SES-18 and SES-19 text names this document; TRS-1…TRS-10 in §10 are its verification cases (C51 evidence targets).

## 10. Acceptance tests (positive and negative)

| Case | Request / setup | Expected |
| --- | --- | --- |
| TRS-1 | Sign in; read `Set-Cookie` | Exactly the §3 issuance header shape; name `__Host-teach_session`; no `Domain` |
| TRS-2 | Send the session cookie to `https://www.t34ch.com` | Browser does not send it (host-only); server redirects 308 without reading cookies |
| TRS-3 | `POST /api/v1/...` with valid cookie and `Origin` absent / `null` / `https://evil.example` / `https://www.t34ch.com` / `http://t34ch.com` | Each `403`; zero writes; session `last_used_at` unchanged |
| TRS-4 | Same POST with exact canonical Origin but `Content-Type: application/x-www-form-urlencoded` | `415`; zero writes |
| TRS-5 | Present session A cookie, sign in as identity B | New cookie for B; session A is REVOKED; A's old cookie returns 401 |
| TRS-6 | Two sessions open; `ChangeCredential` from session 1 | Both sessions return 401 on next request; response carries clearing cookie; audit committed with change |
| TRS-7 | Manager demoted while signed in; next manager-only request | `403` without re-login; session not rotated (SES-AC-11 holds) |
| TRS-8 | Start OAuth flow; replay callback after 10 min or with mismatched `state` | `401`; no session; flow cookie cleared |
| TRS-9 | Remove the allowed-origin value from configuration; send any unsafe request | `403` for every request (fail closed) |
| TRS-10 | Inspect any `/api/v1` response | `Cache-Control: no-store`, `X-Request-Id` present, no `Access-Control-Allow-Origin`, and `Strict-Transport-Security` exactly `max-age=31536000` |

## 11. Definition of Done

1. Owner confirms SES-1/SES-2 recommendations and approves §5–§7.
2. C12 1.2.0 registered by SYS-21; inventory drops by exactly 5.
3. Implementation evidence (separate): SES-AC-1…14 and TRS-1…10 pass on an exact SHA, plus a deployed-candidate check that the production Vercel project binds `t34ch.com` and that preview deployments hold no production secrets (REL-6, REL-18).

## 12. Change log

| Version | Date | Change |
| --- | --- | --- |
| 0.1.0 | 2026-10-05 | Initial proposed session/transport specification from recorded SES answers and recommendations. |
| 0.2.0 | 2026-10-05 | Re-checked on `6553eb4`: C12 still 1.1.0 with OQ-SES-1/2/5/6/7 open; no content change. Owner chat approval (including confirmation of the SES-1/SES-2 recommendations) recorded; registration pending #75. |
| 0.3.0 | 2026-10-05 | Audit corrections: HSTS no longer sets `includeSubDomains` (finding 7); SES-AC-15…24 renamed TRS-1…10 and no acceptance IDs are appended to C12 (finding 1). |
