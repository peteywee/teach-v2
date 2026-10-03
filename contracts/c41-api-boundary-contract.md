<!--tos-doc
{
  "doc_id": "TEACH-CON-C41",
  "class": "contract",
  "version": "1.0.1",
  "claims_truth_state": "declared",
  "status": "active",
  "owner": "Patrick Craven, Top Shelf Service LLC",
  "created_on": "2026-10-03",
  "updated_on": "2026-10-03",
  "effective_on": "2026-10-03",
  "approval": {
    "state": "approved",
    "approved_version": "1.0.0",
    "approved_on": "2026-10-03",
    "record": "contracts/APPROVAL-RECORD.md",
    "inheritance": "1.0.1 is a non-normative metadata/governance patch; 1.0.0 owner approval remains controlling"
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
  "supersedes": [],
  "superseded_by": null,
  "depends_on": [
    "contracts/"
  ]
}
-->

# C41 — Application / Command / API Boundary Contract

| Field              | Value                                                                                                                                                           |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Contract ID        | C41                                                                                                                                                             |
| Group              | C40 Application Boundaries                                                                                                                                      |
| Governed by        | C00 System Authority                                                                                                                                            |
| Version            | 1.0.1                                                                                                                                                           |
| Status             | `active`                                                                                                                                                        |
| Owner              | Patrick Craven, Top Shelf Service LLC                                                                                                                           |
| Approved by        | Patrick Craven (owner), 2026-10-03 — approval instruction given in chat at 10:47 CDT; transcribed by Claude at the owner's direction — see `APPROVAL-RECORD.md` |
| Requirement prefix | `API`                                                                                                                                                           |
| Activation         | Required for the core rebuild                                                                                                                                   |
| Legacy lineage     | New. Carries forward the legacy Gate A rule that route/OpenAPI drift fails CI.                                                                                  |
| Supersedes         | None                                                                                                                                                            |
| Superseded by      | None                                                                                                                                                            |
| Created            | 2026-10-03                                                                                                                                                      |
| Last updated       | 2026-10-03                                                                                                                                                      |

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
- **API-10** — API errors MUST use one stable error shape and stable status semantics (see OQ-API-2; value Not yet verified).
- **API-11** — Production error responses MUST NOT expose stack traces, SQL, internal identifiers of other tenants, or secrets.
- **API-12** — Every request ID MUST propagate into audit records and observability output.
- **API-13** — A breaking change to an API consumer contract MUST be delivered behind explicit version handling, not in place (see OQ-API-3; value Not yet verified).
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
| OQ-API-1 | Which routes are boundary exceptions outside `/api/v1`? | Yes                   | —       |
| OQ-API-2 | What is the error envelope shape?                       | No                    | API-10  |
| OQ-API-3 | What is the API versioning and deprecation policy?      | No                    | API-13  |

## 7. Verification Status

| Item                         | State                    | Detail                                                                                                                                                                                                                                                |
| ---------------------------- | ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Target codebase              | verified (limited scope) | `peteywee/teach-v2`, default branch `main` (owner-declared). Cloned 2026-10-03: repository exists and has no commits, so no SHA is anchored. Teach v2 is a new build on these contracts (owner statement, 2026-10-03).                                |
| Legacy repository consulted  | reference only           | `peteywee/teach` `work/TR-0010-production-cutover` at `79fdce5cc3b2` (`main` at `99162f17eace`), read 2026-10-03 for lineage: legacy domain contract JSON files and the Gate A decision record. Legacy code was not inspected and does not govern v2. |
| Implementation conformance   | unknown                  | Not yet verified. No v2 implementation was inspected; the owner states v2 is yet to be built.                                                                                                                                                         |
| Acceptance cases implemented | unknown                  | Not yet verified. No mapping between repository tests and these IDs has been established.                                                                                                                                                             |
| Blocking open questions      | 1 open                   | Contract is `active` with these open. Each blocks implementation of the requirements it affects beyond fail-closed behavior until decided (SYS-34).                                                                                                   |
| Owner approval               | declared                 | Approved by the owner on 2026-10-03 (chat instruction); recorded in `APPROVAL-RECORD.md`. Not yet committed to `peteywee/teach-v2`: no commit was visible on `main` when checked.                                                                     |
| Independent review           | not performed            | Drafted and self-checked by Claude against the contract-authoring checklist only.                                                                                                                                                                     |
| Source of intent             | declared                 | Owner-supplied rebuild proposal (`source/2026-10-03-teach-v2-contract-hierarchy-proposal.md`), consolidated decisions (`source/2026-10-03-teach-rebuild-consolidated-decisions.md`), and legacy Gate A owner decisions (2026-07-22) where cited.      |

## 8. Change Log

| Version | Date       | Change                                                                                                                                                                                          | By               |
| ------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- |
| 0.1.0   | 2026-10-03 | Initial proposed draft from the owner-supplied hierarchy proposal. Not approved.                                                                                                                | Claude (drafter) |
| 0.2.0   | 2026-10-03 | Retitled Application / Command / API Boundary; added API-14 and API-15 (commands are the boundary; routes do not define semantics) and API-AC-11.                                               | Claude (drafter) |
| 0.3.0   | 2026-10-03 | Retargeted to the Teach v2 codebase: legacy `peteywee/teach` is reference only; anchors and paths no longer point into the legacy repository.                                                   | Claude (drafter) |
| 0.4.0   | 2026-10-03 | Anchored to `peteywee/teach-v2` branch `main` (owner-declared); the repository had no commits when cloned on 2026-10-03, so the anchor SHA stays Not yet verified.                              | Claude (drafter) |
| 1.0.0   | 2026-10-03 | Approved by the owner; status changed from `proposed` to `active`. Open questions remain open and block implementation of the requirements they affect (SYS-34) instead of blocking activation. | Claude (drafter) |
