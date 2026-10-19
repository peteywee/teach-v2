import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';
import test from 'node:test';
import { parseDatabaseSchema, databaseObject, databaseFunction } from '../../src/platform/database-target.js';

test('schema target is finite, defaults to existing public mode, and rejects injection', () => {
 assert.equal(parseDatabaseSchema(undefined), 'public');
 assert.equal(parseDatabaseSchema('public'), 'public');
 assert.equal(parseDatabaseSchema('teach_v2_demo'), 'teach_v2_demo');
 for (const value of ['', 'PUBLIC', 'legacy', 'teach_v2_demo; DROP SCHEMA public']) assert.throws(() => parseDatabaseSchema(value));
 assert.throws(() => databaseObject('public.table'));
 assert.throws(() => databaseObject('x";select 1'));
 assert.throws(() => databaseFunction('unregistered')); 
});
for (const target of ['public', 'teach_v2_demo']) test(`all Drizzle models and foreign-key targets use ${target}`, () => {
 const result=execFileSync(process.execPath,['--import','tsx','--input-type=module','-e',`
 import { is, Table } from 'drizzle-orm';
 import { getTableConfig } from 'drizzle-orm/pg-core';
 import * as schema from './src/bootstrap/demo/demo-persistence-schema.ts';
 import { databaseObject, databaseFunction } from './src/platform/database-target.ts';
 const tables=Object.values(schema).filter(x=>is(x,Table));
 console.log(JSON.stringify({object:databaseObject('audit_events'),clock:databaseFunction('clock_timestamp'),tables:tables.map(t=>{const c=getTableConfig(t);return {name:c.name,schema:c.schema??'public',foreign:c.foreignKeys.map(k=>getTableConfig(k.reference().foreignTable).schema??'public')};})}));
 `], {env:{...process.env,TEACH_DB_SCHEMA:target},encoding:'utf8'});
 const value=JSON.parse(result);assert.ok(value.tables.length>=20);
 assert.equal(value.object,target==='public'?'audit_events':`"${target}"."audit_events"`);
 assert.equal(value.clock,target==='public'?'clock_timestamp':'"pg_catalog"."clock_timestamp"');
 for(const table of value.tables){assert.equal(table.schema,target,table.name);for(const foreign of table.foreign)assert.equal(foreign,target,table.name);}
});

test('raw owner SQL has source-level explicit qualification, without runtime rewrite or search_path', () => {
 const sql=readdirSync('drizzle').filter(p=>p.endsWith('.sql')).map(p=>readFileSync('drizzle/'+p,'utf8')).join('\n');
 const objects=[...new Set([...sql.matchAll(/CREATE(?: OR REPLACE)? (?:TABLE|FUNCTION)\s+(?:"public"\.)?"?([a-z][a-z0-9_]+)/gi)].map(m=>m[1]!))];
 for(const owner of readdirSync('src/modules')){
  const dir=`src/modules/${owner}/infrastructure/persistence`;
  let files:string[];try{files=readdirSync(dir);}catch{continue;}
  for(const file of files.filter(p=>/^postgres-demo-.*\.ts$/.test(p))){
   const source=readFileSync(`${dir}/${file}`,'utf8');
   for(const name of objects){const stripped=source.replaceAll(`databaseObject("${name}")`,'QUALIFIED');assert.doesNotMatch(stripped,new RegExp(`\\b${name}\\b`),`${file}: ${name}`);}
   assert.doesNotMatch(source,/search_path/i);
   for(const fn of ['clock_timestamp','pg_advisory_xact_lock','hashtext','hashtextextended','count','max','ceil','json_build_object']) assert.doesNotMatch(source,new RegExp('(?<![a-zA-Z_.])'+fn+'\\('),`${file}: unqualified builtin ${fn}`);
  }
 }
});
