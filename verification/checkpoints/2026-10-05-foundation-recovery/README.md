# Milestone — Teach V2 foundation recovery checkpoint

Checkpoint ID: **TEACH-V2-2026-10-05-FOUNDATION-RECOVERY**. Owner requested a stop and recoverable milestone on 2026-10-05 America/Chicago. Development is paused at this checkpoint.

## Exact recovery targets

| Target | Immutable commit | Meaning |
| --- | --- | --- |
| Full working state | `726c7ed9faeb66d472f1403d4f5900d0e5ae9ec1` | All 417 source files, including 62 modified/added files: preserved answers and unfinished lifecycle mechanisms |
| Validated main | `b45cde5202ebf137e9cc5aaa0647b88a9faddf86` | Last merged foundation, with 27/27 current check runs successful |
| Answer documentation | `f511fd63210224daab0a726b60291205b6810b94` | PR #71, open and unmerged at capture; 8/8 current check runs successful |

Full working-state tree: `a6a591a46901ca2595be9f32d39cf0544ebdbaba`.

Remote checkpoint branch: `checkpoint/2026-10-05-foundation-recovery`. Its milestone commit adds this recovery packet to the frozen source. Use the immutable full-state commit above to recover precisely the original working files. Never force-update this checkpoint branch; create a new dated checkpoint for later work.

The original local branch was `work/workflow-lifecycle-foundation`, HEAD `d4858f09717948dc5a19e0b25ab83d76493bbd40`. Its base tree matches validated main exactly. The original index was clean; its uncommitted working-tree state is preserved as committed source in the full-state target.

## Scope at the stop

- Foundation baseline: 8 tables / 5 migrations / 8 repositories / 5 physical slices, as previously recorded. No database was inspected or modified during checkpointing.
- Owner answer register: all 66 original IDs; 61 supplied responses; 5 registered policies; source sheet and follow-up wording preserved.
- Lifecycle mechanisms: local changes across 44 CI workflows plus capture, recovery, closure/readback, inventory and tests. Prior local evidence reported 28 lifecycle tests and 52 validators passing. This combined frozen state has no pinned CI proof and is not an approved release.
- P06–P08 admission, full runtime and shared/production execution remain blocked. Capturing a milestone grants no additional authority.
- Open documentation PR #71 remains unmerged; no review or merge is part of this stop.

## Recover into a new directory

Use a fresh directory so current work is preserved. Download this recovery packet together, then run one bounded step at a time:

```bash
python3 restore.py init "$HOME/projects/teach-v2-recovered-2026-10-05"
python3 restore.py fetch "$HOME/projects/teach-v2-recovered-2026-10-05"
python3 restore.py checkout "$HOME/projects/teach-v2-recovered-2026-10-05"
python3 restore.py verify "$HOME/projects/teach-v2-recovered-2026-10-05"
```

Each Git operation stops after 25 seconds. A failure preserves the destination for diagnosis. Fetch requires access to the repository. Verify requires both the exact source/tree and all 417 file hashes/modes to match. Success is a clean detached checkout at the full-state commit; it does not install dependencies, run migrations or deploy anything.

For validated-main recovery instead, create a separate directory and fetch/check out the exact validated-main commit above. The full-state file manifest intentionally describes the unfinished working snapshot, not validated main.

## What is and is not recoverable

This milestone recovers the repository source, documentation and pinned dependency manifest. It excludes ignored dependency directories, generated scratch output, credentials, local credential stores, database contents, external service settings and deployment state. It is a source checkpoint, not a database/PITR or production rollback proof. No production environment was changed in this session.

## Resume from here

1. Re-read the preserved owner answers; do not request already supplied decisions again.
2. Inspect exact current remote state before reconciling PR #71. Keep the frozen commits unchanged.
3. Resume the verification lifecycle layer from the captured code: audit the receipt collector, run negative tests, publish a development PR, then obtain pinned CI and actual artifact readback. A source backup is not conformance evidence.
4. Continue one complete dependency-ready layer at a time only after its lifecycle and handoff evidence are satisfied.

`source-manifest.json` captures every source file hash/mode and exact references. `evidence.json` records check-run URLs and separates validated heads from unproven working code. `restore-verification.json` records the performed local source-restore drill.
