<!--tos-doc
{
  "doc_id": "TEACH-PROP-AUTHORING-RECOVERY",
  "class": "specification",
  "version": "1.0.0",
  "status": "active",
  "claims_truth_state": "declared",
  "owner": "Patrick Craven, Top Shelf Service LLC",
  "created_on": "2026-10-28",
  "updated_on": "2026-10-28",
  "effective_on": "2026-10-28",
  "approval": {
    "state": "approved",
    "approved_version": "1.0.0",
    "approved_on": "2026-10-28",
    "record": "docs/proposals/demo-authoring-recovery-exception/owner-adoption.json"
  },
  "governed_by": [
    "TEACH-CON-C21"
  ]
}
-->

# One authoring migration recovery exception

Policy adopted; actual recovery evidence UNKNOWN/BLOCKED. No production action is authorized by this document.

For exactly migration `0008_demo_manager_authoring.sql` (isolated SHA256 `6c6e568354e95cb5012e369dca6a3f0c9a3c2d72ac49d05127d1b77f3ba941ab`) in existing t34ch project `acqafjkdkdmtpnsxiesw`, private schema `teach_v2_demo`, MIG-9/MIG-10 MAY be satisfied by the following one-time alternative instead of a platform-native restore point. This exception concerns the approved two private authoring tables and their necessary reviewed support objects only. It authorizes no paid upgrade and creates no recurring exception.

1. Freeze and independently review the complete candidate (including this governance change), raw migration, activation wrapper, dependency-closed recovery selectors, renderer and verification checks before capture. Record exact source and wrapper hashes, target identity and owner approval. A candidate change affecting recovery coverage, resulting objects or activation invalidates the binding and requires a fresh qualifying capture/proof.
2. Capture a fresh named, transactionally consistent recovery set after freeze and before migration, encrypted before any recoverable payload leaves PostgreSQL. The set MUST cover the entire current private schema and its actual rows, sequence state, constraints/indexes, functions/triggers, RLS/policies, owners/ACLs/defaults, and all dependencies necessary to restore that scope faithfully. Current demo authentication/session rows, if present, are confidential recovery material; do not publish them or their plaintext. Existing nonsecret supporting role/default/platform-hook metadata may be included only through a reviewed closed inventory. Unknown dependencies, omitted required data, unreadable state or uncovered side effects block activation.
3. Recovery coverage does not authorize copying other legacy application data, Supabase auth/storage rows, role password/verifier values, environment secrets or credentials. If any excluded dependency is essential, stop for a separately reviewed exact scope/security decision; do not label the partial set complete. Use only approved data-transfer destinations and supported approved key access. Never bypass Library/file selection boundaries or policy denials.
4. Retain ciphertext and a nonsecret manifest in a verified owner-only approved destination. Record snapshot identity/time, database major, candidate/selector hashes, ciphertext hash/length, destination identity and ACL evidence, and encryption public-key fingerprint. Verify a readback of retained ciphertext. Keep private key custody separate; an inaccessible key is a failed recovery gate, not a successful backup.
5. Retrieve the retained ciphertext—not a working plaintext copy—and prove decryption and full scoped restoration into a disposable isolated PostgreSQL17 environment. Reproduce required metadata/roles without production credential material. Validate exact baseline schema/security, every covered row and sequence, and prerequisite dependencies. Then apply the exact frozen migration and activation wrapper to that restored state; verify old immutable versions and retained history are preserved, the intended authoring changes alone occur, and restricted runtime operations/denials pass. Synthetic rehearsal is additional evidence, not a substitute for this actual recovery proof.
6. Independently review source-bound capture coverage, retained-only restore results, upgrade/preservation checks, final target preflight and uncertainty handling. Evidence MUST identify the retained backup, snapshot/capture time, isolated target/PG version, start/end times, checks/results and exact hashes. No missing/ambiguous coverage may be waived by a passing schema-only replay. This same-candidate actual proof is required now; the thirty-day maximum does not excuse use of the old first-install backup.
7. MIG-11/MIG-12 isolation, exact-target provider exposure readback, least-privilege runtime rights, required CI, manual owner-approved release and postflight gates remain unchanged. After any uncertain apply outcome, reconcile ledger/sequence/schema before any retry; no automatic sequence reset or destructive rollback.
8. Consume this exception only on successful exact migration application. It cannot authorize a successor/replacement migration, recurring operations, destructive data work or a general alternative backup policy. Future migrations remain blocked by MIG-9/MIG-10 unless a separately adopted policy qualifies their recovery method. Existing ongoing backup requirements for non-reconstructable production data are not waived.

