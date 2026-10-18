<!--tos-doc
{
  "doc_id": "TEACH-DOMAIN-DISCOVERY",
  "class": "specification",
  "version": "1.7.0",
  "claims_truth_state": "declared",
  "status": "active",
  "owner": "Patrick Craven, Top Shelf Service LLC",
  "created_on": "2026-10-03",
  "updated_on": "2026-10-17",
  "baseline": {
    "repo": "peteywee/teach-v2",
    "ref": "main",
    "commit": "168ff001ee6d8cb6b42d26a9602dba7f4c419092",
    "purpose": "pre-lifecycle-registration baseline"
  },
  "approval": {
    "state": "approved",
    "approved_on": "2026-10-17",
    "owner": "Patrick Craven, Top Shelf Service LLC",
    "record": "domains/demo-runtime/owner-approval.json",
    "issue": "#82",
    "basis": "TEACH-DEMO-RUNTIME-2026-10-17@0.1.0 exact approved semantic registration"
  },
  "governed_by": [
    "TEACH-CON-C00",
    "TEACH-CON-C01"
  ],
  "approval_history": [
    {
      "state": "approved",
      "approved_on": "2026-10-04",
      "owner": "Patrick Craven, Top Shelf Service LLC",
      "record": "contracts/APPROVAL-RECORD.md",
      "issue": "#12"
    }
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

Domain Ownership Map `1.2.0` adds the Governance semantic domain and owner assignments for all 22 registered invariant candidates; GitHub issue #5.

Domain Ownership Map `1.3.0` adds owner assignments for eight registered decision tables; GitHub issue #6.

Domain Ownership Map `1.4.0` adds owner assignments for seven registered command candidates; GitHub issue #7.

Domain Ownership Map `1.5.0` adds ownership for four dependency entities and their four identifier types; GitHub issue #11.

Domain Ownership Map `1.6.0` adds the four lifecycle state sets, four lifecycle state machines, and `RevokeInvitation`; existing ownership assignments are unchanged. GitHub issue #12.


## Exact full-demo ownership successor

Domain Ownership Map `1.9.0` records the approved TEACH-DEMO-RUNTIME-2026-10-17@0.1.0 package under issue #82. Its 131 typed entries retain one authoritative owner each; no runtime module or foreign repository writer is added. Prior discovery and approval files remain historical. The active registration and exact owner evidence are in `demo-runtime/`.
