# Local demo composition, not a ninth domain

This directory wires the eight registered domain owners. It owns only the
HTTP adapter, transaction composition interfaces, static principal dispatch
validation and fail-closed local listener gate. Organization owns DemoRun and
admission/close orchestration; Identity owns personas and canonical session
issuance/revocation; Content owns immutable teaching material; Learning owns
assignment/session/progress state and deterministic evaluation; Authorization
owns current authority and run fencing; AuditLifecycle owns required facts;
TransactionControl owns idempotency receipts. Entitlements is not instantiated.

The HTTP surface is exactly `DEMO_ROUTES` in `http.ts`, tested against the frozen
approved package. `createDemoApplication` and `createDemoHttpHandler` open no
network listener. They are usable in isolated owner/repository tests.

`startLocalDemoServer` is the only listener constructor. It requires an external
owner-approved LOCAL_ISOLATED_VERIFICATION attestation and its exact SHA-256.
The attestation binds a clean candidate commit/tree, exact package and semantic
registration, independent semantic review, physical ADMIT and mapping, sanitized
isolated PostgreSQL target fingerprint and byte-exact localhost origin. It states
UNDER_TEST and shared_or_production:false, never conformance or deployment PASS.
The parent task owns approval of that file after independent source/runtime
review. No enabled attestation is supplied by this implementation.

Only a loopback database named teach_v2_demo_* with TEACH_ISOLATED_DB=1 can be
selected. The listener binds 127.0.0.1, serves only the tracked finite src/web/demo/assets.json manifest
and asset bytes matched against the attested Git commit plus the fifteen API routes, never applies migrations, never creates database
roles or persistent credentials, and never changes trust/security configuration.
Secure, HttpOnly, SameSite=Lax, __Host cookies remain mandatory on localhost.
Actual browser proof is required before describing this as a working browser
experience. There is no HTTPS warning bypass or weaker-cookie fallback.

All authority reads and writes share one real owner transaction. The run lock
comes first; Identity/session and scope/target facts remain locked. A fresh
database clock is checked after potentially blocking target/receipt reads, and
again after all required audit/lifecycle/receipt writes and projection reads
before the outer commit. Executing-module realpath identity prevents borrowing
a different checkout attestation.
Safe reads do not refresh session idle time. Required state, audit, lifecycle,
receipt and credential issuance either commit together or are not reported as
success. A separate bounded redacted denial transaction never grants authority.
Reset is close followed by deliberate fresh admission; history is never deleted.
