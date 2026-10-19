import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {buildSuccessorLocal,bundleInventory} from '../packaging/build-successor-local.mjs';
// Outer source-check runner bounds this complete operation to 25 seconds.
// All generated output stays outside the checkout; only our new temp tree is removed.
const scratch=mkdtempSync(join(tmpdir(),'teach-successor-package-proof-'));
try {
 const a=join(scratch,'a'),b=join(scratch,'b');
 const first=buildSuccessorLocal(process.cwd(),a),second=buildSuccessorLocal(process.cwd(),b);
 assert.deepEqual(first,second,'reproducible manifests');
 assert.deepEqual(bundleInventory(a),bundleInventory(b),'reproducible bytes');
 assert.equal(first.execution,'DISABLED');assert.equal(first.deploymentAuthorized,false);
 execFileSync(process.execPath,['--import','tsx','scripts/tests/successor-packaged-runtime.mjs',a],{timeout:10000,stdio:'inherit'});
 console.log(JSON.stringify({status:'PASS',scope:'disabled local reproducible bundle only',files:Object.keys(first.files).length,packages:Object.keys(first.packages).length,sourceCommit:first.sourceCommit,sourceTree:first.sourceTree}));
} finally {rmSync(scratch,{recursive:true,force:true});}
