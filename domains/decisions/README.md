<!--tos-doc
{
  "doc_id": "TEACH-DECISION-TABLE-DISCOVERY",
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
    "commit": "12857786cbbfc578be2857086067e2b44f44d217",
    "purpose": "post-invariant-registration decision-table discovery baseline"
  },
  "governed_by": [
    "TEACH-CON-C00",
    "TEACH-CON-C01",
    "TEACH-K00@0.5.0"
  ]
}
-->

# Teach v2 Decision Table Discovery

Status: `recorded`.

This package records deterministic decision logic derived from active contracts and registered invariants.

`kernel/decision-tables.json` now contains the 8 owner-registered decision-table candidates. The 3 blocked decision tables remain outside K00, and no candidate is promoted to `approved`.

Discovery result:

- 8 dependency-ready deterministic decision-table candidates.
- 3 blocked decision-table candidates.

Next gate: Commands / Events discovery and registration.
