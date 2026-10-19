import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import type pg from 'pg';
import { databaseSchema } from '../../src/platform/database-target.js';
import { createDemoApplication } from '../../src/bootstrap/demo/application.js';
import { SuccessorDemoTransaction } from '../../src/bootstrap/demo-successor/transaction.js';
import type { DemoOperation } from '../../src/bootstrap/demo/application-port.js';

/** Called only inside the disposable local proof. No connection or activation. */
export async function exerciseRuntime({pool}:{pool:pg.Pool}):Promise<void>{
 assert.equal(databaseSchema,'teach_v2_demo');
 const app=createDemoApplication({transactions:new SuccessorDemoTransaction(pool)});
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
 let client:pg.PoolClient;
 const runner=new SuccessorDemoTransaction({connect:async()=>{client=await pool.connect();return client;}} as pg.Pool);
 await runner.run(async()=>{for(const [setting,expected]of [['statement_timeout','5s'],['lock_timeout','2s'],['idle_in_transaction_session_timeout','5s'],['transaction_timeout','10s']])assert.equal((await client.query('SHOW '+setting)).rows[0][setting!],expected);});
 const counts=async()=> (await pool.query('SELECT (SELECT pg_catalog.count(*) FROM teach_v2_demo.organization_demo_runs)::int AS runs,(SELECT pg_catalog.count(*) FROM teach_v2_demo.identity_identities)::int AS identities,(SELECT pg_catalog.count(*) FROM teach_v2_demo.audit_events)::int AS audit')).rows;
 const before=await counts();let timeoutCode:string|undefined;
 const timedApp=createDemoApplication({transactions:{run:work=>runner.run(async tx=>{const result=await work(tx);try{await client.query('SELECT pg_catalog.pg_sleep(6)');}catch(error){timeoutCode=(error as {code:string}).code;throw error;}return result;})}});
 await assert.rejects(()=>timedApp.execute({operation:'BeginDemoRun',credential:null,requestId:randomUUID(),admissionPrefix:'SHARED_UNKNOWN',readInput:()=>({params:{},body:{},query:{limit:20,cursor:null,assignmentId:null},idempotencyKey:null})}));
 assert.equal(timeoutCode,'57014');assert.deepEqual(await counts(),before,'timed-out writes, identities and audit all roll back');
 await runner.run(async tx=>{assert.ok(await tx.identity.now());});
 console.log('Successor PG17 timeout + recovery PASS');
 console.log('Isolated runtime PASS: learner admission, recipes, idempotent start, three responses, completion, manager read, close, required audit');
}
