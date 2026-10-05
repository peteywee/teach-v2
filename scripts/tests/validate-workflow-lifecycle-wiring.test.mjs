import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chmodSync,cpSync,mkdirSync,mkdtempSync,readFileSync,rmSync,writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { closureObserverName,closureObserverPath,deriveWorkflowInventory,inspectClosureObserverText,inspectWorkflowText,renderClosureObserverWorkflow } from '../verification/workflow-lifecycle-inventory.mjs';
import { inspectProducerWorkflowWiring,inspectWorkflowLifecycles } from '../verification/validate-workflow-lifecycle.mjs';

const root=new URL('../..',import.meta.url).pathname;
const inventory=deriveWorkflowInventory(root),names=inventory.closure_observer.observed_workflows;
const observer=readFileSync(join(root,closureObserverPath),'utf8');
const producerPath='.github/workflows/semantic-kernel.yml',producer=readFileSync(join(root,producerPath),'utf8');

test('observer covers every producer exactly once and preserves independent terminal readback',()=>{
  assert.equal(names.length,inventory.ci_workflows-1);
  assert.equal(new Set(names).size,names.length);
  assert.ok(!names.includes(closureObserverName));
  assert.deepEqual(inspectClosureObserverText(observer,names),[]);
  const row=inventory.ci.find(row=>row.workflow_path===closureObserverPath);
  assert.equal(row.kind,'CLOSURE_OBSERVER');
  assert.equal(row.source_policy,'TRUSTED_DEFAULT_BRANCH_SHA');
  assert.equal(row.closure_mode,'INDEPENDENT_TERMINAL_READBACK_REQUIRED');
  assert.equal(inventory.closure_observer.recursive_observation,false);
  assert.equal(inventory.closure_observer.activation,'REQUIRES_DEFAULT_BRANCH_PRESENCE');
  assert.equal(row.shared_or_production_execution_authorized,false);
});

const observerMutations={
  'triggering PR source':text=>text.replace('ref: ${{ github.sha }}','ref: ${{ github.event.workflow_run.head_sha }}'),
  'mutable branch source':text=>text.replace('ref: ${{ github.sha }}','ref: main'),
  'persisted credential':text=>text.replace('persist-credentials: false','persist-credentials: true'),
  'contents write':text=>text.replace('contents: read','contents: write'),
  'actions write':text=>text.replace('actions: read','actions: write'),
  'job permission override':text=>text.replace('    runs-on:', '    permissions: write-all\n    runs-on:'),
  'OIDC escalation':text=>text.replace('  actions: read','  actions: read\n  id-token: write'),
  'live token shell interpolation':text=>text.replace('"$LIFECYCLE_RUN_ID"','"${{ github.event.workflow_run.id }}"'),
  'attacker branch shell interpolation':text=>text.replace('--run "$LIFECYCLE_RUN_ID"','--run "${{ github.event.workflow_run.head_branch }}"'),
  'unquoted run ID':text=>text.replace('"$LIFECYCLE_RUN_ID"','$LIFECYCLE_RUN_ID'),
  'unbounded invocation':text=>text.replace('timeout --signal=TERM --kill-after=2s 25s ',''),
  'node runtime drift':text=>text.replace("node-version: '20'","node-version: '22'"),
  'missing producer':text=>text.replace(`      - ${JSON.stringify(names[0])}\n`,''),
  'recursive observer trigger':text=>text.replace('    types: [completed]',`      - ${JSON.stringify(closureObserverName)}\n    types: [completed]`),
  'started instead of completed':text=>text.replace('types: [completed]','types: [requested]'),
  'success-only closure':text=>text.replace('    runs-on:','    if: github.event.workflow_run.conclusion == \'success\'\n    runs-on:'),
  'suppressed collector failure':text=>text.replace('        env:\n          GITHUB_TOKEN:','        continue-on-error: true\n        env:\n          GITHUB_TOKEN:'),
  'omitted failure evidence':text=>text.replace('        if: always()','        if: success()'),
  'missing evidence accepted':text=>text.replace('if-no-files-found: error','if-no-files-found: ignore'),
  'duplicate trigger override':text=>`${text}on: pull_request_target\n`,
  'untrusted artifact execution':text=>text.replace('      - name: Record observer','      - run: node verification/generated/workflow-closure/untrusted.mjs\n        id: injected\n      - name: Record observer'),
};
for(const [name,mutate] of Object.entries(observerMutations))test(`observer rejects ${name}`,()=>{
  const altered=mutate(observer);assert.notEqual(altered,observer);assert.ok(inspectClosureObserverText(altered,names).length>0);
});
test('observer generator refuses duplicate names, recursion and YAML/shell names',()=>{
  for(const bad of [[names[0],names[0]],[...names,closureObserverName],[...names,'x\non: pull_request_target'],[...names,'${{ github.event.name }}'],[]])assert.throws(()=>renderClosureObserverWorkflow(bad));
});

