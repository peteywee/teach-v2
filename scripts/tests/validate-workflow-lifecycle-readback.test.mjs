import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { buildWorkflowReport,reportDigest } from '../verification/workflow-lifecycle.mjs';
import { inspectWorkflowText } from '../verification/workflow-lifecycle-inventory.mjs';
import { collectRunLifecycle,createGitHubReadback,decodeCheckpointArchive } from '../verification/workflow-lifecycle-readback.mjs';
const hash=b=>createHash('sha256').update(b).digest('hex');
function fixture(){
 const repository='peteywee/teach-v2',runId=100,source='a'.repeat(40),tree='b'.repeat(40),path='.github/workflows/relationship-discovery.yml';
 const text=readFileSync(new URL('../../'+path,import.meta.url),'utf8');const definition=inspectWorkflowText(path,text)[0];
 const steps=Object.fromEntries(definition.required_steps.map(id=>[id,{outcome:'success',conclusion:'success'}]));
 const report=buildWorkflowReport({definition,context:{repository,workflow_source_sha:source,run_id:runId,attempt:1,job_id:definition.job_id,event:'push',expected_sha:source},source:{source_sha:source,tree_sha:tree,dirty:false},steps,jobStatus:'success',now:'2026-10-05T06:00:00.000Z'});
 const bytes=Buffer.from('archive fixture');
 const run={id:runId,run_attempt:1,head_sha:source,status:'completed',conclusion:'success',event:'push',path,repository:{full_name:repository,id:11}};
 const artifact={id:200,name:`workflow-lifecycle-${runId}-1-${definition.job_id}`,expired:false,size_in_bytes:bytes.length,expires_at:'2026-11-05T06:00:00Z',digest:'sha256:'+hash(bytes),workflow_run:{id:runId,head_sha:source,repository_id:11}};
 const job={run_id:runId,run_attempt:1,head_sha:source,status:'completed',conclusion:'success',name:definition.job_name,steps:[{number:1,name:'Set up job',status:'completed',conclusion:'success'},...definition.all_step_ids.map((id,i)=>({number:i+2,name:definition.all_step_names[i],status:'completed',conclusion:'success'}))]};
 const responses={
  [`actions/artifacts/200`]:artifact,[`actions/runs/${runId}`]:run,[`git/commits/${source}`]:{sha:source,tree:{sha:tree}},[`contents/${path}?ref=${source}`]:{path,encoding:'base64',content:Buffer.from(text).toString('base64')},
  [`actions/runs/${runId}/artifacts?per_page=100`]:{total_count:1,artifacts:[artifact]},[`actions/runs/${runId}/attempts/1/jobs?per_page=100`]:{total_count:1,jobs:[job]},
 };
 const api={getJson:async p=>{assert.ok(responses[p],'unexpected API path '+p);return structuredClone(responses[p]);},getBytes:async p=>{assert.equal(p,'actions/artifacts/200/zip');return bytes;},remainingMs:()=>5000};
 return {repository,runId,run,artifact,job,report,definition,bytes,responses,api,decodeArchive:()=>structuredClone(report),now:()=>Date.parse('2026-10-05T06:01:00.000Z')};
}
const collect=f=>collectRunLifecycle(f.repository,f.runId,f);
test('canonical job/artifact/source readback closes development evidence only',async()=>{const r=await collect(fixture());assert.equal(r.state,'CLOSED');assert.equal(r.closed_jobs,1);assert.equal(r.runtime_activation,'BLOCKED');assert.equal(r.results[0].durable_retention_policy,'UNPROVEN');});
for(const [name,mutate,throws=false] of [
 ['wrong repository',f=>f.run.repository.full_name='attacker/repo',true],['incomplete run',f=>f.run.status='in_progress',true],['wrong source tree',f=>f.responses[`git/commits/${f.run.head_sha}`].tree.sha='bad',true],
 ['unsupported event',f=>f.run.event='pull_request_target',true],['truncated artifact list',f=>f.responses[`actions/runs/${f.runId}/artifacts?per_page=100`].total_count=101,true],
 ['missing job',f=>f.responses[`actions/runs/${f.runId}/attempts/1/jobs?per_page=100`].jobs=[],true],
 ['duplicate artifact',f=>{const a=f.responses[`actions/runs/${f.runId}/artifacts?per_page=100`];a.artifacts.push(structuredClone(f.artifact));a.total_count=2;}],
 ['expired artifact',f=>f.artifact.expired=true],['elapsed artifact expiry',f=>f.artifact.expires_at='2026-10-01T00:00:00Z'],['wrong artifact run',f=>f.artifact.workflow_run.id++],
 ['wrong artifact repository',f=>f.artifact.workflow_run.repository_id++],['archive digest mismatch',f=>f.artifact.digest='sha256:'+'c'.repeat(64)],
 ['wrong job source',f=>f.job.head_sha='c'.repeat(40)],['wrong job attempt',f=>f.job.run_attempt++],['failed evidence upload',f=>f.job.steps.at(-1).conclusion='failure'],
 ['missing actual step',f=>f.job.steps.splice(2,1)],['duplicate actual step',f=>f.job.steps.push(structuredClone(f.job.steps[1]))],['actual check failure hidden by report',f=>f.job.steps[2].conclusion='failure'],
 ['unproven PR merge definition',f=>{f.report.workflow_source_sha='c'.repeat(40);f.report.report_sha256=reportDigest(f.report);}],
 ['report forged outcomes',f=>{f.report.outcomes=[];f.report.report_sha256=reportDigest(f.report);}],['forged report job',f=>{f.report.job_id='other';f.report.report_sha256=reportDigest(f.report);}],
 ['failed post-job cleanup',f=>f.job.conclusion='failure'],['failed run',f=>f.run.conclusion='failure'],
])test(`readback rejects ${name}`,async()=>{const f=fixture();mutate(f);if(throws)await assert.rejects(collect(f));else assert.equal((await collect(f)).state,'BLOCKED');});
test('rerun during readback invalidates the whole receipt',async()=>{const f=fixture(),get=f.api.getJson;let n=0;f.api.getJson=async p=>{const r=await get(p);if(p===`actions/runs/${f.runId}`&&++n===2)r.run_attempt++;return r;};await assert.rejects(collect(f),/changed during readback/);});
test('a correct receipt can be observed after a rerun without overwriting attempt one',async()=>{const f=fixture();f.run.run_attempt=2;f.job.run_attempt=2;f.report.attempt=2;f.report.report_sha256=reportDigest(f.report);f.artifact.name=`workflow-lifecycle-${f.runId}-2-${f.definition.job_id}`;f.responses[`actions/runs/${f.runId}/attempts/2/jobs?per_page=100`]=f.responses[`actions/runs/${f.runId}/attempts/1/jobs?per_page=100`];const r=await collect(f);assert.equal(r.state,'CLOSED');assert.equal(r.attempt,2);});
function archive(names){return execFileSync('python3',['-c','import io,zipfile,sys,json; b=io.BytesIO(); z=zipfile.ZipFile(b,"w"); [z.writestr(n,"{}") for n in json.loads(sys.argv[1])]; z.close(); sys.stdout.buffer.write(b.getvalue())',JSON.stringify(names)],{timeout:5000});}
test('real ZIP parser reads exactly one JSON checkpoint without extraction',()=>assert.deepEqual(decodeCheckpointArchive(archive(['report.json'])),{}));
for(const names of [['../report.json'],['report.json','other.json'],['report.json','report.json']])test(`real ZIP parser rejects ${JSON.stringify(names)}`,()=>assert.throws(()=>decodeCheckpointArchive(archive(names)),/exact single/));
test('redirected artifact request does not receive GitHub authorization',async()=>{const calls=[];const api=createGitHubReadback('owner/repo',{token:'fixture-secret',fetchImpl:async(url,options)=>{calls.push({url,options});return calls.length===1?new Response(null,{status:302,headers:{location:'https://artifact.example/signed'}}):new Response('bytes');}});await api.getBytes('actions/artifacts/1/zip');assert.equal(calls[0].options.headers.Authorization,'Bearer fixture-secret');assert.equal(calls[1].options.headers,undefined);});
test('insecure artifact redirects are rejected',async()=>{const api=createGitHubReadback('owner/repo',{fetchImpl:async()=>new Response(null,{status:302,headers:{location:'http://artifact.example/file'}})});await assert.rejects(api.getBytes('actions/artifacts/1/zip'),/HTTPS/);});
test('network adapter rejects oversized responses and nonrelative API paths',async()=>{const api=createGitHubReadback('owner/repo',{fetchImpl:async()=>new Response('x',{headers:{'content-length':'9000000'}})});await assert.rejects(api.getJson('actions/runs/1'),/limit/);await assert.rejects(api.getJson('https://foreign.example'),/relative/);});

test('service initialization before user steps does not shift proof binding',async()=>{const f=fixture();f.job.steps.splice(1,0,{number:2,name:'Initialize containers',status:'completed',conclusion:'success'});f.job.steps.forEach((step,i)=>step.number=i+1);assert.equal((await collect(f)).state,'CLOSED');});
test('matching API paths with @ref suffix use exact-source content',async()=>{const f=fixture();f.run.path+='@main';assert.equal((await collect(f)).state,'CLOSED');});
test('unexpected extra user step prevents closure',async()=>{const f=fixture();f.job.steps.splice(2,0,{number:99,name:'Unexpected operation',status:'completed',conclusion:'success'});assert.equal((await collect(f)).state,'BLOCKED');});
test('artifact deletion after download cannot establish retained closure',async()=>{const f=fixture(),get=f.api.getJson;f.api.getJson=async path=>{if(path==='actions/artifacts/200')throw Error('artifact no longer exists');return get(path);};assert.equal((await collect(f)).state,'BLOCKED');});
