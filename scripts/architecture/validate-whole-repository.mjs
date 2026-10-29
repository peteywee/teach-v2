#!/usr/bin/env node
import { readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { inspectDemoStorageEvidence } from '../persistence/demo-storage-evidence.mjs';

export function discoverAuthorityValidators(root) {
 const excluded=new Set(['tests','packaging','release']),scripts=[];
 for(const dir of readdirSync(join(root,'scripts'),{withFileTypes:true})) {
  if(!dir.isDirectory()||excluded.has(dir.name))continue;
  for(const file of readdirSync(join(root,'scripts',dir.name))) {
   const path=`scripts/${dir.name}/${file}`;
   if(/^(?:validate|audit)-.*\.mjs$/.test(file)&&path!=='scripts/architecture/validate-whole-repository.mjs')scripts.push(path);
  }
 }
 return scripts.sort();
}

/** Three bounded, no-argument read-only validator children at a time. Every slot
 * runs once; results retain inventory order. The integration slot is a barrier:
 * preceding children drain before it runs alone, then bounded concurrency resumes.
 * There is no shared proof cache or
 * skipped validator. Children inherit the umbrella's process group so the outer
 * 25s self-audit SIGKILL also terminates them, rather than orphaning detached work. */
export async function runAuthorityValidators(root,scripts,{timeoutMs=5000,spawnImpl=spawn}={}) {
 if(!Number.isInteger(timeoutMs)||timeoutMs<1||timeoutMs>5000)throw new RangeError('validator timeout must be 1..5000ms');
 const results=new Array(scripts.length);
 const runOne=path=>new Promise(resolveResult=>{
  let child,timer,settled=false,outputBytes=0,stdout='',stderr='',failure=null;
  const stop=()=>{
   if(!child)return;
   try{child.kill('SIGKILL');}
   catch(error){if(error.code!=='ESRCH')failure??='validator cleanup failed';}
  };
  const finish=(status=null,signal=null)=>{
   if(settled)return;settled=true;clearTimeout(timer);stop();
   resolveResult({path,status,signal,stdout,stderr,error:failure});
  };
  try{child=spawnImpl(process.execPath,[path],{cwd:root,stdio:['ignore','pipe','pipe'],shell:false,detached:false});}
  catch(error){failure='validator launch failed: '+error.message;finish();return;}
  const collect=(kind,chunk)=>{
   if(settled||failure)return;outputBytes+=Buffer.byteLength(chunk);
   if(outputBytes>1024*1024){failure='validator output exceeds 1MiB';stop();return;}
   if(kind==='stdout')stdout+=chunk.toString();else stderr+=chunk.toString();
  };
  child.stdout.on('data',chunk=>collect('stdout',chunk));child.stderr.on('data',chunk=>collect('stderr',chunk));
  child.once('error',error=>{failure='validator launch failed: '+error.message;finish();});
  child.once('close',(status,signal)=>finish(status,signal));
  timer=setTimeout(()=>{failure='validator timed out after '+timeoutMs+'ms';stop();},timeoutMs);
 });
 const runConcurrent=async(start,end)=>{
  let next=start;
  const worker=async()=>{for(;;){const index=next++;if(index>=end)return;results[index]=await runOne(scripts[index]);}};
  await Promise.all([worker(),worker(),worker()]);
 };
 const integration='scripts/architecture/validate-repository-integration.mjs';
 let start=0;
 for(let index=0;index<scripts.length;index++)if(scripts[index]===integration){
  await runConcurrent(start,index);
  results[index]=await runOne(scripts[index]);
  start=index+1;
 }
 await runConcurrent(start,scripts.length);return results;
}

async function main() {
 const root=resolve(process.cwd()),scripts=discoverAuthorityValidators(root),errors=[];
 // Require the standalone integration slot; never substitute a summary for it.
 if(!scripts.includes('scripts/architecture/validate-repository-integration.mjs'))errors.push('required repository integration validator missing');
 const results=await runAuthorityValidators(root,scripts);
 for(const result of results)if(result.status!==0||result.error||result.signal)errors.push(`${result.path}: ${result.error||((result.stdout||'')+(result.stderr||'')).trim()||'validator terminated '+result.signal}`);
 if(errors.length){console.error(`WHOLE-REPOSITORY AUDIT FAILED (${errors.length})\n${errors.join('\n')}`);return 1;}
 console.log(`WHOLE-REPOSITORY AUDIT PASS: ${scripts.length} standalone authority/admission validators`);
 console.log('PROVEN: module/layer dependency checks, Application-owned repository ports, isolated execution entry guards, future queue/admission reconciliation');
 const storage=inspectDemoStorageEvidence(root);
 console.log(storage.extended&&storage.errors.length===0
  ? 'ADMIT: exact demo P05 extension/P06 Assignment/P08 ProgressEvent authoring only; UNDER_TEST: current storage proof; BLOCK: P07 Certification; UNKNOWN: all-command runtime authorization/audit/orchestration conformance; BLOCKED: shared/production execution'
  : 'BLOCK: P06/P07/P08 admission; UNKNOWN: all-command runtime authorization/audit/orchestration conformance; BLOCKED: shared/production execution');
 return 0;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))process.exitCode=await main();
