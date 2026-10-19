# Recovery preparation verification

Baseline: merged main 86a7ba6e10cc851da25c7e5331350caf622e6d4f. At the preparation baseline, active contracts, migration lineage, PR90/PR91 source evidence and provider state were unchanged. The original checks below establish preparation only. A subsequent owner-approved adoption candidate activates the bounded policy and evidence-shape dispatch; actual t34ch recovery evidence remains UNKNOWN. Adoption-specific exact-source results are recorded separately from these historical preparation checks.

Verified locally on Node 24.19.0:

- 61 evidence-shape tests passed, covering scope/candidate mismatch, missing or unknown coverage, unsafe exclusions, namespace/role collision, ambiguous prior apply, wrong backup/artifact/configuration, stale/future/invalid timestamps, missing actual-restore declarations and unsafe rollback.
- Existing production-proof test suite passed with native-only behavior unchanged.
- Existing production-proof contract-decision validator passed.
- 14 schema-isolation registration/engineering regressions passed.
- Whole-repository audit passed all 58 standalone authority/admission validators.
- Actual local PostgreSQL 17 mechanism rehearsal passed: newly generated synthetic fixture; exported repeatable-read snapshot; custom-format pg_dump; AES-256-GCM encryption; ciphertext readback; authenticated decryption; pg_restore into a separate disposable database; schema-definition/row/journal/sequence/role-map/extension/ACL/RLS equivalence; exact isolated candidate migration left the legacy fixture unchanged.
- Ciphertext corruption rejected; five independent RLS/ACL/sequence/row/journal corruptions detected and repaired back to equality; failed additive transaction rolled back both its synthetic legacy write and temporary namespace.

## Reproduce focused preparation checks

Run node --test scripts/tests/validate-demo-recovery-evidence.mjs.

For the mechanism rehearsal, use the existing disposable-loopback PostgreSQL17 harness with TEACH_ISOLATED_DB=1, TEACH_DB_SCHEMA=teach_v2_demo, an explicit passwordless loopback DATABASE_URL with user and port, and PG17_BIN pointing to installed official PostgreSQL17 client binaries. Run node scripts/db/verify-demo-recovery-rehearsal.mjs. The script refuses other PG environment overrides, verifies the actual administrative server address/major before any DDL, creates only fresh uniquely named synthetic databases and a NOLOGIN role, and cleans them using guarded no-FORCE cleanup. Never point it at a provider or a forwarded production connection.

## Limits

The encryption key is a PUBLIC FIXED TEST KEY and is intentionally unsuitable for real data. Only synthetic ciphertext is written to a temporary directory, then removed. Real capture destination, encryption/key custody, retention and access have not been chosen or approved; no method/configuration parity with a future real capture is claimed.

The source fixture is quiescent and has no secret/storage/external dependencies. This does not prove capture consistency under concurrent legacy writes or sequence advancement. Its nonsecret role mapping uses the same disposable cluster's NOLOGIN identity, and the membership inventory is empty; independent role recreation or nonempty membership restoration is not proved. The capture schema contains rows, enum/view, constraints/indexes, trigger/function, ACL/default privileges, RLS policy, sequence state and a migration journal. No actual Supabase objects, auth/session secrets, storage, network calls or provider setting changes are involved.

The shape validator does not read artifacts, authenticate reviewers or grant authority. Matching hashes/Boolean declarations can be forged; actual evidence review and exact manual approvals remain indispensable. Synthetic mechanism success cannot satisfy actual t34ch capture/restore/preservation gates. Focused tests are not a hosted end-to-end release proof. At preparation these tests were not CI-wired. The adoption successor imports the expanded evidence/dispatch tests through the existing production-proof stage, without adding a workflow.

## Continuous synthetic mechanism check

The adoption successor also schedules `recovery` in the existing Node 24 hosted-source lane before owned PostgreSQL cleanup. It retains the exact source identity, bounded command result, raw stdout/stderr and their SHA-256 hashes through existing hosted-source evidence retention. This is a real synthetic capture/encrypt/decrypt/restore execution, distinct from evidence-shape tests. The GitHub path accepts only the exact current-run owned loopback PostgreSQL 17 fixture, including fixed image, network, mounts, labels, URL and server identity; dump/restore clients run inside that same official container. The public fixture password is not a credential for any live service. Local execution still requires a passwordless loopback target and official installed PG17 clients. No generic remote/password/container override exists. Target-guard tests reject foreign ownership, changed URLs, ambient PostgreSQL configuration, wrong tool mode and server identity before synthetic DDL.

The adapted local PG17 rehearsal and target tests passed during development. Actual execution of the Docker-backed branch requires the exact-head hosted CI result; local executor testing does not claim that result. This does not change the same-cluster role and synthetic-only limitations above.
