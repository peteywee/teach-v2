import { assertIsolatedDatabaseTarget } from '../../../scripts/db/isolated-database-target.mjs';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { before,beforeEach,after,test } from 'node:test';
import pg from 'pg';
import { applyDemoMigrations } from '../../../scripts/db/migrate-demo-isolated.js';
import { PostgresDemoTransaction } from '../../../src/bootstrap/demo/postgres-demo-transaction.js';
import { createDemoHttpHandler } from '../../../src/bootstrap/demo/http.js';
import type {DemoTransactionRunner} from '../../../src/bootstrap/demo/demo-transaction.js';
import { createDemoApplication } from '../../../src/bootstrap/demo/application.js';
import type { DemoOperation } from '../../../src/bootstrap/demo/application-port.js';
import { assertOperationResponse } from '../../demo/schema-assertion.js';

const connectionString=assertIsolatedDatabaseTarget(process.env.DATABASE_URL);
const pool=new pg.Pool({connectionString,statement_timeout:5000,max:16});
const application=createDemoApplication({transactions:new PostgresDemoTransaction(pool)});
const code=(expected:string)=>(error:unknown)=>error instanceof Error&&(error as any).code===expected;
function visitor(app=application){
  let credential:string|null=null;let scope:Record<string,string>={};
  return {get credential(){return credential;},get scope(){return scope;},async call(operation:DemoOperation,body:Record<string,unknown>={},params:Record<string,string>={},key:string|null=null,oldCredential?:string|null):Promise<any>{
    const result=await app.execute({operation,credential:oldCredential===undefined?credential:oldCredential,requestId:randomUUID(),admissionPrefix:'SHARED_UNKNOWN',readInput:()=>({params:{...scope,...params},body,query:{limit:20,cursor:null,assignmentId:null},idempotencyKey:key})});
    assertOperationResponse(operation,result.body);if(result.issuedCredential)credential=result.issuedCredential;if(result.clearCookie)credential=null;if(operation==='BeginDemoRun')scope=(result.body as any).demo.scope;return result.body;
  }};
}
async function count(table:string){const allowed=['organization_demo_runs','identity_demo_personas','identity_application_sessions','learning_assignments','learning_sessions','learning_progress_events','audit_events','lifecycle_events','transaction_command_receipts'];assert.ok(allowed.includes(table));return Number((await pool.query(`select count(*)::int as n from ${table}`)).rows[0].n);}
before(async()=>{
  await applyDemoMigrations(pool);
  await pool.query(`create schema demo_service_test;create table demo_service_test.faults(kind text primary key,action text not null);
    create function demo_service_test.reject_required_fact() returns trigger language plpgsql as $$ begin
      if tg_table_name='audit_events' then
        if exists(select 1 from demo_service_test.faults where kind='audit' and action=new.action) then raise exception 'injected required audit failure';end if;
      elsif tg_table_name='lifecycle_events' then
        if exists(select 1 from demo_service_test.faults where kind='lifecycle' and action=new.owner_command) then raise exception 'injected lifecycle failure';end if;
      elsif tg_table_name='transaction_command_receipts' then
        if exists(select 1 from demo_service_test.faults where kind='receipt' and action=new.operation) then raise exception 'injected receipt failure';end if;
      end if;
      return new;end $$;
    create trigger demo_service_test_audit before insert on audit_events for each row execute function demo_service_test.reject_required_fact();
    create trigger demo_service_test_lifecycle before insert on lifecycle_events for each row execute function demo_service_test.reject_required_fact();
    create trigger demo_service_test_receipt before insert on transaction_command_receipts for each row execute function demo_service_test.reject_required_fact();`);
});
beforeEach(async()=>{await pool.query('truncate organization_organizations,identity_identities cascade');await pool.query('truncate demo_service_test.faults');});
after(async()=>{await pool.query('drop schema if exists demo_service_test cascade');await pool.end();});

