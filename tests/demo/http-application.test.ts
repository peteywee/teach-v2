import assert from 'node:assert/strict';
import test from 'node:test';
import {createDemoApplication} from '../../src/bootstrap/demo/application.js';
import {createDemoHttpHandler} from '../../src/bootstrap/demo/http.js';
import {MemoryDemoTransaction} from './memory-transaction.js';
import {assertOperationResponse} from './schema-assertion.js';
import type {DemoOperation} from '../../src/bootstrap/demo/application-port.js';

test('actual HTTP/application wiring completes all fifteen exact operations with approved DTOs',async()=>{
 const db=new MemoryDemoTransaction();const origin='http://localhost:4444';const handler=createDemoHttpHandler({application:createDemoApplication({transactions:db}),allowedOrigin:origin});let cookie='';let sequence=0;
 async function call(operation:DemoOperation,path:string,method='GET',body?:object,key?:string){const response=await handler(new Request(origin+path,{method,headers:{...(cookie?{Cookie:cookie}:{}),...(method==='GET'?{}:{Origin:origin,'Content-Type':'application/json'}),...(key?{'Idempotency-Key':key}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})}));assert.ok(response.ok,operation+' succeeds');const issued=response.headers.get('set-cookie');if(issued)cookie=issued.split(';')[0]!;if(response.status===204)return null;const result=await response.json();assertOperationResponse(operation,result);return result;}
 const current=await call('BeginDemoRun','/api/v1/demo/start','POST',{});const scope=current.demo.scope;const base=`/api/v1/organizations/${scope.organizationId}/locations/${scope.locationId}`;
 await call('ReadCurrentSession','/api/v1/session');await call('ListOwnMemberships','/api/v1/memberships');
 const assignments=await call('ListOwnAssignments',base+'/assignments/mine');const a=assignments.items[0].assignment;
 const content=await call('ReadAssignedContentVersion',base+`/content/${a.contentPackId}/versions/${encodeURIComponent(a.contentVersion.version)}`);
 await call('ReadOwnLearnerState',base+'/learner-state/mine');
 const session=await call('StartLearningSession',base+'/learning-sessions','POST',{assignmentId:a.id},'http_start_key_1234');
 for(const block of content.blocks)await call('RecordProgressEvent',base+`/learning-sessions/${session.id}/progress-events`,'POST',{blockId:block.id,selectedOptionIndex:0},'http_progress_key_'+sequence++);
 await call('CompleteLearningSession',base+`/learning-sessions/${session.id}/complete`,'POST',{});
 await call('SwitchDemoPersona','/api/v1/demo/persona','POST',{...scope,persona:'MANAGER'});
 const team=await call('ListTeam',base+'/team');await call('ReadTeamMemberLearnerState',base+`/team/${team.items[0].identityId}/learner-state`);
 await call('AssignContent',base+'/assignments','POST',{identityId:a.identityId,contentPackId:a.contentPackId,contentVersion:a.contentVersion},'http_assign_key_1234');
 await call('CloseDemoRun','/api/v1/demo/close','POST',scope);
 await call('BeginDemoRun','/api/v1/demo/start','POST',{});await call('RevokeApplicationSession','/api/v1/session','DELETE');
 assert.equal(db.state.runs.size,2);assert.equal([...db.state.runs.values()].filter(run=>run.status==='CLOSED').length,1);
});
