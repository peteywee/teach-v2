<!--tos-doc
{
  "doc_id": "TEACH-PROP-DCS-07",
  "class": "specification",
  "version": "2.0.0",
  "claims_truth_state": "declared",
  "status": "active",
  "owner": "Patrick Craven, Top Shelf Service LLC",
  "created_on": "2026-10-05",
  "updated_on": "2026-10-19",
  "baseline": {
    "repo": "peteywee/teach-v2",
    "ref": "main",
    "commit": "6553eb465e469dc9e60368cde40d259f86262997",
    "purpose": "revision baseline: main after PR #74"
  },
  "governed_by": [
    "TEACH-CON-C00",
    "TEACH-CON-C21",
    "TEACH-CON-C22",
    "TEACH-CON-C23",
    "TEACH-CON-C51",
    "TEACH-CON-C52",
    "TEACH-CON-C53"
  ],
  "resolves_if_approved": [
    "OQ-EVD-1",
    "OQ-EVD-3",
    "OQ-REL-3",
    "OQ-MIG-3",
    "OQ-MIG-4",
    "OQ-OBS-2",
    "OQ-AUD-2",
    "OQ-AUD-3"
  ],
  "partially_resolves": [
    "OQ-EVD-2",
    "OQ-TXN-2"
  ],
  "confirms_recommendation": [
    "OQ-OBS-1"
  ],
  "effective_on": "2026-10-19",
  "approval": {
    "state": "approved",
    "approved_version": "2.0.0",
    "record": "governance/demo-schema-isolation/owner-approval.json",
    "basis": "Bounded demo-schema Data API exception; recorded 2026-10-19 UTC. Prior #75 and #82 decisions unchanged outside this exception. Local preparation only."
  },
  "supersedes": [
    "TEACH-PROP-DCS-07@0.3.0",
    "TEACH-PROP-DCS-07@1.0.0",
    "TEACH-PROP-DCS-07@1.1.0"
  ],
  "approval_history": [
    {
      "state": "approved",
      "approved_on": "2026-10-17",
      "record": "domains/demo-runtime/owner-approval.json",
      "basis": "TEACH-DEMO-RUNTIME-2026-10-17@0.1.0; SYS-21 #82"
    }
  ],
  "demo_schema_isolation_registration": {
    "registration": "governance/demo-schema-isolation/registration.json",
    "approval_record": "governance/demo-schema-isolation/owner-approval.json",
    "scope": "LOCAL_CODE_AND_TESTS_ONLY",
    "schema": "teach_v2_demo",
    "node_major": 24,
    "runtime_activation": false,
    "live_database_changes": false,
    "deployment_authority": false,
    "spending_authority": false
  }
}
-->

# Evidence, Release and Operations Specification

Registered on 2026-10-05 by the owner-approved r3.1 manifest under SYS-21 #75. The normative sections below are binding policy selections; baseline facts, proposed metadata and registration instructions describe the preserved source snapshot, not current runtime evidence. Capability promotion, physical schema/executor admission, provider selection, implementation and production execution retain their separate gates. Implementation conformance: UNKNOWN.


| Field | Value |
| --- | --- |
| Status | `active` logical authority; implementation conformance UNKNOWN; no route mounting or physical admission |
| Owner decision | Prior #75/#82 selections preserved except the bounded C21 2.0.0 schema-isolation exception; exact additional approval in `governance/demo-schema-isolation/owner-approval.json` |
| Resolves if approved | `OQ-EVD-1`, `OQ-EVD-3`, `OQ-REL-3`, `OQ-MIG-3`, `OQ-MIG-4`, `OQ-OBS-2`, `OQ-AUD-2`, `OQ-AUD-3` |
| Split (supplied part registers, value stays open) | `OQ-EVD-2` (duration, archive location), `OQ-TXN-2` (email and OAuth providers) |
| Owner confirmation needed | `OQ-OBS-1` (Sentry recommendation; alert destination unknown) |
| Builds on | PR #72 workflow-lifecycle machinery (`verification/workflow-lifecycle/README.md`) |

## 1. Current truth at baseline

