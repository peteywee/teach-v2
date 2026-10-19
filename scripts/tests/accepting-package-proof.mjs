import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {buildSuccessorAccepting} from '../packaging/build-successor-accepting.mjs';
import {bundleInventory} from '../packaging/build-successor-local.mjs';
const scratch=mkdtempSync(join(tmpdir(),'teach-accepting-package-proof-'));
try {
 const a=join(scratch,'a'),b=join(scratch,'b');
 const first=buildSuccessorAccepting(process.cwd(),a),second=buildSuccessorAccepting(process.cwd(),b);
 assert.deepEqual(first,second);assert.deepEqual(bundleInventory(a),bundleInventory(b));
 assert.equal(first.deploymentAuthorized,false);
 execFileSync(process.execPath,['--import','tsx','scripts/tests/accepting-packaged-runtime.mjs',join(a,'functions/demo.func')],{timeout:10000,stdio:'inherit'});
 const env={...process.env};for(const key of Object.keys(env))if(key.startsWith('TEACH_'))delete env[key];
 execFileSync(process.execPath,['scripts/tests/accepting-entrypoint-proof.mjs',join(a,'functions/demo.func')],{timeout:10000,stdio:'inherit',env});
 assert.deepEqual(bundleInventory(a),bundleInventory(b),'entrypoint probes restore artifact bytes');
 console.log(JSON.stringify({status:'PASS',scope:'opt-in artifact local proof only',files:Object.keys(first.files).length}));
} finally {rmSync(scratch,{recursive:true,force:true});}
