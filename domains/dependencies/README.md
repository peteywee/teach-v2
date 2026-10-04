<!--tos-doc
{
  "doc_id": "TEACH-DEPENDENCY-CONCEPTS",
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
    "commit": "75258f30e0301f6ca733176b7a8c8beb99a2cb4a",
    "purpose": "pre-dependency-concept-registration baseline"
  },
  "governed_by": ["TEACH-CON-C00","TEACH-CON-C01"]
}
-->

# Dependency Concept Registration

GitHub issue: #11

Registered as K00 `candidate`:

- Invitation / InvitationId
- SetupToken / SetupTokenId
- PasswordResetToken / PasswordResetTokenId
- ReconciliationRecord / ReconciliationRecordId

Registration removes the `missing-k00` condition only. The lifecycle vocabularies remain unresolved, so the four dependent commands remain candidate and are not implementation authority.

## Lifecycle closure discovery

Three lifecycle decision groups are now recorded as proposed:

- Invitation lifecycle.
- SetupToken / PasswordResetToken single-use lifecycle.
- ReconciliationRecord lifecycle.

No new state set or state machine is registered by this discovery. All four dependent commands remain candidate until an owner-approved semantic closure package resolves the required lifecycle vocabulary.
