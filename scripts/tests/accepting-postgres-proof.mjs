import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {buildSuccessorAccepting} from '../packaging/build-successor-accepting.mjs';
import {assertIsolatedDatabaseTarget} from '../db/isolated-database-target.mjs';
assertIsolatedDatabaseTarget(process.env.DATABASE_URL);
const scratch=mkdtempSync(join(tmpdir(),'teach-accepting-postgres-proof-'));
try {
 const output=join(scratch,'output');buildSuccessorAccepting(process.cwd(),output);
 execFileSync(process.execPath,['--import','tsx','scripts/db/run-accepting-local-proof.ts',join(output,'functions/demo.func')],{timeout:18000,stdio:'inherit'});
} finally {rmSync(scratch,{recursive:true,force:true});}
