<!--tos-doc
{
  "doc_id": "TEACH-COMMAND-EVENT-DISCOVERY",
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
    "commit": "7f747aa4ca524884d33b65260fd41b05452dcfa0",
    "purpose": "post-decision-table-registration command-event discovery baseline"
  },
  "governed_by": [
    "TEACH-CON-C00",
    "TEACH-CON-C01",
    "TEACH-K00@0.6.0"
  ]
}
-->

# Teach v2 Command / Event Discovery

Status: `proposed`.

This package records command and event gaps after deterministic decision-table registration.

It does not modify `kernel/commands.json` or `kernel/events.json` and promotes no semantic entry.

Discovery result:

- 15 existing registered commands retained.
- 7 new command candidates supported by active contract requirements.
- 8 command candidates blocked by unresolved semantic dependencies.
- 14 existing registered events retained.
- 0 new event candidates considered ready.
- 9 event candidates explicitly blocked because active contracts do not yet distinguish the required audit record from a canonical C01 domain event, or do not require event emission.

Next gate: owner-approved registration of the 7 ready commands. Event expansion stays blocked until its semantics are explicit.
