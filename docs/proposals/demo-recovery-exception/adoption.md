# Exact adoption boundary and impact map

The owner subsequently approved adoption of the reviewed preparation and publication of its corresponding PR. The active 3.0.0 successors, owner-adoption.json and adoption-registration.json implement that policy-only transition. Historical preparation text and decision.json remain preserved. Actual t34ch recovery evidence is UNKNOWN; no live action is authorized. The mapping below records the reviewed implementation scope, not a new grant of authority.

## Adopted files and preserved predecessor mapping

- Replace contracts/c21-database-migration-contract.md with c21-3.0.0.proposed.md, changing proposed/preparation-only metadata to the actual reviewed registration state and linking that registration. Preserve the current exact 2.0.0 predecessor in contracts/superseded/c21-database-migration-contract-2.0.0.md with original body unchanged and explicit superseded metadata.
- Replace governance/decision-closure/07-evidence-release-operations-spec.md with operations-3.0.0.proposed.md similarly. Preserve its current 2.0.0 predecessor in governance/decision-closure/superseded/07-evidence-release-operations-spec-2.0.0.md.
- Update contracts/README.md C21/current package version and contracts/APPROVAL-RECORD.md with this narrow decision, exact reviewed versions and residual live gates. Do not rewrite the prior approval parts. Requirement IDs and acceptance-case counts stay unchanged; only MIG-9/MIG-10/MIG-12 references, MIG-AC-6, OQ-MIG-1/OQ-MIG-4 and operations §5/§8 change.
- Retain proposal.md as the finite normative recovery procedure; remove its preparation-only introductory status only in that reviewed registration change, recording the transition rather than inventing a past effective date. decision.json remains the historical preparation decision, not a runtime permission token.

## Existing source-compatibility mechanisms requiring propagation

scripts/kernel/demo-schema-isolation-registration.mjs currently seals the four active authority paths above through governance/demo-schema-isolation/registration.json and source-baseline.json. Do NOT edit those historical records to accept new bytes. Introduce the narrowly scoped successor projection for only these four paths using the existing source-bridge pattern. Require exact old/new bytes, matching predecessor hashes in impact-map.json, finite path allowlists and independently reviewed new source seals before returning historical bytes. Unknown/missing/tampered projection fails closed. Existing schema isolation meaning, Node24 choice and all live-authority false flags remain intact.

scripts/verification/demo-schema-isolation-engineering.mjs and the hosted backend source bridge seal the registration reader, affected verification source and CI. Preserve their immutable evidence; add only the precise successor compatibility needed by the adopted revision, with a genuine independent review. Do not reseal old test outputs or rewrite PR90/PR91 evidence. Re-run current-source, historical-source and negative teardown/projection tests.

The active scripts/release/validate-production-migration-evidence.mjs uses an explicit first-install dispatch to validateDemoRecoveryEvidence only for the exact new operation discriminator; all other input continues through the existing native validation. Missing/unknown discriminator must not silently select an exception. Return shape-validation results, never an authorization or proof-of-restoration claim. No caller-provided override reader, permissive fallback or synthetic fixture may establish active evidence.

Add scripts/tests/validate-demo-recovery-evidence.mjs to the existing bounded production-proof stage (scripts/tests/validate-production-proof.mjs) or existing producer stage, not a new workflow. Add an integration regression proving ordinary production still rejects logical backup and first-install exception cannot be selected for later/customer/destructive operations. The bounded evidence tests are now imported by the existing production-proof stage. Registration projection tests run in the existing registration stage. No new workflow is introduced.

## Review/adoption verification commands

- node --test scripts/tests/validate-demo-recovery-evidence.mjs
- node scripts/tests/validate-production-proof.mjs
- node --test scripts/tests/validate-demo-schema-isolation-registration.mjs
- node --test scripts/tests/validate-demo-schema-isolation-engineering.mjs
- node scripts/release/validate-production-proof-contract-decisions.mjs
- Existing complete self-audit producer plus Node24 source/package checks, after the exact reviewed compatibility changes; each bounded stage under 25 seconds.

The adoption candidate still requires genuine independent review and exact-head CI before merge readiness. Real capture/restore and provider validation stay UNKNOWN even after policy adoption.

The local rehearsal reuses a NOLOGIN role in the same cluster and has no membership edges. It does not prove independent role/grant recovery. Actual acceptance MUST restore into an isolated PG17 target with verified nonsecret role recreation/mapping, captured membership/grants and required compatible extensions; missing dependencies may not be silently inherited or omitted.

## Remaining live gates

Before any real capture, select and approve the exact candidate-affectable inventory, encrypted destination/access/retention, separate key custody and isolated PG17 restore target. Independently review actual consistency, complete coverage, role/dependency recreation, restore and preservation evidence. Then obtain exact candidate/migration/recovery-set manual apply approval and separately required access/grant approvals. Missing evidence blocks. Synthetic tests and source registration do not satisfy these gates.
