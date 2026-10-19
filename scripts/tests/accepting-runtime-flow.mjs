import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
export async function exerciseAcceptingRuntime(root,transactions){
const {assembleHostedRuntime}=await import(pathToFileURL(join(root,'src/bootstrap/demo-successor/runtime.js')).href);
const origin='https://demo.example.test';
let failNext=false;
const {handle:handler}=assembleHostedRuntime({origin,options:{}},{run:work=>transactions.run(async tx=>{const value=await work(tx);if(failNext){failNext=false;throw Error('synthetic failed commit boundary');}return value;})});
const assets=new Map(JSON.parse(readFileSync(join(root,'src/web/demo/assets.json'))).map(row=>[row.path,{bytes:readFileSync(join(root,'src/web/demo',row.file))}]));
for(const [path,asset]of assets){const r=await handler(new Request(origin+path,{headers:{Host:'demo.example.test'}}));assert.equal(r.status,200);assert.deepEqual(Buffer.from(await r.arrayBuffer()),asset.bytes);}
let cookie='',sequence=0;const operations=new Set();
async function call(operation,path,method='GET',body,key){const response=await handler(new Request(origin+path,{method,headers:{Host:'demo.example.test',...(cookie?{Cookie:cookie}:{}),...(method==='GET'?{}:{Origin:origin,'Content-Type':'application/json'}),...(key?{'Idempotency-Key':key}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})}));assert.ok(response.ok,operation+': '+response.status);operations.add(operation);const issued=response.headers.get('set-cookie');if(issued)cookie=issued.split(';')[0];return response.status===204?null:response.json();}
const current=await call('BeginDemoRun','/api/v1/demo/start','POST',{}),scope=current.demo.scope,base=`/api/v1/organizations/${scope.organizationId}/locations/${scope.locationId}`;
await call('ReadCurrentSession','/api/v1/session');await call('ListOwnMemberships','/api/v1/memberships');
const a=(await call('ListOwnAssignments',base+'/assignments/mine')).items[0].assignment;
const content=await call('ReadAssignedContentVersion',base+`/content/${a.contentPackId}/versions/${encodeURIComponent(a.contentVersion.version)}`);
await call('ReadOwnLearnerState',base+'/learner-state/mine');
const session=await call('StartLearningSession',base+'/learning-sessions','POST',{assignmentId:a.id},'packaged_start_1234');
failNext=true;
const failed=await handler(new Request(origin+base+`/learning-sessions/${session.id}/progress-events`,{method:'POST',headers:{Host:'demo.example.test',Origin:origin,Cookie:cookie,'Content-Type':'application/json','Idempotency-Key':'packaged_failed_save'},body:JSON.stringify({blockId:content.blocks[0].id,selectedOptionIndex:0})}));assert.equal(failed.status,503);
await call('RecordProgressEvent',base+`/learning-sessions/${session.id}/progress-events`,'POST',{blockId:content.blocks[0].id,selectedOptionIndex:0},'packaged_failed_save');
for(const block of content.blocks.slice(1))await call('RecordProgressEvent',base+`/learning-sessions/${session.id}/progress-events`,'POST',{blockId:block.id,selectedOptionIndex:0},'packaged_progress_'+sequence++);
await call('CompleteLearningSession',base+`/learning-sessions/${session.id}/complete`,'POST',{});
await call('SwitchDemoPersona','/api/v1/demo/persona','POST',{...scope,persona:'MANAGER'});
const team=await call('ListTeam',base+'/team');await call('ReadTeamMemberLearnerState',base+`/team/${team.items[0].identityId}/learner-state`);
await call('AssignContent',base+'/assignments','POST',{identityId:a.identityId,contentPackId:a.contentPackId,contentVersion:a.contentVersion},'packaged_assign_1234');
await call('CloseDemoRun','/api/v1/demo/close','POST',scope);
await call('BeginDemoRun','/api/v1/demo/start','POST',{});await call('RevokeApplicationSession','/api/v1/session','DELETE');
assert.equal((await handler(new Request(origin+'/api/v1/session',{headers:{Host:'demo.example.test',Cookie:cookie}}))).status,401);
assert.equal((await handler(new Request(origin+'/api/v1/demo/start',{method:'POST',headers:{Host:'demo.example.test',Origin:'https://evil.example.test','Content-Type':'application/json'},body:'{}'}))).status,403);
assert.equal(operations.size,15);assert.equal(assets.size,7);
console.log('PASS: accepting assembly 15 operations, 7 assets');
}
