import assert from 'node:assert/strict';
import test from 'node:test';
import {createPreparedNetlifyHandler,validateNetlifyFetchRequest} from '../../src/bootstrap/demo-netlify/fetch-adapter.js';
import {createHostedDemoTransport} from '../../src/bootstrap/demo-hosted/transport.js';
import {assets,origin,request} from '../demo-hosted/harness.js';

function fixture(){
 let starts=0,calls=0;
 const handle=createHostedDemoTransport({allowedOrigin:origin,assets:assets(),application:{async execute(input){input.readInput();calls++;return {body:{ok:true},...(input.operation==='BeginDemoRun'?{issuedCredential:Buffer.alloc(32,1).toString('base64url')}:{})};}}});
 const handler=createPreparedNetlifyHandler({buildNodeVersion:process.versions.node,initialize:async()=>{starts++;return {origin,handle};}});
 return {handler,counts:()=>({starts,calls})};
}
test('singleton actual hosted transport preserves assets, POST body, cookie attributes and unknown-route deny',async()=>{
 const f=fixture();const responses=await Promise.all([f.handler(request('/')),f.handler(request('/assets/app.mjs')),f.handler(request('/api/v1/demo/start','POST','{}'))]);
 assert.deepEqual(responses.map(r=>r.status),[200,200,201]);
 assert.equal(responses[2]!.headers.getSetCookie().length,1);assert.match(responses[2]!.headers.get('set-cookie')!,/^__Host-teach_session=.*; Path=\/; Secure; HttpOnly; SameSite=Lax;/);
 assert.equal((await f.handler(request('/not-a-route'))).status,404);
 assert.deepEqual(f.counts(),{starts:1,calls:1});
 for(const r of responses)assert.equal(r.headers.get('cache-control'),'no-store');
});
test('observable Host/origin/framing, duplicate joined values, GET body framing, oversized and consumed bodies deny',async()=>{
 const f=fixture();const bad=[request('/', 'GET',undefined,{Host:'other.example.test'}),request('/', 'GET',undefined,{Host:'demo.example.test, demo.example.test'}),request('/','GET',undefined,{'Transfer-Encoding':'chunked'}),request('/','GET',undefined,{'Content-Length':'1'}),request('/','GET',undefined,{'Cookie':'a=b, c=d'}),request('/','GET',undefined,{'Origin':origin+', '+origin}),request('/api/v1/demo/start','POST','{}',{'Content-Length':'65537'}),new Request('https://other.example.test/',{headers:{Host:'other.example.test'}})];
 for(const req of bad)assert.equal((await f.handler(req)).status,400);
 const consumed=request('/api/v1/demo/start','POST','{}');await consumed.text();assert.equal((await f.handler(consumed)).status,400);
 assert.equal((await f.handler(request('/api/v1/demo/start','POST','{}',{Origin:'https://other.example.test'}))).status,403);
 assert.equal((await f.handler(request('/api/v1/demo/start','POST','{"extra":true}'))).status,400);
 assert.equal((await f.handler(request('/api/v1/demo/start','POST','x'.repeat(65537)))).status,400);
 assert.equal((await f.handler(request('/api/v1/demo/start','POST','{}',{'Content-Type':'text/plain'}))).status,415);
 assert.equal((await f.handler(request('/api/v1/session','GET',undefined,{'Cookie':'__Host-teach_session=bad; __Host-teach_session=bad'}))).status,401);
 assert.equal(f.counts().calls,0);
});
test('patch mismatch and failed initialization never retry; handler failures do not leak',async()=>{
 let count=0;const mismatch=createPreparedNetlifyHandler({buildNodeVersion:'24.0.0',initialize:async()=>{count++;throw Error('secret');}});
 assert.equal((await mismatch(request('/'))).status,503);assert.equal(count,0);
 const failed=createPreparedNetlifyHandler({buildNodeVersion:process.versions.node,initialize:async()=>{count++;throw Error('secret');}});
 for(let i=0;i<3;i++){const r=await failed(request('/'));assert.equal(r.status,503);assert.doesNotMatch(await r.text(),/secret/);}assert.equal(count,1);
 const throwing=createPreparedNetlifyHandler({buildNodeVersion:process.versions.node,initialize:async()=>({origin,handle:async()=>{throw Error('secret');}})});
 assert.equal((await throwing(request('/'))).status,503);
});
test('response identity preserves separate Set-Cookie values and original request stream',async()=>{
 const req=request('/api/v1/demo/start','POST','{}');const headers=new Headers();headers.append('set-cookie','a=1; Path=/');headers.append('set-cookie','b=2; Path=/');const response=new Response('ok',{headers});
 const handle=createPreparedNetlifyHandler({buildNodeVersion:process.versions.node,initialize:async()=>({origin,handle:async received=>{assert.equal(received,req);assert.equal(await received.text(),'{}');return response;}})});
 assert.equal(await handle(req),response);assert.deepEqual(response.headers.getSetCookie(),['a=1; Path=/','b=2; Path=/']);
});
test('explicit limitation: normalized raw target cannot be recovered from Fetch',()=>{
 const req=request('/discard/../');assert.equal(new URL(req.url).pathname,'/');
 assert.doesNotThrow(()=>validateNetlifyFetchRequest(req,origin)); // NOT proof of raw-ingress equivalence.
});
test('stream errors deny; Fetch content-length mismatch remains an explicit unresolved ingress limit',async()=>{
 const f=fixture();const body=new ReadableStream<Uint8Array>({start(controller){controller.error(Error('private stream failure'));}});
 const req=new Request(origin+'/api/v1/demo/start',{method:'POST',headers:{Host:new URL(origin).host,Origin:origin,'Content-Type':'application/json'},body,duplex:'half'} as RequestInit);
 const response=await f.handler(req);assert.equal(response.status,400);assert.doesNotMatch(await response.text(),/private stream failure/);
 // Fetch permits this inconsistent metadata and the shared transport bounds bytes
 // but does not compare declared/observed length. Provider entrypoint stays denied.
 assert.equal((await f.handler(request('/api/v1/demo/start','POST','{}',{'Content-Length':'1'}))).status,201);
});
