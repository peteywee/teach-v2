<!--tos-doc
{
  "doc_id": "TEACH-CON-C41",
  "class": "contract",
  "version": "1.4.0",
  "claims_truth_state": "declared",
  "status": "superseded",
  "owner": "Patrick Craven, Top Shelf Service LLC",
  "created_on": "2026-10-03",
  "updated_on": "2026-10-26",
  "effective_on": "2026-10-26",
  "approval": {
    "state": "approved",
    "approved_version": "1.4.0",
    "approved_on": "2026-10-26",
    "record": "domains/demo-kitchen/owner-approval.json",
    "basis": "Bounded owner-approved kitchen scope; implementation versions/digest recorded separately from owner wording."
  },
  "baseline": {
    "repo": "peteywee/teach-v2",
    "ref": "main",
    "commit": "2c9b1c849a520ba817efc91150be9a37797f4238",
    "purpose": "contract-spine approval baseline"
  },
  "legacy_reference": {
    "repo": "peteywee/teach",
    "ref": "work/TR-0010-production-cutover",
    "head_sha": "79fdce5cc3b207750888e5c2c1c198159ad17077",
    "use": "reference only; does not govern and is not governed by this contract"
  },
  "supersedes": [
    "TEACH-CON-C41@1.0.3",
    "TEACH-CON-C41@1.1.0",
    "TEACH-CON-C41@1.2.0",
    "TEACH-CON-C41@1.3.0"
  ],
  "superseded_by": "TEACH-CON-C41@1.5.0",
  "depends_on": [
    "contracts/"
  ],
  "demo_runtime_registration": {
    "package": "TEACH-DEMO-RUNTIME-2026-10-17@0.1.0",
    "approval_record": "domains/demo-runtime/owner-approval.json",
    "issue": "#82",
    "source_package": "domains/demo-runtime/proposal-0.1.0",
    "sha256sums_sha256": "a1df23b03a0f0660a072cff00eb40d3d2fb60bc8c521f12b56977f559601196a",
    "semantic_authority_only": true,
    "physical_schema_admission": false,
    "runtime_activation": false,
    "deployment_authority": false
  },
  "demo_recipes_registration": {
    "package": "TEACH-DEMO-RECIPES-2026-10-18@0.1.1",
    "approval_record": "domains/demo-recipes/owner-approval.json",
    "issue": "#88",
    "source_package": "domains/demo-recipes/proposal-0.1.1",
    "sha256sums_sha256": "b5f80daf1d94ecbccb1a01f3e58be3fc98d32564567b1cf03fd5c639eb435255",
    "semantic_authority_only": true,
    "physical_schema_admission": false,
    "runtime_activation": false,
    "deployment_authority": false
  },
  "demo_kitchen_registration": {
    "package": "TEACH-DEMO-KITCHEN-2026-10-26@0.1.0",
    "issue": "#99",
    "approval_record": "domains/demo-kitchen/owner-approval.json",
    "source_package": "domains/demo-kitchen/proposal-0.1.0",
    "sha256sums_sha256": "ba01dfc871d53a98a621ee301ec8435061c8d01f0ac509c1029539d03337406d",
    "source_registration_only": true,
    "physical_schema_admission": false,
    "runtime_proof": "NOT_ESTABLISHED_BY_REGISTRATION"
  },
  "superseded_on": "2026-10-26"
}
-->

# Superseded contract record

The original body below is preserved, including its former current-status wording.
# C41 — Application / Command / API Boundary Contract

| Field              | Value                                                                                                                                                           |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Contract ID        | C41                                                                                                                                                             |
| Group              | C40 Application Boundaries                                                                                                                                      |
| Governed by        | C00 System Authority                                                                                                                                            |
| Version | 1.4.0 |
| Status             | `active`                                                                                                                                                        |
| Owner              | Patrick Craven, Top Shelf Service LLC                                                                                                                           |
| Approved by | Patrick Craven (scope owner), 2026-10-26; SYS-21 #99; see `domains/demo-kitchen/owner-approval.json`; implementation versions recorded by preparer |
| Requirement prefix | `API`                                                                                                                                                           |
| Activation         | Required for the core rebuild                                                                                                                                   |
| Legacy lineage     | New. Carries forward the legacy Gate A rule that route/OpenAPI drift fails CI.                                                                                  |
| Supersedes | 1.3.0 |
| Superseded by      | None                                                                                                                                                            |
| Created            | 2026-10-03                                                                                                                                                      |
| Last updated | 2026-10-26 |

