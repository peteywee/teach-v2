# Independent review: approved full demo semantic registration

## Verdict

**PASS. No unresolved semantic-registration blockers remain for the exact source below.** This satisfies the independent semantic-registration review prerequisite for separately reviewed, per-slice physical admission and owner-authorized local isolated implementation. It is not itself physical ADMIT, runtime activation, PostgreSQL replay, application conformance, demo completion, public CI evidence, deployment authorization, or approval for security settings, credentials, customer provisioning or audit deletion.

Reviewed on 2026-10-17 by the independent registration review lane. The reviewer did not edit the candidate source. The verdict is source-bound; a different source tree requires reconciliation of the actual delta, not an automatic transfer of this verdict.

## Exact identity and authorization

- Candidate: `/workspace/shared/teach-v2-demo-runtime-registration`.
- Clean local commit: `4d759924389590c9bda330008dbfc76291485200`.
- Tree: `5795b40203414a6751db4e44684b1151cf63903e`.
- `domains/demo-runtime/registration.json` SHA256: `b94cf7c7c9bab35ad2454470295ae2b04b8814bd0ac55c282cdd3dd6df67218d`.
- Exact approved package: `TEACH-DEMO-RUNTIME-2026-10-17@0.1.0`; SHA256 of its `SHA256SUMS`: `a1df23b03a0f0660a072cff00eb40d3d2fb60bc8c521f12b56977f559601196a`.
- Baseline remote main: `14ca8c409993c9e57077d9705db022d3bfd26b1a`, tree `771867f1dbb47e277f90158a9f25b504bb786510`; local acquisition commit `9bc80df3efa0199e16d98d681c9cf8a8fd0bd10a` has that same baseline tree. The candidate commit is local, not a claim of remote publication.
- Public SYS-21 issue: https://github.com/peteywee/teach-v2/issues/82. Independently retrieved through GitHub: created `2026-10-17T20:38:55Z`, title “SYS-21: register approved isolated full demo runtime package 0.1.0”. The registration record and task chronology establish issue-before-active-revision ordering; this review independently verified the issue and timestamp, not filesystem mutation timing.
- Owner approval is preserved in `domains/demo-runtime/owner-approval.json`, including the exact package question and affirmative user answer. The approval permits registration and local isolated implementation after admission checks, plus the ready-PR review/merge lifecycle. It does not authorize shared/production deployment or materially expanded persistent access.

## Independent frozen-source checks

The fresh Node 20 registration validator returned PASS with **131 exact changed semantic entries, 236 approved live entries, 583 semantic references and zero closure holds**. Independent direct comparisons, not just the validator result, established:

1. The kernel changed exactly the approved set: 46 PROMOTE, 15 REVISE, 70 ADD. No undeclared changed entries, removals, or mismatched proposal definitions, owner domains, required edges or constraints were found. The added CommandActor is part of the approved 131-entry freeze, not a later expansion.
2. All 16 proposal file checksums pass and the approved aggregate digest is unchanged. All 67 registered authority-file hashes match. All 386 stored predecessor file contents match the baseline Git objects exactly.
3. Contracts, ownership, application interfaces and logical persistence have coherent successor registrations. The 15 affected contracts preserve predecessor copies; K00 is 0.18.0, ownership 1.9.0, interfaces 1.1.0, logical persistence 1.1.0. No physical slice is admitted by these semantic changes.
4. The package's 15 route declarations and seven owner queries are represented. The full live manifest contains 34 product routes and three boundary exceptions: all remain unmounted; all product routes remain unimplemented. Source under `src`, `tests`, `drizzle`, and `persistence/physical-slices` has no changes from baseline.
5. Owner-query boundaries, explicit orchestration, canonical error envelope and fixed transport schemas remain attached to the immutable proposal. Authority is resolved by server-side owner facts, not request selectors, capability presentation data or environment/header claims.

Machine-readable evidence and hash-verified test-log references are in `registration-checks.json` beside this review.

## Narrow compatibility and retained authority

The earlier CapabilityId conflict is resolved in C01, not merely bypassed in a validator. `contracts/c01-canonical-semantics-contract.md#exact-demo-capability-identifier-compatibility` defines the effective rule as exact approved vocabulary membership AND either the unchanged ordinary pattern or exactly one of:

- `identity.demo.persona.create`
- `identity.demo.persona.switch`
- `identity.demo.sessions.revoke`

