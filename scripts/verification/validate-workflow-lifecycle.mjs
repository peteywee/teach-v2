#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { join,resolve } from 'node:path';
import { closureObserverPath, deriveWorkflowInventory,inspectClosureObserverText,inspectWorkflowText } from './workflow-lifecycle-inventory.mjs';

export function inspectProducerWorkflowWiring(path,text) {
  const errors=[],fail=message=>errors.push(`${path}: ${message}`);
  // Explicit producer form only. Job-level overrides, error suppression and
  // conditional execution can otherwise make a green run omit required proof.
  const permissionBlocks=[...text.matchAll(/^([ \t]*)permissions:(.*)$/gm)];
  if(permissionBlocks.length!==1||permissionBlocks[0]?.[1]!==''||permissionBlocks[0]?.[2].trim()!==''||!/^permissions:\n  contents: read\n(?:\s*\n)*jobs:/m.test(text))fail('one top-level read-only contents permission block required');
  if(/^\s*(?:continue-on-error|secrets|environment):/m.test(text)||/^\s*[A-Za-z-]+: (?:write|write-all)\s*$/m.test(text))fail('suppressed failures, secret contexts and write permissions forbidden');
  if(/^    if:/m.test(text)||/^        if: (?!always\(\)\s*$).+/m.test(text))fail('required jobs and verification steps cannot be conditionally skipped');
  if(/^\s*[^#\n]+:\s*[&*!]/m.test(text)||/^\s*<<:/m.test(text))fail('YAML aliases, anchors, merges and tags require an explicit reviewed parser extension');
  const checkoutSteps=text.split(/^      - /m).slice(1).filter(body=>/(?:^|\n        )uses: actions\/checkout@/.test(body));
  for(const checkout of checkoutSteps) {
    if(!/(?:^|\n        )uses: actions\/checkout@v4\s*\n/.test(checkout)||
       [...checkout.matchAll(/^          ref: /gm)].length!==1||
       [...checkout.matchAll(/^          persist-credentials: /gm)].length!==1||
       !/^          ref: \$\{\{ github.event.pull_request.head.sha \|\| github.sha \}\}\s*$/m.test(checkout)||
       !/^          persist-credentials: false\s*$/m.test(checkout)||
       /^          (?:repository|path|sparse-checkout|submodules):/m.test(checkout))fail('checkout must use exact verification source with credentials disabled and no alternate source');
  }
  if(!checkoutSteps.length)fail('explicit exact-source checkout step required');
  try {
    const jobs=inspectWorkflowText(path,text);
    for(const job of jobs) {
      const record=job.lifecycle_steps.find(x=>x.id==='lifecycle_record')?.body||'',upload=job.lifecycle_steps.find(x=>x.id==='lifecycle_upload')?.body||'';
      const recordBehavior=record.replace(/^name: [^\n]*\n/,'').trimEnd();
      const expectedRecord=`        id: lifecycle_record\n        if: always()\n        env:\n          LIFECYCLE_STEPS: \${{ toJson(steps) }}\n          LIFECYCLE_JOB_STATUS: \${{ job.status }}\n          LIFECYCLE_EXPECTED_SHA: \${{ github.event.pull_request.head.sha || github.sha }}\n          LIFECYCLE_WORKFLOW_PATH: ${path}\n        run: node scripts/verification/record-workflow-lifecycle.mjs`;
      if(recordBehavior!==expectedRecord)fail('exact always-run lifecycle capture wiring required');
      const uploadBehavior=upload.replace(/^name: [^\n]*\n/,'').trimEnd();
      const expectedUpload='        id: lifecycle_upload\n        if: always()\n        uses: actions/upload-artifact@v4\n        with:\n          name: workflow-lifecycle-${{ github.run_id }}-${{ github.run_attempt }}-${{ github.job }}\n          path: verification/generated/workflow-lifecycle/report.json\n          if-no-files-found: error';
      if(uploadBehavior!==expectedUpload)fail('exact always-run lifecycle retention wiring required');
      if(job.all_step_ids.slice(-2).join(',')!=='lifecycle_record,lifecycle_upload')fail('record then retain must be final job steps');
    }
  }catch(error){fail(error.message);}
  return errors;
}

export function inspectWorkflowLifecycles(root) {
  const errors=[],fail=message=>errors.push(`workflow lifecycle: ${message}`);
  try {
    const inventory=deriveWorkflowInventory(root),stored=JSON.parse(readFileSync(join(root,'verification/workflow-lifecycle/inventory.json'),'utf8'));
    if(JSON.stringify(inventory)!==JSON.stringify(stored))fail('complete generated workflow/product inventory required');
    const observer=inventory.ci.filter(row=>row.workflow_path===closureObserverPath);
    if(observer.length!==1)fail('exactly one non-recursive closure observer job required');
    for(const row of inventory.ci) {
      const text=readFileSync(join(root,row.workflow_path),'utf8');
      if(row.workflow_path===closureObserverPath){
        for(const error of inspectClosureObserverText(text,inventory.closure_observer.observed_workflows))fail(`${row.workflow_path}: ${error}`);
        continue;
      }
      for(const error of inspectProducerWorkflowWiring(row.workflow_path,text))fail(error);
      if(!text.includes('permissions:\n  contents: read')||/\b(?:contents|issues|pull-requests|id-token): write/.test(text))fail(`${row.workflow_path}: read-only job permissions required`);
      if(!text.includes('ref: ${{ github.event.pull_request.head.sha || github.sha }}')||!text.includes('persist-credentials: false'))fail(`${row.workflow_path}: exact source checkout required`);
      if(!text.includes('timeout-minutes: 15')||!text.includes("node-version: '20'"))fail(`${row.workflow_path}: bounded job and pinned Node required`);
      const job=inspectWorkflowText(row.workflow_path,text).find(x=>x.job_id===row.job_id),steps=job.lifecycle_steps;
      const record=steps.find(x=>x.id==='lifecycle_record')?.body||'',upload=steps.find(x=>x.id==='lifecycle_upload')?.body||'';
      if(!record.includes('if: always()')||!record.includes('run: node scripts/verification/record-workflow-lifecycle.mjs')||!record.includes('LIFECYCLE_STEPS: ${{ toJson(steps) }}')||!record.includes('LIFECYCLE_JOB_STATUS: ${{ job.status }}')||!record.includes('LIFECYCLE_EXPECTED_SHA: ${{ github.event.pull_request.head.sha || github.sha }}')||!record.includes(`LIFECYCLE_WORKFLOW_PATH: ${row.workflow_path}`))fail(`${row.workflow_path}: always-run exact-source outcome capture required`);
      if(!upload.includes('if: always()')||!upload.includes('uses: actions/upload-artifact@v4')||!upload.includes('name: workflow-lifecycle-${{ github.run_id }}-${{ github.run_attempt }}-${{ github.job }}')||!upload.includes('path: verification/generated/workflow-lifecycle/report.json')||!upload.includes('if-no-files-found: error'))fail(`${row.workflow_path}: distinct failure/success artifact receipt required`);
      if(text.indexOf('id: lifecycle_record')>text.indexOf('id: lifecycle_upload')||!text.trimEnd().endsWith('if-no-files-found: error'))fail(`${row.workflow_path}: record then retain must be final steps`);
    }
    const audit=readFileSync(join(root,'.github/workflows/development-self-audit.yml'),'utf8');
    if(!audit.includes('run: node scripts/verification/run-self-audit.mjs --stage lifecycle-regressions'))fail('automatic lifecycle recovery/closure regression stage required');
  }catch(error){fail(error.message);}
  return errors;
}
if(process.argv[1]&&resolve(process.argv[1])===resolve(new URL(import.meta.url).pathname)){
 const errors=inspectWorkflowLifecycles(resolve(process.cwd()));if(errors.length){console.error(errors.join('\n'));process.exit(1);}console.log('WORKFLOW LIFECYCLE GATE PASS: every CI job and approved command inventoried; product closure BLOCKED');
}
