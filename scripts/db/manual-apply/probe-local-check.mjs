import pg from 'pg';
import {readFileSync} from 'node:fs';
import {assertIsolatedDatabaseTarget} from '../isolated-database-target.mjs';
// Disposable local syntax/transaction proof only. Does not access provider metadata.
export async function verifyManualProbesLocally(){
 const pool=new pg.Pool({connectionString:assertIsolatedDatabaseTarget(process.env.DATABASE_URL),max:1,connectionTimeoutMillis:3000,query_timeout:6000});
 try {for(const file of ['catalog-preservation.sql','collision-probes.sql'])await pool.query(readFileSync(new URL(file,import.meta.url),'utf8'));console.log('PASS: both fixed preservation probes execute on disposable local PostgreSQL');}
 finally {await pool.end();}
}