C14 explicitly points to that rule. These exact names were already present in the owner-approved package. The existing CapabilityId entry is unchanged; no 132nd entry or arbitrary four-segment grammar was introduced. The literal alternatives take precedence only for these three names. Vocabulary membership itself confers no grant. Extra names and broad pattern relaxation are negative cases.

The human/credential assumption is amended only for synthetic, credentialless demo personas. Named execution principals are bounded to the admission and expiry purposes, fixed capabilities, fixed internal command graphs and demo scopes. There is no general cross-tenant service grant, arbitrary code identity, client authority, or newly provisioned credential. The SELF versus MEMBERSHIP mismatch is explicitly resolved by membership-backed learner execution and current owner facts, without opening manager privileges.

The registration preserves the proposed full end goal: isolated per-run synthetic content, persisted learner assignments/sessions/progress, manager reporting and assignment, safe persona switching, 60-minute server-checked expiry, reset by close-and-new-run, terminal session revocation and retained audit/history. The 100-session lifetime cap is serialized and does not prevent close. Idempotent replay must recheck current authority; write/close races and expiry are governed by transactional ordering, not eventual UI state. Seven reads are authorization-bearing server operations, not unguarded client aggregations.

The 131-entry scope is larger than a superficial demo façade but justified by the full persisted workflow and required identifiers, relationships, audit, receipts, lifecycle and owner dependencies. Removing these merely to lower the count would leave the approved end goal incomplete. It does not absorb certification, entitlement, arbitrary tenant administration, deletion, or unrelated runtime work. Semantic completeness remains distinct from proof that implementation works.

## Corrected review blockers and legacy-test integrity

All findings raised during this review are closed in the frozen tree:

- C01 now supplies the exact identifier precedence described above, with C14 linkage.
- The historical compatibility reader first validates the live successor registration. It cannot silently treat the predecessor as current authority.
- A previously accepted unexpected live governance JSON file is now rejected. Exact live-root inventory validation covers unauthorized files/directories/symlinks rather than enumerating only snapshot names. Independent scratch mutation checks confirmed rejection at both registration and decision-closure gates.
- Existing 220 regression cases remain explicit predecessor/compatibility tests. Fourteen diagnostic transitions are finite and retain negative polarity and named cases; they are not a blanket generic-error acceptance rule. Live registration mutations have their own automatic CI stage.
- Negative subprocess tests require normal expected exit behavior. A timeout, signal or launch failure cannot count as success just because expected stderr appeared first.
- The standalone validator is explicitly inventoried; `demo-registration-regressions` is a separate bounded 25-second stage rather than being hidden in a historical five-second harness. Workflow lifecycle inventory is regenerated. Its unit count update preserves product BLOCKED assertions and live inventory reconciliation.

The original proposal review also required corrected receipt actor typing, resolvable schema references, consistent read-interface naming, byte-identical baseline error envelope, exact learning-version bindings, canonical LOCATION plus target binding, and bounded session history. Those corrections remain in the unchanged owner-approved payload.

## Verification evidence and limits

Fresh independent final execution: Node 20 `scripts/kernel/validate-demo-runtime-registration.mjs` PASS at the exact clean commit, plus the direct comparisons above. Focused independent review and scratch mutations exercised the live/predecessor safeguards. The author's final logs were read and their SHA256 values independently checked against the frozen handoff:

- 220 legacy regressions across 74/73/73 cases: PASS.
- 17 demo-registration mutation tests: PASS, zero skipped or failed.
- 522 unit tests: PASS, zero skipped or failed.
- 261 CI-consolidation tests: PASS.
- 55 whole-repository authority/admission validators: PASS.
- Typecheck, document history, pins and staging: PASS.

These suites overlap in places and are not represented as an additive count of unique tests. They were not all rerun by this reviewer after the final freeze; the final direct source checks and validator were rerun, and supplied logs are hash-bound evidence. Public CI, new-storage PostgreSQL replay/integration and application/browser acceptance are not claimed. Existing unresolved physical/product gates remain truthful BLOCKED/UNKNOWN rather than being relabeled complete.

## Next permitted step

The physical lane may bind this exact semantic source and review artifact in its separately reviewed admission decision. Local migration/repository/application work may then proceed only for admitted slices and in the owner-authorized isolated environment. Publication must still satisfy its own exact-source CI/review gates. No additional owner approval is required merely to begin the already approved, properly admitted local implementation; no new global disable or unnecessary governance loop is imposed by this review.