test('every nested required Begin audit failure rolls back all scoped records and returns no cookie',async()=>{
  for(const action of ['CreateDemoPersona','CreateMembership','PublishContentPack','AssignContent','CreateApplicationSession','BeginDemoRun']){
    await pool.query("insert into demo_service_test.faults values('audit',$1) on conflict(kind) do update set action=excluded.action",[action]);
    const v=visitor();await assert.rejects(v.call('BeginDemoRun'));assert.ok(v.credential===null,'failed transaction issues no credential');
    for(const table of ['organization_demo_runs','identity_demo_personas','identity_application_sessions','learning_assignments','audit_events','lifecycle_events','transaction_command_receipts'])assert.equal(await count(table),0,table);
  }
});

test('recipe references are persisted in the same immutable ContentPack and browsing saves no learning records',async()=>{
  const v=visitor();await v.call('BeginDemoRun');const a=(await v.call('ListOwnAssignments')).items[0].assignment;
  const params={contentPackId:a.contentPackId,contentVersion:a.contentVersion.version};
  const pack=await v.call('ReadAssignedContentVersion',{},params);
  assert.equal(pack.schemaVersion,'1.2.0');assert.equal(pack.recipes.length,3);assert.equal(pack.blocks.length,3);
  assert.ok(pack.recipes.every((r:any)=>r.title.startsWith('Fictional sample:')&&r.reference.includes('General handoff practice')));
  assert.deepEqual(pack.stations.map((station:any)=>station.label),['Fry','Cold Prep','Hot Prep']);
  assert.equal(pack.people.length,3);assert.equal(pack.equipment.length,8);assert.equal(pack.inventory.length,8);
  assert.ok(pack.stations.every((station:any)=>pack.people.some((person:any)=>person.id===station.responsiblePersonId)));
  assert.ok(pack.recipes.every((recipe:any)=>pack.stations.some((station:any)=>station.id===recipe.stationId)&&recipe.requirements.every((part:any)=>pack.equipment.some((item:any)=>item.id===part.equipmentId))));
  assert.deepEqual(pack.contentVersion,a.contentVersion);
  const persisted=(await pool.query('SELECT canonical_json,digest FROM content_pack_versions WHERE content_pack_id=$1 AND version=$2',[a.contentPackId,a.contentVersion.version])).rows[0];
  assert.deepEqual(JSON.parse(persisted.canonical_json).recipes,pack.recipes);assert.equal(persisted.digest,a.contentVersion.digest);
  for(const field of ['stations','people','equipment','inventory'])assert.deepEqual(JSON.parse(persisted.canonical_json)[field],pack[field]);
  assert.deepEqual(await v.call('ReadAssignedContentVersion',{},params),pack);
  assert.equal(await count('learning_sessions'),0);assert.equal(await count('learning_progress_events'),0);
  const other=visitor();await other.call('BeginDemoRun');await assert.rejects(other.call('ReadAssignedContentVersion',{},params),code('NOT_FOUND'));
  await v.call('SwitchDemoPersona',{...v.scope,persona:'MANAGER'});await assert.rejects(v.call('ReadAssignedContentVersion',{},params),code('FORBIDDEN'));
});

test('concurrent identical start and response requests persist one effect and original receipt',async()=>{
  const v=visitor();await v.call('BeginDemoRun');const a=(await v.call('ListOwnAssignments')).items[0].assignment;
  const started=await Promise.all(Array.from({length:8},()=>v.call('StartLearningSession',{assignmentId:a.id},{},'parallel_start_12345')));
  assert.equal(new Set(started.map(s=>s.id)).size,1);assert.equal(await count('learning_sessions'),1);
  const session=started[0];const content=await v.call('ReadAssignedContentVersion',{}, {contentPackId:a.contentPackId,contentVersion:a.contentVersion.version});
  const response={blockId:content.blocks[0].id,selectedOptionIndex:0};
  const recorded=await Promise.all(Array.from({length:8},()=>v.call('RecordProgressEvent',response,{learningSessionId:session.id},'parallel_response_123')));
  assert.equal(new Set(recorded.map(p=>p.id)).size,1);assert.equal(await count('learning_progress_events'),1);
  await assert.rejects(v.call('RecordProgressEvent',{...response,selectedOptionIndex:1},{learningSessionId:session.id},'parallel_response_123'),code('IDEMPOTENCY_KEY_REUSED'));
  assert.equal(await count('learning_progress_events'),1);
});

