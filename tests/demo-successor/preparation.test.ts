import assert from 'node:assert/strict';
import test from 'node:test';
import {successorPoolOptions,retainSuccessorPool} from '../../src/bootstrap/demo-successor/pool.js';
import {captureSuccessorBinding,successorBindingDigest} from '../../src/bootstrap/demo-successor/binding.js';
import {createSuccessorDemo} from '../../src/bootstrap/demo-successor/composition.js';
const input={host:'aws-0-us-east-1.pooler.supabase.com',user:'teach_v2_demo_runtime.'+'a'.repeat(20),password:'synthetic-not-live',ca:'-----BEGIN CERTIFICATE-----\nsynthetic\n-----END CERTIFICATE-----'};
const binding={kind:'TEACH_HOSTED_SUCCESSOR_PROPOSAL',execution:'DISABLED',sourceCommit:'a'.repeat(40),sourceTree:'b'.repeat(40),buildDigest:'c'.repeat(64),closureDigest:'d'.repeat(64),schema:'teach_v2_demo',lineageDigest:'e'.repeat(64),modelProofDigest:'f'.repeat(64),nodePatch:process.versions.node,packageManager:'pnpm@12.8.1',projectRef:'a'.repeat(20),vercelProjectId:'synthetic',deploymentId:'synthetic',origin:'https://demo.example.com',runtimeCredentialRevision:'synthetic-1',runtimeRole:'teach_v2_demo_runtime'};
test('pool policy cannot be overridden by URL/query options; TLS verifies and pool max is two',()=>{
 const config=successorPoolOptions(input);assert.equal(config.max,2);assert.equal(config.query_timeout,10000);assert.equal(config.connectionTimeoutMillis,3000);assert.equal((config.ssl as any).rejectUnauthorized,true);assert.equal(config.connectionString,undefined);
 for(const host of ['localhost','aws-0-us-east-1.pooler.supabase.com?sslmode=disable','evil.example.com',input.host+'\n'])assert.throws(()=>successorPoolOptions({...input,host}));
 assert.throws(()=>successorPoolOptions({...input,user:'postgres'}));assert.throws(()=>successorPoolOptions({...input,ca:''}));
});
test('one lazy retained pool, one close, no reuse',async()=>{let creates=0,ends=0;const pool=retainSuccessorPool(()=>{creates++;return {async end(){ends++;}};});assert.equal(creates,0);assert.equal(pool.get(),pool.get());assert.equal(creates,1);await pool.close();await pool.close();assert.equal(ends,1);assert.throws(()=>pool.get());});
test('finite proposal rejects activation, unknown selectors, accessors and Node drift',()=>{
 assert.ok(Object.isFrozen(captureSuccessorBinding(binding)));assert.equal(successorBindingDigest(binding).length,64);
 for(const changed of [{execution:'ENABLED'},{schema:'public'},{nodePatch:'22.0.0'},{runtimeRole:'postgres'},{extra:'x'},{origin:'http://demo.example.com'},{sourceCommit:'a'.repeat(40)+'\n'},{runtimeCredentialRevision:'synthetic-1\n'}])assert.throws(()=>captureSuccessorBinding({...binding,...changed}));
 const getter={...binding};Object.defineProperty(getter,'projectRef',{get(){throw Error('must not run');}});assert.throws(()=>captureSuccessorBinding(getter),/shape/);
});
test('valid/equal proposals and injected dependencies cannot activate successor',async()=>{
 let calls=0;const app=createSuccessorDemo({configuration:binding,packageEvidence:binding,poolFactory:async()=>{calls++;},applicationFactory:()=>{calls++;throw Error('must not run');}});
 assert.equal((await app.handle(new Request(binding.origin))).status,503);assert.equal(calls,0);assert.equal(app.readiness().ready,false);
});
test('BEGIN failure always releases/destroys the checked-out client',async()=>{
 process.env.TEACH_DB_SCHEMA='teach_v2_demo';
 const {SuccessorDemoTransaction}=await import('../../src/bootstrap/demo-successor/transaction.js');
 let released=0,destroyed=false;
 const client={query:async()=>{throw Error('synthetic BEGIN failure');},release:(destroy:boolean)=>{released++;destroyed=destroy;}};
 const runner=new SuccessorDemoTransaction({connect:async()=>client} as any);
 await assert.rejects(()=>runner.run(async()=>{}));assert.equal(released,1);assert.equal(destroyed,true);
});
test('default public target rejects before checkout in a fresh process',async()=>{
 const {spawnSync}=await import('node:child_process');
 const env={...process.env};delete env.TEACH_DB_SCHEMA;
 const result=spawnSync(process.execPath,['--import','tsx','--input-type=module','-e',`import {SuccessorDemoTransaction} from './src/bootstrap/demo-successor/transaction.ts'; let calls=0; const r=new SuccessorDemoTransaction({connect(){calls++;throw Error('checkout');}}); try {await r.run(async()=>{});process.exit(2);} catch(e){if(e.message!=='Successor requires isolated schema'||calls!==0)process.exit(3);}`],{env,encoding:'utf8',timeout:10000});
 assert.equal(result.status,0,result.stderr);
});
