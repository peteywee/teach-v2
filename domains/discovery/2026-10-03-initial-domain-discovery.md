<!--tos-doc
{
  "doc_id": "TEACH-DOMAIN-DISCOVERY-2026-10-03",
  "class": "evidence-summary",
  "version": "0.1.0",
  "claims_truth_state": "declared",
  "status": "recorded",
  "owner": "Patrick Craven, Top Shelf Service LLC",
  "created_on": "2026-10-03",
  "updated_on": "2026-10-03",
  "baseline": {
    "repo": "peteywee/teach-v2",
    "ref": "main",
    "commit": "e567298c8c3916be0c98bdbe6bb715282be7e03e",
    "purpose": "domain discovery against active contracts and K00 0.1.0"
  },
  "governed_by": [
    "TEACH-CON-C00",
    "TEACH-CON-C01"
  ]
}
-->

# Initial Domain Discovery — 2026-10-03

Evidence state: `PROVEN` for the repository/contract comparison performed against `e567298c8c3916be0c98bdbe6bb715282be7e03e`; `UNKNOWN` remains `UNKNOWN` for unresolved ownership.

## Proven ownership conflicts

- `CapabilityId`: K00 says `OrganizationAuthority`; C01/C14 split requires the semantic domain boundary to be `Authorization`.
- `RequestId`: K00 says `AuditLifecycle`; C53 owns request/correlation IDs, so the proposed owner is `Observability`.
- `IdempotencyKey`: K00 says `AuditLifecycle`; C22 owns idempotency semantics, so the proposed owner is `TransactionControl`.
- `Entitlement`: current evidence is contradictory enough that ownership remains unresolved; no approval is claimed.

## Missing core candidates

The machine-readable list is `discovery-gaps.json`. No missing concept is silently added to K00 in this step.

## Gate

No K00 entry is promoted from `candidate` to `approved` by this package. The next semantic-change package must resolve the required ownership decisions, update C01 as needed, and record explicit owner approval before promotion.
