<!--tos-doc
{
  "doc_id": "TEACH-DOMAIN-DISCOVERY",
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
    "commit": "e567298c8c3916be0c98bdbe6bb715282be7e03e",
    "purpose": "post-K00 domain-discovery baseline"
  },
  "governed_by": [
    "TEACH-CON-C00",
    "TEACH-CON-C01"
  ]
}
-->

# Teach v2 Domain Discovery

Status: `proposed`.

This directory records the first domain-discovery pass after K00. It does not promote any K00 `candidate` entry to `approved` and does not authorize implementation.

Canonical artifacts:

- `ownership-map.proposed.json` — proposed single-owner map for every currently registered K00 concept.
- `discovery-gaps.json` — concepts found in active contract scope that are absent or unresolved in K00.
- `schema/domain-ownership-map.schema.json` — structural contract for the proposed map.

Current proposed domain boundaries:

`Identity`, `Organization`, `Authorization`, `Content`, `Learning`, `Certification`, `AuditLifecycle`, `TransactionControl`, `VerificationEvidence`, `Observability`.

`Entitlement` ownership remains unresolved and therefore is not approved by this package.
