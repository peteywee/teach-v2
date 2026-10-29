import {randomUUID,createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {createAuthoringHttpHandler} from '../demo-authoring/http.js';
import type {AuthoringApplication} from '../demo-authoring/application.js';
import {createDemoHttpHandler,DEMO_ROUTES} from '../demo/http.js';
import type {DemoApplicationPort} from '../demo/application-port.js';
import {DemoError} from '../../modules/authorization/application/demo-error.js';
import {validateHostedOrigin} from './configuration.js';

export const HOSTED_CSP="default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; object-src 'none'; form-action 'self'";
const security={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':HOSTED_CSP};
const errors=JSON.parse(readFileSync(new URL('../../../domains/demo-runtime/proposal-0.1.0/baseline-error-envelope.schema.json',import.meta.url),'utf8')) as {'x-status-by-code':Record<string,number>;'x-messages':Record<string,string>};
export function hostedFailure(code:'SERVICE_UNAVAILABLE'|'FORBIDDEN'|'INVALID_REQUEST'):Response{
 return new Response(JSON.stringify({error:{code,message:errors['x-messages'][code],requestId:randomUUID()}}),{status:errors['x-status-by-code'][code]!,headers:{...security,'Content-Type':'application/json; charset=utf-8'}});
}
export interface HostedStaticAsset {bytes:Uint8Array;contentType:string;sha256:string}
const assetTypes:Readonly<Record<string,string>>=Object.freeze({'/':'text/html; charset=utf-8','/assets/styles.css':'text/css; charset=utf-8','/assets/app.mjs':'text/javascript; charset=utf-8','/assets/api.mjs':'text/javascript; charset=utf-8','/assets/controller.mjs':'text/javascript; charset=utf-8','/assets/views.mjs':'text/javascript; charset=utf-8','/assets/wire-contract.mjs':'text/javascript; charset=utf-8'});
/** Pure unmounted transport. This does not admit hosting or authenticate dependencies.
 * A later approved composition must bind package bytes before invoking this seam. */
type HostedOptions={application:DemoApplicationPort;allowedOrigin:string;assets:ReadonlyMap<string,HostedStaticAsset>};
export function createHostedDemoTransport(options:HostedOptions):(request:Request)=>Promise<Response>{return createTransport(options,false);}
export function createHostedAuthoringTransport(options:Omit<HostedOptions,'application'>&{application:AuthoringApplication}):(request:Request)=>Promise<Response>{return createTransport(options,true);}
function createTransport(options:HostedOptions,authoring:boolean):(request:Request)=>Promise<Response>{
 const admittedAssets=authoring?{...assetTypes,...Object.fromEntries(['authoring-api.mjs','authoring-model.mjs','authoring-views.mjs','authoring-wire.mjs','authoring-controller.mjs'].map(file=>['/assets/'+file,'text/javascript; charset=utf-8']))}:assetTypes;
 const allowedOrigin=validateHostedOrigin(options.allowedOrigin),host=new URL(allowedOrigin).host;
 if(options.assets.size!==Object.keys(admittedAssets).length)throw new DemoError('SERVICE_UNAVAILABLE');
 const assets=new Map<string,{bytes:Uint8Array;contentType:string}>();
 for(const [path,type] of Object.entries(admittedAssets)){
  const asset=options.assets.get(path);if(!asset||asset.contentType!==type||asset.bytes.byteLength>5*1024*1024||createHash('sha256').update(asset.bytes).digest('hex')!==asset.sha256)throw new DemoError('SERVICE_UNAVAILABLE');
  assets.set(path,{bytes:Uint8Array.from(asset.bytes),contentType:type});
 }
 const handler=authoring?createAuthoringHttpHandler({application:options.application as AuthoringApplication,allowedOrigin}):createDemoHttpHandler({application:options.application,allowedOrigin});
 return async request=>{
  let url:URL;try{url=new URL(request.url);}catch{return hostedFailure('INVALID_REQUEST');}
  if(url.origin!==allowedOrigin||request.headers.get('Host')!==host||url.username||url.password||url.hash)return hostedFailure('INVALID_REQUEST');
  const origin=request.headers.get('Origin');
  // Unsafe API origin checks stay in the original handler, including its denial audit.
  if(request.method==='GET'&&(origin!==null&&origin!==allowedOrigin||request.headers.has('Sec-Fetch-Site')&&request.headers.get('Sec-Fetch-Site')!=='same-origin'&&request.headers.get('Sec-Fetch-Site')!=='none'))return hostedFailure('FORBIDDEN');
  const asset=assets.get(url.pathname);
  if(request.method==='GET'&&asset&&!url.search)return new Response(Uint8Array.from(asset.bytes),{status:200,headers:{...security,'Content-Type':asset.contentType}});
  // Pass the original Request stream unchanged. No JSON parsing, reserialization,
  // proxy/IP trust, automatic mutation retries or credential translation here.
  const response=await handler(request);for(const [key,value] of Object.entries(security))response.headers.set(key,value);return response;
 };
}
/** Inventory alias only, not route mounting or a second route catalog. */
export const HOSTED_DEMO_ROUTE_INVENTORY=DEMO_ROUTES;
