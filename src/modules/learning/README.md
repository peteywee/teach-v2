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

A Learning-owned PostgreSQL storage adapter and immutable migration 0004 now define `learning_sessions`. PostgreSQL acceptance, pinned generation, and migration replay are PROVEN at the exact verification source recorded in `persistence/physical-slices/learning-session/implementation.json`: 11 PostgreSQL cases and 38 foundation cases pass, with identical empty/P04-upgrade fingerprints and one winner among 16 overlapping completion contenders. Recorded source proof does not replace CI for a later head. Domain/Application tests use explicit in-memory doubles.

There is no Assignment table or authoritative Assignment-authorization adapter and no transport route. The non-null `assignment_id` proves requiredness, not existence, learner assignment, or LRN-2 authorization. Runtime activation remains blocked until authoritative Assignment authorization and authorization-plus-insert atomicity are proven.

The adapter completes only ACTIVE sessions in authoritative Identity scope with one compare-and-set update. The database rejects COMPLETED ingress, unlisted transitions, reopening, and reassignment of session/Identity/Assignment references. Build-time composition supplies the Identity-owned FK column without importing foreign Infrastructure into Learning. This change does not persist ProgressEvent or Assignment, implement XP/mastery rules, or resolve the remaining C32 open questions.

Read and completion services capture a frozen copy of validated Identity scope before awaiting an adapter. Caller mutation cannot change the queried scope or the scope used to validate a returned record.

`scripts/persistence/validate-slice-p05-foundation.mjs` reconciles the historical foundation checkpoint against the immutable P04 prefix and validates the separate current P05 physical evidence, runtime prerequisites, migration history, totals, and readiness. The APPLY pins guard also runs that check and verifies the exact eight distinct admission criteria across P01–P05. Recorded CI evidence refers to its verification source commit; it does not establish proof for a later commit.

Runtime/persistence implementation may begin only from the separately recorded P05 admission authority; shared or production migration execution remains blocked.
