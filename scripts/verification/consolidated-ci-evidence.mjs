import { readFileSync, readdirSync } from 'node:fs';
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
    const checkouts = steps.filter(step => /(?:^|\n        )uses: actions\/checkout@v4\n/.test(step));
    if (checkouts.length !== 1 || !/^          fetch-depth: 0$/m.test(checkouts[0]) || [...checkouts[0].matchAll(/^          fetch-depth:/gm)].length !== 1) fail('full-history credential-free document checkout required');
    if (inspectWorkflowText(path,workflow).length !== 1) fail('one explicit producer job required');
    if (!workflow.includes("node-version: '20.20.2'") || !workflow.includes('pnpm@12.8.1') || !workflow.includes('run: pnpm install --frozen-lockfile\n') || !workflow.includes('image: postgres:17.11-alpine') || !workflow.includes("TEACH_ISOLATED_DB: '1'") || !workflow.includes('timeout-minutes: 15')) fail('pinned runtime and isolated PostgreSQL required');
    const stages = [...workflow.matchAll(/^        run: node scripts\/verification\/run-self-audit\.mjs --stage ([a-z0-9-]+)$/gm)].map(match => match[1]);
    if (JSON.stringify(stages) !== JSON.stringify(plan?.stages?.map(stage => stage.id))) fail('complete ordered checkpoint workflow required');
    const identity = plan?.stages?.find(stage => stage.id === 'postgres-identity-commands');
    if (!stages.includes('postgres-identity-commands') || identity?.command !== 'pnpm' || JSON.stringify(identity?.args) !== JSON.stringify(['test:identity:commands:integration'])) fail('atomic Identity integration evidence must run in consolidated CI');
    const session = plan?.stages?.find(stage => stage.id === 'postgres-session-commands');
    if (!stages.includes('postgres-session-commands') || session?.command !== 'pnpm' || JSON.stringify(session?.args) !== JSON.stringify(['test:session:commands:integration'])) fail('session transaction PG automation required');
    if (!workflow.includes('if: always()\n        run: node scripts/verification/run-self-audit.mjs --finish\n') || !workflow.includes('if: always()\n        uses: actions/upload-artifact@v4') || !workflow.includes('          path: verification/generated/self-audit/\n          if-no-files-found: error')) fail('failed or missing audit evidence must finalize and be retained');
  } catch (error) { fail(error.message); }
  return errors;
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
    if(hash(JSON.stringify(scripts))!=='03f9365e2abc0a7a14f1c3d09d8b60a29461d57835197f9502a66ec2072cc4b7')fail('preserved package command aliases required for all baseline logical checks');
    const validators=[];
    for(const dir of readdirSync(join(root,'scripts'),{withFileTypes:true})) {
      if(!dir.isDirectory()||['tests','packaging','release'].includes(dir.name))continue;
      for(const name of readdirSync(join(root,'scripts',dir.name))) {
        const path=`scripts/${dir.name}/${name}`;
        if(/^(?:validate|audit)-.*\.mjs$/.test(name)&&path!=='scripts/architecture/validate-whole-repository.mjs')validators.push(path);
      }
    }
    if(JSON.stringify(validators.sort())!==JSON.stringify(coverage.baseline_umbrella_validators))fail('complete baseline standalone validator inventory required');
    for(const file of coverage.preserved_test_and_replay_files)if(hash(readFileSync(join(root,file.path)))!==file.sha256)fail(`preserved test/replay evidence changed: ${file.path}`);
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
