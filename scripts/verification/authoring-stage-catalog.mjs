// Exact additional commands only. Old stage identities/argv and every 25s bound
// remain unchanged; these are development proofs, never production authority.
export const authoringStages = Object.freeze([
  ['demo-authoring-admission', 'node', ['--test', 'scripts/tests/validate-demo-authoring-admission.mjs', 'scripts/tests/validate-authoring-isolated-lineage.test.mjs', 'scripts/tests/validate-authoring-stages.test.mjs']],
  ['demo-authoring-source-tests', 'node', ['--import', 'tsx', '--test', 'tests/demo-authoring/application.test.ts', 'tests/demo-authoring/journey.test.ts', 'tests/demo-authoring/transport.test.ts', 'tests/demo-web/authoring-model.test.mjs', 'tests/demo-web/authoring-api.test.mjs', 'tests/demo-web/authoring-controller.test.mjs', 'tests/demo-web/authoring-views.test.mjs', 'tests/demo-web/authoring-events.test.mjs', 'scripts/tests/validate-authoring-recovery-policy.test.mjs']],
  ['demo-authoring-generation', 'node', ['scripts/db/verify-authoring-generation.mjs']],
  ['demo-authoring-postgres', 'node', ['--import', 'tsx', 'scripts/db/run-demo-authoring-integration.ts']],
  ['demo-authoring-isolated-history', 'node', ['scripts/db/verify-authoring-isolated-history.mjs']],
]);
