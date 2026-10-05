import {readFileSync,readdirSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
const digest=text=>createHash('sha256').update(text).digest('hex');
const cells=line=>line.trim().split('|').slice(1,-1).map(x=>x.trim());
export function scanContractQuestions(root) {
 const unresolved=[],resolved=[],sources={},ids=new Set();
 const files=readdirSync(join(root,'contracts')).filter(x=>/^c\d\d-.*\.md$/.test(x)).sort();
 if(files.length!==23)throw new Error('exact active contract inventory required');
 for(const file of files){
  const path=`contracts/${file}`,text=readFileSync(join(root,path),'utf8');sources[path]=digest(text);
  const metadata=text.match(/<!--tos-doc\s*([\s\S]*?)\s*-->/);if(!metadata)throw new Error(`${path}: contract metadata required`);
  const doc=JSON.parse(metadata[1]);if(doc.status!=='active')throw new Error(`${path}: active owner authority required`);
  const start=text.indexOf('## 6. Open Questions'),end=text.indexOf('\n## 7.',start);
  if(start<0||end<0)throw new Error(`${path}: open question section required`);
  const section=text.slice(start,end),lines=section.split('\n');
  const header=lines.find(x=>/^\|\s*ID\s*\|/.test(x));if(!header)throw new Error(`${path}: explicit question table required`);
  const headers=cells(header),statusIndex=headers.indexOf('Status'),questionIndex=headers.findIndex(x=>x==='Question'||x==='Decision / Question'),blockingIndex=headers.findIndex(x=>/^Blocks implementation$/i.test(x)),affectsIndex=headers.indexOf('Affects');
  if(questionIndex<0||blockingIndex<0||affectsIndex<0)throw new Error(`${path}: unknown question table schema`);
  for(const line of lines.filter(x=>/^\|\s*OQ-/.test(x))){
   const row=cells(line),id=row[0];if(row.length!==headers.length||!/^OQ-[A-Z]+-\d+$/.test(id)||ids.has(id))throw new Error(`${path}: malformed or duplicate question row`);ids.add(id);
   const question=row[questionIndex],isResolved=statusIndex>=0?row[statusIndex]==='Resolved':/^Resolved\b/i.test(question.replace(/\*\*/g,''));
   if(statusIndex>=0&&!['Resolved','Open','Unresolved'].includes(row[statusIndex]))throw new Error(`${path}: unknown resolution state`);
   const blocking=row[blockingIndex];if(!/^Yes$|^No(?: \(resolved\))?$/.test(blocking))throw new Error(`${path}: unknown implementation-blocking state`);
   const entry={id,contract:path,contract_version:doc.version,question,explicitly_blocks_implementation:blocking==='Yes',affects:row[affectsIndex],source_line:text.slice(0,start).split('\n').length+lines.indexOf(line)};
   (isResolved?resolved:unresolved).push(entry);
  }
 }
 return {unresolved,resolved,sources};
}
export function deriveOwnerDecisionInventory(root,baselineCommit) {
 if(!/^[a-f0-9]{40}$/.test(baselineCommit))throw new Error('consulted V2 baseline SHA required');
 const questions=scanContractQuestions(root),sources={...questions.sources},physical=[];
 for(const [slice,lane] of [['P06','assignment'],['P07','certification'],['P08','progress-event']]){
  const path=`persistence/physical-slices/${lane}/admission-evidence-plan.json`,text=readFileSync(join(root,path),'utf8'),plan=JSON.parse(text);sources[path]=digest(text);
  for(const [field,value] of Object.entries(plan).filter(([key])=>key.endsWith('_decision')))if(value==='UNKNOWN')physical.push({id:`${slice}.${field}`,slice,field,owner:plan.owning_module,source:path,state:'UNKNOWN',issue:plan.issue??'#63'});
 }
 const semantic=[];
 for(const name of readdirSync(join(root,'kernel')).filter(x=>x.endsWith('.json')).sort()){
  const path=`kernel/${name}`,text=readFileSync(join(root,path),'utf8'),record=JSON.parse(text);if(!Array.isArray(record.entries))continue;sources[path]=digest(text);
  for(const entry of record.entries.filter(x=>x.status==='candidate'))semantic.push({registry:path,id:entry.id,owner:entry.owning_domain??null,status:'candidate'});
 }
 return {version:'0.1.0',scope:'all unresolved active-contract question rows, future physical-shape questions, and candidate promotion inventory; no owner approval',consulted_v2_baseline:baselineCommit,
  owner_approval_recorded:false,runtime_activation:'BLOCKED',shared_or_production_execution_authorized:false,
  totals:{unresolved_contract_questions:questions.unresolved.length,explicit_contract_blockers:questions.unresolved.filter(x=>x.explicitly_blocks_implementation).length,physical_shape_questions:physical.length,semantic_candidates:semantic.length},
  unresolved_contract_questions:questions.unresolved,resolved_question_rows:questions.resolved,physical_shape_questions:physical,semantic_candidates:semantic,source_sha256:sources};
}
