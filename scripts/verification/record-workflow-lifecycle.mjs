#!/usr/bin/env node
import { readFileSync,mkdirSync,writeFileSync } from 'node:fs';
import { join,resolve } from 'node:path';
import { sourceIdentity } from './development-self-audit.mjs';
import { buildWorkflowReport } from './workflow-lifecycle.mjs';
import { inspectWorkflowText } from './workflow-lifecycle-inventory.mjs';
const root=resolve(process.cwd()),env=process.env;
try {
  const path=env.LIFECYCLE_WORKFLOW_PATH;
  if (!/^\.github\/workflows\/[a-z0-9-]+\.ya?ml$/.test(path||'')) throw new Error('registered workflow path required');
  const definition=inspectWorkflowText(path,readFileSync(join(root,path),'utf8')).find(x=>x.job_id===env.GITHUB_JOB);
  if(!definition)throw new Error('registered workflow job required');
  const report=buildWorkflowReport({definition,context:{repository:env.GITHUB_REPOSITORY,workflow_source_sha:env.GITHUB_WORKFLOW_SHA,run_id:Number(env.GITHUB_RUN_ID),attempt:Number(env.GITHUB_RUN_ATTEMPT),job_id:env.GITHUB_JOB,event:env.GITHUB_EVENT_NAME,expected_sha:env.LIFECYCLE_EXPECTED_SHA},
    source:sourceIdentity(root),steps:JSON.parse(env.LIFECYCLE_STEPS||'null'),jobStatus:env.LIFECYCLE_JOB_STATUS});
  const output=join(root,'verification/generated/workflow-lifecycle');mkdirSync(output,{recursive:true});writeFileSync(join(output,'report.json'),JSON.stringify(report,null,2)+'\n');
  console.log(`WORKFLOW-LIFECYCLE ${JSON.stringify(report)}`);
  if(report.state!=='AWAITING_RECEIPT')process.exitCode=1;
}catch(error){console.error(`WORKFLOW LIFECYCLE BLOCKED: ${error.message}`);process.exitCode=1;}
