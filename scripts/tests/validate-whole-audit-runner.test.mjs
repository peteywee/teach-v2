import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,existsSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {EventEmitter} from 'node:events';
import {PassThrough} from 'node:stream';
import {runBounded} from '../verification/development-self-audit.mjs';
import {discoverAuthorityValidators,runAuthorityValidators} from '../architecture/validate-whole-repository.mjs';

test('discovery retains all standalone slots and exact exclusions, in stable order',()=>{
 const root=mkdtempSync(join(tmpdir(),'teach-audit-discovery-'));
 try{
  for(const [dir,files] of Object.entries({architecture:['validate-repository-integration.mjs','validate-whole-repository.mjs','audit-a.mjs'],kernel:['validate-z.mjs','helper.mjs'],tests:['validate-ignore.mjs'],packaging:['validate-ignore.mjs'],release:['validate-ignore.mjs']})){
   mkdirSync(join(root,'scripts',dir),{recursive:true});for(const file of files)writeFileSync(join(root,'scripts',dir,file),'');
  }
  assert.deepEqual(discoverAuthorityValidators(root),['scripts/architecture/audit-a.mjs','scripts/architecture/validate-repository-integration.mjs','scripts/kernel/validate-z.mjs']);
 }finally{rmSync(root,{recursive:true,force:true});}
});
test('runner executes every slot once with at most three children and returns inventory order',async()=>{
 const paths=['slow','fast','fails','last'],started=[];let active=0,max=0;
 const spawnImpl=(command,args,options)=>{
  assert.equal(command,process.execPath);assert.equal(options.shell,false);assert.equal(options.detached,false);assert.deepEqual(options.stdio,['ignore','pipe','pipe']);assert.equal(args.length,1);
  const path=args[0];started.push(path);active++;max=Math.max(max,active);
  const child=new EventEmitter();child.stdout=new PassThrough();child.stderr=new PassThrough();child.kill=()=>{};
  setTimeout(()=>{child.stdout.end(path);active--;child.emit('close',path==='fails'?1:0,null);},path==='slow'?35:5);return child;
 };
 const results=await runAuthorityValidators('/tmp',paths,{spawnImpl});
 assert.equal(max,3);assert.deepEqual(started,paths);assert.deepEqual(results.map(x=>x.path),paths);assert.deepEqual(results.map(x=>x.status),[0,0,1,0]);assert.ok(results.every(x=>x.stdout===x.path));
});
test('launch errors do not skip subsequent slots or fabricate success',async()=>{
 let n=0;const spawnImpl=()=>{n++;throw new Error('fixture launch failure');};
 const results=await runAuthorityValidators('/tmp',['a','b','c'],{spawnImpl});assert.equal(n,3);assert.ok(results.every(x=>x.status===null&&/launch failed/.test(x.error)));
});
test('actual children report success, failure, signal and bounded timeout without shell execution',async()=>{
 const root=mkdtempSync(join(tmpdir(),'teach-audit-process-'));
 try{
  for(const [name,source] of Object.entries({ok:"process.stdout.write('pass');",bad:"process.stderr.write('deny');process.exitCode=4;",signal:"process.kill(process.pid,'SIGTERM');",hang:'setInterval(()=>{},1000);'}))writeFileSync(join(root,name+'.mjs'),source);
  const result=await runAuthorityValidators(root,['ok.mjs','bad.mjs','signal.mjs']);assert.equal(result[0].status,0);assert.equal(result[0].stdout,'pass');assert.equal(result[1].status,4);assert.equal(result[1].stderr,'deny');assert.equal(result[2].signal,'SIGTERM');
  const [timed]=await runAuthorityValidators(root,['hang.mjs'],{timeoutMs:100});assert.match(timed.error,/timed out after 100ms/);assert.equal(timed.signal,'SIGKILL');
 }finally{rmSync(root,{recursive:true,force:true});}
});
test('output overflow is bounded and cannot be reported as a passing validator',async()=>{
 const root=mkdtempSync(join(tmpdir(),'teach-audit-output-'));
 try{writeFileSync(join(root,'large.mjs'),"process.stdout.write('x'.repeat(2*1024*1024));setInterval(()=>{},1000);");const [r]=await runAuthorityValidators(root,['large.mjs']);assert.match(r.error,/exceeds 1MiB/);assert.ok(Buffer.byteLength(r.stdout)+Buffer.byteLength(r.stderr)<=1024*1024);}
 finally{rmSync(root,{recursive:true,force:true});}
});
test('the per-child bound cannot be disabled or raised beyond five seconds',async()=>{
 for(const timeoutMs of [0,-1,5001,Infinity,NaN,'5000'])await assert.rejects(runAuthorityValidators('/tmp',[],{timeoutMs}),RangeError);
 assert.deepEqual(await runAuthorityValidators('/tmp',[]),[]);
});
test('outer audit timeout terminates the inherited validator process group',{skip:process.platform!=='linux'},async()=>{
 const root=mkdtempSync(join(tmpdir(),'teach-audit-outer-timeout-'));
 try{
  const childInfo=join(root,'child.json'),parentInfo=join(root,'parent.txt');
  writeFileSync(join(root,'hang.mjs'),`import{writeFileSync,readFileSync}from'node:fs';const stat=readFileSync('/proc/self/stat','utf8');writeFileSync(${JSON.stringify(childInfo)},JSON.stringify({pid:process.pid,group:Number(stat.slice(stat.lastIndexOf(')')+2).split(' ')[2])}));setInterval(()=>{},1000);`);
  const runner=new URL('../architecture/validate-whole-repository.mjs',import.meta.url).href;
  writeFileSync(join(root,'parent.mjs'),`import{writeFileSync}from'node:fs';import{runAuthorityValidators}from ${JSON.stringify(runner)};writeFileSync(${JSON.stringify(parentInfo)},String(process.pid));await runAuthorityValidators(${JSON.stringify(root)},['hang.mjs']);`);
  const result=runBounded(process.execPath,['parent.mjs'],{root,timeoutMs:800});assert.equal(result.timed_out,true);assert.equal(result.execution_error,'ETIMEDOUT');
  assert.ok(existsSync(childInfo),'validator started before the bounded timeout');const child=JSON.parse(readFileSync(childInfo,'utf8'));assert.equal(child.group,Number(readFileSync(parentInfo,'utf8')),'child inherits the isolated outer audit process group');
  // SIGKILL delivery is asynchronous; observe it for a fixed bound, never send
  // another signal that could conceal a failed outer process-group cleanup.
  const statPath='/proc/'+child.pid+'/stat',deadline=performance.now()+500;let terminated=false;
  do{
   try{const stat=readFileSync(statPath,'utf8'),state=stat.slice(stat.lastIndexOf(')')+2).split(' ')[0];terminated=['Z','X'].includes(state);}
   catch(error){if(error.code!=='ENOENT')throw error;terminated=true;}
   if(terminated)break;await new Promise(resolve=>setTimeout(resolve,10));
  }while(performance.now()<deadline);
  assert.ok(terminated,'terminated child must not still be running after bounded signal observation');
 }finally{rmSync(root,{recursive:true,force:true});}
});
