# Local implementation evidence: isolated demo schema

Recorded 2026-10-19 UTC. This is implementation-owned, local automated evidence,
not independent review, a release PASS, live database evidence or deployment
authorization.

## Implemented boundary

- A separate hash-pinned lineage in `drizzle-isolated/` targets only
  `teach_v2_demo`. Historical `drizzle/0000`–`0006` and their journal remain
  byte-identical to the pins in `scripts/db/compile-isolated-schema.mjs`.
- Offline lexical compilation qualifies application references, including
  function bodies, and PostgreSQL builtin calls. Historical dynamic trigger and
  public-wide security loops are replaced before any execution. Runtime runs
  exact verified committed-candidate SQL, never broad text substitution.
- The local-only atomic runner validates opt-in, loopback URL, safe database
  name, conflicting pool options, connected server/database, namespace
  ownership, journal presence and the entire journal hash/timestamp prefix.
  Its journal is `teach_v2_demo.__drizzle_migrations`.
- Schema/table/function/sequence revokes, RLS and schema-local default changes
  target only the isolated namespace. No application runtime role, runtime grant
  or runtime RLS policy is installed by the migration lineage.

## Verified toolchain

- Node v24.19.0.
- pnpm 12.8.1 through the pinned local Corepack cache.
- PostgreSQL 17.11 (Debian 17.11-0+deb13u1), disposable loopback cluster only.

## Commands and final observed results

The environment-specific `--config.verify-deps-before-run=false` avoids pnpm
attempting to modify the shared prepared dependency symlink. It does not change
the pinned package-manager version.

1. `corepack pnpm --config.verify-deps-before-run=false exec node scripts/db/compile-isolated-schema.mjs`
   - Passed: seven pinned migrations, 22 application tables, 39 functions and
     the isolated journal verified byte-for-byte.
2. `corepack pnpm --config.verify-deps-before-run=false exec node --test scripts/tests/validate-isolated-schema-lineage.test.mjs`
   - Passed: 5/5 tests covering determinism, literal/comment preservation,
     function-body qualification, source/journal/output/extra-file drift and
     fail-closed preconnection target/override checks.
3. `corepack pnpm --config.verify-deps-before-run=false exec tsc --noEmit`
   - Passed for the candidate code.
4. `TEACH_DB_SCHEMA=teach_v2_demo bash <private-local-PG17-wrapper> corepack pnpm --config.verify-deps-before-run=false exec node --import tsx scripts/db/run-isolated-schema-proof.ts`
   - Passed; exact final output is in `local-pg17-proof.log` beside this file.
   - Seven migrations, 22 application tables plus one journal, 39 functions.
   - Two independent clean replays matched; checked reapplication was a no-op.
     Existing foreign-owned/unjournaled namespaces were refused without changes;
     journal tampering was rejected.
   - 35 negative/effective-default probes and 10 demonstrated hostile builtin
     resolution probes passed. Both named `anon` and `authenticated` roles kept
     representative legacy public table/function access but were denied demo
     table/write/function/sequence access.
   - Non-owner/non-bypass runtime used explicit demo-only test grants/policies.
     Its protected legacy/table/sequence/RPC/journal/DDL attempts were denied.
     No runtime access to the journal sequence was granted.
   - Actual application runtime passed learner admission, recipe content reads,
     idempotent session start, three progress responses, completion, manager
     persona switch/read, close and required audit writes under hostile
     `search_path`.
   - Representative legacy inventories, owners, ACLs, RLS/policies, defaults,
     data, sequence state and both pre-existing journal locations were identical
     before/after migration and runtime exercises.
   - All locally created databases and roles were removed, and the wrapper
     stopped PostgreSQL successfully. Existing local API roles, if any, were
     not dropped or altered.

The logged schema fingerprint is comparable between the two clean replays in
that run. It includes uniquely named disposable-role ACLs, so it is deliberately
not a cross-run or live-schema identity attestation.

The coordinating implementation task also reran the public baseline after the
runtime target/builtin changes. Saved logs beside this file record:

- `public-runtime-regression.log`: 14/14 public application integration tests
  passed; PostgreSQL was stopped after cleanup.
- `demo-unit-regression.log`: 56/56 demo unit tests passed.
- `foundation-regression.log`: 194/194 foundation tests passed.

These additional runs are still implementation-owned regression evidence, not
an independent review or release decision.

## Explicit limits and remaining gates

- No model-to-DDL equivalence proof is claimed. Generated SQL is deterministically
  derived from pinned historical SQL; that is not an independent Drizzle model
  equivalence check.
- Schema-local default revokes do not override global `PUBLIC EXECUTE` defaults.
  The proof changed the global function default only for a newly created local
  synthetic creator, then tested effective future-object privileges. A real
  dedicated creator policy remains proposed and requires separate approval.
- Local direct-SQL role denials are not Supabase REST/GraphQL/RPC endpoint or
  API exposed-schema evidence. Existing real `PUBLIC` grants, role inheritance,
  ownership and legacy behavior must be inventoried before a shared deployment.
- No remote database, credential, live role/grant, API configuration, project-wide
  Data API switch, push, deployment or spending was performed or authorized.

## Final compatibility checks after independent source review

- Whole-repository audit passed all 58 standalone authority/admission validators;
  exact output: `whole-repository-audit.log`. This retains shared/production
  execution BLOCKED and is not a release acceptance statement.
- Historical default-public Drizzle Kit generation reproduced the existing
  22-table snapshot and generated DDL exactly; output:
  `public-generation-regression.log`. This is a public-baseline regression only,
  not isolated model-to-DDL semantic equivalence proof.
- Independent source-compatibility review is separately recorded in
  `engineering-independent-review.json`. It does not independently attest the
  PostgreSQL runtime execution described in this implementation-owned report.