test('progress receipt failure rolls back response, and completion audit failure retains ACTIVE',async()=>{
  const v=visitor();await v.call('BeginDemoRun');const a=(await v.call('ListOwnAssignments')).items[0].assignment;
  const s=await v.call('StartLearningSession',{assignmentId:a.id},{},'atomic_start_123456');const pack=await v.call('ReadAssignedContentVersion',{}, {contentPackId:a.contentPackId,contentVersion:a.contentVersion.version});
  await pool.query("insert into demo_service_test.faults values('receipt','RecordProgressEvent')");
  await assert.rejects(v.call('RecordProgressEvent',{blockId:pack.blocks[0].id,selectedOptionIndex:0},{learningSessionId:s.id},'atomic_response_1234'));
  assert.equal(await count('learning_progress_events'),0);await pool.query('truncate demo_service_test.faults');
  for(const [i,block] of pack.blocks.entries())await v.call('RecordProgressEvent',{blockId:block.id,selectedOptionIndex:0},{learningSessionId:s.id},'atomic_response_1234_'+i);
  await pool.query("insert into demo_service_test.faults values('audit','CompleteLearningSession')");
  await assert.rejects(v.call('CompleteLearningSession',{}, {learningSessionId:s.id}));
  assert.equal((await pool.query('select status from learning_sessions where id=$1',[s.id])).rows[0].status,'ACTIVE');
  assert.equal(await count('learning_progress_events'),3);await pool.query('truncate demo_service_test.faults');
  assert.equal((await v.call('CompleteLearningSession',{}, {learningSessionId:s.id})).status,'COMPLETED');
});

test('two runs remain isolated and cross-run target selectors have identical NOT_FOUND failures',async()=>{
  const a=visitor(),b=visitor();const sa=await a.call('BeginDemoRun'),sb=await b.call('BeginDemoRun');
  assert.notEqual(sa.demo.runId,sb.demo.runId);assert.notEqual(sa.identityId,sb.identityId);
  const foreign=(await b.call('ListOwnAssignments')).items[0].assignment;
  await assert.rejects(a.call('ListOwnAssignments',{},b.scope),code('NOT_FOUND'));
  await assert.rejects(a.call('StartLearningSession',{assignmentId:foreign.id},{},'foreign_attempt_123'),code('NOT_FOUND'));
  await assert.rejects(a.call('StartLearningSession',{assignmentId:'absent'},{},'absent_attempt_1234'),code('NOT_FOUND'));
  assert.equal(await count('learning_sessions'),0);
});

test('last assignment slot serializes and independent manager attempts cannot exceed ten',async()=>{
  const v=visitor();const self=await v.call('BeginDemoRun');await v.call('SwitchDemoPersona',{...v.scope,persona:'MANAGER'});
  const state=(await v.call('ReadTeamMemberLearnerState',{}, {identityId:self.identityId})).items[0];
  const input={identityId:self.identityId,contentPackId:state.contentPackId,contentVersion:state.contentVersion};
  for(let i=0;i<8;i++)await v.call('AssignContent',input,{},'fill_assignment_'+i);
  const results=await Promise.allSettled([v.call('AssignContent',input,{},'last_slot_one_12345'),v.call('AssignContent',input,{},'last_slot_two_12345')]);
  assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.equal(await count('learning_assignments'),10);
});

