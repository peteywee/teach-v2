<!--tos-doc
{
  "doc_id": "TEACH-DEMO-SCHEMA-ISOLATION-DESIGN",
  "class": "architecture-decision",
  "version": "1.0.0",
  "claims_truth_state": "declared",
  "status": "active",
  "owner": "Patrick Craven, Top Shelf Service LLC",
  "created_on": "2026-10-19",
  "updated_on": "2026-10-19",
  "effective_on": "2026-10-19",
  "approval": {
    "state": "approved",
    "approved_version": "1.0.0",
    "record": "governance/demo-schema-isolation/owner-approval.json",
    "basis": "Bounded owner approval of schema-isolation preparation and Node 24, recorded 2026-10-19 UTC. Code and local tests only; no live actions."
  },
  "baseline": {
    "repo": "peteywee/teach-v2",
    "ref": "main",
    "commit": "87c427ebb4b7e8f5b65ae04a1c47165ccea81932",
    "purpose": "Known source baseline for local schema-isolation preparation; not a deployed candidate assertion"
  },
  "governed_by": ["TEACH-CON-C00", "TEACH-CON-C21", "TEACH-CON-C51", "TEACH-CON-C52"]
}
-->

# Dedicated demo schema: bounded local preparation

## Decision and authority

Prepare the exact synthetic demo for `teach_v2_demo` within the existing legacy Supabase PostgreSQL project, while leaving the legacy Data API enabled and its objects/settings unchanged. C21 2.0.0 replaces only the demo's project-wide API-disable control with the stricter schema exclusion and effective privilege checks described below. Every nonexception application schema retains the project-wide Data API-disable default.

The owner approved code and local tests only and selected Node 24 rather than the offered Node 22. The minimal owner decision summary is in `owner-approval.json`; its UTC recording date is not an invented approval timestamp. Local test execution does not grant runtime activation, live data access/change, provider configuration changes, role/credential creation, deployment, spending, independent verification or promotion approval. This document describes a design and acceptance obligations, not completed test or provider evidence.

## Isolation boundary and non-goals

- Schema-local object names, migration history, privileges and dependency boundaries are isolated.
- Compute, connection limits, storage, maintenance, outages, project administrators, service credentials, backups/PITR and recovery blast radius are NOT isolated. A project restore can affect legacy and demo together. This is not a separate database, project, security administrator or disaster-recovery domain.
- Legacy tables/data, public functions/triggers, grants/defaults, exposed schemas, journal and runtime behavior remain unchanged. No legacy data import is introduced. Reusing a project does not authorize copying real users, production records or credentials into the demo.
- No existing semantic entity, requirement ID, API route, capability or synthetic content definition is changed merely to select a physical schema. Existing product semantics and their approval/admission gates remain controlling.

## Target-scoped persistence model

1. Select the target once at process/config initialization through the finite `TEACH_DB_SCHEMA` selector: absent or `public` preserves the existing local/public behavior; `teach_v2_demo` selects the demo model; any other value fails closed. Target choice is not accepted from a request, query string, cookie or user content.
2. Use an explicit Drizzle `pgSchema('teach_v2_demo')` target-scoped table factory, preserving the `public` model as the default. All tables in a configured process use the same selected model; it cannot drift per query or request. The prepared migration compiler does not consume this model; model-to-DDL equivalence remains a separate unestablished verification gate.
3. Drizzle-emitted runtime table references, derived migration FK targets and hand-authored SQL must be fully qualified for the selected target. Explicit qualification applies to trigger functions, function-internal table references, raw repository SQL, integration fixtures, ownership/ACL/RLS probes and migration journal reads/writes. SQL must not rely on a mutable `search_path` to decide which application's object receives a write.
4. No catch-all runtime SQL rewriting or regex substitution of SQL text is a namespace strategy. Names are explicit source-level identifiers, assembled only from the fixed target allowlist where required. No user-controlled SQL identifier is accepted.
5. Function search paths must be safe and declared where relevant; all application-object references inside functions are qualified. A malicious same-name object in `public` must not redirect demo function/repository behavior.
6. Cross-schema FKs, triggers, function dependencies, raw queries or public/demo dual writes are rejected. Catalog checks must verify dependency targets, not just scan CREATE TABLE statements. Shared PostgreSQL built-ins/catalogs are not legacy application dependencies.

