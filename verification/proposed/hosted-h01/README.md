# H01: disabled hosted-demo preparation

This is a local implementation checkpoint, not a deployed application or an authorization mechanism. No provider project, resource, account, credential, schedule, migration, DNS record or deployment is created. The existing Vercel sites and Supabase projects remain untouched.

## What exists

- `src/bootstrap/demo-hosted/composition.ts`: the default composition always reports `DISABLED`, `ready:false`, and returns a fixed 503 before calling any dependency factory. It has no verifier override. Neither an environment flag, a manifest hash nor a local attestation can activate it.
- `transport.ts`: a pure, unmounted same-origin HTTPS wrapper around the existing fifteen-route HTTP handler and seven exact static assets. Requests retain their original raw body stream. The existing duplicate-key, UTF-8, 64 KiB, authentication, CSRF, idempotency, denial-audit and cookie policies remain in force. Host and URL must match the same exact HTTPS origin. A future provider adapter must prove it preserves these values; forwarded headers are not trusted here.
- `configuration.ts`: an exact structural proposal and integrity comparison. It binds source/build/manifest, registration/admission/migration, Vercel team/project/environment/deployment/origin, dedicated Supabase project/pooler endpoint and opaque secret revision identifiers. It deliberately does not authenticate these facts. Local verification attestations are rejected.
- `pool.ts`: an inert proposed policy, maximum two connections, verified TLS, finite connection/query/statement/lock/transaction bounds, no named prepared statements and no startup migration. It does not construct a pool. A future reviewed composition would retain one pool per function instance, not create one per request. Fleet-level connection pressure and actual timeout enforcement are not proven by this policy object.
- `expiry.ts`: an unmounted default-deny invocation seam, plus pure empty-request and 0..100 result checks. It cannot select a principal, run, scope or capability. The only positive authorization injection is in excluded test code. Existing expiry remains a maximum-100 scan with each run closed in its own owner transaction. There is no in-process timer or mounted scheduler endpoint.
- `scripts/packaging/build-demo-hosted.mjs`: deterministic source-only packaging and read-only integrity validation. The output is explicitly `DISABLED` and `providerDeployable:false`. It excludes dependency installation, transpilation, SQL execution, test harnesses and local activation. It is not a Vercel build output.

All existing domain services, PostgreSQL adapters, local activation and UI source remain unchanged. These are composition support files, not a ninth domain.

## Local commands

Use the repository's pinned Node 20.20.2 and pnpm 12.8.1 with already installed approved dependencies. From a clean checkout:

```sh
pnpm exec node --import tsx --test tests/demo-hosted/*.test.ts
pnpm exec node --test scripts/tests/demo-hosted-package.mjs
pnpm typecheck
```

Build into a new directory outside the source checkout. Supply the exact reviewed commit and tree, not a moving branch name:

```sh
pnpm exec node --input-type=module -e "import {buildDemoHostedPackage} from './scripts/packaging/build-demo-hosted.mjs'; console.log(buildDemoHostedPackage({sourceRoot:process.cwd(),outputDirectory:process.argv[1],expectedCommit:process.argv[2],expectedTree:process.argv[3]}))" /absolute/new/output COMMIT40 TREE40
```

Validate against that same clean source and expected manifest digest:

```sh
pnpm exec node --input-type=module -e "import {validateDemoHostedPackage} from './scripts/packaging/build-demo-hosted.mjs'; console.log(validateDemoHostedPackage({sourceRoot:process.cwd(),packageDirectory:process.argv[1],expectedCommit:process.argv[2],expectedTree:process.argv[3],expectedManifestSha256:process.argv[4]}))" /absolute/output COMMIT40 TREE40 MANIFEST_SHA256
```

A dirty checkout, hidden index edits, source byte changes, wrong identity, symlinks/hardlinks, traversal, unexpected assets, package changes or overwritten destination fail closed. A matching hash proves integrity only; it grants no deployment authority. Package validation requires the reviewed source checkout and builder, not just a self-hashed caller manifest. The manifest records a finite import closure and the exact migration's digest without including or executing SQL.

The canonical self-audit still uses its existing 47 bounded stages. H01-specific tests are additional focused gates, not silently substituted for any canonical test. Generated local evidence is outside source and must state passed, failed and not-run separately.

## Data and browser behavior preserved

Visitors remain fixed synthetic personas, with no real-person login claim. The run deadline is immutable at 60 minutes; sessions retain 12-hour absolute and 30-minute idle bounds. Protected requests enforce current authority and expiry even if cleanup has not run. Reset is close-then-begin, and neither reset nor expiry deletes retained history or frees capacity. Completion is a recorded training result, not certification.

