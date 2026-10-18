import {isIP} from 'node:net';
import {createHash} from 'node:crypto';
import {DemoError} from '../../modules/authorization/application/demo-error.js';

/** Structural proposal only. No value of this type grants operational authority. */
export interface HostedBindingProposal {
 kind:'HOSTED_DEMO_BINDING_PROPOSAL'; version:1; execution:'DISABLED';
 provider:'VERCEL_SUPABASE';
 source:{commit:string;tree:string;buildDigest:string;manifestDigest:string};
 authority:{packageDigest:string;registrationDigest:string;admissionDigest:string;mappingDigest:string;migrationDigest:string};
 runtime:{node:'20.20.2';packageManager:'pnpm@12.8.1'};
 vercel:{teamId:string;projectId:string;environment:'preview'|'production';deploymentId:string;origin:string};
 supabase:{projectRef:string;endpoint:{host:string;port:6543;database:'postgres';mode:'transaction'}};
 secretRevisions:{runtime:string;scheduler:string};
 migrationHead:'0005_demo_runtime_owner_storage';
}
const unavailable=():never=>{throw new DemoError('SERVICE_UNAVAILABLE');};
function object(value:unknown,keys:readonly string[]):Record<string,unknown>{
 if(value===null||typeof value!=='object'||Array.isArray(value)||Object.getPrototypeOf(value)!==Object.prototype)return unavailable();
 const descriptors=Object.getOwnPropertyDescriptors(value);
 if(Reflect.ownKeys(value).length!==keys.length||keys.some(k=>!Object.hasOwn(descriptors,k)||!Object.hasOwn(descriptors[k]!,'value')))return unavailable();
 return value as Record<string,unknown>;
}
function match(value:unknown,pattern:RegExp):string{if(typeof value!=='string'||!pattern.test(value))return unavailable();return value;}
const sha=/^[a-f0-9]{64}$(?![\s\S])/,git=/^[a-f0-9]{40}$(?![\s\S])/;
const opaque=/^[A-Za-z0-9_-]{1,128}$(?![\s\S])/;
export function validateHostedOrigin(value:unknown):string{
 if(typeof value!=='string')return unavailable();
 let url:URL;try{url=new URL(value);}catch{return unavailable();}
 if(url.protocol!=='https:'||url.origin!==value||url.port||url.username||url.password||isIP(url.hostname)||!url.hostname.includes('.')||! /^[a-z0-9]+(?:[a-z0-9.-]*[a-z0-9])?$/.test(url.hostname)||url.hostname.endsWith('.localhost')||url.hostname.endsWith('.local')||url.hostname.split('.').some(label=>!label||label.startsWith('-')||label.endsWith('-')))return unavailable();
 return value;
}
/** Validates and captures every selector. It neither verifies a provider nor enables a factory. */
export function validateHostedBindingProposal(value:unknown):HostedBindingProposal{
 const v=object(value,['kind','version','execution','provider','source','authority','runtime','vercel','supabase','secretRevisions','migrationHead']);
 if(v.kind!=='HOSTED_DEMO_BINDING_PROPOSAL'||v.version!==1||v.execution!=='DISABLED'||v.provider!=='VERCEL_SUPABASE'||v.migrationHead!=='0005_demo_runtime_owner_storage')return unavailable();
 const s=object(v.source,['commit','tree','buildDigest','manifestDigest']),a=object(v.authority,['packageDigest','registrationDigest','admissionDigest','mappingDigest','migrationDigest']);
 const r=object(v.runtime,['node','packageManager']);if(r.node!=='20.20.2'||r.packageManager!=='pnpm@12.8.1')return unavailable();
 const p=object(v.vercel,['teamId','projectId','environment','deploymentId','origin']);if(p.environment!=='preview'&&p.environment!=='production')return unavailable();
 const d=object(v.supabase,['projectRef','endpoint']),e=object(d.endpoint,['host','port','database','mode']),secrets=object(v.secretRevisions,['runtime','scheduler']);
 if(e.port!==6543||e.database!=='postgres'||e.mode!=='transaction')return unavailable();
 const result:HostedBindingProposal={kind:v.kind,version:1,execution:'DISABLED',provider:'VERCEL_SUPABASE',source:{commit:match(s.commit,git),tree:match(s.tree,git),buildDigest:match(s.buildDigest,sha),manifestDigest:match(s.manifestDigest,sha)},authority:{packageDigest:match(a.packageDigest,sha),registrationDigest:match(a.registrationDigest,sha),admissionDigest:match(a.admissionDigest,sha),mappingDigest:match(a.mappingDigest,sha),migrationDigest:match(a.migrationDigest,sha)},runtime:{node:'20.20.2',packageManager:'pnpm@12.8.1'},vercel:{teamId:match(p.teamId,opaque),projectId:match(p.projectId,opaque),environment:p.environment,deploymentId:match(p.deploymentId,opaque),origin:validateHostedOrigin(p.origin)},supabase:{projectRef:match(d.projectRef,/^[a-z0-9]{20}$(?![\s\S])/),endpoint:{host:match(e.host,/^[a-z0-9]+(?:[a-z0-9-]*[a-z0-9])?\.pooler\.supabase\.com$(?![\s\S])/),port:6543,database:'postgres',mode:'transaction'}},secretRevisions:{runtime:match(secrets.runtime,opaque),scheduler:match(secrets.scheduler,opaque)},migrationHead:'0005_demo_runtime_owner_storage'};
 if(result.authority.packageDigest!=='a1df23b03a0f0660a072cff00eb40d3d2fb60bc8c521f12b56977f559601196a'||result.authority.registrationDigest!=='b94cf7c7c9bab35ad2454470295ae2b04b8814bd0ac55c282cdd3dd6df67218d')return unavailable();
 return result;
}
export function hostedBindingDigest(value:unknown):string{return createHash('sha256').update(JSON.stringify(validateHostedBindingProposal(value))).digest('hex');}
/** Equality is an integrity check, NOT authentication or deployment approval. */
export function assertHostedBindingMatches(proposed:unknown,observed:unknown):HostedBindingProposal{
 const p=validateHostedBindingProposal(proposed),o=validateHostedBindingProposal(observed);
 if(JSON.stringify(p)!==JSON.stringify(o))return unavailable();return p;
}
