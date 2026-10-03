<!--tos-doc
{
  "doc_id": "TEACH-INVARIANT-DISCOVERY",
  "class": "specification",
  "version": "0.1.0",
  "claims_truth_state": "declared",
  "status": "proposed",
  "owner": "Patrick Craven, Top Shelf Service LLC",
  "created_on": "2026-10-03",
  "updated_on": "2026-10-03",
  "baseline": {
    "repo": "peteywee/teach-v2",
    "ref": "main",
    "commit": "0d0da31243b78f83aac66e21733fc0b9a2371f83",
    "purpose": "post-state-machine invariant-discovery baseline"
  },
  "governed_by": [
    "TEACH-CON-C00",
    "TEACH-CON-C01",
    "TEACH-DOMAIN-OWNERSHIP@1.1.0",
    "TEACH-K00@0.4.0"
  ]
}
-->

# Teach v2 Invariant Discovery

Status: `proposed`.

`proposed.json` records cross-domain and domain invariants derived from active contract requirements.

This package does not create `kernel/invariants.json`, does not change K00, and does not promote any semantic entry.

Discovery result:

- 22 contract-proven invariant candidates.
- 5 blocked invariant candidates whose concrete semantics depend on open owner decisions.

UNKNOWN/BLOCKED/CONTRADICTORY never count as ready.

Next gate: owner-approved invariant registration into K00.
