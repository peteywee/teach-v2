<!--tos-doc
{
  "doc_id": "TEACH-K00",
  "class": "semantic-kernel",
  "version": "0.18.0",
  "claims_truth_state": "declared",
  "status": "active",
  "owner": "Patrick Craven, Top Shelf Service LLC",
  "created_on": "2026-10-03",
  "updated_on": "2026-10-17",
  "effective_on": "2026-10-03",
  "approval": {
    "state": "approved",
    "approved_on": "2026-10-17",
    "owner": "Patrick Craven, Top Shelf Service LLC",
    "record": "domains/demo-runtime/owner-approval.json",
    "issue": "#82",
    "basis": "TEACH-DEMO-RUNTIME-2026-10-17@0.1.0 exact approved semantic registration"
  },
  "baseline": {
    "repo": "peteywee/teach-v2",
    "ref": "main",
    "commit": "ee9dd542e18106c39c8c7fb1987d8c9d4780e44a",
    "purpose": "pre-SLICE-P03 relationship registration baseline"
  },
  "governed_by": [
    "TEACH-CON-C00",
    "TEACH-CON-C01"
  ],
  "approval_history": [
    {
      "state": "approved",
      "approved_on": "2026-10-04",
      "record": "persistence/physical-slices/identity-tokens/registration.json",
      "issue": "#40",
      "basis": "Owner-approved SLICE-P03 relationship registration; GitHub issue #40; K00 0.16.0"
    },
    {
      "state": "approved",
      "approved_on": "2026-10-17",
      "owner": "Patrick Craven, Top Shelf Service LLC",
      "record": "domains/capabilities/owner-approval.json",
      "basis": "TEACH-SEM-CAPABILITY-NAMES-2026-10-17@0.1.1: exactly 36 capability-name/type entries; all other semantics and runtime gates preserved."
    }
  ]
}
-->

# K00 — Teach v2 Semantic Kernel

Canonical machine-readable source format: JSON.

K00 version: `0.18.0`.

Active domain ownership authority: `domains/ownership-map.json`.

Current relationship authority: 50 relationships are registered in K00 — 49 `approved` and 1 `candidate`. Prior discovery-blocked proposals remain historical unless explicitly included in the approved package.

Registry entries remain `candidate` unless explicitly promoted through SEM-30 owner approval; approved entries are implementation authority only within their still-applicable contract constraints.

Files: `manifest.json`, `entities.json`, `values.json`, `identifiers.json`, `relationships.json`, `states.json`, `state-machines.json`, `invariants.json`, `decision-tables.json`, `capabilities.json`, `commands.json`, `events.json`, `evidence.json`, and `schema/semantic-kernel.schema.json`.

Historical K00 0.4.0 state-machine registration: four lifecycle machines were candidate. Current 0.18.0 has ten approved lifecycle machines.

Current invariant registration: 17 approved and 5 candidate invariants; historical blocked proposals remain outside K00. Cross-cutting governance invariants are owned by the Governance semantic domain.

Current decision-table registration: 11 approved and 2 candidate deterministic decision tables. Historical blocked proposals remain outside K00.

Current command authority: all 28 registered commands are `approved`; zero registered commands remain candidate. The separate 8 discovery-blocked command proposals remain outside K00. Events remain 4 approved / 10 candidate.

Event admission: the 14 existing canonical events remain unchanged. Audit-record obligations and state transitions do not implicitly create business events; 9 discovered names were not admitted because no active owning-domain contract explicitly requires them.

Dependency concept registration: four previously missing entities and four canonical identifier types are now registered as `candidate`. Their lifecycle vocabularies remain explicitly blocked; the four dependent commands remain `candidate`. GitHub issue #11.

Dependency lifecycle closure: Invitation, SetupToken, PasswordResetToken, ReconciliationRecord and their IDs are now `approved`; four approved state sets and four approved state machines encode their closed-world lifecycle semantics. `RevokeInvitation` is a new approved canonical command. All 23 registered commands are approved. Events remain 4 approved / 10 candidate. GitHub issue #12.

Strict-nine ratification: K00 `0.13.0` promotes Identity, Credential, ApplicationSession, Organization, Assignment, LearningSession, ProgressEvent, Certification, and ContentPack to `approved`. Membership remains `candidate` under an explicit owner-directed hold on OQ-TEN-1. C01 `1.8.0` SEM-36 requires approved dependency closure, with only the enumerated Membership-command exception. Ratification issue #14.

Persistence semantic closure: K00 `0.14.0` promotes exactly 24 entries under GitHub issue #17: 8 identifiers, 3 state sets, 3 state machines, and 10 relationships. Commands, events, entities, and Domain Ownership Map `1.6.0` are unchanged. The ten explicit exclusions in `persistence/semantic-closure/proposed.json` remain unpromoted.


SLICE-P01 relationship promotion: K00 `0.15.0` promotes exactly `ReconciliationRecordUsesIdempotencyKey` from `candidate` to `approved` under explicit owner approval in GitHub issue #24. Its `many-to-zero-or-one` cardinality, TransactionControl ownership, C22 authority, `idempotent_reconciliation_lookup` enablement, and non-grants (`key_reuse_across_operations`, `scope_broadening`) are unchanged. No other semantic entry changes status, and this promotion does not itself authorize physical schema implementation.


## K00 0.16.0 — SLICE-P03 owner-approved relationships

Issue #40 registers four approved Identity-domain relationships required for SLICE-P03: `InvitationForIdentity` (many-to-zero-or-one), `SetupTokenBelongsToIdentity` (many-to-one), `PasswordResetTokenBelongsToIdentity` (many-to-one), and `InvitationOwnedByIdentity` (many-to-one protected owner scope). No other semantic status changes are made.


## K00 0.17.0 — Capability name/type admission

Exactly 36 entries are approved under `TEACH-SEM-CAPABILITY-NAMES-2026-10-17@0.1.1`: immutable `Capability`, completed `CapabilityId`, and the 34 unchanged C14 action constants. The package and owner response are preserved in `domains/capabilities/`; the ownership map is 1.8.0. This is semantic naming/type admission only: no grants, routes, runtime activation, principal, schema or migration changes. Membership and CERT-2 gates remain unchanged. Historical sections above describe their original registration scope, not current counts.


## K00 0.18.0 — Approved isolated full-demo semantic closure

Issue [#82](https://github.com/peteywee/teach-v2/issues/82) records TEACH-DEMO-RUNTIME-2026-10-17@0.1.0. Exactly 131 typed entries are applied: 46 promotions, 15 revisions, 70 additions. The exact overlay, dependency closure, owner approval and byte-identical proposal are verified in `domains/demo-runtime/`. Membership OQ-TEN-1 is closed only for the approved normalized shape; no Membership hold exception remains in current closure. Five narrowly scoped commands and five capability names are added; no business event is added or promoted. All preceding paragraphs describe historical registration facts, not current counts or current blockers.

Semantic registration does not mount a route, issue a session, create a database table, admit a physical slice or demonstrate a working demo. These require separate recorded gates under the approved package.
