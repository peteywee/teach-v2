# Proposed contract/interface revision patch specification

No active contract has been edited. The following is the exact normative addendum content proposed for a future registered revision. Existing requirement IDs and historical approvals are preserved. The registration must create a C00 SYS-21 issue, record exact owner approval, supersede versions properly and regenerate dependent evidence. It must not manufacture an issue number or approval token. Version targets are prospective; rebase against any newer authority before applying.

## C01 1.8.0 → 1.9.0; K00 0.17.0 → 0.18.0; ownership map 1.8.0 → 1.9.0

Register exactly the typed entries in registry-proposal.json. PROMOTE retains prior definitions except the specified fields; REVISE changes only the stated definition/constraints/dependencies; ADD creates the exact new candidate and can promote only after owner approval of this package. Record package version/digest and transcript provenance. Remove the stale Membership OQ-TEN-1 hold only after the selected normalized shape and closure checks pass. Do not weaken SEM-36, add broad exceptions, promote unrelated entries or treat an agent-authored approved flag as evidence. Use typed references to disambiguate RequestId/IdempotencyKey identifiers from candidate values. No new canonical business event is created.

## C00 1.1.0 → 1.2.0; C02 1.1.0 → 1.2.0

Add explicit demo applicability: the visitor+manager demo must satisfy C11–C15, C21–C23, C31–C33 and C41/C42 for every behavior it exposes, including reporting and replay for Identity, Membership, Assignment and DemoRun. Existing learner-only N/A rows do not waive a triggered requirement. Certification/deferred feature gates remain unchanged. Shared deployment still requires release proof.

A visitor acting through a constrained synthetic demo persona is a HumanActor for command/audit classification, but the persona does not claim to identify the actual human visitor. Anonymous admission is a trigger executed only by the named demo-admission AutomationActor. Admit only the two named deterministic principal records, capability lists, scope rules and in-process dispatcher authentication described in demo-boundary.md. No DevelopmentAgent obtains product authority; arbitrary internal code does not inherit either principal. The expiry principal is a bounded named job, not blanket job adoption.

## C11 1.6.0 → 1.7.0; C12 1.2.0 → 1.3.0

Extend Identity definition only for an explicitly bound DemoPersona. Ordinary human identities retain IDN-1 uniqueness, credential/linking and lifecycle requirements. CreateDemoPersona may create exactly the two fictional persona records of a fresh DemoRun without Credential; they cannot convert/link to real accounts, receive credentials/tokens/invitations, or gain non-demo memberships. CreateIdentity and its primary-credential meaning are unchanged.

Add BeginDemoRun and SwitchDemoPersona as exact allowed internal callers of CreateApplicationSession after their own owner-approved synthetic admission proof. They still use C12's one cookie/verifier/session model, all current lifetimes, rotation, Origin and revocation requirements. Synthetic admission authenticates only possession of the constrained visit session, not a real-person identity. Failed commit sets no cookie; secrets are never replay-stored.

Every session belonging to DemoPersona also requires the database-current run fence, including SELF requests. Immutable run deadline is an additional restriction, not a new session lifetime. Switch revokes outgoing/all remaining run sessions and issues a counterpart session atomically. RevokeDemoSessions coordinates the existing canonical revocation writer only. A normal session may not be silently replaced by anonymous demo entry. Enforce at most100 lifetime ApplicationSession issuances per run under the shared run lock using an Identity-owned authoritative count; rejection preserves the current session and close/expiry remain available.

## C13 1.5.0 → 1.6.0; C14 1.3.0 → 1.4.0

Admit exact normal Membership/Location shape and immutable demo grant/reporting records defined here. Add DEMO_ONLY as an immutable synthetic organization classification, never a customer authorization shortcut. BeginDemoRun is the sole demo allocation writer and cannot target existing organizations. Register five new command/capability rows, demo_visitor bundle, named principals, DEMO_NEW_RUN and exact demo-record scope rules. All internal operations remain unrouted and ungrantable.

For DEMO_ONLY organizations bound one-to-one to DemoRun, step 6 evaluates the Organization-owned database-current run availability projection: ACTIVE status, deadline, fixed operation allowlist. Missing or contradictory inputs deny. Availability restricts existing capability effect and grants nothing. No Entitlement instance is created; non-demo entitlement rules remain unchanged.

StartLearningSession, RecordProgressEvent and CompleteLearningSession are LOCATION plus mandatory SELF-target binding, not baseline SELF bundle operations. Every mutation revalidates current actor Membership/grants and exact assignment/session under the transaction fence. DT-002 and DT-008 are reconciled to registered evaluation order and explicit selector meaning. The demo allowlist denies extra ordinary manager/self capabilities at the server. Expiry cleanup uses a separately specified exact-record terminalization policy so it can revoke expired access without requiring live visitor authority.

## C15 1.1.0 → 1.2.0; C22 1.3.0 → 1.4.0; C23 1.2.0 → 1.3.0

