import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {appendFileSync,readFileSync,writeFileSync,existsSync} from 'node:fs';
import {join,isAbsolute,resolve} from 'node:path';
import {randomBytes} from 'node:crypto';
import {createServer} from 'node:net';
import pg from 'pg';

export const IMAGE='postgres:17.11-alpine',PORT=55432;
const LABEL='teach.ci.loopback-owner';
const statePath=env=>{
 assert.equal(env.GITHUB_ACTIONS,'true','GitHub disposable runner required');
 assert.match(env.GITHUB_RUN_ID??'',/^\d+$/);assert.match(env.GITHUB_RUN_ATTEMPT??'',/^\d+$/);
 assert.ok(isAbsolute(env.RUNNER_TEMP??''),'runner temporary directory required');
 return join(env.RUNNER_TEMP,`teach-node24-pg-${env.GITHUB_RUN_ID}-${env.GITHUB_RUN_ATTEMPT}.json`);
};
export function fixturePlan(owner){
 assert.match(owner,/^\d+-\d+-[a-f0-9]{16}$/);
 const name='teach-node24-pg-'+owner, database='teach_v2_ci_'+owner.replaceAll('-','_');
 assert.ok(database.length<=63);
 return {owner,name,database,cluster:name,url:`postgresql://postgres:postgres@127.0.0.1:${PORT}/${database}`,
  create:['create','--pull=never','--name',name,'--label',`${LABEL}=${owner}`,'--network','host','--read-only',
   '--tmpfs','/var/lib/postgresql/data:rw,size=536870912','--tmpfs','/var/run/postgresql:rw,size=16777216',
   '-e','POSTGRES_USER=postgres','-e','POSTGRES_PASSWORD=postgres','-e',`POSTGRES_DB=${database}`,
   IMAGE,'postgres','-c','listen_addresses=127.0.0.1','-c',`port=${PORT}`,'-c','unix_socket_directories=/var/run/postgresql', '-c',`cluster_name=${name}`]};
}
const docker=args=>execFileSync('docker',args,{encoding:'utf8',timeout:4000,stdio:['ignore','pipe','pipe']}).trim();
export function inspectFixture(name,command=docker){
 try{return JSON.parse(command(['inspect',name]))[0];}
 catch(error){if(error.status===1&&/No such (?:object|container)/i.test(String(error.stderr)))return null;throw error;}
}
export function assertFixtureOwned(actual,plan){
 assert.equal(actual?.Name,'/'+plan.name);assert.equal(actual.Config?.Labels?.[LABEL],plan.owner);
 assert.equal(actual.Config?.Image,IMAGE);assert.deepEqual(actual.Config?.Cmd,plan.create.slice(plan.create.indexOf(IMAGE)+1));assert.equal(actual.HostConfig?.NetworkMode,'host');
 assert.equal(actual.HostConfig?.ReadonlyRootfs,true);
 assert.deepEqual(actual.HostConfig?.Tmpfs,{'/var/lib/postgresql/data':'rw,size=536870912','/var/run/postgresql':'rw,size=16777216'});
 assert.ok((actual.Mounts??[]).every(m=>m.Type==='tmpfs'&&['/var/lib/postgresql/data','/var/run/postgresql'].includes(m.Destination)));
 assert.equal((actual.HostConfig?.Binds??[]).length,0);assert.equal(Object.keys(actual.HostConfig?.PortBindings??{}).length,0);
}
export function cleanupFixture(plan,command=docker){
 const actual=inspectFixture(plan.name,command);if(!actual)return;
 assertFixtureOwned(actual,plan);command(['rm','--force',plan.name]);
 assert.equal(inspectFixture(plan.name,command),null,'fixture removal must read back');
}
export function verifyFixtureReadback(row,plan){
 assert.equal(row.host,'127.0.0.1');assert.equal(row.listen,'127.0.0.1');assert.equal(Number(row.port),PORT);
 assert.equal(row.database,plan.database);assert.equal(row.cluster,plan.cluster);
 assert.equal(Math.floor(Number(row.version)/10000),17);
}
export async function assertPortFree(port=PORT){
 await new Promise((resolve,reject)=>{const server=createServer();server.once('error',reject);server.listen({host:'127.0.0.1',port,exclusive:true},()=>server.close(error=>error?reject(error):resolve()));});
}
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function readiness(plan){
 const deadline=Date.now()+10000;let last;
 while(Date.now()<deadline){
  const pool=new pg.Pool({connectionString:plan.url,max:1,connectionTimeoutMillis:500,query_timeout:1000});
  try {const row=(await pool.query("SELECT pg_catalog.host(pg_catalog.inet_server_addr()) AS host,pg_catalog.inet_server_port() AS port,pg_catalog.current_database() AS database,pg_catalog.current_setting('cluster_name') AS cluster,pg_catalog.current_setting('listen_addresses') AS listen,pg_catalog.current_setting('server_version_num') AS version")).rows[0];verifyFixtureReadback(row,plan);console.log(JSON.stringify({kind:'disposable-loopback-postgres',...row}));return;}
  catch(error){if(error.code==='ERR_ASSERTION')throw error;last=error;}
  finally {await pool.end();}
  await delay(100);
 }
 throw Error('Disposable loopback PostgreSQL startup timed out',{cause:last});
}
export async function launchFixture(plan,{command=docker,portFree=assertPortFree,ready=readiness}={}){
 assert.equal(inspectFixture(plan.name,command),null,'existing fixture collision');
 await portFree(); // Never terminate another listener to obtain the port.
 try {
  command(plan.create);const actual=inspectFixture(plan.name,command);assertFixtureOwned(actual,plan);
  command(['start',plan.name]);await ready(plan);
 }catch(error){try{cleanupFixture(plan,command);}catch(cleanup){throw new AggregateError([error,cleanup],'fixture failed; cleanup unverified');}throw error;}
}
export async function main(action,env=process.env){
 const file=statePath(env);
 if(action==='start'){
  assert.ok(!existsSync(file),'fixture state already exists');assert.ok(isAbsolute(env.GITHUB_ENV??''));
  const plan=fixturePlan(`${env.GITHUB_RUN_ID}-${env.GITHUB_RUN_ATTEMPT}-${randomBytes(8).toString('hex')}`);
  // Persist ownership before create so the unconditional cleanup step also covers abrupt interruption.
  writeFileSync(file,JSON.stringify(plan),{flag:'wx',mode:0o600});
  try {await launchFixture(plan);appendFileSync(env.GITHUB_ENV,`DATABASE_URL=${plan.url}\n`);}
  catch(error){try{cleanupFixture(plan);}catch(cleanup){throw new AggregateError([error,cleanup],'fixture cleanup unverified');}throw error;}
 }else if(action==='stop'){
  if(!existsSync(file))return;const saved=JSON.parse(readFileSync(file,'utf8')),plan=fixturePlan(saved.owner);
  assert.ok(saved.owner.startsWith(`${env.GITHUB_RUN_ID}-${env.GITHUB_RUN_ATTEMPT}-`),'fixture belongs to another run');
  assert.deepEqual(saved,plan,'fixture state differs from fixed plan');cleanupFixture(plan);
 }else throw Error('Only start and stop are admitted');
}
if(process.argv[1]&&resolve(process.argv[1])===new URL(import.meta.url).pathname)await main(process.argv[2]);
