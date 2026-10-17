# Proposed complete capability-name/type admission

**`TEACH-SEM-CAPABILITY-NAMES-2026-10-17@0.1.1`. PROPOSED ONLY. 36 candidate entries; zero actual promotions or runtime grants.**

This successor to the candidate transcription packet supplies the missing canonical type definition rather than leaving it as an open-ended question. All source and live-kernel files remain untouched. It is a reviewable proposal for a narrowly bounded future semantic approval, not an approval record.

## Proposed modeling decision, derived from existing authority

- `Capability` is a **value_object** in `kernel/values.json`: “A typed, dot-delimited action constant,” exactly C14 §3. C01 SEM-16 says immutable values carrying validation/meaning should be value objects and cannot have independent business lifecycle. Therefore no Capability entity, table, mutable grant object or state machine is introduced.
- Existing `CapabilityId` stays an **identifier** in `kernel/identifiers.json`, retaining string value type, `represents: Capability` and Authorization ownership. This proposal completes its definition/validation/authority metadata; it does not add a second ID or change the accepted vocabulary.
- The 34 names are **capability** entries in the already-designated `kernel/capabilities.json`, with `CapabilityId` as identifier type and references to the exact registered C14 operation rows. The current generic kernel schema allows nonempty kind strings but does not establish a capability-specific shape. `kind=capability` and the additive review schema follow the registry-family convention; they are explicitly proposed, not falsely described as an existing approved schema.
- Every entry records definition, identifier or justified identifier-type not-applicable value, relationships, sole owning domain, no independent business lifecycle and authority implications (SEM-4). No new business behavior is defined.
- The ownership proposal adds 35 Authorization-owned entries. Existing approved CapabilityId ownership is preserved. Business command owners remain unchanged.

**No new owner product choice is needed to draft this model.** It follows C14 and SEM-16/28. Nevertheless semantic admission/promotion requires the explicit owner approval prescribed by SEM-30, after independent review. Content tenancy, reporting persistence, bootstrap and runtime interfaces are separate unfinished decisions/admissions.

## Closed name/type graph versus unclosed runtime graph

The exact proposed future promotion set is 36 entries: Capability value object + CapabilityId identifier + 34 action constants. Capability requires CapabilityId; CapabilityId requires Capability; every named capability requires both. This small type cycle is intentional, has no mutation lifecycle and is traversed with a visited set. A hypothetical in-memory status overlay approving precisely all 36 closes their naming/type dependencies. No actual registry statuses are changed, and a closure check alone is never an approval.

C14 operational dependencies are **not hidden or declared empty**. This proposal does not define grants, scopes, actors, target-resolution rules or runtime evaluation. SEM-28 reserves those to the unchanged C14 matrix, preserved byte-for-byte in `c14-policy.snapshot.json`. The `authorization_policy_ref` points to each full operation row, and all operational blockers in the parent packet remain binding. In particular, Membership/Location/grants/ReportingRelationship, ContentPack tenancy, transport-facing reads, audit/persistence and first-tenant bootstrap are not promoted here. Names do not create those facts or allow a handler to run.

SEM-36 explicitly covers `requires`, `from`/`to`, `entity`, `emitted_by` and `scope` references in all approved entries. The additional `identifier`/`represents` consistency checks in this proposal are a **separate typed-model completeness rule**, not a claim that SEM-36 enumerates those fields. Scope labels from C14 remain in C14, where they belong; no new K00 Scope entity or set is invented to turn role policy into naming semantics.

## Exact proposed future promotion set

Every entry in the attached overlay is still `candidate`.

| ID | Kind | Named dependencies |
| --- | --- | --- |
| `Capability` | value_object | `CapabilityId` |
| `CapabilityId` | identifier | `Capability` |
| `identity.credential.authenticate` | capability | `Capability, CapabilityId` |
| `identity.session.issue` | capability | `Capability, CapabilityId` |
| `identity.credential.change` | capability | `Capability, CapabilityId` |
| `identity.identity.create` | capability | `Capability, CapabilityId` |
| `identity.invitation.create` | capability | `Capability, CapabilityId` |
| `identity.invitation.revoke` | capability | `Capability, CapabilityId` |
| `identity.invitation.accept` | capability | `Capability, CapabilityId` |
| `identity.token.revoke` | capability | `Capability, CapabilityId` |
| `identity.lifecycle.deactivate` | capability | `Capability, CapabilityId` |
| `identity.lifecycle.reactivate` | capability | `Capability, CapabilityId` |
| `identity.lifecycle.offboard` | capability | `Capability, CapabilityId` |
| `identity.session.revoke` | capability | `Capability, CapabilityId` |
| `organization.membership.create` | capability | `Capability, CapabilityId` |
| `organization.membership.deactivate` | capability | `Capability, CapabilityId` |
| `organization.membership.revoke` | capability | `Capability, CapabilityId` |
| `learning.assignment.create` | capability | `Capability, CapabilityId` |
| `learning.session.start` | capability | `Capability, CapabilityId` |
| `learning.progress.record` | capability | `Capability, CapabilityId` |
| `learning.session.complete` | capability | `Capability, CapabilityId` |
| `content.pack.publish` | capability | `Capability, CapabilityId` |
| `certification.credential.issue` | capability | `Capability, CapabilityId` |
| `certification.credential.revoke` | capability | `Capability, CapabilityId` |
| `transaction.reconciliation.resolve` | capability | `Capability, CapabilityId` |
| `identity.session.read` | capability | `Capability, CapabilityId` |
| `organization.membership.read_self` | capability | `Capability, CapabilityId` |
| `learning.assignment.read_self` | capability | `Capability, CapabilityId` |
| `content.pack.read_assigned` | capability | `Capability, CapabilityId` |
| `learning.state.read_self` | capability | `Capability, CapabilityId` |
| `certification.credential.read_self` | capability | `Capability, CapabilityId` |
| `organization.team.read` | capability | `Capability, CapabilityId` |
| `learning.state.read_team` | capability | `Capability, CapabilityId` |
| `identity.invitation.read` | capability | `Capability, CapabilityId` |
| `certification.credential.verify` | capability | `Capability, CapabilityId` |
| `audit.event.read` | capability | `Capability, CapabilityId` |

