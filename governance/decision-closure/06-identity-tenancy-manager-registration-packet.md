<!--tos-doc
{
  "doc_id": "TEACH-PROP-DCS-06",
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
    "TEACH-CON-C11",
    "TEACH-CON-C13",
    "TEACH-CON-C33"
  ],
  "resolves_if_approved": [
    "OQ-IDN-1",
    "OQ-IDN-3",
    "OQ-IDN-4",
    "OQ-IDN-7",
    "OQ-TEN-1",
    "OQ-TEN-2",
    "OQ-MGR-1",
    "OQ-MGR-2"
  ],
  "effective_on": "2026-10-05",
  "approval": {
    "state": "approved",
    "approved_on": "2026-10-05",
    "record": "contracts/APPROVAL-RECORD.md",
    "basis": "SYS-21 #75; manifest sha256:ff7b51df1e3a235e9d226d9d7232f81c64bbeb451b359b6e0f2ea232b6e1757c"
  },
  "supersedes": [
    "TEACH-PROP-DCS-06@0.3.0"
  ]
}
-->

# Identity, Tenancy and Manager Registration Packet

Registered on 2026-10-05 by the owner-approved r3.1 manifest under SYS-21 #75. The normative sections below are binding policy selections; baseline facts, proposed metadata and registration instructions describe the preserved source snapshot, not current runtime evidence. Capability promotion, physical schema/executor admission, provider selection, implementation and production execution retain their separate gates. Implementation conformance: UNKNOWN.


| Field | Value |
| --- | --- |
| Status | `proposed` |
| Owner decision | Approved in chat 2026-10-05 04:05 America/Chicago (decision sheet A–D). Registration PENDING under SYS-21 #75; this document stays `proposed` until it lands. |
| Resolves | Originally 8 questions. On `6553eb4`, 6 are registered by #74 (§0). Still open here: `OQ-IDN-7`, `OQ-MGR-2` (neither is a blocker) |
| Rule | Values marked **owner-supplied** come verbatim from the answer register. Values marked **engineering-proposed** are added here to make the answer executable; they are approved only if the owner approves this packet. |
| Contracts touched (remaining) | C11 1.5.0 → 1.6.0 (OQ-IDN-7); C33 1.1.0 → 1.2.0 (OQ-MGR-2). C13 needs no further revision for this packet |

## 0. Registration status on `main` @ `6553eb4`

PR #74 (merged 2026-10-05 08:57Z) registered six of this packet's eight questions. Its text matches this packet's owner-supplied values. Some engineering-proposed values were not adopted into contract text; they stay proposals for the implementation and Persistence admission steps.

| Question | Registered | Contract text | Values in this packet NOT adopted by #74 |
| --- | --- | --- | --- |
| OQ-IDN-1 | Yes, C11 1.5.0 IDN-5 | Argon2id m≥19456 KiB, t≥2, p=1, salt ≥16 bytes, versioned encoded hash, parameters read from stored hash | PHC format regex, 32-byte tag, 1–1,024-byte input bound, rehash-on-login |
| OQ-IDN-3 | Yes, C11 1.5.0 IDN-15 | All sessions incl. current, same transaction as change and audit, sign in again | — (identical) |
| OQ-IDN-4 | Yes, C11 1.5.0 IDN-2 | Verified provider-subject link only; reauthentication for new links | §3 outcome table (409 on subject linked elsewhere); provider/subject schema columns |
| OQ-TEN-1 | Yes, C13 1.5.0 TEN-15 | Normalized multi-organization, multi-location; shapes need promotion and admission | §5 DDL and database invariants (Persistence admission input) |
| OQ-TEN-2 | Yes, C13 1.5.0 TEN-7 | Explicit typed tuple validated against membership; transport encoding separate | §6 algorithm; path-segment encoding is in `05-…` |
| OQ-MGR-1 | Yes, C33 1.1.0 MGR-3 | Direct reports ∩ scope; reporting never grants capability | §7 SQL sketch; ReportingRelationship concept still unregistered (C01) |
| OQ-IDN-7 | **No** — open | — | All of §4 |
| OQ-MGR-2 | **No** — open | — | All of §8 |

Process gap in #74 (fact, not a decision): it opened no SYS-21 issue, added a superseded copy only for C11, and added no change-log rows for C11, C13, C33 or C34.

