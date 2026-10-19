import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync} from 'node:fs';
import {evaluateHostedSourceCheck,hostedSourceChecks} from '../verification/run-hosted-source-check.mjs';
import {renderConsolidatedProducerWorkflow} from '../verification/self-audit-workflow.mjs';
import {inspectWorkflowText} from '../verification/workflow-lifecycle-inventory.mjs';
const valid=()=>({kind:'hosted-source-check',started_at:'2026-10-19T00:00:00.000Z',finished_at:'2026-10-19T00:00:15.000Z',stdout_sha256:'c'.repeat(64),stderr_sha256:'d'.repeat(64),check:'schema',command:['node',...hostedSourceChecks.schema],node:'v24.19.0',platform:'linux',expected_sha:'a'.repeat(40),source:{dirty:false,source_sha:'a'.repeat(40),tree_sha:'b'.repeat(40),stamp:'c'.repeat(64),working_digest:'d'.repeat(64)},source_unchanged:true,exit_code:0,timed_out:false,execution_error:null,duration_ms:15000,timeout_ms:25000,runtime_activation:'BLOCKED',shared_or_production_execution_authorized:false});
test('Node24 lane cannot reuse legacy runtime, dirty source, failure, timeout or activation',()=>{
 assert.deepEqual(evaluateHostedSourceCheck(valid()),[]);
 for(const [key,value] of [['node','v20.20.2'],['platform','darwin'],['expected_sha','b'.repeat(40)],['source',{dirty:true,source_sha:'a'.repeat(40)}],['source_unchanged',false],['command',['node','unapproved']],['exit_code',1],['timed_out',true],['execution_error','ETIMEDOUT'],['duration_ms',undefined],['duration_ms',NaN],['duration_ms',Infinity],['duration_ms',27001],['stdout_sha256','bad'],['stderr_sha256',undefined],['source',{...valid().source,tree_sha:undefined}],['source',{...valid().source,stamp:undefined}],['source',{...valid().source,working_digest:undefined}],['started_at','invalid'],['finished_at',undefined],['kind','other'],['timeout_ms',30000],['runtime_activation','ACTIVE'],['shared_or_production_execution_authorized',true]])assert.ok(evaluateHostedSourceCheck({...valid(),[key]:value}).length,key);
});
test('same producer retains legacy stage inventory and includes every new bounded check in lifecycle evidence',()=>{
 const text=renderConsolidatedProducerWorkflow();
 assert.equal(readFileSync(new URL('../../.github/workflows/development-self-audit.yml',import.meta.url),'utf8'),text);
 assert.equal((text.match(/run: node scripts\/verification\/run-self-audit.mjs --stage /g)||[]).length,48);
 const jobs=inspectWorkflowText('.github/workflows/development-self-audit.yml',text);assert.equal(jobs.length,1);
 for(const check of Object.keys(hostedSourceChecks)){assert.ok(jobs[0].all_step_ids.includes('hosted_'+check));assert.ok(text.includes(`run: pnpm exec node scripts/verification/run-hosted-source-check.mjs ${check}`));}
 assert.ok(text.indexOf('id: audit_upload')<text.indexOf('id: hosted_node24'));
 assert.ok(text.indexOf('id: hosted_restore_node20')<text.indexOf('id: lifecycle_record'));
 assert.ok(text.includes("node-version: '24.19.0'"));assert.equal((text.match(/node-version: '20.20.2'/g)||[]).length,2);
 assert.ok(text.includes('path: verification/generated/hosted-source/'));
 assert.ok(text.indexOf('id: hosted_postgres_start')>text.indexOf('id: audit_upload'));
 assert.ok(text.indexOf('id: hosted_postgres_start')<text.indexOf('id: hosted_schema'));
 assert.ok(text.indexOf('id: hosted_postgres_stop')<text.indexOf('id: lifecycle_record'));
 assert.ok(text.includes('id: hosted_postgres_stop\n        if: always()'));
 assert.ok(text.includes('timeout 25s node scripts/verification/hosted-loopback-postgres.mjs start'));
 assert.ok(text.includes('timeout 25s node scripts/verification/hosted-loopback-postgres.mjs stop'));
});
