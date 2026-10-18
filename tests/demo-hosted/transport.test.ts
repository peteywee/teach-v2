import assert from 'node:assert/strict';
import test from 'node:test';
import {createHostedDemoTransport,HOSTED_CSP,HOSTED_DEMO_ROUTE_INVENTORY} from '../../src/bootstrap/demo-hosted/transport.js';
import {DEMO_ROUTES} from '../../src/bootstrap/demo/http.js';
import {createDemoApplication} from '../../src/bootstrap/demo/application.js';
import {MemoryDemoTransaction} from '../demo/memory-transaction.js';
import {assets,origin,request} from './harness.js';

function harness(){const db=new MemoryDemoTransaction();const handler=createHostedDemoTransport({application:createDemoApplication({transactions:db}),allowedOrigin:origin,assets:assets()});return {db,handler};}
test('finite route alias and static GET preserve seven assets without allocating a demo',async()=>{
 assert.equal(HOSTED_DEMO_ROUTE_INVENTORY,DEMO_ROUTES);assert.equal(DEMO_ROUTES.length,15);const {db,handler}=harness();
 for(const [path,asset] of assets()){const r=await handler(request(path));assert.equal(r.status,200);assert.deepEqual(Buffer.from(await r.arrayBuffer()),Buffer.from(asset.bytes));assert.equal(r.headers.get('cache-control'),'no-store');assert.equal(r.headers.get('content-security-policy'),HOSTED_CSP);assert.equal(r.headers.get('set-cookie'),null);assert.equal(r.headers.get('access-control-allow-origin'),null);}
 assert.equal((await handler(request('/api/v1/session'))).status,401);assert.equal(db.state.runs.size,0);assert.equal(db.state.sessions.size,0);
});
test('static assets are copied and exact set/types/hashes are required',async()=>{
 const app={execute:async()=>({body:{}})};const source=assets();const original=Buffer.from(source.get('/')!.bytes);const handler=createHostedDemoTransport({application:app,allowedOrigin:origin,assets:source});source.get('/')!.bytes.fill(0);assert.deepEqual(Buffer.from(await (await handler(request('/'))).arrayBuffer()),original);
 for(const mode of ['missing','extra','type','hash']){const bad=assets();if(mode==='missing')bad.delete('/');if(mode==='extra')bad.set('/extra',bad.get('/')!);if(mode==='type')bad.get('/')!.contentType='text/plain';if(mode==='hash')bad.get('/')!.sha256='0'.repeat(64);assert.throws(()=>createHostedDemoTransport({application:app,allowedOrigin:origin,assets:bad}));}
});
test('foreign host/URL reject before app; unsafe foreign origins retain original denial audit',async()=>{
 let execute=0,denials=0;const handler=createHostedDemoTransport({application:{execute:async()=>{execute++;return {body:{}};},recordOriginDenial:async()=>{denials++;}},allowedOrigin:origin,assets:assets()});
 for(const req of [request('/api/v1/demo/start','POST','{}',{Host:'other.example.test'}),new Request('http://demo.example.test/api/v1/demo/start',{method:'POST',headers:{Host:'demo.example.test',Origin:origin,'Content-Type':'application/json'},body:'{}'}),request('/api/v1/session','GET',undefined,{Host:''})])assert.equal((await handler(req)).status,400);
 for(const headers of [{Origin:'https://other.example.test'},{Origin:'null'},{Origin:origin+'/'},{'Sec-Fetch-Site':'cross-site'}])assert.equal((await handler(request('/api/v1/demo/start','POST','{}',headers))).status,403);
 assert.equal(denials,4);assert.equal(execute,0);assert.equal((await handler(request('/','GET',undefined,{Origin:'https://other.example.test'}))).status,403);
});
test('raw JSON duplicate-key evidence, UTF-8 and 64KiB bounds are never erased',async()=>{
 const {db,handler}=harness();for(const raw of ['{"x":1,"x":2}','{"organizationId":"a","organizationId":"b"}','{', ' '.repeat(65537),new Uint8Array([0xc3,0x28])]){const r=await handler(request('/api/v1/demo/start','POST',raw));assert.equal(r.status,400);assert.equal((await r.json()).error.code,'INVALID_REQUEST');}
 assert.equal((await handler(request('/api/v1/demo/start','POST','{}',{'Content-Type':'text/plain'}))).status,415);assert.equal(db.state.runs.size,0);
});
test('lost credential responses are not automatically replayed; failures never issue a cookie',async()=>{
 const {db,handler}=harness();await handler(request('/api/v1/demo/start','POST','{}'));assert.equal(db.state.runs.size,1);assert.equal(db.state.sessions.size,1);
 // Explicit second visitor intent is another run, not a synthesized retry.
 const second=await handler(request('/api/v1/demo/start','POST','{}'));assert.equal(second.status,201);assert.equal(db.state.runs.size,2);
 db.failCommit=true;const failure=await handler(request('/api/v1/demo/start','POST','{}'));assert.equal(failure.status,503);assert.equal(failure.headers.get('set-cookie'),null);assert.equal(db.state.runs.size,2);
});
test('shared unknown prefix keeps the existing ten-start quota, with no proxy trust',async()=>{
 const {db,handler}=harness();for(let i=0;i<10;i++)assert.equal((await handler(request('/api/v1/demo/start','POST','{}',{'X-Forwarded-For':'192.0.2.'+i}))).status,201);
 assert.equal((await handler(request('/api/v1/demo/start','POST','{}',{'X-Forwarded-For':'203.0.113.1'}))).status,429);assert.equal(db.state.runs.size,10);assert.ok([...db.state.runs.values()].every(r=>r.admissionPrefix==='SHARED_UNKNOWN'));
});
test('receipt retry is stable after a lost response and run expiry remains authoritative without cleanup',async()=>{
 const {db,handler}=harness();const begun=await handler(request('/api/v1/demo/start','POST','{}'));const cookie=begun.headers.get('set-cookie')!.split(';')[0]!;const current=await begun.json();const s=current.demo.scope,base=`/api/v1/organizations/${s.organizationId}/locations/${s.locationId}`;
 const assignment=(await (await handler(request(base+'/assignments/mine','GET',undefined,{Cookie:cookie}))).json()).items[0].assignment;
 const body=JSON.stringify({assignmentId:assignment.id}),headers={Cookie:cookie,'Idempotency-Key':'hosted_start_key_1234'};
 const first=await handler(request(base+'/learning-sessions','POST',body,headers));const a=await first.json();const second=await handler(request(base+'/learning-sessions','POST',body,headers));assert.deepEqual(await second.json(),a);assert.equal(db.state.learningSessions.size,1);
 db.now=new Date([...db.state.runs.values()][0]!.expiresAt);assert.equal((await handler(request('/api/v1/session','GET',undefined,{Cookie:cookie}))).status,401);assert.equal(db.state.runs.size,1);assert.equal([...db.state.runs.values()][0]!.status,'ACTIVE');
});
test('a lost persona-switch response is never retried or silently replaced with another credential',async()=>{
 const {db,handler}=harness();const begun=await handler(request('/api/v1/demo/start','POST','{}'));const cookie=begun.headers.get('set-cookie')!.split(';')[0]!;const scope=(await begun.json()).demo.scope;
 const switched=await handler(request('/api/v1/demo/persona','POST',JSON.stringify({...scope,persona:'MANAGER'}),{Cookie:cookie}));assert.equal(switched.status,200);assert.equal(db.state.sessions.size,2);
 // Treat the new cookie response as lost. The old credential cannot recover by automatic rotation.
 assert.equal((await handler(request('/api/v1/session','GET',undefined,{Cookie:cookie}))).status,401);assert.equal(db.state.sessions.size,2);
});
