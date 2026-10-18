import assert from 'node:assert/strict';
import test from 'node:test';
import {createDisabledHostedDemo} from '../../src/bootstrap/demo-hosted/composition.js';
import {validateHostedBindingProposal,validateHostedOrigin,hostedBindingDigest} from '../../src/bootstrap/demo-hosted/configuration.js';
import {HOSTED_POOL_POLICY,prepareHostedPoolPolicy} from '../../src/bootstrap/demo-hosted/pool.js';
import {createDisabledHostedExpiryInvocation,validateExpiryBatchResult} from '../../src/bootstrap/demo-hosted/expiry.js';
import {binding,request,testOnlyCompose,testOnlyExpiry} from './harness.js';

test('packaged default cannot activate, even with plausible JSON, environment flags or local attestation',async()=>{
 let effects=0;const original=process.env.TEACH_HOSTED_ENABLED;process.env.TEACH_HOSTED_ENABLED='1';
 try{for(const configuration of [undefined,binding(),{kind:'LOCAL_ISOLATED_VERIFICATION',approved:true}, {...binding(),execution:'ENABLED'}]){
  const demo=createDisabledHostedDemo({configuration,packageEvidence:{verified:true},poolFactory:async()=>{effects++;return {};},applicationFactory:()=>{effects++;throw new Error('must not run');}});
  assert.equal(demo.readiness().ready,false);assert.equal(demo.readiness().state,'DISABLED');
  for(const path of ['/','/api/v1/demo/start','/readiness']){const r=await demo.handle(request(path));assert.equal(r.status,503);assert.equal((await r.json()).error.code,'SERVICE_UNAVAILABLE');assert.equal(r.headers.get('cache-control'),'no-store');}
 }assert.equal(effects,0);}finally{if(original===undefined)delete process.env.TEACH_HOSTED_ENABLED;else process.env.TEACH_HOSTED_ENABLED=original;}
});
test('structural proposals are exact, detached values, not operational authority',()=>{
 const input=binding(), captured=validateHostedBindingProposal(input);input.vercel.projectId='different';assert.equal(captured.vercel.projectId,'synthetic_project');
 assert.equal(hostedBindingDigest(captured),hostedBindingDigest(binding()));
 for(const input of [{kind:'LOCAL_ISOLATED_VERIFICATION'}, {...binding(),ready:true},{...binding(),execution:'ENABLED'},Object.assign(Object.create({}),binding())])assert.throws(()=>validateHostedBindingProposal(input));
 let getters=0;const bad=binding();Object.defineProperty(bad,'source',{get(){getters++;return binding().source;},enumerable:true});assert.throws(()=>validateHostedBindingProposal(bad));assert.equal(getters,0);
});
for(const value of ['http://demo.example.test','https://localhost','https://127.0.0.1','https://[::1]','https://demo.local','https://demo.localhost','https://demo.example.test/','https://demo.example.test:443','https://demo.example.test:444','https://user:pass@demo.example.test','https://DEMO.example.test','https://demo.example.test?x=1','https://demo..test','https://-demo.test'])test('rejects non-exact HTTPS origin '+value,()=>assert.throws(()=>validateHostedOrigin(value)));
test('every target identity mismatch is rejected before either test dependency factory',async()=>{
 const changes:Array<(p:ReturnType<typeof binding>)=>void>=[p=>{p.vercel.projectId='other';},p=>{p.vercel.teamId='other';},p=>{p.vercel.deploymentId='other';},p=>{p.vercel.environment='production';},p=>{p.vercel.origin='https://other.example.test';},p=>{p.supabase.projectRef='b'.repeat(20);},p=>{p.supabase.endpoint.host='aws-1-eu-west-1.pooler.supabase.com';},p=>{p.source.commit='1'.repeat(40);},p=>{p.source.tree='2'.repeat(40);},p=>{p.source.buildDigest='3'.repeat(64);},p=>{p.source.manifestDigest='4'.repeat(64);},p=>{p.authority.admissionDigest='5'.repeat(64);},p=>{p.authority.mappingDigest='6'.repeat(64);},p=>{p.authority.migrationDigest='7'.repeat(64);},p=>{p.secretRevisions.runtime='other';},p=>{p.secretRevisions.scheduler='other';}];
 let effects=0;for(const change of changes){const proposed=binding();change(proposed);await assert.rejects(testOnlyCompose({proposed,verify:async()=>binding(),poolFactory:async()=>{effects++;return {};},applicationFactory:()=>{effects++;throw new Error();}}));}
 await assert.rejects(testOnlyCompose({proposed:binding(),verify:async()=>null,poolFactory:async()=>{effects++;return {};},applicationFactory:()=>{effects++;throw new Error();}}));assert.equal(effects,0);
});
test('pool boundary rejects TLS, size, timeout, startup migration and pooler changes before factory',async()=>{
 const policies=[{...HOSTED_POOL_POLICY,max:8},{...HOSTED_POOL_POLICY,tls:{rejectUnauthorized:false,minVersion:'TLSv1.2'}},{...HOSTED_POOL_POLICY,statementTimeoutMillis:0},{...HOSTED_POOL_POLICY,transactionTimeoutMillis:0},{...HOSTED_POOL_POLICY,startupMigration:true},{...HOSTED_POOL_POLICY,namedPreparedStatements:true},{...HOSTED_POOL_POLICY,poolMode:'session'}];let effects=0;
 for(const poolPolicy of policies)await assert.rejects(testOnlyCompose({proposed:binding(),verify:async()=>binding(),poolPolicy,poolFactory:async()=>{effects++;return {};},applicationFactory:()=>{effects++;throw new Error();}}));
 const malformed=binding();(malformed.supabase.endpoint as {host:string}).host='localhost';assert.throws(()=>prepareHostedPoolPolicy(malformed));
 let getter=0;const p={...HOSTED_POOL_POLICY};Object.defineProperty(p,'max',{get(){getter++;return 2;},enumerable:true});assert.throws(()=>prepareHostedPoolPolicy(binding(),p));assert.equal(getter,0);assert.equal(effects,0);assert.equal(prepareHostedPoolPolicy(binding()).policy.max,2);
});
test('test-only verified composition creates one retained dependency, never one per request',async()=>{
 let pools=0,apps=0;const handler=await testOnlyCompose({proposed:binding(),verify:async()=>binding(),poolFactory:async()=>{pools++;return {};},applicationFactory:()=>{apps++;return {async execute(){return {body:{}};}};}});
 await handler(request('/'));await handler(request('/'));assert.equal(pools,1);assert.equal(apps,1);
});
test('expiry is unmounted/default-denied; only the excluded test harness can inject verification',async()=>{
 let calls=0;const factory=()=>({expireDueRuns:async()=>{calls++;return 100;}});
 const deny=createDisabledHostedExpiryInvocation(factory);assert.equal((await deny(request('/unmounted','POST','{}'))).status,403);assert.equal(calls,0);
 await assert.rejects(testOnlyExpiry(request('/unmounted','POST'),async()=>false,factory));assert.equal(calls,0);
 for(const req of [request('/unmounted?runId=chosen','POST'),request('/unmounted','POST','{"principal":"chosen"}'),request('/unmounted'),request('/unmounted','POST',undefined,{'Idempotency-Key':'chosen'})])await assert.rejects(testOnlyExpiry(req,async()=>true,factory));assert.equal(calls,0);
 assert.equal(await testOnlyExpiry(request('/unmounted','POST'),async()=>true,factory),100);assert.equal(calls,1);
 for(const count of [-1,101,1.5,'100'])assert.throws(()=>validateExpiryBatchResult(count));
 let failures=0;await assert.rejects(testOnlyExpiry(request('/unmounted','POST'),async()=>true,()=>({expireDueRuns:async()=>{failures++;throw new Error('simulated dependency failure');}})));assert.equal(failures,1);
});

