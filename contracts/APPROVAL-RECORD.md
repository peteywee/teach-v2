<!--tos-doc
{
  "doc_id": "TEACH-CON-APPROVALS",
  "class": "approval-record",
  "version": "0.16.0",
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
- Last updated: 2026-10-05
- Contract package version: `0.16.0`

This file is the only place approval of a C-series contract is recorded (SYS-17).

The 2026-10-03 approvals in Part 2 and the status changes in Part 3 were given by the owner as an
instruction in chat ("I don't want it to say proposed because I need these to be actually
infrastructure") and transcribed by Claude at the owner's direction. They are the owner's decision,
not Claude's (SYS-18). The owner's initial contract-spine commit to `peteywee/teach-v2` is `2c9b1c849a520ba817efc91150be9a37797f4238`. Part 3 records that approval baseline. Later non-normative PATCH revisions inherit the approved normative version unless the revision changes behavior.

## Part 1 — Open question decisions

Open-question decisions are recorded here under SYS-34. The contracts were activated with blocking questions still open; each resolved value is written into its governing contract through SYS-21. Blank Decision cells remain unresolved.

| Contract | OQ         | Question                                                                                                                                                                                                                      | Decision | Date | Owner |
| -------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ---- | ----- |
| C01      | OQ-SEM-1   | Where does the semantic registry live (the decisions suggest a `kernel/` tree with manifest, entities, values, relationships, states, capabilities, commands, events, evidence) and in what machine-readable format?          | `kernel/`; canonical JSON; JSON Schema + dependency-free validator; generated Markdown permitted | 2026-10-03 | Patrick Craven |
| C01      | OQ-SEM-2   | The decisions give IdentityStatus as ACTIVE, INACTIVE, DELETED, and also require `offboarded` to stay distinct. Is offboarded an IdentityStatus value, or the `IdentityOffboarded` event whose result is INACTIVE or DELETED? | OFFBOARDED is not IdentityStatus; IdentityOffboarded is lifecycle event; IdentityStatus remains ACTIVE/INACTIVE/DELETED | 2026-10-03 | Patrick Craven |
| C01      | OQ-SEM-3   | Capability identifiers appear in both the kernel concept list and C14's vocabulary. Does C01 own capability identifiers while C14 owns what they authorize, or does C14 own capabilities entirely?                            | C01 owns capability identifiers/names; C14 owns authorization meaning, assignment, scope, evaluation, denial | 2026-10-03 | Patrick Craven |
| C11      | OQ-IDN-1   | Which password hashing algorithm and parameters are approved?                                                                                                                                                                 |          |      |       |
| C11      | OQ-IDN-2   | What are the lifetimes of invitation, frontline setup, and password-reset tokens?                                                                                                                                             | Invitation 7 days; SetupToken 15 minutes; PasswordResetToken 1 hour | 2026-10-04 | Patrick Craven |
| C11      | OQ-IDN-3   | Which sessions does a credential change revoke: all sessions, all other sessions, or another policy?                                                                                                                          |          |      |       |
| C11      | OQ-IDN-4   | What is the OAuth linking rule: verified-email match, explicit user-initiated linking only, or another rule?                                                                                                                  |          |      |       |
| C11      | OQ-IDN-5   | For an offboarded identity's email, is a new invitation a controlled reactivation or a controlled rejection? (Required decision carried from Gate A.)                                                                         | Controlled rejection until explicit ReactivateIdentity; no Invitation or token created before reactivation | 2026-10-04 | Patrick Craven |
| C12      | OQ-SES-1   | Which `SameSite` value is approved: `Strict` or `Lax`?                                                                                                                                                                        |          |      |       |
| C12      | OQ-SES-2   | Which cookie domain and path are approved given the web and API hostnames?                                                                                                                                                    |          |      |       |
| C12      | OQ-SES-3   | Which hash or verifier construction is approved for session credentials at rest?                                                                                                                                              | `SESSION_VERIFIER_V1_SHA256_256BIT`: exactly 32 CSPRNG bytes, unpadded base64url credential, stored v1 verifier = SHA-256(`teach-session-v1\\0` || rawCredentialBytes), no per-session salt, stored verifier never authenticates | 2026-10-04 | Patrick Craven |
| C12      | OQ-SES-4   | What are the absolute and idle session lifetimes?                                                                                                                                                                             | `ABSOLUTE_12H_IDLE_30M`: 12-hour immutable absolute lifetime; 30-minute authoritative server-side idle lifetime; expiry denies authentication even if lazy EXPIRED persistence fails | 2026-10-04 | Patrick Craven |
| C12      | OQ-SES-5   | Is `SameSite` alone the approved CSRF control, or is an additional mechanism (token, origin check) required?                                                                                                                  |          |      |       |
| C12      | OQ-SES-6   | On which events must the session credential rotate (sign-in, privilege change, other)?                                                                                                                                        |          |      |       |
| C13      | OQ-TEN-1   | Does v2 start with the Gate A single-location compatibility membership or a normalized multi-organization, multi-location membership model?                                                                                   |          |      |       |
| C13      | OQ-TEN-2   | How does a request select its scope when an identity holds more than one membership (explicit path segment, header validated against membership, other)?                                                                      |          |      |       |
| C14      | OQ-AUTHZ-1 | Is the Gate A capability vocabulary and bundle table (accepted 2026-07-22) adopted verbatim for v2, amended, or replaced?                                                                                                     |          |      |       |
| C15      | OQ-PRIV-1  | What exactly do deleted, anonymized, retained, and offboarded mean in Teach?                                                                                                                                                  |          |      |       |
| C15      | OQ-PRIV-2  | What retention periods apply to each record class?                                                                                                                                                                            |          |      |       |
| C15      | OQ-PRIV-3  | Which record classes are exempt from deletion, and on what legal or audit basis?                                                                                                                                              |          |      |       |
| C21      | OQ-MIG-1   | What backup mechanism and cadence are approved for production?                                                                                                                                                                | `MIGRATION_SCOPED_PLATFORM_NATIVE_BACKUP`: platform-native transactionally consistent backup/snapshot/PITR; automated at least daily for non-reconstructable production data; fresh named restorable point after candidate freeze and before each schema/data migration | 2026-10-04 | Patrick Craven |
| C21      | OQ-MIG-2   | Where is restore proof performed (disposable environment, staging), and how recent must it be?                                                                                                                                | `ISOLATED_RESTORE_MAX_30D`: disposable isolated target; same database-engine major as production; proof <=30 days at promotion and immediately stale after backup mechanism/configuration change | 2026-10-04 | Patrick Craven |
| C22      | OQ-TXN-1   | Are idempotency keys client-supplied (header), server-derived, or both, and how long are they retained? | Both by operation: each retryable operation explicitly declares client-supplied or server-derived key policy with no implicit fallback; retention is operation-declared and not shorter than the complete retry/reconciliation horizon | 2026-10-04 | Patrick Craven |
| C23 | OQ-AUD-1 | How long are audit records retained, and is retention per tenant configurable? | One year; fixed central policy; no tenant overrides; audit deletion BLOCKED | 2026-10-04 | Patrick Craven |
| C32      | OQ-LRN-1   | What is the learning-session state machine (states and allowed transitions)?                                                                                                                                                  | ACTIVE -> COMPLETED; COMPLETED terminal; progress recording allowed only while ACTIVE | 2026-10-03 | Patrick Craven |
| C33      | OQ-MGR-1   | Is manager visibility limited to direct reports, the whole location, or configurable?                                                                                                                                         |          |      |       |
| C34      | OQ-CERT-1  | Is credential verification public (anyone with the link) or private (authenticated, scoped)? (Deferred by Gate A.)                                                                                                            |          |      |       |
| C34      | OQ-CERT-2  | Who approves certification criteria versions, and where is approval recorded?                                                                                                                                                 |          |      |       |
| C41      | OQ-API-1   | Which routes are boundary exceptions outside `/api/v1`?                                                                                                                                                                       |          |      |       |
| C42      | OQ-WEB-1   | Which accessibility standard and level is approved (for example WCAG 2.2 AA)?                                                                                                                                                 |          |      |       |
| C52      | OQ-REL-2   | How is configuration identity computed and recorded without exposing secret values?                                                                                                                                           | `CANONICAL_CONFIG_MANIFEST_SHA256`: SHA-256 of deterministic sorted manifest; non-secret runtime values direct; secrets represented only by stable deployment-bound revision IDs; no raw secret values or secret-derived hashes | 2026-10-04 | Patrick Craven |

| C11 | OQ-IDN-6 | Owner-selected policy value | 6 digits; 5 attempts; 15-minute lock; PIN auth unavailable until implementation | 2026-10-04 | Patrick Craven |
| C52 | OQ-REL-1 | Owner-selected policy value | Supabase PostgreSQL + Vercel; no provisioning/deployment permission | 2026-10-04 | Patrick Craven |
| C52 | OQ-REL-4 | Owner-selected policy value | 24-hour rollback support; migrations backward-compatible for full window | 2026-10-04 | Patrick Craven |
| C53 | OQ-OBS-3 | Owner-selected policy value | 90-day operational logs; separate canonical audit policy; mechanism UNKNOWN | 2026-10-04 | Patrick Craven |

| C13 | OQ-TEN-3 | Does v2 keep platform-operator cross-tenant access? | NO_CROSS_TENANT_GRANTS: No role holds cross-tenant capability; platform-operator cross-tenant access absent | 2026-10-05 | Patrick Craven |
| C14 | OQ-AUTHZ-2 | Which cross-tenant platform capabilities, if any, exist in v2, and what audit do they require? | NO_CROSS_TENANT_GRANTS: No cross-tenant platform grants; V1 platform_operator not imported | 2026-10-05 | Patrick Craven |
| C31 | OQ-CNT-1 | What versioning scheme applies to the schema and to packs? | SEMVER_SCHEMA_AND_PACK_IMMUTABLE_REFERENCES: Strict SemVer 2.0; immutable content; exact version/digest refs | 2026-10-05 | Patrick Craven |
| C32 | OQ-LRN-3 | When a pack gets a new version, does in-progress learner history carry over, restart, or stay pinned? | PIN_EXISTING_HISTORY_TO_ASSIGNED_VERSION: History pinned to assigned version; new assignments select new version explicitly | 2026-10-05 | Patrick Craven |
| C34 | OQ-CERT-4 | May an actor ever be both learner and observer for the same certification? | NO_SELF_OBSERVATION: Learner and observer must be distinct Identities | 2026-10-05 | Patrick Craven |

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

## Part 16 — Dependency lifecycle owner decisions

| Artifact / Contract | From | To | Decision | Date | Owner | GitHub issue |
| --- | --- | --- | --- | --- | --- | --- |
| C11 Identity & Credentials | 1.2.0 | 1.3.0 | Approve InvitationStatus; Invitation-owned acceptance secret; 7-day Invitation lifetime; shared SingleUseTokenStatus; 15-minute SetupToken; 1-hour PasswordResetToken; controlled rejection for offboarded-email invitations; CreateMembership cross-domain boundary; canonical RevokeInvitation operation | 2026-10-04 | Patrick Craven | #12 |
| C22 Transaction, Idempotency & Reconciliation | 1.0.3 | 1.1.0 | Approve OPEN/RESOLVED ReconciliationRecord lifecycle; explicit ExternalEffectOutcome vocabulary; provider-neutral record detail; safe retry disposition | 2026-10-04 | Patrick Craven | #12 |
| TEACH-DEPENDENCY-LIFECYCLE-DISCOVERY | proposed | owner-decided | Record approved choices for all three DLC groups; K00 mutation remains deferred to registration stage | 2026-10-04 | Patrick Craven | #12 |

### Reference evidence used for the owner decision

Legacy `peteywee/teach` was consulted only as non-authoritative reference evidence. It contained invitation states `pending/accepted/revoked/expired`, a 7-day default invitation lifetime, 15-minute frontline setup tokens, and 1-hour password reset tokens. The v2 values above are authoritative only because the owner approved this package.

## Part 17 — Dependency lifecycle registration and final command promotion

| Artifact | From | To | Decision | Date | Owner | GitHub issue |
| --- | --- | --- | --- | --- | --- | --- |
| TEACH-K00 | 0.11.0 | 0.12.0 | Approve 4 dependency entities + IDs, 4 lifecycle state sets, 4 lifecycle state machines; add/approve RevokeInvitation; promote InviteIdentity, AcceptInvitation, RevokeSingleUseToken, ReconcileExternalEffect; no event status changes | 2026-10-04 | Patrick Craven | #12 |
| TEACH-DOMAIN-OWNERSHIP | 1.5.0 | 1.6.0 | Add ownership assignments for 4 state sets, 4 state machines, and RevokeInvitation | 2026-10-04 | Patrick Craven | #12 |
| TEACH-DEPENDENCY-CONCEPTS | 0.3.0 | 0.4.0 | Close lifecycle blockers and record approved registration | 2026-10-04 | Patrick Craven | #12 |
| TEACH-COMMAND-EVENT-DISCOVERY | 0.5.0 | 0.6.0 | Record final command promotion; 23 commands approved / 0 candidate | 2026-10-04 | Patrick Craven | #12 |

Events remain unchanged at 4 approved / 10 candidate. This approval does not manufacture domain events from lifecycle transitions.
## Part 18 — Strict-nine semantic promotion ratification

**Procedural truth state:** direct owner direction landed in `7534df2` before the dedicated SYS-21 issue and canonical ledger update. GitHub issue #14 ratifies the current authority without pretending the original ordering was compliant.

- Original SYS-21 procedure: **CONTRADICTORY**.
- Current semantic content after ratification/readback: **PROVEN**.
- Semantic behavior newly introduced by this reconciliation package: **none**.

| Artifact / Contract | From | To | Original change | Ratified decision | Date | Owner | Remediation issue |
| --- | --- | --- | --- | --- | --- | --- | --- |
| C01 Canonical Semantics | 1.7.0 | 1.8.0 | `7534df2` — add SEM-36 and SEM-AC-25 dependency-closure rule | Ratified as current active contract authority | 2026-10-04 | Patrick Craven | #14 |
| TEACH-K00 | 0.12.0 | 0.13.0 | `7534df2` — strict-nine entity promotion | Ratified as current active semantic kernel | 2026-10-04 | Patrick Craven | #14 |
| Strict-nine entities | candidate | approved | Identity, Credential, ApplicationSession, Organization, Assignment, LearningSession, ProgressEvent, Certification, ContentPack | Ratified exactly as merged | 2026-10-04 | Patrick Craven | #14 |
| Membership | candidate | candidate hold | OQ-TEN-1 directly affects Membership shape | Hold ratified; Membership MUST remain candidate until OQ-TEN-1 is resolved and the promotion gate is rerun | 2026-10-04 | Patrick Craven | #14 |

The three already-approved Membership commands retain only the explicit, enumerated SEM-36 exception recorded in the validator. This ratification does not broaden that exception and does not promote any relationship, invariant, decision table, capability, event, or additional entity.

## Part 19 — Persistence semantic closure promotion

| Artifact | From | To | Decision | Date | Owner | GitHub issue |
| --- | --- | --- | --- | --- | --- | --- |
| TEACH-K00 | 0.13.0 | 0.14.0 | Promote exactly 8 identifiers, 3 state sets, 3 state machines, and 10 relationships listed in `persistence/semantic-closure/proposed.json`; preserve all explicit exclusions; zero command/event/entity status changes | 2026-10-04 | Patrick Craven | #17 |

Physical persistence remains governed by the Persistence Model admission gate. This approval does not authorize a table, migration, repository, transport route, or any excluded semantic promotion.


## Part 20 — TransactionControl first-slice owner decisions

| Artifact / Contract | From | To | Decision | Date | Owner | GitHub issue |
| --- | --- | --- | --- | --- | --- | --- |
| C22 Transaction, Idempotency & Reconciliation | 1.1.0 | 1.2.0 | Resolve OQ-TXN-1: each retryable operation explicitly declares client-supplied or server-derived idempotency-key policy with no implicit fallback; retention is operation-declared and not shorter than the complete retry/reconciliation horizon | 2026-10-04 | Patrick Craven | #20 |
| TEACH-TRANSACTIONCONTROL-FIRST-SLICE-DECISION-PACKET | proposed 0.1.0 | recorded 1.0.0 | Approve `BOTH_BY_OPERATION`, `OPERATION_DECLARED_MINIMUM`, `OPTIONAL_ONE`, and `INHERIT_ORIGINATING_OPERATION_SCOPE` exactly as proposed | 2026-10-04 | Patrick Craven | #20 |
| TEACH-FIRST-PHYSICAL-SLICE-READINESS | 0.2.0 | 0.3.0 | Close the four owner-decision blockers for SLICE-P01; retain relationship-registration and fresh schema-admission gates; admit zero physical slices | 2026-10-04 | Patrick Craven | #20 |

`ReconciliationRecordUsesIdempotencyKey` remains unregistered in K00 after this approval. Its approved decision is many-to-zero-or-one (`OPTIONAL_ONE`), but relationship registration is a separate gate. ReconciliationRecord scope inherits the authoritative scope of the originating operation and cannot broaden it. This approval creates no table, migration, repository, transport route, or runtime implementation.


## Part 21 — SLICE-P01 relationship semantic promotion

| Artifact | From | To | Decision | Date | Owner | GitHub issue |
| --- | --- | --- | --- | --- | --- | --- |
| TEACH-K00 | 0.14.0 | 0.15.0 | Promote exactly `ReconciliationRecordUsesIdempotencyKey` from `candidate` to `approved`; preserve `many-to-zero-or-one`, TransactionControl ownership, C22 authority, and all non-grants; no other semantic status change | 2026-10-04 | Patrick Craven | #24 |
| ReconciliationRecordUsesIdempotencyKey | candidate | approved | Approve the named SLICE-P01 semantic revision required by PER-4/PER-5; promotion grants semantic implementation authority for this relationship only and does not itself admit physical schema | 2026-10-04 | Patrick Craven | #24 |

This SEM-30 approval does not create or authorize a table, column, index, migration, repository, transport route, runtime implementation, or production database change. SLICE-P01 admission must be rerun after the K00 `0.15.0` promotion.

## Part 22 — Production-proof owner decisions

| Contract | From | To | Decision | Date | Owner | GitHub issue |
| --- | --- | --- | --- | --- | --- | --- |
| C21 Database & Migration | 1.0.3 | 1.1.0 | Resolve OQ-MIG-1 as `MIGRATION_SCOPED_PLATFORM_NATIVE_BACKUP`: provider-neutral platform-native transactionally consistent backup/restore capability, automated at least daily where production data is non-reconstructable, plus a fresh named restorable point after candidate freeze and before every schema/data migration | 2026-10-04 | Patrick Craven | #30 |
| C21 Database & Migration | 1.0.3 | 1.1.0 | Resolve OQ-MIG-2 as `ISOLATED_RESTORE_MAX_30D`: disposable isolated restore target, same database-engine major version, proof no older than 30 days, and immediate invalidation when backup mechanism/configuration changes | 2026-10-04 | Patrick Craven | #30 |
| C52 Deployment, Release & Recovery | 1.0.3 | 1.1.0 | Resolve OQ-REL-2 as `CANONICAL_CONFIG_MANIFEST_SHA256`: deterministic sorted config manifest, direct non-secret runtime values, stable secret revision IDs only, SHA-256 candidate identity, missing stable revision fails closed | 2026-10-04 | Patrick Craven | #30 |

These decisions define policy and authorize provider-neutral validation machinery. They do **not** select a hosting/database provider, prove a real backup or restore, authorize shared/production migration execution, establish a deployable production candidate, or satisfy C52 explicit owner production-promotion approval.

## Part 23 — SLICE-P02 owner decisions

| Artifact / Contract | From | To | Decision | Date | Owner | GitHub issue |
| --- | --- | --- | --- | --- | --- | --- |
| C12 Application Sessions | 1.0.3 | 1.1.0 | Resolve OQ-SES-3 as `SESSION_VERIFIER_V1_SHA256_256BIT`: 32-byte CSPRNG credential, unpadded base64url representation, versioned domain-separated SHA-256 verifier, raw credential never persisted | 2026-10-04 | Patrick Craven | #32 |
| C12 Application Sessions | 1.0.3 | 1.1.0 | Resolve OQ-SES-4 as `ABSOLUTE_12H_IDLE_30M`: 12-hour absolute lifetime and 30-minute authoritative idle lifetime with fail-closed expiry | 2026-10-04 | Patrick Craven | #32 |
| TEACH-SLICE-P02-OWNER-DECISION-REGISTRATION | proposed | recorded 1.0.0 | Approve `IDENTITY_GLOBAL_PRINCIPAL_SESSION_IDENTITY_OWNED`: Identity is a global application principal with IdentityId as its explicit identity ownership key; ApplicationSession belongs to exactly one Identity; tenant/role/capability authority remains database-current and is not copied into P02 records | 2026-10-04 | Patrick Craven | #32 |

These decisions close only the three shape-affecting P02 blockers. SameSite, cookie Domain/Path, CSRF, session-rotation events, concurrent-session policy, C15 deletion/retention semantics, and Membership topology/scope remain unresolved as explicitly recorded. Physical schema remains unauthorized until a fresh Persistence Model admission result says ADMIT.

## Part 24 — Owner policy selections and proposal reconciliation (#66)

Explicit owner values selected on 2026-10-04 America/Chicago; recommendations/drafts remain unresolved. These policy records do not authorize runtime activation, schema authoring, deletion, provisioning or production execution.

| Contract | From | To | Owner-selected question/value | Date | Owner | Issue |
| --- | --- | --- | --- | --- | --- | --- |
| C11 | 1.3.0 | 1.4.0 | OQ-IDN-6; see governing contract and verification/owner-decisions/2026-10-04/registration.json | 2026-10-04 | Patrick Craven | #66 |
| C23 | 1.0.3 | 1.1.0 | OQ-AUD-1; see governing contract and verification/owner-decisions/2026-10-04/registration.json | 2026-10-04 | Patrick Craven | #66 |
| C52 | 1.1.0 | 1.2.0 | OQ-REL-1, OQ-REL-4; see governing contract and verification/owner-decisions/2026-10-04/registration.json | 2026-10-04 | Patrick Craven | #66 |
| C53 | 1.0.3 | 1.1.0 | OQ-OBS-3; see governing contract and verification/owner-decisions/2026-10-04/registration.json | 2026-10-04 | Patrick Craven | #66 |

OQ-AUTHZ-1 records the direction to create a new V2 matrix (#67); exact names/semantics/bundles remain unapproved. OQ-PRIV-1/2/3 remain drafts (#68). OQ-OBS-1 and OQ-SES-2 remain recommendations, OQ-CERT-2 remains UNKNOWN, OQ-API-1 remains unselected after source scan. No other recommendation in the supplied attachment is an owner approval. Its 99% labels are not evidence.