test('switch versus close has one linearized winner and the old credential cannot return',async()=>{
  const v=visitor();await v.call('BeginDemoRun');const old=v.credential;
  const results=await Promise.allSettled([v.call('SwitchDemoPersona',{...v.scope,persona:'MANAGER'},{},null,old),v.call('CloseDemoRun',{...v.scope},{},null,old)]);
  assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
  await assert.rejects(v.call('ReadCurrentSession',{}, {},null,old),code('UNAUTHENTICATED'));
  const run=(await pool.query('select status from organization_demo_runs')).rows[0];
  const active=Number((await pool.query("select count(*)::int as n from identity_application_sessions where status='ACTIVE'")).rows[0].n);
  assert.equal(active,run.status==='ACTIVE'?1:0);
});

test('required lifecycle and command receipt failures leave no nested Begin records or HTTP cookie',async()=>{
 for(const [kind,action] of [['lifecycle','BeginDemoRun'],['lifecycle','CreateDemoPersona'],['lifecycle','CreateMembership'],['lifecycle','AssignContent'],['receipt','AssignContent']]){
  await pool.query('truncate demo_service_test.faults');await pool.query('insert into demo_service_test.faults values($1,$2)',[kind,action]);
  const origin='http://localhost:4444';const handler=createDemoHttpHandler({application,allowedOrigin:origin});const response=await handler(new Request(origin+'/api/v1/demo/start',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:'{}'}));
  assert.equal(response.status,503);assert.equal(response.headers.get('set-cookie'),null);assert.equal((await response.json()).error.message,'Service unavailable.');assert.equal(await count('organization_demo_runs'),0);assert.equal(await count('audit_events'),0);
 }
});

test('required Switch and Close facts roll back revocation, issuance and terminal transitions',async()=>{
 const v=visitor();await v.call('BeginDemoRun');const initialCount=await count('identity_application_sessions');
 for(const action of ['RevokeApplicationSession','CreateApplicationSession','SwitchDemoPersona']){
  await pool.query("insert into demo_service_test.faults values('audit',$1) on conflict(kind) do update set action=excluded.action",[action]);
  await assert.rejects(v.call('SwitchDemoPersona',{...v.scope,persona:'MANAGER'}));assert.equal((await v.call('ReadCurrentSession')).demo.persona,'LEARNER');assert.equal(await count('identity_application_sessions'),initialCount);
 }
 for(const [kind,action] of [['audit','RevokeDemoSessions'],['audit','CloseDemoRun'],['lifecycle','CloseDemoRun']]){
  await pool.query('truncate demo_service_test.faults');await pool.query('insert into demo_service_test.faults values($1,$2)',[kind,action]);await assert.rejects(v.call('CloseDemoRun',{...v.scope}));assert.equal((await v.call('ReadCurrentSession')).demo.persona,'LEARNER');assert.equal((await pool.query('select status from organization_demo_runs')).rows[0].status,'ACTIVE');
 }
});

function shortLivedVisitor(){
 const real=new PostgresDemoTransaction(pool);
 const runner:DemoTransactionRunner={run:work=>real.run(tx=>{const organization=Object.create(tx.organization) as typeof tx.organization;organization.lockAdmission=async prefix=>{const value=await tx.organization.lockAdmission(prefix);return {...value,now:new Date(value.now.getTime()-3598000)};};return work({...tx,organization});})};
 return visitor(createDemoApplication({transactions:runner}));
}
async function waitPast(deadline:string){const remaining=Date.parse(deadline)-Date.now()+70;await new Promise(resolve=>setTimeout(resolve,Math.max(0,remaining)));}

test('fresh DB time after a blocked membership lock denies a deadline crossed while waiting',async()=>{
 const v=shortLivedVisitor();const current=await v.call('BeginDemoRun');const client=await pool.connect();
 try{await client.query('begin');await client.query('select id from organization_memberships where identity_id=$1 for update',[current.identityId]);
  const pending=assert.rejects(v.call('ListOwnAssignments'),code('UNAUTHENTICATED'));await waitPast(current.demo.expiresAt);await client.query('commit');await pending;
 }finally{await client.query('rollback');client.release();}
});

