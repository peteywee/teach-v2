/** EXCLUDED FROM HOSTED PACKAGE. Explicit test-only evidence injection, never an authorizer. */
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {assertHostedBindingMatches,type HostedBindingProposal} from '../../src/bootstrap/demo-hosted/configuration.js';
import {prepareHostedPoolPolicy} from '../../src/bootstrap/demo-hosted/pool.js';
import {createHostedDemoTransport,type HostedStaticAsset} from '../../src/bootstrap/demo-hosted/transport.js';
import {assertEmptyExpiryInvocation,validateExpiryBatchResult,type HostedExpiryPort} from '../../src/bootstrap/demo-hosted/expiry.js';
import type {DemoApplicationPort} from '../../src/bootstrap/demo/application-port.js';
import {DemoError} from '../../src/modules/authorization/application/demo-error.js';
export const origin='https://demo.example.test';
export function binding():HostedBindingProposal{return {kind:'HOSTED_DEMO_BINDING_PROPOSAL',version:1,execution:'DISABLED',provider:'VERCEL_SUPABASE',source:{commit:'a'.repeat(40),tree:'b'.repeat(40),buildDigest:'c'.repeat(64),manifestDigest:'d'.repeat(64)},authority:{packageDigest:'a1df23b03a0f0660a072cff00eb40d3d2fb60bc8c521f12b56977f559601196a',registrationDigest:'b94cf7c7c9bab35ad2454470295ae2b04b8814bd0ac55c282cdd3dd6df67218d',admissionDigest:'e'.repeat(64),mappingDigest:'f'.repeat(64),migrationDigest:'0'.repeat(64)},runtime:{node:'20.20.2',packageManager:'pnpm@12.8.1'},vercel:{teamId:'synthetic_team',projectId:'synthetic_project',environment:'preview',deploymentId:'synthetic_deployment',origin},supabase:{projectRef:'a'.repeat(20),endpoint:{host:'aws-0-us-east-1.pooler.supabase.com',port:6543,database:'postgres',mode:'transaction'}},secretRevisions:{runtime:'opaque_revision_1',scheduler:'opaque_revision_2'},migrationHead:'0005_demo_runtime_owner_storage'};}
export function assets():Map<string,HostedStaticAsset>{
 const definitions=JSON.parse(readFileSync(new URL('../../src/web/demo/assets.json',import.meta.url),'utf8')) as Array<{path:string;file:string;contentType:string}>;
 return new Map(definitions.map(row=>{const bytes=readFileSync(new URL('../../src/web/demo/'+row.file,import.meta.url));return [row.path,{bytes,contentType:row.contentType,sha256:createHash('sha256').update(bytes).digest('hex')}];}));
}
export async function testOnlyCompose(options:{proposed:unknown;verify:()=>Promise<unknown>;poolFactory:()=>Promise<unknown>;applicationFactory:(pool:unknown)=>DemoApplicationPort;poolPolicy?:unknown}){
 const observed=await options.verify();if(!observed)throw new DemoError('SERVICE_UNAVAILABLE');
 const captured=assertHostedBindingMatches(options.proposed,observed);prepareHostedPoolPolicy(captured,options.poolPolicy);
 const pool=await options.poolFactory();
 return createHostedDemoTransport({application:options.applicationFactory(pool),allowedOrigin:captured.vercel.origin,assets:assets()});
}
export async function testOnlyExpiry(request:Request,verify:()=>Promise<boolean>,factory:()=>HostedExpiryPort):Promise<number>{
 if(!await verify())throw new DemoError('FORBIDDEN');await assertEmptyExpiryInvocation(request);
 return validateExpiryBatchResult(await factory().expireDueRuns());
}
export function request(path:string,method='GET',body?:BodyInit,headers:Record<string,string>={}):Request{
 return new Request(origin+path,{method,headers:{Host:new URL(origin).host,...(method==='GET'?{}:{Origin:origin,'Content-Type':'application/json'}),...headers},...(body===undefined?{}:{body})});
}
