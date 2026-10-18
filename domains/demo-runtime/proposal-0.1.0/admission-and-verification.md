# Implementation and evidence plan

No runtime PASS is claimed by this proposal. These are finite exit conditions, not permission to stop at infrastructure.

## Audit stages and stopping condition

1. Register approved package: exact owner version/digest approval; SYS-21 issue; immutable prior authorities; exact intended status overlay; no undeclared additions; dependency-closed kernel/ownership/interface/route manifests; independent reviewer. Exit is registration proof, not demo completion.
2. Admit owner storage: Organization/Identity demo sidecars, AuditLifecycle, CommandReceipt, Content, P06 Assignment, P05 session extension and P08 ProgressEvent. Per-slice field/FK/enum/cardinality authority; no unresolved shape; immutable prior migration bytes. Empty and actual-head upgrade replay on real PostgreSQL; browser-role denial and owner boundaries. No certification/P07 prerequisite.
3. Compose full backend: named bounded demo admission/expiry; one session model; current authority; deterministic content; assignment/start/progress/complete; same-run manager read; receipt and audit atomicity; explicit concurrency fences. Require real database readback, not only mocked ports.
4. Wire the full UI: real API-driven Home/Try demo, learner lesson/result, persona switch, manager team/detail/assign-again, reset/sign-out. Recover legacy presentation mechanisms without old credentials, direct database, client correctness, queued-success, scores or fake fallback. Polished components and honest state rendering; no extra unimplemented navigation.
5. Independent end-to-end audit and repair: exact candidate, actual browser, persistence, happy/negative/repeated/interrupted paths, accessibility, responsive presentation, no hidden console/network defects. Fix within admitted meaning until criteria pass or a specific genuinely new owner decision blocks.
6. Deliver runnable demo and documentation: exact candidate SHA/build, actual verified launch method or authorized deployment URL, run card, screenshots, known limitations, acceptance ledger and rollback/recovery. A package, mocked UI, green governance validator or server-start check alone does not satisfy this stage. Shared/public deployment requires separate target authorization and release evidence.

## Required evidence matrix

Each case records candidate/artifact digest, environment, command/browser action, expected and actual persistent state, result PASS/FAIL/BLOCKED/UNKNOWN, evidence locator and reviewer. No omitted/fixture-only check is silently PASS.

