# First additive demo installation — manual preparation packet

NOT APPROVED FOR LIVE EXECUTION. No combined live runner or credentials are included. No final integrated source, recovery evidence or approval is granted by this document. Metadata must not be relabeled as permission. Do not execute lineage files individually in a SQL editor.

## Pin and review

The seven existing drizzle-isolated/*.sql files are the prepared isolated migration bytes. drizzle-isolated/manifest.json supplies each exact SHA256 and ordered journal hash/timestamp entry. Do not duplicate or transform those files. Pin the final integrated commit/tree and final model-proof/build hashes after review. Re-run the repository lineage verifier and compare each exact migration byte/hash; any difference requires a new reviewed plan. This document is preparation, not a frozen deployment candidate.

## Preconditions, all mandatory

- Exact target is existing t34ch acqafjkdkdmtpnsxiesw on PG17. Runway and all other projects are excluded. Database name/host alone is not provider identity; reconcile authenticated provider readback with the approved connection.
- Recovery policy and concrete recovery evidence must be accepted before applying anything. The previous content archive is insufficient. Capture, storage, role/credential creation and deployment are separate exact approvals, not covered by this packet.
- No concurrent legacy schema/ACL changes during before/apply/after comparison. Detect concurrent legitimate data writes separately; catalog fingerprints alone do not prove row or sequence-value preservation.
- Run collision-probes.sql. An existing teach_v2_demo namespace halts FIRST installation. Do not adopt, drop, reset or replay onto it. Existing proposed roles require independently verified provisioning identity and privileges.
- Migration creator and runtime are separate roles. Creator owns only new namespace/objects; runtime is nonowner, NOSUPERUSER, NOBYPASSRLS, no role creation, no DDL/journal/legacy access. Provisioning belongs in separately reviewed exact SQL, not broad public/all-schema grants. No role passwords are included here.
- Use least necessary authorized migration connection, verified TLS and separately confirmed project identity. No startup migration in the app. Do not remove loopback protections from existing local tooling.

## Atomic apply boundary after exact approval

1. Capture catalog-preservation.sql BEFORE. Keep metadata privately. The script returns hashes instead of function/policy bodies and never reads application/auth rows. It is only a metadata check, not recovery.
2. Start a transaction on a single connection under the approved creator. Set local lock_timeout 3s and statement_timeout 10s. Acquire the same transaction advisory lock (737304,29017). Recheck namespace absence under the lock. Stop on any mismatch.
3. Create only teach_v2_demo owned by that creator; revoke PUBLIC schema access. Create only its __drizzle_migrations journal: id serial PRIMARY KEY, hash text NOT NULL, created_at bigint NOT NULL UNIQUE.
4. Apply the seven exact isolated files in manifest order. Existing statement-breakpoint comments are separators, not dynamic rewriting. After each file, append its manifest isolatedSha256 and when timestamp to the schema-qualified journal. No historical public drizzle files, runtime remapping, search_path routing or unqualified journal.
5. The isolated lineage intentionally includes scoped revocations/RLS/default privileges INSIDE teach_v2_demo. It must never execute schema-wide sweeps against public or other legacy schemas. No global grants/default privileges, legacy ALTER/DROP or cleanup.
6. Check ordered journal id/hash/created_at against the manifest and compare newly created object inventory with the reviewed model. Any failure rolls back the whole transaction; no statement-level continuation. COMMIT only after exact approval and all transactional checks. An uncertain COMMIT result requires canonical journal/catalog reconciliation BEFORE any retry.
7. Run catalog-preservation.sql AFTER and compare every legacy result. Run approved separate data/sequence preservation checks, which are NOT provided or authorized by this metadata-only packet. Unexpected change stops activation. Legitimate concurrent changes require reconciliation, not automatic PASS.
8. Provision runtime grants/RLS policies only from their separately reviewed and approved exact artifact. No runtime connection or grants are implied by successful schema creation. Verify anon/authenticated/PUBLIC denial, project schema exclusion, effective inheritance and no legacy privileges with the actual provider.

## Failure and rollback

Before COMMIT, ROLLBACK the single transaction. After COMMIT, do not DROP the namespace, overwrite the whole DB, restore over newer legacy writes or revoke broad shared access. Keep v2 undeployed or stop its admission/traffic using an approved scoped change, preserve new records, reconcile evidence, then prepare a reviewed forward fix. Destructive cleanup requires its own explicit decision.

## Limits

These probes cover selected catalog metadata only, including table/column flags, constraints, policies, functions, triggers, ACLs/defaults, roles/memberships and extensions. They do not cover application rows, sequence last_value/is_called, complete dependency/owner coverage, provider settings or stored secrets. Complete required preservation coverage remains a release gate. No live read or mutation was performed while preparing this packet. Schedule/expiry cleanup is not part of installation; application expiry enforcement remains required independently.
