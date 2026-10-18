import {assertIsolatedDatabaseTarget} from './isolated-database-target.mjs';
import {applyDemoMigrations} from './migrate-demo-isolated.js';
import {randomUUID} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {mkdtemp,mkdir,readFile,writeFile,copyFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import pg from 'pg';
// P05's unchanged historical tests intentionally assert its four-column shape.
// They must run against their immutable prefix, never against the admitted demo
// extension or with relaxed assertions. New owner-storage tests cover the head.
const target=assertIsolatedDatabaseTarget(process.env.DATABASE_URL);
const admin=new pg.Pool({connectionString:target});
const name=`teach_v2_p05_history_${randomUUID().replaceAll('-','')}`;
const folder=await mkdtemp(join(tmpdir(),'teach-p05-history-'));
let created=false;
try{
 const journal=JSON.parse(await readFile('drizzle/meta/_journal.json','utf8')) as {entries:Array<{idx:number;tag:string}>};
 journal.entries=journal.entries.filter(entry=>entry.idx<=4);
 if(journal.entries.length!==5||journal.entries.some((entry,index)=>entry.idx!==index)||journal.entries[4]?.tag!=='0004_slice_p05_learning_session')throw Error('Exact immutable P05 migration prefix required');
 await mkdir(join(folder,'meta'));await writeFile(join(folder,'meta/_journal.json'),JSON.stringify(journal));
 for(const entry of journal.entries)await copyFile(resolve('drizzle',`${entry.tag}.sql`),join(folder,`${entry.tag}.sql`));
 await admin.query(`CREATE DATABASE ${name}`);created=true;
 const url=new URL(target);url.pathname='/'+name;const connectionString=assertIsolatedDatabaseTarget(url.toString());
 const pool=new pg.Pool({connectionString});try{await applyDemoMigrations(pool,folder);}finally{await pool.end();}
 execFileSync(process.execPath,['--import','tsx','--test','tests/integration/learning/learning-session-repository.test.ts'],{cwd:process.cwd(),env:{...process.env,DATABASE_URL:connectionString,TEACH_ISOLATED_DB:'1'},stdio:'inherit',timeout:20000});
 console.log('Historical P05 integration PASS against exact five-migration prefix; current demo head is separately tested');
}finally{
 if(created)await admin.query(`DROP DATABASE ${name}`);
 await admin.end();await rm(folder,{recursive:true,force:true});
}
