import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { inspectWorkflowText } from './workflow-lifecycle-inventory.mjs';
import { closeWorkflowReport } from './workflow-lifecycle.mjs';

const sha = value => typeof value === 'string' && /^[a-f0-9]{40}$/.test(value);
const positive = value => Number.isSafeInteger(value) && value > 0;
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const check = (condition, message) => { if (!condition) throw new Error(message); };
export const validRepository = value => typeof value === 'string' && /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(value) && !value.split('/').some(x => ['.','..'].includes(x));

// Decode a single bounded JSON member without extracting paths or executing code.
export function decodeCheckpointArchive(bytes, { remainingMs = () => 5000 } = {}) {
  check(Buffer.isBuffer(bytes) && bytes.length > 0 && bytes.length <= 5_000_000, 'bounded artifact archive required');
  const dir = mkdtempSync(join(tmpdir(), 'teach-lifecycle-readback-'));
  try {
    const path = join(dir, 'checkpoint.zip'); writeFileSync(path, bytes);
    const options = () => ({ encoding:'utf8', timeout:Math.max(1, Math.min(5000, remainingMs())), maxBuffer:1_000_000 });
    const names = execFileSync('unzip', ['-Z1', path], options()).trim().split('\n');
    check(names.length === 1 && names[0] === 'report.json', 'exact single report.json member required');
    return JSON.parse(execFileSync('unzip', ['-p', path, 'report.json'], options()));
  } finally { rmSync(dir, { recursive:true, force:true }); }
}

// Only this adapter holds a token. Redirected artifact reads never receive it.
export function createGitHubReadback(repository, { token = process.env.GITHUB_TOKEN, fetchImpl = fetch, timeoutMs = 24000 } = {}) {
  check(validRepository(repository), 'valid repository required');
  check(Number.isSafeInteger(timeoutMs) && timeoutMs > 0 && timeoutMs <= 24000, 'bounded readback deadline required');
  const started = Date.now(), signal = AbortSignal.timeout(timeoutMs);
  const remainingMs = () => Math.max(1, timeoutMs - (Date.now() - started));
  const headers = { Accept:'application/vnd.github+json', ...(token ? { Authorization:`Bearer ${token}` } : {}) };
  async function limited(response, limit) {
    check(response.ok, `GitHub readback HTTP ${response.status}`);
    const length = response.headers.get('content-length');
    if (length !== null) check(Number(length) <= limit, 'readback response exceeds limit');
    const reader = response.body.getReader(); const chunks=[]; let size=0;
    try { while (true) { const {done,value}=await reader.read(); if(done)break; size+=value.length; check(size<=limit,'readback response exceeds limit'); chunks.push(Buffer.from(value)); } }
    finally { await reader.cancel().catch(()=>{}); }
    return Buffer.concat(chunks);
  }
  async function request(path, binary) {
    check(typeof path === 'string' && !path.startsWith('/') && !path.includes('..') && !path.includes('://'), 'relative GitHub API path required');
    let response = await fetchImpl(`https://api.github.com/repos/${repository}/${path}`, { headers, signal, redirect:'manual' });
    if (binary && response.status === 302) {
      const location = new URL(response.headers.get('location'));
      check(location.protocol === 'https:' && !location.username && !location.password, 'HTTPS artifact redirect required');
      response = await fetchImpl(location.href, { signal, redirect:'error' });
    }
    return limited(response, binary ? 5_000_000 : 2_000_000);
  }
  return { remainingMs, getJson:async path => JSON.parse((await request(path,false)).toString('utf8')), getBytes:path => request(path,true) };
}

function normalizeWorkflowPath(value) {
  check(typeof value==='string' && /^\.github\/workflows\/[a-z0-9-]+\.ya?ml(?:@[A-Za-z0-9_./-]+)?$/.test(value), 'registered upstream workflow path required');
  return value.split('@')[0];
}

