import { authoringStages } from './authoring-stage-catalog.mjs';
import { STORAGE_OWNER_PATTERN, STORAGE_INTEGRATION_PATTERN, STORAGE_INTEGRATION_FIRST_PATTERN, STORAGE_INTEGRATION_SECOND_PATTERN } from './demo-storage-partitions.mjs';
import {REGISTRATION_ENTRY_PATTERN,REGISTRATION_REMAINDER_PATTERN,REGISTRATION_FIRST_PATTERN,REGISTRATION_SECOND_PATTERN,CI_FIRST_PATTERN,CI_SECOND_PATTERN} from './validator-partitions.mjs';
// Development verification commands only. This is not a product rules engine,
// command authorization registry, or permission to execute shared migrations.
const predecessorStageCatalog = Object.freeze([
  ['authority', 'node', ['scripts/architecture/validate-whole-repository.mjs']],
  ['demo-registration-entry-regressions', 'node', ['--test', '--test-name-pattern='+REGISTRATION_ENTRY_PATTERN, 'scripts/tests/validate-demo-runtime-registration.mjs']],
  ['demo-registration-regressions', 'node', ['--test', '--test-name-pattern='+REGISTRATION_REMAINDER_PATTERN, 'scripts/tests/validate-demo-runtime-registration.mjs']],
  ['document-governance', 'node', ['scripts/docs/validate-document-metadata.mjs']],
  ['production-contract-decisions', 'node', ['scripts/release/validate-production-proof-contract-decisions.mjs']],
  ['pins', 'node', ['scripts/packaging/validate-apply-guards.mjs', 'pins']],
  ['target-snapshots', 'node', ['--test', 'scripts/tests/validate-isolated-database-target.mjs', 'scripts/tests/validate-persistence-input-snapshots.mjs']],
  ['production-denials', 'node', ['scripts/tests/validate-production-proof.mjs']],
  ['migration-guards', 'node', ['scripts/tests/validate-migration-history-guards.mjs']],
  ['apply-regressions', 'node', ['scripts/tests/validate-apply-guard-regressions.mjs']],
  ['validator-shard-1', 'node', ['scripts/tests/validate-validators.mjs', '--shard=1/14']],
  ['validator-shard-2', 'node', ['scripts/tests/validate-validators.mjs', '--shard=2/14']],
  ['validator-shard-3', 'node', ['scripts/tests/validate-validators.mjs', '--shard=3/14']],
  ['validator-shard-4', 'node', ['scripts/tests/validate-validators.mjs', '--shard=4/14']],
  ['validator-shard-5', 'node', ['scripts/tests/validate-validators.mjs', '--shard=5/14']],
  ['validator-shard-6', 'node', ['scripts/tests/validate-validators.mjs', '--shard=6/14']],
  ['validator-shard-7', 'node', ['scripts/tests/validate-validators.mjs', '--shard=7/14']],
  ['validator-shard-8', 'node', ['scripts/tests/validate-validators.mjs', '--shard=8/14']],
  ['validator-shard-9', 'node', ['scripts/tests/validate-validators.mjs', '--shard=9/14']],
  ['validator-shard-10', 'node', ['scripts/tests/validate-validators.mjs', '--shard=10/14']],
  ['validator-shard-11', 'node', ['scripts/tests/validate-validators.mjs', '--shard=11/14']],
  ['validator-shard-12', 'node', ['scripts/tests/validate-validators.mjs', '--shard=12/14']],
  ['validator-shard-13', 'node', ['scripts/tests/validate-validators.mjs', '--shard=13/14']],
  ['validator-shard-14', 'node', ['scripts/tests/validate-validators.mjs', '--shard=14/14']],
  ['audit-regressions', 'node', ['--test', 'scripts/tests/validate-development-self-audit.test.mjs', 'scripts/tests/validate-ci-consolidation.test.mjs', 'scripts/tests/validate-demo-physical-successor.mjs', 'scripts/tests/validate-replay-database-cleanup.test.mjs', 'scripts/tests/validate-whole-audit-runner.test.mjs']],
  ['recovery-regressions', 'node', ['--test', 'scripts/tests/validate-owner-decision-inventory.test.mjs']],
  ['lifecycle-regressions', 'node', ['--test', 'scripts/tests/validate-workflow-lifecycle.test.mjs', 'scripts/tests/validate-workflow-lifecycle-wiring.test.mjs', 'scripts/tests/validate-workflow-lifecycle-readback.test.mjs']],
  ['demo-source-tests', 'node', ['--import', 'tsx', '--test', 'tests/demo/activation.test.ts', 'tests/demo/application.test.ts', 'tests/demo/content.test.ts', 'tests/demo/cookie.test.ts', 'tests/demo/http-application.test.ts', 'tests/demo/transport.test.ts', 'tests/demo-web/api.test.mjs', 'tests/demo-web/controller.test.mjs', 'tests/demo-web/views.test.mjs', 'scripts/tests/demo-route-inventory.mjs', 'scripts/tests/demo-validator-predecessor.mjs', 'tests/demo/recipe-content.test.ts', 'tests/demo/kitchen-content.test.ts', 'scripts/tests/validate-demo-kitchen-registration.mjs', 'scripts/tests/validate-demo-kitchen-engineering.mjs', 'tests/demo-web/stations.test.mjs', 'tests/demo-web/station-api.test.mjs', 'tests/demo-web/recipe-api.test.mjs', 'tests/demo-web/recipes.test.mjs', 'scripts/tests/validate-demo-recipes-registration.mjs', 'scripts/tests/validate-demo-recipes-physical-successor.mjs']],
  ['demo-storage-owner-regressions', 'node', ['--test', '--test-name-pattern='+STORAGE_OWNER_PATTERN, 'scripts/tests/demo-storage-evidence.mjs']],
  ['demo-storage-integration-regressions', 'node', ['--test', '--test-name-pattern='+STORAGE_INTEGRATION_PATTERN, 'scripts/tests/demo-storage-evidence.mjs']],
  ['demo-kitchen-registration', 'node', ['scripts/kernel/validate-demo-kitchen-registration.mjs']],
  ['demo-generation', 'node', ['scripts/db/verify-demo-generation.mjs']],
  ['demo-postgres', 'node', ['--import', 'tsx', 'scripts/db/run-demo-integration.ts']],
  ['demo-recipe-postgres', 'node', ['--import', 'tsx', 'scripts/db/run-demo-recipe-integration.ts']],
  ...authoringStages.slice(0, 3),
  ['demo-kitchen-postgres', 'node', ['--import', 'tsx', 'scripts/db/run-demo-kitchen-integration.ts']],
  ...authoringStages.slice(3),
  ['typecheck', 'pnpm', ['typecheck']],
  ['foundation', 'pnpm', ['exec', 'node', '--import', 'tsx', '--test']],
  ['drizzle-history', 'pnpm', ['exec', 'drizzle-kit', 'check']],
  ['generation', 'pnpm', ['db:verify-p05-generation']],
  ['replay-p01', 'pnpm', ['db:verify-replay']],
  ['replay-p02', 'pnpm', ['db:verify-p02-replay']],
  ['replay-p03', 'pnpm', ['db:verify-p03-replay']],
  ['replay-p04', 'pnpm', ['db:verify-p04-replay']],
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
// Authenticated refinement of the previous logical obligations, not deletion.
export const SCHEDULING_EXTRA_IDS=Object.freeze(['audit-regressions-second','audit-regressions-third','demo-registration-regressions-second','authority-second','migration-guards-second','migration-guards-third',...Array.from({length:12},(_,i)=>'validator-shard-'+(i+15)),'demo-storage-integration-second']);
export function refineScheduledStage(stage){
 const result=structuredClone(stage);
 if(result.id?.startsWith('validator-shard-'))result.args=result.args.map(arg=>arg.replace(/\/14$/, '/26'));
 if(result.id==='demo-registration-regressions')result.args=result.args.map(arg=>arg==='--test-name-pattern='+REGISTRATION_REMAINDER_PATTERN?'--test-name-pattern='+REGISTRATION_FIRST_PATTERN:arg);
 if(result.id==='audit-regressions')result.args=result.args.filter((_,index)=>index!==2);
 if(result.id==='authority')result.args=[...result.args,'--partition=1/2'];
 if(result.id==='migration-guards')result.args=[...result.args,'--partition=1/3'];
 if(result.id==='demo-storage-integration-regressions')result.args=result.args.map(arg=>arg==='--test-name-pattern='+STORAGE_INTEGRATION_PATTERN?'--test-name-pattern='+STORAGE_INTEGRATION_FIRST_PATTERN:arg);
 return result;
}
export const stageCatalog=Object.freeze(predecessorStageCatalog.flatMap(([id,command,args])=>{
 const current=refineScheduledStage({id,command,args}),rows=[[id,command,current.args]];
 if(id==='audit-regressions')rows.push([id+'-second',command,['--test','--test-name-pattern='+CI_FIRST_PATTERN,args[2]]],[id+'-third',command,['--test','--test-name-pattern='+CI_SECOND_PATTERN,args[2]]]);
 if(id==='demo-registration-regressions')rows.push([id+'-second',command,args.map(arg=>arg==='--test-name-pattern='+REGISTRATION_REMAINDER_PATTERN?'--test-name-pattern='+REGISTRATION_SECOND_PATTERN:arg)]);
 if(id==='authority')rows.push([id+'-second',command,[...args,'--partition=2/2']]);
 if(id==='migration-guards')rows.push([id+'-second',command,[...args,'--partition=2/3']],[id+'-third',command,[...args,'--partition=3/3']]);
 if(id==='validator-shard-14')for(let i=15;i<=26;i++)rows.push(['validator-shard-'+i,'node',['scripts/tests/validate-validators.mjs','--shard='+i+'/26']]);
 if(id==='demo-storage-integration-regressions')rows.push(['demo-storage-integration-second',command,args.map(arg=>arg==='--test-name-pattern='+STORAGE_INTEGRATION_PATTERN?'--test-name-pattern='+STORAGE_INTEGRATION_SECOND_PATTERN:arg)]);
 return rows;
}));
export const expectedPlan = {
  version: '0.2.0', scope: 'development checks only; runtime and production authority remain separate',
  max_operation_ms: 25000, shell_execution: false,
  full_runtime_conformance: 'UNKNOWN', runtime_activation: 'BLOCKED', shared_or_production_execution_authorized: false,
  stages: stageCatalog.map(([id, command, args]) => ({ id, command, args, timeout_ms: 25000, ...(id === 'document-governance' ? { dynamic_input: 'source-bound-event-document-base' } : {}), ...(id === 'foundation' ? { discover_tests: 'src/modules' } : {}) })),
};
export function inspectAuditPlan(plan) {
  return JSON.stringify(plan) === JSON.stringify(expectedPlan) ? [] : ['self-audit: exact bounded development command catalog and fail-closed scope required'];
}
