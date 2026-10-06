# Decision-closure r3.1 registration audit

Owner: Patrick Craven. Decision date: 2026-10-05, America/Chicago.
Authority: [SYS-21 issue #75](https://github.com/peteywee/teach-v2/issues/75).
Approved manifest SHA-256: `ff7b51df1e3a235e9d226d9d7232f81c64bbeb451b359b6e0f2ea232b6e1757c`.
Handoff: `40fcfa80b3cc4b6a88fe6df6fa6910895840389e` on `registration/decision-closure-sys21`.

All 20 remaining contracts use their requested MINOR versions. The canonical approval ledger is Part 25 of `contracts/APPROVAL-RECORD.md`; `governance/decision-closure/registration.json` records every value and residual. C00's archived metadata was corrected to superseded; its complete historical body and the complete historical bodies of the other 20 contracts were preserved.

| Gate | Result |
| --- | --- |
| Owner approval and exact source archive | PROVEN: retrieved r3.1 manifest matches #75; all listed source artifacts retain their approved hashes |
| Contract registration | PROVEN: 40 resolutions including C00's three; seven narrowed residuals; two unchanged questions |
| Contract inventory | PROVEN: 391 requirement IDs and 267 acceptance IDs; no additions or renumbering |
| Metadata | PROVEN: 112 governed Markdown documents validated |
| Registration regressions | PROVEN: 25 cases covering approval, archive tampering, residuals, normative values, stable IDs, historical bodies and authority overreach |
| Existing validators | Run the whole-repository audit and the three bounded regression shards at the candidate head; their command results are required before review |
| Independent review | NOT_PERFORMED: author self-review is not independent evidence |
| Runtime conformance | UNKNOWN: this is policy registration, not runtime implementation |
| C01/K00 capability promotion | BLOCKED: the 34 matrix capability identifiers remain unregistered; no kernel change is included |
| Shared/production execution | BLOCKED: no provider setting, migration, deployment or production action is included |

The original approved proposed validator has an archive-count defect: its complete-archive count uses a file list that excludes the manifest and sidecar. At the original `6553eb4` baseline, 37 of its 38 tests pass and the positive control rejects the valid 22-file archive as 20 files. The exact original validator and tests remain under `governance/proposals/2026-10-05-decision-closure/source-scripts/`; the registered validator checks the complete 22-file archive and the current registered contract state. This preserves the approved source bytes while correcting the executable registration check.

| Question still open | Missing value |
| --- | --- |
| OQ-PRIV-4 | Export fulfillment deadline |
| OQ-PRIV-5 | Deletion fulfillment deadline; unchanged |
| OQ-TXN-2 | Email delivery provider and OAuth providers |
| OQ-CNT-2 | Customer content approver role/title |
| OQ-CERT-2 | Certification criteria approver and approval-record ownership; unchanged, sole explicit blocker |
| OQ-API-3 | Deprecation sunset periods |
| OQ-EVD-2 | Evidence retention duration and durable archive location |
| OQ-OBS-1 | Alert destination |
| OQ-BIL-3 | Organization-to-billing-account cardinality |

```bash
node scripts/docs/validate-document-metadata.mjs --base 6553eb465e469dc9e60368cde40d259f86262997
node scripts/verification/validate-decision-closure.mjs
node --test scripts/tests/validate-decision-closure.test.mjs scripts/tests/validate-owner-decision-inventory.test.mjs
node scripts/architecture/validate-whole-repository.mjs
node scripts/packaging/validate-apply-guards.mjs pins
node scripts/tests/validate-validators.mjs --shard=1/3
node scripts/tests/validate-validators.mjs --shard=2/3
node scripts/tests/validate-validators.mjs --shard=3/3
node scripts/tests/validate-apply-guard-regressions.mjs
node scripts/release/validate-production-proof-contract-decisions.mjs
```

Each execution is bounded to 25 seconds. The earlier owner-policy captures and pre-closure recovery projection remain preserved as history; current checks require the later manifest-bound registration rather than treating old recommendations as approvals.