## 1. OQ-IDN-1 — password hashing (IDN-5)

| Parameter | Value | Origin |
| --- | --- | --- |
| Algorithm | Argon2id, version `0x13` (19) | owner-supplied |
| Memory | `m = 19456` KiB (19 MiB) | owner-supplied |
| Iterations | `t = 2` | owner-supplied |
| Parallelism | `p = 1` | owner-supplied |
| Salt | 16 bytes from a CSPRNG, unique per hash | engineering-proposed (owner said "unique random") |
| Tag length | 32 bytes | engineering-proposed |
| Storage format | PHC string in `identity_credentials.password_hash`: `$argon2id$v=19$m=19456,t=2,p=1$<salt b64 no-pad>$<tag b64 no-pad>` | engineering-proposed (owner said "versioned encoded hashes") |
| Accepted input | 1 to 1,024 bytes of UTF-8 after NFC normalization; longer input → `400 INVALID_REQUEST` before hashing | engineering-proposed (bounds hashing cost; avoids bcrypt-style 72-byte truncation) |
| Upgrade | On successful sign-in, if the stored PHC parameters are weaker than policy, rehash and replace in the same transaction | engineering-proposed |

Constraints: verification parses parameters from the stored string, never from configuration, so policy changes do not break old hashes. Comparison is constant-time. bcrypt and other formats are rejected (no V1 hash import; OQ-MIG-5). Plaintext exists only in memory between request parse and hash call (IDN-6).

Validation regex for stored values: `^\$argon2id\$v=19\$m=(\d+),t=(\d+),p=(\d+)\$[A-Za-z0-9+/]{22}\$[A-Za-z0-9+/]{43}$` with `m ≥ 19456`, `t ≥ 2`, `p ≥ 1`.

Gap (not decided here): no contract states a minimum password length or breached-password screening. Registering IDN-1 does not settle them.

Tests: stored value matches regex; two identical passwords produce different hashes; wrong password and unknown identity return byte-identical 401 bodies; 1,025-byte password → 400 with no hash computed; log/canary scan finds no plaintext; benchmark on the deployed Vercel function records p50/p95 hash time as evidence (implementation, not registration).

## 2. OQ-IDN-3 — sessions revoked by credential change (IDN-15)

Owner-supplied: **revoke ALL sessions of the identity, including the current one.**

Exact behavior: `ChangeCredential` commits the new credential, revokes every `ACTIVE` row in `identity_application_sessions` for that `identity_id` through the canonical revocation path (SES-14), and writes the audit record, in one transaction. The response sets the clearing cookie (`04-…` §3) and issues no new session.

Negative tests: any session of the identity used after commit → 401; if the revocation step fails, the credential change rolls back (the old password still works and no session was revoked).

## 3. OQ-IDN-4 — OAuth linking (IDN-2, IDN-3)

Owner-supplied: **explicit, user-initiated, reauthenticated linking. Email match never links and never creates an identity.**

| Situation | Result |
| --- | --- |
| Callback `(provider, subject)` is linked to exactly one ACTIVE identity | Sign in (new session per `04-…` §6) |
| `(provider, subject)` is not linked; intent `sign_in` | `401`, no identity created, no link created — even if the provider email equals an existing identity's email (IDN-3) |
| Intent `link`, started from a session that completed step-up reauthentication within the last 10 minutes; `(provider, subject)` unlinked | Create `OAUTH_LINK` credential for the session identity; rotate session; audit |
| Intent `link`; `(provider, subject)` already linked to a different identity | `409 CONFLICT`, no change, no disclosure of which identity |
| Linked identity is INACTIVE or DELETED | `401` (IDN-14) |

Schema requirement (needs Persistence admission; not authorized here): `identity_credentials` gains `provider` and `provider_subject` columns, required when `credential_type = 'OAUTH_LINK'`, with a unique index on `(provider, provider_subject)` across non-revoked rows. Provider email is not stored for matching.

Dependency: OQ-TXN-2 residual (no provider selected). Until then the callback route is unmounted and every OAuth attempt fails closed.

## 4. OQ-IDN-7 — indistinguishable reset and invitation responses

Owner-supplied: **indistinguishable for registered and unregistered email.**

Exact behavior for "request password reset" and invitation-related lookups by email:

