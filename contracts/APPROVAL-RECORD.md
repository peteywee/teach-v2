<!--tos-doc
{
  "doc_id": "TEACH-CON-APPROVALS",
  "class": "approval-record",
  "version": "0.10.3",
  "claims_truth_state": "declared",
  "status": "active",
  "owner": "Patrick Craven, Top Shelf Service LLC",
  "created_on": "2026-10-03",
  "updated_on": "2026-10-04",
  "effective_on": "2026-10-03",
  "baseline": {
    "repo": "peteywee/teach-v2",
    "ref": "main",
    "commit": "2c9b1c849a520ba817efc91150be9a37797f4238",
    "purpose": "contract-spine approval baseline"
  },
  "depends_on": [
    "contracts/"
  ]
}
-->

# Teach v2 System Contracts — Owner Approval Record

- Owner: Patrick Craven, Top Shelf Service LLC
- Created: 2026-10-03
- Last updated: 2026-10-04
- Contract package version: `0.10.3`

This file is the only place approval of a C-series contract is recorded (SYS-17).

The 2026-10-03 approvals in Part 2 and the status changes in Part 3 were given by the owner as an
instruction in chat ("I don't want it to say proposed because I need these to be actually
infrastructure") and transcribed by Claude at the owner's direction. They are the owner's decision,
not Claude's (SYS-18). The owner's initial contract-spine commit to `peteywee/teach-v2` is `2c9b1c849a520ba817efc91150be9a37797f4238`. Part 3 records that approval baseline. Later non-normative PATCH revisions inherit the approved normative version unless the revision changes behavior.

## Part 1 — Open question decisions

28 questions that block implementation (SYS-34). The contracts were activated with these open.
Record each decision in plain words; it then gets written into the contract through the revision
procedure (SYS-21).

| Contract | OQ         | Question                                                                                                                                                                                                                      | Decision | Date | Owner |
| -------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ---- | ----- |
| C01      | OQ-SEM-1   | Where does the semantic registry live (the decisions suggest a `kernel/` tree with manifest, entities, values, relationships, states, capabilities, commands, events, evidence) and in what machine-readable format?          | `kernel/`; canonical JSON; JSON Schema + dependency-free validator; generated Markdown permitted | 2026-10-03 | Patrick Craven |
| C01      | OQ-SEM-2   | The decisions give IdentityStatus as ACTIVE, INACTIVE, DELETED, and also require `offboarded` to stay distinct. Is offboarded an IdentityStatus value, or the `IdentityOffboarded` event whose result is INACTIVE or DELETED? | OFFBOARDED is not IdentityStatus; IdentityOffboarded is lifecycle event; IdentityStatus remains ACTIVE/INACTIVE/DELETED | 2026-10-03 | Patrick Craven |
| C01      | OQ-SEM-3   | Capability identifiers appear in both the kernel concept list and C14's vocabulary. Does C01 own capability identifiers while C14 owns what they authorize, or does C14 own capabilities entirely?                            | C01 owns capability identifiers/names; C14 owns authorization meaning, assignment, scope, evaluation, denial | 2026-10-03 | Patrick Craven |
| C11      | OQ-IDN-1   | Which password hashing algorithm and parameters are approved?                                                                                                                                                                 |          |      |       |
| C11      | OQ-IDN-2   | What are the lifetimes of invitation, frontline setup, and password-reset tokens?                                                                                                                                             |          |      |       |
| C11      | OQ-IDN-3   | Which sessions does a credential change revoke: all sessions, all other sessions, or another policy?                                                                                                                          |          |      |       |
| C11      | OQ-IDN-4   | What is the OAuth linking rule: verified-email match, explicit user-initiated linking only, or another rule?                                                                                                                  |          |      |       |
| C11      | OQ-IDN-5   | For an offboarded identity's email, is a new invitation a controlled reactivation or a controlled rejection? (Required decision carried from Gate A.)                                                                         |          |      |       |
| C12      | OQ-SES-1   | Which `SameSite` value is approved: `Strict` or `Lax`?                                                                                                                                                                        |          |      |       |
| C12      | OQ-SES-2   | Which cookie domain and path are approved given the web and API hostnames?                                                                                                                                                    |          |      |       |
| C12      | OQ-SES-3   | Which hash or verifier construction is approved for session credentials at rest?                                                                                                                                              |          |      |       |
| C12      | OQ-SES-4   | What are the absolute and idle session lifetimes?                                                                                                                                                                             |          |      |       |
| C12      | OQ-SES-5   | Is `SameSite` alone the approved CSRF control, or is an additional mechanism (token, origin check) required?                                                                                                                  |          |      |       |
| C12      | OQ-SES-6   | On which events must the session credential rotate (sign-in, privilege change, other)?                                                                                                                                        |          |      |       |
| C13      | OQ-TEN-1   | Does v2 start with the Gate A single-location compatibility membership or a normalized multi-organization, multi-location membership model?                                                                                   |          |      |       |
| C13      | OQ-TEN-2   | How does a request select its scope when an identity holds more than one membership (explicit path segment, header validated against membership, other)?                                                                      |          |      |       |
| C14      | OQ-AUTHZ-1 | Is the Gate A capability vocabulary and bundle table (accepted 2026-07-22) adopted verbatim for v2, amended, or replaced?                                                                                                     |          |      |       |
| C15      | OQ-PRIV-1  | What exactly do deleted, anonymized, retained, and offboarded mean in Teach?                                                                                                                                                  |          |      |       |
| C15      | OQ-PRIV-2  | What retention periods apply to each record class?                                                                                                                                                                            |          |      |       |
| C15      | OQ-PRIV-3  | Which record classes are exempt from deletion, and on what legal or audit basis?                                                                                                                                              |          |      |       |
| C21      | OQ-MIG-1   | What backup mechanism and cadence are approved for production?                                                                                                                                                                |          |      |       |
| C21      | OQ-MIG-2   | Where is restore proof performed (disposable environment, staging), and how recent must it be?                                                                                                                                |          |      |       |
| C22      | OQ-TXN-1   | Are idempotency keys client-supplied (header), server-derived, or both, and how long are they retained?                                                                                                                       |          |      |       |
| C23      | OQ-AUD-1   | How long are audit records retained, and is retention per tenant configurable?                                                                                                                                                |          |      |       |
| C32      | OQ-LRN-1   | What is the learning-session state machine (states and allowed transitions)?                                                                                                                                                  |          |      |       |
| C33      | OQ-MGR-1   | Is manager visibility limited to direct reports, the whole location, or configurable?                                                                                                                                         |          |      |       |
| C34      | OQ-CERT-1  | Is credential verification public (anyone with the link) or private (authenticated, scoped)? (Deferred by Gate A.)                                                                                                            |          |      |       |
| C34      | OQ-CERT-2  | Who approves certification criteria versions, and where is approval recorded?                                                                                                                                                 |          |      |       |
| C41      | OQ-API-1   | Which routes are boundary exceptions outside `/api/v1`?                                                                                                                                                                       |          |      |       |
| C42      | OQ-WEB-1   | Which accessibility standard and level is approved (for example WCAG 2.2 AA)?                                                                                                                                                 |          |      |       |
| C52      | OQ-REL-2   | How is configuration identity computed and recorded without exposing secret values?                                                                                                                                           |          |      |       |

## Part 2 — Contract approvals

Decision is one of: `Approve`, `Approve with amendments` (list them), or `Reject` (give reason).

| Contract                                      | Version | Open questions blocking implementation | Decision | Amendments / reason                                            | Date       | Owner                                                    |
| --------------------------------------------- | ------- | -------------------------------------- | -------- | -------------------------------------------------------------- | ---------- | -------------------------------------------------------- |
| C00 System Authority                          | 1.0.0   | 0                                      | Approve  | Activated with open questions blocking implementation (SYS-34) | 2026-10-03 | Patrick Craven (chat instruction; transcribed by Claude) |
| C01 Canonical Semantics                       | 1.0.0   | 3                                      | Approve  | Activated with open questions blocking implementation (SYS-34) | 2026-10-03 | Patrick Craven (chat instruction; transcribed by Claude) |
| C01 Canonical Semantics                        | 1.1.0   | 0                                      | Approve  | Resolves OQ-SEM-1/2/3 and authorizes K00 bootstrap; GitHub issue #1 | 2026-10-03 | Patrick Craven (explicit K00 bootstrap approval) |
| C02 Automation & Agent Authority              | 1.0.0   | 0                                      | Approve  | Activated with open questions blocking implementation (SYS-34) | 2026-10-03 | Patrick Craven (chat instruction; transcribed by Claude) |
| C11 Identity & Credentials                    | 1.0.0   | 5                                      | Approve  | Activated with open questions blocking implementation (SYS-34) | 2026-10-03 | Patrick Craven (chat instruction; transcribed by Claude) |
| C12 Application Sessions                      | 1.0.0   | 6                                      | Approve  | Activated with open questions blocking implementation (SYS-34) | 2026-10-03 | Patrick Craven (chat instruction; transcribed by Claude) |
| C13 Tenancy & Membership                      | 1.0.0   | 2                                      | Approve  | Activated with open questions blocking implementation (SYS-34) | 2026-10-03 | Patrick Craven (chat instruction; transcribed by Claude) |
| C14 Authorization & Capabilities              | 1.0.0   | 1                                      | Approve  | Activated with open questions blocking implementation (SYS-34) | 2026-10-03 | Patrick Craven (chat instruction; transcribed by Claude) |
| C15 Data Isolation & Privacy                  | 1.0.0   | 3                                      | Approve  | Activated with open questions blocking implementation (SYS-34) | 2026-10-03 | Patrick Craven (chat instruction; transcribed by Claude) |
| C21 Database & Migration                      | 1.0.0   | 2                                      | Approve  | Activated with open questions blocking implementation (SYS-34) | 2026-10-03 | Patrick Craven (chat instruction; transcribed by Claude) |
| C22 Transaction, Idempotency & Reconciliation | 1.0.0   | 1                                      | Approve  | Activated with open questions blocking implementation (SYS-34) | 2026-10-03 | Patrick Craven (chat instruction; transcribed by Claude) |
| C23 Audit & Lifecycle Events                  | 1.0.0   | 1                                      | Approve  | Activated with open questions blocking implementation (SYS-34) | 2026-10-03 | Patrick Craven (chat instruction; transcribed by Claude) |
| C31 Content & Teaching Engine                 | 1.0.0   | 0                                      | Approve  | Activated with open questions blocking implementation (SYS-34) | 2026-10-03 | Patrick Craven (chat instruction; transcribed by Claude) |
| C32 Learning Sessions & Progress              | 1.0.0   | 1                                      | Approve  | Activated with open questions blocking implementation (SYS-34) | 2026-10-03 | Patrick Craven (chat instruction; transcribed by Claude) |
| C33 Manager Operations                        | 1.0.0   | 1                                      | Approve  | Activated with open questions blocking implementation (SYS-34) | 2026-10-03 | Patrick Craven (chat instruction; transcribed by Claude) |
| C34 Certification & Credentials               | 1.0.0   | 2                                      | Approve  | Activated with open questions blocking implementation (SYS-34) | 2026-10-03 | Patrick Craven (chat instruction; transcribed by Claude) |
| C41 Application / Command / API Boundary      | 1.0.0   | 1                                      | Approve  | Activated with open questions blocking implementation (SYS-34) | 2026-10-03 | Patrick Craven (chat instruction; transcribed by Claude) |
| C42 Web Client Boundary                       | 1.0.0   | 1                                      | Approve  | Activated with open questions blocking implementation (SYS-34) | 2026-10-03 | Patrick Craven (chat instruction; transcribed by Claude) |
| C51 Verification & Evidence                   | 1.0.0   | 0                                      | Approve  | Activated with open questions blocking implementation (SYS-34) | 2026-10-03 | Patrick Craven (chat instruction; transcribed by Claude) |
| C52 Deployment, Release & Recovery            | 1.0.0   | 1                                      | Approve  | Activated with open questions blocking implementation (SYS-34) | 2026-10-03 | Patrick Craven (chat instruction; transcribed by Claude) |
| C53 Observability                             | 1.0.0   | 0                                      | Approve  | Activated with open questions blocking implementation (SYS-34) | 2026-10-03 | Patrick Craven (chat instruction; transcribed by Claude) |
| C61 Analytics                                 | 1.0.0   | 0                                      | Approve  | Activated with open questions blocking implementation (SYS-34) | 2026-10-03 | Patrick Craven (chat instruction; transcribed by Claude) |
| C62 PWA / Offline                             | 1.0.0   | 0                                      | Approve  | Activated with open questions blocking implementation (SYS-34) | 2026-10-03 | Patrick Craven (chat instruction; transcribed by Claude) |
| C63 Self-Service Billing                      | 1.0.0   | 0                                      | Approve  | Activated with open questions blocking implementation (SYS-34) | 2026-10-03 | Patrick Craven (chat instruction; transcribed by Claude) |

## Part 3 — Status changes

Record each change of a contract's `Status` field after approval.

| Contract | From       | To       | Version | Date       | Commit SHA                                    | Owner          |
| -------- | ---------- | -------- | ------- | ---------- | --------------------------------------------- | -------------- |
| C00      | `proposed` | `active` | 1.0.0   | 2026-10-03 | 2c9b1c849a520ba817efc91150be9a37797f4238 | Patrick Craven |
| C01      | `proposed` | `active` | 1.0.0   | 2026-10-03 | 2c9b1c849a520ba817efc91150be9a37797f4238 | Patrick Craven |
| C02      | `proposed` | `active` | 1.0.0   | 2026-10-03 | 2c9b1c849a520ba817efc91150be9a37797f4238 | Patrick Craven |
| C11      | `proposed` | `active` | 1.0.0   | 2026-10-03 | 2c9b1c849a520ba817efc91150be9a37797f4238 | Patrick Craven |
| C12      | `proposed` | `active` | 1.0.0   | 2026-10-03 | 2c9b1c849a520ba817efc91150be9a37797f4238 | Patrick Craven |
| C13      | `proposed` | `active` | 1.0.0   | 2026-10-03 | 2c9b1c849a520ba817efc91150be9a37797f4238 | Patrick Craven |
| C14      | `proposed` | `active` | 1.0.0   | 2026-10-03 | 2c9b1c849a520ba817efc91150be9a37797f4238 | Patrick Craven |
| C15      | `proposed` | `active` | 1.0.0   | 2026-10-03 | 2c9b1c849a520ba817efc91150be9a37797f4238 | Patrick Craven |
| C21      | `proposed` | `active` | 1.0.0   | 2026-10-03 | 2c9b1c849a520ba817efc91150be9a37797f4238 | Patrick Craven |
| C22      | `proposed` | `active` | 1.0.0   | 2026-10-03 | 2c9b1c849a520ba817efc91150be9a37797f4238 | Patrick Craven |
| C23      | `proposed` | `active` | 1.0.0   | 2026-10-03 | 2c9b1c849a520ba817efc91150be9a37797f4238 | Patrick Craven |
| C31      | `proposed` | `active` | 1.0.0   | 2026-10-03 | 2c9b1c849a520ba817efc91150be9a37797f4238 | Patrick Craven |
| C32      | `proposed` | `active` | 1.0.0   | 2026-10-03 | 2c9b1c849a520ba817efc91150be9a37797f4238 | Patrick Craven |
| C33      | `proposed` | `active` | 1.0.0   | 2026-10-03 | 2c9b1c849a520ba817efc91150be9a37797f4238 | Patrick Craven |
| C34      | `proposed` | `active` | 1.0.0   | 2026-10-03 | 2c9b1c849a520ba817efc91150be9a37797f4238 | Patrick Craven |
| C41      | `proposed` | `active` | 1.0.0   | 2026-10-03 | 2c9b1c849a520ba817efc91150be9a37797f4238 | Patrick Craven |
| C42      | `proposed` | `active` | 1.0.0   | 2026-10-03 | 2c9b1c849a520ba817efc91150be9a37797f4238 | Patrick Craven |
| C51      | `proposed` | `active` | 1.0.0   | 2026-10-03 | 2c9b1c849a520ba817efc91150be9a37797f4238 | Patrick Craven |
| C52      | `proposed` | `active` | 1.0.0   | 2026-10-03 | 2c9b1c849a520ba817efc91150be9a37797f4238 | Patrick Craven |
| C53      | `proposed` | `active` | 1.0.0   | 2026-10-03 | 2c9b1c849a520ba817efc91150be9a37797f4238 | Patrick Craven |
| C61      | `proposed` | `active` | 1.0.0   | 2026-10-03 | 2c9b1c849a520ba817efc91150be9a37797f4238 | Patrick Craven |
| C62      | `proposed` | `active` | 1.0.0   | 2026-10-03 | 2c9b1c849a520ba817efc91150be9a37797f4238 | Patrick Craven |
| C63      | `proposed` | `active` | 1.0.0   | 2026-10-03 | 2c9b1c849a520ba817efc91150be9a37797f4238 | Patrick Craven |


## Part 4 — Non-normative revisions

PATCH revisions preserve the controlling owner approval when they do not change normative behavior. The Git commit containing the revision is the durable revision record; it is intentionally not embedded as a self-referential SHA.

| Contract | From | To | Date | Reason |
| --- | --- | --- | --- | --- |
| C00 | 1.0.0 | 1.0.1 | 2026-10-03 | Metadata/provenance normalization; no normative behavior change |
| C01 | 1.0.0 | 1.0.1 | 2026-10-03 | Metadata/provenance normalization; no normative behavior change |
| C02 | 1.0.0 | 1.0.1 | 2026-10-03 | Metadata/provenance normalization; no normative behavior change |
| C11 | 1.0.0 | 1.0.1 | 2026-10-03 | Metadata/provenance normalization; no normative behavior change |
| C12 | 1.0.0 | 1.0.1 | 2026-10-03 | Metadata/provenance normalization; no normative behavior change |
| C13 | 1.0.0 | 1.0.1 | 2026-10-03 | Metadata/provenance normalization; no normative behavior change |
| C14 | 1.0.0 | 1.0.1 | 2026-10-03 | Metadata/provenance normalization; no normative behavior change |
| C15 | 1.0.0 | 1.0.1 | 2026-10-03 | Metadata/provenance normalization; no normative behavior change |
| C21 | 1.0.0 | 1.0.1 | 2026-10-03 | Metadata/provenance normalization; no normative behavior change |
| C22 | 1.0.0 | 1.0.1 | 2026-10-03 | Metadata/provenance normalization; no normative behavior change |
| C23 | 1.0.0 | 1.0.1 | 2026-10-03 | Metadata/provenance normalization; no normative behavior change |
| C31 | 1.0.0 | 1.0.1 | 2026-10-03 | Metadata/provenance normalization; no normative behavior change |
| C32 | 1.0.0 | 1.0.1 | 2026-10-03 | Metadata/provenance normalization; no normative behavior change |
| C33 | 1.0.0 | 1.0.1 | 2026-10-03 | Metadata/provenance normalization; no normative behavior change |
| C34 | 1.0.0 | 1.0.1 | 2026-10-03 | Metadata/provenance normalization; no normative behavior change |
| C41 | 1.0.0 | 1.0.1 | 2026-10-03 | Metadata/provenance normalization; no normative behavior change |
| C42 | 1.0.0 | 1.0.1 | 2026-10-03 | Metadata/provenance normalization; no normative behavior change |
| C51 | 1.0.0 | 1.0.1 | 2026-10-03 | Metadata/provenance normalization; no normative behavior change |
| C52 | 1.0.0 | 1.0.1 | 2026-10-03 | Metadata/provenance normalization; no normative behavior change |
| C53 | 1.0.0 | 1.0.1 | 2026-10-03 | Metadata/provenance normalization; no normative behavior change |
| C61 | 1.0.0 | 1.0.1 | 2026-10-03 | Metadata/provenance normalization; no normative behavior change |
| C62 | 1.0.0 | 1.0.1 | 2026-10-03 | Metadata/provenance normalization; no normative behavior change |
| C63 | 1.0.0 | 1.0.1 | 2026-10-03 | Metadata/provenance normalization; no normative behavior change |
| C00 | 1.0.1 | 1.0.2 | 2026-10-03 | Baseline/status cleanup; no normative behavior change |
| C01 | 1.0.1 | 1.0.2 | 2026-10-03 | Baseline/status cleanup; no normative behavior change |
| C02 | 1.0.1 | 1.0.2 | 2026-10-03 | Baseline/status cleanup; no normative behavior change |
| C11 | 1.0.1 | 1.0.2 | 2026-10-03 | Baseline/status cleanup; no normative behavior change |
| C12 | 1.0.1 | 1.0.2 | 2026-10-03 | Baseline/status cleanup; no normative behavior change |
| C13 | 1.0.1 | 1.0.2 | 2026-10-03 | Baseline/status cleanup; no normative behavior change |
| C14 | 1.0.1 | 1.0.2 | 2026-10-03 | Baseline/status cleanup; no normative behavior change |
| C15 | 1.0.1 | 1.0.2 | 2026-10-03 | Baseline/status cleanup; no normative behavior change |
| C21 | 1.0.1 | 1.0.2 | 2026-10-03 | Baseline/status cleanup; no normative behavior change |
| C22 | 1.0.1 | 1.0.2 | 2026-10-03 | Baseline/status cleanup; no normative behavior change |
| C23 | 1.0.1 | 1.0.2 | 2026-10-03 | Baseline/status cleanup; no normative behavior change |
| C31 | 1.0.1 | 1.0.2 | 2026-10-03 | Baseline/status cleanup; no normative behavior change |
| C32 | 1.0.1 | 1.0.2 | 2026-10-03 | Baseline/status cleanup; no normative behavior change |
| C33 | 1.0.1 | 1.0.2 | 2026-10-03 | Baseline/status cleanup; no normative behavior change |
| C34 | 1.0.1 | 1.0.2 | 2026-10-03 | Baseline/status cleanup; no normative behavior change |
| C41 | 1.0.1 | 1.0.2 | 2026-10-03 | Baseline/status cleanup; no normative behavior change |
| C42 | 1.0.1 | 1.0.2 | 2026-10-03 | Baseline/status cleanup; no normative behavior change |
| C51 | 1.0.1 | 1.0.2 | 2026-10-03 | Baseline/status cleanup; no normative behavior change |
| C52 | 1.0.1 | 1.0.2 | 2026-10-03 | Baseline/status cleanup; no normative behavior change |
| C53 | 1.0.1 | 1.0.2 | 2026-10-03 | Baseline/status cleanup; no normative behavior change |
| C61 | 1.0.1 | 1.0.2 | 2026-10-03 | Baseline/status cleanup; no normative behavior change |
| C62 | 1.0.1 | 1.0.2 | 2026-10-03 | Baseline/status cleanup; no normative behavior change |
| C63 | 1.0.1 | 1.0.2 | 2026-10-03 | Baseline/status cleanup; no normative behavior change |
| 00 | 1.0.2 | 1.0.3 | 2026-10-03 | Truth-state cleanup; no normative behavior change |
| 02 | 1.0.2 | 1.0.3 | 2026-10-03 | Truth-state cleanup; no normative behavior change |
| 11 | 1.0.2 | 1.0.3 | 2026-10-03 | Truth-state cleanup; no normative behavior change |
| 12 | 1.0.2 | 1.0.3 | 2026-10-03 | Truth-state cleanup; no normative behavior change |
| 13 | 1.0.2 | 1.0.3 | 2026-10-03 | Truth-state cleanup; no normative behavior change |
| 14 | 1.0.2 | 1.0.3 | 2026-10-03 | Truth-state cleanup; no normative behavior change |
| 15 | 1.0.2 | 1.0.3 | 2026-10-03 | Truth-state cleanup; no normative behavior change |
| 21 | 1.0.2 | 1.0.3 | 2026-10-03 | Truth-state cleanup; no normative behavior change |
| 22 | 1.0.2 | 1.0.3 | 2026-10-03 | Truth-state cleanup; no normative behavior change |
| 23 | 1.0.2 | 1.0.3 | 2026-10-03 | Truth-state cleanup; no normative behavior change |
| 31 | 1.0.2 | 1.0.3 | 2026-10-03 | Truth-state cleanup; no normative behavior change |
| 32 | 1.0.2 | 1.0.3 | 2026-10-03 | Truth-state cleanup; no normative behavior change |
| 33 | 1.0.2 | 1.0.3 | 2026-10-03 | Truth-state cleanup; no normative behavior change |
| 34 | 1.0.2 | 1.0.3 | 2026-10-03 | Truth-state cleanup; no normative behavior change |
| 41 | 1.0.2 | 1.0.3 | 2026-10-03 | Truth-state cleanup; no normative behavior change |
| 42 | 1.0.2 | 1.0.3 | 2026-10-03 | Truth-state cleanup; no normative behavior change |
| 51 | 1.0.2 | 1.0.3 | 2026-10-03 | Truth-state cleanup; no normative behavior change |
| 52 | 1.0.2 | 1.0.3 | 2026-10-03 | Truth-state cleanup; no normative behavior change |
| 53 | 1.0.2 | 1.0.3 | 2026-10-03 | Truth-state cleanup; no normative behavior change |
| 61 | 1.0.2 | 1.0.3 | 2026-10-03 | Truth-state cleanup; no normative behavior change |
| 62 | 1.0.2 | 1.0.3 | 2026-10-03 | Truth-state cleanup; no normative behavior change |
| 63 | 1.0.2 | 1.0.3 | 2026-10-03 | Truth-state cleanup; no normative behavior change |

## Part 5 — Normative revisions

| Contract | From | To | Date | Approval | GitHub issue | Reason |
| --- | --- | --- | --- | --- | --- | --- |
| C01 | 1.0.2 | 1.1.0 | 2026-10-03 | Patrick Craven (explicit K00 bootstrap approval) | #1 | Resolve OQ-SEM-1/2/3 and establish K00 registry location/format and authority split |

## Part 6 — Domain Ownership approval

| Artifact / Contract | Version | Decision | Date | Owner | GitHub issue |
| --- | --- | --- | --- | --- | --- |
| C01 Canonical Semantics | 1.2.0 | Only owner may approve candidate promotion; active Domain Ownership Map is authoritative | 2026-10-03 | Patrick Craven | #2 |
| C13 Tenancy & Membership | 1.1.0 | Organization owns Entitlement and local entitlement state | 2026-10-03 | Patrick Craven | #2 |
| C14 Authorization & Capabilities | 1.1.0 | Authorization consumes entitlement read-only | 2026-10-03 | Patrick Craven | #2 |
| C63 Self-Service Billing | 1.1.0 | Billing owns provider reconciliation process, not local Entitlement state | 2026-10-03 | Patrick Craven | #2 |
| TEACH-K00 | 0.2.0 | Approve ownership alignment; semantic entries remain candidate | 2026-10-03 | Patrick Craven | #2 |
| TEACH-DOMAIN-OWNERSHIP | 1.0.0 | Approve first active Domain Ownership Map | 2026-10-03 | Patrick Craven | #2 |

### Part 6A — Normative revision ledger

| Contract | From | To | Date | Approval | GitHub issue | Reason |
| --- | --- | --- | --- | --- | --- | --- |
| C01 | 1.1.0 | 1.2.0 | 2026-10-03 | Patrick Craven | #2 | Resolve OQ-SEM-5 and require owner approval for promotion |
| C13 | 1.0.3 | 1.1.0 | 2026-10-03 | Patrick Craven | #2 | Organization owns local Entitlement state |
| C14 | 1.0.3 | 1.1.0 | 2026-10-03 | Patrick Craven | #2 | Authorization consumes but does not own entitlement |
| C63 | 1.0.3 | 1.1.0 | 2026-10-03 | Patrick Craven | #2 | Provider reconciliation crosses Organization command boundary |

## Part 7 — Relationship registration approval

| Artifact | From | To | Decision | Date | Owner | GitHub issue |
| --- | --- | --- | --- | --- | --- | --- |
| TEACH-K00 | 0.2.0 | 0.3.0 | Register all 18 dependency-ready relationship definitions as `candidate`; keep 11 blocked relationships outside K00; no candidate-to-approved promotion | 2026-10-03 | Patrick Craven | #3 |
| TEACH-REL-DISCOVERY | 0.1.0 | 0.2.0 | Record discovery disposition and registration evidence | 2026-10-03 | Patrick Craven | #3 |
| TEACH-DOMAIN-OWNERSHIP | 1.0.0 | 1.0.0 | Extended with owning-domain assignments for the 18 registered relationships, exactly as specified in `domains/relationships/proposed.json`; no existing approved assignment changed | 2026-10-03 | Patrick Craven | #3 |

## Part 8 — State-machine approval

| Artifact / Contract | From | To | Decision | Date | Owner | GitHub issue |
| --- | --- | --- | --- | --- | --- | --- |
| C01 Canonical Semantics | 1.2.0 | 1.3.0 | Resolve OQ-SEM-4; establish canonical state-machine registry requirements | 2026-10-03 | Patrick Craven | #4 |
| C11 Identity & Credentials | 1.0.3 | 1.1.0 | ACTIVE↔INACTIVE bootstrap graph; offboarding results INACTIVE; DELETED terminal with ingress disabled pending C15 | 2026-10-03 | Patrick Craven | #4 |
| C13 Tenancy & Membership | 1.1.0 | 1.2.0 | Membership lifecycle ACTIVE→INACTIVE→REVOKED; REVOKED terminal; DELETED is not MembershipStatus | 2026-10-03 | Patrick Craven | #4 |
| C32 Learning Sessions & Progress | 1.0.3 | 1.1.0 | Resolve OQ-LRN-1 with ACTIVE→COMPLETED; progress events ACTIVE-only; COMPLETED terminal | 2026-10-03 | Patrick Craven | #4 |
| TEACH-K00 | 0.3.0 | 0.4.0 | Register four state machines plus required state/command/event candidates; no semantic promotion | 2026-10-03 | Patrick Craven | #4 |
| TEACH-DOMAIN-OWNERSHIP | 1.0.0 | 1.1.0 | Add ownership for new state, command, event, and state-machine concepts | 2026-10-03 | Patrick Craven | #4 |

## Part 9 — Invariant registration approval

| Artifact / Contract | From | To | Decision | Date | Owner | GitHub issue |
| --- | --- | --- | --- | --- | --- | --- |
| C01 Canonical Semantics | 1.3.0 | 1.4.0 | Establish canonical invariant registry and Governance-domain ownership rule for cross-cutting governance invariants | 2026-10-03 | Patrick Craven | #5 |
| TEACH-K00 | 0.4.0 | 0.5.0 | Register 22 PROVEN invariant candidates; keep 5 blocked invariants outside K00; no semantic promotion | 2026-10-03 | Patrick Craven | #5 |
| TEACH-DOMAIN-OWNERSHIP | 1.1.0 | 1.2.0 | Add Governance semantic domain and invariant ownership assignments | 2026-10-03 | Patrick Craven | #5 |
| TEACH-INVARIANT-DISCOVERY | 0.1.0 | 0.2.0 | Record invariant-discovery disposition and registration evidence | 2026-10-03 | Patrick Craven | #5 |

## Part 10 — Decision-table registration approval

| Artifact / Contract | From | To | Decision | Date | Owner | GitHub issue |
| --- | --- | --- | --- | --- | --- | --- |
| C01 Canonical Semantics | 1.4.0 | 1.5.0 | Establish canonical deterministic decision-table registry with fail-closed defaults | 2026-10-03 | Patrick Craven | #6 |
| TEACH-K00 | 0.5.0 | 0.6.0 | Register 8 ready decision tables as `candidate`; keep 3 blocked tables outside K00; no semantic promotion | 2026-10-03 | Patrick Craven | #6 |
| TEACH-DOMAIN-OWNERSHIP | 1.2.0 | 1.3.0 | Add ownership assignments for registered decision tables | 2026-10-03 | Patrick Craven | #6 |
| TEACH-DECISION-TABLE-DISCOVERY | 0.1.0 | 0.2.0 | Record discovery disposition and registration evidence | 2026-10-03 | Patrick Craven | #6 |

## Part 11 — Command registration approval

| Artifact | From | To | Decision | Date | Owner | GitHub issue |
| --- | --- | --- | --- | --- | --- | --- |
| TEACH-K00 | 0.6.0 | 0.7.0 | Register 7 dependency-ready commands as `candidate`; keep 8 blocked commands outside K00; add no events; no semantic promotion | 2026-10-04 | Patrick Craven | #7 |
| TEACH-DOMAIN-OWNERSHIP | 1.3.0 | 1.4.0 | Add ownership assignments for the seven registered commands | 2026-10-04 | Patrick Craven | #7 |
| TEACH-COMMAND-EVENT-DISCOVERY | 0.1.0 | 0.2.0 | Record command registration disposition; Events admission semantics remain the next gate | 2026-10-04 | Patrick Craven | #7 |

## Part 12 — Event admission approval

| Artifact / Contract | From | To | Decision | Date | Owner | GitHub issue |
| --- | --- | --- | --- | --- | --- | --- |
| C01 Canonical Semantics | 1.5.0 | 1.6.0 | Audit records and state transitions do not implicitly create canonical business events; explicit owning-domain event semantics are required | 2026-10-04 | Patrick Craven | #8 |
| TEACH-K00 | 0.7.0 | 0.8.0 | Record event-admission rule; retain 14 events; admit 0 new events; no semantic promotion | 2026-10-04 | Patrick Craven | #8 |
| TEACH-COMMAND-EVENT-DISCOVERY | 0.2.0 | 0.3.0 | Close Events gate for current baseline; 9 discovered names are not admitted without explicit contract support | 2026-10-04 | Patrick Craven | #8 |

## Part 13 — October 4 governance reconciliation

**Procedural truth state:** the revisions below were already live by direct owner direction before a SYS-21 GitHub issue and superseded-copy preservation were completed. Governance issue #9 records and remediates that process gap. This record does **not** claim the original merge sequence was SYS-21 compliant.

| Artifact / Contract | From | To | Original change | Current owner decision | Remediation issue |
| --- | --- | --- | --- | --- | --- |
| C11 Identity & Credentials | 1.1.0 | 1.2.0 | `058c5be8` — defined IDN-22/IDN-23 canonical lifecycle events | Ratified as current active contract | #9 |
| C13 Tenancy & Membership | 1.2.0 | 1.3.0 | `058c5be8` — defined TEN-19 MembershipRevoked semantics | Ratified as current active contract | #9 |
| C01 Canonical Semantics | 1.6.0 | 1.7.0 | `e4762f0` — synchronized canonical event inventory | Ratified as current active contract | #9 |
| TEACH-K00 | 0.8.0 | 0.9.0 | `881c890` — per-kind command/event schema and first four event promotions | Ratified as current active semantic kernel | #9 |

Prior versions are preserved during this reconciliation from their exact historical Git content. The next semantic change remains subject to the normal pre-change issue and explicit owner-approval path.

## Part 14 — Command semantic promotion

| Artifact | From | To | Decision | Date | Owner | GitHub issue |
| --- | --- | --- | --- | --- | --- | --- |
| TEACH-K00 | 0.9.0 | 0.10.0 | Promote 18 commands with direct owning-contract evidence; keep 4 commands candidate due missing K00 concepts; no event status change | 2026-10-04 | Patrick Craven | #10 |
| TEACH-COMMAND-EVENT-DISCOVERY | 0.3.0 | 0.4.0 | Record promotion evidence and blockers for all 22 registered commands | 2026-10-04 | Patrick Craven | #10 |

The four unpromoted commands are not implementation authority under SEM-2. Their blockers must be resolved by a later semantic change before promotion.

## Part 15 — Dependency concept registration

| Artifact | From | To | Decision | Date | Owner | GitHub issue |
| --- | --- | --- | --- | --- | --- | --- |
| TEACH-K00 | 0.10.0 | 0.11.0 | Register 4 missing dependency entities + 4 canonical IDs as `candidate`; promote no command/event | 2026-10-04 | Patrick Craven | #11 |
| TEACH-DOMAIN-OWNERSHIP | 1.4.0 | 1.5.0 | Approve ownership assignments for the 8 newly registered concepts | 2026-10-04 | Patrick Craven | #11 |
| TEACH-COMMAND-EVENT-DISCOVERY | 0.4.0 | 0.5.0 | Replace missing-K00 blockers with candidate/lifecycle blockers for the four remaining commands | 2026-10-04 | Patrick Craven | #11 |
