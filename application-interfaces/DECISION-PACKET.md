# Application Interface Decision Packet

Status: **proposed — owner approval required**.

The proposal covers the logical application boundary only.

## What would be approved

- one logical application command entry point for each of the 23 approved K00 commands;
- command ownership by the owning runtime module;
- authoritative cross-domain reads through owner-defined read interfaces;
- cross-domain writes only through owning registered command boundaries;
- AuthorizationDecision, AuditAppend, ObservabilitySink, and TransactionControl provider-readback interfaces;
- explicit AcceptInvitation and OffboardIdentity multi-module orchestration while preserving single-writer ownership;
- transport-neutral command context/result boundaries.

## What remains deferred

Persistence tables/repositories, HTTP route inventory, transport schemas, frontend components, physical package names, provider libraries, broker/event-bus adoption, and every candidate/unresolved semantic item.

The proposal intentionally stops before approval because Application Interfaces is a new owner decision gate.
