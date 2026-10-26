import {KITCHEN_VALIDATOR_TRANSITION,kitchenValidatorTransition,KITCHEN_FINALIZER_TRANSITION,kitchenFinalizerTransition,mutateKitchenFinalizer} from './kitchen-predecessor-fixture.mjs';
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync,mkdtempSync,mkdirSync,readdirSync,rmSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {join,resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {runInNewContext} from 'node:vm';
import {createHistoricalSourceReader} from '../kernel/demo-runtime-registration.mjs';
import {predecessorFixture,exactCurrentDenial,readPredecessorCases,PREDECESSOR_COMMIT,PREDECESSOR_TREE} from '../verification/demo-validator-predecessor.mjs';
const root=resolve(new URL('../..',import.meta.url).pathname),hash=x=>createHash('sha256').update(x).digest('hex');
const manifest=readPredecessorCases(root),source=readFileSync(join(root,'scripts/tests/validate-validators.mjs'),'utf8'),declarations=[];
runInNewContext(source.slice(source.indexOf('// Semantic kernel:'),source.indexOf('// Report')),{test:(name,script,mutate,expect)=>declarations.push({name,script,outcome:expect.pass?'PASS':'DENIAL',pattern:expect.pattern?.source??null,mutation:hash(mutate.toString())})},{timeout:2000});
test('finite paired manifest preserves every original declaration and names exact predecessor inputs',()=>{
 assert.equal(manifest.version,1);assert.equal(manifest.predecessor_commit,PREDECESSOR_COMMIT);assert.equal(manifest.predecessor_tree,PREDECESSOR_TREE);
 assert.equal(declarations.length,220);assert.equal(manifest.cases.length,115);assert.equal(new Set(manifest.cases.map(c=>c.name)).size,115);
 for(const row of manifest.cases){const original=declarations.find(c=>c.name===row.name);assert.ok(original);assert.equal(row.script,original.script);assert.equal(row.original_outcome,original.outcome);assert.equal(row.original_pattern,original.pattern);assert.equal(row.original_mutation_sha256,original.mutation);assert.equal(row.property_input,'EXACT_PREDECESSOR_WITH_CURRENT_VALIDATOR_SCRIPTS');assert.ok(row.current_diagnostic.length>20);}
 assert.deepEqual(manifest.cases.filter(c=>c.original_outcome==='PASS').map(c=>c.name),['slice-p05 admission: reordered complete criteria pass','decision closure: registered policy and 24 denial regressions pass']);
 assert.equal(manifest.cases.filter(c=>c.current_seal_probe_path).length,7);
});
test('each exact current denial rejects unrelated errors, truncated diagnostics, missing output, timeout and signals',()=>{
 for(const row of manifest.cases){const fixture='/tmp/fixed-fixture',text=row.current_diagnostic.replaceAll('<fixture>',fixture);const valid={exit:1,ordinaryProcessExit:true,output:'Error: '+text+'\n'};
  assert.equal(exactCurrentDenial(valid,row.current_diagnostic,fixture),true);
  for(const patch of [{exit:0},{exit:124},{exit:null},{ordinaryProcessExit:false},{output:''},{output:'unrelated failure'},{output:text.slice(0,-1)},{output:'unrelated '+text},{output:text+' extra'}])assert.equal(exactCurrentDenial({...valid,...patch},row.current_diagnostic,fixture),false);
 }
});
test('missing predecessor object fails without an archive or fallback',()=>{const dir=mkdtempSync(join(tmpdir(),'missing-predecessor-'));try{assert.throws(()=>predecessorFixture(dir),/exact predecessor Git object|required|source root mismatch/);}finally{rmSync(dir,{recursive:true,force:true});}});
function files(root,path){return readdirSync(join(root,path),{withFileTypes:true}).flatMap(e=>e.isDirectory()?files(root,path+'/'+e.name):[path+'/'+e.name]);}
test('property fixture uses complete immutable predecessor inputs and byte-identical current scripts',()=>{
 const dir=predecessorFixture(root);try{
  assert.equal(readFileSync(join(dir,'persistence/physical-slices/assignment/admission.json'),'utf8').includes('"decision": "BLOCK"'),true);
  assert.equal(JSON.parse(readFileSync(join(dir,'domains/demo-runtime/registration.json'),'utf8')).runtime_activation_authorized,false);
  assert.deepEqual(files(dir,'scripts').sort(),files(root,'scripts').sort());
  for(const path of files(root,'scripts'))assert.equal(hash(readFileSync(join(dir,path))),hash(readFileSync(join(root,path))),path);
 }finally{rmSync(dir,{recursive:true,force:true});}
});
test('removing a current structural invariant fails the paired property oracle even when its current seal denial still matches',()=>{
 const dir=predecessorFixture(root),path='scripts/persistence/validate-slice-p02-schema-admission.mjs';
 try{
  const recordPath=join(dir,'persistence/physical-slices/identity-session/registration.json');const record=JSON.parse(readFileSync(recordPath,'utf8'));record.ownership_scope_decision.application_session_identity_fk_required=false;writeFileSync(recordPath,JSON.stringify(record,null,2)+'\n');
  const run=()=>{const r=spawnSync(process.execPath,[join(dir,path)],{cwd:dir,encoding:'utf8',timeout:5000});return{status:r.status,output:(r.stdout??'')+(r.stderr??'')};};
  const original=run();assert.equal(original.status,1);assert.match(original.output,/exact owner-approved ownership\/scope decision required/);
  const file=join(dir,path),body=readFileSync(file,'utf8'),needle="errors.push('SLICE-P02 admission: exact owner-approved ownership/scope decision required')";assert.ok(body.includes(needle));writeFileSync(file,body.replace(needle,'void 0'));
  const broken=run();assert.doesNotMatch(broken.output,/exact owner-approved ownership\/scope decision required/);
  const row=manifest.cases.find(c=>c.name==='slice-p02 admission: optional session owner fails');assert.equal(exactCurrentDenial({exit:1,ordinaryProcessExit:true,output:row.current_diagnostic},row.current_diagnostic,dir),true);
  assert.equal(broken.status===1&&new RegExp(row.original_pattern).test(broken.output),false,'byte guard cannot replace the missing structural-property oracle');
 }finally{rmSync(dir,{recursive:true,force:true});}
});

test('manifest byte pin rejects redirected probes, omitted pairs and changed declarations',()=>{
 const dir=mkdtempSync(join(tmpdir(),'predecessor-pin-'));try{
  mkdirSync(join(dir,'scripts/verification'),{recursive:true});const path=join(dir,'scripts/verification/demo-validator-transitions.json');
  for(const change of [v=>v.cases.pop(),v=>v.cases[0].script='scripts/unreviewed.mjs',v=>v.cases[0].current_diagnostic='unrelated error',v=>v.cases[0].current_seal_probe_path='contracts/unrelated.md',v=>v.cases[0].extra=true,v=>v.predecessor_commit='0'.repeat(40)]){const altered=structuredClone(manifest);change(altered);writeFileSync(path,JSON.stringify(altered,null,2)+'\n');assert.throws(()=>readPredecessorCases(dir),/exact reviewed/);}
 }finally{rmSync(dir,{recursive:true,force:true});}
});

// These do not modify the six original property-oracle assertions above.
test('semantic-only historical reader pins original evidence and rejects forged snapshots',()=>{
 const dir=predecessorFixture(root);try{
  const snapshot=JSON.parse(readFileSync(join(dir,'domains/demo-runtime/source-baseline.json'),'utf8'));
  assert.doesNotThrow(()=>createHistoricalSourceReader(dir,snapshot));
  const forged=structuredClone(snapshot);forged.files['kernel/entities.json']='{}';
  assert.throws(()=>createHistoricalSourceReader(dir,forged),/verified source snapshot/);
  for(const name of ['registration.json','source-baseline.json','owner-approval.json']){
   const path=join(dir,'domains/demo-runtime',name),original=readFileSync(path,'utf8');
   try{writeFileSync(path,original+'\n');assert.throws(()=>createHistoricalSourceReader(dir),/exact original semantic evidence/);}finally{writeFileSync(path,original);}
  }
 }finally{rmSync(dir,{recursive:true,force:true});}
});
test('orphan successor evidence cannot enter the semantic-only structural reader path',()=>{
 for(const directory of ['governance/demo-schema-isolation','domains/demo-recipes','persistence/physical-slices/demo-runtime']){
  const dir=predecessorFixture(root);try{
   mkdirSync(join(dir,directory),{recursive:true});writeFileSync(join(dir,directory,directory.endsWith('demo-runtime')?'independent-successor-review.json':'unapproved.json'),'{}');
   assert.throws(()=>createHistoricalSourceReader(dir),/orphan|unexpected active authority/);
  }finally{rmSync(dir,{recursive:true,force:true});}
 }
});

test('one exact kitchen transition preserves both older oracles and rejects unrelated current failures',()=>{
 const expected={name:'slice-p04 implementation: missing journal entry fails',script:'scripts/persistence/validate-slice-p04-implementation-boundary.mjs',original_diagnostic:'demo physical admission: original journal prefix must remain immutable',current_diagnostic:'demo kitchen engineering: current source differs: drizzle/meta/_journal.json'};
 assert.deepEqual(KITCHEN_VALIDATOR_TRANSITION,expected);assert.equal(Object.isFrozen(KITCHEN_VALIDATOR_TRANSITION),true);
 const row=manifest.cases.find(item=>item.name===expected.name);assert.ok(row);assert.equal(kitchenValidatorTransition(row.name,row),KITCHEN_VALIDATOR_TRANSITION);
 for(const declaration of declarations.filter(item=>item.name!==expected.name))assert.equal(kitchenValidatorTransition(declaration.name,manifest.cases.find(item=>item.name===declaration.name)),null);
 for(const changed of [undefined,{...row,name:'unlisted'},{...row,script:'scripts/unreviewed.mjs'},{...row,current_diagnostic:'unrelated error'}])assert.throws(()=>kitchenValidatorTransition(expected.name,changed));
 const valid={exit:1,ordinaryProcessExit:true,output:'Error: '+expected.current_diagnostic+'\n'};
 assert.equal(exactCurrentDenial(valid,expected.current_diagnostic,'/tmp/fixture'),true);
 for(const patch of [{exit:0},{exit:124},{exit:null},{ordinaryProcessExit:false},{output:''},{output:'unrelated failure'},{output:expected.current_diagnostic.slice(0,-1)},{output:expected.current_diagnostic+' extra'},{output:expected.original_diagnostic}])assert.equal(exactCurrentDenial({...valid,...patch},expected.current_diagnostic,'/tmp/fixture'),false);
});

test('one exact finalizer adaptation preserves the frozen mutation and targets no kitchen cleanup',()=>{
 const row=declarations.find(item=>item.name===KITCHEN_FINALIZER_TRANSITION.name);
 assert.deepEqual(row,{name:KITCHEN_FINALIZER_TRANSITION.name,script:KITCHEN_FINALIZER_TRANSITION.script,outcome:'DENIAL',pattern:KITCHEN_FINALIZER_TRANSITION.pattern,mutation:KITCHEN_FINALIZER_TRANSITION.mutation_sha256});
 assert.equal(manifest.cases.some(item=>item.name===row.name),false);
 assert.equal(Object.isFrozen(KITCHEN_FINALIZER_TRANSITION),true);
 const mutate=(dir)=>mutateText(dir,selfAuditWorkflow,'if: always()','if: success()');
 const expect={pattern:/finalize and be retained/};
 assert.equal(kitchenFinalizerTransition(row.name,row.script,mutate,expect),KITCHEN_FINALIZER_TRANSITION);
 for(const item of declarations.filter(item=>item.name!==row.name))assert.equal(kitchenFinalizerTransition(item.name,item.script,()=>{},{}),null);
 for(const [script,mutation,outcome] of [[row.script,()=>{},expect],['unreviewed',mutate,expect],[row.script,mutate,{pass:true,...expect}],[row.script,mutate,{pattern:/unrelated/}]])assert.throws(()=>kitchenFinalizerTransition(row.name,script,mutation,outcome));
 const workflow=readFileSync(join(root,'.github/workflows/development-self-audit.yml'),'utf8');
 const target='        id: audit_finalize\n        if: always()\n        run: node scripts/verification/run-self-audit.mjs --finish\n';
 const altered=mutateKitchenFinalizer(workflow);
 assert.equal(altered,workflow.replace(target,target.replace('if: always()','if: success()')));
 assert.match(altered,/id: kitchen_postgres_stop\n        if: always\(\)/);
 for(const invalid of [workflow.replace(target,''),workflow+target,altered,workflow.replace('id: audit_finalize','id: unrelated')])assert.throws(()=>mutateKitchenFinalizer(invalid));
 const diagnostic=KITCHEN_FINALIZER_TRANSITION.diagnostic,valid={exit:1,ordinaryProcessExit:true,output:diagnostic+'\n'};
 assert.equal(exactCurrentDenial(valid,diagnostic,'/tmp/fixture'),true);
 for(const patch of [{exit:0},{exit:124},{ordinaryProcessExit:false},{output:'consolidated verification: exact constrained producer template required; shell/default/environment/execution overrides forbidden'},{output:diagnostic+' extra'}])assert.equal(exactCurrentDenial({...valid,...patch},diagnostic,'/tmp/fixture'),false);
});
