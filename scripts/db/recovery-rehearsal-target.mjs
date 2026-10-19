// Synthetic-only target/tool selection. No provider URL, arbitrary container or password mode.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { isAbsolute, join } from 'node:path';
import { assertIsolatedDatabaseTarget } from './isolated-database-target.mjs';
import { readOwnedFixture, verifyFixtureReadback } from '../verification/hosted-loopback-postgres.mjs';
export function validateRecoveryTarget(env, plan=null) {
 for (const key of Object.keys(env)) if(key.startsWith('PG') && key!=='PG17_BIN') throw Error('ambient PostgreSQL configuration is not accepted');
 assert.equal(env.TEACH_DB_SCHEMA,'teach_v2_demo');
 const url=new URL(assertIsolatedDatabaseTarget(env.DATABASE_URL,env));
 assert.ok(url.username && url.port,'explicit local user and port required');
 if(env.GITHUB_ACTIONS==='true') {
  assert.equal(env.PG17_BIN,undefined,'hosted recovery uses only clients from the exact owned container');
  assert.ok(plan,'verified current-run owned fixture required');
  assert.equal(url.toString(),new URL(plan.url).toString(),'exact owned synthetic fixture URL required');
 } else {
  assert.equal(plan,null,'container mode is GitHub-owned fixture only');
  assert.equal(url.password,'','local synthetic rehearsal does not accept passwords');
  assert.ok(env.PG17_BIN && isAbsolute(env.PG17_BIN),'absolute official PostgreSQL17 tools path required');
 }
 return url;
}
export function verifyRecoveryAdmin(row, plan=null) {
 assert.ok(['127.0.0.1','::1'].includes(row.host),'admin must actually connect to loopback before any DDL');
 assert.equal(row.database,'postgres');
 assert.equal(Math.floor(Number(row.version)/10000),17);
 if(plan) verifyFixtureReadback(row,{...plan,database:'postgres'});
}
export function recoveryToolchain(env=process.env) {
 // readOwnedFixture authenticates fixed image/network/mounts/labels and run state.
 const plan=env.GITHUB_ACTIONS==='true'?readOwnedFixture(env):null;
 const url=validateRecoveryTarget(env,plan);
 const run=(tool,args=[],options={})=>{
  assert.ok(['pg_dump','pg_restore'].includes(tool),'only official dump/restore clients allowed');
  if(plan) return execFileSync('docker',['exec','-i',plan.name,'env','-i','PATH=/usr/local/bin:/usr/bin:/bin','PGCONNECT_TIMEOUT=2',tool,...args],options);
  return execFileSync(join(env.PG17_BIN,tool),args,options);
 };
 for(const tool of ['pg_dump','pg_restore'])assert.match(run(tool,['--version'],{encoding:'utf8',timeout:2000}),/PostgreSQL\) 17\./);
 return {url,plan,run};
}
