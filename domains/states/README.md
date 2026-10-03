<!--tos-doc
{
  "doc_id": "TEACH-STATE-DISCOVERY",
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
    "commit": "c64c00f04197907d846c507ae956ed377826da2f",
    "purpose": "pre-state-machine approval baseline"
  },
  "approval": {
    "state": "approved",
    "approved_on": "2026-10-03",
    "owner": "Patrick Craven, Top Shelf Service LLC",
    "record": "contracts/APPROVAL-RECORD.md",
    "issue": "#4"
  },
  "governed_by": [
    "TEACH-CON-C00",
    "TEACH-CON-C01",
    "TEACH-DOMAIN-OWNERSHIP@1.0.0"
  ]
}
-->

# Teach v2 State / State-Machine Discovery

Status: `recorded`.

`proposed.json` records state semantics that can be proven from active contracts and explicitly preserves blocked or contradictory state-machine work.

This package does not modify `kernel/states.json`, does not promote any K00 entry, and does not authorize implementation.

Current dependency-ready result:

- ApplicationSession lifecycle: ready.
- EvidenceState classification: ready; not a lifecycle machine.
- IdentityStatus value set: ready; transition graph blocked.
- Membership lifecycle: contradictory until OQ-SEM-4 / C13 wording is resolved.
- LearningSession lifecycle: blocked by OQ-LRN-1.
- Certification, single-use credential, and ContentPack lifecycles: blocked pending semantic decisions.

Next gate: owner decisions for the blocking lifecycle questions, followed by K00 state-machine registration.

## Approved disposition

GitHub issue #4 registers candidate state machines for Identity, ApplicationSession, Membership, and LearningSession.

Remaining blocked lifecycle work:

- Certification lifecycle.
- Single-use credential/token lifecycle.
- ContentPack lifecycle.
- Identity transition into `DELETED` remains disabled pending C15 privacy/deletion semantics.

No K00 candidate was promoted to `approved`.
