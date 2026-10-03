<!--tos-doc
{
  "doc_id": "TEACH-GOV-DOCS",
  "class": "governance-policy",
  "version": "1.0.1",
  "claims_truth_state": "declared",
  "status": "active",
  "owner": "Patrick Craven, Top Shelf Service LLC",
  "created_on": "2026-10-03",
  "updated_on": "2026-10-03",
  "effective_on": "2026-10-03",
  "baseline": {
    "repo": "peteywee/teach-v2",
    "ref": "main",
    "commit": "2c9b1c849a520ba817efc91150be9a37797f4238",
    "purpose": "contract-spine approval baseline"
  },
  "governed_by": ["TEACH-CON-C00"]
}
-->

# Teach v2 Document Governance

## 1. Scope

This policy governs durable knowledge artifacts in Teach v2: contracts, contract indexes, approval records, semantic-kernel documents, architecture decisions, specifications, decision tables, runbooks, evidence summaries, and retained source records. Executable source code and ordinary configuration files are versioned by Git and their package/release mechanism unless a governing contract explicitly requires document metadata.

## 2. Required metadata

Every governed document MUST have one machine-readable `tos-doc` block containing at least:

- `doc_id`
- `class`
- `version`
- `status`
- `owner`
- `created_on`
- `updated_on`

Active normative documents MUST also record their effective/approval state and provenance or baseline as applicable.

`doc_id` is permanent for the life of the document. A revision changes `version`, not `doc_id`.

## 3. Dates

Dates use ISO `YYYY-MM-DD`.

- `created_on`: date the document identity was first created. It MUST NOT change on revision.
- `updated_on`: date of the current document revision.
- `approved_on`: date the owner approved the controlling normative version.
- `effective_on`: date the version became governing.
- `superseded_on`: date a superseded version stopped governing, when applicable.

A superseded copy of an existing document preserves the same `doc_id` and its historical `version`; uniqueness is enforced on the `(doc_id, version)` pair, and at most one `active` version of a `doc_id` may exist.

## 4. Versioning

Governed normative documents use semantic versioning `MAJOR.MINOR.PATCH`.

- PATCH: no normative behavior change; metadata, provenance, links, formatting, spelling, or clarification that preserves meaning.
- MINOR: additive normative behavior that preserves existing valid semantics.
- MAJOR: breaking semantic change, removal, weakening, ownership/authority change, or redefinition of existing behavior.

A changed governed document MUST increment its version. The validator enforces that the version increases; semantic review determines whether the selected increment is sufficient.

A non-normative PATCH may inherit the approval of the immediately preceding normative version when the approval record explicitly states that no normative behavior changed. MINOR and MAJOR normative revisions require owner approval before becoming `active`.

## 5. Lifecycle states

Normative documents use:

- `draft`
- `proposed`
- `active`
- `superseded`
- `retired`

Retained historical/source records may use `recorded`. A `source-record` is historical evidence and MUST NOT be silently rewritten to change its substantive meaning; a correction should create a new source record or an explicitly documented corrective revision.

## 6. Baselines and commit identity

A document MUST NOT attempt to embed the SHA of the commit that contains itself as a current-head assertion.

`baseline.commit` identifies a known repository state against which the document was established, approved, or evaluated. The Git commit containing a later revision is the durable revision record and is obtained from Git history.

The initial Teach v2 contract-spine approval baseline is:

`2c9b1c849a520ba817efc91150be9a37797f4238`

## 7. Approval

`contracts/APPROVAL-RECORD.md` is the approval ledger for C-series contracts.

An active contract MUST identify its approval record. PATCH-only non-normative revisions MUST record the controlling approved version and the reason approval remains inherited. A normative MINOR or MAJOR revision MUST be added to the approval ledger before activation.

## 8. Validation

`scripts/docs/validate-document-metadata.mjs` is the deterministic metadata validator.

CI MUST fail for at least:

- missing or malformed `tos-doc` metadata
- duplicate `(doc_id, version)` records or more than one active version of a `doc_id`
- invalid semantic version
- invalid lifecycle status
- invalid ISO date
- `created_on` later than `updated_on`
- changed governed Markdown without a version increase
- changed governed Markdown without a changed `updated_on`
- active contract missing approval metadata
- contract visible version disagreeing with machine metadata

Semantic review remains responsible for determining whether a MINOR or MAJOR change has been incorrectly labeled as PATCH.

## 9. Single source of truth

The `tos-doc` block is the machine-readable metadata authority. Visible tables and generated indexes MUST agree with it. Future tooling SHOULD generate duplicate human-facing metadata and contract indexes from the machine source rather than requiring manual synchronization.

## 10. Change Log

| Version | Date | Change |
| --- | --- | --- |
| 1.0.0 | 2026-10-03 | Initial active document-governance baseline. |
| 1.0.1 | 2026-10-03 | Clarified versioned superseded-copy identity and included semantic-kernel documents in enforced governance. |
