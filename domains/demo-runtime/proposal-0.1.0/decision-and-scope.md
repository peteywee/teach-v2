# Decision and scope ledger

## Existing approved meaning, preserved

- Modular monolith; one owner and canonical command path per authoritative fact; foreign repositories do not become public APIs.
- Normalized multi-organization/multi-location Membership; explicit validated scope tuple; database-current authority on every protected request.
- Membership ACTIVE → INACTIVE → REVOKED, terminal REVOKED. No reactivation or DELETED membership state.
- Manager visibility is direct reports intersected with authorized location; org_admin exception remains organization-bound and is not used by the demo.
- Exactly one opaque 32-byte application-session credential, cookie-only, versioned verifier-only storage, 12-hour absolute/30-minute idle limits, exact-origin unsafe request checks, canonical revocation.
- Immutable strict SemVer content, exact version/digest binding, deterministic engine, no accepted legacy format, no customer-approval claims without separate authority.
- LearningSession ACTIVE → COMPLETED, terminal completion; no manager progress mutation; no client write queue or fake persisted success.
- Required audit is transaction-bound and append-only. Audit/lifecycle deletion remains blocked. One-year audit policy is unchanged and is not permission to purge.
- Certification, billing, runtime AI, analytics and external email/OAuth providers remain outside this demo.

## Newly proposed product boundary

The synthetic-persona exception and anonymous entry are genuinely new semantics. Current C14 bootstrap is exhaustive and does not permit them. C11 currently defines Identity as a human user; a fictional persona cannot silently reuse that claim. Proposed additions are precisely delimited in this package and require its explicit approval.

The only new public operations are BeginDemoRun, SwitchDemoPersona and CloseDemoRun. CreateDemoPersona and RevokeDemoSessions are internal owner commands. Reset is the documented two-command user journey, not a hidden sixth command. Existing normal commands continue to own Membership creation, publication, assignment, learning and session issuance.

A demo_visitor bundle grants only persona-switch and close capabilities on the same run's Membership. It is a sixth, exact bundle, never a platform role. Fixed operation restrictions on every synthetic identity narrow the ordinary learner/manager grants; hiding controls is not authorization.

## Explicit policy corrections included, not guessed in code

1. C14 learner start/record/complete rows currently say SELF, although their capabilities only come from LOCATION-scoped learner grants. Propose LOCATION plus mandatory self-identity target binding for all three. Their routes already carry organization/location. No learnerId is accepted as authority.
2. PublishContentPack remains unrouted. The existing matrix routing label is reconciled to the API manifest; only the bounded synthetic admission principal can publish the frozen template into the newly allocated run.
3. Demo applicability now includes manager reporting and Assignment/Membership lifecycle replay. The old learner-only N/A cells do not exempt an exposed manager path.
4. MembershipStateMachine may not emit unapproved MembershipCreated/MembershipDeactivated business events. Proposed state-machine representation records required LifecycleEvent snapshots and preserves only the already-approved MembershipRevoked event. No business-event candidate is promoted implicitly.
5. DT-002 must reflect identity→membership→scope→capability→target→entitlement ordering, with scope denial 403 rather than the old combined 404. DT-008 must distinguish a required selector from an authority claim; it cannot simply ignore the explicit scope tuple.

## Engineering decisions bounded by this package

Database keys, indexes, owner adapters, lock implementation, DTO codecs, UI component architecture and deployment packaging can be completed without asking the owner about schema trivia. They must implement the exact logical fields, cardinalities, lifecycle, command boundaries, retry rules and tests here. No schema or runtime can consume an unapproved entry just because it is technically convenient.

## Genuinely deferred non-demo work

- General operator provisioning for real customers, arbitrary organization/location creation, grant/reporting administration, invitations, email delivery, customer content ownership/catalog and approval, account recovery and OAuth.
- Certification criteria approval, certification issuance/revocation, derived XP/mastery/streak/rank, billing and entitlements for paid products.
- Privacy export/delete fulfillment, physical demo purge/anonymization, audit expiry executor, indefinite high-volume public operation.
- Production deployment, domain/security changes, operational alert destination, durable long-term evidence archive and commercial handoff.

Operator-managed onboarding remains the selected direction for later customer work; this demo neither reverses that choice nor falsely marks that work complete.
