import { STORAGE_OWNER_PATTERN, STORAGE_INTEGRATION_PATTERN, assertStoragePartitionInventory } from './demo-storage-partitions.mjs';
import { inspectKitchenRegistration } from '../kernel/demo-kitchen-registration.mjs';
import { inspectDemoRecoveryRegistration } from '../kernel/demo-recovery-registration.mjs';
import { inspectRecipeRegistration } from '../kernel/demo-recipes-registration.mjs';
import {REGISTRATION_ENTRY_PATTERN,REGISTRATION_REMAINDER_PATTERN} from './validator-partitions.mjs';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { renderConsolidatedProducerWorkflow } from './self-audit-workflow.mjs';
import { inspectAuditPlan } from './self-audit-catalog.mjs';
import { inspectWorkflowText } from './workflow-lifecycle-inventory.mjs';
import { inspectProducerWorkflowWiring } from './validate-workflow-lifecycle.mjs';

export function inspectConsolidatedVerification(root) {
  const errors = [], fail = message => errors.push(`consolidated verification: ${message}`);
  const path = '.github/workflows/development-self-audit.yml';
  try {
    const workflow = readFileSync(join(root,path),'utf8');
    if(workflow!==renderConsolidatedProducerWorkflow())fail('exact constrained producer template required; shell/default/environment/execution overrides forbidden');
    const plan = JSON.parse(readFileSync(join(root,'verification/whole-repository/self-audit-plan.json'),'utf8'));
    errors.push(...inspectConsolidationCoverage(root), ...inspectAuditPlan(plan), ...inspectProducerWorkflowWiring(path,workflow));
    if ([...workflow.matchAll(/^on:/gm)].length !== 1 || !/^on:\n  pull_request:\n  push:\n    branches: \[main\]\n  workflow_dispatch:\npermissions:/m.test(workflow) || /\bpaths(?:-ignore)?:|pull_request_target:/.test(workflow)) {
      fail('physical proofs must run on every PR and main tree, plus manual dispatch; all PR target branches required');
    }
    const expected = '${{ github.event.pull_request.head.sha || github.sha }}';
    if (!workflow.includes(`ref: ${expected}`) || !/^      AUDIT_EXPECTED_SHA: \$\{\{ github.event.pull_request.head.sha \|\| github.sha \}\}$/m.test(workflow)) fail('exact candidate checkout and expected SHA required');
    const steps = workflow.split(/^      - /m).slice(1);
    const checkouts = steps.filter(step => /(?:^|\n        )uses: actions\/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1\n/.test(step));
    if (checkouts.length !== 1 || !/^          fetch-depth: 0$/m.test(checkouts[0]) || [...checkouts[0].matchAll(/^          fetch-depth:/gm)].length !== 1) fail('full-history credential-free document checkout required');
    if (inspectWorkflowText(path,workflow).length !== 1) fail('one explicit producer job required');
    if (!workflow.includes("node-version: '20.20.2'") || !workflow.includes('pnpm@12.8.1') || !workflow.includes('run: pnpm install --frozen-lockfile\n') || !workflow.includes('image: postgres:17.11-alpine') || !workflow.includes("TEACH_ISOLATED_DB: '1'") || !workflow.includes('timeout-minutes: 15')) fail('pinned runtime and isolated PostgreSQL required');
    for(const [id,pattern] of [['demo-registration-entry-regressions',REGISTRATION_ENTRY_PATTERN],['demo-registration-regressions',REGISTRATION_REMAINDER_PATTERN]]){
      const demoRegression=plan?.stages?.find(stage=>stage.id===id);
      if(demoRegression?.command!=='node'||JSON.stringify(demoRegression?.args)!==JSON.stringify(['--test','--test-name-pattern='+pattern,'scripts/tests/validate-demo-runtime-registration.mjs'])||demoRegression?.timeout_ms!==25000)fail('exact bounded demo registration mutation suite must run in CI');
    }
    // A failed source seal remains blocking, but cannot suppress independent
    // order/finalizer/atomicity diagnostics below. Never substitute unverified bytes.
    try {
      if(createHash('sha256').update(preservedRegistrationTestBytes(root)).digest('hex')!=='0aec40789483d97aafbeaa69846037de42b7f2f8a71c34979cd74aac8ce5a639')fail('original seventeen registration test declarations must remain exact');
    } catch(error) { fail(error.message); }
    const physicalRegression=plan?.stages?.find(stage=>stage.id==='audit-regressions');
    if(physicalRegression?.command!=='node'||JSON.stringify(physicalRegression?.args)!==JSON.stringify(['--test','scripts/tests/validate-development-self-audit.test.mjs','scripts/tests/validate-ci-consolidation.test.mjs','scripts/tests/validate-demo-physical-successor.mjs','scripts/tests/validate-replay-database-cleanup.test.mjs','scripts/tests/validate-whole-audit-runner.test.mjs'])||physicalRegression?.timeout_ms!==25000||!existsSync(join(root,'scripts/tests/validate-demo-physical-successor.mjs')))fail('exact bounded physical successor mutation suite must run in CI');
    for (const [id, pattern] of [['demo-storage-owner-regressions', STORAGE_OWNER_PATTERN], ['demo-storage-integration-regressions', STORAGE_INTEGRATION_PATTERN]]) {
      const stage = plan?.stages?.find(stage => stage.id === id);
      if (stage?.command !== 'node' || JSON.stringify(stage?.args) !== JSON.stringify(['--test', '--test-name-pattern='+pattern, 'scripts/tests/demo-storage-evidence.mjs']) || stage?.timeout_ms !== 25000) fail('exact bounded exhaustive storage partitions required');
    }
    try {
      const names = [...readFileSync(join(root, 'scripts/tests/demo-storage-evidence.mjs'), 'utf8').matchAll(/^test\('([^']+)'/gm)].map(match => match[1]);
      assertStoragePartitionInventory(names);
    } catch (error) { fail(error.message); }
    const demoSource=plan?.stages?.find(stage=>stage.id==='demo-source-tests');
    if (demoSource?.args?.includes('scripts/tests/demo-storage-evidence.mjs')) fail('storage declarations must execute only in their two exact bounded partitions');
    for(const path of demoSource?.args?.filter(arg=>/^(?:tests|scripts)\//.test(arg))||[])if(!existsSync(join(root,path)))fail(`required demo test missing: ${path}`);
    const recipe = inspectRecipeRegistration(root);
    errors.push(...recipe.errors);
    const wrapper = readFileSync(join(root,'scripts/db/run-demo-integration.ts'),'utf8');
    if(createHash('sha256').update(wrapper).digest('hex')!=='575b41278b354e0cfeb32a51f4b56f7719169772d19f4cdea5b83f2303222a62')fail('exact original isolated three-suite wrapper required');
    if(recipe.present) {
      const recipeStage=plan?.stages?.find(stage=>stage.id==='demo-recipe-postgres');
      if(recipeStage?.command!=='node'||JSON.stringify(recipeStage?.args)!==JSON.stringify(['--import','tsx','scripts/db/run-demo-recipe-integration.ts'])||recipeStage?.timeout_ms!==25000)fail('exact separate bounded recipe PostgreSQL stage required');
      if(createHash('sha256').update(readFileSync(join(root,'scripts/db/run-demo-recipe-integration.ts'))).digest('hex')!=='0ae8978b1762054b7bf0f8a94a2754492e29220e6e4297bf2fa6a85c8464b9f9')fail('exact separate isolated recipe guard wrapper required');
    }
    if(recipe.present)for(const path of ['tests/demo/recipe-content.test.ts','tests/demo-web/recipe-api.test.mjs','tests/demo-web/recipes.test.mjs','scripts/tests/validate-demo-recipes-registration.mjs','scripts/tests/validate-demo-recipes-physical-successor.mjs'])if(!demoSource?.args.includes(path)||!existsSync(join(root,path)))fail(`bounded recipe successor regression must run in existing demo-source stage: ${path}`);
    if(!existsSync(join(root,'scripts/db/verify-demo-generation.mjs')))fail('demo generation proof required');
    const stages = [...workflow.matchAll(/^        run: node scripts\/verification\/run-self-audit\.mjs --stage ([a-z0-9-]+)$/gm)].map(match => match[1]);
    if (JSON.stringify(stages) !== JSON.stringify(plan?.stages?.map(stage => stage.id))) fail('complete ordered checkpoint workflow required');
    const identity = plan?.stages?.find(stage => stage.id === 'postgres-identity-commands');
    if (!stages.includes('postgres-identity-commands') || identity?.command !== 'pnpm' || JSON.stringify(identity?.args) !== JSON.stringify(['test:identity:commands:integration'])) fail('atomic Identity integration evidence must run in consolidated CI');
    const session = plan?.stages?.find(stage => stage.id === 'postgres-session-commands');
    if (!stages.includes('postgres-session-commands') || session?.command !== 'pnpm' || JSON.stringify(session?.args) !== JSON.stringify(['test:session:commands:integration'])) fail('session transaction PG automation required');
    if (!workflow.includes('if: always()\n        run: node scripts/verification/run-self-audit.mjs --finish\n') || !workflow.includes('if: always()\n        uses: actions/upload-artifact@cf430e030ddbb5b0abf93d22962f4752f3646cd9') || !workflow.includes('          path: verification/generated/self-audit/\n          if-no-files-found: error')) fail('failed or missing audit evidence must finalize and be retained');
  } catch (error) { fail(error.message); }
  return errors;
}

// Reviewed cleanup-only projection. Keep the frozen consolidation manifest and
// all migration/fingerprint assertions immutable; admit only these exact edits.
export function reconstructHistoricalReplay(path, bytes) {
  const paths = [
    'scripts/db/verify-migration-replay.ts',
    'scripts/db/verify-slice-p02-migration-replay.ts',
    'scripts/db/verify-slice-p03-migration-replay.ts',
    'scripts/db/verify-slice-p04-migration-replay.ts',
    'scripts/db/verify-slice-p05-migration-replay.ts',
  ];
  if (!paths.includes(path)) return bytes;
  const source = bytes.toString();
  const header = "import { dropReplayDatabase } from './replay-database-cleanup.mjs';\n";
  const replacement = '  await dropReplayDatabase(admin, name);';
  if (!source.startsWith(header) || source.split(replacement).length !== 2 || source.includes('pg_terminate_backend')) {
    throw new Error(`reviewed replay cleanup substitution required: ${path}`);
  }
  const query = paths.indexOf(path) < 2
    ? '`select pg_terminate_backend(pid)\n       from pg_stat_activity\n      where datname = $1 and pid <> pg_backend_pid()`'
    : '`select pg_terminate_backend(pid) from pg_stat_activity where datname=$1 and pid<>pg_backend_pid()`';
  return source.slice(header.length).replace(replacement,
    `  await admin.query(\n    ${query},\n    [name],\n  );\n  await admin.query(\`drop database if exists \${quoteIdent(name)}\`);`);
}

// Frozen migration evidence is a reviewed control-model input, not editable proof.
// Validate its identity AND its live execution links; a count or green workflow is insufficient.
export function inspectConsolidationCoverage(root) {
  const errors=[],fail=message=>errors.push(`CI coverage: ${message}`);
  const hash=value=>createHash('sha256').update(value).digest('hex');
  try {
    const text=readFileSync(join(root,'verification/whole-repository/ci-consolidation-coverage.json'),'utf8');
    if(hash(text)!=='671dbd10c44a762970e4174668a7a7aa57464c2e4cf242bb0c7344cb64a6e9ac')fail('reviewed baseline command mapping identity required');
    const coverage=JSON.parse(text),plan=JSON.parse(readFileSync(join(root,'verification/whole-repository/self-audit-plan.json'),'utf8'));
    const stages=new Map(plan.stages.map(stage=>[stage.id,stage]));
    const scripts=JSON.parse(readFileSync(join(root,'package.json'),'utf8')).scripts;
    // One finite engineering successor preserves the old P05 assertions by
    // running them against their exact immutable prefix, not the extended head.
    // Normalize only that byte-reviewed wrapper; every other old alias stays exact.
    const baselineScripts={...scripts};
    if(scripts['test:p05:integration']==='node --import tsx scripts/db/run-p05-prefix-integration.ts'){
      if(hash(readFileSync(join(root,'scripts/db/run-p05-prefix-integration.ts')))!=='76873a320520bc157b46c96e334d6e3140be2e3de07163b753e8509dfe48259d')fail('exact isolated historical P05 prefix wrapper required');
      baselineScripts['test:p05:integration']='node --import tsx --test tests/integration/learning/learning-session-repository.test.ts';
    }
    if(hash(JSON.stringify(baselineScripts))!=='03f9365e2abc0a7a14f1c3d09d8b60a29461d57835197f9502a66ec2072cc4b7')fail('preserved package command aliases required for all baseline logical checks');
    const validators=[];
    for(const dir of readdirSync(join(root,'scripts'),{withFileTypes:true})) {
      if(!dir.isDirectory()||['tests','packaging','release'].includes(dir.name))continue;
      for(const name of readdirSync(join(root,'scripts',dir.name))) {
        const path=`scripts/${dir.name}/${name}`;
        if(/^(?:validate|audit)-.*\.mjs$/.test(name)&&path!=='scripts/architecture/validate-whole-repository.mjs')validators.push(path);
      }
    }
    // Keep the historical 53-validator consolidation baseline immutable. The
    // Exact admitted successors add capability names, demo semantics, and the
    // reviewed physical gate, all executed by the unchanged authority loop.
    const recipe = inspectRecipeRegistration(root); errors.push(...recipe.errors);
    const kitchen = inspectKitchenRegistration(root); errors.push(...kitchen.errors);
    const admittedValidators=['scripts/kernel/validate-capability-admission.mjs','scripts/kernel/validate-demo-runtime-registration.mjs','scripts/persistence/validate-demo-physical-admission.mjs',
      ...(recipe.present && recipe.errors.length===0 ? ['scripts/kernel/validate-demo-recipes-registration.mjs','scripts/persistence/validate-demo-recipes-physical-admission.mjs'] : []),
      ...(kitchen.present && kitchen.errors.length===0 ? ['scripts/kernel/validate-demo-kitchen-registration.mjs'] : [])];
    const requiredValidators=[...coverage.baseline_umbrella_validators,...admittedValidators].sort();
    if(JSON.stringify(validators.sort())!==JSON.stringify(requiredValidators))fail('complete baseline plus exact admitted standalone validator inventory required');
    if(hash(readFileSync(join(root,'scripts/db/replay-database-cleanup.mjs')))!=='54c2027a98ce883aa9f1a892a11b165eabe56353028a23c63cbf495a4887b388')fail('reviewed bounded replay cleanup helper identity required');
    if(hash(preservedProofBytes(root,'scripts/db/verify-slice-p05-generation.mjs'))!=='49869bd439098981b2df581dbae1d505e46af5a3c4dd07a1d1b780e034de32ce')fail('historical generator assertions must remain exact');
    for(const file of coverage.preserved_test_and_replay_files)if(hash(preservedProofBytes(root,file.path))!==file.sha256)fail(`preserved test/replay evidence changed: ${file.path}`);
    for(const producer of coverage.producer_command_mapping)for(const step of producer.steps)for(const item of step.coverage) {
      if(item.stages?.some(id=>!stages.has(id)))fail(`${producer.workflow}: mapped bounded stage missing`);
      if(item.kind==='bounded_stage') {
        const stage=stages.get(item.stages[0]);
        const expanded=item.command.startsWith('node scripts/verification/run-self-audit.mjs --stage ')?['node','scripts/verification/run-self-audit.mjs','--stage',stage?.id].join(' '):[stage?.command,...(stage?.args||[])].join(' ');
        // The target/snapshot stage intentionally groups two explicit node-test inputs.
        if(item.command!==expanded && !(item.stages[0]==='target-snapshots'&&stage?.args.includes(item.command.split(' ').at(-1))))fail(`${producer.workflow}: command no longer covered by its mapped stage`);
      } else if(item.kind==='umbrella_validator') {
        if(!validators.includes(item.validator)||stages.get('authority')?.args[0]!=='scripts/architecture/validate-whole-repository.mjs')fail('authority umbrella must execute every mapped validator');
        if(item.command.startsWith('pnpm ')&&scripts[item.command.slice(5)]!==`node ${item.validator}`)fail('package alias changed its mapped validator');
      } else if(item.kind==='live_foundation_inventory') {
        if(stages.get('foundation')?.discover_tests!=='src/modules'||item.test_files.some(path=>!coverage.preserved_test_and_replay_files.some(file=>file.path===path)))fail('complete live foundation test coverage required');
        if(scripts[item.command.slice(5)]!==`node --import tsx --test ${item.test_files.join(' ')}`)fail('foundation package alias changed its test coverage');
      } else if(!['shared_runner_setup','always_run_finalizer','complete_sharded_inventory','source_event_bound_argv'].includes(item.kind))fail('unknown coverage mapping kind');
    }
  } catch(error) { fail(error.message); }
  return errors;
}

// Keep the original P05 proof and assertions cryptographically intact. Only the
// finite historical-prefix setup changes for generation against the new head.
export function preservedProofBytes(root,path){
 const current=readFileSync(join(root,path),'utf8');
 if(path!=='scripts/db/verify-slice-p05-generation.mjs')return reconstructHistoricalReplay(path,current);
 const source=JSON.parse(readFileSync(join(root,'domains/demo-runtime/source-baseline.json'),'utf8')).files;
 const old=source[path];
 if(createHash('sha256').update(old).digest('hex')!=='49869bd439098981b2df581dbae1d505e46af5a3c4dd07a1d1b780e034de32ce')throw Error('immutable historical generation proof required');
 if(current===old)return current;
 const expected=old.replace('readFileSync, rmSync','readFileSync, readdirSync, rmSync').replace("  rmSync(join(dir, '0004_slice_p05_learning_session.sql'));\n  rmSync(join(dir, 'meta/0004_snapshot.json'));", "  for (const name of readdirSync(dir)) if (/^\\d{4}_/.test(name) && Number(name.slice(0,4)) >= 4) rmSync(join(dir,name));\n  for (const name of readdirSync(join(dir,'meta'))) if (/^\\d{4}_/.test(name) && Number(name.slice(0,4)) >= 4) rmSync(join(dir,'meta',name));").replace("join(root, 'drizzle.config.ts')","join(root, 'drizzle.p05.config.ts')");
 if(current!==expected||createHash('sha256').update(readFileSync(join(root,'drizzle.p05.config.ts'))).digest('hex')!=='b4ff41891077f5647a041a6ec1690b6407ce07841eb3eb9d670065036076f377')throw Error('exact historical generation prefix setup and unchanged assertions required');
 return old;
}

// Historical fixture projection only. Live CI requires the exact original
// three-suite wrapper and runs the recipe guard as its own bounded stage.
export function reconstructHistoricalDemoIntegration(current) {
  const digest=value=>createHash('sha256').update(value).digest('hex');
  const original='575b41278b354e0cfeb32a51f4b56f7719169772d19f4cdea5b83f2303222a62';
  if(digest(current)===original)return current;
  const addition = "'tests/integration/demo/recipe-content-guard.test.ts',";
  const label = 'Demo migration, owner storage, recipe guard and application integration PASS in four separate disposable databases';
  if (current.split(addition).length !== 2 || current.split(label).length !== 2) throw Error('exact bounded recipe integration suite addition required');
  const historical=current.replace(addition, '').replace(label, 'Demo migration, owner storage and application integration PASS in three separate disposable databases');
  if(digest(historical)!==original)throw Error('exact original isolated three-suite wrapper required');
  return historical;
}

// One exact, authenticated fixture-only predecessor. Preserve the original
// seventeen-declaration seal; never permit caller-supplied paths or bytes.
export function preservedRegistrationTestBytes(root) {
  const recovery = inspectDemoRecoveryRegistration(root);
  if (recovery.errors.length) throw Error(recovery.errors.join('; '));
  const path = 'scripts/tests/validate-demo-runtime-registration.mjs';
  return Object.hasOwn(recovery.predecessorSources, path)
    ? recovery.predecessorSources[path]
    : readFileSync(join(root, path), 'utf8');
}