test('fresh DB time after a blocked receipt lookup denies replay across the run deadline',async()=>{
 const v=shortLivedVisitor();const current=await v.call('BeginDemoRun');const a=(await v.call('ListOwnAssignments')).items[0].assignment;const key='deadline_start_receipt';await v.call('StartLearningSession',{assignmentId:a.id},{},key);const client=await pool.connect();
 try{await client.query('begin');await client.query('select id from transaction_command_receipts where operation=$1 for update',['StartLearningSession']);
  const pending=assert.rejects(v.call('StartLearningSession',{assignmentId:a.id},{},key),code('UNAUTHENTICATED'));await waitPast(current.demo.expiresAt);await client.query('commit');await pending;assert.equal(await count('learning_sessions'),1);
 }finally{await client.query('rollback');client.release();}
});

test('current membership revocation wins before a waiting protected read, not a stale grant snapshot',async()=>{
 const v=visitor();const current=await v.call('BeginDemoRun');const client=await pool.connect();
 try{await client.query('begin');await client.query("update organization_memberships set status='INACTIVE',updated_at=clock_timestamp() where identity_id=$1",[current.identityId]);const pending=assert.rejects(v.call('ListOwnAssignments'),code('FORBIDDEN'));await new Promise(resolve=>setTimeout(resolve,25));await client.query('commit');await pending;assert.equal((await v.call('ListOwnMemberships')).items.length,0);
 }finally{await client.query('rollback');client.release();}
});

test('final transaction fence rolls back effects after audit and lifecycle insert lock waits cross expiry',async()=>{
 for(const stage of ['audit','lifecycle'] as const){
  const v=shortLivedVisitor();const current=await v.call('BeginDemoRun');const a=(await v.call('ListOwnAssignments')).items[0].assignment;
  let sessionId:string|null=null;
  if(stage==='audit'){
   const session=await v.call('StartLearningSession',{assignmentId:a.id},{},'late_complete_start');sessionId=session.id;
   const pack=await v.call('ReadAssignedContentVersion',{}, {contentPackId:a.contentPackId,contentVersion:a.contentVersion.version});
   for(const [i,block] of pack.blocks.entries())await v.call('RecordProgressEvent',{blockId:block.id,selectedOptionIndex:0},{learningSessionId:session.id},'late_complete_response_'+i);
  }
  const before={audit:await count('audit_events'),receipts:await count('transaction_command_receipts')};const client=await pool.connect();
  try{await client.query('begin');await client.query(stage==='audit'?'lock table audit_events in share mode':'lock table lifecycle_events in share mode');
   const pending=assert.rejects(stage==='audit'?v.call('CompleteLearningSession',{}, {learningSessionId:sessionId!}):v.call('CloseDemoRun',{...v.scope}),code('UNAUTHENTICATED'));await waitPast(current.demo.expiresAt);await client.query('commit');await pending;
   assert.equal(await count('audit_events'),before.audit);assert.equal(await count('transaction_command_receipts'),before.receipts);assert.equal((await pool.query('select status from organization_demo_runs where id=$1',[current.demo.runId])).rows[0].status,'ACTIVE');assert.equal((await pool.query('select count(*)::int as n from identity_application_sessions where status=$1',['REVOKED'])).rows[0].n,0);
   if(sessionId)assert.equal((await pool.query('select status from learning_sessions where id=$1',[sessionId])).rows[0].status,'ACTIVE');
  }finally{await client.query('rollback');client.release();}
 }
});

