import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';
import { createDemoApplication } from '../../src/bootstrap/demo/application.js';
import type { DemoOperation } from '../../src/bootstrap/demo/application-port.js';
import { assertOperationResponse } from './schema-assertion.js';
import { MemoryDemoTransaction } from './memory-transaction.js';

function setup() {
  const database = new MemoryDemoTransaction();
  const app = createDemoApplication({ transactions: database });
  let credential: string | null = null;
  let scope: Record<string, string> = {};
  async function invoke(operation: DemoOperation, body: Record<string, unknown> = {}, params: Record<string,string> = {}, key: string | null = null, overrideCredential: string | null | undefined = undefined): Promise<any> {
    const result = await app.execute({ operation, requestId:randomUUID(),credential:overrideCredential===undefined?credential:overrideCredential,admissionPrefix:'SHARED_UNKNOWN',readInput:()=>({params:{...scope,...params},body,query:{limit:20,cursor:null,assignmentId:null},idempotencyKey:key}) });
    assertOperationResponse(operation,result.body);
    if(result.issuedCredential)credential=result.issuedCredential;
    if(result.clearCookie)credential=null;
    if(operation==='BeginDemoRun')scope=(result.body as any).demo.scope;
    return result.body;
  }
  return { database, app, invoke, get credential(){return credential;},get scope(){return scope;} };
}
const code = (expected: string) => (error: unknown) => error instanceof Error && (error as any).code === expected;

test('Begin atomically provisions only the fixed two-persona run and required nested facts', async () => {
  const h=setup();const result=await h.invoke('BeginDemoRun');
  assert.equal(result.displayLabel,'Alex, demo learner');assert.equal(result.synthetic,true);assert.equal(result.demo.persona,'LEARNER');
  assert.equal(h.database.state.runs.size,1);assert.equal(h.database.state.identities.size,2);assert.equal(h.database.state.personas.size,2);assert.equal(h.database.state.memberships.size,2);assert.equal(h.database.state.assignments.size,1);assert.equal(h.database.state.content.size,1);assert.equal(h.database.state.sessions.size,1);
  assert.equal(h.database.state.audit.length,8);assert.equal(h.database.state.lifecycle.length,6);
  assert.ok(!JSON.stringify([...h.database.state.receipts.values()]).includes(h.credential!));
  await assert.rejects(h.invoke('BeginDemoRun'),code('PRECONDITION_FAILED'));
  assert.equal(h.database.state.runs.size,1);
});

test('failed nested audit or commit returns no issued secret and rolls back the whole admission', async () => {
  for(const action of ['CreateDemoPersona','CreateMembership','PublishContentPack','AssignContent','CreateApplicationSession','BeginDemoRun']){
    const h=setup();h.database.failAudit=action;await assert.rejects(h.invoke('BeginDemoRun'));assert.equal(h.database.state.runs.size,0);assert.equal(h.database.state.sessions.size,0);assert.ok(h.credential===null,'no credential issued');
  }
  const h=setup();h.database.failCommit=true;await assert.rejects(h.invoke('BeginDemoRun'));assert.equal(h.database.state.runs.size,0);assert.ok(h.credential===null,'no credential issued');
});

test('the full lesson records three wrong-or-right responses then completes without certification', async () => {
  const h=setup();await h.invoke('BeginDemoRun');
  const assignments=await h.invoke('ListOwnAssignments');const assignment=assignments.items[0].assignment;
  const content=await h.invoke('ReadAssignedContentVersion',{}, {contentPackId:assignment.contentPackId,contentVersion:assignment.contentVersion.version});
  assert.equal(content.blocks.length,3);assert.ok(!JSON.stringify(content).includes('expectedOptionIndex'));
  const session=await h.invoke('StartLearningSession',{assignmentId:assignment.id},{},'start_key_12345678');
  await assert.rejects(h.invoke('CompleteLearningSession',{}, {learningSessionId:session.id}),code('PRECONDITION_FAILED'));
  await assert.rejects(h.invoke('RecordProgressEvent',{blockId:content.blocks[1].id,selectedOptionIndex:0},{learningSessionId:session.id},'skip_key_123456789'),code('CONFLICT'));
  for(const [index,block] of content.blocks.entries()){
    const input={blockId:block.id,selectedOptionIndex:0};const key='progress_key_1234_'+index;
    const result=await h.invoke('RecordProgressEvent',input,{learningSessionId:session.id},key);
    assert.equal(result.sequence,index+1);assert.equal(result.evaluation.engineVersion,'1.0.0');
    assert.deepEqual(await h.invoke('RecordProgressEvent',input,{learningSessionId:session.id},key),result);
  }
  const completed=await h.invoke('CompleteLearningSession',{}, {learningSessionId:session.id});assert.equal(completed.status,'COMPLETED');
  await assert.rejects(h.invoke('CompleteLearningSession',{}, {learningSessionId:session.id}),code('CONFLICT'));
  assert.equal(h.database.state.progress.length,3);assert.equal(h.database.state.audit.filter(a=>a.action==='CompleteLearningSession').length,1);
  const states=await h.invoke('ReadOwnLearnerState');assert.equal(states.items[0].recordedBlockCount,3);assert.equal(states.items[0].responses.length,3);assert.equal(states.items[0].nextBlockId,null);
  assert.ok(!JSON.stringify(states).match(/score|certifi|mastery/));
});

