# Coverage-preserving CI consolidation

## Scope and controls

Base: main fdb71287845ed024dabb83fb67b5a803fd55153d, tree 3cfaa3d8f0ed2d778ec8e18bd75dc52fb45846c3. This change does not include the unpublished semantic batch, runtime policy, schema, production effects or repository-settings changes.

The [machine coverage mapping](ci-consolidation-coverage.json) accounts for all 131 original run steps in 44 producer workflows. One producer now runs the retained 24 stage identities plus seven previously unique checks. One separate trusted read-only observer retains independent lifecycle closure. The observer's own terminal upload still requires independent authoritative readback. PR merge-definition provenance is not promoted to CLOSED.

Preserved logical coverage: 53 standalone authority/admission validators; all 216 outer validator-regression cases, including 40 positive controls and 176 denials; 13 live foundation test files; seven PostgreSQL suites; all P01–P05 replay entrypoints. The new consolidation regressions add checks rather than replacing logical cases. The existing foundation stage still discovers the live test inventory, and all three validator shards reconcile one shared inventory digest.

Seven added stages are document-governance, production-contract-decisions, drizzle-history, replay-p01, replay-p02, replay-p03 and replay-p04. Replays remain sequential, isolated and self-cleaning; P01 keeps its explicit shape assertions and P02–P05 retain their distinct prefix/upgrade proofs. Node is pinned to 20.20.2, pnpm to 12.8.1 and PostgreSQL to 17.11-alpine. Every audit stage remains shell-free and bounded to 25 seconds; the 15-minute job timeout is separate from stage bounds.

Every PR target branch is covered, not only PRs targeting main. Main pushes and manual dispatch remain, with no path filters. Document governance uses full-history checkout, validated SHA-only argv and exact source/event/base/run context. Missing required PR/push inputs or missing declared history cannot silently fall back. Initial pushes explicitly record zero-base policy; dispatch/local no-base policy is explicit. A failed/missing stage or changed context blocks final reconciliation while retaining incomplete evidence. Runtime remains UNKNOWN, activation/shared/production execution BLOCKED.

## Measured baseline versus planned structure

The prior completed main push had 44 producer jobs and 44 observers, totaling 1,220 seconds of summed job elapsed time (674 producer, 546 observer). The Actions creation-to-final-update envelope was 134 seconds. These are different measures; neither is a billing estimate. Baseline [producer](https://github.com/peteywee/teach-v2/actions/runs/39036224225) and [observer](https://github.com/peteywee/teach-v2/actions/runs/39036361602) were part of that batch.

| Quantity | Observed or source-derived baseline | Planned candidate structure |
|---|---:|---:|
| Workflow definitions | 45 | 2 |
| Producer jobs on broad main push | 44 | 1 |
| Observer jobs on broad main push | 44 | 1 |
| Frozen dependency installs | 7 | 1 |
| PostgreSQL services | 6 | 1 |
| Typechecks | 7 | 1 |
| Distinct retained artifacts | 133 observed | 4 expected |
| Bounded self-audit stages | 24 | 31 |

Pre-retirement local coverage shadow executed all seven migrated commands successfully with Node 20.20.2, pnpm 12.8.1 and PostgreSQL 17.11. Its working tree was dirty, so that shadow is command-success evidence, not final exact-source proof. Those stages totaled approximately 11 seconds of local driver elapsed time, including a 6.3-second first Drizzle invocation. A warm local run cannot establish hosted speedup or cold-run cost.

Final clean-source stage receipts and independent review are separate acceptance artifacts. No candidate hosted runner total, queue delay, artifact count, wall-clock savings or net cost savings is claimed by this source document. The old and candidate hosted runs are not a controlled same-source timing comparison. Report hosted observations only after the exact candidate has actually run; do not subtract retired job durations and call the result savings.

The GitHub main branch summary was refreshed before implementation: unprotected, status enforcement off with empty contexts/checks; repository rulesets were empty. The dedicated protection-detail endpoint returned 403 for this integration. No settings were changed or access denial bypassed.

## Verification and rollback

Acceptance requires complete source/command/test mapping, all 31 exact-source stage receipts and final reconciliation, negative cases for missing/skipped/failed/timed-out checks and context corruption, unchanged logical test inventories, and independent review. Hosted PR checks establish candidate verification, not merged-main closure. After a separately authorized merge, verify the main producer receipt, one observer closure, and independent terminal observer readback, including hashes and retention metadata. Keep failed attempts and never relabel an earlier receipt for a new tree.

Local materialization is shallow at the exact SHA-verified main commit. Comparing a candidate against its available fdb7128 parent proves that declared comparison, not full remote history. Hosted fetch-depth zero is mandatory. This distinction must remain in any local evidence handoff.

Rollback is one reviewed revert of the entire consolidation change: workflows, catalog, plan, guards, tests, documentation and generated lifecycle inventory together. Do not restore only YAML while leaving validators on a different model. Run fresh exact-source checks and lifecycle receipt verification for the revert commit. No force-push, artifact deletion, authority relaxation or repository-settings change is needed.