test('fresh PostgreSQL HTTP requests complete all fifteen routes and persist manager reassignment/readback',async()=>{
 const origin='http://localhost:4444';let cookie='';let sequence=0;
 async function call(operation:DemoOperation,path:string,method='GET',body?:object,key?:string):Promise<any>{
  // Recompose per request: no application or DTO cache can substitute for persisted readback.
  const handler=createDemoHttpHandler({application:createDemoApplication({transactions:new PostgresDemoTransaction(pool)}),allowedOrigin:origin});
  const response=await handler(new Request(origin+path,{method,headers:{...(cookie?{Cookie:cookie}:{}),...(method==='GET'?{}:{Origin:origin,'Content-Type':'application/json'}),...(key?{'Idempotency-Key':key}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})}));assert.ok(response.ok,operation+' succeeds');
  const issued=response.headers.get('set-cookie');if(issued)cookie=issued.split(';')[0]!;if(response.status===204)return null;const result=await response.json();assertOperationResponse(operation,result);return result;
 }
 const current=await call('BeginDemoRun','/api/v1/demo/start','POST',{});const scope=current.demo.scope;const base=`/api/v1/organizations/${scope.organizationId}/locations/${scope.locationId}`;
 await call('ReadCurrentSession','/api/v1/session');await call('ListOwnMemberships','/api/v1/memberships');
 const a=(await call('ListOwnAssignments',base+'/assignments/mine')).items[0].assignment;const content=await call('ReadAssignedContentVersion',base+`/content/${a.contentPackId}/versions/${encodeURIComponent(a.contentVersion.version)}`);await call('ReadOwnLearnerState',base+'/learner-state/mine');
 const session=await call('StartLearningSession',base+'/learning-sessions','POST',{assignmentId:a.id},'pg_http_start_key_1234');
 for(const block of content.blocks)await call('RecordProgressEvent',base+`/learning-sessions/${session.id}/progress-events`,'POST',{blockId:block.id,selectedOptionIndex:0},'pg_http_progress_'+sequence++);
 assert.equal((await call('CompleteLearningSession',base+`/learning-sessions/${session.id}/complete`,'POST',{})).status,'COMPLETED');
 await call('SwitchDemoPersona','/api/v1/demo/persona','POST',{...scope,persona:'MANAGER'});const team=await call('ListTeam',base+'/team');const manager=await call('ReadTeamMemberLearnerState',base+`/team/${team.items[0].identityId}/learner-state`);
 assert.equal(manager.items[0].session.status,'COMPLETED');assert.equal(manager.items[0].recordedBlockCount,3);assert.doesNotMatch(JSON.stringify(manager),/responses|feedback|selectedOptionIndex|matchesExpectedChoice|score|certification/);
 const next=await call('AssignContent',base+'/assignments','POST',{identityId:a.identityId,contentPackId:a.contentPackId,contentVersion:a.contentVersion},'pg_http_assign_key_1234');assert.notEqual(next.id,a.id);
 await call('SwitchDemoPersona','/api/v1/demo/persona','POST',{...scope,persona:'LEARNER'});const assignments=await call('ListOwnAssignments',base+'/assignments/mine');assert.equal(assignments.items.length,2);assert.equal(assignments.items.find((x:any)=>x.assignment.id===a.id).session.status,'COMPLETED');assert.equal(assignments.items.find((x:any)=>x.assignment.id===next.id).session,null);
 const states=await call('ReadOwnLearnerState',base+'/learner-state/mine');assert.equal(states.items.find((x:any)=>x.assignmentId===a.id).responses.length,3);assert.equal(states.items.find((x:any)=>x.assignmentId===next.id).responses.length,0);
 await call('CloseDemoRun','/api/v1/demo/close','POST',scope);const reset=await call('BeginDemoRun','/api/v1/demo/start','POST',{});assert.notEqual(reset.demo.runId,current.demo.runId);await call('RevokeApplicationSession','/api/v1/session','DELETE');assert.equal(await count('organization_demo_runs'),2);assert.equal((await pool.query('select status from organization_demo_runs where id=$1',[current.demo.runId])).rows[0].status,'CLOSED');
});