test('producer retains existing job/step identity and gates',()=>{
  assert.deepEqual(inspectProducerWorkflowWiring(producerPath,producer),[]);
  for(const row of inspectWorkflowText(producerPath,producer)){
    assert.equal(row.job_name,row.job_id);
    assert.equal(row.all_step_names.length,row.all_step_ids.length);
    assert.equal(new Set(row.all_step_names).size,row.all_step_names.length);
    assert.deepEqual(row.all_step_ids.slice(-2),['lifecycle_record','lifecycle_upload']);
    assert.deepEqual(row.all_step_ids.slice(0,-2),row.required_steps);
  }
});
const producerMutations={
  'job permissions override':text=>text.replace('    runs-on:','    permissions: write-all\n    runs-on:'),
  'step failure suppression':text=>text.replace('        id: lifecycle_record','        continue-on-error: true\n        id: lifecycle_record'),
  'job conditional skip':text=>text.replace('    runs-on:','    if: false\n    runs-on:'),
  'capture conditional skip':text=>text.replace('        if: always()','        if: false'),
  'upload command masking':text=>text.replace('        uses: actions/upload-artifact@v4','        uses: actions/upload-artifact@v4\n        continue-on-error: true'),
  'duplicate capture run key':text=>text.replace('        run: node scripts/verification/record-workflow-lifecycle.mjs','        run: node scripts/verification/record-workflow-lifecycle.mjs\n        run: true'),
  'duplicate capture condition':text=>text.replace('        id: lifecycle_record','        id: lifecycle_record\n        if: false'),
  'comment pretending capture command':text=>text.replace('        run: node scripts/verification/record-workflow-lifecycle.mjs','        # run: node scripts/verification/record-workflow-lifecycle.mjs\n        run: true'),
  'capture command followed by success':text=>text.replace('run: node scripts/verification/record-workflow-lifecycle.mjs','run: node scripts/verification/record-workflow-lifecycle.mjs || true'),
  'production environment':text=>text.replace('    runs-on:','    environment: production\n    runs-on:'),
  'actions write permission':text=>text.replace('  contents: read','  contents: read\n  actions: write'),
  'altered checkout hidden by comment':text=>text.replace('ref: ${{ github.event.pull_request.head.sha || github.sha }}','ref: main\n          # ref: ${{ github.event.pull_request.head.sha || github.sha }}'),
  'alternate repository checkout':text=>text.replace('          persist-credentials: false','          repository: attacker/other\n          persist-credentials: false'),
  'duplicate checkout action':text=>text.replace('uses: actions/checkout@v4','uses: actions/checkout@v4\n        uses: attacker/checkout@main'),
  'duplicate credential override':text=>text.replace('          persist-credentials: false','          persist-credentials: false\n          persist-credentials: true'),
  'YAML alias':text=>text.replace('    runs-on: ubuntu-latest','    runs-on: &runner ubuntu-latest'),
};
for(const [name,mutate] of Object.entries(producerMutations))test(`producer rejects ${name}`,()=>{
  const altered=mutate(producer);assert.notEqual(altered,producer);assert.ok(inspectProducerWorkflowWiring(producerPath,altered).length>0);
});
test('job names must be static and step identity cannot be overridden',()=>{
  assert.throws(()=>inspectWorkflowText(producerPath,producer.replace('    runs-on:','    name: ${{ github.head_ref }}\n    runs-on:')),/static distinct job name/);
  assert.throws(()=>inspectWorkflowText(producerPath,producer.replace('        id: lifecycle_record','        id: lifecycle_record\n        id: overwrite')),/one literal step id/);
});
test('actual API step names remain unambiguous and cannot be dynamic',()=>{
  const row=inspectWorkflowText(producerPath,producer)[0];
  assert.equal(row.all_step_names.at(-2),'Record workflow lifecycle checkpoint');
  assert.equal(row.all_step_names.at(-1),'Retain workflow lifecycle evidence');
  assert.throws(()=>inspectWorkflowText(producerPath,producer.replace('name: Record workflow lifecycle checkpoint','name: ${{ github.head_ref }}')),/literal step name/);
  assert.throws(()=>inspectWorkflowText(producerPath,producer.replace('name: Retain workflow lifecycle evidence','name: Record workflow lifecycle checkpoint')),/distinct literal step names/);
  const path='.github/workflows/application-interface-authority.yml';
  const text=readFileSync(join(root,path),'utf8'),unnamed=inspectWorkflowText(path,text)[0];
  assert.ok(unnamed.all_step_names.includes('Run node scripts/application-interfaces/validate-application-interface-authority.mjs'));
  assert.throws(()=>inspectWorkflowText(path,text.replace('run: node scripts/application-interfaces/validate-application-interface-authority.mjs','run: |\n          node scripts/application-interfaces/validate-application-interface-authority.mjs')),/literal step name/);
});

