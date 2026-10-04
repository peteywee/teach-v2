# Persistence Model Decision Packet

Status: **proposed — owner approval required**.

The proposal is intentionally a **persistence authority model**, not a guessed relational schema.

## What it proposes

- one persistence owner per mutable fact;
- owner-defined persistence ports implemented by Infrastructure;
- no cross-domain repository/table writes;
- Drizzle migration history as the current schema authority under C21;
- fail-closed schema admission: approved entity + approved identifier + approved persisted state + approved encoded relationships/cardinality + no shape-affecting open-question hold;
- protected-record ownership/scope enforcement in data access;
- backend-only database privileges for application tables;
- atomic append-only audit persistence;
- durable idempotency/reconciliation rules;
- destructive-migration/release drift gates.

## Why the full relational schema remains blocked

The current semantic baseline has:
- 13 approved entities but only 4 approved identifiers;
- 18/18 relationships still candidate;
- Membership/Location/Entitlement still candidate;
- candidate lifecycle states for Identity/ApplicationSession/LearningSession/Membership;
- zero registered capabilities;
- unresolved privacy/retention and production backup/restore policy.

Approving this proposal would approve the **rules by which persistence is designed**, not tables or migrations.

## Next gate after approval

Close the semantic dependencies required by the first physical persistence slice before Transport Interfaces or migrations are allowed to rely on them.
