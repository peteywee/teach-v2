import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import pg from 'pg';
import {execFileSync} from 'node:child_process';
import {assertIsolatedDatabaseTarget} from './isolated-database-target.mjs';
// The guarded proof owns its disposable databases/roles and always cleans up.
const connectionString=assertIsolatedDatabaseTarget(process.env.DATABASE_URL);
execFileSync(process.execPath,['--import','tsx','--test','tests/integration/demo/authoring-runtime.test.ts'],{cwd:process.cwd(),env:{...process.env,DATABASE_URL:connectionString,TEACH_ISOLATED_DB:'1',TEACH_DB_SCHEMA:'teach_v2_demo'},stdio:'inherit',timeout:20000});

// Upgrade rehearsal gets its own fresh database; the first proof owns its two databases internally.
const admin=new pg.Pool({connectionString,connectionTimeoutMillis:5000,statement_timeout:5000}),suffix=randomUUID().replaceAll('-',''),name='teach_v2_authoring_upgrade_'+suffix,role='teach_authoring_upgrade_'+suffix;let created=false,roleCreated=false,failed=false;
let client:pg.PoolClient|undefined;
try{
 client=await admin.connect();
 const actual=(await client.query('SELECT pg_catalog.host(pg_catalog.inet_server_addr()) AS host,pg_catalog.current_database() AS database')).rows[0];
 assert.ok(['127.0.0.1','::1'].includes(actual.host),'owned fixture DDL requires actual loopback server');assert.equal(actual.database,new URL(connectionString).pathname.slice(1),'owned fixture DDL requires exact connected database');
 await client.query(`CREATE ROLE ${role} NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS`);roleCreated=true;await client.query(`CREATE DATABASE ${name}`);created=true;
 const target=new URL(connectionString);target.pathname='/'+name;const upgrade=assertIsolatedDatabaseTarget(target.toString());
 execFileSync(process.execPath,['--import','tsx','--test','tests/integration/demo/authoring-upgrade.test.ts'],{cwd:process.cwd(),env:{...process.env,DATABASE_URL:upgrade,TEACH_ISOLATED_DB:'1',TEACH_DB_SCHEMA:'teach_v2_demo',TEACH_AUTHORING_UPGRADE_ROLE:role},stdio:'inherit',timeout:20000});
}catch(error){failed=true;throw error;}finally{
 const cleanupErrors:unknown[]=[];
 if(created)try{await client!.query(`DROP DATABASE ${name}`);}catch(error){cleanupErrors.push(error);}
 if(roleCreated)try{await client!.query(`DROP ROLE ${role}`);}catch(error){cleanupErrors.push(error);}
 client?.release();try{await admin.end();}catch(error){cleanupErrors.push(error);}
 if(!failed&&cleanupErrors.length)throw new AggregateError(cleanupErrors,'Owned authoring fixture cleanup failed');
}
