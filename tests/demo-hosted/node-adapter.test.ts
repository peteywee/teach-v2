import assert from 'node:assert/strict';
import test from 'node:test';
import {Readable} from 'node:stream';
import {createServer,request as httpRequest,type IncomingMessage,type ServerResponse} from 'node:http';
import {toHostedRequest,writeHostedResponse,createHostedNodeAdapter} from '../../src/bootstrap/demo-hosted/node-adapter.js';
import {createHostedDemoTransport,HOSTED_CSP} from '../../src/bootstrap/demo-hosted/transport.js';
import {createDisabledHostedDemo} from '../../src/bootstrap/demo-hosted/composition.js';
import {DEMO_ROUTES} from '../../src/bootstrap/demo/http.js';
import {createDemoApplication} from '../../src/bootstrap/demo/application.js';
import {MemoryDemoTransaction} from '../demo/memory-transaction.js';
import {assets,origin} from './harness.js';
function incoming(body:Uint8Array=Buffer.from('{}'),target='/api/v1/demo/start',extra:string[]=[],method='POST'):IncomingMessage {
 const stream=Readable.from([body.subarray(0,1),body.subarray(1)]);
 return Object.assign(stream,{url:target,method,rawHeaders:['Host',new URL(origin).host,'Origin',origin,'Content-Type','application/json',...extra]}) as IncomingMessage;
}
function outgoing(){
 const result={status:0,headers:{} as Record<string,string|string[]>,body:Buffer.alloc(0)};
 const stream={writeHead(status:number,headers:Record<string,string|string[]>){result.status=status;result.headers=headers;},end(bytes:Buffer){result.body=Buffer.from(bytes);}} as unknown as ServerResponse;
 return {result,stream};
}
test('adapter preserves raw bytes, URL query and original Origin/Host, ignoring forwarded alternatives',async()=>{
 const raw=Buffer.from([0xc3,0x28,0x00,0xff]);
 const request=toHostedRequest(incoming(raw,'/api/v1/demo/start?x=%2f',['X-Forwarded-Host','evil.test','X-Forwarded-Proto','http']),origin);
 assert.equal(request.url,origin+'/api/v1/demo/start?x=%2f');assert.equal(request.headers.get('host'),new URL(origin).host);assert.equal(request.headers.get('origin'),origin);
 assert.deepEqual(Buffer.from(await request.arrayBuffer()),raw);
});
test('ambiguous headers, foreign Host and normalized/absolute request targets fail before dispatch',async()=>{
 for(const extra of [['host','evil.test'],['ORIGIN',origin],['Cookie','a=1','cookie','b=2'],['Content-Length','2','Transfer-Encoding','chunked']])assert.throws(()=>toHostedRequest(incoming(undefined,undefined,extra),origin));
 const wrong=incoming();wrong.rawHeaders[1]='evil.test';assert.throws(()=>toHostedRequest(wrong,origin));
 for(const path of ['https://evil.test/','//evil.test/','/a/../api/v1/session','/a\\b','/api/v1/session#fragment'])assert.throws(()=>toHostedRequest(incoming(undefined,path),origin));
 let calls=0;const response=outgoing();await createHostedNodeAdapter({allowedOrigin:origin,handle:async()=>{calls++;return new Response();}})(wrong,response.stream);assert.equal(calls,0);assert.equal(response.result.status,400);
});
test('seven assets and credential issuance remain behind the same transport',async()=>{
 const db=new MemoryDemoTransaction();const handle=createHostedDemoTransport({application:createDemoApplication({transactions:db}),allowedOrigin:origin,assets:assets()});
 const adapter=createHostedNodeAdapter({allowedOrigin:origin,handle});
 for(const [path,asset] of assets()){const out=outgoing();await adapter(incoming(undefined,path,[],'GET'),out.stream);assert.equal(out.result.status,200);assert.deepEqual(out.result.body,Buffer.from(asset.bytes));assert.equal(out.result.headers['content-security-policy'],HOSTED_CSP);assert.equal(out.result.headers['cache-control'],'no-store');}
 const out=outgoing();await adapter(incoming(),out.stream);assert.equal(out.result.status,201);const cookie=out.result.headers['set-cookie'];assert.ok(Array.isArray(cookie));assert.match(cookie[0]!,/^__Host-teach_session=/);for(const flag of ['Secure','HttpOnly','SameSite=Lax','Path=/'])assert.ok(cookie[0]!.includes(flag));
});
test('duplicate-key, invalid UTF-8 and oversized bodies reach existing rejection without reserialization',async()=>{
 const db=new MemoryDemoTransaction();const handle=createHostedDemoTransport({application:createDemoApplication({transactions:db}),allowedOrigin:origin,assets:assets()});const adapter=createHostedNodeAdapter({allowedOrigin:origin,handle});
 for(const raw of [Buffer.from('{"a":1,"a":2}'),Buffer.from([0xc3,0x28]),Buffer.alloc(65537,32)]){const out=outgoing();await adapter(incoming(raw),out.stream);assert.equal(out.result.status,400);}
 assert.equal(db.state.runs.size,0);
});
test('status, security headers and multiple Set-Cookie values are preserved',async()=>{
 const response=new Response(null,{status:204,headers:{'Cache-Control':'no-store','Content-Security-Policy':HOSTED_CSP}});response.headers.append('Set-Cookie','a=1; Secure; HttpOnly');response.headers.append('Set-Cookie','b=2; Secure; HttpOnly');const out=outgoing();await writeHostedResponse(response,out.stream);assert.equal(out.result.status,204);assert.deepEqual(out.result.headers['set-cookie'],['a=1; Secure; HttpOnly','b=2; Secure; HttpOnly']);assert.equal(out.result.body.length,0);
});
test('default disabled composition remains unavailable through adapter; failures do not leak errors',async()=>{
 for(const handle of [createDisabledHostedDemo().handle,async()=>{throw new Error('secret must not leak');}]){const out=outgoing();await createHostedNodeAdapter({allowedOrigin:origin,handle})(incoming(),out.stream);assert.equal(out.result.status,503);assert.equal(out.result.headers['cache-control'],'no-store');assert.ok(!out.result.body.toString().includes('secret'));assert.equal(out.result.headers['set-cookie'],undefined);}
});

