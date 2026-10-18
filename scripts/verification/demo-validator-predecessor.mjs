import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {cpSync,mkdirSync,mkdtempSync,readFileSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
export const PREDECESSOR_COMMIT='b90dbe9d75867eb1ca8f578cd5dda826b1a30ec4';
export const PREDECESSOR_TREE='3081b387488b063580fecec73eb1df20a2d70a07';
let archive,archiveRoot;
process.once('exit',()=>{if(archive)rmSync(archive,{recursive:true,force:true});});
// Historical INPUT only: every validator and imported script is current source.
// This never alters the checkout, accepts a caller-chosen baseline or falls back
// to history for an unlisted case. Current admission remains a separate oracle.
export function predecessorFixture(root){
 if(archive&&archiveRoot!==root)throw Error('predecessor fixture source root mismatch');
 let tree;try{tree=execFileSync('git',['rev-parse','--verify',`${PREDECESSOR_COMMIT}^{tree}`],{cwd:root,encoding:'utf8',timeout:2000,stdio:['ignore','pipe','ignore']}).trim();}catch{throw Error('exact predecessor Git object required');}
  if(tree!==PREDECESSOR_TREE)throw Error('exact predecessor Git tree required');
 if(!archive){
  const staged=mkdtempSync(join(tmpdir(),'teach-validator-predecessor-'));
  try{
   execFileSync('git',['archive','--format=tar',`--output=${join(staged,'baseline.tar')}`,PREDECESSOR_COMMIT],{cwd:root,timeout:5000});
   const input=join(staged,'input');mkdirSync(input);
   execFileSync('tar',['-xf',join(staged,'baseline.tar'),'-C',input],{timeout:5000});
   rmSync(join(input,'scripts'),{recursive:true});
   cpSync(join(root,'scripts'),join(input,'scripts'),{recursive:true});
   execFileSync('tar',['-cf',join(staged,'current-validators.tar'),'-C',input,'.'],{timeout:5000});
   rmSync(input,{recursive:true});archive=staged;archiveRoot=root;
  }catch(error){rmSync(staged,{recursive:true,force:true});throw error;}
 }
 const dir=mkdtempSync(join(tmpdir(),'teach-validator-property-'));
 try{execFileSync('tar',['-xf',join(archive,'current-validators.tar'),'-C',dir],{timeout:5000});return dir;}
 catch(error){rmSync(dir,{recursive:true,force:true});throw error;}
}
export function exactCurrentDenial(result,diagnostic,fixture){
 return result.ordinaryProcessExit===true&&result.exit===1&&typeof diagnostic==='string'&&diagnostic.length>0&&result.output.split(fixture).join('<fixture>').split('\n').some(line=>line.replace(/^Error: /,'').trim()===diagnostic);
}
export const TRANSITION_MANIFEST_SHA256='c3854452d34dbe18d54571d275f98153cf66e63e60abeaca68f6d0bdaa3e1780';
export function readPredecessorCases(root){
 const bytes=readFileSync(join(root,'scripts/verification/demo-validator-transitions.json'));
 if(createHash('sha256').update(bytes).digest('hex')!==TRANSITION_MANIFEST_SHA256)throw Error('exact reviewed predecessor transition manifest required');
 const value=JSON.parse(bytes.toString());
 const sameKeys=(object,keys)=>JSON.stringify(Object.keys(object).sort())===JSON.stringify(keys.sort());
 if(!sameKeys(value,['version','purpose','predecessor_commit','predecessor_tree','cases'])||value.version!==1||value.predecessor_commit!==PREDECESSOR_COMMIT||value.predecessor_tree!==PREDECESSOR_TREE||!Array.isArray(value.cases)||value.cases.length!==115||new Set(value.cases.map(c=>c.name)).size!==115)throw Error('finite predecessor manifest shape required');
 const probes={
  'P06: premature ADMIT fails':'persistence/physical-slices/assignment/admission.json',
  'P06: unknown criteria cannot become PROVEN':'persistence/physical-slices/assignment/admission.json',
  'P06: authoring while BLOCKED fails':'persistence/physical-slices/assignment/admission-evidence-plan.json',
  'p08: premature ADMIT fails':'persistence/physical-slices/progress-event/admission.json',
  'p08: unknown criteria cannot be PROVEN':'persistence/physical-slices/progress-event/admission.json',
  'p08: migration authoring forbidden while blocked':'persistence/physical-slices/progress-event/admission-evidence-plan.json',
  'decision closure: registered policy and 24 denial regressions pass':'governance/decision-closure/registration.json',
 };
 for(const row of value.cases){
  const keys=['name','script','original_outcome','original_pattern','original_mutation_sha256','property_input','current_diagnostic'];
  if(Object.hasOwn(probes,row.name))keys.push('current_seal_probe_path');
  if(row.name==='decision closure: registered policy and 24 denial regressions pass')keys.push('current_probe_script');
  if(!sameKeys(row,keys)||row.current_seal_probe_path!==probes[row.name]||row.current_probe_script!==(row.name==='decision closure: registered policy and 24 denial regressions pass'?'scripts/verification/validate-decision-closure.mjs':undefined)||!['PASS','DENIAL'].includes(row.original_outcome)||!/^[a-f0-9]{64}$/.test(row.original_mutation_sha256)||row.property_input!=='EXACT_PREDECESSOR_WITH_CURRENT_VALIDATOR_SCRIPTS'||typeof row.current_diagnostic!=='string'||row.current_diagnostic.includes('\n'))throw Error('finite named predecessor case and current probe required');
 }
 return value;
}
