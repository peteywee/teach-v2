import { spawnSync, execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { inspectAuditPlan } from './self-audit-catalog.mjs';

const digest=value=>createHash('sha256').update(value).digest('hex');
export function sourceIdentity(root) {
  const git=args=>execFileSync('git',args,{cwd:root,encoding:'utf8',timeout:2000}).trim();
  const sha=git(['rev-parse','HEAD']),tree=git(['rev-parse','HEAD^{tree}']);
  const dirty=git(['status','--porcelain']);
  const untracked=git(['ls-files','--others','--exclude-standard']).split('\n').filter(Boolean).map(path=>[path,digest(readFileSync(join(root,path)))]);
  const workingDigest=digest(JSON.stringify([git(['diff','--binary','HEAD']),untracked]));
  return { source_sha:sha,tree_sha:tree,dirty:Boolean(dirty),working_digest:workingDigest,stamp:digest(JSON.stringify([sha,tree,workingDigest])) };
}
export function discoverFoundationTests(root) {
  const walk=dir=>readdirSync(join(root,dir),{withFileTypes:true}).flatMap(item=>item.isDirectory()?walk(`${dir}/${item.name}`):[`${dir}/${item.name}`]);
  return walk('src/modules').filter(path=>path.endsWith('.test.ts')).sort();
}
export function currentFacts(root) {
  const load=path=>JSON.parse(readFileSync(join(root,path),'utf8'));
  const registries={};
  for(const name of ['entities','identifiers','relationships','states','state-machines','commands','events','invariants','decision-tables','capabilities']) {
    const entries=load(`kernel/${name}.json`).entries;
    registries[name]={approved:entries.filter(x=>x.status==='approved').length,candidate:entries.filter(x=>x.status==='candidate').length};
  }
  const ledger=load('verification/whole-repository/command-coverage.json');
  return { kernel_version:load('kernel/manifest.json').version,ownership_version:load('domains/ownership-map.json').version,
    policy_baselines:{architecture:load('architecture/authority.json').baseline_commit,application:load('application-interfaces/authority.json').baseline_commit,persistence:load('persistence/authority.json').baseline_commit},
    registries,commands:{total:ledger.commands.length,partial:ledger.commands.filter(x=>x.state==='PARTIAL').length,blocked:ledger.commands.filter(x=>x.state==='BLOCKED').length},
    physical_readiness:load('persistence/physical-slices/readiness.json').current_physical_slice_admissions,
    future_admissions:Object.fromEntries(['assignment','certification','progress-event'].map(lane=>{const a=load(`persistence/physical-slices/${lane}/admission.json`);return [lane,{decision:a.decision,proven:a.criteria.filter(x=>x.state==='PROVEN').length,unknown:a.criteria.filter(x=>x.state==='UNKNOWN').length}];})),
    full_runtime_conformance:'UNKNOWN',runtime_activation:'BLOCKED',shared_or_production_execution_authorized:false };
}
export function runBounded(command,args,{root,timeoutMs=25000}={}) {
  if(!Number.isInteger(timeoutMs)||timeoutMs<1||timeoutMs>25000) throw new RangeError('audit operation bound must be 1..25000ms');
  const started=new Date(),result=spawnSync(command,args,{cwd:root,encoding:'utf8',timeout:timeoutMs,killSignal:'SIGKILL',shell:false,maxBuffer:8*1024*1024});
  return {started_at:started.toISOString(),finished_at:new Date().toISOString(),duration_ms:Date.now()-started.getTime(),exit_code:result.status,
    timed_out:result.error?.code==='ETIMEDOUT',execution_error:result.error?.code||null,stdout:result.stdout||'',stderr:result.stderr||''};
}
export function runAuditStage(root,id,{expectedSha=process.env.AUDIT_EXPECTED_SHA}={}) {
  const planPath=join(root,'verification/whole-repository/self-audit-plan.json'),planText=readFileSync(planPath,'utf8'),plan=JSON.parse(planText);
  const errors=inspectAuditPlan(plan);if(errors.length)throw new Error(errors.join('; '));
  const stage=plan.stages.find(x=>x.id===id);if(!stage)throw new Error('unknown audit stage');
  const before=sourceIdentity(root);if(expectedSha&&before.source_sha!==expectedSha)throw new Error('expected audit source SHA does not match checkout');
  const args=[...stage.args];if(stage.discover_tests) {const tests=discoverFoundationTests(root);if(!tests.length)throw new Error('foundation test inventory is empty');args.push(...tests);}
  const result=runBounded(stage.command,args,{root,timeoutMs:stage.timeout_ms}),after=sourceIdentity(root);
  const same=before.stamp===after.stamp,commandPassed=result.exit_code===0&&!result.timed_out&&!result.execution_error;
  const state=!same||!commandPassed?'BLOCKED':before.dirty?'UNKNOWN':'PROVEN';
  const validatorMatch=result.stdout.match(/Validator inventory: (\d+); shard: (\d+)\/(\d+); selected: (\d+); digest: ([a-f0-9]{64})/);
  const report={version:'0.1.0',kind:'development-stage-evidence',stage:id,state,claim:'the named development check completed for the recorded source; no full-runtime claim',
    source:before,source_unchanged:same,plan_sha256:digest(planText),command:[stage.command,...args],runtime:{node:process.version,platform:process.platform},
    started_at:result.started_at,finished_at:result.finished_at,duration_ms:result.duration_ms,exit_code:result.exit_code,timed_out:result.timed_out,execution_error:result.execution_error,
    stdout_sha256:digest(result.stdout),stderr_sha256:digest(result.stderr),
    ...(validatorMatch?{validator_shard:{inventory:Number(validatorMatch[1]),index:Number(validatorMatch[2]),total:Number(validatorMatch[3]),selected:Number(validatorMatch[4]),digest:validatorMatch[5]}}:{}),
    full_runtime_conformance:'UNKNOWN',runtime_activation:'BLOCKED',shared_or_production_execution_authorized:false};
  const output=join(root,'verification/generated/self-audit');mkdirSync(output,{recursive:true});writeFileSync(join(output,`${id}.json`),JSON.stringify(report,null,2)+'\n');
  return {report,stdout:result.stdout,stderr:result.stderr};
}
export function evaluateAuditReports(plan,reports,source,planHash,foundationTests) {
  const errors=[];
  if(inspectAuditPlan(plan).length)return ['invalid audit plan'];
  if(!Array.isArray(reports)||!source)return ['missing report/source inventory'];
  if(source.dirty)errors.push('dirty worktree cannot establish exact committed-source proof');
  if(reports.length!==plan.stages.length||new Set(reports.map(x=>x?.stage)).size!==plan.stages.length)errors.push('every distinct required stage must have evidence');
  for(const stage of plan.stages) {
    const r=reports.find(x=>x?.stage===stage.id);
    if(!r||r.state!=='PROVEN'||r.exit_code!==0||r.timed_out!==false||r.execution_error!==null||r.source_unchanged!==true||r.source?.stamp!==source.stamp||r.source?.source_sha!==source.source_sha||r.source?.tree_sha!==source.tree_sha||r.source?.dirty!==false||r.plan_sha256!==planHash) {errors.push(`${stage.id}: missing, stale, unknown or failed exact-source evidence`);continue;}
    if(!Array.isArray(r.command)||r.command[0]!==stage.command||JSON.stringify(r.command.slice(1,1+stage.args.length))!==JSON.stringify(stage.args)||!stage.discover_tests&&r.command.length!==stage.args.length+1)errors.push(`${stage.id}: executed command differs from plan`);
    if(stage.discover_tests && (!Array.isArray(foundationTests)||!foundationTests.length||JSON.stringify(r.command)!==JSON.stringify([stage.command,...stage.args,...foundationTests])))errors.push(`${stage.id}: complete live foundation inventory required`);
    const started=Date.parse(r.started_at),finished=Date.parse(r.finished_at);
    if(!Number.isFinite(started)||!Number.isFinite(finished)||finished<started||!Number.isFinite(r.duration_ms)||r.duration_ms<0||r.duration_ms>stage.timeout_ms+2000||Math.abs(finished-started-r.duration_ms)>1000||!/^[a-f0-9]{64}$/.test(r.stdout_sha256||'')||!/^[a-f0-9]{64}$/.test(r.stderr_sha256||''))errors.push(`${stage.id}: invalid time/output provenance`);
    if(r.kind!=='development-stage-evidence'||!/^v20\./.test(r.runtime?.node||'')||r.runtime?.platform!=='linux')errors.push(`${stage.id}: pinned CI runtime provenance required`);
    if(r.full_runtime_conformance!=='UNKNOWN'||r.runtime_activation!=='BLOCKED'||r.shared_or_production_execution_authorized!==false)errors.push(`${stage.id}: development evidence cannot authorize runtime/production`);
  }
  const shards=plan.stages.filter(x=>x.id.startsWith('validator-shard-')).map(stage=>reports.find(x=>x?.stage===stage.id)?.validator_shard);
  if(shards.length!==3||shards.some((s,i)=>!s||s.total!==3||s.index!==i+1||!Number.isInteger(s.inventory)||s.inventory<1||!Number.isInteger(s.selected)||s.selected<1||s.inventory!==shards[0]?.inventory||!/^[a-f0-9]{64}$/.test(s.digest||'')||s.digest!==shards[0]?.digest)||shards.reduce((n,s)=>n+(s?.selected||0),0)!==shards[0]?.inventory)errors.push('validator shards must cover one complete identical inventory');
  return errors;
}
export function finishAudit(root,{expectedSha=process.env.AUDIT_EXPECTED_SHA}={}) {
  const planText=readFileSync(join(root,'verification/whole-repository/self-audit-plan.json'),'utf8'),plan=JSON.parse(planText),source=sourceIdentity(root);
  if(expectedSha&&source.source_sha!==expectedSha)throw new Error('expected audit source SHA does not match checkout');
  const reports=plan.stages.flatMap(stage=>{const path=join(root,`verification/generated/self-audit/${stage.id}.json`);return existsSync(path)?[JSON.parse(readFileSync(path,'utf8'))]:[];});
  const errors=evaluateAuditReports(plan,reports,source,digest(planText),discoverFoundationTests(root));
  const report={version:'0.1.0',kind:'development-self-audit',state:errors.length?'BLOCKED':'PROVEN',claim:'required development checks completed on one exact source/tree; runtime conformance is separate',source,created_at:new Date().toISOString(),required_stages:plan.stages.length,completed_stages:reports.filter(x=>x.state==='PROVEN').length,errors,current_facts:currentFacts(root),full_runtime_conformance:'UNKNOWN',runtime_activation:'BLOCKED',shared_or_production_execution_authorized:false};
  mkdirSync(join(root,'verification/generated/self-audit'),{recursive:true});writeFileSync(join(root,'verification/generated/self-audit/summary.json'),JSON.stringify(report,null,2)+'\n');return report;
}