## 1. Purpose and Failure Prevented

A route handler reads `req.json()` and passes the object straight into a database update. A client adds an extra `organizationId` field and it is written. Another handler throws, and the 500 response includes a stack trace with a connection string. This contract makes the API edge a validated, typed boundary where nothing unchecked gets in and nothing internal gets out.

## 2. Scope

This contract owns:

- The application command boundary
- The `/api/v1` boundary
- Input and output schemas
- Error semantics
- API versioning

This contract does not own:

- Authorization decisions (C14)
- Business rules (owning domain contracts)
- Request-ID generation (C53)

Related contracts: C00, C01, C14, C53.

## 3. Definitions

| Term               | Meaning                                                                                                                                                                |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Boundary exception | A route outside `/api/v1` explicitly listed in this contract (for example health, readiness, OAuth callback, provider webhook) (see OQ-API-1; value Not yet verified). |

## 4. Requirements

The keywords MUST, MUST NOT, SHOULD, and MAY are used in the RFC 2119 sense. Requirement IDs are stable and MUST NOT be renumbered or reused.

- **API-1** — `/api/v1` MUST be the canonical application API boundary; application routes outside it MUST be listed boundary exceptions.
- **API-2** — Every external input (body, query, path, headers used by logic) MUST be validated against a schema before reaching business logic.
- **API-3** — Invalid input MUST be rejected with a client-error status and no side effect.
- **API-4** — Unvalidated request bodies MUST NOT be passed to business logic.
- **API-5** — Every response structure MUST be schema-defined.
- **API-6** — Drift between mounted routes and the published API description MUST fail CI.
- **API-7** — Every protected operation MUST exist in the C14 registry.
- **API-8** — Business rules MUST live below route handlers, in domain code that can be tested without HTTP.
- **API-9** — Database queries MUST NOT derive tenant scope from client-supplied data.
- **API-10** — API errors MUST use exactly the stable `code`, `message`, `requestId` envelope and status semantics in `api-error-envelope.schema.json` and the registered API manifest. Missing and out-of-scope targets MUST produce identical non-disclosing denials; no target existence or private detail is leaked. See `governance/decision-closure/05-api-boundary-manifest.md`. (OQ-API-2 resolved 2026-10-05).
- **API-11** — Production error responses MUST NOT expose stack traces, SQL, internal identifiers of other tenants, or secrets.
- **API-12** — Every request ID MUST propagate into audit records and observability output.
- **API-13** — Breaking consumer changes MUST use the major-version path `/api/v1` and an explicit deprecation manifest rather than in-place replacement. Sunset periods remain UNKNOWN; no deprecation sunset is authorized until owner selection. See `governance/decision-closure/05-api-boundary-manifest.md`. (OQ-API-3 partially registered 2026-10-05).
- **API-14** — Application commands MUST be the system boundary for state changes; HTTP routes, UI interactions, jobs, and agents MUST invoke registered commands (C01) rather than implement business rules.
- **API-15** — An HTTP route MUST NOT define or alter the semantics of the command it exposes.

## 5. Acceptance Cases