1. Response is always `202` with body `{"status":"accepted"}` and the same headers, for known, unknown, INACTIVE and offboarded addresses.
2. Work is moved off the response path: the request enqueues the same job type in every case; the job decides whether to send. Response time therefore does not depend on account existence.
3. Abuse bounds (engineering-proposed): per normalized email digest 5 requests / 15 min; per client IP 20 requests / hour. Over the bound → still `202` with the same body; the request is dropped and recorded as a rate-limited denial class (`07-…` §6). A `429` would reveal nothing about existence but would reveal rate state per email, so it is not used here.

Negative tests: compare full response bytes (minus request ID) and p95 latency across the four address classes; difference in bytes fails; latency difference above 50 ms at p95 over 200 trials fails.

## 5. OQ-TEN-1 — membership model (TEN-15)

Owner-supplied: **normalized multi-organization, multi-location.**

Proposed physical shape (requires C01 promotion of Membership/Location and Persistence admission; this packet authorizes neither):

```sql
CREATE TABLE organizations (
  id text PRIMARY KEY CHECK (length(btrim(id)) > 0),
  status text NOT NULL CHECK (status IN ('ACTIVE','INACTIVE')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE locations (
  id text PRIMARY KEY CHECK (length(btrim(id)) > 0),
  organization_id text NOT NULL REFERENCES organizations(id),
  status text NOT NULL CHECK (status IN ('ACTIVE','INACTIVE')),
  UNIQUE (id, organization_id)                       -- target for composite FK
);
CREATE TABLE memberships (
  id text PRIMARY KEY CHECK (length(btrim(id)) > 0),
  identity_id text NOT NULL REFERENCES identity_identities(id),
  organization_id text NOT NULL REFERENCES organizations(id),
  location_id text NULL,                              -- NULL = organization-wide
  status text NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','INACTIVE','REVOKED')),
  created_at timestamptz NOT NULL DEFAULT now(),
  status_changed_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (location_id, organization_id) REFERENCES locations(id, organization_id)
);
CREATE UNIQUE INDEX memberships_one_live_per_scope
  ON memberships (identity_id, organization_id, COALESCE(location_id, ''))
  WHERE status IN ('ACTIVE','INACTIVE');
CREATE TABLE membership_grants (
  membership_id text NOT NULL REFERENCES memberships(id),
  bundle text NOT NULL CHECK (bundle IN ('learner','observer','manager','org_admin')),
  granted_at timestamptz NOT NULL,
  PRIMARY KEY (membership_id, bundle)
);
```

Invariants enforced in the database, not only in code: a location belongs to exactly one organization (TEN-2); a membership's location must belong to the membership's organization (composite FK); at most one live membership per (identity, organization, location); `org_admin` grants only on rows with `location_id IS NULL` (add `CHECK` via trigger); TEN-18 transitions by trigger (`ACTIVE→INACTIVE`, `INACTIVE→REVOKED`, `REVOKED` terminal).

Effect on the kernel: releases the owner hold on `Membership` (`kernel/entities.json` `promotion_hold`) so it can be promoted with this shape.

## 6. OQ-TEN-2 — scope selection (TEN-7)

Owner-supplied: **explicit validated scope tuple; no implicit default.**

Algorithm per request (runs at C14 steps 2–3):

1. Read `organizationId` (and `locationId` where the route has it) from the path (`05-…` §3). A route without the segment cannot match.
2. Load ACTIVE memberships of the session identity where `organization_id = organizationId` and, on location routes, (`location_id = locationId` or `location_id IS NULL`); on organization routes, only `location_id IS NULL`.
3. Zero rows → `403 FORBIDDEN` (same body whether or not the organization exists).
4. The location must be ACTIVE and belong to the organization; otherwise `403`.
5. The effective grant set is the union of grants on the matching rows (organization-wide plus location-specific).

MUST NOT: fall back to "the only membership", read scope from body/query/header/JWT/local storage, or cache the result across requests (TEN-4, TEN-5).

## 7. OQ-MGR-1 — manager visibility (MGR-3)

Owner-supplied: **direct reports ∩ current organization/location scope.**

Predicate (engineering-proposed SQL sketch):

```sql
-- learners visible to :manager in (:org, :loc)
SELECT m.identity_id
FROM memberships m
JOIN reporting_relationships r
  ON r.report_identity_id = m.identity_id
 AND r.manager_identity_id = :manager
 AND r.organization_id = :org
 AND r.location_id = :loc
 AND r.status = 'ACTIVE'
WHERE m.organization_id = :org
  AND (m.location_id = :loc)
  AND m.status = 'ACTIVE';
```

