import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { lifecyclePhases, digest } from './workflow-lifecycle.mjs';

export const closureObserverPath = '.github/workflows/workflow-lifecycle-closure.yml';
export const closureObserverName = 'Workflow Lifecycle Closure';

export function workflowName(path, text) {
  const names = [...text.matchAll(/^name: ([A-Za-z0-9][A-Za-z0-9 -]*)\s*$/gm)];
  if (names.length !== 1) throw new Error(`${path}: one literal workflow name required`);
  return names[0][1].trim();
}

// The observer is deliberately a constrained template: editing its permissions,
// trigger, checkout, shell or execution steps requires a reviewed model change.
// Its own final upload cannot prove itself; an independent reader must close it.
export function renderClosureObserverWorkflow(producerNames) {
  if (!producerNames.length || new Set(producerNames).size !== producerNames.length ||
      producerNames.includes(closureObserverName) || producerNames.some(name => !/^[A-Za-z0-9][A-Za-z0-9 -]*$/.test(name))) {
    throw new Error('unique literal producer workflow names required; observer cannot observe itself');
  }
  return `name: ${closureObserverName}
on:
  workflow_run:
    workflows:
${[...producerNames].sort().map(name => `      - ${JSON.stringify(name)}`).join('\n')}
    types: [completed]
permissions:
  contents: read
  actions: read
jobs:
  close-workflow:
    runs-on: ubuntu-latest
    timeout-minutes: 15
    steps:
      - name: Checkout trusted default-branch observer source
        id: workflow_step_001
        uses: actions/checkout@v4
        with:
          ref: \${{ github.sha }}
          persist-credentials: false
      - name: Pin observer Node runtime
        id: workflow_step_002
        uses: actions/setup-node@v4
        with:
          node-version: '20'
      - name: Read authoritative run and retained evidence
        id: workflow_step_003
        env:
          GITHUB_TOKEN: \${{ secrets.GITHUB_TOKEN }}
          LIFECYCLE_RUN_ID: \${{ github.event.workflow_run.id }}
        run: timeout --signal=TERM --kill-after=2s 25s node scripts/verification/close-workflow-lifecycle.mjs "$GITHUB_REPOSITORY" --run "$LIFECYCLE_RUN_ID" verification/generated/workflow-closure
      - name: Retain independent closure evidence even on failure
        id: workflow_step_004
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: workflow-closure-\${{ github.event.workflow_run.id }}-observer-\${{ github.run_id }}-\${{ github.run_attempt }}
          path: verification/generated/workflow-closure/
          if-no-files-found: error
      - name: Record observer lifecycle checkpoint
        id: lifecycle_record
        if: always()
        env:
          LIFECYCLE_STEPS: \${{ toJson(steps) }}
          LIFECYCLE_JOB_STATUS: \${{ job.status }}
          LIFECYCLE_EXPECTED_SHA: \${{ github.sha }}
          LIFECYCLE_WORKFLOW_PATH: ${closureObserverPath}
        run: node scripts/verification/record-workflow-lifecycle.mjs
      - name: Retain observer evidence for independent terminal readback
        id: lifecycle_upload
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: workflow-lifecycle-\${{ github.run_id }}-\${{ github.run_attempt }}-\${{ github.job }}
          path: verification/generated/workflow-lifecycle/report.json
          if-no-files-found: error
`;
}

export function inspectClosureObserverText(text, producerNames) {
  try {
    return text === renderClosureObserverWorkflow(producerNames) ? [] : [
      'trusted closure observer template required: completed producer-name coverage, no recursion, default-source checkout, read-only permissions, bounded quoted invocation and always-retained evidence',
    ];
  } catch (error) { return [error.message]; }
}

