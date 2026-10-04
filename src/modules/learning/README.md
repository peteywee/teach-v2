# Learning runtime module

This directory establishes the source boundary for the **Learning** runtime domain module authorized by `architecture/authority.json@1.0.0`.

## Authority

- Architecture 1.0.0 lists `Learning` as a runtime domain module.
- ARC-2 requires every mutable fact to have one owning runtime component and one write path.
- ARC-3 requires cross-domain mutation through the owning module's application boundary.
- ARC-4 forbids cross-domain repository imports and foreign-table writes.
- ARC-5 through ARC-7 preserve Domain / Application / Infrastructure / Interfaces separation.
- C32 owns LearningSession and progress semantics.

## Current state

**SLICE-P05 physical persistence is ADMITTED; implementation is authorized.**

The Domain and Application foundation now defines required learner/Assignment references, the closed ACTIVE -> COMPLETED lifecycle, Identity-scoped repository operations, and the separate LRN-2 Assignment-authorization port. Missing, mismatched, denied, or unavailable authorization rejects start before a repository write.

There is no concrete LearningSession persistence adapter, authoritative Assignment-authorization adapter, database schema/migration, or transport route yet. Tests use explicit in-memory doubles; they do not prove PostgreSQL persistence, real Assignment authorization, atomic authorization-plus-insert, or concurrent database completion. Runtime activation remains blocked until those separate proofs exist.

The port requires a future adapter to complete only ACTIVE sessions in authoritative Identity scope atomically. This change does not persist ProgressEvent or Assignment, implement XP/mastery rules, or resolve the remaining C32 open questions.

Read and completion services capture a frozen copy of validated Identity scope before awaiting an adapter. Caller mutation cannot change the queried scope or the scope used to validate a returned record.

`scripts/persistence/validate-slice-p05-foundation.mjs` reconciles the foundation checkpoint with admission, pending runtime prerequisites, migration history, physical artifact totals, and readiness. The APPLY pins guard also runs that check and verifies the exact eight distinct admission criteria across P01–P05. Recorded CI evidence refers to its verification source commit; it does not establish proof for a later commit.

Runtime/persistence implementation may begin only from the separately recorded P05 admission authority; shared or production migration execution remains blocked.
