import {createHash} from 'node:crypto';
import {readFileSync,realpathSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {resolve} from 'node:path';
import {DemoError} from '../../modules/authorization/application/demo-error.js';
import {parseStrictJson} from '../../modules/content/domain/demo-content.js';

const PACKAGE='a1df23b03a0f0660a072cff00eb40d3d2fb60bc8c521f12b56977f559601196a';
const REGISTRATION='b94cf7c7c9bab35ad2454470295ae2b04b8814bd0ac55c282cdd3dd6df67218d';
const SEMANTIC_REVIEW='1695c5ff3a884c063323eda27e6905f3af61f4814da8aee8d7ea534aa347f655';
const MAPPING='5cac3a47dc4ac22085fc262c14a89a5f4e9586d7b4dc0004b5ca084bf34c7ae4';
export interface LocalDemoAttestation {
 kind:'LOCAL_ISOLATED_VERIFICATION';version:1;enabled:true;shared_or_production:false;runtime_readiness:'UNDER_TEST';
 candidate_commit:string;candidate_tree:string;package_sha256sums:string;registration_sha256:string;semantic_review_sha256:string;
 physical_admission_sha256:string;physical_mapping_sha256:string;isolated_target_sha256:string;allowed_origin:string;
}
export interface LocalDemoEvidence {candidateCommit:string;candidateTree:string;clean:boolean;packageSha256:string;registrationSha256:string;semanticReviewSha256:string;physicalAdmissionSha256:string;physicalMappingSha256:string;physicalAdmitted:boolean;databaseTargetSha256:string;allowedOrigin:string}
const sha256=(bytes:Uint8Array|string)=>createHash('sha256').update(bytes).digest('hex');
function blocked():never{throw new DemoError('SERVICE_UNAVAILABLE');}
/** A target fingerprint never includes username, password, or database URL query parameters. */
export function isolatedDemoTargetFingerprint(databaseUrl:string,isolatedOptIn:string|undefined):string{
 if(isolatedOptIn!=='1')blocked();let target:URL;try{target=new URL(databaseUrl);}catch{blocked();}
 if(!['postgres:','postgresql:'].includes(target.protocol)||!['127.0.0.1','localhost','[::1]'].includes(target.hostname)||target.search||target.hash||!/^\/teach_v2_demo_[a-z0-9_]+$/.test(target.pathname)||/_(?:prod|production|shared|live)(?:_|$)/.test(target.pathname))blocked();
 return sha256(JSON.stringify({protocol:'postgresql:',host:target.hostname,port:target.port||'5432',database:target.pathname.slice(1)}));
}
/** This gate grants only local verification, never runtime conformance or deployment. */
export function validateLocalDemoActivation(value:unknown,evidence:LocalDemoEvidence):LocalDemoAttestation{
 if(value===null||typeof value!=='object'||Array.isArray(value))blocked();const a=value as LocalDemoAttestation;
 const keys=['kind','version','enabled','shared_or_production','runtime_readiness','candidate_commit','candidate_tree','package_sha256sums','registration_sha256','semantic_review_sha256','physical_admission_sha256','physical_mapping_sha256','isolated_target_sha256','allowed_origin'];
 if(Object.keys(a).length!==keys.length||keys.some(k=>!Object.hasOwn(a,k))||a.kind!=='LOCAL_ISOLATED_VERIFICATION'||a.version!==1||a.enabled!==true||a.shared_or_production!==false||a.runtime_readiness!=='UNDER_TEST'||!evidence.clean||!evidence.physicalAdmitted)blocked();
 if(!/^[a-f0-9]{40}$/.test(a.candidate_commit)||!/^[a-f0-9]{40}$/.test(a.candidate_tree)||a.candidate_commit!==evidence.candidateCommit||a.candidate_tree!==evidence.candidateTree)blocked();
 if(a.package_sha256sums!==PACKAGE||evidence.packageSha256!==PACKAGE||a.registration_sha256!==REGISTRATION||evidence.registrationSha256!==REGISTRATION||a.semantic_review_sha256!==SEMANTIC_REVIEW||evidence.semanticReviewSha256!==SEMANTIC_REVIEW||a.physical_mapping_sha256!==MAPPING||evidence.physicalMappingSha256!==MAPPING)blocked();
 if(!/^[a-f0-9]{64}$/.test(a.physical_admission_sha256)||a.physical_admission_sha256!==evidence.physicalAdmissionSha256||a.isolated_target_sha256!==evidence.databaseTargetSha256||a.allowed_origin!==evidence.allowedOrigin)blocked();
 let origin:URL;try{origin=new URL(a.allowed_origin);}catch{blocked();}
 // localhost is a standards-defined potentially trustworthy context. Actual Secure-cookie browser proof is separately required.
 if(origin.origin!==a.allowed_origin||origin.protocol!=='http:'||origin.hostname!=='localhost'||!origin.port||Number(origin.port)<1024||origin.username||origin.password)blocked();
 return Object.freeze(structuredClone(a));
}
export function executingDemoSourceRoot(requestedRoot:string):string{
 const actual=realpathSync(fileURLToPath(new URL('../../../',import.meta.url)));
 if(realpathSync(requestedRoot)!==actual)blocked();return actual;
}
export function loadLocalDemoActivation(options:{sourceRoot:string;attestationPath:string;attestationSha256:string;databaseUrl:string;isolatedOptIn:string|undefined;allowedOrigin:string}):LocalDemoAttestation{
 try{
  executingDemoSourceRoot(options.sourceRoot);
  if(!/^[a-f0-9]{64}$/.test(options.attestationSha256))blocked();const attestationBytes=readFileSync(options.attestationPath);if(attestationBytes.byteLength>8192||sha256(attestationBytes)!==options.attestationSha256)blocked();
  const root=executingDemoSourceRoot(options.sourceRoot);const read=(path:string)=>readFileSync(resolve(root,path));const git=(args:string[])=>execFileSync('git',args,{cwd:root,encoding:'utf8',timeout:1000,stdio:['ignore','pipe','ignore']}).trim();
  const sums=read('domains/demo-runtime/proposal-0.1.0/SHA256SUMS');
  for(const line of sums.toString('utf8').trim().split('\n')){const match=line.match(/^([a-f0-9]{64})  ([A-Za-z0-9_.-]+)$/);if(!match||sha256(read('domains/demo-runtime/proposal-0.1.0/'+match[2]))!==match[1])blocked();}
  const admissionBytes=read('persistence/physical-slices/demo-runtime/admission.json');const admission=JSON.parse(admissionBytes.toString('utf8'));
  return validateLocalDemoActivation(parseStrictJson(attestationBytes.toString('utf8')),{
   candidateCommit:git(['rev-parse','HEAD']),candidateTree:git(['rev-parse','HEAD^{tree}']),clean:git(['status','--porcelain','--untracked-files=all'])==='',
   packageSha256:sha256(sums),registrationSha256:sha256(read('domains/demo-runtime/registration.json')),semanticReviewSha256:sha256(read('persistence/physical-slices/demo-runtime/semantic-independent-review.md')),
   physicalAdmissionSha256:sha256(admissionBytes),physicalMappingSha256:sha256(read('persistence/physical-slices/demo-runtime/representation.proposed.json')),
   physicalAdmitted:admission.decision==='ADMIT'&&admission.mapping_sha256===MAPPING&&admission.semantic_review?.verdict==='PASS'&&admission.semantic_review?.registration_sha256===REGISTRATION&&admission.criteria?.length===8&&admission.criteria.every((item:{state:string})=>item.state==='PROVEN')&&admission.shared_or_production_migration_execution_authorized===false,
   databaseTargetSha256:isolatedDemoTargetFingerprint(options.databaseUrl,options.isolatedOptIn),allowedOrigin:options.allowedOrigin,
  });
 }catch{blocked();}
}
