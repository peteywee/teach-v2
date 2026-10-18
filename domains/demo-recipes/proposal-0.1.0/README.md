<!--tos-doc
{
  "doc_id": "TEACH-DEMO-RECIPES-2026-10-18-SOURCE-PACKAGE",
  "class": "source-record",
  "version": "0.1.0",
  "status": "proposed",
  "owner": "Patrick Craven, Top Shelf Service LLC",
  "created_on": "2026-10-18",
  "updated_on": "2026-10-18",
  "governed_by": ["TEACH-CON-C00", "TEACH-CON-C31", "TEACH-CON-C41", "TEACH-CON-C42"]
}
-->

# TEACH-DEMO-RECIPES-2026-10-18@0.1.0

Status: PROPOSED SOURCE PACKAGE. This immutable review artifact is not active authority by itself. Exact-token owner approval, contract revision, semantic registration, independent review, admission, implementation evidence, and runtime activation are separate records and gates. Subsequent approval or registration must not rewrite these source bytes or their original proposed labels.

SYS-21 impact issue: [#88](https://github.com/peteywee/teach-v2/issues/88). Baseline: `peteywee/teach-v2` main commit `2ad83bfce7d5c460f9f5f383a36491d9188de916`, tree `75e7e88a85ccb9145767e70c35f620f15e9fbd31`.

## Bounded outcome

Add three explicitly fictional, read-only recipes to the existing organization-owned ContentPack version. Connect the learner kitchen catalog, searchable and station-filterable recipe book, recipe detail/reference view, and navigation to the existing general handoff practice. Recipe browsing does not write progress, mark completion, or create mastery, certification, XP, or a recipe-specific graded challenge.

No new entity, domain owner, database, schema namespace, table, migration, public operation, capability, credential, or provider is introduced. The 15 API routes and seven served asset paths are unchanged. Managers gain no content-read permission. Existing scope, assignment, session, origin, revocation, quota, atomicity, and audit guarantees remain binding. This package grants no hosting, spending, live/shared-database, deployment, or external-publication authority.

## One canonical schema lineage

C31 CNT-1 and CNT-2 retain exactly one canonical ContentPack schema lineage. The existing immutable 1.0.0 version remains valid and readable without conversion. The additive 1.1.0 version requires a `recipes` array alongside the existing fields and exactly three original teaching blocks. An unknown version or a field from the wrong version fails closed. Supporting the prior version of this same canonical schema is not accepting a legacy format and does not introduce a C31 CNT-5 adapter.

- [Canonical schema 1.1.0](content-schema-1.1.0.json) defines the full publication payload, including grading material, and its reusable `#/$defs/Recipe` value definition.
- [Public projection 1.1.0](public-content-schema-1.1.0.json) has root `#/$defs/PublicContent`. Its `recipes` items reference `content-schema-1.1.0.json#/$defs/Recipe`; this is a projection of the same content, not another schema lineage.
- [Synthetic template 1.1.0](synthetic-content-template-1.1.0.json) binds the exact fictional copy. It retains the original title, `Demo Café: A clear team handoff`, and every original teaching instruction, prompt, option, expected answer, and feedback string. Only schema version, template version, and recipe reference content are additive. Admission generates fresh pack, block, and recipe IDs; template entries are not persisted identities.
- [Manifest](package-manifest.json) records the proposed revisions and finite artifact inventory. `SHA256SUMS` seals every listed artifact, including this README and the manifest, without hashing itself. Approval and registration records live outside this directory to avoid circular digest dependencies.

The original package at `domains/demo-runtime/proposal-0.1.0/` remains byte-for-byte unchanged. In particular, its ContentVersion definition, exact public ContentVersion schema, and current validator use a 38-character strict SemVer bound. The older narrative `canonical_content_schema.fields.version` says 128 bytes; this successor explicitly uses the already enforced 38-byte ASCII SemVer limit rather than broadening it or editing the historical source.

## Recipe and canonical constraints

Exactly three recipe objects are required, with unique IDs within the exact content version. Each object has only:

- `id`: existing opaque identifier syntax, 1–128 ASCII letters, digits, underscore, or hyphen.
- `title`: 1–160 Unicode scalar values; the fixed template explicitly labels each recipe as a fictional sample.
- `station`: 1–80 Unicode scalar values.
- `servings`: integer from 1 through 100.
- `ingredients`: ordered array of 1–30 plain-text strings, each 1–500 Unicode scalar values.
- `steps`: ordered array of 1–20 plain-text strings, each 1–2000 Unicode scalar values.
- `reference`: 1–1000 Unicode scalar values; every fixed template value is `General handoff practice`.

The existing no-HTML, no-URL/script/media, prohibited-control, valid-Unicode, and no-normalization rules apply to every recipe text field. The full content remains subject to strict JSON parsing, unsupported-key/property rejection, exact schema fields, three unique block IDs, distinct options, answer-index bounds, and one feedback value per option. Recipe IDs are embedded value identities, not a new independently addressable aggregate or route.

Canonical UTF-8 content remains at most 65,536 bytes. SHA-256 binds the full canonical payload, organization, pack, exact version, ordered blocks, and ordered recipes. Validated payloads are detached and deeply frozen. The existing `content_packs` identity row and `content_pack_versions.canonical_json`/`digest` row persist the data; published identity/version bytes cannot be replaced.

JSON Schema asserts the structural and expressible field bounds, including conditional answer/feedback length constraints. It is not sufficient by itself for raw JSON lexical rules, unique IDs by property, canonical-byte limits, digest verification, immutable storage, or authorization. The schemas explicitly record those mandatory semantic checks; they must remain in the Content owner validator and application boundary.

## Exact contract and integration impact

The proposed bounded revisions are C31 1.3.0 → 1.4.0, C41 1.2.0 → 1.3.0, and C42 1.2.0 → 1.3.0. Preserve superseded contract bytes, changelogs, approval provenance, original package digests, and dependent registration evidence. No original definition is superseded except the explicitly versioned schema/template/public projection and these connected read-only views.

Before consumption:

1. C31 and the successor registration must link the exact canonical schema and template above, their package checksum, and the unchanged predecessor. New admissions select `newRecipeDemoContent` only after applicable registration/admission checks pass. The original `newDemoContent` factory stays unchanged for regression and prior-version support.
2. C41 must link an exact-version response union: the unchanged original `PublicContent` 1.0.0 or the successor `PublicContent` 1.1.0. `ReadAssignedContentVersion` remains the same operation and route; it must not fall back to a loose object schema or accept missing recipes in 1.1.0.
3. The browser codec must embed an exact local copy of the successor public definition and its referenced `Recipe` definition. Resolve local references by a deterministic build/copy step; schema `$id` values are inert identifiers and never runtime network requests. Preserve the exact original public block and ContentVersion definitions. Codec/source parity tests must bind both versions.
4. Public content must be projected only from the validated assigned exact version. The returned digest is for full canonical content, not public JSON. The browser must verify expected pack, organization, version, and digest against its current own assignment before rendering. Public teaching blocks never reveal expected answers or authored feedback.
5. C42 links the read-only kitchen/book/detail controls to those existing authorized reads and to honest general-practice navigation. Repeated assignments to one exact pack/version must not multiply catalog recipes. Search/filter/detail state is transient client presentation, not a claim of persistent recipe ownership or progress.
6. Source inventories, governance/contract evidence, generated codec parity, and version-bound acceptance evidence must be refreshed against the resulting candidate. This package does not waive the existing admission or runtime activation gate.

## Proposed acceptance cases

1. Validate canonical 1.0.0 and 1.1.0 positives and exact boundaries. Reject wrong/unknown versions, missing or extra fields, duplicate recipe/block IDs, invalid counts/text/numbers, lone surrogates, unsafe lexical JSON, oversize canonical bytes, and altered digest or scope bindings.
2. Preserve the original 1.0.0 golden digest and factory behavior. For the successor, compare all original handoff block bytes and all nine engine evaluations. Required-block counts, response recording, completion/participation semantics, and engine 1.0.0 remain unchanged.
3. Prove deep immutability and detached public recipes. Persist/read recipe bytes through the existing Content version repository, reject tampering, and distinguish query-spy unit evidence from actual disposable PostgreSQL integration evidence.
4. Accept only own current assigned exact content. Foreign organization/pack/version/digest, malformed public payload, manager content reads, expired/closed runs, and revoked sessions fail closed with existing non-disclosing behavior.
5. Exercise kitchen, book, detail, and general-practice navigation; search, station filtering, no matches, clear, back, refresh, missing-recipe recovery, rapid/repeated clicks, and stale-response cancellation. Browse controls must cause no learning writes.
6. Retain learner answer/complete/readback; manager readback/reassignment/revocation; reset confirm/cancel/partial failure; logout, back/forward, and guarded direct navigation. Empty/loading/error/forbidden states must be truthful and recoverable.
7. Separate source/unit/contract checks from actual cloud-browser desktop/mobile and keyboard evidence. No blanket all-pages/all-controls claim is permitted for an untested state, accessibility requirement, or live runtime. Keep hosted runtime disabled unless separately authorized and admitted.

## Verification status

This package contains a proposed acceptance specification, not a runtime pass certificate or independent review. Earlier local candidate content tests and typechecking are development observations only; they do not bind future changed source. After integration, rerun affected tests and required aggregate checks against the final exact candidate. Preserve pending or blocked states rather than promoting them through documentation.
