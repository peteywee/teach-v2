<!--tos-doc
{
  "doc_id": "TEACH-SEM-CAPABILITY-NAMES-REGISTRATION",
  "class": "specification",
  "version": "0.1.1",
  "status": "recorded",
  "owner": "Patrick Craven, Top Shelf Service LLC",
  "created_on": "2026-10-17",
  "updated_on": "2026-10-17",
  "approval": {
    "state": "approved",
    "record": "domains/capabilities/owner-approval.json"
  },
  "governed_by": [
    "TEACH-CON-C00",
    "TEACH-CON-C01",
    "TEACH-CON-C14"
  ]
}
-->

# Capability name/type admission

This local registration applies owner-approved `TEACH-SEM-CAPABILITY-NAMES-2026-10-17@0.1.1` to K00 0.17.0 and Domain Ownership Map 1.8.0. It changes exactly 36 semantic entries: immutable Capability, completion of CapabilityId, and 34 unchanged C14 action constants.

- `proposal-0.1.1/` is the byte-identical reviewed candidate package. Its SHA256SUMS digest is `6d02a94d16cbc94b209500dc111be15862e6738fa63920ae6bd711f6c0dd3b51`. It remains a proposal artifact and is not rewritten to pretend it supplied approval.
- `owner-approval.json` records the exact owner question/response and message provenance. The validator checks this recorded evidence, not an agent-authored boolean or independent identity authentication.
- `registration.json` defines the exact allowed status overlay and non-activation boundary. Candidate-era wording in unchanged package fields is retained historical proposal text, not a current-status assertion.
- `prior-owner-decisions.json` preserves the previous candidate/question projection. The live generated view changes only the removed CapabilityId candidate and its three changed source digests; no question is closed.
- `source-baseline.json` preserves original source bytes at a779098 for hash verification and exact-delta comparison without requiring network access or Git history. It is evidence, not a second authority.
- `kernel/schema/capability-admission.schema.json` and the dependency-free live gate deterministically constrain the admitted shape and exact set. C14 remains the sole authorization-policy authority.

No active contract changes, grants, runtime activation, API, persistence schema, migration, principal, Membership promotion or certification decision are admitted. C00 SYS-21 issue requirements concern material active-contract revisions; no such revision is made here. Independent full-diff review and exact-commit local audit are required before acceptance and must be reported separately, not fabricated in these records.