| Fact | State |
| --- | --- |
| 45 workflows with pinned checkout, checkpoint and artifact upload | **Verified** in `.github/workflows/` and lifecycle README |
| End-to-end closure observer results on merged main | PENDING per lifecycle README |
| Durable evidence archive beyond GitHub artifact expiry | **Absent** |
| Deployed candidate, Supabase project, Vercel project for V2 | UNKNOWN (REL-18 evidence not produced) |
| V2 tables' schema | **Verified:** every migration creates tables in `public` (no schema qualifier) |
| Workflow-lifecycle closure observer | **Verified:** #74 commit `d9b163a` makes `.github/workflows/workflow-lifecycle-closure.yml` run only for `main`; PR runs are now *skipped* rather than BLOCKED. EVD-14 says a skipped required check counts as not passed, so a PR's closure state is UNKNOWN, never PASS, and no PR may cite closure evidence. Merged-main closure is unaffected |
| Supabase exposure of `public` | **Project-specific; verified only by readback.** Supabase is moving tables in `public` to opt-in exposure: the default for new projects from 2026-05-30 and enforced on existing projects on 2026-10-30 ([Supabase changelog: tables not exposed automatically](https://supabase.com/changelog/45329-breaking-change-tables-not-exposed-to-data-and-graphql-api-automatically)). Projects created earlier keep automatic `SELECT/INSERT/UPDATE/DELETE` grants for `anon` and `authenticated` until then. No V2 Supabase project is evidenced, so its state is UNKNOWN |

Consequence: whether the current migrations would make V2 tables browser-reachable depends on the target project's actual grants, Data API setting and exposed schemas. A provider default, an announced date or the project's creation date is never accepted as proof. §5 keeps the release blocker and requires authoritative readback from the exact target project.

## 2. OQ-EVD-1 — independent verification (EVD-16)

Owner-supplied list: C11, C12, C13, C14, C15, C21, C22, C23, C51, C52, and every protected cross-domain mutation (a command whose transaction writes to more than one owning domain, e.g. AcceptInvitation, OffboardIdentity, ChangeCredential).

"Independent" means all of: the verifier is a different person or agent instance than any author of the change; the verifier had no commit in the change; the verifier records their identity, the exact SHA, the checks run and the result; self-audit output (`pnpm self-audit`) is evidence input, never the independent verdict (AGT-17). A DevelopmentAgent can verify another agent's work only when the owner names it as verifier for that change.

## 3. OQ-EVD-2 — evidence storage (split)

Registers now (owner-supplied): repository metadata plus SHA-bound artifacts; GitHub artifacts are not assumed permanent.

| Element | Specification |
| --- | --- |
| Index | `verification/evidence-index.json` (proposed): one entry per evidence record with `source_sha`, `environment`, `command`, `timestamp`, `result`, `artifact_sha256`, `archive_uri`, `expires_on` (EVD-10) |
| Content addressing | Archive object key = `sha256/<artifact_sha256>`; re-upload of identical bytes is a no-op |
| Readback | A record counts only after the archive object is read back and its digest re-computed |
| Expiry handling | When `expires_on` passes, the record's state becomes UNKNOWN for any new claim (EVD-15) |

Residual owner values: **retention duration** and **archive location**. Options for location: GitHub Release assets on a private evidence repo; a Supabase Storage bucket; Cloudflare R2. Recommendation: whichever the owner already pays for, with object versioning and delete protection; the spec above works with any of them.

## 4. OQ-EVD-3 — truth-state mapping

| TOS truth state | C51 evidence state | Rule |
| --- | --- | --- |
| verified (current, exact SHA, readable artifact) | `PROVEN` | Only path to PROVEN |
| verified but for a different SHA or stale binding | `UNKNOWN` | EVD-11, REL-14 |
| declared (owner or author statement) | `UNKNOWN` | Never auto-promotes |
| inferred | `UNKNOWN` | Never auto-promotes |
| unknown | `UNKNOWN` | — |
| conflicting | `CONTRADICTORY` | — |
| failed or gate not met, skipped check | `BLOCKED` | EVD-14 |
| planned | `UNKNOWN` | Planned work is never evidence |

## 5. OQ-MIG-3 — no browser-reachable database (MIG-11, MIG-12)

Application tables remain backend-only with no implicit RLS exemption. C21 2.0.0 records the exact bounded owner approval in `governance/demo-schema-isolation/owner-approval.json`. Its scope is code and local tests only. No live target, role/credential, configuration, deployment or spending is approved.

### 5.1 Nonexception default

Disable the project Data API. Retain existing/default browser-role privilege revocation and RLS with no policies on application tables. This default still governs every application schema other than the exact bounded synthetic demo exception below. Legacy tables belong to the pre-existing application and are not reclassified as V2 demo objects or altered by this preparation.

### 5.2 Dedicated demo-schema exception

Only the bounded synthetic demo in the dedicated `teach_v2_demo` schema may share the legacy Supabase project while the Data API stays enabled for legacy. All controls are required together:

1. The demo schema is absent from every target Data API exposed-schema setting. An HTTP schema/profile header must not make it reachable. Existing legacy exposure/settings are unchanged.
2. `anon`, `authenticated` and `PUBLIC` have no effective demo schema access, table privileges, sequence privileges or function execution. Test inherited grants as well as explicit ACL entries. All object changes, including explicit revokes, go through the separately generated, governed demo migration lineage.
3. Effective default privileges deny the same access for every role creating demo objects. Read `pg_default_acl`, role membership and relevant global defaults, and test newly created sentinel objects. PostgreSQL schema-specific defaults do not subtract global grants: in particular, a schema-only default revoke is not proof that `PUBLIC` lacks function EXECUTE. A future dedicated creator role can have isolated global defaults; no live role creation or change to a legacy creator's global defaults is approved here.
4. Every demo application table has RLS enabled and no browser policies. This is additional defense, not a replacement for schema/object privilege denial. The preparation adds no permissive browser policy.

The exception is a schema/access boundary only. Compute, connections, storage, project administrators, service credentials, outages, backup/PITR and recovery blast radius remain shared. A backup of the shared project is not an isolated demo backup. No cross-schema legacy FK, trigger, function dependency, query, import or migration/journal write is introduced.

### 5.3 Required readback and tests

Evidence is bound to the exact candidate, Supabase project, database and schema, migration/journal head and configuration manifest. Readback and both SQL-role and HTTP probes must run on the actual approved target before promotion. CI's disposable PostgreSQL tests prove local behavior only; they cannot prove Supabase provider exposure settings.

| Readback/probe | Required result |
| --- | --- |
| Project Data API/exposed-schema settings | Default: API disabled. Exact demo exception: API may remain enabled for legacy, `teach_v2_demo` is absent from all exposed-schema settings; legacy settings unchanged. |
| Effective schema/table/sequence/function privileges | Zero effective access for anon/authenticated and an unprivileged role inheriting PUBLIC, including inherited role grants and PUBLIC function EXECUTE. |
| Every demo object creator's effective defaults | No browser/PUBLIC privileges; newly created table/sequence/function sentinel probes denied; global defaults and role inheritance considered. |
| RLS and policy catalog | RLS enabled on every demo application table; no browser policies. |
| SQL denial probes | Fully qualified SELECT/INSERT/UPDATE/DELETE, sequence access and callable function access denied to browser/PUBLIC roles. |
| HTTP probes | Publishable/anon and authenticated requests, explicit demo schema/profile requests, table endpoints and applicable RPC paths are denied with attributable API authorization/schema errors. Network failure, missing credential, generic 404 or unexplained non-200 alone is not proof. |
| Legacy inventory/settings/journal before and after | Legacy schema, rows, grants, defaults, triggers, functions, exposed schemas and journal remain unchanged; only separately inventoried demo objects differ. |

Missing, unreadable, stale or contradictory project-specific evidence blocks promotion. Provider defaults, announced changes, project age and successful local tests never substitute for target readback. MIG-9/MIG-10 still require the fresh post-freeze named restore point and current isolated restore proof; §8 still requires manual exact-candidate owner approval. The design and unresolved live gates are in `governance/demo-schema-isolation/design.md`.

## 6. OQ-AUD-2 and OQ-AUD-3 — audit history and denial records

**AUD-2 (owner-supplied):** Identity, Membership, Assignment, DemoRun and Certification are reconstructable. Requirement: every state transition of those entities appends a LifecycleEvent in the same transaction; a replay test folds the events for each entity and must equal the current row's lifecycle fields. Projections (team lists, dashboards) are rebuilt from canonical state, never treated as canonical.

**AUD-3 (owner-supplied classes; engineering-proposed limits):**

| Denial class | Recorded | Key fields |
| --- | --- | --- |
| `CAPABILITY` (403 at C14 step 4) | Yes | actor, operation, organization, request ID |
| `TENANT_SCOPE` (403 at steps 2–3) | Yes | actor, requested organization ID, request ID |
| `TARGET_SCOPE` (404 at step 5 for an existing out-of-scope target) | Yes | actor, operation, target ID, request ID |
| `CREDENTIAL_ABUSE` (repeated 401 at sign-in, revoked/expired token or session replay) | Yes | client IP /24 (IPv4) or /48 (IPv6), credential type, request ID; never the submitted secret |
| `ORIGIN` (403 CSRF) | Yes | operation, origin class (missing / null / foreign), request ID |
| `VALIDATION` (400) and plain 401 with no session | **No** | — |

Deduplication: one row per (actor or IP prefix, class, operation, 5-minute bucket) using an immutable insert-only uniqueness key, without updating a stored audit-row count. Cap: 100 rows per actor per hour; beyond the cap the counter increments in memory and one overflow row is written per hour. Denial records follow the 1-year audit retention and the AUD-4 immutability rule.

## 7. OQ-REL-3 — deployed smoke test (REL-8)

Runs against the frozen candidate after deployment, before promotion. Every step records evidence (EVD-10). Uses a synthetic smoke organization classified `synthetic` (ANL-5).

| # | Check | Pass condition |
| --- | --- | --- |
| 1 | Runtime identity readback | Deployed source SHA, Vercel deployment ID, config-manifest SHA-256 (REL-6) and Drizzle migration head all equal the candidate binding (REL-1, REL-9) |
| 2 | `GET /api/health` | `200 {"status":"ok"}` |
| 3 | `GET /api/ready` | `200 {"status":"ready"}` |
| 4 | `GET /api/v1/session` with no cookie | `401`, valid error envelope |
| 5 | Unsafe request with missing `Origin` | `403`, zero writes |
| 6 | §5 database-role probes | All denied |
| 7 | Learner sign-in → start assigned content → record progress → complete | `2xx` each; one audit row per audited command committed with it |
| 8 | Same learner requests another tenant's learning session ID | `404`, byte-identical to nonexistent |
| 9 | Logout, then replay the old cookie | Logout `2xx` with clearing cookie; replay `401` |
| 10 | Recovery readiness | Prior candidate binding exists and is deployable; migrations since it are backward-compatible (REL-17); rollback path named (REL-10). Not executed in production. |

A `200` on the home page is not a step. Any failed step marks the candidate BLOCKED.

Dependency: step 7 needs a smoke organization, which needs tenant bootstrap — currently impossible (`02-…` §8). Until then REL-8 conformance is BLOCKED.

## 8. OQ-MIG-4 — production migration apply

Owner-supplied: manual, owner-approved, exact candidate. Procedure:

1. Candidate frozen; MIG-6 (empty-DB replay) and MIG-7 (apply to a copy of current production schema) PROVEN on the candidate SHA.
2. Fresh named restore point captured after the candidate is frozen (MIG-9); restore proof ≤ 30 days old (MIG-10).
3. Owner records approval naming candidate SHA, migration IDs and restore point.
4. Operator runs `pnpm db:migrate` against production with the release credential; output stored as evidence.
5. Post-apply readback: migration journal head equals candidate; MIG-14 drift check = 0.
6. CI holds no production database credential; a workflow that can reach production fails review.

## 9. OQ-OBS-1 and OQ-OBS-2 — error capture and log content

**OBS-1 (recommendation awaiting confirmation):** Sentry for server error capture. Required configuration if confirmed: `sendDefaultPii: false`; strip `Cookie`, `Authorization`, `Set-Cookie` headers and request bodies in `beforeSend`; tag events with request ID only. Conflicts to resolve on confirmation: (a) "Vercel Analytics for basic traffic" conflicts with OQ-ANL-1 (analytics disabled) unless the owner classifies it as operational traffic counts with no learner identifiers — this spec assumes it stays **off**; (b) Sentry's 30-day lookback does not satisfy OBS-11's 90 days, so a separate redacted log sink is still needed. **Alert destination: UNKNOWN** (owner value).

**OBS-2 (owner-supplied):**

| Logs MAY contain | Logs MUST NOT contain |
| --- | --- |
| request ID; operation name; HTTP method and route template (not the filled path); status; duration; denial class; C14 step that failed; opaque actor/organization IDs designated as operational identifiers | passwords, PINs, cookies, session credentials, single-use secrets, verifiers, hashes (OBS-6); request/response bodies; email addresses or names; observation-note text; progress payloads; filled URL paths; provider tokens |

Test: seed canary values into every input field; run core paths; scan all log sinks and Sentry events; any canary match fails (PRIV-AC-4).

## 10. OQ-TXN-2 — external providers (split)

Registers now: in scope = email delivery and OAuth sign-in; payments disabled. Reconciliation ownership: TransactionControl owns `ReconciliationRecord` for email sends (an email send with an ambiguous result is never retried before provider readback, TXN-6/7). OAuth code exchange is a read-like exchange with no external side effect to reconcile; a failed exchange simply fails sign-in. Residual: **which email provider and which OAuth provider(s)**. Until selected: no adapter exists, invitations and resets are created but not delivered, and the OAuth callback stays unmounted.

## 11. Historical r3.1 proposed registration text

| Contract | Question | Token |
| --- | --- | --- |
| C51 → 1.1.0 | OQ-EVD-1 | `INDEPENDENT_SECURITY_DATA_RELEASE_VERIFICATION` + §2 definition |
| C51 → 1.1.0 | OQ-EVD-2 | split: §3 mechanism; residual narrowed `OQ-EVD-2` duration + location |
| C51 → 1.1.0 | OQ-EVD-3 | `EXPLICIT_NON_COLLAPSING_TRUTH_MAPPING` = §4 |
| C21 → 1.2.0 | OQ-MIG-3 | `BACKEND_ONLY_APPLICATION_DATABASE` + §5 four controls and test |
| C21 → 1.2.0 | OQ-MIG-4 | `MANUAL_OWNER_APPROVED_PRODUCTION_APPLY` = §8 |
| C22 → 1.3.0 | OQ-TXN-2 | split: §10; residual narrowed `OQ-TXN-2` providers |
| C23 → 1.2.0 | OQ-AUD-2 | `IDENTITY_MEMBERSHIP_ASSIGNMENT_CERTIFICATION_HISTORY` |
| C23 → 1.2.0 | OQ-AUD-3 | `SECURITY_SIGNIFICANT_DENIALS_ONLY` = §6 table + limits |
| C52 → 1.3.0 | OQ-REL-3 | `SOURCE_ENV_AUTHORIZATION_RECOVERY_SMOKE_MATRIX` = §7 |
| C53 → 1.2.0 | OQ-OBS-1 | on confirmation: `SENTRY_ERRORS_ANALYTICS_OFF`; residual alert destination |
| C53 → 1.2.0 | OQ-OBS-2 | `NO_CREDENTIALS_OR_LEARNER_PAYLOAD_LOGGING` = §9 table |

## 12. Definition of Done

1. Owner approves; confirms or rejects OQ-OBS-1.
2. Registrations above; inventory drops by 8 (plus OBS-1 if confirmed and the residual split accepted); EVD-2 and TXN-2 rows narrow.
3. Separate implementation evidence: §5 controls and probes pass on the real Supabase project before any promotion; §7 smoke runs on a real candidate.

## 13. Change log

| Version | Date | Change |
| --- | --- | --- |
| 0.1.0 | 2026-10-05 | Initial proposed specification; adds Supabase default-exposure release blocker. |
| 0.2.0 | 2026-10-05 | Revised on `6553eb4`: added the closure-observer change from #74 (PR runs skipped, not BLOCKED) and its EVD-14 constraint; all target contract versions re-checked unchanged; narrowed-residual naming fixed; owner chat approval (including Sentry confirmation) recorded, registration pending #75. |
| 0.3.0 | 2026-10-05 | Audit correction: Supabase premise reworded — exposure is project-specific (opt-in default for new projects from 2026-05-30, enforced on existing projects 2026-10-30) and must be proven by readback from the target project; release blocker kept, with an explicit readback table (finding 5). |

| 2.0.0 | 2026-10-19 | Bound the C21 MIG-12 exception to the unexposed dedicated demo schema; preserve the nonexception default, historical #75/#82 scope and all release gates. Shared project resources/backups are not isolated. Local code/tests only. |

## Exact synthetic audit and replay (#82)

For the synthetic scope, Identity, Membership, Assignment and DemoRun lifecycle snapshots are finite, versioned, append-only, transaction-bound and replay exactly to current lifecycle fields. No candidate business event is promoted. AuditActor/AuditTarget unions and redacted fields are exactly those in the approved authority-and-audit.md. Denial dedup uses an immutable insert-only unique key per five-minute bucket, not mutation of an audit row counter; 100 rows/actor/hour and one overflow row/hour remain. This package creates no audit purge, production permission or verification evidence.

Exact owner approval: `domains/demo-runtime/owner-approval.json`; immutable governing definitions: `domains/demo-runtime/proposal-0.1.0/demo-boundary.md` and `domains/demo-runtime/proposal-0.1.0/authority-and-audit.md`. No implementation success is claimed by this logical registration.
