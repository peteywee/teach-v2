import { assertIsolatedDatabaseTarget } from '../../../scripts/db/isolated-database-target.mjs';
import assert from 'node:assert/strict';
import { before, beforeEach, after, test } from 'node:test';
import { drizzle } from 'drizzle-orm/node-postgres';
import { sql } from 'drizzle-orm';
import pg from 'pg';
import { deactivateIdentity, reactivateIdentity } from '../../../src/modules/identity/application/identity-lifecycle-service.js';
import { PostgresIdentityCommandTransaction, type IdentityTransactionBindings } from '../../../src/modules/identity/infrastructure/persistence/postgres-identity-command-transaction.js';
import { IdentityCommandDependenciesUnavailableError } from '../../../src/modules/identity/application/ports/identity-command-transaction.js';
import { PostgresIdentityRepository } from '../../../src/modules/identity/infrastructure/persistence/postgres-identity-repository.js';
import { PostgresApplicationSessionRepository } from '../../../src/modules/identity/infrastructure/persistence/postgres-application-session-repository.js';
import { issueApplicationSession } from '../../../src/modules/identity/application/session-service.js';
import * as schema from '../../../src/modules/identity/infrastructure/persistence/schema.js';

const connectionString=assertIsolatedDatabaseTarget(process.env.DATABASE_URL);
const pool=new pg.Pool({connectionString,statement_timeout:5000});
const db=drizzle(pool,{schema});const identities=new PostgresIdentityRepository(db),sessions=new PostgresApplicationSessionRepository(db);
const now=new Date('2026-10-05T02:00:00Z');
const request=()=>({actorReference:'fixture-actor',actorClass:'HumanActor' as const,targetIdentityId:'identity-1',requestId:'request-1',now:new Date(now)});
// Disposable probe storage, not admitted AuditEvent storage or a real C14 adapter.
before(async()=>{await pool.query('create schema test_atomic_probe');await pool.query('create table test_atomic_probe.audit(request_id text, action text, target text, transaction_id bigint, backend_pid int)');});
beforeEach(async()=>{await pool.query('truncate identity_identities cascade');await pool.query('truncate test_atomic_probe.audit');await identities.create({id:'identity-1',now});await identities.create({id:'identity-2',now});for(const id of ['one','two'])await issueApplicationSession(sessions,{id,identityId:'identity-1',now});await issueApplicationSession(sessions,{id:'other',identityId:'identity-2',now});});
after(async()=>{await pool.query('drop schema if exists test_atomic_probe cascade');await pool.end();});
function bindings(options:{deny?:boolean;auditFailure?:boolean;afterAuditFailure?:boolean}={}):IdentityTransactionBindings {
  return {
    authorization:tx=>({async requireAuthorization(input){
      if(options.deny)throw new Error('fixture authority denied');
      await tx.execute(sql`select id from identity_identities where id=${input.targetIdentityId} for update`);
    }}),
    audit:tx=>({async appendRequired(facts){
      if(options.auditFailure)throw new Error('fixture audit unavailable');
      const row=await tx.execute(sql`select status from identity_identities where id=${facts.targetIdentityId}`);
      assert.equal(row.rows[0]?.status,facts.action==='DeactivateIdentity'?'INACTIVE':'ACTIVE');
      await tx.execute(sql`insert into test_atomic_probe.audit values (${facts.requestId},${facts.action},${facts.targetIdentityId},txid_current(),pg_backend_pid())`);
      if(options.afterAuditFailure)throw new Error('fixture failure after append');
    }}),
  };
}
async function state(){return {identity:(await identities.getById('identity-1'))?.status,sessions:(await pool.query("select id,status from identity_application_sessions order by id")).rows,audits:(await pool.query('select * from test_atomic_probe.audit')).rows};}
test('absent backend bindings fail closed without changing Identity or sessions',async()=>{await assert.rejects(deactivateIdentity(new PostgresIdentityCommandTransaction(db),request()),IdentityCommandDependenciesUnavailableError);const s=await state();assert.equal(s.identity,'ACTIVE');assert.equal(s.sessions.every(x=>x.status==='ACTIVE'),true);assert.equal(s.audits.length,0);});
test('denied transaction-bound authority performs zero writes',async()=>{await assert.rejects(deactivateIdentity(new PostgresIdentityCommandTransaction(db,bindings({deny:true})),request()),/fixture authority denied/);const s=await state();assert.equal(s.identity,'ACTIVE');assert.equal(s.sessions.every(x=>x.status==='ACTIVE'),true);assert.equal(s.audits.length,0);});
test('deactivation revokes only owned sessions and commits its probe audit atomically',async()=>{const result=await deactivateIdentity(new PostgresIdentityCommandTransaction(db,bindings()),request());assert.equal(result.status,'INACTIVE');const s=await state();assert.deepEqual(s.sessions,[{id:'one',status:'REVOKED'},{id:'other',status:'ACTIVE'},{id:'two',status:'REVOKED'}]);assert.equal(s.audits.length,1);assert.equal(s.audits[0].action,'DeactivateIdentity');});
for(const option of ['auditFailure','afterAuditFailure'] as const){test(`${option} rolls back Identity, both sessions and probe append`,async()=>{await assert.rejects(deactivateIdentity(new PostgresIdentityCommandTransaction(db,bindings({[option]:true})),request()),/fixture/);const s=await state();assert.equal(s.identity,'ACTIVE');assert.equal(s.sessions.every(x=>x.status==='ACTIVE'),true);assert.equal(s.audits.length,0);});}
test('reactivation commits audit and cannot revive previously revoked sessions',async()=>{const tx=new PostgresIdentityCommandTransaction(db,bindings());await deactivateIdentity(tx,request());await reactivateIdentity(tx,{...request(),requestId:'reactivate'});const s=await state();assert.equal(s.identity,'ACTIVE');assert.equal(s.sessions.filter(x=>x.id!=='other').every(x=>x.status==='REVOKED'),true);assert.equal(s.audits.length,2);});
test('reactivation audit failure leaves Identity inactive and sessions revoked',async()=>{await identities.deactivate({id:'identity-1',now});await assert.rejects(reactivateIdentity(new PostgresIdentityCommandTransaction(db,bindings({auditFailure:true})),request()),/fixture audit/);const s=await state();assert.equal(s.identity,'INACTIVE');assert.equal(s.sessions.filter(x=>x.id!=='other').every(x=>x.status==='REVOKED'),true);assert.equal(s.audits.length,0);});
test('authorization, owner work and probe append use one PostgreSQL transaction and connection',async()=>{
  const observed:Array<{transaction_id:unknown;backend_pid:unknown}>=[];const b=bindings();
  const tx=new PostgresIdentityCommandTransaction(db,{authorization:connection=>({async requireAuthorization(input){const row=await connection.execute(sql`select txid_current() as transaction_id,pg_backend_pid() as backend_pid`);observed.push({transaction_id:row.rows[0]?.transaction_id,backend_pid:row.rows[0]?.backend_pid});await b.authorization(connection).requireAuthorization(input);}}),audit:b.audit});
  await deactivateIdentity(tx,request());const s=await state();assert.equal(String(s.audits[0].transaction_id),String(observed[0]!.transaction_id));assert.equal(s.audits[0].backend_pid,observed[0]!.backend_pid);
});
