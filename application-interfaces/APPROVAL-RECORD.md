<!--tos-doc
{
  "doc_id": "TEACH-APPLICATION-INTERFACE-APPROVAL",
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
    "commit": "ddbebebb1a85485f55216e20c67a2f38865e59e7",
    "purpose": "pre-application-interface-approval baseline"
  },
  "governed_by": ["TEACH-ARCHITECTURE","TEACH-CON-C01","TEACH-CON-C41"]
}
-->

# Application Interface Approval Record

GitHub issue: #15

Approved authority: `TEACH-APPLICATION-INTERFACES@1.0.0`.

The approval covers only the logical Application boundary recorded in `authority.json`: command entry points, owner-read boundaries, cross-domain command orchestration, authorization/audit/observability/provider interfaces, and transport-neutral command/result boundaries.

Persistence, Transport Interfaces, physical package layout, and candidate K00 semantics are not approved by this record.

## Demo runtime revision 1.1.0

Exact approval: `domains/demo-runtime/owner-approval.json`; SYS-21 #82; package `TEACH-DEMO-RUNTIME-2026-10-17@0.1.0`; SHA256SUMS digest `a1df23b03a0f0660a072cff00eb40d3d2fb60bc8c521f12b56977f559601196a`. The former authority is preserved byte-for-byte in `superseded/authority-1.0.0.json`. Current authority adds only the package-defined logical boundaries and concrete transport bindings, with no physical admission or runtime activation.
