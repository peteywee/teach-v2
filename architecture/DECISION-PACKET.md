# Architecture Decision Packet

Status: **proposed — owner approval required**.

## Recommended decisions

1. **Topology:** modular monolith; one initial backend deployment.
2. **Runtime modules:** Identity, Organization, Authorization, Content, Learning, Certification, AuditLifecycle, TransactionControl.
3. **Support planes:** Observability = runtime infrastructure support; VerificationEvidence = verification/release plane; Governance = build-time/governance plane.
4. **Cross-domain boundary:** writes only through the owning module's registered command/application interface; reads through explicit query/read interfaces; no foreign repository/table access.
5. **Layering:** Domain → Application orchestration → Infrastructure adapters → Interfaces, with the dependency constraints recorded in `proposed.json`.
6. **No premature distribution:** no microservice or broker dependency in the initial baseline.
7. **Physical layout deferred:** package/app paths are not approved by this decision.

## Why this is not being auto-approved

The active semantic ownership map has eleven domains, while the original source architecture named seven expected modules. The proposal makes a concrete placement recommendation for the four later domains, but that placement is an architecture decision and therefore requires owner approval.

## Semantics that remain outside the architecture decision

Architecture approval must not promote or make implementation-authoritative:

- 10 candidate K00 events;
- 8 discovery-blocked command proposals;
- 9 remaining core missing K00 candidates;
- 18 candidate relationships;
- 22 candidate invariants;
- 8 candidate decision tables.

Those remain governed by their own semantic gates.
