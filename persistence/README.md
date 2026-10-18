<!--tos-doc
{
  "doc_id": "TEACH-PERSISTENCE-MODEL",
  "class": "specification",
  "version": "1.1.0",
  "claims_truth_state": "declared",
  "status": "active",
  "owner": "Patrick Craven, Top Shelf Service LLC",
  "created_on": "2026-10-04",
  "updated_on": "2026-10-17",
  "baseline": {
    "repo": "peteywee/teach-v2",
    "ref": "main",
    "commit": "56b11c39bd8cca5f87ae49a64535b9a2b5acf9d2",
    "purpose": "pre-persistence-model-discovery baseline"
  },
  "governed_by": [
    "TEACH-ARCHITECTURE",
    "TEACH-APPLICATION-INTERFACES",
    "TEACH-CON-C21",
    "TEACH-CON-C15",
    "TEACH-CON-C23"
  ],
  "approval_history": [],
  "approval": {
    "state": "approved",
    "approved_on": "2026-10-17",
    "owner": "Patrick Craven, Top Shelf Service LLC",
    "record": "domains/demo-runtime/owner-approval.json",
    "issue": "#82",
    "basis": "TEACH-DEMO-RUNTIME-2026-10-17@0.1.0 exact approved semantic registration"
  }
}
-->

# Persistence Model authority

Active logical authority: `persistence/authority.json` version `1.1.0`, approved by the exact demo package and recorded under issue #82. The preceding 1.0.0 authority and discovery remain historical.

Exact synthetic records, immutable bindings, current-scope predicates, audit/lifecycle and receipt rules are defined in `domains/demo-runtime/proposal-0.1.0/authority-and-audit.md` and `learning-definition.md`. One writer per owning module remains mandatory.

This logical revision does not admit tables, migrations or runtime execution. Each new physical slice must pass the unchanged fail-closed admission gate; existing P01–P05 migration bytes remain immutable. Certification/P07, customer provisioning, deletion and shared/production deployment are not prerequisites and are not admitted.
