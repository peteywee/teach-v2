# Connected isolated demo client

This framework-free browser composition connects only to the registered demo transport. It does not mount the API or grant authority. The fixed `assets.json` manifest is loaded and byte-bound to a clean candidate by the independently reviewed local listener. Listener activation requires the external candidate/target-bound local verification attestation; opening these source files is not activation permission.

## Ownership and reuse

- `api.mjs`: exact fifteen-route same-origin adapter, strict response/error checking, bounded requests, no automatic mutation/credential issuance retries. Session credentials remain in the Secure HttpOnly cookie; JavaScript neither reads nor stores them.
- `wire-contract.mjs`: exact approved schema copies, compared to their authoritative package in tests. Metadata schema URLs are inert identifiers, not network fetch targets.
- `controller.mjs`: presentation orchestration with authoritative session/capability/membership reads, request epochs, duplicate-write exclusion, per-command in-memory idempotency keys and canonical readback. No completion is inferred from a response count or client flag.
- `views.mjs`, `styles.css`, `index.html`: escaped view-model rendering and reusable Top Shelf visual system. Tokens/layout/focus patterns are adapted from reviewed preview `e1b0924` and the recovered legacy UI. Connected content and records are exclusively server supplied; no fixture is served or imported.
- `app.mjs`: browser events, focus and theme wiring, no browser persistence or telemetry.

## Flow

Home → deliberate Try demo → authoritative learner assignments → start/resume the exact version → save three responses with server feedback → explicitly complete and read back → manager records with counts/timestamps only → assign again using the existing exact version/digest → a separate learner session → manager refresh → reset or sign out.

Sign out uses CloseDemoRun. Reset requires CloseDemoRun success before BeginDemoRun; an unknown close never begins a replacement, and a successful close followed by failed begin has explicit partial-failure copy. Synthetic history is retained, not erased. Customer account sign-in is deliberately unavailable and no real credential fields are presented.

## Verification boundaries

`tests/demo-web/*.test.mjs` are API/controller/render unit tests with test-only doubles. They do not prove database persistence. `tests/demo-web/browser-checks.mjs` runs the actual PostgreSQL-backed browser journey only against an already attested clean candidate. Modes are golden, resilience, layout, keyboard and axe, split for bounded execution. It validates the supplied attestation hash/source binding before touching the listener. No test mints its own attestation or relaxes cookie/browser security.

Browser evidence, screenshots and final integrated audit receipts are external source-bound outputs. Do not describe this client as a verified working demo until those checks pass on the combined attested source. Manual VoiceOver/TalkBack, full zoom/device validation and broader production readiness remain separately documented requirements.
