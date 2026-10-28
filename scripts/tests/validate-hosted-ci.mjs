import { inspectAuthoringEngineering } from '../verification/demo-authoring-engineering.mjs';
import { authoringStages } from '../verification/authoring-stage-catalog.mjs';
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {evaluateHostedSourceCheck,hostedSourceChecks,hostedSchemaFiles,hostedSchemaRecoveryFile,hostedSchemaCaseNames,hostedSchemaRegistrationPattern,parseHostedSchemaCases} from '../verification/run-hosted-source-check.mjs';
import {renderConsolidatedProducerWorkflow} from '../verification/self-audit-workflow.mjs';
import {inspectWorkflowText} from '../verification/workflow-lifecycle-inventory.mjs';
import {inspectKitchenEngineering} from '../verification/demo-kitchen-engineering.mjs';
import {expectedPlan} from '../verification/self-audit-catalog.mjs';
import {inspectProducerWorkflowWiring} from '../verification/validate-workflow-lifecycle.mjs';
const valid=(check='schema_registration')=>({kind:'hosted-source-check',started_at:'2026-10-19T00:00:00.000Z',finished_at:'2026-10-19T00:00:15.000Z',stdout_sha256:'c'.repeat(64),stderr_sha256:'d'.repeat(64),check,command:['node',...hostedSourceChecks[check]],...(Object.hasOwn(hostedSchemaCaseNames,check)?{schema_cases:{names:[...hostedSchemaCaseNames[check]],errors:[]}}:{}),node:'v24.19.0',platform:'linux',expected_sha:'a'.repeat(40),source:{dirty:false,source_sha:'a'.repeat(40),tree_sha:'b'.repeat(40),stamp:'c'.repeat(64),working_digest:'d'.repeat(64)},source_unchanged:true,exit_code:0,timed_out:false,execution_error:null,duration_ms:15000,timeout_ms:25000,runtime_activation:'BLOCKED',shared_or_production_execution_authorized:false});
test('Node24 lane cannot reuse legacy runtime, dirty source, failure, timeout or activation',()=>{
 assert.deepEqual(evaluateHostedSourceCheck(valid()),[]);
 for(const check of Object.keys(hostedSourceChecks))assert.deepEqual(evaluateHostedSourceCheck(valid(check)),[],check);
 assert.deepEqual(evaluateHostedSourceCheck({...valid(),check:'schema'}),['unknown check']);
 const tap=names=>'TAP version 13\n'+names.map((name,index)=>`# Subtest: ${name}\nok ${index+1} - ${name}\n`).join('')+`1..${names.length}\n# tests ${names.length}\n# suites 0\n# pass ${names.length}\n# fail 0\n# cancelled 0\n# skipped 0\n# todo 0\n`;
 for(const [check,names] of Object.entries(hostedSchemaCaseNames)){
  const output=tap(names);assert.deepEqual(parseHostedSchemaCases(check,output),{names:[...names],errors:[]});
  for(const bad of [tap(names.slice(1)),tap([...names,'unknown future test']),tap([...names.slice(1),names[1]]),output.replace('ok 1 -','not ok 1 -'),output.replace('# skipped 0','# skipped 1'),output.replace('# pass '+names.length,'# pass 0'),output.replace('1..'+names.length,'1..0'),output+'1..0\n',output.replace('# suites 0','# suites 1'),output+'  ok 1 - hidden nested case\n',output+'ok 0 - unknown\n',output+'ok x - unknown\n',output.replace('ok 2 -','ok 1 -'),output+'  Bail out! aborted nested\n',output.replace('ok 1 - '+names[0],'ok 1 - '+names[0]+' # SKIP')])assert.ok(parseHostedSchemaCases(check,bad).errors.length,check);
  for(const schema_cases of [undefined,{names:names.slice(1),errors:[]},{names:[...names,'unknown'],errors:[]},{names:[...names],errors:['partial TAP']},{names:[...names]}])assert.ok(evaluateHostedSourceCheck({...valid(check),schema_cases}).length,check);
 }
 assert.equal(hostedSchemaCaseNames.schema_registration.length,8);assert.equal(hostedSchemaCaseNames.schema_support.length,41);
 const allNames=Object.values(hostedSchemaCaseNames).flat();assert.equal(allNames.length,49);assert.equal(new Set(allNames).size,49);
 const selector=new RegExp(hostedSchemaRegistrationPattern);assert.ok(hostedSchemaRegistrationPattern.startsWith('^(?:')&&hostedSchemaRegistrationPattern.endsWith(')$'));
 for(const name of allNames)assert.equal(selector.test(name),hostedSchemaCaseNames.schema_registration.includes(name));
 for(const name of [...hostedSchemaFiles,hostedSchemaRecoveryFile,'unknown future test'])assert.equal(selector.test(name),false);

 for(const [key,value] of [['node','v20.20.2'],['platform','darwin'],['expected_sha','b'.repeat(40)],['source',{dirty:true,source_sha:'a'.repeat(40)}],['source_unchanged',false],['command',['node','unapproved']],['exit_code',1],['timed_out',true],['execution_error','ETIMEDOUT'],['duration_ms',undefined],['duration_ms',NaN],['duration_ms',Infinity],['duration_ms',27001],['stdout_sha256','bad'],['stderr_sha256',undefined],['source',{...valid().source,tree_sha:undefined}],['source',{...valid().source,stamp:undefined}],['source',{...valid().source,working_digest:undefined}],['started_at','invalid'],['finished_at',undefined],['kind','other'],['timeout_ms',30000],['runtime_activation','ACTIVE'],['shared_or_production_execution_authorized',true]])assert.ok(evaluateHostedSourceCheck({...valid(),[key]:value}).length,key);
});
test('same producer retains legacy stage inventory and includes every new bounded check in lifecycle evidence',()=>{
 const text=renderConsolidatedProducerWorkflow();
 assert.equal(readFileSync(new URL('../../.github/workflows/development-self-audit.yml',import.meta.url),'utf8'),text);
 const kitchen=inspectKitchenEngineering(new URL('../..',import.meta.url).pathname);
 assert.equal(kitchen.present,true);assert.deepEqual(kitchen.errors,[]);
 const stages=source=>[...source.matchAll(/run: node scripts\/verification\/run-self-audit.mjs --stage ([a-z0-9-]+)/g)].map(match=>match[1]);
 const predecessor=kitchen.predecessorFiles['.github/workflows/development-self-audit.yml'];
 assert.equal(typeof predecessor,'string');
 const originalRunner=kitchen.predecessorFiles['scripts/verification/run-hosted-source-check.mjs'];assert.equal(typeof originalRunner,'string');
 const originalChecks=runInNewContext(originalRunner.slice(originalRunner.indexOf('export const hostedSourceChecks'),originalRunner.indexOf('export function evaluateHostedSourceCheck')).replace('export const','const')+'; hostedSourceChecks',{}, {timeout:1000});
 assert.deepEqual(hostedSchemaFiles,Array.from(originalChecks.schema.slice(3)));assert.equal(hostedSchemaFiles.length,7);
 for(const [name,args] of Object.entries(originalChecks))if(name!=='schema')assert.deepEqual(hostedSourceChecks[name],Array.from(args),name);
 assert.deepEqual(Object.keys(hostedSourceChecks).sort(),[...Object.keys(originalChecks).filter(name=>name!=='schema'),'schema_registration','schema_support'].sort());
 assert.deepEqual(hostedSourceChecks.schema_registration,['--import','tsx','--test','--test-reporter=tap','--test-name-pattern='+hostedSchemaRegistrationPattern,hostedSchemaFiles[1]]);
 assert.deepEqual(hostedSourceChecks.schema_support,['--import','tsx','--test','--test-reporter=tap',...hostedSchemaFiles.filter(file=>file!==hostedSchemaFiles[1]),hostedSchemaRecoveryFile]);
 const source=readFileSync(new URL('../../'+hostedSchemaFiles[1],import.meta.url),'utf8');
 assert.deepEqual([...source.matchAll(/^test\('([^']+)'/gm)].map(match=>match[1]),hostedSchemaCaseNames.schema_registration);
 assert.equal([...source.matchAll(/^test\(/gm)].length,8);
 assert.equal(source.split("import './validate-demo-recovery-registration.mjs';").length,2);
 assert.equal(hostedSchemaRecoveryFile,'scripts/tests/validate-demo-recovery-registration.mjs');
 const authoring=inspectAuthoringEngineering(new URL('../..',import.meta.url).pathname);
 assert.equal(authoring.present,true);assert.deepEqual(authoring.errors,[]);
 const authoringPredecessor=authoring.predecessorFiles['.github/workflows/development-self-audit.yml'];
 assert.equal(typeof authoringPredecessor,'string');
 const legacy=stages(predecessor),current=stages(authoringPredecessor),live=stages(text);
 assert.equal(legacy.length,48);assert.equal(new Set(legacy).size,48);
 assert.equal(current.length,52);assert.equal(new Set(current).size,52);
 assert.deepEqual(live,expectedPlan.stages.map(stage=>stage.id));
 assert.equal(live.length,57);assert.equal(new Set(live).size,57);
 assert.deepEqual(live.filter(id=>!authoringStages.some(([added])=>id===added)),current);
 assert.deepEqual(live.filter(id=>authoringStages.some(([added])=>id===added)),authoringStages.map(([id])=>id));
 const added=['demo-kitchen-registration','demo-kitchen-postgres','demo-storage-owner-regressions','demo-storage-integration-regressions'];
 assert.deepEqual(current.filter(id=>!added.includes(id)),legacy);
 assert.deepEqual(current.filter(id=>added.includes(id)).sort(),added.slice().sort());
 const jobs=inspectWorkflowText('.github/workflows/development-self-audit.yml',text);assert.equal(jobs.length,1);
 const stepIds=jobs[0].all_step_ids,kitchenIndex=stepIds.indexOf('audit_demo_kitchen_postgres');
 const priorSteps=inspectWorkflowText('.github/workflows/development-self-audit.yml',authoringPredecessor)[0].all_step_ids,priorKitchen=priorSteps.indexOf('audit_demo_kitchen_postgres');
 assert.deepEqual(priorSteps.slice(priorKitchen-1,priorKitchen+2),['kitchen_postgres_start','audit_demo_kitchen_postgres','kitchen_postgres_stop']);
 assert.deepEqual(stepIds.slice(kitchenIndex-1,kitchenIndex+4),['kitchen_postgres_start','audit_demo_kitchen_postgres','audit_demo_authoring_postgres','audit_demo_authoring_isolated_history','kitchen_postgres_stop']);
 for(const id of ['kitchen_postgres_start','kitchen_postgres_stop'])assert.equal(stepIds.filter(value=>value===id).length,1);
 assert.ok(text.includes('id: kitchen_postgres_start\n        run: timeout 25s node scripts/verification/kitchen-loopback-postgres.mjs start'));
 assert.ok(text.includes('id: kitchen_postgres_stop\n        if: always()\n        run: timeout 25s node scripts/verification/kitchen-loopback-postgres.mjs stop'));
 assert.ok(text.indexOf('id: kitchen_postgres_stop')<text.indexOf('id: audit_upload'));
 for(const check of Object.keys(hostedSourceChecks)){assert.ok(jobs[0].all_step_ids.includes('hosted_'+check));assert.ok(text.includes(`run: pnpm exec node scripts/verification/run-hosted-source-check.mjs ${check}`));}
 assert.ok(text.indexOf('id: audit_upload')<text.indexOf('id: hosted_node24'));
 assert.ok(text.indexOf('id: hosted_restore_node20')<text.indexOf('id: lifecycle_record'));
 assert.ok(text.includes("node-version: '24.19.0'"));assert.equal((text.match(/node-version: '20.20.2'/g)||[]).length,2);
 assert.ok(text.includes('path: verification/generated/hosted-source/'));
 assert.ok(text.indexOf('id: hosted_postgres_start')>text.indexOf('id: audit_upload'));
 assert.ok(text.indexOf('id: hosted_postgres_start')<text.indexOf('id: hosted_schema_registration'));
 assert.ok(text.indexOf('id: hosted_postgres_stop')<text.indexOf('id: lifecycle_record'));
 assert.ok(text.includes('id: hosted_postgres_stop\n        if: always()'));
 const partitionIndex=stepIds.indexOf('hosted_schema_registration');assert.deepEqual(stepIds.slice(partitionIndex,partitionIndex+2),['hosted_schema_registration','hosted_schema_support']);
 assert.equal(stepIds.includes('hosted_schema'),false);
 for(const check of ['schema_registration','schema_support']){
  assert.equal(jobs[0].required_steps.filter(id=>id==='hosted_'+check).length,1);
  const needle=`      - name: ${check==='schema_registration'?'Verify schema registration source controls':'Verify remaining schema source controls'}\n        id: hosted_${check}\n        run: pnpm exec node scripts/verification/run-hosted-source-check.mjs ${check}\n`;
  assert.equal(text.split(needle).length,2);assert.ok(inspectProducerWorkflowWiring('.github/workflows/development-self-audit.yml',text.replace(needle,'')).length);
 }

 assert.ok(text.includes('timeout 25s node scripts/verification/hosted-loopback-postgres.mjs start'));
 assert.ok(text.includes('timeout 25s node scripts/verification/hosted-loopback-postgres.mjs stop'));
});