Blocking fact: **no ReportingRelationship concept exists** in `kernel/entities.json`. Until a C01 semantic change registers it (Organization-owned, never granting capability per TEN-12), the predicate returns zero rows and managers see nobody. `org_admin` is not narrowed by reporting (`02-…` §4).

Negative tests: a manager cannot see a learner who is (a) in the same location but not a direct report, (b) a direct report whose membership is INACTIVE, (c) a direct report in another location of the same organization; each target request returns 404 byte-identical to a nonexistent learner.

## 8. OQ-MGR-2 — manager offboarding

Owner-supplied: **dedicated capability through the canonical Identity service; global effects need separate policy.**

Registered as: capability `identity.lifecycle.offboard` (`02-…`), held by `manager` and `org_admin`; the route calls the one Identity lifecycle service (IDN-17, MGR-8); the GLOBAL-EFFECT GUARD from `02-…` §10 applies. A multi-organization person returns 404 to an organization-scoped offboard until the global Identity lifecycle policy (recorded as required by the OQ-TEN-3 resolution) exists.

## 9. Proposed registration text

| Contract | Question | Selection token | Requirement text change |
| --- | --- | --- | --- |
| C11 1.5.0 (#74, done) | OQ-IDN-1 | `ARGON2ID_19M_T2_P1` | IDN-5 names §1 table |
| C11 1.5.0 (#74, done) | OQ-IDN-3 | `ALL_SESSIONS_ON_CREDENTIAL_CHANGE` | IDN-15 value = all sessions incl. current; no new session issued |
| C11 1.5.0 (#74, done) | OQ-IDN-4 | `EXPLICIT_REAUTHENTICATED_LINKING` | IDN-2 names §3 table |
| C11 → 1.6.0 (pending #75) | OQ-IDN-7 | `INDISTINGUISHABLE_ACCEPTED_RESPONSE` | OQ-IDN-7 resolved row carries §4 items 1–3 (no new ID; OQ-IDN-7 affects no requirement) |
| C13 1.5.0 (#74, done) | OQ-TEN-1 | `NORMALIZED_MULTI_ORGANIZATION_MULTI_LOCATION` | TEN-15 value (#74). §5 invariants were not registered; they are Persistence-admission input, not a contract ID |
| C13 1.5.0 (#74, done) | OQ-TEN-2 | `EXPLICIT_VALIDATED_SCOPE_TUPLE` | TEN-7 names §6 algorithm |
| C33 1.1.0 (#74, done) | OQ-MGR-1 | `DIRECT_REPORTS_WITHIN_APPROVED_SCOPE` | MGR-3 value |
| C33 → 1.2.0 (pending #75) | OQ-MGR-2 | `EXPLICIT_OFFBOARD_CAPABILITY_THROUGH_IDENTITY_SERVICE` | OQ-MGR-2 resolved row carries §8 (no new ID) |

No requirement IDs are added. Registration form: values are written into existing requirement text or the resolved open-question row; no requirement or acceptance IDs are added (`00-README.md` §R). Test cases in this document are verification cases cited by that text, not contract acceptance IDs.

## 10. Definition of Done

1. Owner approves engineering-proposed values in §1, §4, §5, §7 or replaces them.
2. Three SYS-21 registrations (C11, C13, C33); inventory drops by exactly 8.
3. Follow-on, not part of closure: C01 semantic change for ReportingRelationship; Persistence admission for §5 tables and OAuth link columns; global Identity lifecycle policy.

## 11. Change log

| Version | Date | Change |
| --- | --- | --- |
| 0.1.0 | 2026-10-05 | Initial proposed packet. |
| 0.2.0 | 2026-10-05 | Revised on `6553eb4`: added §0 recording that PR #74 registered OQ-IDN-1/3/4, OQ-TEN-1/2, OQ-MGR-1 and which engineering values it did not adopt; §9 now targets only the two open rows (C11 1.5.0 → 1.6.0, C33 1.1.0 → 1.2.0); owner chat approval recorded, registration pending #75. |
| 0.3.0 | 2026-10-05 | Audit correction: proposed IDN-31, TEN-20 and MGR-11 removed; values go into resolved open-question rows, consistent with issue #75 (finding 1). |
