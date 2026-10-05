import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtempSync,mkdirSync,writeFileSync,readFileSync,rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { expectedPlan,inspectAuditPlan } from '../verification/self-audit-catalog.mjs';
import { sourceIdentity,runBounded,runAuditStage,evaluateAuditReports,discoverFoundationTests } from '../verification/development-self-audit.mjs';
const hash=value=>createHash('sha256').update(value).digest('hex');
function fixture(body='console.log("fixture check");'){
 const root=mkdtempSync(join(tmpdir(),'teach-self-audit-'));
 const write=(path,text)=>{mkdirSync(join(root,path,'..'),{recursive:true});writeFileSync(join(root,path),text);};
 write('.gitignore','verification/generated/\n');
 write('verification/whole-repository/self-audit-plan.json',JSON.stringify(expectedPlan,null,2)+'\n');
 write('scripts/packaging/validate-apply-guards.mjs',body);
 write('src/modules/example/domain/a.test.ts','// fixture inventory\n');
 const git=args=>execFileSync('git',args,{cwd:root,encoding:'utf8',timeout:2000,stdio:['ignore','pipe','pipe']}).trim();
 git(['init']);git(['config','user.name','Development Audit Fixture']);git(['config','user.email','fixture@example.invalid']);git(['add','.']);git(['commit','-m','fixture']);
 return {root,write,git,cleanup:()=>rmSync(root,{recursive:true,force:true})};
}
function evidence(){
 const source={source_sha:'a'.repeat(40),tree_sha:'b'.repeat(40),working_digest:hash(''),stamp:hash('source'),dirty:false};
 const tests=['src/modules/example/domain/a.test.ts'],planHash=hash('plan');
 const reports=expectedPlan.stages.map(stage=>({kind:'development-stage-evidence',stage:stage.id,state:'PROVEN',source:structuredClone(source),source_unchanged:true,plan_sha256:planHash,
 command:[stage.command,...stage.args,...(stage.discover_tests?tests:[])],runtime:{node:'v20.19.0',platform:'linux'},
 started_at:'2026-10-05T02:00:00.000Z',finished_at:'2026-10-05T02:00:00.010Z',duration_ms:10,exit_code:0,timed_out:false,execution_error:null,stdout_sha256:hash('out'),stderr_sha256:hash(''),
 ...(stage.id.startsWith('validator-shard-')?{validator_shard:{inventory:186,index:Number(stage.id.at(-1)),total:3,selected:62,digest:hash('inventory')}}:{}),
 full_runtime_conformance:'UNKNOWN',runtime_activation:'BLOCKED',shared_or_production_execution_authorized:false}));
 return {source,tests,planHash,reports};
}
const evaluate=f=>evaluateAuditReports(expectedPlan,f.reports,f.source,f.planHash,f.tests);
test('one clean source with every bounded stage passes reconciliation',()=>assert.deepEqual(evaluate(evidence()),[]));
for(const [name,mutate,pattern] of [
 ['missing stage',f=>f.reports.pop(),/every distinct|missing/],
 ['duplicate stage',f=>f.reports[0]=structuredClone(f.reports[1]),/every distinct|missing/],
 ['different source SHA',f=>f.reports[0].source.source_sha='c'.repeat(40),/stale/],
 ['different tree',f=>f.reports[0].source.tree_sha='c'.repeat(40),/stale/],
 ['different source stamp',f=>f.reports[0].source.stamp=hash('old'),/stale/],
 ['different plan',f=>f.reports[0].plan_sha256=hash('old'),/stale/],
 ['dirty checkout',f=>f.source.dirty=true,/dirty/],
 ['unknown checkpoint',f=>f.reports[0].state='UNKNOWN',/unknown/],
 ['failed process',f=>f.reports[0].exit_code=1,/failed/],
 ['timeout',f=>f.reports[0].timed_out=true,/failed/],
 ['execution error',f=>f.reports[0].execution_error='ENOENT',/failed/],
 ['source changed while checking',f=>f.reports[0].source_unchanged=false,/stale/],
 ['different command',f=>f.reports[0].command.push('--skip'),/command differs/],
 ['omitted foundation test',f=>f.reports.find(x=>x.stage==='foundation').command.pop(),/complete live foundation/],
 ['invalid duration',f=>f.reports[0].duration_ms=NaN,/provenance/],
 ['operation exceeds bound',f=>f.reports[0].duration_ms=30000,/provenance/],
 ['missing output digest',f=>delete f.reports[0].stdout_sha256,/provenance/],
 ['unpinned runtime',f=>f.reports[0].runtime.node='v24.0.0',/pinned CI/],
 ['inventory drift between shards',f=>f.reports.find(x=>x.stage==='validator-shard-2').validator_shard.digest=hash('different'),/identical inventory/],
 ['omitted validator case',f=>f.reports.find(x=>x.stage==='validator-shard-2').validator_shard.selected--,/complete identical inventory/],
 ['runtime promotion',f=>f.reports[0].runtime_activation='ENABLED',/cannot authorize/],
 ['production promotion',f=>f.reports[0].shared_or_production_execution_authorized=true,/cannot authorize/],
])test(`${name} blocks aggregate evidence`,()=>{const f=evidence();mutate(f);assert.match(evaluate(f).join('\n'),pattern);});
test('malformed inputs and modified command plans fail closed',()=>{
 assert.ok(evaluateAuditReports(expectedPlan,null,null,'').length);
 const plan=structuredClone(expectedPlan);plan.stages[0].timeout_ms=60000;assert.ok(inspectAuditPlan(plan).length);
 assert.ok(evaluateAuditReports(plan,[],{},'').length);
});
test('bounded child process captures real success and failure',()=>{assert.equal(runBounded(process.execPath,['-e','console.log("proof")'],{root:process.cwd()}).stdout.trim(),'proof');assert.equal(runBounded(process.execPath,['-e','process.exit(3)'],{root:process.cwd()}).exit_code,3);});
test('bounded child process kills a hung operation and records missing executable',()=>{
 const result=runBounded(process.execPath,['-e','setInterval(()=>{},1000)'],{root:process.cwd(),timeoutMs:100});assert.equal(result.timed_out,true);assert.ok(result.duration_ms<2000);
 assert.equal(runBounded('/missing/teach-audit-executable',[],{root:process.cwd()}).execution_error,'ENOENT');
 assert.throws(()=>runBounded(process.execPath,[],{root:process.cwd(),timeoutMs:25001}),/bound/);
});
test('clean committed checkpoint records exact source and ignores its generated report',()=>{const f=fixture();try{const before=sourceIdentity(f.root),result=runAuditStage(f.root,'pins',{expectedSha:before.source_sha});assert.equal(result.report.state,'PROVEN');assert.deepEqual(sourceIdentity(f.root),before);assert.equal(JSON.parse(readFileSync(join(f.root,'verification/generated/self-audit/pins.json'))).source.tree_sha,before.tree_sha);assert.deepEqual(discoverFoundationTests(f.root),['src/modules/example/domain/a.test.ts']);}finally{f.cleanup();}});
test('caller expected SHA mismatch prevents command execution',()=>{const f=fixture('throw new Error("must not run")');try{assert.throws(()=>runAuditStage(f.root,'pins',{expectedSha:'wrong'}),/expected audit source SHA/);}finally{f.cleanup();}});
test('dirty source checkpoint remains UNKNOWN even when command passes',()=>{const f=fixture();try{f.write('untracked.txt','changed');assert.equal(runAuditStage(f.root,'pins',{expectedSha:null}).report.state,'UNKNOWN');}finally{f.cleanup();}});
test('mid-check source mutation blocks checkpoint despite exit zero',()=>{const f=fixture('import {writeFileSync} from "node:fs";writeFileSync("src/modules/example/domain/a.test.ts","changed");');try{const r=runAuditStage(f.root,'pins',{expectedSha:null}).report;assert.equal(r.exit_code,0);assert.equal(r.source_unchanged,false);assert.equal(r.state,'BLOCKED');}finally{f.cleanup();}});
test('actual child failure creates blocked retained checkpoint',()=>{const f=fixture('process.exit(4)');try{const r=runAuditStage(f.root,'pins',{expectedSha:null}).report;assert.equal(r.exit_code,4);assert.equal(r.state,'BLOCKED');}finally{f.cleanup();}});
