<!--tos-doc
{
  "doc_id": "TEACH-K00",
  "class": "semantic-kernel",
  "version": "0.10.0",
  "claims_truth_state": "declared",
  "status": "active",
  "owner": "Patrick Craven, Top Shelf Service LLC",
  "created_on": "2026-10-03",
  "updated_on": "2026-10-04",
  "effective_on": "2026-10-03",
  "approval": {
    "state": "approved",
    "approved_on": "2026-10-04",
    "record": "contracts/APPROVAL-RECORD.md",
    "issue": "#10",
    "basis": "Explicit SEM-30 owner approval for the 18 contract-proven command promotions"
  },
  "baseline": {
    "repo": "peteywee/teach-v2",
    "ref": "main",
    "commit": "a35d845758af0dbf614282d409e19dc075023df7",
    "purpose": "pre-command-promotion baseline"
  },
  "governed_by": [
    "TEACH-CON-C00",
    "TEACH-CON-C01"
  ]
}
-->

# K00 — Teach v2 Semantic Kernel

Canonical machine-readable source format: JSON.

K00 version: `0.10.0`.

Active domain ownership authority: `domains/ownership-map.json`.

Relationship registration: 18 dependency-ready relationships are registered as `candidate`; 11 blocked relationship proposals remain outside K00.

Registry entries remain `candidate` unless explicitly promoted through SEM-30 owner approval; approved entries are implementation authority only within their still-applicable contract constraints.

Files: `manifest.json`, `entities.json`, `values.json`, `identifiers.json`, `relationships.json`, `states.json`, `state-machines.json`, `invariants.json`, `decision-tables.json`, `capabilities.json`, `commands.json`, `events.json`, `evidence.json`, and `schema/semantic-kernel.schema.json`.

State-machine registration: 4 lifecycle machines are registered as `candidate`; no candidate is promoted by K00 0.4.0.

Invariant registration: 22 contract-proven invariants are registered as `candidate`; 5 blocked invariant proposals remain outside K00. Cross-cutting governance invariants are owned by the Governance semantic domain.

Decision-table registration: 8 deterministic decision tables are registered as `candidate`; 3 blocked decision-table proposals remain outside K00.

Command promotion: 18 of the 22 registered commands are `approved` with owning-contract evidence; 4 remain `candidate` because required K00 concepts are absent. The separate 8 discovery-blocked command proposals remain outside K00. Events remain 4 approved / 10 candidate.

Event admission: the 14 existing canonical events remain unchanged. Audit-record obligations and state transitions do not implicitly create business events; 9 discovered names were not admitted because no active owning-domain contract explicitly requires them.
