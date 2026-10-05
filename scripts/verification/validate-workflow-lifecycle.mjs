#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { join,resolve } from 'node:path';
import { deriveWorkflowInventory,inspectWorkflowText } from './workflow-lifecycle-inventory.mjs';
export function inspectWorkflowLifecycles(root) {
  const errors=[],fail=message=>errors.push(`workflow lifecycle: ${message}`);
  try {
    const inventory=deriveWorkflowInventory(root),stored=JSON.parse(readFileSync(join(root,'verification/workflow-lifecycle/inventory.json'),'utf8'));
    if(JSON.stringify(inventory)!==JSON.stringify(stored))fail('complete generated workflow/product inventory required');
    for(const row of inventory.ci) {
      const text=readFileSync(join(root,row.workflow_path),'utf8');
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
