<!--tos-doc
{
  "doc_id": "TEACH-DEPENDENCY-LIFECYCLE-DISCOVERY",
  "class": "specification",
  "version": "0.1.0",
  "claims_truth_state": "declared",
  "status": "proposed",
  "owner": "Patrick Craven, Top Shelf Service LLC",
  "created_on": "2026-10-04",
  "updated_on": "2026-10-04",
  "baseline": {
    "repo": "peteywee/teach-v2",
    "ref": "main",
    "commit": "636277f50cab71deb9b2dd42a0659961bf5f763d",
    "purpose": "post-dependency-concept-registration lifecycle discovery baseline"
  },
  "governed_by": [
    "TEACH-CON-C00",
    "TEACH-CON-C01"
  ]
}
-->

# Dependency Lifecycle Closure Discovery

Status: `proposed`.

This discovery does not alter K00 semantics or promote commands.

It records three unresolved lifecycle decision groups:

1. Invitation lifecycle.
2. Shared or separate single-use-token lifecycle for SetupToken and PasswordResetToken.
3. ReconciliationRecord lifecycle.

All four dependent commands remain `BLOCKED` for promotion until the required lifecycle vocabulary is owner-approved and registered.
