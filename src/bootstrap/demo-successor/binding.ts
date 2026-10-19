import {createHash} from 'node:crypto';
import {validateHostedOrigin} from '../demo-hosted/configuration.js';

/** Integrity proposal, never a credential, capability, approval, or activation flag. */
export interface SuccessorBinding {
 kind:'TEACH_HOSTED_SUCCESSOR_PROPOSAL';execution:'DISABLED';
 sourceCommit:string;sourceTree:string;buildDigest:string;closureDigest:string;
 schema:'teach_v2_demo';lineageDigest:string;modelProofDigest:string;
 nodePatch:string;packageManager:'pnpm@12.8.1';
 projectRef:string;vercelProjectId:string;deploymentId:string;origin:string;
 runtimeCredentialRevision:string;runtimeRole:'teach_v2_demo_runtime';
}
const keys=['kind','execution','sourceCommit','sourceTree','buildDigest','closureDigest','schema','lineageDigest','modelProofDigest','nodePatch','packageManager','projectRef','vercelProjectId','deploymentId','origin','runtimeCredentialRevision','runtimeRole'];
export function captureSuccessorBinding(value:unknown):Readonly<SuccessorBinding>{
 if(!value||typeof value!=='object'||Object.getPrototypeOf(value)!==Object.prototype)throw Error('Invalid binding');
 const descriptors=Object.getOwnPropertyDescriptors(value);
 if(Reflect.ownKeys(value).length!==keys.length||keys.some(k=>!Object.hasOwn(descriptors,k)||!Object.hasOwn(descriptors[k]!,'value')||typeof descriptors[k]!.value!=='string'))throw Error('Invalid binding shape');
 const v=value as SuccessorBinding;
 if(v.kind!=='TEACH_HOSTED_SUCCESSOR_PROPOSAL'||v.execution!=='DISABLED'||v.schema!=='teach_v2_demo'||v.runtimeRole!=='teach_v2_demo_runtime'||v.packageManager!=='pnpm@12.8.1')throw Error('Invalid binding boundary');
 for(const k of ['sourceCommit','sourceTree'] as const)if(!/^[a-f0-9]{40}$(?![\s\S])/.test(v[k]))throw Error('Invalid source');
 for(const k of ['buildDigest','closureDigest','lineageDigest','modelProofDigest'] as const)if(!/^[a-f0-9]{64}$(?![\s\S])/.test(v[k]))throw Error('Invalid digest');
 if(!/^24\.\d+\.\d+$(?![\s\S])/.test(v.nodePatch)||!/^[a-z0-9]{20}$(?![\s\S])/.test(v.projectRef))throw Error('Invalid runtime/target');
 for(const k of ['vercelProjectId','deploymentId','runtimeCredentialRevision'] as const)if(!/^[A-Za-z0-9_-]{1,128}$(?![\s\S])/.test(v[k]))throw Error('Invalid revision');
 validateHostedOrigin(v.origin);
 return Object.freeze(Object.fromEntries(keys.map(k=>[k,descriptors[k]!.value])) as unknown as SuccessorBinding);
}
export function successorBindingDigest(value:unknown){return createHash('sha256').update(JSON.stringify(captureSuccessorBinding(value))).digest('hex');}