// This parser intentionally accepts the repository's explicit jobs/steps form.
// Reusable/matrix/dynamic jobs require a reviewed inventory extension first.
export function inspectWorkflowText(path, text) {
  if ([...text.matchAll(/^jobs:\s*$/gm)].length!==1 || /\b(?:strategy|matrix|workflow_call):/.test(text)) throw new Error(`${path}: explicit jobs/steps required`);
  const starts = [...text.matchAll(/^  ([A-Za-z0-9_-]+):\s*$/gm)].filter(m => m.index > text.indexOf('\njobs:'));
  if (!starts.length) throw new Error(`${path}: workflow jobs missing`);
  return starts.map((match,i) => {
    const body = text.slice(match.index, starts[i+1]?.index ?? text.length);
    const parts = body.split(/^      - /m).slice(1);
    if (!parts.length) throw new Error(`${path}: explicit steps required`);
    const steps = parts.map(part => {
      const ids=[...part.matchAll(/^        id: ([a-zA-Z0-9_-]+)\s*$/gm)];
      if(ids.length!==1)throw new Error(`${path}: exactly one literal step id required`);
      const keys=[...part.matchAll(/^(?:        )?([a-z][a-z0-9-]*):/gm)].map(match=>match[1]);
      if(new Set(keys).size!==keys.length)throw new Error(`${path}: duplicate step fields forbidden`);
      const fields=Object.fromEntries([...part.matchAll(/^(?:        )?(name|uses|run): ([^\n]*)$/gm)].map(match=>[match[1],match[2]]));
      const literal=fields.name??(fields.uses?`Run ${fields.uses}`:fields.run&&!/^[|>]/.test(fields.run)?`Run ${fields.run}`:undefined);
      if(!literal||literal.includes('${{')||literal.trim()!==literal||/^["'&*!]/.test(literal))throw new Error(`${path}: literal step name or unnamed static single-line action/run required`);
      return {id:ids[0][1],name:literal,body:part};
    });
    if (steps.some(x=>!x.id) || new Set(steps.map(x=>x.id)).size !== steps.length) throw new Error(`${path}: every step needs a distinct id`);
    if(new Set(steps.map(x=>x.name)).size!==steps.length)throw new Error(`${path}: distinct literal step names required for authoritative readback`);
    const required = steps.filter(x=>!['lifecycle_record','lifecycle_upload'].includes(x.id));
    if (!required.length) throw new Error(`${path}: verification steps missing`);
    const jobNames=[...body.matchAll(/^    name: (.+)$/gm)];
    if(jobNames.length>1 || (jobNames.length && !/^[A-Za-z0-9][A-Za-z0-9 _-]*$/.test(jobNames[0][1])))throw new Error(`${path}: static distinct job name required`);
    const observer = path === closureObserverPath;
    return {workflow_path:path,workflow_name:workflowName(path,text),workflow_sha256:digest(text),job_id:match[1],job_name:jobNames[0]?.[1]||match[1],all_step_ids:steps.map(x=>x.id),all_step_names:steps.map(x=>x.name),required_steps:required.map(x=>x.id),
      kind:observer?'CLOSURE_OBSERVER':'VERIFICATION_PRODUCER',
      source_policy:observer?'TRUSTED_DEFAULT_BRANCH_SHA':'EXACT_VERIFICATION_SOURCE_SHA',
      closure_mode:observer?'INDEPENDENT_TERMINAL_READBACK_REQUIRED':'AUTOMATIC_WORKFLOW_RUN_OBSERVER',
      lifecycle_steps:steps.filter(x=>x.id.startsWith('lifecycle_')).map(x=>({id:x.id,body:x.body})),
      phases:[...lifecyclePhases], owner:'VerificationEvidence',verification_scope:'DEVELOPMENT_ONLY',
      effect:'READ_ONLY_DEVELOPMENT_VERIFICATION',failure_policy:'retain failed attempt; diagnose; start a separate attempt',
      closure_policy:'exact-source outcomes plus independently observed successful unexpired artifact receipt',
      cleanup:'runner-managed isolated job/service teardown; no shared database cleanup',
      hard_interruption:'missing report or receipt is incomplete; rerun creates a separate attempt',
      full_runtime_conformance:'UNKNOWN',shared_or_production_execution_authorized:false};
  }).map((row,index,rows)=>{
    if(rows.some((other,i)=>i!==index&&(other.job_id===row.job_id||other.job_name===row.job_name)))throw new Error(`${path}: unique job ids and names required`);
    return row;
  });
}
export function deriveWorkflowInventory(root) {
  const paths=readdirSync(join(root,'.github/workflows')).filter(p=>/\.ya?ml$/.test(p)).sort();
  const workflows=paths.map(p=>{const path=`.github/workflows/${p}`,text=readFileSync(join(root,path),'utf8');return {path,text,name:workflowName(path,text)};});
  if(new Set(workflows.map(row=>row.name)).size!==workflows.length)throw new Error('distinct workflow names required for authoritative observer coverage');
  const ci=workflows.flatMap(({path,text})=>inspectWorkflowText(path,text)).map(({lifecycle_steps,...row})=>row);
  const ledgerText=readFileSync(join(root,'verification/whole-repository/command-coverage.json'),'utf8');
  const ledger=JSON.parse(ledgerText);
  const product=ledger.commands.map(row=>({id:row.command,owner:row.owner,phases:[...lifecyclePhases],authority_requirements:row.authority_requirements,
    foundation_state:row.state,artifacts:row.artifacts,tests:row.tests,missing_obligations:row.missing_obligations,
    ingress:'UNKNOWN',authorization:'UNKNOWN',execution:row.state,verification:'FOUNDATION_EVIDENCE_ONLY',retention:'UNKNOWN',
    recovery:'canonical readback before retry; operation-specific policy remains required',closure:'BLOCKED',handoff:'BLOCKED',
    full_runtime_conformance:'UNKNOWN',runtime_activation:'BLOCKED',shared_or_production_execution_authorized:false}));
  return {version:'0.2.0',scope:'complete workflow lifecycle inventory; definitions and development evidence are separate from product implementation',
    adopted_by:'owner instruction, 2026-10-04 America/Chicago; issue #70',phases:[...lifecyclePhases],ci_workflows:paths.length,ci_jobs:ci.length,
    closure_observer:{workflow_path:closureObserverPath,workflow_name:closureObserverName,
      observed_workflows:workflows.filter(row=>row.path!==closureObserverPath).map(row=>row.name).sort(),
      activation:'REQUIRES_DEFAULT_BRANCH_PRESENCE',recursive_observation:false,own_retention:'INDEPENDENT_TERMINAL_READBACK_REQUIRED'},
    product_command_ledger_sha256:digest(ledgerText),ci,product,full_runtime_conformance:'UNKNOWN',runtime_activation:'BLOCKED',shared_or_production_execution_authorized:false};
}