## Separate, reproducible migration lineage

The historical public lineage `0000`–`0006`, including its snapshots and journal, remains byte-for-byte immutable. No historical migration is rewritten, silently renamed, moved or treated as already applied in the demo lineage.

Prepare the separate `drizzle-isolated/` target-specific output directory through `scripts/db/compile-isolated-schema.mjs`, applied only by `scripts/db/migrate-isolated-schema.mjs`. The prepared compiler is a closed lexical derivation from the exact hash-pinned historical `0000`–`0006` SQL and journal. It preserves the source files, qualifies the finite inventoried object names and function bodies, and adds named schema-local hardening statements. It rejects changed historical bytes or an unreviewed historical SQL suffix. It is not a Drizzle Kit model-to-DDL generation pass, a general-purpose SQL transformer or a runtime rewrite mechanism.

Run the compiler twice under pinned Node 24.x with the repository lockfile/toolchain recorded, comparing the deterministic derived SQL, manifest and journal bytes. Explicit namespace/FK/function checks and clean disposable PostgreSQL replay provide bounded structural and behavioral evidence. They do not establish complete semantic equivalence between the selected Drizzle model and replayed DDL. No newly generated Drizzle semantic snapshots or model-to-DDL drift proof are claimed. Full model-to-DDL/snapshot semantic drift verification is NOT ESTABLISHED by this preparation and remains a required future candidate gate under MIG-14; this limitation does not relax C21 or permit promotion.

The demo owns the separate schema-qualified `teach_v2_demo.__drizzle_migrations` journal and starts with an empty demo journal. It must not use, mark entries in, or reset the public/legacy journal. The runner must assert the selected lineage, exact target schema and journal identity together before execution. Existing public migration commands must not silently switch to the demo target, and a demo command must not accept a different schema.

Use only a disposable loopback PostgreSQL target for execution during this approval. Reject remote/unknown hosts, shared/production flags and ambiguous existing demo objects. Fail closed on collision rather than dropping/recreating a schema. A local legacy fixture includes deliberately colliding public object names so that unsafe qualification fails visibly.

A future shared-project candidate must include both from-zero replay and upgrade replay against an isolated copy of the current shared database, preserving legacy inventory and pending migration semantics. MIG-7 is not satisfied by an empty synthetic-only database.

## Browser and default-privilege boundary

The Supabase project's Data API may remain enabled for legacy only if `teach_v2_demo` is absent from every exposed-schema setting. No table/RPC/browser access, schema-profile header, GraphQL exposure where applicable, inherited role grant or PUBLIC privilege may bypass this exclusion. Local code cannot prove provider settings; exact-target provider readback and attributable HTTP denials remain outstanding release gates.

In the demo schema, `anon`, `authenticated` and `PUBLIC` receive no effective schema access, table privileges, sequence privileges or function EXECUTE. Read both explicit ACLs and effective privileges. Every demo table has RLS enabled and no browser policy. RLS is defense in depth, not a substitute for revocation.

Default privilege checks cover every demo object creator and role inheritance. PostgreSQL's schema-specific defaults cannot revoke a global grant, including the built-in PUBLIC function EXECUTE default. Therefore a schema-only `ALTER DEFAULT PRIVILEGES ... REVOKE` is insufficient evidence. Isolated local tests must verify fresh table/sequence/function sentinel access under the actual creator configuration. A future dedicated creator's own global defaults may be a safe design, but this approval does not create that role or modify any live/global legacy creator default. If effective defaults cannot be denied without affecting legacy, the candidate is blocked rather than broadening the exception.

## Proposed runtime and migration identities

