import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {MemoryDemoTransaction} from '../../tests/demo/memory-transaction.ts';
const root=resolve(process.argv[2]);
const load=path=>import(pathToFileURL(join(root,path)).href);
const {createDemoApplication}=await load('src/bootstrap/demo/application.js');
const {createHostedDemoTransport}=await load('src/bootstrap/demo-hosted/transport.js');
await load('src/bootstrap/demo-successor/transaction.js'); // Resolves retained pg + Drizzle with no source node_modules fallback.
const {createSuccessorDemo}=await load('src/bootstrap/demo-successor/composition.js');
assert.equal((await createSuccessorDemo().handle(new Request('https://demo.example.test'))).status,503);
const assets=new Map(JSON.parse(readFileSync(join(root,'src/web/demo/assets.json'))).map(row=>{const bytes=readFileSync(join(root,'src/web/demo',row.file));return [row.path,{bytes,contentType:row.contentType,sha256:createHash('sha256').update(bytes).digest('hex')}];}));
const origin='https://demo.example.test',db=new MemoryDemoTransaction();
const handler=createHostedDemoTransport({application:createDemoApplication({transactions:db}),allowedOrigin:origin,assets});
for(const [path,asset]of assets){const r=await handler(new Request(origin+path,{headers:{Host:'demo.example.test'}}));assert.equal(r.status,200);assert.deepEqual(Buffer.from(await r.arrayBuffer()),asset.bytes);}
let cookie='',sequence=0;const operations=new Set();
async function call(operation,path,method='GET',body,key){const response=await handler(new Request(origin+path,{method,headers:{Host:'demo.example.test',...(cookie?{Cookie:cookie}:{}),...(method==='GET'?{}:{Origin:origin,'Content-Type':'application/json'}),...(key?{'Idempotency-Key':key}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})}));assert.ok(response.ok,operation+': '+response.status);operations.add(operation);const issued=response.headers.get('set-cookie');if(issued)cookie=issued.split(';')[0];return response.status===204?null:response.json();}
const current=await call('BeginDemoRun','/api/v1/demo/start','POST',{}),scope=current.demo.scope,base=`/api/v1/organizations/${scope.organizationId}/locations/${scope.locationId}`;
await call('ReadCurrentSession','/api/v1/session');await call('ListOwnMemberships','/api/v1/memberships');
const a=(await call('ListOwnAssignments',base+'/assignments/mine')).items[0].assignment;
const content=await call('ReadAssignedContentVersion',base+`/content/${a.contentPackId}/versions/${encodeURIComponent(a.contentVersion.version)}`);
await call('ReadOwnLearnerState',base+'/learner-state/mine');
const session=await call('StartLearningSession',base+'/learning-sessions','POST',{assignmentId:a.id},'packaged_start_1234');
for(const block of content.blocks)await call('RecordProgressEvent',base+`/learning-sessions/${session.id}/progress-events`,'POST',{blockId:block.id,selectedOptionIndex:0},'packaged_progress_'+sequence++);
await call('CompleteLearningSession',base+`/learning-sessions/${session.id}/complete`,'POST',{});
await call('SwitchDemoPersona','/api/v1/demo/persona','POST',{...scope,persona:'MANAGER'});
const team=await call('ListTeam',base+'/team');await call('ReadTeamMemberLearnerState',base+`/team/${team.items[0].identityId}/learner-state`);
await call('AssignContent',base+'/assignments','POST',{identityId:a.identityId,contentPackId:a.contentPackId,contentVersion:a.contentVersion},'packaged_assign_1234');
await call('CloseDemoRun','/api/v1/demo/close','POST',scope);
await call('BeginDemoRun','/api/v1/demo/start','POST',{});await call('RevokeApplicationSession','/api/v1/session','DELETE');
assert.equal(operations.size,15);assert.equal(assets.size,7);
console.log('PASS: packaged application/transport 15 operations, 7 exact assets, retained pg/Drizzle import, disabled default; synthetic memory fixture only, not provider/PG proof');
