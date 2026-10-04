<!--tos-doc
{
  "doc_id": "TEACH-ARCHITECTURE",
  "class": "specification",
  "version": "0.2.0",
  "claims_truth_state": "declared",
  "status": "recorded",
  "owner": "Patrick Craven, Top Shelf Service LLC",
  "created_on": "2026-10-04",
  "updated_on": "2026-10-04",
  "baseline": {
    "repo": "peteywee/teach-v2",
    "ref": "main",
    "commit": "0f37206e5a646b34c1ccd7158f1fcaee1268fe95",
    "purpose": "pre-architecture-discovery baseline"
  },
  "governed_by": ["TEACH-CON-C00","TEACH-CON-C01","TEACH-CON-C02"]
}
-->

# Architecture Discovery

This directory records architecture discovery and later owner-approved architecture decisions.

Current status: **discovery recorded; architecture not yet approved**.

The discovery preserves four separate facts:

- the owner-supplied source direction is a modular monolith;
- active contracts already constrain authority, commands, data ownership, browser/API boundaries, transactions, and observability;
- the active semantic ownership map now contains eleven semantic domains, not the original seven module names;
- unresolved semantic candidates remain outside architecture authority.

No file in this stage authorizes application implementation, package layout, persistence schema, transport routes, or event-driven integration.

## Decision-ready proposal

`proposed.json` and `DECISION-PACKET.md` contain the recommended logical architecture.

The proposal is not implementation authority. It remains `proposed` until an explicit owner-approval package records the decision. Application Interfaces remain blocked until that approval.
