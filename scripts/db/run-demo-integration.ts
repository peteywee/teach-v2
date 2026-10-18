import {randomUUID} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import pg from 'pg';
import {assertIsolatedDatabaseTarget} from './isolated-database-target.mjs';
// Each exact suite owns a fresh disposable database. Never share state with
// baseline checks, and never change credentials, roles or network settings.
const target=assertIsolatedDatabaseTarget(process.env.DATABASE_URL);
const admin=new pg.Pool({connectionString:target,connectionTimeoutMillis:5000,statement_timeout:5000});
const suites=['tests/integration/demo/migration-replay.test.ts','tests/integration/demo/postgres-owner-storage.test.ts','tests/integration/demo/application-runtime.test.ts'] as const;
try{
 for(const suite of suites){
  const name='teach_v2_demo_ci_'+randomUUID().replaceAll('-','');let created=false;
  try{
   await admin.query(`CREATE DATABASE ${name}`);created=true;
   const url=new URL(target);url.pathname='/'+name;
   const connectionString=assertIsolatedDatabaseTarget(url.toString());
   execFileSync(process.execPath,['--import','tsx','--test',suite],{cwd:process.cwd(),env:{...process.env,DATABASE_URL:connectionString,TEACH_ISOLATED_DB:'1'},stdio:'inherit',timeout:20000});
  }finally{if(created)await admin.query(`DROP DATABASE ${name}`);}
 }
 console.log('Demo migration, owner storage and application integration PASS in three separate disposable databases');
}finally{await admin.end();}
