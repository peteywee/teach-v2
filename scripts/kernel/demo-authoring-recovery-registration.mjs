import {createHash} from 'node:crypto';
import {existsSync} from 'node:fs';
import {join} from 'node:path';
import {isDeepStrictEqual} from 'node:util';
import {authoringReader,exactAuthoringDirectory} from './authoring-source-reader.mjs';
export const AUTHORING_RECOVERY_BASE='docs/proposals/demo-authoring-recovery-exception';
export const AUTHORING_RECOVERY_ID='TEACH-DEMO-AUTHORING-RECOVERY-2026-10-28';
// Only the genuine independent reviewer may set this exact literal.
export const AUTHORING_RECOVERY_REVIEW_SHA256 = '6fa9efdb111886f96304eea747c4fb2e6205f3f0501a7257eae3e35b9eab7c03';
export const AUTHORING_RECOVERY_AUTHORITY=Object.freeze(['contracts/c21-database-migration-contract.md','governance/decision-closure/07-evidence-release-operations-spec.md']);
export const AUTHORING_RECOVERY_ARCHIVES=Object.freeze(['contracts/superseded/c21-database-migration-contract-3.0.0.md','governance/decision-closure/superseded/07-evidence-release-operations-spec-3.0.0.md']);
export const AUTHORING_RECOVERY_CODE=Object.freeze(['scripts/kernel/demo-authoring-recovery-registration.mjs','scripts/release/authoring-recovery-evidence.mjs','scripts/tests/validate-authoring-recovery-policy.test.mjs','scripts/release/validate-production-migration-evidence.mjs']);
const FILES=Object.freeze(['adoption.md','adoption-registration.json','owner-adoption.json','source-baseline.json','impact-map.json','adoption-independent-review.json']);
const hash=s=>createHash('sha256').update(s).digest('hex');
export function normalizedAuthoringRecoveryCode(path,s){if(path!==AUTHORING_RECOVERY_CODE[0])return s;const re=/^export const AUTHORING_RECOVERY_REVIEW_SHA256 = (null|'[a-f0-9]{64}');$/m;if(!re.test(s))throw Error('exact independent review anchor required');return s.replace(re,'export const AUTHORING_RECOVERY_REVIEW_SHA256 = null;');}
/** Raw-only finite leaf: no predecessor inspector, caller reader, credentials or
 * execution. No predecessor bytes are released without genuine sealed review. */
export function inspectAuthoringRecoveryRegistration(root){
 const empty={present:false,errors:[],predecessorFiles:{},revisedPaths:[],addedPaths:[]},errors=[];
 const fail=s=>errors.push('authoring recovery policy: '+s),eq=(a,b,s)=>{if(!isDeepStrictEqual(a,b))fail(s);};
 try{
  if(!existsSync(join(root,AUTHORING_RECOVERY_BASE)))return empty;
  const reader=authoringReader(root),raw=p=>reader.read(p),json=p=>JSON.parse(raw(p)),base=AUTHORING_RECOVERY_BASE;
  exactAuthoringDirectory(reader,base,FILES);
  const r=json(base+'/adoption-registration.json'),v=json(base+'/adoption-independent-review.json');
  eq(hash(raw(base+'/adoption-independent-review.json')),AUTHORING_RECOVERY_REVIEW_SHA256,'independent review absent or changed');
  eq(v.registration_sha256,hash(raw(base+'/adoption-registration.json')),'review must bind exact registration');eq(v.outcome,'PASS','review must pass');eq(v.source_edits_by_reviewer,false,'independent reviewer must not author implementation');eq(v.execution_authorized,false,'review is not execution authority');
  if(typeof v.reviewer!=='string'||!v.reviewer||!Number.isFinite(Date.parse(v.reviewed_at_utc)))fail('review identity/time required');
  eq(r.registration_id,AUTHORING_RECOVERY_ID,'exact identity');eq(r.version,'1.0.0','exact version');eq(r.state,'REGISTERED_POLICY_ONLY','policy only');
  eq(r.project_id,'acqafjkdkdmtpnsxiesw','exact project');eq(r.schema,'teach_v2_demo','exact private schema');eq(r.migration_sha256,'6c6e568354e95cb5012e369dca6a3f0c9a3c2d72ac49d05127d1b77f3ba941ab','exact0008');eq(r.actual_recovery_evidence,'UNKNOWN','source cannot claim live proof');
  for(const flag of ['data_export_authorized_by_registration','key_access_authorized_by_registration','production_execution_authorized_by_registration','spending_authorized','future_migration_exception'])eq(r[flag],false,'no '+flag);
  const owner=json(base+'/owner-adoption.json'),source=json(base+'/source-baseline.json');
  eq(owner.decision_id,AUTHORING_RECOVERY_ID,'separate exact owner record');eq(owner.policy_adoption_authorized,true,'owner policy adoption required');
  for(const k of ['project_id','schema','migration_sha256','actual_recovery_evidence','spending_authorized','future_migration_exception'])eq(owner[k],r[k],'owner scope differs: '+k);
  for(const k of ['data_export_authorized_by_this_record','key_access_authorized_by_this_record','production_execution_authorized_by_this_record'])eq(owner[k],false,'policy owner record cannot imply '+k);
  eq(Object.keys(source.files??{}).sort(),[...AUTHORING_RECOVERY_AUTHORITY].sort(),'finite predecessor inventory');
  const expected=[...AUTHORING_RECOVERY_AUTHORITY,...AUTHORING_RECOVERY_ARCHIVES,base+'/adoption.md',base+'/owner-adoption.json',base+'/source-baseline.json',base+'/impact-map.json'];
  eq(Object.keys(r.authority_file_hashes??{}).sort(),expected.sort(),'finite authority seals');eq(Object.keys(r.code_sha256??{}).sort(),[...AUTHORING_RECOVERY_CODE].sort(),'finite code seals');
  for(const p of expected)eq(hash(raw(p)),r.authority_file_hashes[p],'authority byte differs: '+p);
  for(const p of AUTHORING_RECOVERY_CODE)eq(hash(normalizedAuthoringRecoveryCode(p,raw(p))),r.code_sha256[p],'code byte differs: '+p);
  const metadata=s=>JSON.parse(s.match(/^<!--tos-doc\n([\s\S]*?)\n-->/)?.[1]??'null');
  for(let i=0;i<2;i++){
   const p=AUTHORING_RECOVERY_AUTHORITY[i],prior=source.files[p],current=metadata(raw(p)),before=metadata(prior),archive=raw(AUTHORING_RECOVERY_ARCHIVES[i]),saved=metadata(archive);
   eq(hash(prior),r.predecessor_file_hashes?.[p],'preserved predecessor hash');eq([before.version,current.version,current.approval.record],['3.0.0','4.0.0',base+'/owner-adoption.json'],'exact3→4 approval');
   eq(saved,{...before,status:'superseded',superseded_by:before.doc_id+'@4.0.0',superseded_on:'2026-10-28'},'archive metadata');eq(archive.split('The original body below is preserved, including its former current-status wording.\n')[1],prior.replace(/^<!--tos-doc\n[\s\S]*?\n-->\n/,'').replace(/^\n+/,''),'archive exact prior body');
  }
  return {...empty,present:true,errors,...(errors.length?{}:{predecessorFiles:{...source.files},revisedPaths:[...AUTHORING_RECOVERY_AUTHORITY],addedPaths:[...AUTHORING_RECOVERY_ARCHIVES,...FILES.map(x=>base+'/'+x)]})};
 }catch(e){fail('missing/malformed evidence: '+e.message);return {...empty,present:true,errors};}
}