test('runner service setup is derived only from the exact job service or container declaration',()=>{
  assert.equal(inspectWorkflowText(producerPath,producer)[0].has_service_setup,false);
  for(const path of ['.github/workflows/development-self-audit.yml','.github/workflows/slice-p05-implementation.yml']){
    const row=inspectWorkflowText(path,readFileSync(join(root,path),'utf8'))[0];
    assert.equal(row.has_service_setup,true);
    assert.ok(row.required_steps.every(id=>!/[a-f0-9]{32}/.test(id)));
  }
  assert.equal(inspectWorkflowText(producerPath,producer.replace('    runs-on:','    container: node:20\n    runs-on:'))[0].has_service_setup,true);
  for(const misleading of ['    # services: example\n','        # container: example\n'])assert.equal(inspectWorkflowText(producerPath,producer.replace('    runs-on:',`${misleading}    runs-on:`))[0].has_service_setup,false);
});

test('document governance uses the exact event base with a complete credential-free checkout',()=>{
  const text=readFileSync(join(root,'.github/workflows/document-governance.yml'),'utf8');
  assert.match(text,/^          DOCUMENT_BASE_SHA: \$\{\{ github.event.pull_request.base.sha \|\| github.event.before \}\}$/m);
  assert.match(text,/^          fetch-depth: 0$/m);
  assert.match(text,/^          persist-credentials: false$/m);
  assert.doesNotMatch(text,/persist-credentials: true|git fetch|github.base_ref/);
  const stage=text.split('      - name: Validate document metadata\n')[1].split('      - name: Record workflow lifecycle checkpoint')[0];
  const script=stage.split('        run: |\n')[1].split('\n').map(line=>line.replace(/^          /,'')).join('\n');
  assert.doesNotMatch(script,/\$\{\{/);
  const fixture=mkdtempSync(join(tmpdir(),'teach-document-base-'));
  try{
    writeFileSync(join(fixture,'node'),'#!/bin/sh\nprintf \'%s\\0\' "$@"\n');chmodSync(join(fixture,'node'),0o755);
    writeFileSync(join(fixture,'git'),'#!/bin/sh\nexit 97\n');chmodSync(join(fixture,'git'),0o755);
    const validate=base=>execFileSync('/bin/bash',['-c',script],{env:{PATH:fixture,DOCUMENT_BASE_SHA:base},encoding:'utf8',timeout:5000}).split('\0').slice(0,-1);
    for(const base of ['', '0'.repeat(40)])assert.deepEqual(validate(base),['scripts/docs/validate-document-metadata.mjs']);
    for(const base of ['a'.repeat(40),'b'.repeat(40),'base with spaces; exit 99'])assert.deepEqual(validate(base),['scripts/docs/validate-document-metadata.mjs','--base',base]);
    writeFileSync(join(fixture,'node'),'#!/bin/sh\nexit 42\n');
    assert.throws(()=>validate('a'.repeat(40)),error=>error.status===42);
  }finally{rmSync(fixture,{recursive:true,force:true});}
});

test('generated inventory alone cannot approve an unsafe observer or omit it',()=>{
  const fixture=mkdtempSync(join(tmpdir(),'teach-lifecycle-wiring-'));
  try{
    cpSync(join(root,'.github'),join(fixture,'.github'),{recursive:true});
    mkdirSync(join(fixture,'verification/whole-repository'),{recursive:true});
    mkdirSync(join(fixture,'verification/workflow-lifecycle'),{recursive:true});
    cpSync(join(root,'verification/whole-repository/command-coverage.json'),join(fixture,'verification/whole-repository/command-coverage.json'));
    const regenerate=()=>writeFileSync(join(fixture,'verification/workflow-lifecycle/inventory.json'),JSON.stringify(deriveWorkflowInventory(fixture)));
    regenerate();assert.deepEqual(inspectWorkflowLifecycles(fixture),[]);
    writeFileSync(join(fixture,closureObserverPath),observerMutations['contents write'](observer));
    regenerate();assert.ok(inspectWorkflowLifecycles(fixture).some(error=>error.includes('trusted closure observer')));
    rmSync(join(fixture,closureObserverPath));regenerate();
    assert.ok(inspectWorkflowLifecycles(fixture).some(error=>error.includes('exactly one non-recursive')));
  }finally{rmSync(fixture,{recursive:true,force:true});}
});
