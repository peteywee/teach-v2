// LOCAL SYNTHETIC mechanism rehearsal, never t34ch recovery proof or live authority.
import assert from 'node:assert/strict';
import { createHash, createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import pg from 'pg';
import { recoveryToolchain, verifyRecoveryAdmin } from './recovery-rehearsal-target.mjs';
import { applyIsolatedSchemaMigrations } from './migrate-isolated-schema.mjs';
import { dropReplayDatabase } from './replay-database-cleanup.mjs';
const {url,plan,run}=recoveryToolchain();
const id = `${process.pid}_${randomBytes(4).toString('hex')}`, role=`teach_recovery_${id}`;
const names = ['source','restored'].map(x=>`teach_v2_recovery_${x}_${id}`);
const rootURL = new URL(url);rootURL.pathname='/postgres';
const admin = new pg.Pool({connectionString:rootURL.toString(),max:1});
const pools=[], created=[];let roleCreated=false, snapshot;
const temp=mkdtempSync(join(tmpdir(),'teach-synthetic-recovery-'));
const hash=b=>createHash('sha256').update(b).digest('hex');
const toolsEnv={PATH:process.env.PATH,HOME:temp,PGCONNECT_TIMEOUT:'2'}; // no inherited PG target or password overrides
const dump=(connection,args=[])=>run('pg_dump',['--dbname',connection,'--schema=synthetic_legacy',...args],{env:toolsEnv,timeout:3000,maxBuffer:4*1024*1024});
const schema=connection=>dump(connection,['--schema-only']).toString().split('\n').filter(l=>!/^\\(un)?restrict /.test(l)).join('\n');
const roles=async()=> (await admin.query('SELECT rolname,rolsuper,rolinherit,rolcreaterole,rolcreatedb,rolcanlogin,rolreplication,rolbypassrls FROM pg_roles WHERE rolname=$1',[role])).rows;
async function inventory(pool,connection) {
 return {schema:hash(schema(connection)),rows:(await pool.query('SELECT * FROM synthetic_legacy.items ORDER BY id')).rows,journal:(await pool.query('SELECT * FROM synthetic_legacy.journal ORDER BY id')).rows,sequence:(await pool.query('SELECT last_value::text,is_called FROM synthetic_legacy.items_id_seq')).rows,roles:await roles(),memberships:(await admin.query('SELECT pg_get_userbyid(roleid) AS parent,pg_get_userbyid(member) AS member,admin_option,inherit_option,set_option FROM pg_auth_members WHERE roleid=(SELECT oid FROM pg_roles WHERE rolname=$1) OR member=(SELECT oid FROM pg_roles WHERE rolname=$1) ORDER BY 1,2',[role])).rows,extensions:(await pool.query('SELECT extname,extversion FROM pg_extension ORDER BY 1')).rows,rls:(await pool.query("SELECT relname,relrowsecurity,relforcerowsecurity,relacl::text FROM pg_class WHERE relnamespace='synthetic_legacy'::regnamespace ORDER BY relname")).rows};
}
try {
 const adminActual=(await admin.query("SELECT host(inet_server_addr()) AS host,inet_server_port() AS port,current_database() AS database,current_setting('server_version_num') AS version,current_setting('cluster_name') AS cluster,current_setting('listen_addresses') AS listen")).rows[0];
 verifyRecoveryAdmin(adminActual,plan); // Must precede every CREATE or grant.
 await admin.query(`CREATE ROLE "${role}" NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS NOINHERIT`);roleCreated=true;
 for (const name of names) {
  await admin.query(`CREATE DATABASE "${name}" TEMPLATE template0`);created.push(name);
  const u=new URL(url);u.pathname='/'+name;
  const pool=new pg.Pool({connectionString:u.toString(),max:2});pools.push(pool);
  assert.equal(Math.floor(Number((await pool.query('SHOW server_version_num')).rows[0].server_version_num)/10000),17);
  const actual=(await pool.query('SELECT host(inet_server_addr()) AS host,current_database() AS database')).rows[0];assert.ok(['127.0.0.1','::1'].includes(actual.host));assert.equal(actual.database,name);
 }
 const [source,target]=pools;
 await source.query(`CREATE SCHEMA synthetic_legacy; REVOKE ALL ON SCHEMA synthetic_legacy FROM PUBLIC;
 CREATE TYPE synthetic_legacy.kind AS ENUM ('synthetic');
 CREATE TABLE synthetic_legacy.items(id bigserial PRIMARY KEY, label text NOT NULL UNIQUE, kind synthetic_legacy.kind NOT NULL, CHECK(length(label)>0));
 CREATE TABLE synthetic_legacy.journal(id integer PRIMARY KEY, migration text NOT NULL);
 INSERT INTO synthetic_legacy.items(label,kind) VALUES ('fixture-a','synthetic'),('fixture-b','synthetic');
 SELECT setval('synthetic_legacy.items_id_seq',41,false);
 INSERT INTO synthetic_legacy.journal VALUES(1,'synthetic-fixture-v1');
 CREATE VIEW synthetic_legacy.labels AS SELECT id,label FROM synthetic_legacy.items;
 CREATE FUNCTION synthetic_legacy.noop() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RETURN NEW; END $$;
 CREATE TRIGGER fixture_trigger BEFORE INSERT ON synthetic_legacy.items FOR EACH ROW EXECUTE FUNCTION synthetic_legacy.noop();
 ALTER TABLE synthetic_legacy.items ENABLE ROW LEVEL SECURITY;
 CREATE POLICY fixture_select ON synthetic_legacy.items FOR SELECT TO "${role}" USING (id > 0);
 GRANT USAGE ON SCHEMA synthetic_legacy TO "${role}";
 GRANT SELECT ON synthetic_legacy.items TO "${role}";
 ALTER DEFAULT PRIVILEGES IN SCHEMA synthetic_legacy GRANT SELECT ON TABLES TO "${role}";`);
 // This generated fixture has no other writers, secrets, storage or external dependencies.
 const connections=(await source.query('SELECT count(*)::int AS n FROM pg_stat_activity WHERE datname=current_database()')).rows[0].n;assert.equal(connections,1);
 const before=await inventory(source,source.options.connectionString);
 snapshot=await source.connect();await snapshot.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
 const snapshotID=(await snapshot.query('SELECT pg_export_snapshot() AS id')).rows[0].id;
 const plain=dump(source.options.connectionString,['--format=custom',`--snapshot=${snapshotID}`]);
 await snapshot.query('COMMIT');snapshot.release();snapshot=null;
 assert.deepEqual(await inventory(source,source.options.connectionString),before,'source catalog/roles/sequence drift during capture');
 // Public fixed TEST key only; not suitable for real data. No credential is generated.
 const key=createHash('sha256').update('PUBLIC SYNTHETIC TEST KEY - NEVER FOR REAL DATA').digest(), iv=randomBytes(12);
 const cipher=createCipheriv('aes-256-gcm',key,iv), ciphertext=Buffer.concat([cipher.update(plain),cipher.final()]),tag=cipher.getAuthTag();
 const encrypted=Buffer.concat([iv,tag,ciphertext]);const path=join(temp,'synthetic.enc');writeFileSync(path,encrypted,{mode:0o600});
 assert.equal(hash(readFileSync(path)),hash(encrypted),'ciphertext readback');
 const decrypt=b=>{const d=createDecipheriv('aes-256-gcm',key,b.subarray(0,12));d.setAuthTag(b.subarray(12,28));return Buffer.concat([d.update(b.subarray(28)),d.final()]);};
 const tampered=Buffer.from(encrypted);tampered[tampered.length-1]^=1;assert.throws(()=>decrypt(tampered),'corruption must reject');
 const decoded=decrypt(readFileSync(path));assert.equal(hash(decoded),hash(plain));
 run('pg_restore',['--exit-on-error','--single-transaction','--dbname',target.options.connectionString],{env:toolsEnv,input:decoded,timeout:3000,maxBuffer:4*1024*1024});
 assert.deepEqual(await inventory(target,target.options.connectionString),before,'restored data/schema/ACL/RLS/sequence/journal/role mapping differ');
 // Role mapping is identity in this isolated same-cluster fixture, not provider role restoration proof.
 const mutations=[
  ['RLS','ALTER TABLE synthetic_legacy.items DISABLE ROW LEVEL SECURITY','ALTER TABLE synthetic_legacy.items ENABLE ROW LEVEL SECURITY'],
  ['ACL',`REVOKE SELECT ON synthetic_legacy.items FROM "${role}"`,`GRANT SELECT ON synthetic_legacy.items TO "${role}"`],
  ['sequence',"SELECT setval('synthetic_legacy.items_id_seq',42,true)","SELECT setval('synthetic_legacy.items_id_seq',41,false)"],
  ['rows',"UPDATE synthetic_legacy.items SET label='corrupt' WHERE id=1","UPDATE synthetic_legacy.items SET label='fixture-a' WHERE id=1"],
  ['journal',"UPDATE synthetic_legacy.journal SET migration='corrupt'","UPDATE synthetic_legacy.journal SET migration='synthetic-fixture-v1'"],
 ];
 for(const [label,change,repair]of mutations){await target.query(change);assert.notDeepEqual(await inventory(target,target.options.connectionString),before,`${label} corruption must differ`);await target.query(repair);assert.deepEqual(await inventory(target,target.options.connectionString),before,`${label} repair must restore equivalence`);}
 // Failed additive transaction must leave neither row nor namespace behind.
 const client=await target.connect();await client.query('BEGIN');
 try {await client.query("INSERT INTO synthetic_legacy.journal VALUES (2,'must rollback'); CREATE SCHEMA failed_synthetic_install");await assert.rejects(client.query('SELECT 1/0'));}
 finally {await client.query('ROLLBACK');client.release();}
 assert.deepEqual(await inventory(target,target.options.connectionString),before,'failed transaction must roll back legacy write');
 assert.equal((await target.query("SELECT to_regnamespace('failed_synthetic_install') IS NULL AS absent")).rows[0].absent,true);
 await applyIsolatedSchemaMigrations(target);
 assert.deepEqual(await inventory(target,target.options.connectionString),before,'candidate changed synthetic legacy preservation');
 console.log(JSON.stringify({scope:'LOCAL_SYNTHETIC_ONLY',actualCaptureEncryptDecryptRestore:true,pgMajor:17,legacyPreservedAfterExactIsolatedLineage:true,ciphertextCorruptionRejected:true,catalogDataCorruptionDenials:5,failedTransactionRolledBack:true,roleMapping:'SAME_CLUSTER_IDENTITY_NOLOGIN_FIXTURE',liveRecoveryEvidence:false,encryptedArtifactSha256:hash(encrypted)},null,2));
} finally {
 if(snapshot){await snapshot.query('ROLLBACK').catch(()=>{});snapshot.release();}
 for(const pool of pools)await pool.end();
 for(const name of created.reverse())await dropReplayDatabase(admin,name);
 if(roleCreated)await admin.query(`DROP ROLE "${role}"`);
 await admin.end();rmSync(temp,{recursive:true,force:true});
}
