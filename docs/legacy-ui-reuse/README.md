# H02: local legacy artwork and navigation guidance

This presentation-only continuation preserves H01 `acd320375849bb596857842abecdfa679689b0d9` and its inert hosted seams. It changes neither lesson meaning nor the fifteen API routes, authentication, activation, owner or persistence behavior. No new font, framework, external asset, telemetry or browser persistence is added.

## Brand provenance

`provenance.json` pins the recovered source and exact hashes. The original 28,841-byte `TopShelfService_Logo_Trace.svg` is preserved unchanged beside this document. It is the smaller, more recognizable of the two inspected legacy traces. The 297,714-byte web trace remains archived and is not imported.

The served inline SVG in `views.mjs` changes only its root: the redundant XML namespace declaration is omitted in HTML, and decorative `aria-hidden` / `focusable` attributes are added. All original geometry and colors remain byte-identical. It is displayed at illustration scale next to text branding, not substituted for the accessible home button. The original artwork is not a remote dependency and is not a new served asset. The seven-file static allowlist, hosted transport inventory, package builder and all their checks remain unchanged. The package includes the illustration as part of the existing byte-bound `views.mjs` asset.

The user requested local reuse of their preserved legacy assets. No independent original-authorship or third-party rights clearance is asserted. Local preview permission is not permission for external publication. No font license has been assumed.

## Help boundary

The legacy learner page's quiet, on-request help pattern inspired a native, initially collapsed “Using this demo” disclosure. Its new copy explains application navigation, server confirmation, recovery, manager readback, reassignment and retained-history reset/logout. It provides no answer hints, assessment rules, profiling, timing triggers, grades or new curriculum.

Help appears only on learner assignment, practice and completion views. It has no application event handler, API operation, storage or persistent state. Opening/closing it uses browser-native disclosure semantics and does not re-render the application. An ordinary view replacement resets it closed; the existing route/response/choice focus behavior is unchanged. It disappears on manager, boundary and signed-out views. Theme changes retain the existing DOM and do not move focus.

## Proof boundaries

`tests/demo-web/legacy-guidance.test.mjs` covers source/artwork equality, fixed safe SVG markup, optional/help scope, render purity, no answer leakage and unchanged asset inventory. Existing client, hosted, package and canonical audit checks must run against the new frozen source; prior H01 or connected-browser passes are not substituted.

Any local rendering fixtures must be explicitly labelled development rendering previews, with no API or saved-result claim. They are not served by the production manifest. A new connected browser run requires its own exact candidate-bound admission; the previous runtime attestation does not apply to these bytes. No external publication, hosted activation, full WCAG certification or device emulation is implied by this source change.
