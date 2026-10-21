# Netlify: disabled local preparation only

This addition does not deploy, authorize deployment, configure a provider account,
create credentials, mutate a database or replace the existing Vercel artifact.
The Netlify default handler always returns 503, without reading credentials,
importing the accepting runtime, or constructing a pool. No environment flag can
activate it. Local successful request tests exercise an explicitly injected seam
through the existing hosted transport; they are not provider acceptance evidence.

## Build and layout

Use existing pinned pnpm 12.8.1, TypeScript 7.0.2 and Node 24.x. Run the builder
through pnpm from a clean reviewed source tree, with a new output directory
outside that tree:

    pnpm exec node scripts/packaging/build-demo-netlify.mjs SOURCE OUTPUT

The preparation root contains `netlify.toml`, a single `functions/demo.mjs`
wrapper, an empty `public/` publish directory and `private/runtime/`. The private
runtime retains the existing complete successor closure, pg/drizzle dependencies,
error schema, governance evidence, browser assets and exact build Node evidence.
No server data or assets are copied into the CDN publish directory. Source SQL,
tests, environment files and credentials are not added to the function package.

The wrapper declares `path: '/*'`, `preferStatic: false`, `nodeVersion: '24'`,
`nodeBundler: 'none'` and `includedFiles: ['../private/runtime/**']`. Explicit custom
bundling avoids changing module-relative file paths. This is a preparation
layout, not a tested Netlify deploy ZIP. Netlify's actual packaging, retained
paths, routing and absence of public internal files require independent proof.
The root manifest records source commit/tree, exact build patch, dependency
versions, private closure digest and output hashes; hashes are not authorization.

## Request boundary

The unmounted Fetch seam checks visible URL origin/Host, rejects joined critical
header values, transfer framing, invalid/oversized declared content length,
GET/HEAD body framing and consumed streams. It passes the original Request to
the existing transport, retaining origin/cookie/body/query validation and
security headers. It returns the original Response so separate Set-Cookie values
are not flattened. Configuration initialization is single-shot and cached;
initialization or handler failures fail closed. A patch mismatch prevents the
initializer from running.

These checks CANNOT reconstruct raw duplicate header lines, removed framing,
or original targets normalized before Request construction. Comma checks are
not proof of duplicate-header equivalence. A test explicitly demonstrates that
`/discard/../` has already become `/` before the seam can inspect it. That is why
the provider entrypoint does not call the seam at all.

## Release gates (all still open)

1. Establish provider-side ingress guarantees or a separately reviewed transport
   retaining the raw evidence required by the Node adapter. Include malformed
   duplicate Host/Origin/Cookie/Content-Length/Content-Type/Transfer-Encoding/
   Sec-Fetch-Site/Idempotency-Key cases, CL/TE conflicts, body framing and raw
   normalized-target cases. A clean Fetch Request alone cannot prove this.
2. Obtain observed function `process.versions.node` and compare it exactly with
   the build evidence. Netlify major selection does not pin the patch. A mismatch
   requires rebuild/reverification, never relaxing equality. A build NODE_VERSION
   setting is not a function-runtime observation.
3. Independently verify provider packaging and complete private closure, catchall
   routing including root/unknown/static/private paths, no CDN bypass, secure
   multi-cookie handling and error behavior. Local module imports do not prove
   the provider zip layout or platform response transformation.
4. Obtain separately scoped authorization for any account/configuration changes,
   credentials, deployment or live database operations. No such operations are
   part of this preparation. Only after all gates are closed may a new reviewed
   accepting composition be considered; this handler has no activation switch.

## Local verification

    pnpm exec node --import tsx --test tests/demo-netlify/adapter.test.ts
    pnpm exec node --test scripts/tests/demo-netlify-package.mjs
    pnpm exec tsc --noEmit

Tests cover actual hosted transport with a synthetic application port, private
complete closure imports in a fresh process, deterministic builds, empty public
output, singleton/patch/exception behavior, security negatives, distinct cookies,
body preservation, dirty-source/output-reuse rejection and unconditional provider
denial with synthetically valid configuration and network/listener/timer traps.
No tests contact a database or provider.

## Official reference material

Reviewed 2026-10-20:
- https://docs.netlify.com/build/functions/api/ (Fetch Request/Response API)
- https://docs.netlify.com/build/functions/configuration/ (routing, publish isolation,
  major runtime selection; AWS_LAMBDA_JS_RUNTIME is a provider setting, not toml)
- https://docs.netlify.com/build/frameworks/frameworks-api/ (nodeBundler none,
  includedFiles, and major-only nodeVersion)

These references describe mechanisms, not evidence that this application has
been deployed or that its security gates have been met.

Additional explicit Fetch limit: it permits a Content-Length header that differs
from stream length. The existing transport bounds declared and observed lengths
but does not compare them. A local regression test records this limitation and
stream-error denial. Provider framing proof must cover length mismatch; this
preparation does not weaken or replace the raw Node framing boundary. A separate
packaged memory-transaction test exercises the assembled runtime through the
Fetch seam for all 15 operations and all 7 exact assets. It is still not database
or provider evidence.

## First canary correction (2026-10-21)

Inline includedFiles globs are relative to the function source directory, unlike
TOML's repository/base-relative setting. The corrected scaffold uses
../private/runtime/**; the canary uses ../private/**. The isolated canary build
pins Node 24.21.0 to match the first observed provider patch; exact patch equality
is still required and must be checked again on every deployment. These changes
do not enable an accepting handler or establish raw-ingress equivalence.

Run scripts/tests/netlify-provider-package.mjs with the absolute package directory
of the official @netlify/zip-it-and-ship-it@16.4.0 installed separately using pnpm.
That version is pinned by the observed @netlify/build@37.5.0 registry metadata.
The regression invokes the actual packager, verifies extracted private bytes and
cold checks, and proves the former glob omits evidence. Application dependencies
and the Vercel build are unchanged. Generated records contain only nonsecret
versions/counts/booleans; they must not rely on log visibility for confidentiality.
