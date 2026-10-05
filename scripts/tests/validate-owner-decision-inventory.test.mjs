import {test} from 'node:test';
import assert from 'node:assert/strict';
import {cpSync,mkdtempSync,readFileSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {resolve,join} from 'node:path';
import {scanContractQuestions} from '../verification/owner-decision-inventory.mjs';
const root=resolve(new URL('../..',import.meta.url).pathname);
function fixture(work){const dir=mkdtempSync(join(tmpdir(),'owner-question-'));try{cpSync(join(root,'contracts'),join(dir,'contracts'),{recursive:true});return work(dir);}finally{rmSync(dir,{recursive:true,force:true});}}
function mutate(dir,fn){const path=join(dir,'contracts/c00-system-authority-contract.md');writeFileSync(path,fn(readFileSync(path,'utf8')));}
test('active inventory includes 56 open questions and resolved rows separately',()=>{const result=scanContractQuestions(root);assert.equal(result.unresolved.length,56);assert.equal(result.unresolved.filter(x=>x.explicitly_blocks_implementation).length,11);assert.equal(result.resolved.length,21);assert.ok(result.resolved.some(x=>x.contract.includes('c01-')));});
test('new unresolved question is included even when text contains unresolved',()=>fixture(dir=>{mutate(dir,s=>s.replace('## 7.', '| OQ-SYS-99 | An unresolved policy question | Yes | SYS-4 |\n\n## 7.'));const result=scanContractQuestions(dir);assert.equal(result.unresolved.length,57);assert.ok(result.unresolved.some(x=>x.id==='OQ-SYS-99'));}));
test('duplicate question fails closed',()=>fixture(dir=>{mutate(dir,s=>s.replace('## 7.', '| OQ-SYS-1 | Duplicate | Yes | SYS-4 |\n\n## 7.'));assert.throws(()=>scanContractQuestions(dir),/duplicate question/);}));
test('unknown table schema fails closed',()=>fixture(dir=>{mutate(dir,s=>s.replace('Blocks implementation','Unreviewed blocking'));assert.throws(()=>scanContractQuestions(dir),/unknown question table schema/);}));
test('unknown blocking state fails closed',()=>fixture(dir=>{mutate(dir,s=>s.replace(/(\| OQ-SYS-1 \|[^\n]*?\| )No( +\|)/,'$1Maybe$2'));assert.throws(()=>scanContractQuestions(dir),/unknown implementation-blocking state/);}));
