# Prepared demo: model-to-catalog equivalence

Run from the repository root with the installed lockfile dependencies, Node 24,
and a disposable loopback PostgreSQL 17 administrator connection:

```
TEACH_ISOLATED_DB=1 TEACH_DB_SCHEMA=teach_v2_demo \
DATABASE_URL=postgresql://LOCAL_USER@127.0.0.1:LOCAL_PORT/teach_v2_local_check \
node scripts/db/verify-isolated-model-equivalence.mjs
```

The connection is only a local administrative entry point. The verifier creates
and deletes two uniquely named disposable databases; it does not apply migrations
to the database supplied in DATABASE_URL. It does not access hosted databases,
create provider resources, grant runtime access, or authorize a release.

## Independent derivations

1. Verify installed drizzle-kit 0.31.11 and drizzle-orm 0.45.3. Generate fresh DDL
   directly from demo-persistence-schema.ts with TEACH_DB_SCHEMA=teach_v2_demo,
   using the pinned local generator without historical snapshots. Generation and
   migration inputs are bound to this script’s checkout, not the caller’s cwd. Create the
   namespace explicitly (the namespace object is not exported by the model).
2. Apply that generated DDL in database A.
3. Independently verify and apply the committed isolated migration lineage in B
   using the existing guarded migration entry point.
4. Read PostgreSQL 17 catalogs in both databases with pg_catalog search_path.
   Compare all modeled tables and their persistence, column names/types/typmods/defaults/nullability/
   identity/generated flags/collations, CHECK/PK/UNIQUE/FK definitions and
   validation/deferrability, and index definitions/uniqueness/validity/readiness.
   FK actions and targets, expressions, predicates, operator classes and index
   ordering are covered by PostgreSQL's canonical definitions. Constraint/index
   names are significant. Physical column order is intentionally insignificant.
5. Require the six explicitly listed handwritten SQL constraints/indexes in B to
   match their exact catalog definitions before excluding them from the modeled
   comparison. Unexpected additions or omissions fail. The migration journal is
   intentionally excluded because it is migration infrastructure, not an owner
   model table.
6. Mutate B inside rollback-only transactions and require comparison failure for
   an extra table, durability change, type change, default change, nullability change, extra column,
   collation identity change, missing FK, missing CHECK, missing modeled index and missing custom index.
   Confirm the pristine comparison again after every rollback.
7. Disconnect and remove both databases and temporary generated output, including
   on failure. No FORCE DROP or unrelated backend termination is used.

## Verified baseline (2026-10-19)

Node 24.19.0, PostgreSQL 17, base successor 0f9739c:
22 tables; 188 columns; 116 modeled constraints; 51 modeled indexes;
2 custom CHECKs; 4 custom indexes; 11 negative mutation probes passed.

There are also 39 custom functions and 34 noninternal triggers. These are counted
for transparency, not proved equivalent to a model that does not represent them.
Their semantics, custom SQL runtime behavior, grants, RLS, hostile search paths,
legacy noninterference, transaction/timeout behavior, Supavisor/TLS and deployed
credential behavior remain separate verification gates. In particular this proof
is not evidence of full live-release or security readiness.

The catalog equivalence is bounded to the concrete types and structures in this
prepared schema. It is not a general SQL equivalence prover; enum/domain/type
creation, partitioning, sequence settings, storage parameters and privileges are
not part of this model's selected gate. Future use of these structures requires
extending the verifier and its mutation tests rather than broadening the claim.