Add DemoRun/DemoPersona/MembershipGrant/ReportingRelationship/content/assignment/progress/receipt synthetic record classes with creation, fixed run deadline and terminal clocks. Disposition in this isolated milestone is RETAIN_NO_AUTOMATED_DELETE; expiry/reset revoke access but do not delete, anonymize, rewind or promise erasure. Reduced-resolution admission prefixes are potentially identifying network data, used only for bounded admission and included in this retention classification. No full IP, free-text learner data or customer personal data is collected. Audit policy remains centrally one year with deletion blocked; this package adds no expiry purge mechanism.

Begin and Switch are explicitly NON-RETRYABLE secret issuance. Close is state-guarded, preserving original terminal outcome on internal retry; a revoked visitor cookie still fails. Reset is two sequential operations, with a truthful partial outcome if new Begin fails. The three existing learning retryable mutations use CommandReceipt with CLIENT_SUPPLIED keys, current authority before replay, exact payload binding, original non-secret response, 24-hour horizon and retained tombstones. No client retry layer reissues secrets.

Register finite typed audit actor/target/result and lifecycle snapshot definitions. Required audit/lifecycle history is append-only and transaction-bound; failure rolls back effects. Initial synthetic provisioning has separately typed principal attribution. Identity, Membership, Assignment and DemoRun replay must exactly reproduce their lifecycle fields. Preserve approved denial dedup/rate/overflow rules and do not promote business-event candidates.

## C31 1.2.0 → 1.3.0; C32 1.3.0 → 1.4.0; C33 1.2.0 → 1.3.0

Admit only the canonical synthetic content and learning definitions in learning-definition.md/JSON. Organization-owned copies do not select a future customer/global catalog policy. Publish remains internal/control-plane, scoped to the fresh run and frozen synthetic template. Customer approval remains absent. AssignContent accepts exact immutable version/digest and explicit target learner with current scope/reporting eligibility; new deliberate keys may create new practice assignments, while retries cannot duplicate.

Single-choice teaching responses are server-evaluated against authored answer data. Per-response answer-match feedback is not XP, mastery, rank, certification or an aggregate score. Completion is permitted only when all ordered required responses are recorded; correctness is not a completion gate. One session per Assignment; new practice requires an explicit new Assignment. Maximum ten assignments and thirty accepted response events per run. Session completion stays terminal; manager reads persisted state and cannot edit learning events.

## C41 1.1.0 → 1.2.0; C42 1.1.0 → 1.2.0

Register exactly the proposed methods/paths/request+response schemas and owner queries in transport-and-queries.json. Existing routes stay unchanged except the explicit learner scope correction and reconciled Publish routing label. Only implemented/admitted operations may mount; unknown routes/capabilities fail startup/CI and deny before handlers. The synthetic entry is not the old v1 demo-login endpoint. Explicitly reconcile the API manifest's stale core-only content_version_pattern to already-selected strict SemVer2.0 including prerelease/build metadata, as specified in transport-and-queries.json; path encoding never normalizes exact version identity.

Every unsafe demo route requires byte-exact allowed Origin and application/json; safe requests do not allocate or reset. Protected response caching is no-store. All success/failure/denial responses use the approved envelope rules; existing rate/capacity codes, exact fixed messages and status mapping are preserved from the baseline error schema. UI must distinguish loading/empty/denied/invalid/offline/failed/unsaved/recorded states, use actual persisted results and clear protected data on session/run changes. Reset's two-step semantics must be visible on partial failure. Require keyboard, WCAG2.2AA, 44px targets, reduced motion and actual mobile/desktop browser inspection, not only fixture screenshots.

## Application Interfaces 1.0.0 → 1.1.0; Persistence Model 1.0.0 → 1.1.0

Add the five owner command entries and seven existing protected read query interfaces plus explicit owner/internal demo/receipt/audit boundaries. Cross-domain orchestration uses only these owner interfaces in one transaction where required. No new runtime domain or alternate session system is introduced.

Replace stale descriptive readiness claims only where evidence supports them. Admit physical slices only after every field/state/relationship has exact semantic approval and migration/integration plans pass; never blanket ADMIT the entire schema. Add proposed owner stores, immutable constraints and current-scope predicates from the package. Existing P01–P05 migration bytes and evidence remain historical; actual fresh/upgrade proofs use the real latest migration head. No dependency on certification/P07 is invented.

## Guardrails for validators and generated views

The existing validators deliberately hard-code old entry sets/statuses and capability package deltas. A future registration must evolve these via exact-version allowlists and preserve prior package evidence, not remove checks to make the new package pass. Regenerate counts, ownership/semantic closure, command ledger, route matrix/negative cases and applicability after review. Historical reports and copied proposal labels are not current runtime truth. Capability-name admission evidence must remain valid as history even though the new package deliberately expands the live registries.
