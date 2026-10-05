import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildWorkflowReport, closeWorkflowReport, planWorkflowRecovery, reportDigest, validateWorkflowReport } from '../verification/workflow-lifecycle.mjs';
import { deriveWorkflowInventory } from '../verification/workflow-lifecycle-inventory.mjs';
import { inspectWorkflowLifecycles } from '../verification/validate-workflow-lifecycle.mjs';
const root = new URL('../..', import.meta.url).pathname;
const definition={required_steps:['checkout','verify'],job_id:'audit',workflow_path:'.github/workflows/audit.yml',workflow_sha256:'a'.repeat(64),effect:'READ_ONLY_DEVELOPMENT_VERIFICATION',verification_scope:'DEVELOPMENT_ONLY',shared_or_production_execution_authorized:false};
const input={definition,context:{repository:'peteywee/teach-v2',expected_sha:'b'.repeat(40),workflow_source_sha:'b'.repeat(40),run_id:1,attempt:1,job_id:'audit',event:'push'},source:{source_sha:'b'.repeat(40),tree_sha:'c'.repeat(40),dirty:false},steps:{checkout:{outcome:'success',conclusion:'success'},verify:{outcome:'success',conclusion:'success'}},jobStatus:'success'};
function checkpoint(){return buildWorkflowReport(structuredClone(input));}
function receipt(report){return {repository:input.context.repository,run_id:1,attempt:1,job_id:'audit',event:'push',workflow_path:definition.workflow_path,workflow_sha256:definition.workflow_sha256,workflow_source_sha:input.context.workflow_source_sha,workflow_source_verified:true,source_sha:input.source.source_sha,tree_sha:input.source.tree_sha,artifact_id:2,artifact_sha256:'d'.repeat(64),archive_sha256:'d'.repeat(64),artifact_report_sha256:report.report_sha256,artifact_expired:false,observed_at:report.created_at,artifact_expires_at:new Date(Date.parse(report.created_at)+86400000).toISOString(),upload_outcome:'success',job_conclusion:'success',run_conclusion:'success',artifact_name:'workflow-lifecycle-1-1-audit'};}
function close(report, externalReceipt=receipt(report)){return closeWorkflowReport(report,externalReceipt,{definition});}
function rehash(report){report.report_sha256=reportDigest(report);return report;}
const recoveryOptions={definition,effect:'READ_ONLY_DEVELOPMENT_VERIFICATION',diagnosis:'test failure'};

