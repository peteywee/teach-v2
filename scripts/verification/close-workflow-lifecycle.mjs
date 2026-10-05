#!/usr/bin/env node
// Read-only GitHub readback. Credentials are never written into evidence.
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { closeWorkflowReport } from './workflow-lifecycle.mjs';
const [repository, artifactId, output] = process.argv.slice(2);
if (!/^[\w.-]+\/[\w.-]+$/.test(repository || '') || !/^[1-9]\d*$/.test(artifactId || '') || !output) throw new Error('usage: node scripts/verification/close-workflow-lifecycle.mjs OWNER/REPO ARTIFACT_ID OUTPUT.json');
const headers={Accept:'application/vnd.github+json',...(process.env.GITHUB_TOKEN?{Authorization:`Bearer ${process.env.GITHUB_TOKEN}`}:{})};
const started=Date.now();
const deadline=AbortSignal.timeout(24000);
async function request(path){const result=await fetch(`https://api.github.com/repos/${repository}/${path}`,{headers,signal:deadline});if(!result.ok)throw new Error(`GitHub readback status ${result.status}`);return result;}
const dir=mkdtempSync(join(tmpdir(),'workflow-receipt-'));
try {
  const artifact=await (await request(`actions/artifacts/${artifactId}`)).json();
  if(artifact.expired || artifact.size_in_bytes>5_000_000)throw new Error('unexpired bounded artifact required');
  const run=await (await request(`actions/runs/${artifact.workflow_run.id}`)).json();
  if(run.status!=='completed')throw new Error('completed run required; checkpoint and retry readback later');
  const bytes=Buffer.from(await (await request(`actions/artifacts/${artifactId}/zip`)).arrayBuffer());
  if(bytes.length>5_000_000)throw new Error('archive exceeds bound');
  const archive=join(dir,'artifact.zip');writeFileSync(archive,bytes);
  const remaining=()=>Math.max(1,24000-(Date.now()-started));
  const entries=execFileSync('unzip',['-Z1',archive],{encoding:'utf8',timeout:remaining(),maxBuffer:100000}).trim().split('\n');
  if(entries.length!==1 || entries[0]!=='report.json')throw new Error('exact single checkpoint archive required');
  const report=JSON.parse(execFileSync('unzip',['-p',archive,'report.json'],{encoding:'utf8',timeout:remaining(),maxBuffer:1000000}));
  const commit=await (await request(`git/commits/${report.source.source_sha}`)).json();
  const workflow=await (await request(`contents/${report.workflow_path}?ref=${report.source.source_sha}`)).json();
  const workflowHash=createHash('sha256').update(Buffer.from(workflow.content,'base64')).digest('hex');
  const archiveHash=createHash('sha256').update(bytes).digest('hex');
  if(artifact.id!==Number(artifactId)||artifact.workflow_run.head_sha!==report.source.source_sha||run.head_sha!==report.source.source_sha||run.run_attempt!==report.attempt||workflowHash!==report.workflow_sha256||artifact.digest!==`sha256:${archiveHash}`)throw new Error('authoritative run/source/workflow/archive mismatch');
  const result=closeWorkflowReport(report,{run_id:run.id,attempt:run.run_attempt,job_id:report.job_id,workflow_path:report.workflow_path,workflow_sha256:workflowHash,source_sha:run.head_sha,tree_sha:commit.tree.sha,artifact_id:artifact.id,artifact_sha256:artifact.digest.slice(7),archive_sha256:archiveHash,artifact_report_sha256:report.report_sha256,artifact_expired:artifact.expired,upload_outcome:'success',run_conclusion:run.conclusion,artifact_name:artifact.name});
  writeFileSync(resolve(output),JSON.stringify(result,null,2)+'\n');
  console.log(`WORKFLOW CLOSURE ${result.state}`);if(result.state!=='CLOSED')process.exitCode=1;
} finally {rmSync(dir,{recursive:true,force:true});}
