import assert from 'node:assert/strict';
import test from 'node:test';
import {execFileSync} from 'node:child_process';
import {mkdtempSync,mkdirSync,readFileSync,writeFileSync,rmSync,symlinkSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {captureRuntimeConfiguration} from '../../src/bootstrap/demo-successor/runtime-config.js';
const good={TEACH_DB_SCHEMA:'teach_v2_demo',TEACH_SUPABASE_PROJECT:'acqafjkdkdmtpnsxiesw',TEACH_DEMO_ORIGIN:'https://demo.example.test',TEACH_DB_HOST:'aws-0-us-east-2.pooler.supabase.com',TEACH_DB_USER:'teach_v2_demo_runtime.acqafjkdkdmtpnsxiesw',TEACH_DB_PASSWORD:'synthetic-only',TEACH_DB_CA:'-----BEGIN CERTIFICATE-----\nsynthetic\n-----END CERTIFICATE-----'};
test('configuration is exact server-only target, verified TLS and two retained connections',()=>{const cfg=captureRuntimeConfiguration(good);assert.equal(cfg.options.max,2);assert.equal((cfg.options.ssl as any).rejectUnauthorized,true);assert.equal(cfg.options.port,6543);assert.ok(Object.isFrozen(cfg));for(const key of Object.keys(good))assert.throws(()=>captureRuntimeConfiguration({...good,[key]:undefined}));for(const bad of [{TEACH_DB_SCHEMA:'public'},{TEACH_SUPABASE_PROJECT:'xgtxszipmenyujwhcfut'},{TEACH_DB_USER:'postgres.acqafjkdkdmtpnsxiesw'},{TEACH_DEMO_ORIGIN:'http://demo.example.test'},{TEACH_DB_HOST:'evil.test'}])assert.throws(()=>captureRuntimeConfiguration({...good,...bad}));});
test('default entrypoint ignores request activation and invalid configuration',async()=>{const {default:handler}=await import('../../src/bootstrap/demo-successor/accepting-entrypoint.js');let status=0,body='';await handler({url:'/?activate=true',headers:{'x-activate':'true'}} as any,{writeHead(code:number){status=code;},end(bytes:Buffer){body=bytes.toString();}} as any);assert.equal(status,503);assert.match(body,/SERVICE_UNAVAILABLE/);});

const {restoreVercelConfigFormatting,addVercelStartupDiagnostics,addVercelPublicNavigation,addVercelProductionRootRedirect,addVercelDatabaseDiagnostics,compareDatabaseLogins}=await import(new URL('../../scripts/packaging/build-vercel-release.mjs',import.meta.url).href);
function configFixture(run:(root:string,original:string)=>void){
 const root=mkdtempSync(join(tmpdir(),'teach-vercel-config-test-'));
 const original=JSON.stringify({framework:null,buildCommand:'node reviewed-build.mjs'},null,2)+'\n';
 const git=(args:string[])=>execFileSync('git',args,{cwd:root,timeout:3000,stdio:'pipe'});
 try {git(['init','-q']);writeFileSync(join(root,'vercel.json'),original);git(['add','vercel.json']);git(['-c','user.name=Teach fixture','-c','user.email=fixture@example.invalid','commit','-qm','Configuration fixture']);run(root,original);}
 finally {rmSync(root,{recursive:true,force:true});}
}
test('Vercel formatting normalization restores exact committed bytes and is idempotent',()=>configFixture((root,original)=>{
 writeFileSync(join(root,'vercel.json'),JSON.stringify({buildCommand:'node reviewed-build.mjs',framework:null}));
 assert.equal(restoreVercelConfigFormatting(root),true);assert.equal(readFileSync(join(root,'vercel.json'),'utf8'),original);
 assert.equal(restoreVercelConfigFormatting(root),false);
 assert.equal(execFileSync('git',['status','--porcelain'],{cwd:root,encoding:'utf8',timeout:3000}),'');
}));
test('Vercel normalization refuses changed values without restoring or logging values',()=>configFixture((root)=>{
 const changed=JSON.stringify({framework:null,buildCommand:'PRIVATE_SENTINEL_DO_NOT_LOG'});writeFileSync(join(root,'vercel.json'),changed);
 assert.throws(()=>restoreVercelConfigFormatting(root),(error:unknown)=>error instanceof Error&&error.message.includes('buildCommand')&&!error.message.includes('PRIVATE_SENTINEL'));
 assert.equal(readFileSync(join(root,'vercel.json'),'utf8'),changed);
}));
test('Vercel normalization rejects invalid JSON and a symbolic-link configuration',()=>configFixture((root)=>{
 const path=join(root,'vercel.json');writeFileSync(path,'PRIVATE_SENTINEL_INVALID_JSON');
 assert.throws(()=>restoreVercelConfigFormatting(root),/^Error: Invalid Vercel configuration JSON$/);
 rmSync(path);writeFileSync(join(root,'outside.txt'),'private fixture');symlinkSync('outside.txt',path);
 assert.throws(()=>restoreVercelConfigFormatting(root),/Regular Vercel configuration required/);
}));

test('Vercel launcher preserves handler identity and logs only safe startup evidence',()=>{
 const root=mkdtempSync(join(tmpdir(),'teach-vercel-launcher-test-'));
 try{
  const source=join(root,'src/bootstrap/demo-successor');mkdirSync(source,{recursive:true});
  writeFileSync(join(root,'package.json'),JSON.stringify({type:'module'}));
  writeFileSync(join(root,'.vc-config.json'),JSON.stringify({runtime:'nodejs24.x',handler:'src/bootstrap/demo-successor/accepting-entrypoint.js',launcherType:'Nodejs',shouldAddHelpers:false}));
  writeFileSync(join(source,'accepting-entrypoint.js'),'export default ()=>503;');
  writeFileSync(join(source,'entrypoint.js'),"export const runtimeReadback=()=>({policy:'24.x',buildNodeVersion:'24.22.1',observedNodeVersion:'24.19.0',verified:false,requiresReverification:true});");
  writeFileSync(join(source,'runtime-config.js'),"export function captureRuntimeConfiguration(env){if(env.TEACH_DB_SCHEMA==='invalid'||!env.TEACH_DB_PASSWORD)throw Error('PRIVATE_SENTINEL_DO_NOT_LOG');return env;}");
  addVercelStartupDiagnostics(root);
  const config=JSON.parse(readFileSync(join(root,'.vc-config.json'),'utf8'));assert.equal(config.handler,'vercel-launcher.mjs');assert.equal(config.shouldAddHelpers,false);
  const launcher=pathToFileURL(join(root,config.handler)).href,original=pathToFileURL(join(source,'accepting-entrypoint.js')).href;
  const script=`const logs=[];console.info=value=>logs.push(JSON.parse(value));const launcher=await import(${JSON.stringify(launcher)}),original=await import(${JSON.stringify(original)});console.log(JSON.stringify({logs,sameHandler:launcher.default===original.default,status:launcher.default()}));`;
  for(const mode of ['valid','invalid','missing']){
   const env={...process.env};for(const key of Object.keys(env))if(key.startsWith('TEACH_'))delete env[key];Object.assign(env,good,{TEACH_DB_PASSWORD:'PRIVATE_SENTINEL_PASSWORD',TEACH_DB_CA:'PRIVATE_SENTINEL_CA'});
   if(mode==='invalid')env.TEACH_DB_SCHEMA='invalid';if(mode==='missing')delete env.TEACH_DB_PASSWORD;
   const output=execFileSync(process.execPath,['--input-type=module','-e',script],{env,encoding:'utf8',timeout:3000});
   assert.ok(!output.includes('PRIVATE_SENTINEL'));const result=JSON.parse(output);
   assert.equal(result.sameHandler,true);assert.equal(result.status,503);assert.equal(result.logs.length,1);
   assert.equal(result.logs[0].kind,'TEACH_VERCEL_STARTUP');assert.equal(result.logs[0].runtime.verified,false);
   assert.equal(result.logs[0].configurationValid,mode==='valid');assert.deepEqual(result.logs[0].missingConfiguration,mode==='missing'?['TEACH_DB_PASSWORD']:[]);
  }
  assert.throws(()=>addVercelStartupDiagnostics(root),/Expected accepting handler required/);
 }finally{rmSync(root,{recursive:true,force:true});}
});

test('public Vercel navigation serves only intact welcome bytes after the reviewed handler permits initialization',async()=>{
 const root=mkdtempSync(join(tmpdir(),'teach-vercel-public-navigation-test-'));
 try{
  const source=join(root,'src/bootstrap');mkdirSync(join(source,'demo-successor'),{recursive:true});mkdirSync(join(source,'demo-hosted'),{recursive:true});mkdirSync(join(root,'src/web/demo'),{recursive:true});
  writeFileSync(join(root,'package.json'),JSON.stringify({type:'module'}));
  writeFileSync(join(root,'.vc-config.json'),JSON.stringify({runtime:'nodejs24.x',handler:'vercel-launcher.mjs'}));
  const welcome=Buffer.from('<!doctype html><title>Reviewed public welcome</title>');writeFileSync(join(root,'src/web/demo/index.html'),welcome);
  writeFileSync(join(source,'demo-successor/runtime-config.js'),"export function captureRuntimeConfiguration(){return {origin:'https://demo.example.test'};}");
  writeFileSync(join(source,'demo-hosted/node-adapter.js'),"export function toHostedRequest(r,origin){const headers=new Headers();for(let i=0;i<r.rawHeaders.length;i+=2)headers.append(r.rawHeaders[i],r.rawHeaders[i+1]);if(headers.get('host')!=='demo.example.test')throw Error('Invalid Host');return new Request(origin+r.url,{method:r.method,headers});}");
  writeFileSync(join(root,'vercel-launcher.mjs'),"export default async function handler(r,out){if(r.method!=='GET'){out.writeHead(201,{'set-cookie':['original-cookie'],'cache-control':'no-store'});out.end(r.body);return;}const status=r.status??403;out.writeHead(status,{'cache-control':'no-store','content-security-policy':\"default-src 'self'\",'content-type':'application/json'});out.end(Buffer.from(JSON.stringify({error:{code:status===403?'FORBIDDEN':'SERVICE_UNAVAILABLE'}})));}");
  addVercelPublicNavigation(root);
  const {default:handler}=await import(pathToFileURL(join(root,'vercel-public-navigation.mjs')).href);
  const navigation={url:'/',method:'GET',rawHeaders:['Host','demo.example.test','Sec-Fetch-Site','cross-site','Sec-Fetch-Mode','navigate','Sec-Fetch-Dest','document']};
  async function invoke(request:any){let status:number|undefined,headers:any,body:any;const before=structuredClone(request);await handler(request,{writeHead(s:number,h:any){status=s;headers=h;},end(value:any){body=value;}});assert.deepEqual(request,before);return {status,headers,body};}
  for(const site of ['cross-site','same-site']){const r=await invoke({...navigation,rawHeaders:navigation.rawHeaders.map(x=>x==='cross-site'?site:x)});assert.equal(r.status,200);assert.deepEqual(r.body,welcome);assert.equal(r.headers['cache-control'],'no-store');assert.equal(r.headers['content-security-policy'],"default-src 'self'");assert.equal(r.headers['set-cookie'],undefined);}
  for(const request of [{...navigation,status:503},{...navigation,url:'/api/v1/session'},{...navigation,url:'/?tracking=value'},{...navigation,rawHeaders:[...navigation.rawHeaders,'Origin','https://foreign.example.test']},{...navigation,rawHeaders:navigation.rawHeaders.map(x=>x==='navigate'?'cors':x)},{...navigation,rawHeaders:navigation.rawHeaders.map(x=>x==='document'?'iframe':x)}])assert.notEqual((await invoke(request)).status,200);
  const post=await invoke({...navigation,method:'POST',url:'/api/v1/demo/start',body:'unchanged-body'});assert.equal(post.status,201);assert.equal(post.body,'unchanged-body');assert.deepEqual(post.headers['set-cookie'],['original-cookie']);
  writeFileSync(join(root,'src/web/demo/index.html'),'modified');assert.equal((await invoke(navigation)).status,403);
  assert.throws(()=>addVercelPublicNavigation(root),/Expected diagnostic handler required/);
 }finally{rmSync(root,{recursive:true,force:true});}
});

test('Production root redirect binds one build hostname and leaves preview and invalid metadata unchanged',()=>{
 const root=mkdtempSync(join(tmpdir(),'teach-vercel-production-root-metadata-'));
 const config={runtime:'nodejs24.x',handler:'vercel-public-navigation.mjs',shouldAddHelpers:false};
 const valid={VERCEL:'1',VERCEL_ENV:'production',VERCEL_URL:'teach-v2-fixture123-peteyweetss.vercel.app'};
 try{
  writeFileSync(join(root,'.vc-config.json'),JSON.stringify(config));
  for(const env of [{},{...valid,VERCEL:'0'},{...valid,VERCEL_ENV:'preview'},{...valid,VERCEL_ENV:'development'}])assert.equal(addVercelProductionRootRedirect(root,env),false);
  for(const host of [undefined,'teach-v2.vercel.app','teach-v2-git-main-peteyweetss.vercel.app','teach-v2-fixture123-foreign.vercel.app','https://'+valid.VERCEL_URL,valid.VERCEL_URL+':443',valid.VERCEL_URL+'\n','*.vercel.app','evil.test']){
   assert.throws(()=>addVercelProductionRootRedirect(root,{...valid,VERCEL_URL:host}),/Exact Production deployment hostname required/);
   assert.deepEqual(JSON.parse(readFileSync(join(root,'.vc-config.json'),'utf8')),config);
  }
  assert.equal(addVercelProductionRootRedirect(root,valid),true);
  assert.equal(JSON.parse(readFileSync(join(root,'.vc-config.json'),'utf8')).handler,'vercel-production-root.mjs');
  assert.equal(JSON.parse(readFileSync(join(root,'.vc-config.json'),'utf8')).shouldAddHelpers,false);
  assert.throws(()=>addVercelProductionRootRedirect(root,valid),/Expected public navigation handler required/);
 }finally{rmSync(root,{recursive:true,force:true});}
});

test('Production home redirects only exact generated-host document navigation, preserving the original adapter and denials',async()=>{
 const root=mkdtempSync(join(tmpdir(),'teach-vercel-production-root-test-'));
 const canonical='https://teach-v2.vercel.app',host='teach-v2-fixture123-peteyweetss.vercel.app';
 const adapter=new URL('../../src/bootstrap/demo-hosted/node-adapter.ts',import.meta.url).href;
 try{
  const source=join(root,'src/bootstrap');mkdirSync(join(source,'demo-successor'),{recursive:true});mkdirSync(join(source,'demo-hosted'),{recursive:true});
  writeFileSync(join(root,'package.json'),JSON.stringify({type:'module'}));
  writeFileSync(join(root,'.vc-config.json'),JSON.stringify({runtime:'nodejs24.x',handler:'vercel-public-navigation.mjs'}));
  writeFileSync(join(source,'demo-hosted/node-adapter.js'),`export {toHostedRequest} from ${JSON.stringify(adapter)};`);
  const statePath=join(source,'demo-successor/runtime-config.js');
  writeFileSync(statePath,`export const state={origin:${JSON.stringify(canonical)},configValid:true,initialized:true,override:null,calls:0};export function captureRuntimeConfiguration(){if(!state.configValid)throw Error('Invalid configuration');return {origin:state.origin};}`);
  writeFileSync(join(root,'vercel-public-navigation.mjs'),`import {state} from './src/bootstrap/demo-successor/runtime-config.js';import {toHostedRequest} from './src/bootstrap/demo-hosted/node-adapter.js';
export default async function handler(r,out){state.calls++;let status=200,code='ORIGINAL';if(!state.initialized) {status=503;code='SERVICE_UNAVAILABLE';}else {try{toHostedRequest(r,state.origin);}catch{status=400;code='INVALID_REQUEST';}}
const response=state.override??{status,headers:{'cache-control':'no-store','content-type':'application/json'},body:JSON.stringify({error:{code}})};out.writeHead(response.status,response.headers);out.end(response.body);}`);
  const env={VERCEL:'1',VERCEL_ENV:'production',VERCEL_URL:host};addVercelProductionRootRedirect(root,env);env.VERCEL_URL='teach-v2-otherbuild-peteyweetss.vercel.app';
  const {default:handler}=await import(pathToFileURL(join(root,'vercel-production-root.mjs')).href);
  const {state}=await import(pathToFileURL(statePath).href);
  const navigation={url:'/',method:'GET',rawHeaders:['Host',host,'Sec-Fetch-Site','none','Sec-Fetch-Mode','navigate','Sec-Fetch-Dest','document']};
  async function invoke(request:any){let status:number|undefined,headers:any,body:any;const before=structuredClone(request),calls=state.calls;await handler(request,{writeHead(s:number,h:any){status=s;headers=h;},end(value:any){body=value;}});assert.deepEqual(request,before);assert.equal(state.calls,calls+1);return {status,headers,body};}
  for(const site of ['none','same-origin','same-site','cross-site']){
   const r=await invoke({...navigation,rawHeaders:navigation.rawHeaders.map(x=>x==='none'?site:x)});
   assert.equal(r.status,307);assert.equal(r.headers.location,canonical+'/');assert.equal(r.headers['cache-control'],'no-store');assert.equal(r.headers['referrer-policy'],'no-referrer');assert.equal(r.headers['set-cookie'],undefined);assert.equal(r.body,undefined);
  }
  // A Vercel protection cookie may accompany a legitimate document navigation;
  // it is never forwarded to the canonical domain or reissued by this response.
  assert.equal((await invoke({...navigation,rawHeaders:[...navigation.rawHeaders,'Cookie','synthetic-protection-cookie']})).status,307);
  const replaceHeader=(name:string,value:string)=>navigation.rawHeaders.map((x,i,a)=>i>0&&a[i-1]===name?value:x);
  const denied=[
   {...navigation,url:'/api/v1/session'}, {...navigation,url:'/?tracking=value'}, {...navigation,url:'//evil.test/'},
   {...navigation,url:'/./'}, {...navigation,url:'/#fragment'}, {...navigation,method:'HEAD'}, {...navigation,method:'POST',body:'unchanged-body'},
   {...navigation,rawHeaders:replaceHeader('Host','teach-v2-otherbuild-peteyweetss.vercel.app')},
   {...navigation,rawHeaders:replaceHeader('Host',host+':443')}, {...navigation,rawHeaders:replaceHeader('Host',host+'.evil.test')},
   {...navigation,rawHeaders:[...replaceHeader('Host','evil.test'),'X-Forwarded-Host',host]},
   {...navigation,rawHeaders:[...navigation.rawHeaders,'Host',host]}, {...navigation,rawHeaders:[...navigation.rawHeaders,'Origin',canonical]},
   {...navigation,rawHeaders:[...navigation.rawHeaders,'Origin','https://evil.test']},
   {...navigation,rawHeaders:[...navigation.rawHeaders,'Content-Length','1']}, {...navigation,rawHeaders:[...navigation.rawHeaders,'Transfer-Encoding','chunked']},
   {...navigation,rawHeaders:replaceHeader('Sec-Fetch-Mode','cors')}, {...navigation,rawHeaders:replaceHeader('Sec-Fetch-Dest','iframe')},
   {...navigation,rawHeaders:replaceHeader('Sec-Fetch-Site','unexpected')}, {...navigation,rawHeaders:['Host',host]},
  ];
  for(const request of denied){const r=await invoke(request);assert.equal(r.status,400);assert.equal(r.headers.location,undefined);assert.match(r.body,/INVALID_REQUEST/);}
  // Canonical navigation and API requests are delegated, not redirected.
  for(const request of [{...navigation,rawHeaders:replaceHeader('Host','teach-v2.vercel.app')},{...navigation,url:'/api/v1/session',rawHeaders:replaceHeader('Host','teach-v2.vercel.app')}]){const r=await invoke(request);assert.equal(r.status,200);assert.equal(r.headers.location,undefined);}
  state.initialized=false;assert.equal((await invoke(navigation)).status,503);state.initialized=true;
  state.configValid=false;assert.equal((await invoke(navigation)).status,400);state.configValid=true;
  state.origin='https://other.example.test';assert.equal((await invoke(navigation)).status,400);state.origin=canonical;
  for(const override of [
   {status:403,headers:{},body:JSON.stringify({error:{code:'FORBIDDEN'}})},
   {status:400,headers:{},body:'not JSON'},
   {status:400,headers:{},body:JSON.stringify({error:{code:'OTHER'}})},
   {status:400,headers:{'Set-Cookie':['unchanged-cookie']},body:JSON.stringify({error:{code:'INVALID_REQUEST'}})},
  ]){state.override=override;const r=await invoke(navigation);assert.deepEqual(r,override);}
  state.override=null;assert.equal((await invoke(navigation)).status,307);
 }finally{rmSync(root,{recursive:true,force:true});}
});

test('Vercel database observation preserves driver values, callbacks and error identity without logging sensitive values',async()=>{
 const root=mkdtempSync(join(tmpdir(),'teach-vercel-db-diagnostic-test-'));
 const info=console.info,error=console.error,logs:string[]=[];
 try{
  mkdirSync(join(root,'node_modules/pg'),{recursive:true});writeFileSync(join(root,'package.json'),JSON.stringify({type:'module'}));
  writeFileSync(join(root,'node_modules/pg/package.json'),JSON.stringify({name:'pg',type:'module',exports:'./index.js'}));
  writeFileSync(join(root,'node_modules/pg/index.js'),`export const state={connectError:null,queryError:null,result:{unchanged:true},stream:{submit(){}}};
class Client{constructor(){this.connection={stream:{encrypted:true,authorized:true}};}query(input,callback){if(callback){callback(state.queryError,state.result);return 'callback-query';}if(input===state.stream)return input;if(input==='sync')throw state.queryError;return state.queryError?Promise.reject(state.queryError):Promise.resolve(state.result);}}
export const client=new Client();class Pool{connect(callback){if(callback){callback(state.connectError,client,'original-release');return 'callback-connect';}return state.connectError?Promise.reject(state.connectError):Promise.resolve(client);}}
export default {Pool,Client};`);
  writeFileSync(join(root,'vercel-launcher.mjs'),"import handler from './src/bootstrap/demo-successor/accepting-entrypoint.js';\nexport default handler;\n");
  addVercelDatabaseDiagnostics(root);
  assert.ok(readFileSync(join(root,'vercel-launcher.mjs'),'utf8').startsWith("import './vercel-database-diagnostics.mjs';"));
  console.info=value=>logs.push(String(value));console.error=value=>logs.push(String(value));
  await import(pathToFileURL(join(root,'vercel-database-diagnostics.mjs')).href);
  const {default:pg,state,client}=await import(pathToFileURL(join(root,'node_modules/pg/index.js')).href);
  const pool=new pg.Pool();assert.equal(await pool.connect(),client);assert.equal(await pool.connect(),client);
  assert.equal(await client.query('PRIVATE_SENTINEL_SQL'),state.result);assert.equal(client.query(state.stream),state.stream);
  assert.equal(pool.connect((err:any,value:any,release:any)=>{assert.equal(err,null);assert.equal(value,client);assert.equal(release,'original-release');}),'callback-connect');
  assert.equal(client.query('callback',(err:any,value:any)=>{assert.equal(err,null);assert.equal(value,state.result);}),'callback-query');
  const connectError=Object.assign(Error('PRIVATE_SENTINEL_PASSWORD'),{code:'SELF_SIGNED_CERT_IN_CHAIN'});state.connectError=connectError;
  await assert.rejects(()=>pool.connect(),(value:unknown)=>value===connectError);state.connectError=null;
  const queryError=Object.assign(Error('PRIVATE_SENTINEL_PARAMETER'),{code:'42501'});state.queryError=queryError;
  await assert.rejects(()=>client.query('PRIVATE_SENTINEL_SQL'),(value:unknown)=>value===queryError);
  assert.throws(()=>client.query('sync'),(value:unknown)=>value===queryError);
  console.error=()=>{throw Error('logger failure');};await assert.rejects(()=>client.query('PRIVATE_SENTINEL_SQL'),(value:unknown)=>value===queryError);
  assert.ok(logs.every(line=>!line.includes('PRIVATE_SENTINEL')));
  const records=logs.map(line=>JSON.parse(line));assert.equal(records.filter(x=>x.kind==='TEACH_VERCEL_DATABASE_CONNECTION').length,1);
  assert.deepEqual(records[0],{kind:'TEACH_VERCEL_DATABASE_CONNECTION',encrypted:true,authorized:true});
  assert.ok(records.some(x=>x.stage==='connect'&&x.code==='SELF_SIGNED_CERT_IN_CHAIN'));
  assert.ok(records.some(x=>x.stage==='query'&&x.code==='42501'));
  assert.throws(()=>addVercelDatabaseDiagnostics(root),/Expected startup launcher required/);
 }finally{console.info=info;console.error=error;rmSync(root,{recursive:true,force:true});}
});


test('paired database logins independently verify the same credential, TLS, role and read-only access',async()=>{
 const configuration=captureRuntimeConfiguration({...good,TEACH_DB_HOST:'aws-1-us-east-2.pooler.supabase.com',TEACH_DB_PASSWORD:'PRIVATE_SENTINEL_PASSWORD',TEACH_DB_CA:'-----BEGIN CERTIFICATE-----PRIVATE_SENTINEL_CA'});
 const sourceCommit='a'.repeat(40);
 async function scenario(pooler:any={},direct:any={}){
  const clients:any[]=[];
  class Client{
   options:any;state:any;queries:string[]=[];ended=false;destroyed=false;connection:any;
   constructor(options:any){this.options=options;this.state=options.port===6543?pooler:direct;this.connection={stream:{encrypted:true,authorized:this.state.tls!==false,destroy:()=>{this.destroyed=true;}}};clients.push(this);}
   async connect(){if(this.state.connect)throw Object.assign(Error('PRIVATE_SENTINEL_DRIVER_MESSAGE'),{code:this.state.connect});}
   async query(sql:string){this.queries.push(sql);if(this.state.query)throw Object.assign(Error('PRIVATE_SENTINEL_QUERY_MESSAGE'),{code:this.state.query});return {rows:[{role:this.state.role??'teach_v2_demo_runtime',database:'postgres',read_only:this.state.readOnly??'on'}]};}
   async end(){this.ended=true;if(this.state.cleanup)throw Error('PRIVATE_SENTINEL_CLEANUP');if(this.state.cleanupHang)await new Promise(()=>{});}
  }
  const report=await compareDatabaseLogins(configuration,{Client,sourceCommit});
  assert.equal(clients.length,2);assert.ok(clients.every(c=>c.ended));
  for(const c of clients){assert.equal(c.options.password,'PRIVATE_SENTINEL_PASSWORD');assert.equal(c.options.ssl.rejectUnauthorized,true);assert.equal(c.options.ssl.minVersion,'TLSv1.2');assert.equal(c.options.connectionTimeoutMillis,3000);assert.equal(c.options.query_timeout,2000);assert.equal(c.options.options,'-c default_transaction_read_only=on');assert.ok(c.queries.every((q:string)=>q.startsWith('SELECT current_user')));}
  assert.equal(clients[0].options.user,'teach_v2_demo_runtime.acqafjkdkdmtpnsxiesw');assert.equal(clients[1].options.user,'teach_v2_demo_runtime');
  assert.equal(clients[1].options.host,'db.acqafjkdkdmtpnsxiesw.supabase.co');
  assert.ok(!JSON.stringify(report).includes('PRIVATE_SENTINEL'));
  return {report,clients};
 }
 const success=await scenario();assert.equal(success.report.comparison,'BOTH_AUTHENTICATED');assert.ok(success.report.tests.every((t:any)=>t.status==='PASS'&&t.authenticated&&t.identityVerified&&t.readOnly&&t.tlsVerified));
 const rejected=await scenario({connect:'28P01'},{connect:'28P01'});assert.equal(rejected.report.comparison,'BOTH_REJECTED_PASSWORD');assert.ok(rejected.clients.every(c=>c.queries.length===0));
 const cached=await scenario({connect:'28P01'});assert.equal(cached.report.comparison,'DIRECT_ACCEPTED_POOLER_REJECTED');assert.equal(cached.report.tests[1].status,'PASS');
 const network=await scenario({connect:'28P01'},{connect:'ENETUNREACH'});assert.equal(network.report.comparison,'INCONCLUSIVE');assert.equal(network.report.tests[1].code,'ENETUNREACH');
 for(const bad of [{tls:false},{role:'postgres'},{readOnly:'off'},{query:'42501'},{cleanup:true}])assert.equal((await scenario({},bad)).report.tests[1].status,'FAIL');
 const postAuth=await scenario({query:'28P01'},{query:'28P01'});assert.equal(postAuth.report.comparison,'INCONCLUSIVE');
 for(const bad of [{cleanup:true},{cleanupHang:true}]){const cleanup=await scenario({},bad);assert.equal(cleanup.report.tests[1].status,'FAIL');assert.equal(cleanup.clients[1].destroyed,true);}
});

test('paired database login tests refuse target/source/TLS drift before opening connections',async()=>{
 const configuration=captureRuntimeConfiguration({...good,TEACH_DB_HOST:'aws-1-us-east-2.pooler.supabase.com'});let connections=0;
 class RefusedClient{constructor(){connections++;throw Error('Should not connect');}}
 for(const options of [{...configuration.options,host:'foreign.example.test'},{...configuration.options,user:'postgres.acqafjkdkdmtpnsxiesw'},{...configuration.options,ssl:{...(configuration.options.ssl as object),rejectUnauthorized:false}},{...configuration.options,password:''}]){
  const result=await compareDatabaseLogins({options},{Client:RefusedClient,sourceCommit:'a'.repeat(40)});assert.equal(result.status,'BLOCKED');
 }
 assert.equal((await compareDatabaseLogins(configuration,{Client:RefusedClient,sourceCommit:'unknown'})).status,'BLOCKED');assert.equal(connections,0);
});