test('adapter preserves all fifteen registered route methods and targets',()=>{
 assert.equal(DEMO_ROUTES.length,15);for(const route of DEMO_ROUTES){const path=route.path.replace(/\{[^}]+\}/g,'synthetic');const request=toHostedRequest(incoming(undefined,path,[],route.method),origin);assert.equal(request.method,route.method);assert.equal(new URL(request.url).pathname,path);}
});

test('real HTTP socket rejects GET/HEAD bodies and returns a complete rejection for paced oversized input',async()=>{
 const db=new MemoryDemoTransaction();const handle=createHostedDemoTransport({application:createDemoApplication({transactions:db}),allowedOrigin:origin,assets:assets()});
 const adapter=createHostedNodeAdapter({allowedOrigin:origin,handle});
 const server=createServer((req,res)=>{void adapter(req,res).catch(()=>res.destroy());});
 await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));
 const address=server.address();assert.ok(address&&typeof address!=='string');
 try{
  for(const method of ['GET','HEAD','POST']){
   const status=await new Promise<number>((resolve,reject)=>{
    let timer:ReturnType<typeof setInterval>|undefined;
    const req=httpRequest({hostname:'127.0.0.1',port:address.port,path:method==='POST'?'/api/v1/demo/start':'/api/v1/session',method,headers:{Host:new URL(origin).host,Origin:origin,'Content-Type':'application/json',...(method==='POST'?{'Transfer-Encoding':'chunked'}:{'Content-Length':'2'})}},res=>{
     const chunks:Buffer[]=[];res.on('data',chunk=>chunks.push(chunk));res.on('end',()=>{if(timer)clearInterval(timer);req.destroy();if(method!=='HEAD')assert.equal(JSON.parse(Buffer.concat(chunks).toString()).error.code,'INVALID_REQUEST');resolve(res.statusCode!);});res.on('error',reject);
    });
    req.setTimeout(3000,()=>req.destroy(new Error('socket test timed out')));
    req.on('error',error=>{if(timer)clearInterval(timer);reject(error);});
    if(method==='POST'){let chunks=0;timer=setInterval(()=>{req.write(Buffer.alloc(16384,32));if(++chunks===10){clearInterval(timer);req.end();}},5);}else req.end('{}');
   });assert.equal(status,400);
  }
  assert.equal(db.state.runs.size,0);
 }finally{server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()));}
});
