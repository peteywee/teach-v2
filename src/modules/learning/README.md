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

Foundation established. **SLICE-P05 physical persistence is ADMITTED; implementation is authorized but not yet present in this admission change.**

This file does not itself implement a LearningSession table, migration, repository, persistence adapter, service, transport interface, or production database change.

Runtime/persistence implementation may begin only from the separately recorded P05 admission authority; shared or production migration execution remains blocked.