test('manager reads exact reports without answers and deliberate repeat creates a distinct assignment', async () => {
  const h=setup();const first=await h.invoke('BeginDemoRun');const old=h.credential;
  const switched=await h.invoke('SwitchDemoPersona',{...h.scope,persona:'MANAGER'});assert.equal(switched.displayLabel,'Jordan, demo manager');assert.ok(h.credential!==old,'switch rotates the credential');
  await assert.rejects(h.invoke('ReadCurrentSession',{}, {},null,old),code('UNAUTHENTICATED'));
  await assert.rejects(h.invoke('SwitchDemoPersona',{...h.scope,persona:'MANAGER'}),code('CONFLICT'));
  const team=await h.invoke('ListTeam');assert.equal(team.items[0].identityId,first.identityId);
  const states=await h.invoke('ReadTeamMemberLearnerState',{}, {identityId:first.identityId});const state=states.items[0];
  assert.equal(state.recordedBlockCount,0);assert.equal(state.responses,undefined);assert.ok(!JSON.stringify(states).match(/selectedOption|matchesExpected|feedback/));
  const input={identityId:first.identityId,contentPackId:state.contentPackId,contentVersion:state.contentVersion};
  const repeat=await h.invoke('AssignContent',input,{},'assign_again_123456');assert.notEqual(repeat.id,state.assignmentId);
  assert.deepEqual(await h.invoke('AssignContent',input,{},'assign_again_123456'),repeat);
  await assert.rejects(h.invoke('AssignContent',{...input,contentVersion:{...state.contentVersion,digest:'sha256:'+'0'.repeat(64)}},{},'assign_again_123456'),code('IDEMPOTENCY_KEY_REUSED'));
  await assert.rejects(h.invoke('StartLearningSession',{assignmentId:repeat.id},{},'forged_12345678901'),code('FORBIDDEN'));
  assert.equal(h.database.state.assignments.size,2);
});

test('expired or closed run denies even SELF, while Close retains immutable history', async () => {
  const h=setup();const started=await h.invoke('BeginDemoRun');const old=h.credential;
  await h.invoke('CloseDemoRun',{...h.scope});assert.ok(h.credential===null,'no credential issued');assert.equal(h.database.state.runs.size,1);assert.equal([...h.database.state.runs.values()][0]!.status,'CLOSED');
  await assert.rejects(h.invoke('ReadCurrentSession',{}, {},null,old),code('UNAUTHENTICATED'));
  const replacement=await h.invoke('BeginDemoRun');assert.notEqual(replacement.demo.runId,started.demo.runId);assert.equal(h.database.state.runs.size,2);
  h.database.now=new Date(replacement.demo.expiresAt);
  await assert.rejects(h.invoke('ReadCurrentSession'),code('UNAUTHENTICATED'));
  await assert.rejects(h.invoke('CloseDemoRun',{...h.scope}),code('UNAUTHENTICATED'));
});