- REG-01: every proposed semantic reference is baseline-approved or explicitly listed; no same-name identifier/value confusion; candidate business events remain unused; changed status/definitions exactly match approval.
- REG-02: each command has one owner/application boundary/capability; internal commands have no routes; unknown routes/operations/capabilities fail startup/CI; existing capability-name approval history remains intact.
- DB-01: empty migration replay and upgrade from actual preceding head; prior migration hashes unchanged; expected schema inventory exact.
- DB-02: same-organization/location/membership/assignment/persona/FK failures; immutable endpoints/content/classification/history reject updates; browser roles cannot access backend records.
- DB-03: application audit/lifecycle UPDATE/DELETE fail; forced append failure rolls back Begin, Membership, publication, assignment, start, completion, switch and close. No partial cookie/run.
- AUTH-01: missing/malformed/expired/revoked cookies401, missing capability403, unknown/foreign/non-report target indistinguishable404; handlers not invoked on preliminary denial; no writes except permitted denial audit.
- AUTH-02: two concurrent visits A/B have distinct run, organization, location, persona and mutable content/learning state. Every A→B selector/read/write/switch/reset denies without disclosure.
- AUTH-03: synthetic identities cannot invoke normal manager invitation/offboard/certification/credential/customer APIs even if a bundle contains that capability; no non-demo conversion or cross-tenant grants.
- AUTH-04: authority change and start/write race have proven serial ordering; stale Membership, grant, reporting, expired run or unreadable scope never grants access. Correct normal org_admin policy remains defined but unused by demo grants.
- SES-01: exact Secure/HttpOnly/host-only/SameSite cookie; verifier-only persistence; no raw credential in logs, receipts, traces, browser storage or saved test artifacts. A verifier cannot authenticate.
- SES-02: valid non-demo session cannot be replaced by Try demo; valid demo offers Continue/Reset. Successful switch rotates/revokes; same-persona request conflicts; forged counterpart/run/body denies.
- SES-03: simultaneous switch/close/learning mutations linearize safely. Old cookie cannot mutate after switch. Failed audit rollback preserves prior usable state; a lost committed response is shown as uncertain and recovered only from an actually available cookie or fresh start.
- DEMO-01: anonymous start exact-origin POST only, empty body; absent/foreign/null Origin, wrong content type and GET state mutation deny. No client-specified identity/role/org accepted.
- DEMO-02: 60-minute run deadline enforced at every request including SELF; switch near expiry does not extend it. Normal 12h/30min limits also pass. Expiry denies even with cleanup database writes failing.
- DEMO-03: reset confirmed Close then Begin yields new IDs and fresh learning state; old retained history inaccessible. Close success + Begin failure leaves truthful ended/failed-start UI. Double reset cannot close a different run.
- DEMO-04: exact-run expiry job is retry-safe, batch<=100, no duplicate lifecycle/audit, no delete. Interrupted job resumes from durable state; non-demo rows and another not-due run stay untouched.
- DEMO-05: concurrent prefix/global/total-cap admissions cannot exceed10/100/1000; closed/expired/orphan runs still count; SHARED_UNKNOWN fails safely. No rejected partial run. Ten-assignment run bound is atomic; thirty-response maximum holds. Simultaneous switch at the last available slot never exceeds 100 lifetime ApplicationSessions per run, and close remains usable at the cap.
- CNT-01: canonical JSON rejects duplicate keys, unsupported schema/extra fields, invalid SemVer, invalid Unicode, oversized payload, duplicate/out-of-order blocks; deterministic bytes/digest/engine feedback golden vectors.
- CNT-02: exact version history pinned; same natural publish key/digest no-op, mismatched digest conflict; another run receives distinct scoped content ID/digest; no global customer catalog or approval assertion.
- LRN-01: three meaningful steps and server evaluations persist before success UI; wrong authored answer is valid recorded practice with explanation, not fabricated competence. Completion requires all three recorded responses, regardless of match.
- LRN-02: same-key concurrent assignment/start/progress returns original non-secret result once; changed payload rejects; fresh assignment key intentionally creates a second attempt; fresh start key on existing assignment conflicts.
- LRN-03: wrong block/option/skip/duplicate new key/early completion/post-completion writes/repeated completion fail truthfully. Append-completion races yield exactly documented outcomes; lost completion response resolves by readback.
- LRN-04: refresh and a separate test browser context using the same live HttpOnly cookie only in test memory show canonical persisted state. Do not export or retain cookies in artifacts. After sign-out that credential is unusable.
- MGR-01: manager sees exact direct-report result, not fixture success; assigns again with explicit new key; learner performs second distinct session; manager refresh shows both. Manager cannot change/delete learner progress or see answer-match details in team DTO.
- UI-01: every data action has loading/empty/success/forbidden/invalid/offline/network/server/unsaved/retry state; no auto mutation replay on reconnect, no API failure fallback to sample results.
- UI-02: deliberate repeated clicks, canceled navigation, stale async responses, browser Back/Forward, refresh and interrupted reset/switch do not show wrong-user data or false success. Logout clears prior state and prevents protected flashes on shared device.
- UI-03: actual360/390/430px mobile,768px tablet and1366x768+ desktop layouts; no horizontal overflow or clipped actions. Keyboard-only navigation, visible focus, labels/headings/error associations, contrast, reduced motion,44x44 targets and applicable WCAG2.2AA automated+manual checks. Real screen-reader and physical-device evidence must be marked NOT RUN/BLOCKED until actually performed.
- OPS-01: isolated restart preserves DB results without restoring revoked access; shutdown/in-flight cancellation and transactional recovery are truthful. No production credential or shared database is used.
- END-01: complete working URL/launch instructions, synthetic labels, run limits, reset-retains-history explanation and exact-candidate audit ledger delivered. Demo readiness is separate from all23-command/full-product/commercial readiness.

## Deliberate exclusions from this audit

No certification/P07, customer onboarding/provider delivery, paid entitlement/billing, production email/OAuth, AI generation, derived learner scores, indefinite public capacity or physical purge is represented as implemented. Tests of a guarded unavailable route prove denial only, not feature completion. Historical legacy test results are reference evidence, never a fresh runtime PASS.