function assertRun(repository, run, runId) {
  check(run?.id === runId && positive(run.run_attempt) && sha(run.head_sha), 'exact run/attempt/source identity required');
  check(run.repository?.full_name === repository, 'run repository mismatch');
  check(run.status === 'completed', 'completed upstream run required');
  check(['push','pull_request','workflow_dispatch','workflow_run'].includes(run.event), 'unsupported upstream event');
  normalizeWorkflowPath(run.path);
}

function verifyActualJob(definition, run, job, report) {
  check(job?.run_id === run.id && job.head_sha === run.head_sha && job.status === 'completed', 'completed exact-source job required');
  if (job.run_attempt !== undefined) check(job.run_attempt === run.run_attempt, 'job attempt mismatch');
  check(job.name === (definition.job_name || definition.job_id), 'job name mismatch');
  check(Array.isArray(job.steps) && new Set(job.steps.map(x => x.number)).size === job.steps.length, 'distinct GitHub job steps required');
  const ids = definition.all_step_ids, names=definition.all_step_names;
  check(Array.isArray(ids) && Array.isArray(names) && ids.length===names.length && new Set(names).size===names.length, 'exact static step identity model required');
  const positions=names.map(name=>job.steps.map((step,index)=>step.name===name?index:-1).filter(index=>index>=0));
  check(positions.every(matches=>matches.length===1), 'unique declared GitHub step names required');
  const offset=positions[0][0];
  check(offset>0 && positions.every((matches,index)=>matches[0]===offset+index), 'declared GitHub steps must run in exact contiguous order');
  check(job.steps.slice(0,offset).every(step=>['Set up job','Initialize containers'].includes(step.name)&&step.status==='completed'&&step.conclusion==='success'), 'successful known runner setup required');
  for (const [index,id] of ids.entries()) {
    const actual=job.steps[offset+index];
    check(actual.status==='completed', `completed GitHub step required: ${id}`);
    if (id==='lifecycle_record'||id==='lifecycle_upload') check(actual.conclusion==='success', `successful GitHub evidence step required: ${id}`);
    else {
      const observed=report.outcomes?.find(x=>x.id===id);
      check(observed && actual.conclusion===observed.conclusion, `GitHub step outcome mismatch: ${id}`);
    }
  }
  return job.conclusion;
}