## Unchanged invariants

- C01 names; C14 decides meaning, grants, scope and denial. Five bundles and all 34 mappings remain exact.
- No legacy grants, cross-tenant platform role, automation principal or agent product capability.
- No promotion or activation occurs from running the local verification script.
- No new routes, adapters, persistence, migration, external provider, deployment or customer claim.
- Membership hold and all unrelated candidates remain unchanged.
- CERT-2 remains open; certification issuance stays fail closed. This packet does not settle certification approval.
- No claim of learner/manager runtime readiness, full 23-command completion, or commercial readiness.

## Local proposal verification

Run `python validate_packet.py --source-root /workspace/shared/teach-v2-pristine` from this directory. The script is dependency-free and reads the source snapshot plus local proposal only. It tests exact 34 names and namespace, strict field types and exact schema-pinned 36-entry contents, C14 policy byte equality, no role/grant/scope drift, CapabilityId→Capability consistency, ownership proposals, no actual activation, source hashes, rejection of every actual promotion/status change and negative dependency fixtures for each SEM-36 field. It also computes the hypothetical **name/type** graph, explicitly separate from runtime closure. It writes no files unless the caller redirects stdout to an evidence file. The candidate-only status gate never accepts an approval object and cannot authenticate the owner or authorize promotion. Synthetic closure fixtures permit no holds because this package authorizes none. A future live admission gate must verify actual owner evidence and exact exception IDs independently.

These are static proposal checks, not tests of the application's current verifier, runtime handlers, database, browser or deployment. The real verifier still needs audited all-family closure coverage and negative fixtures before implementation relies on a semantic admission.

## Bounded next approval wording, after independent review

“Do you approve `TEACH-SEM-CAPABILITY-NAMES-2026-10-17@0.1.1` as the exact capability-name/type semantic admission package: Capability as an immutable Authorization-owned value object, completion of CapabilityId, and the 34 C14 action constants listed in its manifest, with registration and promotion of exactly those 36 entries authorized only after the admission checks pass? This preserves all C14 policy, adds no grants or routes, and does not release runtime, Membership, certification, deployment or sale-readiness gates.”

A yes to this exact request would authorize only this identified semantic scope, not broader product activation. Record the actual owner's response and package digest; never manufacture an approval token. If the reviewed entry meaning, list, source policy or package bytes change materially, bump this package version and request approval for that revised version. If the parent chooses candidate registration only first, no candidate-to-approved promotion is implied by that work.

## Intended audited registration/promotion diff

1. Add the Capability value object; complete CapabilityId metadata; add the exact 34 capability entries. First registration may keep all candidate.
2. Add proposed Ownership Map entries under Authorization without changing an existing owner.
3. Update the kernel/ownership manifests to the reviewed versions (proposed K00 0.17.0 / map 1.8.0; not currently active).
4. Add typed-schema/all-family closure validation, approval-bound promotion checks and required negative cases. Preserve rather than suppress unrelated existing failures.
5. Only with exact recorded SEM-30 approval and passing admission review, promote the manifest's 36 IDs atomically. Leave every unrelated status/hold unchanged. Do not mount an operation because its constant is now named.

## Sources and boundaries

`manifest.json` contains exact-commit source URLs and SHA-256 hashes. Baseline is `a77909814a031b21fb995818f98aad80a422d3cb`, not the currently audited implementation branch. The complete runtime dependency inventory and all current candidate IDs are in the parent packet's `dependency-inventory.json` and `README.md`. The reusable product/phase acceptance map is `/workspace/shared/teach-v2-rebuild-acceptance.md`. These are working documents created for this rebuild, not external source changes.

## Revision 0.1.1: independent-review corrections

The previous 0.1.0 artifact is preserved unchanged. Review reproduced its exact candidate payload and source hashes, but demonstrated that its validator helpers were looser than the stated guarantees. This revision pins the exact entries in the proposed schema, verifies definition/implication types and source-derived operation text, rejects all actual promotions (including unrelated/partial sets), and removes any helper that could accept a synthetic owner-verification boolean or truthy hold record. The hypothetical name/type closure fixture is not a production admission gate. No entry meaning or C14 policy changed.