test('current membership, fixed bundle, scope and direct-report facts are not replaced by cookies', async () => {
  const h=setup();await h.invoke('BeginDemoRun');
  const memberId=[...h.database.state.memberships.values()].find(m=>m.bundles.includes('learner'))!.id;
  const membership=()=>h.database.state.memberships.get(memberId)!;
  membership().status='INACTIVE';assert.deepEqual((await h.invoke('ListOwnMemberships')).items,[]);assert.equal((await h.invoke('ReadCurrentSession')).allowedOperations.length,3);await assert.rejects(h.invoke('ListOwnAssignments'),code('FORBIDDEN'));
  membership().status='ACTIVE';membership().bundles=['manager','demo_visitor'];assert.equal((await h.invoke('ListOwnMemberships')).items.length,1);await assert.rejects(h.invoke('ListOwnAssignments'),code('FORBIDDEN'));
  membership().bundles=['learner','demo_visitor'];await assert.rejects(h.invoke('ListOwnAssignments',{}, {organizationId:'foreign',locationId:'foreign'}),code('NOT_FOUND'));
});

test('admission and assignment quotas retain current access and matching receipts still replay', async () => {
  for(const counts of [{prefixHour:10,globalHour:10,total:10},{prefixHour:0,globalHour:100,total:100},{prefixHour:0,globalHour:0,total:1000}]){
    const h=setup();h.database.admissionOverrides=counts;await assert.rejects(h.invoke('BeginDemoRun'),code('RATE_LIMITED'));assert.equal(h.database.state.runs.size,0);
  }
  const h=setup();const learner=await h.invoke('BeginDemoRun');await h.invoke('SwitchDemoPersona',{...h.scope,persona:'MANAGER'});
  const states=await h.invoke('ReadTeamMemberLearnerState',{}, {identityId:learner.identityId});const state=states.items[0];const body={identityId:learner.identityId,contentPackId:state.contentPackId,contentVersion:state.contentVersion};
  for(let i=0;i<9;i++)await h.invoke('AssignContent',body,{},'assignment_limit_'+i);
  assert.equal(h.database.state.assignments.size,10);await assert.rejects(h.invoke('AssignContent',body,{},'assignment_over_limit'),code('PRECONDITION_FAILED'));
  await h.invoke('AssignContent',body,{},'assignment_limit_8');assert.equal(h.database.state.assignments.size,10);
  await h.invoke('CloseDemoRun',{...h.scope});
});

test('switch issuance cap includes revoked history and a failed switch preserves the presented session', async () => {
  const h=setup();await h.invoke('BeginDemoRun');const first=[...h.database.state.sessions.values()][0]!;
  for(let i=0;i<99;i++)h.database.state.sessions.set('historical_'+i,{...first,id:'historical_'+i,status:'REVOKED',revokedAt:new Date(h.database.now)});
  const previous=h.credential;
  await assert.rejects(h.invoke('SwitchDemoPersona',{...h.scope,persona:'MANAGER'}),code('PRECONDITION_FAILED'));
  assert.ok(h.credential===previous,'failed switch preserves credential');assert.equal(h.database.state.sessions.size,100);assert.equal((await h.invoke('ReadCurrentSession')).demo.persona,'LEARNER');
  await h.invoke('CloseDemoRun',{...h.scope});assert.equal([...h.database.state.runs.values()][0]!.status,'CLOSED');
  const failing=setup();await failing.invoke('BeginDemoRun');const old=failing.credential;failing.database.failAudit='SwitchDemoPersona';
  await assert.rejects(failing.invoke('SwitchDemoPersona',{...failing.scope,persona:'MANAGER'}));assert.ok(failing.credential===old,'failed switch preserves credential');assert.equal((await failing.invoke('ReadCurrentSession')).demo.persona,'LEARNER');
});

test('valid normal session blocks Begin, while stale malformed session is never upgraded', async () => {
  const h=setup();await h.invoke('BeginDemoRun');const identityId=[...h.database.state.sessions.values()][0]!.identityId;
  h.database.state.personas.delete(identityId);
  await assert.rejects(h.invoke('BeginDemoRun'),code('PRECONDITION_FAILED'));
  assert.equal(h.database.state.runs.size,1);
  await assert.rejects(h.invoke('ReadCurrentSession'),code('UNAUTHENTICATED'));
});

test('expiry enumerates only due runs, retries no terminal history, and ordinary deadline access denies without cleanup', async () => {
  const h=setup();await h.invoke('BeginDemoRun');h.database.now=new Date(h.database.now.getTime()+3600000);
  await assert.rejects(h.invoke('ReadCurrentSession'),code('UNAUTHENTICATED'));
  assert.equal([...h.database.state.runs.values()][0]!.status,'ACTIVE');
  assert.equal(await h.app.expireDueRuns(),1);
  const history=h.database.state.lifecycle.length,audit=h.database.state.audit.length;
  assert.equal(await h.app.expireDueRuns(),0);assert.equal(h.database.state.lifecycle.length,history);assert.equal(h.database.state.audit.length,audit);
  assert.equal([...h.database.state.runs.values()][0]!.status,'EXPIRED');assert.equal(h.database.state.assignments.size,1);
});