| Case      | Proves              | Setup                                                                                                            | Expected                                                                    |
| --------- | ------------------- | ---------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| API-AC-1  | API-1               | Enumerate mounted routes                                                                                         | All under `/api/v1` or on the exception list                                |
| API-AC-2  | API-2, API-3, API-4 | Fuzz each mutating route with extra, missing, and wrong-type fields                                              | Rejected 4xx; no writes; static check finds no raw body use in domain calls |
| API-AC-3  | API-5, API-6        | Contract tests validate responses; CI diffs routes against description                                           | All responses conform; drift fails                                          |
| API-AC-4  | API-7               | Covered by AUTHZ registered/startup cases                                                                        | See AUTHZ acceptance cases                                                  |
| API-AC-5  | API-8               | Architecture test: domain modules import no HTTP framework                                                       | Passes                                                                      |
| API-AC-6  | API-9               | Covered by TEN no_client_authority case                                                                          | See TEN acceptance cases                                                    |
| API-AC-7  | API-10              | Trigger each error class                                                                                         | One envelope shape; documented statuses                                     |
| API-AC-8  | API-11              | Force exceptions in production mode                                                                              | Generic body; request ID present; no stack or secrets                       |
| API-AC-9  | API-12              | Send request; inspect audit and logs                                                                             | Same ID in response, audit, logs                                            |
| API-AC-10 | API-13              | PR removes a response field in place                                                                             | Compatibility check fails                                                   |
| API-AC-11 | API-14, API-15      | Architecture check: each mutating route handler calls exactly one registered command and contains no domain rule | Passes; violations fail                                                     |

## 6. Open Questions

| ID       | Question                                                | Blocks implementation | Affects |
| -------- | ------------------------------------------------------- | --------------------- | ------- |
| OQ-API-1 | **Resolved.** Owner, 2026-10-05: Product operations MUST live under `/api/v1/*`. The exhaustive outside-prefix exceptions are health/readiness and authentication callbacks in the registered API manifest; callbacks remain unmounted until their provider selection and prerequisites pass. No billing, analytics or internal operation is exposed by this registration. See `governance/decision-closure/05-api-boundary-manifest.md`. (Decision-closure r3.1) | No (resolved) | — |
| OQ-API-2 | **Resolved.** Owner, 2026-10-05: API errors MUST use exactly the stable `code`, `message`, `requestId` envelope and status semantics in `api-error-envelope.schema.json` and the registered API manifest. Missing and out-of-scope targets MUST produce identical non-disclosing denials; no target existence or private detail is leaked. See `governance/decision-closure/05-api-boundary-manifest.md`. (Decision-closure r3.1) | No (resolved) | API-10 |
| OQ-API-3 | **Open — residual only.** Which API deprecation sunset periods are approved? Owner, 2026-10-05: Breaking consumer changes MUST use the major-version path `/api/v1` and an explicit deprecation manifest rather than in-place replacement. Sunset periods remain UNKNOWN; no deprecation sunset is authorized until owner selection. See `governance/decision-closure/05-api-boundary-manifest.md`. (Decision-closure r3.1; partial registration) | No | API-13 |

## 7. Verification Status

| Item                         | State                    | Detail                                                                                                                                                                                                                                                |
| ---------------------------- | ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Target codebase | verified (limited scope) | Source-bound predecessor is `peteywee/teach-v2` main `2ad83bfce7d5c460f9f5f383a36491d9188de916`, inspected 2026-10-18. This registration does not establish current implementation or runtime conformance. |
| Legacy repository consulted  | reference only           | `peteywee/teach` `work/TR-0010-production-cutover` at `79fdce5cc3b2` (`main` at `99162f17eace`), read 2026-10-03 for lineage: legacy domain contract JSON files and the Gate A decision record. Legacy code was not inspected and does not govern v2. |
| Implementation conformance | unknown | Not established by this registration. Current implementation tests, independent review and runtime evidence are separate source-bound records. |
| Acceptance cases implemented | unknown | Registration specifies required cases; it does not establish executed test or browser evidence for the current candidate. |
| Blocking open questions      | 0 open | Only unresolved question rows govern blocking; registration is not implementation evidence |
| Owner approval | declared | 1.4.0 bounded kitchen scope recorded in `domains/demo-kitchen/owner-approval.json` under #99; registration establishes neither independent review nor runtime conformance |
| Independent review | not established by registration | No independent-review verdict is issued here. Any later review must bind the actual successor candidate and preserve its limitations. |
| Source of intent             | declared                 | Owner-supplied rebuild proposal (`source/2026-10-03-teach-v2-contract-hierarchy-proposal.md`), consolidated decisions (`source/2026-10-03-teach-rebuild-consolidated-decisions.md`), and legacy Gate A owner decisions (2026-07-22) where cited.      |

