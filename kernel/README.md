<!--tos-doc
{
  "doc_id": "TEACH-K00",
  "class": "semantic-kernel",
  "version": "0.15.0",
  "claims_truth_state": "declared",
  "status": "active",
  "owner": "Patrick Craven, Top Shelf Service LLC",
  "created_on": "2026-10-03",
  "updated_on": "2026-10-04",
  "effective_on": "2026-10-03",
  "approval": {
    "state": "approved",
    "approved_on": "2026-10-04",
    "record": "contracts/APPROVAL-RECORD.md",
    "issue": "#24",
    "basis": "Explicit owner approval of ReconciliationRecordUsesIdempotencyKey candidate-to-approved promotion for SLICE-P01; GitHub issue #24; C01 1.8.0 / K00 0.15.0"
  },
  "baseline": {
    "repo": "peteywee/teach-v2",
    "ref": "main",
    "commit": "39e1b40218cde2f6be2ce94aec8cc3f6e2fcd677",
    "purpose": "pre-SLICE-P01 relationship promotion baseline"
  },
  "governed_by": [
    "TEACH-CON-C00",
    "TEACH-CON-C01"
  ]
}
-->

# K00 — Teach v2 Semantic Kernel

Canonical machine-readable source format: JSON.

K00 version: `0.15.0`.

Active domain ownership authority: `domains/ownership-map.json`.

Current relationship authority: 19 relationships are registered in K00 — 11 `approved` and 8 `candidate`; 10 blocked relationship proposals remain outside K00.

Registry entries remain `candidate` unless explicitly promoted through SEM-30 owner approval; approved entries are implementation authority only within their still-applicable contract constraints.

Files: `manifest.json`, `entities.json`, `values.json`, `identifiers.json`, `relationships.json`, `states.json`, `state-machines.json`, `invariants.json`, `decision-tables.json`, `capabilities.json`, `commands.json`, `events.json`, `evidence.json`, and `schema/semantic-kernel.schema.json`.

State-machine registration: 4 lifecycle machines are registered as `candidate`; no candidate is promoted by K00 0.4.0.

Invariant registration: 22 contract-proven invariants are registered as `candidate`; 5 blocked invariant proposals remain outside K00. Cross-cutting governance invariants are owned by the Governance semantic domain.

Decision-table registration: 8 deterministic decision tables are registered as `candidate`; 3 blocked decision-table proposals remain outside K00.

Current command authority: all 23 registered commands are `approved`; zero registered commands remain candidate. The separate 8 discovery-blocked command proposals remain outside K00. Events remain 4 approved / 10 candidate.

Event admission: the 14 existing canonical events remain unchanged. Audit-record obligations and state transitions do not implicitly create business events; 9 discovered names were not admitted because no active owning-domain contract explicitly requires them.

Dependency concept registration: four previously missing entities and four canonical identifier types are now registered as `candidate`. Their lifecycle vocabularies remain explicitly blocked; the four dependent commands remain `candidate`. GitHub issue #11.

Dependency lifecycle closure: Invitation, SetupToken, PasswordResetToken, ReconciliationRecord and their IDs are now `approved`; four approved state sets and four approved state machines encode their closed-world lifecycle semantics. `RevokeInvitation` is a new approved canonical command. All 23 registered commands are approved. Events remain 4 approved / 10 candidate. GitHub issue #12.

Strict-nine ratification: K00 `0.13.0` promotes Identity, Credential, ApplicationSession, Organization, Assignment, LearningSession, ProgressEvent, Certification, and ContentPack to `approved`. Membership remains `candidate` under an explicit owner-directed hold on OQ-TEN-1. C01 `1.8.0` SEM-36 requires approved dependency closure, with only the enumerated Membership-command exception. Ratification issue #14.

Persistence semantic closure: K00 `0.14.0` promotes exactly 24 entries under GitHub issue #17: 8 identifiers, 3 state sets, 3 state machines, and 10 relationships. Commands, events, entities, and Domain Ownership Map `1.6.0` are unchanged. The ten explicit exclusions in `persistence/semantic-closure/proposed.json` remain unpromoted.


SLICE-P01 relationship promotion: K00 `0.15.0` promotes exactly `ReconciliationRecordUsesIdempotencyKey` from `candidate` to `approved` under explicit owner approval in GitHub issue #24. Its `many-to-zero-or-one` cardinality, TransactionControl ownership, C22 authority, `idempotent_reconciliation_lookup` enablement, and non-grants (`key_reuse_across_operations`, `scope_broadening`) are unchanged. No other semantic entry changes status, and this promotion does not itself authorize physical schema implementation.


## K00 0.16.0 — SLICE-P03 owner-approved relationships

Issue #40 registers four approved Identity-domain relationships required for SLICE-P03: `InvitationForIdentity` (many-to-zero-or-one), `SetupTokenBelongsToIdentity` (many-to-one), `PasswordResetTokenBelongsToIdentity` (many-to-one), and `InvitationOwnedByIdentity` (many-to-one protected owner scope). No other semantic status changes are made.
