import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,readFileSync,readdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {buildNetlifyCanary} from '../packaging/build-netlify-canary.mjs';
const root=resolve(new URL('../..',import.meta.url).pathname),scratch=mkdtempSync(join(tmpdir(),'teach-canary-test-'));
try{
 const output=join(scratch,'canary'),manifest=buildNetlifyCanary(root,output);
 assert.deepEqual(readdirSync(join(output,'public')),[]);assert.ok(manifest.files['private/runtime/node_modules/pg/package.json']);
 const runner=`import assert from 'node:assert/strict';import net from 'node:net';let effects=0;net.Socket.prototype.connect=function(){effects++;throw Error('network forbidden');};net.Server.prototype.listen=function(){effects++;throw Error('listener forbidden');};globalThis.fetch=async()=>{effects++;throw Error('fetch forbidden');};globalThis.setInterval=()=>{effects++;throw Error('timer forbidden');};const logs=[];console.log=x=>logs.push(JSON.parse(x));const m=await import(${JSON.stringify(pathToFileURL(join(output,'functions/demo.mjs')).href)});const started=Date.now();const stalled=await m.default(new Request('https://canary.invalid/__teach_canary_probe__/body',{method:'POST',body:new ReadableStream({}),duplex:'half'}));assert.equal(stalled.status,503);assert.ok(Date.now()-started<2000);assert.equal(logs[1].bodyReadFailed,true);let previous;for(let i=0;i<20;i++){const r=await m.default(new Request('https://canary.invalid/__teach_canary_probe__/headers',{headers:{host:'canary.invalid',cookie:'never-log-private-cookie',origin:'https://never-log-private-origin.invalid'}}));assert.equal(r.status,503);const body=await r.text();if(previous)assert.equal(body,previous);previous=body;assert.equal(r.headers.get('cache-control'),'no-store');assert.equal(r.headers.getSetCookie().length,0);}assert.equal(logs.length,17);assert.equal(logs[0].marker,'TEACH_CANARY_COLD_V1');assert.equal(logs[0].privateClosureVerified,true);assert.equal(logs[0].exactPatchMatch,true);assert.equal(logs[0].importsResolved,true);assert.ok(logs[0].fileCount>2800);assert.ok(!JSON.stringify(logs).includes('never-log'));assert.equal(effects,0);process.stdout.write('CANARY_LOCAL_PASS');`;
 assert.match(execFileSync(process.execPath,['--input-type=module','-e',runner],{cwd:tmpdir(),env:{PATH:process.env.PATH},timeout:15000}).toString(),/CANARY_LOCAL_PASS/);
 console.log(JSON.stringify({status:'CANARY_LOCAL_PASS',sourceCommit:manifest.sourceCommit,sourceTree:manifest.sourceTree,fileCount:Object.keys(manifest.files).length,evidenceSha256:manifest.evidenceSha256}));
}finally{rmSync(scratch,{recursive:true,force:true});}
