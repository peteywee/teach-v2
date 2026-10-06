<!--tos-doc
{
  "doc_id": "TEACH-PROP-DCS-07",
  "class": "specification",
  "version": "0.3.0",
  "claims_truth_state": "declared",
  "status": "proposed",
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
  ]
}
-->

# Evidence, Release and Operations Specification

| Field | Value |
| --- | --- |
| Status | `proposed` |
| Owner decision | Approved in chat 2026-10-05 04:05 America/Chicago (decision sheet A–D). Registration PENDING under SYS-21 #75; this document stays `proposed` until it lands. |
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

Owner-supplied: no browser-reachable application tables; no implicit RLS exemption.

Required controls on the target Supabase project, all four (defense in depth). They hold regardless of the project's creation date or Supabase's default:

1. **Disable the Data API** for the project (Teach V2 does not use PostgREST; all access is backend-only). With it disabled, no auto-generated REST endpoint responds regardless of grants.
2. **Revoke existing privileges** on every application table from `anon` and `authenticated`: `REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;` and the same for sequences and functions.
3. **Revoke default privileges** so future tables are not exposed: `ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated;` (repeat for sequences, functions; for each role that creates objects).
4. **Enable RLS with no policies** on every application table: `ALTER TABLE <t> ENABLE ROW LEVEL SECURITY;` — a fallback that denies rows if a grant reappears.

Items 2–4 are schema/privilege changes and therefore go through Drizzle migrations (MIG-3, MIG-4), not dashboard edits. Item 1 is a provider setting recorded in the release configuration manifest (REL-6).

Test (MIG-AC for MIG-12), run against the deployed candidate's database and against CI Postgres with Supabase-equivalent roles created:

```sql
SET ROLE anon;  SELECT 1 FROM identity_identities LIMIT 1;  -- expect: permission denied (42501)
SET ROLE authenticated; INSERT INTO learning_sessions VALUES ('x','y','z','ACTIVE'); -- expect: 42501
RESET ROLE;
SELECT grantee, table_name, privilege_type FROM information_schema.role_table_grants
 WHERE grantee IN ('anon','authenticated') AND table_schema = 'public';            -- expect: 0 rows
SELECT relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
 WHERE n.nspname='public' AND c.relkind='r' AND NOT c.relrowsecurity;              -- expect: 0 rows
```

Plus an HTTP probe: `GET https://<project>.supabase.co/rest/v1/identity_identities` with the project's publishable key → not 200.

**Release blocker:** no candidate may be promoted to an environment backed by Supabase until all four checks pass on that environment, proven by readback from that project:

| Readback | Source | Pass |
| --- | --- | --- |
| Data API enabled? Exposed schemas | Supabase project API settings, recorded in the release config manifest (REL-6) | Data API disabled, or `public` not exposed |
| Table, sequence, function grants to `anon`/`authenticated` | `information_schema.role_table_grants`, `role_routine_grants`, `pg_class.relacl` | Zero rows / no ACL entries |
| Default privileges in `public` | `pg_default_acl` for every object-creating role | No entry granting to `anon` or `authenticated` |
| RLS on every application table | `pg_class.relrowsecurity` | True for all |
| HTTP probe with the publishable key | `GET /rest/v1/<table>` | Not 200 |

## 6. OQ-AUD-2 and OQ-AUD-3 — audit history and denial records

**AUD-2 (owner-supplied):** Identity, Membership, Assignment, Certification are reconstructable. Requirement: every state transition of those entities appends a LifecycleEvent in the same transaction; a replay test folds the events for each entity and must equal the current row's lifecycle fields. Projections (team lists, dashboards) are rebuilt from canonical state, never treated as canonical.

**AUD-3 (owner-supplied classes; engineering-proposed limits):**

| Denial class | Recorded | Key fields |
| --- | --- | --- |
| `CAPABILITY` (403 at C14 step 4) | Yes | actor, operation, organization, request ID |
| `TENANT_SCOPE` (403 at steps 2–3) | Yes | actor, requested organization ID, request ID |
| `TARGET_SCOPE` (404 at step 5 for an existing out-of-scope target) | Yes | actor, operation, target ID, request ID |
| `CREDENTIAL_ABUSE` (repeated 401 at sign-in, revoked/expired token or session replay) | Yes | client IP /24 (IPv4) or /48 (IPv6), credential type, request ID; never the submitted secret |
| `ORIGIN` (403 CSRF) | Yes | operation, origin class (missing / null / foreign), request ID |
| `VALIDATION` (400) and plain 401 with no session | **No** | — |

Deduplication: one row per (actor or IP prefix, class, operation, 5-minute bucket) with a `count`. Cap: 100 rows per actor per hour; beyond the cap the counter increments in memory and one overflow row is written per hour. Denial records follow the 1-year audit retention and the AUD-4 immutability rule.

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

## 11. Proposed registration text

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
