<!--tos-doc
{
  "doc_id": "TEACH-REL-DISCOVERY",
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
    "commit": "c90b9bb87ea3a619de83b01070d6ec12edb5ea53",
    "purpose": "pre-relationship-registration baseline"
  },
  "approval": {
    "state": "approved",
    "approved_on": "2026-10-03",
    "owner": "Patrick Craven, Top Shelf Service LLC",
    "record": "contracts/APPROVAL-RECORD.md",
    "issue": "#3"
  },
  "governed_by": [
    "TEACH-CON-C00",
    "TEACH-CON-C01",
    "TEACH-DOMAIN-OWNERSHIP@1.0.0"
  ]
}
-->

# Teach v2 Relationship Discovery

Status: `recorded`.

`proposed.json` remains the discovery proposal. `registration.json` records the owner-approved disposition: all 18 ready relationships are registered in `kernel/relationships.json` as `candidate`; no entry is promoted to `approved`.

Ready relationships reference currently registered K00 concepts and carry contract traceability.

Blocked relationships remain explicit until their missing semantic candidates or classification decisions are resolved.

Next gate: states/state-machine discovery. The 11 blocked relationship proposals remain blocked until their named semantic dependencies are resolved.