test('actual module import and default construction cause no socket, listener, fetch or interval effects',async()=>{
 const {execFileSync}=await import('node:child_process');
 const source=`import net from 'node:net';let effects=0;net.Socket.prototype.connect=function(){effects++;throw Error('network forbidden');};net.Server.prototype.listen=function(){effects++;throw Error('listener forbidden');};globalThis.fetch=async()=>{effects++;throw Error('fetch forbidden');};globalThis.setInterval=()=>{effects++;throw Error('scheduler forbidden');};const {createDisabledHostedDemo}=await import('./src/bootstrap/demo-hosted/composition.ts');const {createDisabledHostedExpiryInvocation}=await import('./src/bootstrap/demo-hosted/expiry.ts');const demo=createDisabledHostedDemo({poolFactory:async()=>{effects++;throw Error();},applicationFactory:()=>{effects++;throw Error();}});const response=await demo.handle(new Request('https://demo.example.test/'));await createDisabledHostedExpiryInvocation(()=>{effects++;throw Error();})(new Request('https://demo.example.test/unmounted'));if(effects!==0||response.status!==503||demo.readiness().ready)throw Error('effects or activation');process.stdout.write('ZERO_EFFECTS');`;
 assert.equal(execFileSync(process.execPath,['--import','tsx','--input-type=module','-e',source],{cwd:process.cwd(),timeout:10000,encoding:'utf8'}),'ZERO_EFFECTS');
});
