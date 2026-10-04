<!--tos-doc
{
  "doc_id": "TEACH-PERSISTENCE-MODEL",
  "class": "specification",
  "version": "0.2.0",
  "claims_truth_state": "declared",
  "status": "recorded",
  "owner": "Patrick Craven, Top Shelf Service LLC",
  "created_on": "2026-10-04",
  "updated_on": "2026-10-04",
  "baseline": {
    "repo": "peteywee/teach-v2",
    "ref": "main",
    "commit": "56b11c39bd8cca5f87ae49a64535b9a2b5acf9d2",
    "purpose": "pre-persistence-model-discovery baseline"
  },
  "governed_by": ["TEACH-ARCHITECTURE","TEACH-APPLICATION-INTERFACES","TEACH-CON-C21","TEACH-CON-C15","TEACH-CON-C23"]
}
-->

# Persistence Model Discovery

Status: **recorded; Persistence Model not yet approved**.

This stage discovers what the current semantic and application authority can safely support at the persistence boundary. It does not create tables or migrations.

A concept being an approved entity is not enough by itself: required identifiers, lifecycle state sets, relationships, ownership/scope semantics, and applicable open-question holds must also be dependency-closed before they may become physical schema authority.

## Decision-ready proposal

`proposed.json` and `DECISION-PACKET.md` define the recommended Persistence authority model.

Status remains `proposed`. Full relational schema, migrations, and Transport Interfaces remain blocked until explicit owner approval plus the semantic dependency closure identified by discovery.
