import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {randomBytes} from 'node:crypto';
import {mkdtempSync,readFileSync,readdirSync,rmSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {resolve,join,dirname} from 'node:path';
import {pathToFileURL,fileURLToPath} from 'node:url';
import pg from 'pg';
import {assertIsolatedDatabaseTarget} from './isolated-database-target.mjs';
import {applyIsolatedSchemaMigrations} from './migrate-isolated-schema.mjs';
import {dropReplayDatabase} from './replay-database-cleanup.mjs';

// Compare PostgreSQL's own canonical representations in two fresh databases.
// Constraint/index names are significant; physical column order is not modeled.
export async function modelCatalog(pool) {
 const queries = {
  tables: `SELECT c.relname,c.relkind,c.relpersistence FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='teach_v2_demo' AND c.relkind IN ('r','p') AND c.relname <> '__drizzle_migrations' ORDER BY 1`,
  columns: `SELECT c.relname,a.attname,format_type(a.atttypid,a.atttypmod) AS type,a.attnotnull,a.attidentity,a.attgenerated,pg_get_expr(d.adbin,d.adrelid) AS default_value,cn.nspname AS collation_schema,co.collname,co.collprovider,co.collisdeterministic,co.collencoding,co.collcollate,co.collctype,co.collversion,to_jsonb(co)->>'colllocale' AS locale,to_jsonb(co)->>'collicurules' AS icu_rules FROM pg_attribute a JOIN pg_class c ON c.oid=a.attrelid JOIN pg_namespace n ON n.oid=c.relnamespace LEFT JOIN pg_attrdef d ON d.adrelid=c.oid AND d.adnum=a.attnum LEFT JOIN pg_collation co ON co.oid=a.attcollation LEFT JOIN pg_namespace cn ON cn.oid=co.collnamespace WHERE n.nspname='teach_v2_demo' AND c.relkind IN ('r','p') AND c.relname <> '__drizzle_migrations' AND a.attnum>0 AND NOT a.attisdropped ORDER BY 1,2`,
  constraints: `SELECT c.relname,k.conname,k.contype,k.condeferrable,k.condeferred,k.convalidated,pg_get_constraintdef(k.oid) AS definition FROM pg_constraint k JOIN pg_class c ON c.oid=k.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='teach_v2_demo' AND c.relname <> '__drizzle_migrations' ORDER BY 1,2`,
  indexes: `SELECT c.relname,i.relname AS name,x.indisunique,x.indisprimary,x.indisvalid,x.indisready,pg_get_indexdef(i.oid) AS definition FROM pg_index x JOIN pg_class c ON c.oid=x.indrelid JOIN pg_class i ON i.oid=x.indexrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='teach_v2_demo' AND c.relname <> '__drizzle_migrations' ORDER BY 1,2`,
 };
 const result={};
 for(const [key,sql] of Object.entries(queries)) result[key]=(await pool.query(sql)).rows;
 return result;
}
// Explicit independently inspectable boundary: these six objects are handwritten
// SQL, absent from Drizzle's model. Their canonical definitions are checked, not
// ignored. Functions/triggers, grants, RLS and runtime semantics are separate gates.
const customConstraints = [
 ['audit_events','audit_prefix_check','CHECK (teach_v2_demo.demo_valid_network_prefix(ip_prefix, 48))'],
 ['organization_demo_runs','demo_prefix_check',"CHECK (((admission_prefix = 'SHARED_UNKNOWN'::text) OR teach_v2_demo.demo_valid_network_prefix(admission_prefix, 56)))"],
].map(([relname,conname,definition])=>({relname,conname,contype:'c',condeferrable:false,condeferred:false,convalidated:true,definition}));
const customIndexes = [
 ['audit_events','audit_denial_dedup_uq',true,"CREATE UNIQUE INDEX audit_denial_dedup_uq ON teach_v2_demo.audit_events USING btree (teach_v2_demo.demo_audit_denial_subject(actor_class, actor_reference, ip_prefix), denial_class, action, dedup_bucket_start) NULLS NOT DISTINCT WHERE (result = 'DENIED'::text)"],
 ['audit_events','audit_denial_hour_lookup',false,"CREATE INDEX audit_denial_hour_lookup ON teach_v2_demo.audit_events USING btree (teach_v2_demo.demo_audit_denial_subject(actor_class, actor_reference, ip_prefix), occurred_at) WHERE (result = 'DENIED'::text)"],
 ['audit_events','audit_denial_overflow_uq',true,"CREATE UNIQUE INDEX audit_denial_overflow_uq ON teach_v2_demo.audit_events USING btree (teach_v2_demo.demo_audit_denial_subject(actor_class, actor_reference, ip_prefix), overflow_bucket_start) NULLS NOT DISTINCT WHERE (result = 'OVERFLOW'::text)"],
 ['learning_progress_events','progress_session_block_uq',true,"CREATE UNIQUE INDEX progress_session_block_uq ON teach_v2_demo.learning_progress_events USING btree (learning_session_id, ((evaluation ->> 'blockId'::text)))"],
].map(([relname,name,indisunique,definition])=>({relname,name,indisunique,indisprimary:false,indisvalid:true,indisready:true,definition}));
export function compareCatalogs(expected,actual) {
 const modeled=structuredClone(actual);
 for(const [key,extras,nameKey] of [['constraints',customConstraints,'conname'],['indexes',customIndexes,'name']]) {
  for(const extra of extras) {
   const matches=modeled[key].filter(row=>row.relname===extra.relname && row[nameKey]===extra[nameKey]);
   assert.deepEqual(matches,[extra],`custom SQL catalog mismatch: ${extra[nameKey]}`);
   modeled[key]=modeled[key].filter(row=>row!==matches[0]);
  }
 }
 assert.deepEqual(modeled,expected,'isolated model/catalog semantic mismatch');
}

export async function verifyIsolatedModelEquivalence() {
 assert.equal(process.versions.node.split('.')[0],'24','Node 24 required for the prepared artifact');
 const connectionString=assertIsolatedDatabaseTarget(process.env.DATABASE_URL);
 assert.equal(process.env.TEACH_DB_SCHEMA,'teach_v2_demo');
 const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
 for(const [name,version] of [['drizzle-kit','0.31.11'],['drizzle-orm','0.45.3']]) assert.equal(JSON.parse(readFileSync(join(root,'node_modules',name,'package.json'),'utf8')).version,version);
 const temp=mkdtempSync(join(tmpdir(),'teach-model-equivalence-'));
 const suffix=`${process.pid}_${randomBytes(4).toString('hex')}`;
 const names=['model','migrated'].map(kind=>`teach_v2_${kind}_${suffix}`);
 const adminUrl=new URL(connectionString);adminUrl.pathname='/postgres';
 const admin=new pg.Pool({connectionString:adminUrl.toString(),max:1});
 const pools=[],created=[];
 try {
  const config=join(temp,'drizzle.config.ts'),out=join(temp,'generated');
  writeFileSync(config,`export default {schema:${JSON.stringify(join(root,'src/bootstrap/demo/demo-persistence-schema.ts'))},out:${JSON.stringify(out)},dialect:'postgresql',strict:true};\n`);
  execFileSync(process.execPath,[join(root,'node_modules/drizzle-kit/bin.cjs'),'generate','--name','model','--config',config],{cwd:root,env:{...process.env,TEACH_DB_SCHEMA:'teach_v2_demo'},timeout:25000,stdio:'pipe'});
  const sqlFiles=readdirSync(out).filter(file=>file.endsWith('.sql'));assert.equal(sqlFiles.length,1);
  for(const name of names) {
   await admin.query(`CREATE DATABASE "${name}" TEMPLATE template0`);created.push(name);
   const url=new URL(connectionString);url.pathname='/'+name;
   const pool=new pg.Pool({connectionString:url.toString(),max:1});pools.push(pool);
   assert.equal(Math.floor(Number((await pool.query('SHOW server_version_num')).rows[0].server_version_num)/10000),17,'PostgreSQL 17 required');
   await pool.query("SET search_path TO pg_catalog");
  }
  const [model,migrated]=pools;
  await model.query('CREATE SCHEMA "teach_v2_demo"');
  for(const sql of readFileSync(join(out,sqlFiles[0]),'utf8').split('--> statement-breakpoint')) if(sql.trim()) await model.query(sql);
  await applyIsolatedSchemaMigrations(migrated);
  const expected=await modelCatalog(model),actual=await modelCatalog(migrated);
  compareCatalogs(expected,actual);
  assert.equal(expected.tables.length,24,'full current authoring model required');
  for(const table of ['content_authoring_drafts','content_authoring_receipts'])assert.ok(expected.tables.some(row=>row.relname===table),'both authoring models must be generated');
  const mutations = [
   ['authoring draft field','ALTER TABLE teach_v2_demo.content_authoring_drafts DROP COLUMN catalog_digest CASCADE'],
   ['authoring receipt identity','ALTER TABLE teach_v2_demo.content_authoring_receipts DROP CONSTRAINT authoring_receipt_pk'],
   ['extra table','CREATE TABLE teach_v2_demo.unexpected_table (id text)'],
   ['table durability','ALTER TABLE teach_v2_demo.transaction_control_reconciliation_records SET UNLOGGED'],
   ['column type','ALTER TABLE teach_v2_demo.identity_identities ALTER COLUMN id TYPE varchar(200)'],
   ['default',"ALTER TABLE teach_v2_demo.transaction_control_reconciliation_records ALTER COLUMN status SET DEFAULT 'WRONG'"],
   ['nullability','ALTER TABLE teach_v2_demo.transaction_control_reconciliation_records ALTER COLUMN outcome DROP NOT NULL'],
   ['extra column','ALTER TABLE teach_v2_demo.identity_identities ADD COLUMN unexpected_column text'],
   ['collation identity',`CREATE COLLATION teach_v2_demo."default" FROM pg_catalog."C"; ALTER TABLE teach_v2_demo.transaction_control_reconciliation_records ALTER COLUMN outcome TYPE text COLLATE teach_v2_demo."default"`],
  ];
  const fk=actual.constraints.find(row=>row.contype==='f');assert.ok(fk);
  const check=actual.constraints.find(row=>row.contype==='c' && !customConstraints.some(extra=>extra.conname===row.conname));assert.ok(check);
  const index=expected.indexes.find(row=>!row.indisprimary && !actual.constraints.some(c=>c.conname===row.name));assert.ok(index);
  mutations.push(['foreign key',`ALTER TABLE teach_v2_demo."${fk.relname}" DROP CONSTRAINT "${fk.conname}"`],['check',`ALTER TABLE teach_v2_demo."${check.relname}" DROP CONSTRAINT "${check.conname}"`],['index',`DROP INDEX teach_v2_demo."${index.name}"`],['custom SQL index','DROP INDEX teach_v2_demo.audit_denial_hour_lookup']);
  for(const [label,sql] of mutations) {
   await migrated.query('BEGIN');
   try {await migrated.query(sql);const changed=await modelCatalog(migrated);assert.throws(()=>compareCatalogs(expected,changed),undefined,`mutation escaped: ${label}`);}
   finally {await migrated.query('ROLLBACK');}
   compareCatalogs(expected,await modelCatalog(migrated));
  }
  const functions=(await migrated.query("SELECT count(*)::int AS count FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='teach_v2_demo'")).rows[0].count;
  const triggers=(await migrated.query("SELECT count(*)::int AS count FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='teach_v2_demo' AND NOT t.tgisinternal")).rows[0].count;
  const report={tables:expected.tables.length,columns:expected.columns.length,constraints:expected.constraints.length,indexes:expected.indexes.length,customConstraints:2,customIndexes:4,negativeMutations:mutations.length,unmodeled:{functions,triggers},scope:'model structural equivalence only; custom function/trigger behavior and security excluded'};
  console.log(JSON.stringify({status:'PASS',...report}));
  return report;
 } finally {
  for(const pool of pools) await pool.end();
  for(const name of created.reverse()) await dropReplayDatabase(admin,name);
  await admin.end();rmSync(temp,{recursive:true,force:true});
 }
}
if(process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href) await verifyIsolatedModelEquivalence();
