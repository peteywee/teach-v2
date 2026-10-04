<!--tos-doc
{
  "doc_id": "TEACH-K00",
  "class": "semantic-kernel",
  "version": "0.7.0",
  "claims_truth_state": "declared",
  "status": "active",
  "owner": "Patrick Craven, Top Shelf Service LLC",
  "created_on": "2026-10-03",
  "updated_on": "2026-10-03",
  "effective_on": "2026-10-03",
  "approval": {
    "state": "approved",
    "approved_on": "2026-10-04",
    "record": "contracts/APPROVAL-RECORD.md",
    "issue": "#7",
    "basis": "Explicit command-registration approval token"
  },
  "baseline": {
    "repo": "peteywee/teach-v2",
    "ref": "main",
    "commit": "c29ab3dc1bbcfd57e4dc3960d81e80b20e734b24",
    "purpose": "pre-command-registration baseline"
  },
  "governed_by": [
    "TEACH-CON-C00",
    "TEACH-CON-C01"
  ]
}
-->

# K00 — Teach v2 Semantic Kernel

Canonical machine-readable source format: JSON.

K00 version: `0.7.0`.

Active domain ownership authority: `domains/ownership-map.json`.

Relationship registration: 18 dependency-ready relationships are registered as `candidate`; 11 blocked relationship proposals remain outside K00.

All initial domain entries are `candidate` until domain discovery promotes them through an approved semantic change.

Files: `manifest.json`, `entities.json`, `values.json`, `identifiers.json`, `relationships.json`, `states.json`, `state-machines.json`, `invariants.json`, `decision-tables.json`, `capabilities.json`, `commands.json`, `events.json`, `evidence.json`, and `schema/semantic-kernel.schema.json`.

State-machine registration: 4 lifecycle machines are registered as `candidate`; no candidate is promoted by K00 0.4.0.

Invariant registration: 22 contract-proven invariants are registered as `candidate`; 5 blocked invariant proposals remain outside K00. Cross-cutting governance invariants are owned by the Governance semantic domain.

Decision-table registration: 8 deterministic decision tables are registered as `candidate`; 3 blocked decision-table proposals remain outside K00.

Command registration: 22 commands are registered as `candidate` (15 retained + 7 newly registered); 8 blocked command proposals remain outside K00. Events remain at 14.
