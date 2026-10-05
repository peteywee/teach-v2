#!/usr/bin/env node
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve,join } from 'node:path';
import { collectRunLifecycle,createGitHubReadback,validRepository } from './workflow-lifecycle-readback.mjs';
const [repository,mode,identity,destination]=process.argv.slice(2);
if(!validRepository(repository)||mode!=='--run'||!Number.isSafeInteger(Number(identity))||Number(identity)<1||!destination){console.error('usage: node scripts/verification/close-workflow-lifecycle.mjs OWNER/REPO --run RUN_ID OUTPUT_DIR');process.exit(1);}
const output=resolve(destination);mkdirSync(output,{recursive:true});
try {
 const report=await collectRunLifecycle(repository,Number(identity),{api:createGitHubReadback(repository)});
 writeFileSync(join(output,'summary.json'),JSON.stringify(report,null,2)+'\n');console.log(`WORKFLOW CLOSURE ${report.state}: ${report.closed_jobs}/${report.required_jobs} jobs; run ${report.run_id} attempt ${report.attempt}`);
 if(report.state!=='CLOSED')process.exitCode=1;
}catch(error){
 const report={kind:'workflow-lifecycle-readback',repository,run_id:Number(identity),state:'BLOCKED',errors:[error.message],handoff:'BLOCKED',full_runtime_conformance:'UNKNOWN',runtime_activation:'BLOCKED',shared_or_production_execution_authorized:false};
 writeFileSync(join(output,'summary.json'),JSON.stringify(report,null,2)+'\n');console.error(`WORKFLOW CLOSURE BLOCKED: ${error.message}`);process.exitCode=1;
}
