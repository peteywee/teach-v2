import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtempSync,readFileSync,writeFileSync,rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { validateRecoveryTarget,verifyRecoveryAdmin } from '../db/recovery-rehearsal-target.mjs';
import { fixturePlan,readOwnedFixture,IMAGE } from '../verification/hosted-loopback-postgres.mjs';
const plan=fixturePlan('123-1-abcdef1234567890');
const local={TEACH_ISOLATED_DB:'1',TEACH_DB_SCHEMA:'teach_v2_demo',DATABASE_URL:'postgresql://agent@127.0.0.1:55432/teach_v2_test',PG17_BIN:'/official/pg17/bin'};
const hosted={TEACH_ISOLATED_DB:'1',TEACH_DB_SCHEMA:'teach_v2_demo',GITHUB_ACTIONS:'true',DATABASE_URL:plan.url};
test('local passwordless and exact owned hosted target only',()=>{
 assert.equal(validateRecoveryTarget(local).password,'');assert.equal(validateRecoveryTarget(hosted,plan).password,'postgres');
 for(const override of [{DATABASE_URL:'postgresql://agent:secret@127.0.0.1:55432/teach_v2_test'},{PG17_BIN:'relative'},{PG17_BIN:undefined},{PGPASSWORD:'secret'},{PGHOST:'remote'},{PGSERVICE:'other'},{TEACH_DB_SCHEMA:'public'},{TEACH_ISOLATED_DB:'0'}]) assert.throws(()=>validateRecoveryTarget({...local,...override}));
 assert.throws(()=>validateRecoveryTarget(hosted));assert.throws(()=>validateRecoveryTarget(local,plan));
 for(const override of [{PG17_BIN:'/tools'},{PGPASSWORD:'postgres'},{DATABASE_URL:plan.url.replace('postgres:postgres','postgres:other')},{DATABASE_URL:plan.url.replace('127.0.0.1','remote.example')},{DATABASE_URL:plan.url.replace(plan.database,'teach_v2_other')},{DATABASE_URL:plan.url+'?host=elsewhere'}])assert.throws(()=>validateRecoveryTarget({...hosted,...override},plan));
});
test('server identity rejects forwarding and wrong cluster before synthetic DDL',()=>{
 const row={host:'127.0.0.1',listen:'127.0.0.1',port:55432,database:'postgres',cluster:plan.cluster,version:'170011'};verifyRecoveryAdmin(row,plan);
 for(const override of [{host:'203.0.113.1'},{host:null},{listen:'*'},{port:5432},{database:plan.database},{cluster:'foreign'},{version:'160011'}])assert.throws(()=>verifyRecoveryAdmin({...row,...override},plan));
 const harness=readFileSync(new URL('../db/verify-demo-recovery-rehearsal.mjs',import.meta.url),'utf8');
 assert.ok(harness.indexOf('verifyRecoveryAdmin(adminActual,plan)')<harness.indexOf('CREATE ROLE'));
 assert.ok(harness.indexOf('recoveryToolchain()')<harness.indexOf('new pg.Pool'));
});
test('owned fixture state is current-run exact and inspect-only before target selection',()=>{
 const dir=mkdtempSync(join(tmpdir(),'teach-recovery-target-'));const env={GITHUB_ACTIONS:'true',GITHUB_RUN_ID:'123',GITHUB_RUN_ATTEMPT:'1',RUNNER_TEMP:dir};
 const file=join(dir,'teach-node24-pg-123-1.json');
 const actual={Name:'/'+plan.name,Config:{Image:IMAGE,Cmd:plan.create.slice(plan.create.indexOf(IMAGE)+1),Labels:{'teach.ci.loopback-owner':plan.owner}},HostConfig:{NetworkMode:'host',ReadonlyRootfs:true,Tmpfs:{'/var/lib/postgresql/data':'rw,size=536870912','/var/run/postgresql':'rw,size=16777216'},Binds:[],PortBindings:{}}};
 const command=args=>{assert.deepEqual(args,['inspect',plan.name]);return JSON.stringify([actual]);};
 try{
  writeFileSync(file,JSON.stringify(plan));assert.deepEqual(readOwnedFixture(env,command),plan);
  for(const bad of [{...plan,url:local.DATABASE_URL},fixturePlan('999-1-abcdef1234567890')]){writeFileSync(file,JSON.stringify(bad));assert.throws(()=>readOwnedFixture(env,command));}
  writeFileSync(file,JSON.stringify(plan));actual.Config.Labels['teach.ci.loopback-owner']='foreign';assert.throws(()=>readOwnedFixture(env,command));actual.Config.Labels['teach.ci.loopback-owner']=plan.owner;
  actual.Config.Image='unknown';assert.throws(()=>readOwnedFixture(env,command));
 }finally{rmSync(dir,{recursive:true,force:true});}
});
