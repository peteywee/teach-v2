<!--tos-doc
{
  "doc_id": "TEACH-APPLICATION-INTERFACES",
  "class": "specification",
  "version": "1.0.0",
  "claims_truth_state": "declared",
  "status": "active",
  "owner": "Patrick Craven, Top Shelf Service LLC",
  "created_on": "2026-10-04",
  "updated_on": "2026-10-04",
  "baseline": {
    "repo": "peteywee/teach-v2",
    "ref": "main",
    "commit": "a756951703f11b5e5bcd02eef5eac3a56e3eb5c0",
    "purpose": "pre-application-interface-discovery baseline"
  },
  "governed_by": ["TEACH-ARCHITECTURE","TEACH-CON-C01","TEACH-CON-C41"]
}
-->

# Application Interface Discovery

Status: **active — owner-approved logical Application Interface authority**.

This stage maps the complete approved command inventory and the cross-domain/cross-cutting interface needs implied by active contracts and Architecture 1.0.0.

It does not choose persistence schemas, HTTP route inventory, physical package paths, or use candidate K00 semantics as implementation authority.

## Decision-ready proposal

`proposed.json` and `DECISION-PACKET.md` define the recommended logical Application Interface boundary.

Status remains `proposed`. Persistence Model remains blocked until explicit owner approval of this layer.

## Active Application Interface authority

Owner approval: GitHub issue #15.

The active authority is `application-interfaces/authority.json` version `1.0.0`.

Persistence Model is now dependency-ready for discovery. Persistence tables, physical repositories, migrations, HTTP transport schemas, physical package paths, and unresolved candidate semantics remain outside this approval.
