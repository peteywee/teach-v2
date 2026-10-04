# Persistence Semantic Closure Decision Packet

Status: **proposed — explicit owner approval required**.

Recommended approval token for the next normative registration batch:

`APPROVE-K00-0.14.0-PERSISTENCE-SEMANTIC-CLOSURE`

## Exact promotion set

### Identifiers — 8
- IdentityId
- OrganizationId
- ApplicationSessionId
- ContentPackId
- LearningSessionId
- CertificationId
- IdempotencyKey
- RequestId

### State sets — 3
- IdentityStatus
- ApplicationSessionStatus
- LearningSessionStatus

### State machines — 3
- IdentityStateMachine
- ApplicationSessionStateMachine
- LearningSessionStateMachine

### Relationships — 10
- CredentialBelongsToIdentity
- IdentityHasApplicationSession
- AssignmentTargetsIdentity
- AssignmentReferencesContentPack
- IdentityHasLearningSession
- LearningSessionUsesAssignment
- ProgressEventBelongsToLearningSession
- CertificationBelongsToIdentity
- CertificationReferencesContentPack
- CertificationObservedByIdentity

Total: **24 candidate → approved promotions**.

## Not included

CredentialId, AssignmentId, ProgressEventId, CapabilityId, MembershipId, LocationId, Membership lifecycle entries, and all relationships with candidate endpoints remain blocked.

`InvitationForIdentity` and `ReconciliationRecordUsesIdempotencyKey` require current rediscovery rather than automatic resurrection of stale blocked records.

This proposal changes no K00 status itself.
