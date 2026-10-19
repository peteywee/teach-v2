<!--tos-doc
{"doc_id":"TEACH-HOSTED-H02-ADAPTER-PROPOSAL","class":"specification","version":"0.2.0","claims_truth_state":"declared","status":"proposed","owner":"Patrick Craven, Top Shelf Service LLC","created_on":"2026-10-18","updated_on":"2026-10-19","baseline":{"repo":"peteywee/teach-v2","ref":"main","commit":"87c427ebb4b7e8f5b65ae04a1c47165ccea81932","purpose":"local disabled provider build; no hosted activation authority"}}
-->
# H02: Node 24 disabled Vercel build

Status: local implementation with owner-selected Node 24.x policy; hosted activation and deployment remain NOT AUTHORIZED by this checkpoint. H01 source, policy and historical evidence remain unchanged. This document supersedes H02's unapproved Node 22 proposal, not H01.

## Owner decision and limits

The owner approved local, disabled preparation with runtime patch recording and reverification. The selected major is 24, not the previously proposed 22. It does not approve deployment, credentials, security settings, provider access or runtime activation.

The approved demo package's decision-and-scope.md allows deployment packaging details that preserve its semantics. This checkpoint adds a Build Output API v3 builder, compiled Node handler and unmounted transport seam, not a new domain or application capability.

## Runtime identity

The H02 build requires Node 24.x and pinned pnpm 12.8.1, records the actual Node patch and TypeScript version, and emits nodejs24.x provider configuration. Vercel manages minor/patch updates; an exact observed patch is evidence, not a maintainable provider version selector.

runtimeReadback() compares the running Node patch against build-runtime.json. Missing, malformed, different-major or different-patch evidence is unverified and requires fresh verification. Equality never grants activation. The shipped handler always denies, including when patches match, environment flags claim enablement, or database selectors/credentials are provided. No public health/readiness route is added. A later approved composition must check this runtime result before creating dependencies and must repeat candidate verification after a provider patch change.

Reference: https://vercel.com/docs/functions/runtimes/node-js/node-js-versions

## Actual build output

scripts/packaging/build-demo-vercel.mjs compiles an explicit source closure with the installed pinned TypeScript compiler. A clean committed source, exact commit/tree, unhidden index and matching tracked file bytes are required. The builder refuses preexisting output and output inside the checkout. It invokes no provider, package installer, migration, database, shell command string or network service.

The output contains:
- config.json using Build Output API v3 and one dispatch rule to /demo. All requests, including unknown paths, reach the same unavailable handler. There is no CDN/static directory, filesystem routing, SPA fallback, CORS rule, scheduler or additional function.
- functions/demo.func/.vc-config.json with runtime nodejs24.x, Nodejs launcher, helpers disabled and a bounded 25-second invocation duration.
- An actual compiled default handler at src/bootstrap/demo-hosted/vercel-entrypoint.js. It calls only the existing always-disabled composition and response adapter; it never constructs a pool or application and does not interpret incoming data while disabled.
- The finite emitted JavaScript closure, seven unchanged UI assets plus their inventory, and the error schema at its original relative import.meta.url path. No tests, SQL, local activation, dependency factories, node_modules, secrets or provider credentials are shipped.
- build-runtime.json recording actual build patch/compiler/package manager and source commit/tree, plus h02-build-manifest.json with source/output hashes and explicit DISABLED / deploymentAuthorized:false declarations.

validateDemoVercel independently rebuilds from the same reviewed source and compares the complete output inventory. A self-rewritten manifest cannot substitute for source-bound validation. Empty directories, symlinks, missing/extra files and byte changes are rejected. Integrity validation is not owner authorization.

The adapter preserves raw request bytes, Host/Origin, status and separate Set-Cookie values. It rejects ambiguous security headers, malformed/normalized targets and GET/HEAD body framing rather than silently dropping a body. No forwarded-header trust, credential translation, automatic mutation retry or security-policy weakening is introduced. Positive adapter tests use excluded test-only composition and are not hosted activation evidence.

Build Output reference: https://vercel.com/docs/build-output-api/primitives

## Local verification and commands

Use Node 24.x, pnpm 12.8.1 and already installed lockfile-matched dependencies. Do not use an unpinned pnpm or replace required tests with version-guard bypasses. From the repository root:

    pnpm typecheck
    pnpm exec node --import tsx --test tests/demo-hosted/*.test.ts
    pnpm exec node --test scripts/tests/demo-vercel-package.mjs
    pnpm exec node --test scripts/tests/demo-route-inventory.mjs
    pnpm audit:whole

Build to a new absolute directory outside the checkout using the exact clean commit and tree:

    pnpm exec node scripts/packaging/build-demo-vercel.mjs /absolute/source /absolute/new-output COMMIT40 TREE40

The output has the .vercel/output directory shape but is deliberately generated outside the source checkout. No root vercel.json or automatic provider build/deployment configuration is installed. Placing or publishing this output in a project is a separate action.

Packaging tests build a committed isolated fixture, verify deterministic rebuilds, import the packaged handler in a separate process outside the checkout, test default denial under hostile activation environment values, detect patch drift and test source/output tampering. Real HTTP socket tests cover GET/HEAD body rejection and paced oversized input without losing the rejection response. All positive request flows remain local tests. Canonical self-audit, independent exact-candidate review, provider transport/browser tests and deployment proof remain distinct gates.

## Still pending

The actual Vercel project and deployment binding must be verified before any settings or publication. Hosted activation authentication, backend composition, credentials/security action approval, remote migrations, scheduler identity and operational recovery/cost evidence remain separate. Shared Supabase schema support is a parallel lane requiring its own scoped implementation and review; no backend is included or implied here. Root H01/package pins and historical evidence are not silently relabeled as Node 24 proof.
