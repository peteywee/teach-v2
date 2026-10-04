<!--tos-doc
{
  "doc_id": "TEACH-ARCHITECTURE-APPROVAL",
  "class": "evidence-summary",
  "version": "1.0.0",
  "claims_truth_state": "declared",
  "status": "recorded",
  "owner": "Patrick Craven, Top Shelf Service LLC",
  "created_on": "2026-10-04",
  "updated_on": "2026-10-04",
  "baseline": {
    "repo": "peteywee/teach-v2",
    "ref": "main",
    "commit": "8cc705404f931e5c851ea3172edff173ac9d6885",
    "purpose": "pre-architecture-approval baseline"
  },
  "governed_by": ["TEACH-CON-C00","TEACH-CON-C01","TEACH-CON-C02"]
}
-->

# Architecture Approval Record

GitHub issue: #13

Approved architecture: `TEACH-ARCHITECTURE@1.0.0`.

The approval covers only the logical modular-monolith topology, runtime/support-plane placement, dependency direction, single-writer/cross-domain boundaries, and the explicit deferrals recorded in `architecture/authority.json`.

Candidate K00 semantics and later Persistence/Transport decisions are not approved by this record.
