// Development verification commands only. This is not a product rules engine,
// command authorization registry, or permission to execute shared migrations.
export const stageCatalog = Object.freeze([
  ['authority', 'node', ['scripts/architecture/validate-whole-repository.mjs']],
  ['pins', 'node', ['scripts/packaging/validate-apply-guards.mjs', 'pins']],
  ['target-snapshots', 'node', ['--test', 'scripts/tests/validate-isolated-database-target.mjs', 'scripts/tests/validate-persistence-input-snapshots.mjs']],
  ['production-denials', 'node', ['scripts/tests/validate-production-proof.mjs']],
  ['migration-guards', 'node', ['scripts/tests/validate-migration-history-guards.mjs']],
  ['apply-regressions', 'node', ['scripts/tests/validate-apply-guard-regressions.mjs']],
  ['validator-shard-1', 'node', ['scripts/tests/validate-validators.mjs', '--shard=1/3']],
  ['validator-shard-2', 'node', ['scripts/tests/validate-validators.mjs', '--shard=2/3']],
  ['validator-shard-3', 'node', ['scripts/tests/validate-validators.mjs', '--shard=3/3']],
  ['audit-regressions', 'node', ['--test', 'scripts/tests/validate-development-self-audit.test.mjs']],
  ['recovery-regressions', 'node', ['--test', 'scripts/tests/validate-owner-decision-inventory.test.mjs']],
  ['lifecycle-regressions', 'node', ['--test', 'scripts/tests/validate-workflow-lifecycle.test.mjs']],
  ['typecheck', 'pnpm', ['typecheck']],
  ['foundation', 'pnpm', ['exec', 'tsx', '--test']],
  ['generation', 'pnpm', ['db:verify-p05-generation']],
  ['replay', 'pnpm', ['db:verify-p05-replay']],
  ['migrate-isolated', 'pnpm', ['db:migrate']],
  ['postgres-p01', 'pnpm', ['test:integration']],
  ['postgres-p02', 'pnpm', ['test:p02:integration']],
  ['postgres-identity-commands', 'pnpm', ['test:identity:commands:integration']],
  ['postgres-session-commands', 'pnpm', ['test:session:commands:integration']],
  ['postgres-p03', 'pnpm', ['test:p03:integration']],
  ['postgres-p04', 'pnpm', ['test:p04:integration']],
  ['postgres-p05', 'pnpm', ['test:p05:integration']],
]);
export const expectedPlan = {
  version: '0.1.0', scope: 'development checks only; runtime and production authority remain separate',
  max_operation_ms: 25000, shell_execution: false,
  full_runtime_conformance: 'UNKNOWN', runtime_activation: 'BLOCKED', shared_or_production_execution_authorized: false,
  stages: stageCatalog.map(([id, command, args]) => ({ id, command, args, timeout_ms: 25000, ...(id === 'foundation' ? { discover_tests: 'src/modules' } : {}) })),
};
export function inspectAuditPlan(plan) {
  return JSON.stringify(plan) === JSON.stringify(expectedPlan) ? [] : ['self-audit: exact bounded development command catalog and fail-closed scope required'];
}