export async function collectRunLifecycle(repository, runId, { api, decodeArchive = decodeCheckpointArchive, now = () => Date.now() } = {}) {
  check(validRepository(repository) && positive(runId), 'valid repository and run ID required');
  api ??= createGitHubReadback(repository);
  const run = await api.getJson(`actions/runs/${runId}`); assertRun(repository,run,runId);
  const rawWorkflowPath=run.path; run.path=normalizeWorkflowPath(run.path);
  const [commit, workflow, artifactsPage, jobsPage] = await Promise.all([
    api.getJson(`git/commits/${run.head_sha}`),
    api.getJson(`contents/${run.path}?ref=${run.head_sha}`),
    api.getJson(`actions/runs/${run.id}/artifacts?per_page=100`),
    api.getJson(`actions/runs/${run.id}/attempts/${run.run_attempt}/jobs?per_page=100`),
  ]);
  check(commit?.sha === run.head_sha && sha(commit.tree?.sha), 'canonical commit/tree required');
  check(workflow?.encoding === 'base64' && typeof workflow.content === 'string' && workflow.path === run.path, 'pinned workflow content required');
  const workflowBytes=Buffer.from(workflow.content,'base64'); check(workflowBytes.length <= 200_000, 'bounded workflow definition required');
  const definitions=inspectWorkflowText(run.path,workflowBytes.toString('utf8'));
  check(definitions.length > 0 && definitions.length <= 20, 'bounded explicit job inventory required');
  check(Array.isArray(artifactsPage?.artifacts) && artifactsPage.total_count === artifactsPage.artifacts.length && artifactsPage.total_count <= 100, 'complete artifact page required');
  check(Array.isArray(jobsPage?.jobs) && jobsPage.total_count === jobsPage.jobs.length && jobsPage.total_count === definitions.length, 'complete matching job inventory required');
  const results=[];
  for (const definition of definitions) {
    try {
      const name=`workflow-lifecycle-${run.id}-${run.run_attempt}-${definition.job_id}`;
      const artifacts=artifactsPage.artifacts.filter(x=>x.name===name); check(artifacts.length===1,'exactly one current-attempt artifact required');
      const artifact=artifacts[0];
      check(positive(artifact.id) && artifact.expired===false && artifact.size_in_bytes>0 && artifact.size_in_bytes<=5_000_000 && Number.isFinite(Date.parse(artifact.expires_at)) && Date.parse(artifact.expires_at)>now(), 'unexpired bounded artifact required');
      check(artifact.workflow_run?.id===run.id && artifact.workflow_run.head_sha===run.head_sha && artifact.workflow_run.repository_id===run.repository.id, 'artifact run/source/repository mismatch');
      const archive=await api.getBytes(`actions/artifacts/${artifact.id}/zip`);
      check(artifact.digest===`sha256:${hash(archive)}`, 'retained archive digest mismatch');
      const report=decodeArchive(archive,{remainingMs:api.remainingMs});
      check(report.workflow_source_sha===run.head_sha, 'actual workflow definition source is not canonically proven for this event');
      const jobs=jobsPage.jobs.filter(x=>x.name===(definition.job_name||definition.job_id));check(jobs.length===1,'exactly one upstream job required');
      const jobConclusion=verifyActualJob(definition,run,jobs[0],report);
      const currentArtifact=await api.getJson(`actions/artifacts/${artifact.id}`);
      check(currentArtifact.id===artifact.id && currentArtifact.digest===artifact.digest && currentArtifact.expired===false && currentArtifact.name===artifact.name && currentArtifact.workflow_run?.id===run.id && currentArtifact.expires_at===artifact.expires_at,'artifact changed or disappeared during readback');
      const receipt={ repository,workflow_source_sha:report.workflow_source_sha,workflow_source_verified:true,run_id:run.id,attempt:run.run_attempt,event:run.event,job_id:definition.job_id,workflow_path:run.path,workflow_sha256:hash(workflowBytes),source_sha:run.head_sha,tree_sha:commit.tree.sha,
        observed_at:new Date(now()).toISOString(),artifact_expires_at:new Date(artifact.expires_at).toISOString(),artifact_id:artifact.id,artifact_name:artifact.name,artifact_sha256:artifact.digest.slice(7),archive_sha256:hash(archive),artifact_report_sha256:report.report_sha256,artifact_expired:artifact.expired,
        upload_outcome:'success',run_conclusion:run.conclusion,job_conclusion:jobConclusion };
      results.push({job_id:definition.job_id,artifact_id:artifact.id,...closeWorkflowReport(report,receipt,{definition})});
    } catch(error) { results.push({job_id:definition.job_id,state:'BLOCKED',verification:'UNKNOWN',errors:[error.message],handoff:'BLOCKED'}); }
  }
  // Reconcile the run after independently rechecking each retained artifact.
  const finalRun=await api.getJson(`actions/runs/${runId}`);assertRun(repository,finalRun,runId);
  check(finalRun.run_attempt===run.run_attempt && finalRun.head_sha===run.head_sha && finalRun.path===rawWorkflowPath && finalRun.conclusion===run.conclusion,'upstream run changed during readback');
  const closed=run.conclusion==='success' && results.length===definitions.length && results.every(x=>x.state==='CLOSED');
  return {version:'0.1.0',kind:'workflow-lifecycle-readback',repository,run_id:run.id,attempt:run.run_attempt,event:run.event,source_sha:run.head_sha,tree_sha:commit.tree.sha,workflow_path:run.path,
    observed_at:new Date(now()).toISOString(),state:closed?'CLOSED':'BLOCKED',required_jobs:definitions.length,closed_jobs:results.filter(x=>x.state==='CLOSED').length,results,
    handoff:closed?'DEVELOPMENT_EVIDENCE_ONLY':'BLOCKED',full_runtime_conformance:'UNKNOWN',runtime_activation:'BLOCKED',shared_or_production_execution_authorized:false};
}