## 8. Change Log

| Version | Date | Change | By |
| ------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- |
| 0.1.0   | 2026-10-03 | Initial proposed draft from the owner-supplied hierarchy proposal. Not approved.                                                                                                                | Claude (drafter) |
| 0.2.0   | 2026-10-03 | Retitled Application / Command / API Boundary; added API-14 and API-15 (commands are the boundary; routes do not define semantics) and API-AC-11.                                               | Claude (drafter) |
| 0.3.0   | 2026-10-03 | Retargeted to the Teach v2 codebase: legacy `peteywee/teach` is reference only; anchors and paths no longer point into the legacy repository.                                                   | Claude (drafter) |
| 0.4.0   | 2026-10-03 | Anchored to `peteywee/teach-v2` branch `main` (owner-declared); the repository had no commits when cloned on 2026-10-03, so the anchor SHA stays Not yet verified.                              | Claude (drafter) |
| 1.0.0   | 2026-10-03 | Approved by the owner; status changed from `proposed` to `active`. Open questions remain open and block implementation of the requirements they affect (SYS-34) instead of blocking activation. | Claude (drafter) |
| 1.0.1   | 2026-10-03 | Non-normative document-governance metadata/provenance normalization; 1.0.0 owner approval remained controlling. | ChatGPT (governance) |
| 1.0.2   | 2026-10-03 | Non-normative baseline cleanup: corrected stale current-status provenance after the contract spine was committed; no behavioral requirement changed. | ChatGPT (governance) |
| 1.0.3   | 2026-10-03 | Non-normative truth-state cleanup: verification status now anchors the live v2 repository through governance baseline `292e8da9123987e9d94f09669c7bc6b6d43c4320`; no behavioral requirement changed. | ChatGPT (governance) |
| 1.1.0 | 2026-10-05 | Register OQ-API-1, OQ-API-2, OQ-API-3; preserve named residuals and existing requirement/acceptance IDs. Decision-closure r3.1 manifest sha256:ff7b51df1e3a235e9d226d9d7232f81c64bbeb451b359b6e0f2ea232b6e1757c; SYS-21 #75. | Patrick Craven (owner); ChatGPT (recorder) |
| 1.2.0 | 2026-10-17 | Exact synthetic demo runtime package registration under SYS-21 #82; original incorporated definitions preserved below. | Patrick Craven (owner); ChatGPT (recorder) |
| 1.3.0 | 2026-10-18 | Bounded three-recipe content/read/UI successor under SYS-21 #88; preserve original learning, routes, permissions and activation gates. | Patrick Craven (owner); ChatGPT (recorder) |

## Registered demo runtime amendment (1.2.0)