No trusted-proxy resolver is introduced. `SHARED_UNKNOWN` gives ten starts/hour collectively across visitors, with 100/hour globally and 1,000 retained runs/store. Per run, ten assignments, thirty responses and 100 historical application sessions remain finite. Do not increase these limits or add purge logic as a hosting workaround.

The Secure, HttpOnly, SameSite=Lax, Path=/, host-only `__Host-teach_session` cookie remains the only session delivery mechanism. No bearer shortcut, readable cookie, localStorage credential, credential JSON, wildcard CORS, analytics or telemetry is added. Static and API responses are no-store with the reviewed CSP. Transport does not retry mutations automatically, especially Begin/Switch credential issuance. Receipt-backed retry behavior remains in the original owner transaction.

## Later deployment checklist: not authorized by H01

1. Choose and approve a new demo-only Vercel project and an empty dedicated Supabase project. Do not reuse, pause, delete, migrate or change existing `teach-web`/`teach-api`, `t34ch.com`/`api.t34ch.com`, or Supabase `t34ch`/`runway`. Migration 0005 changes public-object privileges, so using an existing application's database is unsuitable.
2. Confirm exact provider plans, organization/billing boundary, recurring quote, usage cap, payment, taxes and terms. Existing cost estimates are not purchase approval. Resource provisioning is a separate decision.
3. Approve an actual hosted authentication/activation specification and independently verified provider facts. Implement it separately; do not replace the deny implementation with `true`, trust arbitrary JSON, reuse a localhost attestation, or reinterpret `execution:DISABLED` as authorization.
4. At action time, approve exact credential generation/configuration, persistent access, database roles/RLS/Data API settings and sanitized target binding. Secret values stay in an approved secret-management flow, not this file, the manifest, source, chat or logs. Opaque revision strings identify a revision; they do not verify a secret.
5. Prepare an actual provider build/entrypoint for one HTTPS origin serving all seven static assets and fifteen API routes, preserving raw bytes, Host/Origin, cookies, headers and response codes. This checkpoint intentionally contains no root `vercel.json`, live `api/` entrypoint or provider deployment bundle. Verify dependency installation and compiled/source data path preservation before approving that build.
6. Prove transaction-pooler compatibility, actual small retained pool behavior, verified TLS hostname/certificate validation, least-privilege access, statement/lock/transaction timeouts and concurrency budget against the dedicated target. No provider connection or TLS behavior has been tested in H01.
7. Separately approve remote migration execution and validate an empty target before applying anything. Migration execution is not a startup behavior. Prove rollback/recovery and direct-database denials before any public access.
8. Approve and verify scheduler authentication and its external-principal mapping to the already registered expiry operation. Keep request selectors empty. Native Vercel Cron's production-target requirement needs a distinct approval for this demo-only project's Production environment or a separately approved scheduler. Do not silently schedule a Preview or add an in-process timer.
9. Prepare readiness that verifies the full current binding, package and schema before dependencies. H01 readiness is always disabled and unmounted. Future health output should expose only sanitized source/build/target identities and readiness, never secrets or session state. A liveness response alone is not proof of readiness.
10. Prove an actual provider browser journey, restart/retry behavior, scheduled expiry, isolation, recovery and operating limits before claiming hosted readiness. Local browser proof for the earlier demo does not prove Vercel/Supabase behavior.

## Operations and recovery to approve later

- Observe bounded error codes, aggregate latency, pool pressure, capacity and expiry success/failure with redacted request IDs. Do not log credentials, request bodies, learner choices, session verifier material or database URLs. Provider logging/retention and access must be explicitly reviewed before enabling it.
- On failure, deny new requests and disable only the new demo project's approved routing/schedule. Preserve history. Roll back to an independently reviewed build with compatible schema; do not drop tables, lower guards, purge rows or run unreviewed down-migrations.
- Establish a dedicated backup/restore policy, retention, authorized access and an isolated restore rehearsal before public operation. This source artifact is not a database backup. H01 provides no provider backup/restore, billing, security or deployment proof.

## Intentional limitations

Hosted activation, public access, live provider TLS/pooler behavior, positive scheduler authentication, credentials, remote migrations, provider deployment/browser testing and operational backup/restore are NOT RUN. Missing production authorization is intentional. No local result is a certification of sale-ready or production-ready hosting.
