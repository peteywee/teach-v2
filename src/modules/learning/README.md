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

Foundation only. **SLICE-P05 physical persistence is BLOCKED.**

No LearningSession table, migration, repository, persistence adapter, service, transport interface, or production database change is authorized by this file.

The runtime layers will be introduced only after the P05 schema-admission gate is rerun from authoritative semantics and returns `ADMIT`.
