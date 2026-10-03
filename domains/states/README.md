<!--tos-doc
{
  "doc_id": "TEACH-STATE-DISCOVERY",
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
    "commit": "d71fbf99b5ab2f554f89a6794a0ff9dc98e4f9da",
    "purpose": "post-relationship-registration state-discovery baseline"
  },
  "governed_by": [
    "TEACH-CON-C00",
    "TEACH-CON-C01",
    "TEACH-DOMAIN-OWNERSHIP@1.0.0"
  ]
}
-->

# Teach v2 State / State-Machine Discovery

Status: `proposed`.

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
