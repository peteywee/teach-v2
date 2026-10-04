<!--tos-doc
{
  "doc_id": "TEACH-COMMAND-EVENT-DISCOVERY",
  "class": "specification",
  "version": "0.5.0",
  "claims_truth_state": "declared",
  "status": "recorded",
  "owner": "Patrick Craven, Top Shelf Service LLC",
  "created_on": "2026-10-03",
  "updated_on": "2026-10-04",
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

Status: `recorded`.

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

## Command registration disposition

GitHub issue #7 registers the 7 dependency-ready commands as K00 `candidate` entries.

- Registered commands: 7
- Blocked commands retained outside K00: 8
- New events registered: 0
- Candidate-to-approved promotions: 0

The Events gate remains open only for the audit-record/domain-event admission rule.

## Events gate closure

GitHub issue #8 makes event admission explicit under C01 1.6.0.

- Existing K00 events retained: 14
- New events registered: 0
- Discovery event names not admitted: 9
- Events gate: closed for the current semantic baseline
- Future event additions: require an approved semantic change with explicit owning-domain contract support

Architecture is the next dependency-ready build-sequence stage.

## Command promotion

GitHub issue #10 applies SEM-30 owner approval to the contract-proven command baseline.

- Approved commands: 18
- Candidate commands blocked by missing K00 concepts: 4
- Discovery-blocked command proposals outside K00: 8
- Event status changes: 0
- K00 version: 0.10.0

The four remaining registered command candidates are `InviteIdentity`, `AcceptInvitation`, `ReconcileExternalEffect`, and `RevokeSingleUseToken`. Architecture must not rely on those commands until their missing K00 concepts are registered and they receive a separate promotion.

## Dependency registration disposition

GitHub issue #11 registers the four previously missing command dependencies as K00 candidates.

- Missing-K00 blockers removed: 4 commands
- Remaining blockers: candidate dependency + unresolved lifecycle semantics
- Command promotions: 0
- Event status changes: 0

The commands remain candidate until their dependency lifecycle semantics are canonically closed and a separate SEM-30 promotion is approved.
