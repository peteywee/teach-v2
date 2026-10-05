# Complete workflow lifecycle — adopted development policy

Authority: the owner's instruction to complete one layer at a time and give every workflow a complete lifecycle. This policy adds development controls; it does not supersede product contracts or approve unresolved decisions.

## Definition of complete

A workflow is complete only when every applicable phase has an owner, executable mechanism, success and failure behavior, authoritative evidence, and a terminal disposition. UNKNOWN, missing evidence, interruption, or a successful execution without a retention receipt cannot mean CLOSED. A layer is complete only when its individual workflows and handoffs satisfy those requirements.

| Phase | Required mechanism and evidence |
|---|---|
| Intake | Identify workflow, trigger, run, attempt, inputs, expected source and scope. |
| Authority | Resolve controlling contract, owner and permitted effects; unresolved authority blocks execution. |
| Preflight | Validate dependencies, source, scope, target and required checks before effects. |
| Execution | Perform owned operations with bounded checkpoints; transactional changes commit together or roll back. |
| Verification | Observe outcomes and canonical state; test success, denial, failure, concurrency and interruption where applicable. |
| Retention | Preserve exact-source evidence and independently verify the retained artifact receipt. |
| Recovery | Preserve the failed attempt, diagnose once, reconcile ambiguous effects, then apply the workflow's explicit recovery policy. |
| Closure | Reconcile required steps, source/tree, run conclusion, evidence integrity and retention receipt. |
| Handoff | Transfer only the proven output and authorized scope to the next workflow; retain blockers. |

## Implemented verification layer

All 44 verification producers use a pinned source checkout, explicit step identities, read-only permissions, a job timeout, an always-run checkpoint recorder and an always-run artifact upload. The self-audit catalog keeps each verification stage limited to 25 seconds. A job timeout is an outer deadline, not evidence that each unrelated setup step is limited to 25 seconds.

The checkpoint records required outcomes and exact source/tree without retaining arbitrary step outputs. Its success disposition is AWAITING_RECEIPT. Failed, skipped, missing, contradictory and interrupted outcomes cannot close. Runner-managed isolated resources are torn down with the job. Hard termination can prevent capture: a missing report/receipt is incomplete, never a success.

`closeWorkflowReport` reconciles a checkpoint with an externally observed artifact/run receipt. The caller must obtain the receipt from authoritative GitHub readback and verify archive bytes, contained checkpoint, source, run/attempt and expiry. The function validates consistency; a caller-supplied receipt is not itself proof of authenticity. `close-workflow-lifecycle.mjs` implements bounded, read-only GitHub receipt collection: it checks the completed run, source/tree, source workflow digest, retained archive digest and contained checkpoint before writing closure evidence. Invoke it with `OWNER/REPO --run RUN_ID OUTPUT_DIR`; it uses `GITHUB_TOKEN` when required. The new Workflow Lifecycle Closure observer runs automatically after each named producer completes, using trusted default-branch code, read-only permissions and a 25-second operation bound. It verifies run/attempt/repository, actual ordered GitHub job steps (including service setup), workflow provenance, source/tree, archive bytes and a fresh artifact receipt. Its own checkpoint requires an independent terminal readback; it excludes itself from triggers so it cannot recursively claim success. End-to-end execution remains PENDING until merged-main artifacts and observer results are read back.

`planWorkflowRecovery` permits a diagnosed, new read-only verification attempt while preserving previous evidence. It grants no product-effect retry authorization, even after readback. Product recovery requires the controlling operation-specific contract.

## Product layer and sequencing

The generated inventory covers all 23 approved commands and carries their existing authority requirements, source/test links and missing obligations. All nine phases are required. Merely listing phases does not implement them: ingress, authorization, retained evidence, recovery and handoff remain explicitly UNKNOWN or BLOCKED where unproven.

Finish the verification layer's pinned CI and authoritative receipt proof first. Then take the earliest dependency-ready product layer through authority reconciliation, admission, implementation, failure-path verification, retention, recovery, closure and handoff. Do not move a partial runtime workflow to COMPLETE because storage tests passed. Missing owner decisions remain gates, not implied approvals.

## Development checks

- `node --test scripts/tests/validate-workflow-lifecycle.test.mjs`
- `node scripts/verification/validate-workflow-lifecycle.mjs`
- `node scripts/architecture/validate-whole-repository.mjs`
- `pnpm self-audit` advances one bounded stage; exact-source evidence must reconcile before closure.

Changing a workflow requires regenerating inventory with `deriveWorkflowInventory`; stale workflow digests or command coverage block the gate. Runtime activation and shared/production execution remain blocked.

## Actual workflow provenance and retained receipts

Capture records `GITHUB_WORKFLOW_SHA` separately from the checked-out source. Closure currently requires the actual workflow commit to equal the canonical upstream run source. Push/main, manual dispatch and observer runs can prove this equality. Pull-request workflows may execute a merge-ref definition while checking out the PR head; their source checks can pass, but closure stays BLOCKED when the actual workflow definition cannot be canonically tied to that source. Unknown provenance never becomes success.

Receipt retention means the artifact was intact and unexpired at the recorded observation time. Each receipt includes its expiration timestamp and a fresh metadata recheck. OQ-EVD-2's durable archival mechanism and retention duration remain separate unresolved policy work. Neither an upload nor CLOSED development evidence establishes indefinite retention or full runtime conformance.

## Batch validation and handoff

The 45-workflow inventory contains 44 producers and one observer; all 23 approved product commands carry their existing missing obligations. The lifecycle regression stage runs core, wiring and readback tests. Negative cases cover rehashed reports, omitted steps, permission/source substitution, actual job failure, container setup, reruns, archive tampering, duplicate/path-traversing ZIP entries and artifact disappearance.

This development layer grants only `DEVELOPMENT_EVIDENCE_ONLY` handoff. P06–P08, real Authorization/Audit adapters and production execution keep their existing gates. The preserved owner-answer register must be loaded before proposing the next authority/admission layer; implementation blockers do not erase supplied answers.
