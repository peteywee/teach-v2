import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import type pg from 'pg';
import { databaseSchema } from '../../src/platform/database-target.js';
import { createDemoApplication } from '../../src/bootstrap/demo/application.js';
import { PostgresDemoTransaction } from '../../src/bootstrap/demo/postgres-demo-transaction.js';
import type { DemoOperation } from '../../src/bootstrap/demo/application-port.js';

/** Called only inside the disposable local proof. No connection or activation. */
export async function exerciseRuntime({pool}:{pool:pg.Pool}):Promise<void>{
 assert.equal(databaseSchema,'teach_v2_demo');
 const app=createDemoApplication({transactions:new PostgresDemoTransaction(pool)});
 let credential:string|null=null;let scope:Record<string,string>={};
 async function call(operation:DemoOperation,body:Record<string,unknown>={},params:Record<string,string>={},key:string|null=null):Promise<any>{
  const result=await app.execute({operation,credential,requestId:randomUUID(),admissionPrefix:'SHARED_UNKNOWN',readInput:()=>({params:{...scope,...params},body,query:{limit:20,cursor:null,assignmentId:null},idempotencyKey:key})});
  if(result.issuedCredential)credential=result.issuedCredential;if(result.clearCookie)credential=null;
  if(operation==='BeginDemoRun')scope=(result.body as any).demo.scope;return result.body;
 }
 const begun=await call('BeginDemoRun');assert.equal(begun.demo.persona,'LEARNER');
 const assignment=(await call('ListOwnAssignments')).items[0].assignment;
 const session=await call('StartLearningSession',{assignmentId:assignment.id},{},'isolated_start_12345');
 assert.equal((await call('StartLearningSession',{assignmentId:assignment.id},{},'isolated_start_12345')).id,session.id);
 const content=await call('ReadAssignedContentVersion',{}, {contentPackId:assignment.contentPackId,contentVersion:assignment.contentVersion.version});
 assert.equal(content.recipes.length,3);
 for(const [index,block]of content.blocks.entries())await call('RecordProgressEvent',{blockId:block.id,selectedOptionIndex:0},{learningSessionId:session.id},`isolated_response_${index}`);
 assert.equal((await call('CompleteLearningSession',{}, {learningSessionId:session.id})).status,'COMPLETED');
 await call('SwitchDemoPersona',{...scope,persona:'MANAGER'});
 assert.equal((await call('ReadCurrentSession')).demo.persona,'MANAGER');
 assert.ok((await call('ReadTeamMemberLearnerState',{}, {identityId:begun.identityId})).items.length>0);
 await call('CloseDemoRun',{...scope});assert.equal(credential,null);
 assert.ok((await pool.query('SELECT pg_catalog.count(*)::int AS n FROM "teach_v2_demo"."audit_events"')).rows[0].n>0);
 console.log('Isolated runtime PASS: learner admission, recipes, idempotent start, three responses, completion, manager read, close, required audit');
}