test('reads do not refresh session idle time, and the ordinary 30-minute session idle limit remains binding', async () => {
  const h=setup();await h.invoke('BeginDemoRun');const before=[...h.database.state.sessions.values()][0]!.lastUsedAt;
  h.database.now=new Date(h.database.now.getTime()+29*60000);await h.invoke('ReadCurrentSession');assert.equal([...h.database.state.sessions.values()][0]!.lastUsedAt.getTime(),before.getTime());
  h.database.now=new Date(h.database.now.getTime()+60000);await assert.rejects(h.invoke('ReadCurrentSession'),code('UNAUTHENTICATED'));
});

test('deadline is rechecked after blocking target locks and before an old receipt is returned', async () => {
  const h=setup();await h.invoke('BeginDemoRun');const a=[...h.database.state.assignments.values()][0]!;
  h.database.advanceOnContentReadMs=3600000;
  await assert.rejects(h.invoke('ReadAssignedContentVersion',{}, {contentPackId:a.contentPackId,contentVersion:a.contentVersion.version}),code('UNAUTHENTICATED'));
  const replay=setup();await replay.invoke('BeginDemoRun');const assignment=[...replay.database.state.assignments.values()][0]!;
  await replay.invoke('StartLearningSession',{assignmentId:assignment.id},{},'replay_expiry_123456');
  replay.database.advanceOnReceiptLookupMs=3600000;
  await assert.rejects(replay.invoke('StartLearningSession',{assignmentId:assignment.id},{},'replay_expiry_123456'),code('UNAUTHENTICATED'));
  assert.equal(replay.database.state.learningSessions.size,1);
});

test('final transaction fence rolls back late audit waits including issuance and close effects',async()=>{
 for(const operation of ['StartLearningSession','SwitchDemoPersona','CloseDemoRun'] as const){
  const h=setup();await h.invoke('BeginDemoRun');const before={sessions:h.database.state.sessions.size,audit:h.database.state.audit.length,receipts:h.database.state.receipts.size};
  const assignment=[...h.database.state.assignments.values()][0]!;h.database.expireAfterAuditAction=operation;
  await assert.rejects(h.invoke(operation,operation==='StartLearningSession'?{assignmentId:assignment.id}:operation==='SwitchDemoPersona'?{...h.scope,persona:'MANAGER'}:{...h.scope},{},operation==='StartLearningSession'?'late_audit_start_key':null),code('UNAUTHENTICATED'));
  assert.equal(h.database.state.learningSessions.size,0);assert.equal(h.database.state.sessions.size,before.sessions);assert.equal(h.database.state.audit.length,before.audit);assert.equal(h.database.state.receipts.size,before.receipts);assert.equal([...h.database.state.runs.values()][0]!.status,'ACTIVE');assert.equal([...h.database.state.sessions.values()][0]!.status,'ACTIVE');
 }
});

test('valid unsafe authentication renews idle time before a late audit wait without weakening run expiry',async()=>{
 for(const operation of ['StartLearningSession','SwitchDemoPersona','CloseDemoRun','RevokeApplicationSession'] as const){
  const h=setup();await h.invoke('BeginDemoRun');const assignment=[...h.database.state.assignments.values()][0]!;
  h.database.now=new Date(h.database.now.getTime()+1799000);h.database.advanceAfterAudit={action:operation,ms:2000};
  const result=await h.invoke(operation,operation==='StartLearningSession'?{assignmentId:assignment.id}:operation==='SwitchDemoPersona'?{...h.scope,persona:'MANAGER'}:operation==='CloseDemoRun'?{...h.scope}:{},{},operation==='StartLearningSession'?'valid_idle_touch_key':null);
  if(operation==='StartLearningSession')assert.equal(result.status,'ACTIVE');
  if(operation==='SwitchDemoPersona')assert.equal(result.demo.persona,'MANAGER');
  if(operation==='CloseDemoRun')assert.equal([...h.database.state.runs.values()][0]!.status,'CLOSED');
  if(operation==='RevokeApplicationSession')assert.equal([...h.database.state.sessions.values()][0]!.status,'REVOKED');
 }
});
