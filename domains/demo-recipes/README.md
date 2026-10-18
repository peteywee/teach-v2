<!--tos-doc
{
  "doc_id": "TEACH-DEMO-RECIPES-REGISTRATION",
  "class": "source-record",
  "version": "1.0.0",
  "claims_truth_state": "declared",
  "status": "recorded",
  "owner": "Patrick Craven, Top Shelf Service LLC",
  "created_on": "2026-10-18",
  "updated_on": "2026-10-18"
}
-->

# Bounded fictional recipe registration

`TEACH-DEMO-RECIPES-2026-10-18@0.1.1` is the owner-approved content/read/UI successor recorded by issue #88. `owner-approval.json` preserves the exact approval exchange; `registration.json` binds the immutable schemas/template and exact contract successors. `source-baseline.json` retains the five exact predecessor authority files.

This registration is semantics-only. It supplies no independent-review verdict, runtime attestation, physical admission or deployment authority. The original demo runtime package and gate pins remain unchanged. The new recipe implementation must pass independent review and existing admission/local activation gates before use. Automated tests and browser/keyboard/screen-reader checks are separate evidence; absent evidence remains unknown.

Validate with `node scripts/kernel/validate-demo-recipes-registration.mjs` and run denial regressions with `node --test scripts/tests/validate-demo-recipes-registration.mjs`. The original registration validator incorporates this exact bounded successor without allowing arbitrary paths, schema ranges or authority drift.

The original 0.1.0 proposal remains byte-exact. Revision 0.1.1 corrects its no-migration assumption and authorizes only one additive strict existing content guard migration with separate independent physical review and disposable-local execution approval. The explicit same-lineage schema-reference projection is registered under `kernel/content-schema-reference-successor.json`; no original semantic entry is modified.
