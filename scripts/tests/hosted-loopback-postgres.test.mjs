import {appendFileSync,existsSync,mkdtempSync,readFileSync,rmSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {main as kitchenMain,kitchenFixtureEnvironment,ORIGINAL_SERVICE_URL} from '../verification/kitchen-loopback-postgres.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:net';
import {fixturePlan,launchFixture,cleanupFixture,verifyFixtureReadback,assertPortFree,PORT,IMAGE} from '../verification/hosted-loopback-postgres.mjs';
const plan=fixturePlan('123-1-abcdef1234567890');
function fixture({existing=false,foreign=false,createUncertain=false,startFailure=false,removeFailure=false}={}){
 let present=existing,created=false;const calls=[];
 const actual=()=>({Name:'/'+plan.name,Config:{Image:IMAGE,Cmd:plan.create.slice(plan.create.indexOf(IMAGE)+1),Labels:{'teach.ci.loopback-owner':foreign?'other':plan.owner}},HostConfig:{NetworkMode:'host',ReadonlyRootfs:true,Tmpfs:{'/var/lib/postgresql/data':'rw,size=536870912','/var/run/postgresql':'rw,size=16777216'},Binds:[],PortBindings:{}}});
 const command=args=>{calls.push(args);if(args[0]==='inspect'){if(present)return JSON.stringify([actual()]);throw Object.assign(Error('missing'),{status:1,stderr:'Error: No such object'});}if(args[0]==='create'){present=true;created=true;if(createUncertain)throw Error('uncertain create timeout');return 'created';}if(args[0]==='start'){if(startFailure)throw Error('start failed');return 'started';}if(args[0]==='rm'){if(removeFailure)throw Error('cleanup failed');present=false;return 'removed';}throw Error('unexpected command');};
 return {command,calls,get present(){return present;},get created(){return created;}};
}
test('finite cached image, no mounts/public binds and only loopback listener',()=>{
 assert.ok(plan.create.includes('--pull=never'));assert.ok(plan.create.includes('--read-only'));assert.ok(plan.create.includes('listen_addresses=127.0.0.1'));assert.ok(plan.create.includes('unix_socket_directories=/var/run/postgresql'));
 assert.equal(plan.create.includes('-p'),false);assert.equal(plan.create.includes('-v'),false);assert.equal(plan.create.includes('--privileged'),false);
 assert.throws(()=>fixturePlan('user-controlled;command'));assert.equal(PORT,55432);
});
test('success launches owned resource, explicit cleanup verifies absence',async()=>{const f=fixture();await launchFixture(plan,{command:f.command,portFree:async()=>{},ready:async()=>{}});assert.ok(f.present);cleanupFixture(plan,f.command);assert.equal(f.present,false);});
test('port and existing-container collisions never create or remove another resource',async()=>{
 for(const options of [{existing:true},{existing:true,foreign:true}]){const f=fixture(options);await assert.rejects(launchFixture(plan,{command:f.command,portFree:async()=>{},ready:async()=>{}}));assert.equal(f.created,false);assert.equal(f.calls.some(x=>x[0]==='rm'),false);}
 const f=fixture();await assert.rejects(launchFixture(plan,{command:f.command,portFree:async()=>{throw Error('port busy');},ready:async()=>{}}));assert.equal(f.created,false);
});
test('uncertain create, failed start, failed address readback and startup timeout clean owned resource without retry',async()=>{
 for(const options of [{createUncertain:true},{startFailure:true},{readbackFailure:true},{timeout:true}]){const f=fixture(options);await assert.rejects(launchFixture(plan,{command:f.command,portFree:async()=>{},ready:async()=>{throw Error(options.timeout?'startup timed out':'readback mismatch');}}));assert.equal(f.present,false);assert.equal(f.calls.filter(x=>x[0]==='create').length,1);}
});
test('foreign ownership and failed cleanup are blocking, never reported clean',async()=>{
 const f=fixture({existing:true,foreign:true});assert.throws(()=>cleanupFixture(plan,f.command));assert.equal(f.calls.some(x=>x[0]==='rm'),false);
 const broken=fixture({startFailure:true,removeFailure:true});await assert.rejects(launchFixture(plan,{command:broken.command,portFree:async()=>{},ready:async()=>{}}),AggregateError);
});
test('readback rejects bridged, remote, wrong-port/version/database/cluster targets',()=>{
 const row={host:'127.0.0.1',listen:'127.0.0.1',port:PORT,database:plan.database,cluster:plan.cluster,version:'170011'};verifyFixtureReadback(row,plan);
 for(const override of [{listen:'*'},{listen:'0.0.0.0'},{host:'172.18.0.2'},{host:'203.0.113.1'},{host:null},{port:5432},{database:'postgres'},{cluster:'foreign'},{version:'160011'}])assert.throws(()=>verifyFixtureReadback({...row,...override},plan));
});
test('actual local occupied socket refuses acquisition without terminating listener',async()=>{
 const server=createServer();await new Promise((resolve,reject)=>{server.once('error',reject);server.listen({host:'127.0.0.1',port:0},resolve);});
 try{await assert.rejects(assertPortFree(server.address().port),{code:'EADDRINUSE'});assert.equal(server.listening,true);}finally{await new Promise(resolve=>server.close(resolve));}
});

function kitchenEnvironment(){
 const root=mkdtempSync(join(tmpdir(),'teach-kitchen-fixture-scope-')),file=join(root,'github-env');writeFileSync(file,'');
 return {root,file,env:{GITHUB_ACTIONS:'true',GITHUB_RUN_ID:'123',GITHUB_RUN_ATTEMPT:'1',RUNNER_TEMP:root,GITHUB_ENV:file,DATABASE_URL:ORIGINAL_SERVICE_URL}};
}
test('kitchen scope is current-run-only and cannot collide with later Node24 fixture state',()=>{
 const {root,env}=kitchenEnvironment();try{
  const scoped=kitchenFixtureEnvironment(env);assert.equal(scoped.RUNNER_TEMP,join(root,'teach-kitchen-postgres-123-1'));
  assert.equal(env.RUNNER_TEMP,root);assert.equal(scoped.GITHUB_ENV,env.GITHUB_ENV);
  assert.notEqual(join(scoped.RUNNER_TEMP,'teach-node24-pg-123-1.json'),join(root,'teach-node24-pg-123-1.json'));
  for(const change of [{GITHUB_ACTIONS:'false'},{GITHUB_RUN_ID:'../123'},{GITHUB_RUN_ATTEMPT:'x'},{RUNNER_TEMP:'relative'},{GITHUB_ENV:'relative'}])assert.throws(()=>kitchenFixtureEnvironment({...env,...change}));
 }finally{rmSync(root,{recursive:true,force:true});}
});
test('kitchen wrapper delegates unchanged owned lifecycle and restores only the exact preceding service URL',async()=>{
 const {root,file,env}=kitchenEnvironment(),calls=[],active='postgresql://postgres:postgres@127.0.0.1:55432/teach_v2_ci_synthetic';
 try{
  const fixture=async(action,scoped)=>{calls.push({action,root:scoped.RUNNER_TEMP});assert.ok(existsSync(scoped.RUNNER_TEMP));if(action==='start')appendFileSync(scoped.GITHUB_ENV,`DATABASE_URL=${active}\n`);};
  await kitchenMain('start',env,fixture);assert.equal(readFileSync(file,'utf8'),`DATABASE_URL=${active}\n`);
  await kitchenMain('stop',{...env,DATABASE_URL:active},fixture);
  assert.deepEqual(calls,[{action:'start',root:join(root,'teach-kitchen-postgres-123-1')},{action:'stop',root:join(root,'teach-kitchen-postgres-123-1')}]);
  assert.equal(readFileSync(file,'utf8'),`DATABASE_URL=${active}\nDATABASE_URL=${ORIGINAL_SERVICE_URL}\n`);
  assert.equal(env.RUNNER_TEMP,root);assert.equal(existsSync(join(root,'teach-node24-pg-123-1.json')),false);
 }finally{rmSync(root,{recursive:true,force:true});}
});
test('kitchen start refuses an unexpected preceding URL or action before invoking the fixture',async()=>{
 const {root,env}=kitchenEnvironment();let calls=0;try{
  for(const DATABASE_URL of ['postgresql://postgres:postgres@203.0.113.1:5432/teach_v2',ORIGINAL_SERVICE_URL+'?host=other',ORIGINAL_SERVICE_URL.replace('/teach_v2','/postgres'),'postgresql://user:DO_NOT_PRINT@example.invalid/teach_v2'])await assert.rejects(kitchenMain('start',{...env,DATABASE_URL},async()=>{calls++;}),error=>error.message==='exact preceding synthetic service target required'&&!String(error).includes('DO_NOT_PRINT'));
  await assert.rejects(kitchenMain('restart',env,async()=>{calls++;}));assert.equal(calls,0);
  assert.equal(existsSync(join(root,'teach-kitchen-postgres-123-1')),false);
 }finally{rmSync(root,{recursive:true,force:true});}
});
test('kitchen always-stop still restores the preceding target after failed start or cleanup without claiming success',async()=>{
 const {root,file,env}=kitchenEnvironment();try{
  const startError=Error('start failed'),cleanupError=Error('cleanup failed');
  await assert.rejects(kitchenMain('start',env,async()=>{throw startError;}),error=>error===startError);
  await kitchenMain('stop',env,async()=>{});assert.equal(readFileSync(file,'utf8'),`DATABASE_URL=${ORIGINAL_SERVICE_URL}\n`);
  await assert.rejects(kitchenMain('stop',env,async()=>{throw cleanupError;}),error=>error===cleanupError);
  assert.equal(readFileSync(file,'utf8'),`DATABASE_URL=${ORIGINAL_SERVICE_URL}\nDATABASE_URL=${ORIGINAL_SERVICE_URL}\n`);
  await assert.rejects(kitchenMain('stop',{...env,GITHUB_ENV:root},async()=>{throw cleanupError;}),error=>error instanceof AggregateError&&error.errors[0]===cleanupError&&error.errors.length===2);
 }finally{rmSync(root,{recursive:true,force:true});}
});