Exact owner-approved scope: `TEACH-DEMO-RUNTIME-2026-10-17@0.1.0`, SYS-21 [#82](https://github.com/peteywee/teach-v2/issues/82). Approval provenance: `domains/demo-runtime/owner-approval.json`; immutable source: `domains/demo-runtime/proposal-0.1.0/contract-amendments.md`. The addendum below is the approved revision, not an exception inferred by an implementer. It changes only its explicitly named demo behavior; ordinary/customer semantics and unrelated gates remain unchanged. Proposal labels in the immutable package preserve its pre-approval history; this registration supplies current authority. Physical schema admission, runtime activation and shared deployment remain separate.

Register exactly the proposed methods/paths/request+response schemas and owner queries in transport-and-queries.json. Existing routes stay unchanged except the explicit learner scope correction and reconciled Publish routing label. Only implemented/admitted operations may mount; unknown routes/capabilities fail startup/CI and deny before handlers. The synthetic entry is not the old v1 demo-login endpoint. Explicitly reconcile the API manifest's stale core-only content_version_pattern to already-selected strict SemVer2.0 including prerelease/build metadata, as specified in transport-and-queries.json; path encoding never normalizes exact version identity.

Every unsafe demo route requires byte-exact allowed Origin and application/json; safe requests do not allocate or reset. Protected response caching is no-store. All success/failure/denial responses use the approved envelope rules; existing rate/capacity codes, exact fixed messages and status mapping are preserved from the baseline error schema. UI must distinguish loading/empty/denied/invalid/offline/failed/unsaved/recorded states, use actual persisted results and clear protected data on session/run changes. Reset's two-step semantics must be visible on partial failure. Require keyboard, WCAG2.2AA, 44px targets, reduced motion and actual mobile/desktop browser inspection, not only fixture screenshots.

Exact definitions and field constraints are incorporated from `domains/demo-runtime/proposal-0.1.0/demo-boundary.md`, `domains/demo-runtime/proposal-0.1.0/authority-and-audit.md`, `domains/demo-runtime/proposal-0.1.0/learning-definition.md`, `domains/demo-runtime/proposal-0.1.0/learning-definition.json`, and `domains/demo-runtime/proposal-0.1.0/transport-and-queries.json` with its referenced schemas. No definition beyond that approved package is introduced.


## Registered bounded recipe successor (1.3.0)

Exact owner-approved scope: `TEACH-DEMO-RECIPES-2026-10-18@0.1.1`, SYS-21 [#88](https://github.com/peteywee/teach-v2/issues/88). Approval provenance: `domains/demo-recipes/owner-approval.json`; exact source schemas and template: `domains/demo-recipes/proposal-0.1.1/`. This bounded successor overrides only the content/read/UI additions stated below. All original package definitions, authority, admission and activation gates otherwise remain controlling. The original package and its registration remain immutable. Registration proves neither independent review nor runtime behavior and authorizes no hosting, spending or live-database changes.

The existing `ReadAssignedContentVersion` response additionally admits exact PublicContent schema `1.1.0` in `public-content-schema-1.1.0.json`; exact `1.0.0` remains valid. The version discriminator admits these two exact schema versions only, not an open SemVer range. The 1.1.0 projection includes the immutable recipe child values but excludes authored expected answers and private feedback. Existing exact pack ID, organization ID, version and digest checks remain controlling. No new route, operation, owner query, capability or error envelope is registered. The original fifteen API methods/paths and seven served asset paths remain unchanged.

Only the current learner's own assigned exact content version is readable. Foreign-organization/foreign-pack access, malformed payloads, manager access without the existing learner content-read capability and revoked sessions fail closed. Recipe search and station filtering are local read-only presentation operations, not APIs or writes. Preserve API-AC-1 through API-AC-11 and require negative coverage for both schema versions, scope mismatch and malformed or stale exact-version reads. Registration is not a runtime authorization or verification claim.


## Registered bounded kitchen successor (1.4.0)

Current bounded amendment: `TEACH-DEMO-KITCHEN-2026-10-26@0.1.0`; approval `domains/demo-kitchen/owner-approval.json`; source package `domains/demo-kitchen/proposal-0.1.0/`. Earlier incorporated packages are preserved; only the exact additions below supersede their earlier content/read/UI limits. Source registration is not independent verification or execution evidence.

The existing authorized `ReadAssignedContentVersion` GET may additionally return exact PublicContent `1.2.0` from an active own assignment bound to the same organization, content pack, immutable version and digest. The projection includes only validated fictional catalog fields and teaching blocks without hidden expected answers or feedback. Managers gain no content-read capability. All fifteen operations, paths, methods, authentication, Host/Origin checks, scoped authorization, error contracts and seven static asset paths remain unchanged. No inventory, station or staffing mutation endpoint is added.

### Successor change log

| Version | Date | Change | By |
| --- | --- | --- | --- |
| 1.4.0 | 2026-10-26 | Bounded fictional stations, people, recipe/tool references and sample holdings; no new entities, permissions or learning semantics. | Patrick Craven (scope owner); ChatGPT (recorder) |