test('successful execution awaits external retention receipt',()=>{const report=checkpoint();assert.equal(report.state,'AWAITING_RECEIPT');assert.equal(report.closure,'OPEN');assert.equal(report.handoff_authorized,false);assert.deepEqual(validateWorkflowReport(report,{definition}),[]);});
test('matching external receipt closes development evidence only',()=>{const report=checkpoint();const result=close(report);assert.equal(result.state,'CLOSED');assert.equal(result.runtime_activation,'BLOCKED');assert.equal(result.shared_or_production_execution_authorized,false);});
test('closure snapshots the receipt so caller mutation cannot change recorded authority',()=>{const report=checkpoint(),externalReceipt=receipt(report),result=close(report,externalReceipt);externalReceipt.run_conclusion='failure';assert.equal(result.receipt.run_conclusion,'success');});
test('retention proves current readback without inventing a durable retention policy',()=>{const result=close(checkpoint());assert.equal(result.retention,'PROVEN');assert.equal(result.retention_scope,'ARTIFACT_READBACK_AT_OBSERVED_TIME');assert.equal(result.durable_retention_policy,'UNPROVEN');});
test('GitHub second-resolution expiry timestamps are accepted',()=>{const report=checkpoint(),externalReceipt=receipt(report);externalReceipt.artifact_expires_at=new Date(Date.parse(report.created_at)+86400000).toISOString().replace(/\.\d{3}Z$/, 'Z');assert.equal(close(report,externalReceipt).state,'CLOSED');});
test('expired or impossible receipt observation timestamps block closure',()=>{const report=checkpoint(),externalReceipt=receipt(report);for(const changes of [{observed_at:new Date(Date.parse(report.created_at)-1000).toISOString()},{artifact_expires_at:report.created_at},{artifact_expires_at:new Date(Date.parse(report.created_at)-1000).toISOString()}])assert.equal(close(report,{...externalReceipt,...changes}).state,'BLOCKED');});
test('receipt consistency without a trusted workflow definition cannot close',()=>{const report=checkpoint();assert.equal(closeWorkflowReport(report,receipt(report)).state,'BLOCKED');});
for(const [field,value] of Object.entries({repository:'other/teach-v2',run_id:3,attempt:2,job_id:'other',event:'workflow_dispatch',workflow_path:'other',workflow_sha256:'e'.repeat(64),workflow_source_sha:'e'.repeat(40),workflow_source_verified:false,source_sha:'e'.repeat(40),tree_sha:'e'.repeat(40),artifact_id:0,artifact_sha256:'e'.repeat(64),archive_sha256:'e'.repeat(64),artifact_report_sha256:'e'.repeat(64),artifact_expired:true,upload_outcome:'failure',job_conclusion:'failure',observed_at:'invalid',artifact_expires_at:'invalid',run_conclusion:'failure',artifact_name:'wrong'}))test(`receipt rejects ${field}`,()=>{const report=checkpoint();assert.equal(close(report,{...receipt(report),[field]:value}).state,'BLOCKED');});
for(const field of ['repository','event','job_conclusion','run_id','artifact_id','artifact_report_sha256','observed_at','artifact_expires_at','workflow_source_sha','workflow_source_verified'])test(`receipt rejects omitted ${field}`,()=>{const report=checkpoint(),externalReceipt=receipt(report);delete externalReceipt[field];assert.equal(close(report,externalReceipt).state,'BLOCKED');});
for(const [outcome,conclusion,state] of [['failure','success','FAILED'],['cancelled','cancelled','INTERRUPTED'],['skipped','skipped','BLOCKED'],['success','failure','CONTRADICTORY'],['skipped','success','CONTRADICTORY'],['cancelled','success','CONTRADICTORY']])test(`step ${outcome}/${conclusion} stays ${state}`,()=>{const altered=structuredClone(input);altered.steps.verify={outcome,conclusion};const report=buildWorkflowReport(altered);assert.equal(report.state,state);assert.deepEqual(validateWorkflowReport(report,{definition}),[]);assert.equal(close(report).state,'BLOCKED');});
test('missing step blocks',()=>{const altered=structuredClone(input);delete altered.steps.verify;assert.equal(buildWorkflowReport(altered).state,'BLOCKED');});
test('unregistered observed step blocks even when successful',()=>{const altered=structuredClone(input);altered.steps.unregistered={outcome:'success',conclusion:'success'};const report=buildWorkflowReport(altered);assert.equal(report.state,'BLOCKED');assert.equal(close(report).state,'BLOCKED');});
test('dirty and wrong source block',()=>{for(const source of [{...input.source,dirty:true},{...input.source,source_sha:'e'.repeat(40)}])assert.equal(buildWorkflowReport({...input,source}).state,'BLOCKED');});
test('wrong captured job and absent repository cannot yield a verified report',()=>{for(const context of [{...input.context,job_id:'other'},{...input.context,repository:undefined}])assert.equal(buildWorkflowReport({...input,context}).state,'BLOCKED');});
test('workflow_run observers capture their own source identity',()=>{const report=buildWorkflowReport({...input,context:{...input.context,event:'workflow_run'}});assert.deepEqual(validateWorkflowReport(report,{definition}),[]);assert.equal(report.state,'AWAITING_RECEIPT');});
test('missing or invalid actual workflow source blocks capture',()=>{for(const workflow_source_sha of [undefined,null,'unknown','e'.repeat(39)])assert.equal(buildWorkflowReport({...input,context:{...input.context,workflow_source_sha}}).state,'BLOCKED');});
test('PR capture retains successful outcomes while merge-ref workflow provenance blocks closure',()=>{const report=buildWorkflowReport({...input,context:{...input.context,event:'pull_request',workflow_source_sha:'e'.repeat(40)}});assert.equal(report.state,'AWAITING_RECEIPT');assert.deepEqual(validateWorkflowReport(report,{definition}),[]);const externalReceipt={...receipt(report),event:'pull_request',workflow_source_sha:report.workflow_source_sha,workflow_source_verified:false};assert.equal(close(report,externalReceipt).state,'BLOCKED');assert.equal(close(report,{...externalReceipt,workflow_source_verified:true}).state,'BLOCKED');});
test('tampered report rejected',()=>{const report=checkpoint();assert.equal(close({...report,created_at:'changed'},receipt(report)).state,'BLOCKED');});
for(const [label,mutate] of [
  ['failed outcome presented as success',report=>{report.outcomes[1].outcome='failure';}],
  ['failed conclusion presented as success',report=>{report.outcomes[1].conclusion='failure';}],
  ['failed job presented as success',report=>{report.job_status='failure';}],
  ['missing outcome',report=>{report.outcomes.pop();}],
  ['duplicate outcome',report=>{report.outcomes[1]={...report.outcomes[0]};}],
  ['unregistered outcome',report=>{report.outcomes.push({id:'surprise',outcome:'success',conclusion:'success'});}],
  ['erased outcomes',report=>{report.outcomes=[];}],
  ['omitted required step in both lists',report=>{report.required_steps.pop();report.outcomes.pop();}],
  ['duplicate required step',report=>{report.required_steps[1]='checkout';report.outcomes[1]={...report.outcomes[0]};}],
  ['unregistered required step in both lists',report=>{report.required_steps[1]='surprise';report.outcomes[1].id='surprise';}],
  ['missing version',report=>{delete report.version;}],
  ['wrong version',report=>{report.version='1.0.0';}],
  ['wrong kind',report=>{report.kind='product-workflow';}],
  ['unregistered top-level authority',report=>{report.retry_authorized=true;}],
  ['unregistered source field',report=>{report.source.runtime_activation='ACTIVE';}],
  ['arbitrary step payload',report=>{report.outcomes[0].outputs={secret:'not allowed'};}],
  ['dirty source',report=>{report.source.dirty=true;}],
  ['wrong source type',report=>{report.source.dirty='false';}],
  ['wrong expected source',report=>{report.expected_source_sha='e'.repeat(40);}],
  ['invalid source SHA',report=>{report.source.source_sha='unknown';}],
  ['empty tree',report=>{report.source.tree_sha='';}],
  ['zero run',report=>{report.run_id=0;}],
  ['fractional attempt',report=>{report.attempt=1.5;}],
  ['invalid event',report=>{report.event='pull_request_target';}],
  ['invalid repository',report=>{report.repository='unknown';}],
  ['invalid timestamp',report=>{report.created_at='today';}],
  ['missing actual workflow source',report=>{delete report.workflow_source_sha;}],
  ['invalid actual workflow source',report=>{report.workflow_source_sha='unknown';}],
  ['changed actual workflow source',report=>{report.workflow_source_sha='e'.repeat(40);}],
  ['changed workflow identity',report=>{report.workflow_sha256='e'.repeat(64);}],
  ['changed job identity',report=>{report.job_id='other';}],
  ['changed step order',report=>{report.outcomes.reverse();}],
  ['fabricated errors',report=>{report.errors=['unverified claim'];}],
  ['runtime activation',report=>{report.runtime_activation='ACTIVE';}],
  ['product conformance',report=>{report.full_runtime_conformance='PROVEN';}],
  ['production authority',report=>{report.shared_or_production_execution_authorized=true;}],
  ['early closure',report=>{report.closure='CLOSED';}],
  ['early handoff',report=>{report.handoff_authorized=true;}],
  ['early retention',report=>{report.retention='PROVEN';}],
  ['recovery policy escalation',report=>{report.recovery='retry immediately';}],
])test(`even rehashed report rejects ${label}`,()=>{const report=checkpoint(),externalReceipt=receipt(report);mutate(report);rehash(report);externalReceipt.artifact_report_sha256=report.report_sha256;assert.equal(close(report,externalReceipt).state,'BLOCKED');});
for(const value of [null,undefined,42,'checkpoint',[],{}])test(`malformed checkpoint ${JSON.stringify(value)} fails closed`,()=>{assert.equal(closeWorkflowReport(value,{}, {definition}).state,'BLOCKED');assert.equal(planWorkflowRecovery(value,recoveryOptions).state,'BLOCKED');});
test('failed read-only attempt needs diagnosis and a new attempt bound to prior evidence',()=>{const report=buildWorkflowReport({...input,jobStatus:'failure'});assert.equal(planWorkflowRecovery(report).state,'BLOCKED');const next=planWorkflowRecovery(report,recoveryOptions);assert.equal(next.state,'NEW_ATTEMPT_REQUIRED');assert.equal(next.preserve_prior_evidence,true);assert.equal(next.checkpoint_sha256,report.report_sha256);assert.equal(next.next_attempt,2);assert.equal(next.source_sha,input.source.source_sha);});
test('caller-declared effect alone grants no recovery authority',()=>{const report=buildWorkflowReport({...input,jobStatus:'failure'});assert.equal(planWorkflowRecovery(report,{effect:'READ_ONLY_DEVELOPMENT_VERIFICATION',diagnosis:'test failure'}).state,'BLOCKED');});
test('recovery rejects missing, mismatched and effectful authoritative definitions',()=>{const report=buildWorkflowReport({...input,jobStatus:'failure'});for(const altered of [{...definition,required_steps:['checkout']},{...definition,effect:'EXTERNAL_WRITE'},{...definition,verification_scope:'PRODUCTION'},{...definition,shared_or_production_execution_authorized:true}])assert.equal(planWorkflowRecovery(report,{...recoveryOptions,definition:altered}).state,'BLOCKED');});
test('recovery rejects tampering and rehashed outcome contradictions',()=>{const report=buildWorkflowReport({...input,jobStatus:'failure'});assert.equal(planWorkflowRecovery({...report,attempt:2},recoveryOptions).state,'BLOCKED');report.state='BLOCKED';rehash(report);assert.equal(planWorkflowRecovery(report,recoveryOptions).state,'BLOCKED');});
test('recovery refuses unsafe attempt overflow',()=>{const report=buildWorkflowReport({...input,context:{...input.context,attempt:Number.MAX_SAFE_INTEGER},jobStatus:'failure'});assert.equal(planWorkflowRecovery(report,recoveryOptions).state,'BLOCKED');});
test('external side effects never gain automatic retry authority',()=>{const report=buildWorkflowReport({...input,jobStatus:'failure'});for(const canonical_readback of ['UNKNOWN','PROVEN'])assert.equal(planWorkflowRecovery(report,{...recoveryOptions,effect:'EXTERNAL_WRITE',canonical_readback}).state,'BLOCKED');});
test('all CI and product workflows inventoried without product closure claims',()=>{const inventory=deriveWorkflowInventory(root);assert.equal(inventory.product.length,23);assert.ok(inventory.ci.length>=44);assert.ok(inventory.product.every(row=>row.closure==='BLOCKED'));assert.deepEqual(inspectWorkflowLifecycles(root),[]);});
