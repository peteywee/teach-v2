# Teach v2

Teach v2 is an approved modular-monolith foundation with five physical persistence slices. The current storage inventory is **8 tables / 5 immutable migrations / 8 PostgreSQL repositories / 5 implemented slices**. That inventory proves storage; it does not establish complete runtime command or contract conformance.

The controlling layers are [K00](kernel/manifest.json), [contracts](contracts/README.md), [ownership](domains/ownership-map.json), [architecture](architecture/authority.json), [Application Interfaces](application-interfaces/authority.json), and [Persistence Model](persistence/authority.json). Historical proposal and approval baselines remain historical. [Physical readiness](persistence/physical-slices/readiness.json) records the current admitted slices.

| Component | Current evidence | Remaining integration |
| --- | --- | --- |
| TransactionControl P01 | Reconciliation storage, terminal resolution, scope and idempotency contention | Provider-neutral Application reconciliation foundation; real provider adapter and protected runtime wiring |
| Identity P02–P04 | Identity/session/token/Credential storage and scoped PostgreSQL proofs | Complete authorization, required audit, credential-change revocation, invitation membership orchestration, and offboarding orchestration |
| Learning P05 | Required Assignment reference, Identity FK, closed lifecycle, one completion winner | Authoritative Assignment existence/authorization and atomic start, tracked in [#58](https://github.com/peteywee/teach-v2/issues/58) |
| Assignment P06 | Evidence plan and automated **BLOCK** evaluation | Shape/content-version/scope decisions and admission gate [#60](https://github.com/peteywee/teach-v2/issues/60) |
| Certification P07 / ProgressEvent P08 | Separate evidence plans and automated **BLOCK** evaluations | Owner shape/version/criteria/scope decisions and physical admission |
| Transport / UI / production | **Not proven** | Transport authority, runtime acceptance and production backup/restore/release evidence |

Run the dependency-free integration audit from the repository root:

```bash
node scripts/architecture/validate-whole-repository.mjs
node scripts/tests/validate-validators.mjs
node --test scripts/tests/validate-isolated-database-target.mjs
node scripts/packaging/validate-apply-guards.mjs pins
```

`Whole Repository Integration Audit` runs on every PR and every main update, without path filters. It executes every standalone authority/admission validator and checks module dependencies, Application-owned ports, isolated database entry guards, and future-slice gates. All five physical-slice workflows also run on every PR/main tree. The [command coverage ledger](verification/whole-repository/command-coverage.json) traces all 23 approved commands to partial artifacts or explicit blockers. Structural checks supplement exact-source PostgreSQL evidence; they cannot prove runtime authorization or deployed behavior.

Database migration, replay, and integration entry points currently require `TEACH_ISOLATED_DB=1` and a loopback PostgreSQL URL naming a disposable `teach_v2` test database. Remote targets, target-changing query parameters, and shared/production names are rejected before a Pool is created. The isolation declaration is an operator assertion; it is not production authorization or a backup/restore proof. Shared/production execution remains **BLOCKED**.

See the [whole-repository audit findings and dependency diagram](verification/whole-repository/2026-10-04-audit.md).

The [super-batch coverage report](verification/whole-repository/2026-10-04-super-batch.md) records input-validation repairs, expanded failure/contention coverage and the next dependency gates.

The [development self-audit and connected-mechanism report](verification/whole-repository/2026-10-05-connections-self-audit.md) records the initial 21-stage workflow. It runs on every PR/main change, records exact source/tree and output provenance, checks complete validator/test inventories, and retains failed evidence. During development, `pnpm self-audit` runs the next bounded checkpoint; `pnpm self-audit --finish` reconciles a clean committed source. Dirty or incomplete checkpoints cannot establish aggregate proof.

Identity deactivation/reactivation now have Application orchestration and an exact PostgreSQL transaction binder for authorization, lifecycle writes, session revocation and required audit. Backend authorization/audit adapters remain mandatory. Disposable PostgreSQL probes prove rollback mechanics; full protected runtime conformance remains UNKNOWN. The self-audit supplements review and cannot represent independent review or production permission.

The [complete unresolved owner-decision packet](verification/legacy-recovery/owner-decisions.md) lists all active questions, their recommended options, physical-shape placeholders and semantic candidates. The [V1 recovery comparison](verification/legacy-recovery/recovery-report.md) distinguishes pinned main from the later cutover branch, historical evidence from fresh helper tests, and mechanisms from unapproved policy. Recommendations remain PROPOSED.

The current self-audit has 23 bounded stages, including decision-inventory regressions and PostgreSQL session-command rollback/contention evidence. Session revocation now authorizes, performs an owner-scoped conditional transition, and appends required audit in the same transaction. Terminal/repeated calls cannot append another success audit. Real C14 authorization and admitted AuditEvent adapters remain required before runtime activation.

The [owner policy registration and review](verification/owner-decisions/2026-10-04/review.md) records five selected values through #66 and preserves draft/recommended/unknown states. Contract package 0.15.0 resolves PIN parameters, hosting, 24-hour rollback, one-year central audit retention and 90-day operational log retention. The live unresolved inventory is now 61 questions / 18 explicit blockers. New matrix #67 and privacy review #68 remain open; no runtime, deletion, analytics, schema or production execution is enabled.

## Reuse recorded owner answers

Before asking for policy input, read the [preserved owner answers](verification/owner-decisions/README.md). All 66 original question IDs are indexed with source text, receipt/registration states, remaining work and next actions. Blocked implementation does not require repeating an already supplied answer.
