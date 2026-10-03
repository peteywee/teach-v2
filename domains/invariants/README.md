<!--tos-doc
{
  "doc_id": "TEACH-INVARIANT-DISCOVERY",
  "class": "specification",
  "version": "0.2.0",
  "claims_truth_state": "declared",
  "status": "recorded",
  "owner": "Patrick Craven, Top Shelf Service LLC",
  "created_on": "2026-10-03",
  "updated_on": "2026-10-03",
  "baseline": {
    "repo": "peteywee/teach-v2",
    "ref": "main",
    "commit": "b29d0e7712d705ed30e574b39918e75a411db194",
    "purpose": "pre-invariant-registration baseline"
  },
  "approval": {
    "state": "approved",
    "approved_on": "2026-10-03",
    "owner": "Patrick Craven, Top Shelf Service LLC",
    "record": "contracts/APPROVAL-RECORD.md",
    "issue": "#5"
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

Status: `recorded`.

`proposed.json` records cross-domain and domain invariants derived from active contract requirements.

`kernel/invariants.json` now contains the 22 owner-registered invariant candidates. The 5 blocked invariant proposals remain outside K00, and no semantic entry is promoted to `approved`.

Discovery result:

- 22 contract-proven invariant candidates.
- 5 blocked invariant candidates whose concrete semantics depend on open owner decisions.

UNKNOWN/BLOCKED/CONTRADICTORY never count as ready.

Next gate: Decision Trees / Tables discovery and registration.