The design proposes dedicated backend-only runtime and separately controlled migration/object-creator identities, scoped to demo objects, with no legacy schema access, superuser, role administration or project service credential. These are proposals only: no live role, login, password, grant, persistent access or credential is created or activated by this work.

Disposable-local proof uses dedicated creator/runtime roles, exact scoped SELECT/INSERT/UPDATE privileges and runtime-only RLS policies, with no runtime journal/DDL access. `scripts/db/verify-isolated-schema.mjs` invokes the representative `scripts/db/exercise-isolated-schema-runtime.ts` behavior proof. These local policies grant no browser role access. The backend's exact RLS strategy and minimum object/function privileges must still be reviewed and proven against the actual target before live role approval. A non-owner role with RLS enabled and no applicable policy cannot be assumed to perform writes. Do not silently solve this by giving the runtime a project-admin identity, service-role credential, schema ownership or BYPASSRLS. Any needed backend-only policy or narrowly scoped function ownership design requires explicit treatment in the future role/candidate review, while all browser/PUBLIC denial remains mandatory. Credential creation and live grants retain their own authorization requirements.

## Local acceptance evidence

The implementation must record commands, runtime/tool versions and results without claiming independent review or shared-target proof:

1. Hash historical `0000`–`0006`, old snapshots/journal and all immutable approved packages before/after. Exact equality is required.
2. Compile the hash-pinned historical inputs twice with the pinned toolchain; compare derived SQL/manifest/journal bytes and verify explicit namespace/FK/function targets. These are deterministic-derivation checks, not model-driven semantic snapshot generation or a complete model-to-DDL drift proof.
3. Replay the new lineage on two fresh disposable databases. A second normal migration invocation is a no-op with the same journal head, not a replay of destructive statements.
4. Inventory a populated legacy/public fixture before/after demo replay and demo behavior tests: relations, columns, constraints/indexes, functions/triggers, ACLs/defaults, journal and representative row values remain identical. Demo journal and objects are separately inventoried.
5. Verify every demo table's RLS and absence of browser policies, effective schema/table/sequence/function privilege denial for anon/authenticated and a plain role inheriting PUBLIC, inherited privilege checks, and fresh-object effective defaults for every creator.
6. Exercise representative identity/session/token/content/learning/audit/demo-run transactions with explicit schema selection, including an adversarial search path and same-name public objects. Reject invalid schema names and remote/shared database targets.
7. Run existing public-target tests and governance/registration validators unchanged in their historical scope. New successor verification must validate current docs first; it may supply preserved predecessor bytes only for historical package checks. No validator may accept arbitrary modified current authority or silently repin an old approved package.
8. Run under Node 24.x. Record the actual local patch and dependency versions; do not claim a local patch is Vercel's deployed patch. Future Vercel readback must bind the observed Node patch to the approved candidate/environment.
9. Report full model-to-DDL/snapshot semantic drift verification as NOT ESTABLISHED. Derivation reproducibility, explicit namespace checks and replay cannot be relabeled this missing proof; a later candidate must establish it before promotion.

## Live gates intentionally still open

Before any later shared/live operation: identify the exact Supabase project/database/schema, exposed schemas and grants; approve needed role/credential creation separately; approve the exact frozen source candidate and migration IDs; record the fresh named post-freeze restore point; prove recovery in an isolated same-major target within 30 days and after any backup-configuration change; prove replay against the current production-schema copy; establish full selected-model-to-DDL/snapshot semantic drift verification and reconcile journal/catalog drift; complete independent verification and C52 promotion/smoke/configuration gates; then obtain the applicable exact apply/deployment approval. Shared-project recovery must explicitly account for legacy data and users. No site visit, read-only discovery or local test waives those gates.

Unknown, missing, stale or contradictory evidence blocks the relevant step. No generic HTTP non-200, provider default, local test pass, policy registration or hash seal may be labeled deployment readiness.

## Change log

| Version | Date | Change |
| --- | --- | --- |
| 1.0.0 | 2026-10-19 | Record bounded owner-approved local preparation, dedicated schema design, Node 24 target, immutable lineage, effective privilege controls and preserved live gates. |
