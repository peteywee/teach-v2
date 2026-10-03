<!--tos-doc
{
  "doc_id": "TEACH-DOMAIN-DISCOVERY",
  "class": "specification",
  "version": "1.1.0",
  "claims_truth_state": "declared",
  "status": "active",
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
    "TEACH-CON-C01"
  ]
}
-->

# Teach v2 Domain Discovery

Status: `active`.

This directory records the first domain-discovery pass after K00. It does not promote any K00 `candidate` entry to `approved` and does not authorize implementation.

Canonical artifacts:

- `ownership-map.json` — active owner-approved single-owner map.
- `ownership-map.proposed.json` — preserved pre-approval proposal.
- `discovery-gaps.json` — concepts found in active contract scope that are absent or unresolved in K00.
- `schema/domain-ownership-map.schema.json` — structural contract for the proposed map.

Current proposed domain boundaries:

`Identity`, `Organization`, `Authorization`, `Content`, `Learning`, `Certification`, `AuditLifecycle`, `TransactionControl`, `VerificationEvidence`, `Observability`.

`Entitlement` is owned by Organization. C63 owns billing/provider reconciliation and must cross the Organization command boundary for local entitlement changes.

Domain Ownership Map `1.1.0` adds owner-approved state-set, lifecycle-command/event, and state-machine ownership assignments from GitHub issue #4.
