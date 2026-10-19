import {databaseSchema} from '../../platform/database-target.js';
import {sql} from 'drizzle-orm';
import {drizzle} from 'drizzle-orm/node-postgres';
import type pg from 'pg';
import * as identitySchema from '../../modules/identity/infrastructure/persistence/schema.js';
import type {DemoTransactionRunner,DemoTransaction} from '../demo/demo-transaction.js';
import {PostgresDemoOrganization} from '../../modules/organization/infrastructure/persistence/postgres-demo-organization.js';
import {PostgresDemoIdentity} from '../../modules/identity/infrastructure/persistence/postgres-demo-identity.js';
import {PostgresDemoContent} from '../../modules/content/infrastructure/persistence/postgres-demo-content.js';
import {PostgresDemoLearning} from '../../modules/learning/infrastructure/persistence/postgres-demo-learning.js';
import {PostgresDemoAudit} from '../../modules/audit-lifecycle/infrastructure/persistence/postgres-demo-audit.js';
import {PostgresDemoReceipts} from '../../modules/transaction-control/infrastructure/persistence/postgres-demo-receipts.js';
/** Owner adapters share one real transaction. Nested canonical Identity commands
 * use Drizzle savepoints; only this outer boundary can commit their effects. */
export class SuccessorDemoTransaction implements DemoTransactionRunner {
 constructor(private readonly pool:pg.Pool){}
 async run<T>(work:(tx:DemoTransaction)=>Promise<T>):Promise<T>{
  if(databaseSchema!=='teach_v2_demo')throw Error('Successor requires isolated schema');
  const client=await this.pool.connect();let failed=false;
  try{return await drizzle(client,{schema:identitySchema}).transaction(async tx=>{
   // Transaction-local settings survive transaction pooling without leaking to the next borrower.
   // PostgreSQL 17 is mandatory: transaction_timeout is not emulated with Promise.race.
   await tx.execute(sql.raw("SET LOCAL statement_timeout = '5s'"));
   await tx.execute(sql.raw("SET LOCAL lock_timeout = '2s'"));
   await tx.execute(sql.raw("SET LOCAL idle_in_transaction_session_timeout = '5s'"));
   await tx.execute(sql.raw("SET LOCAL transaction_timeout = '10s'"));
   const query={query:async <R>(statement:string,values:readonly unknown[]=[]):Promise<R[]>=>{
    const parts=statement.split(/(\$[1-9][0-9]*)/g).map(part=>/^\$[1-9][0-9]*$/.test(part)?sql`${values[Number(part.slice(1))-1]}`:sql.raw(part));
    const result=await tx.execute(sql.join(parts,sql.raw('')));
    // Drizzle intentionally leaves raw execute timestamps as strings. Decode by
    // PostgreSQL type metadata, never by a user-controlled property-name guess.
    const dates=result.fields.filter(field=>field.dataTypeID===1184||field.dataTypeID===1114).map(field=>field.name);
    return result.rows.map(row=>{const decoded={...row};for(const name of dates){const value=decoded[name];if(value!==null&&value!==undefined){const date=new Date(String(value));if(!Number.isFinite(date.getTime()))throw Error('Invalid PostgreSQL timestamp');decoded[name]=date;}}return decoded as R;});
   }};
   return work({organization:new PostgresDemoOrganization(query),identity:new PostgresDemoIdentity(query,tx),content:new PostgresDemoContent(query),learning:new PostgresDemoLearning(query),audit:new PostgresDemoAudit(query),receipts:new PostgresDemoReceipts(query)});
  },{isolationLevel:'read committed'});
  }catch(error){failed=true;throw error;}finally{client.release(failed);}
 }
}
