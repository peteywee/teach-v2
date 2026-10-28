import {test} from 'node:test';
import assert from 'node:assert/strict';
import {cpSync,mkdtempSync,readFileSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {resolve,join} from 'node:path';
import {scanContractQuestions} from '../verification/owner-decision-inventory.mjs';
const root=resolve(new URL('../..',import.meta.url).pathname);
function fixture(work){const dir=mkdtempSync(join(tmpdir(),'owner-question-'));try{cpSync(join(root,'contracts'),join(dir,'contracts'),{recursive:true});return work(dir);}finally{rmSync(dir,{recursive:true,force:true});}}
function mutate(dir,fn){const path=join(dir,'contracts/c00-system-authority-contract.md');writeFileSync(path,fn(readFileSync(path,'utf8')));}
test('active inventory includes 9 open questions and resolved rows separately',()=>{const result=scanContractQuestions(root);assert.equal(result.unresolved.length,9);assert.equal(result.unresolved.filter(x=>x.explicitly_blocks_implementation).length,1);assert.equal(result.resolved.length,68);assert.ok(result.resolved.some(x=>x.contract.includes('c01-')));});
test('new unresolved question is included even when text contains unresolved',()=>fixture(dir=>{mutate(dir,s=>s.replace('## 7.', '| OQ-SYS-99 | An unresolved policy question | Yes | SYS-4 |\n\n## 7.'));const result=scanContractQuestions(dir);assert.equal(result.unresolved.length,10);assert.ok(result.unresolved.some(x=>x.id==='OQ-SYS-99'));}));
test('duplicate question fails closed',()=>fixture(dir=>{mutate(dir,s=>s.replace('## 7.', '| OQ-SYS-1 | Duplicate | Yes | SYS-4 |\n\n## 7.'));assert.throws(()=>scanContractQuestions(dir),/duplicate question/);}));
test('unknown table schema fails closed',()=>fixture(dir=>{mutate(dir,s=>s.replace('Blocks implementation','Unreviewed blocking'));assert.throws(()=>scanContractQuestions(dir),/unknown question table schema/);}));
test('unknown blocking state fails closed',()=>fixture(dir=>{mutate(dir,s=>s.replace(/(\| OQ-SYS-1 \|[^\n]*?\| )No(?: \(resolved\))?( +\|)/,'$1Maybe$2'));assert.throws(()=>scanContractQuestions(dir),/unknown implementation-blocking state/);}));

// Exercise the actual admission-owning CLI, not a caller-supplied proof object.
import { spawnSync } from 'node:child_process';
import { authoringSourceFixture } from './authoring-source-fixture.mjs';
test('historical owner inventory authenticates current authoring bytes before finite projection', () => {
 const dir=authoringSourceFixture(root,'owner-authoring-projection-');
 const run=()=>spawnSync(process.execPath,['scripts/verification/validate-legacy-foundation-recovery.mjs'],{cwd:dir,encoding:'utf8',timeout:5000});
 try {
  let result=run();assert.equal(result.status,0,result.stdout+result.stderr);
  for(const path of ['kernel/entities.json','contracts/c31-content-teaching-engine-contract.md']) {
   const full=join(dir,path),bytes=readFileSync(full,'utf8');
   try {writeFileSync(full,bytes+'\n');result=run();assert.notEqual(result.status,0);assert.equal(result.signal,null);}
   finally{writeFileSync(full,bytes);}
  }
  result=run();assert.equal(result.status,0,result.stdout+result.stderr);
 } finally {rmSync(dir,{recursive:true,force:true});}
});
