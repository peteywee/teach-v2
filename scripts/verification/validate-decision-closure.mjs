#!/usr/bin/env node
// Registered policy verification. No runtime, schema, semantic-promotion or production grant.
import {readFileSync,existsSync,readdirSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {scanContractQuestions} from './owner-decision-inventory.mjs';

export const PKG='governance/proposals/2026-10-05-decision-closure';
export const APPROVED_MANIFEST='ff7b51df1e3a235e9d226d9d7232f81c64bbeb451b359b6e0f2ea232b6e1757c';
export const OPEN_IDS=['OQ-PRIV-4','OQ-PRIV-5','OQ-TXN-2','OQ-CNT-2','OQ-CERT-2','OQ-API-3','OQ-EVD-2','OQ-OBS-1','OQ-BIL-3'];
const EXPECTED={C02:'1.1.0',C11:'1.6.0',C12:'1.2.0',C14:'1.3.0',C15:'1.1.0',C21:'1.2.0',C22:'1.3.0',C23:'1.2.0',C31:'1.2.0',C32:'1.3.0',C33:'1.2.0',C34:'1.3.0',C41:'1.1.0',C42:'1.1.0',C51:'1.1.0',C52:'1.3.0',C53:'1.2.0',C61:'1.1.0',C62:'1.1.0',C63:'1.2.0'};
const digest=text=>createHash('sha256').update(text).digest('hex');
const metadata=text=>JSON.parse(text.match(/^<!--tos-doc\n([\s\S]*?)\n-->/)?.[1]??'null');
const body=text=>text.slice(text.indexOf('-->')+3).replace(/^\n+/,'');
const requirements=text=>[...text.matchAll(/^- \*\*([A-Z]+-\d+)\*\*[^\n]*/gm)].map(x=>({id:x[1],line:x[0]}));
const cases=text=>[...text.matchAll(/^\|\s*([A-Z]+-AC-\d+)\s*\|/gm)].map(x=>x[1]);
const marker='The original body below is preserved, including its former current-status wording.\n';

export function validateDecisionClosure(root){
 const errors=[],check=(ok,message)=>{if(!ok)errors.push(message);};
 const read=p=>readFileSync(join(root,p),'utf8'),json=p=>JSON.parse(read(p));
 try{
  const manifest=json(`${PKG}/package-manifest.json`),reg=json('governance/decision-closure/registration.json');
  check(digest(read(`${PKG}/package-manifest.json`))===APPROVED_MANIFEST,'approved manifest digest changed');
  check(read(`${PKG}/package-manifest.sha256`).startsWith(APPROVED_MANIFEST),'approved manifest sidecar changed');
  check(manifest.registration_form.new_requirement_ids===0&&manifest.registration_form.new_acceptance_ids===0,'approved no-new-ID registration form required');
  check(reg.issue==='#75'&&reg.owner==='Patrick Craven'&&reg.owner_local_date==='2026-10-05'&&reg.timezone==='America/Chicago'&&reg.approved_manifest_sha256===APPROVED_MANIFEST,'exact owner approval provenance required');
  check(reg.implementation_conformance==='UNKNOWN'&&reg.independent_verification==='NOT_PERFORMED'&&reg.runtime_activation_authorized===false&&reg.shared_or_production_execution_authorized===false&&reg.capability_promotion_authorized===false,'registration cannot grant runtime, production or semantic authority or independent proof');
  check(JSON.stringify(reg.batches)===JSON.stringify([1,2,3,4,5,6]),'all six ordered batches required');
  check(reg.contracts.length===20&&new Set(reg.contracts.map(x=>x.contract)).size===20,'exact twenty-contract registration required');
  for(const a of manifest.artifacts){
   const p=a.path.startsWith('scripts/')?`${PKG}/source-scripts/${a.path}`:a.path;
   check(existsSync(join(root,p)),`approved artifact missing ${p}`);
   if(existsSync(join(root,p))){const bytes=readFileSync(join(root,p));check(bytes.length===a.bytes&&digest(bytes)===a.sha256,`approved artifact digest changed ${p}`);}
  }
  const archiveInventory={markdown:0,json:0,sidecar:0,script:0,total_files:0};
  for(const name of readdirSync(join(root,PKG))){
   if(name==='source-scripts')continue;
   const kind=name.endsWith('.md')?'markdown':name.endsWith('.json')?'json':name.endsWith('.sha256')?'sidecar':null;
   check(kind!==null,`unapproved archive entry ${name}`);
   if(kind){archiveInventory[kind]++;archiveInventory.total_files++;}
  }
  archiveInventory.script=manifest.artifacts.filter(x=>x.path.startsWith('scripts/')).length;
  archiveInventory.total_files+=archiveInventory.script;
  check(JSON.stringify(archiveInventory)===JSON.stringify(manifest.archive_inventory),'complete archive inventory must include manifest and sidecar (22 files)');
  // Activation copies must reproduce approved normative bodies; proposal bytes remain immutable.
  for(const name of readdirSync(join(root,'governance/decision-closure')).filter(x=>x!== 'registration.json')){
   const p=`governance/decision-closure/${name}`,source=`${PKG}/${name}`;
   check(existsSync(join(root,source)),`unapproved registered specification ${name}`);
   if(!existsSync(join(root,source)))continue;
   if(name.endsWith('.md')){
    const text=read(p),m=metadata(text),registered=body(text),lines=registered.split('\n'),start=lines.findIndex(x=>x.startsWith('Registered on 2026-10-05 by the owner-approved r3.1 manifest under SYS-21 #75.'));
    check(m?.version==='1.0.0'&&m.status==='active'&&m.approval?.state==='approved'&&m.approval.basis.includes(APPROVED_MANIFEST),'registered specification approval required');
    check(start===2,'registered specification provenance banner required');
    if(start>=0)check([...lines.slice(0,1),...lines.slice(start+2)].join('\n')===body(read(source)),`registered normative specification changed ${name}`);
   }else check(read(p)===read(source),`registered matrix differs from approved matrix ${name}`);
  }
  const live=scanContractQuestions(root),unresolved=live.unresolved.map(x=>x.id);
  check(JSON.stringify(unresolved)===JSON.stringify(OPEN_IDS),'exact nine residual/unknown questions required');
  check(JSON.stringify(live.unresolved.filter(x=>x.explicitly_blocks_implementation).map(x=>x.id))==='["OQ-CERT-2"]','CERT-2 must remain the sole explicit blocker');
  const ledger=read('contracts/APPROVAL-RECORD.md');check(ledger.includes('## Part 25 — Decision-closure r3.1 registration (#75)')&&ledger.includes(APPROVED_MANIFEST),'canonical manifest-bound approval ledger required');
  const questionIds=[];
  for(const row of reg.contracts){
   const text=read(row.path),m=metadata(text),archive=read(row.superseded_copy),old=metadata(archive),at=archive.indexOf(marker),history=at<0?'':archive.slice(at+marker.length);
   check(EXPECTED[row.contract]===row.to_version&&m?.version===row.to_version&&m.status==='active'&&m.approval?.approved_version===m.version&&m.approval?.basis.includes(APPROVED_MANIFEST),`approved current version required ${row.contract}`);
   check(old?.version===row.from_version&&old.status==='superseded'&&old.superseded_by===`${m.doc_id}@${row.to_version}`,`superseded metadata required ${row.contract}`);
   check(at>=0&&digest(history)===row.historical_body_sha256,`historical body changed ${row.contract}`);
   const req=requirements(text),prev=requirements(history),acs=cases(text);
   check(JSON.stringify(req.map(x=>x.id))===JSON.stringify(prev.map(x=>x.id))&&JSON.stringify(acs)===JSON.stringify(cases(history)),`requirement/acceptance IDs changed ${row.contract}`);
   const amended=new Set(row.questions.map(x=>x.affects).filter(x=>x!=='—'));
   for(const r of prev)if(!amended.has(r.id))check(req.some(x=>x.id===r.id&&x.line===r.line),`unrelated requirement changed ${row.contract}:${r.id}`);
   check(text.includes(`| ${row.to_version} | 2026-10-05 | Register`),`revision changelog missing ${row.contract}`);
   check(ledger.includes(`| ${row.contract} | ${row.from_version} | ${row.to_version} |`),`approval ledger revision missing ${row.contract}`);
   for(const q of row.questions){
    questionIds.push(q.id);const line=text.split('\n').find(x=>x.startsWith(`| ${q.id} |`));
    check(line?.includes(q.value)&&line.includes(q.controlling_artifact),`registered value/reference missing ${q.id}`);
    if(q.state==='RESOLVED')check(live.resolved.some(x=>x.id===q.id)&&line?.includes('No (resolved)')&&line.includes('Owner, 2026-10-05:')&&line.includes('(Decision-closure r3.1)'),`resolution missing ${q.id}`);
    else check(q.state==='OPEN_RESIDUAL'&&OPEN_IDS.includes(q.id)&&q.residual&&live.unresolved.some(x=>x.id===q.id)&&line?.includes(q.residual)&&line.includes('partial registration'),`residual fabricated or lost ${q.id}`);
    if(q.affects!=='—')check(req.some(x=>x.id===q.affects&&x.line.includes(q.value)&&x.line.includes(q.id)&&x.line.includes(q.controlling_artifact)),`normative value missing ${q.id}`);
   }
  }
  check(questionIds.length===44&&new Set(questionIds).size===44&&reg.contracts.flatMap(x=>x.questions).filter(x=>x.state==='RESOLVED').length===37,'37 new resolutions and seven residuals required (C00 separately resolved three)');
  const c00=read('contracts/c00-system-authority-contract.md'),a00=read('contracts/superseded/c00-system-authority-contract-1.0.3.md');
  check(metadata(c00).version==='1.1.0'&&metadata(a00).status==='superseded'&&metadata(a00).superseded_by==='TEACH-CON-C00@1.1.0','C00 template/current supersession required');
  for(const id of ['OQ-SYS-1','OQ-SYS-2','OQ-SYS-5'])check(live.resolved.some(x=>x.id===id),`C00 resolution lost ${id}`);
  let reqTotal=0,caseTotal=0;
  for(const name of readdirSync(join(root,'contracts')).filter(x=>/^c\d\d-.*\.md$/.test(x))){const text=read('contracts/'+name);reqTotal+=requirements(text).length;caseTotal+=cases(text).length;}
  check(reqTotal===391&&caseTotal===267,'391 requirements / 267 acceptance IDs required');
  const index=read('contracts/README.md');check(metadata(index).version==='0.18.0'&&['**391**','**267**','**9**','**1**'].every(x=>index.includes(x)),'current index version/totals required');
  const caps=json('kernel/capabilities.json');check(caps.entries.length===0,'capability promotion remains separate');
 }catch(error){errors.push(`decision closure fails closed: ${error.message}`);}
 return {errors};
}
if(import.meta.url===pathToFileURL(process.argv[1]??'').href){const result=validateDecisionClosure(resolve(process.cwd()));if(result.errors.length){console.error('DECISION-CLOSURE REGISTRATION FAILED\n'+result.errors.join('\n'));process.exitCode=1;}else console.log('DECISION-CLOSURE REGISTRATION PASS: 20 remaining contracts; 40 total resolutions; 7 residuals + 2 unknowns; 391/267 IDs preserved; runtime UNKNOWN');}
