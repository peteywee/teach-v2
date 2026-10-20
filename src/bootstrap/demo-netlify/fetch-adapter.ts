import {validateHostedOrigin} from '../demo-hosted/configuration.js';
import {hostedFailure} from '../demo-hosted/transport.js';
import {inspectHostedRuntime} from '../demo-hosted/runtime-policy.js';

/** LOCAL PREPARATION SEAM ONLY. Fetch has already lost raw target/header/framing
 * evidence. These observable checks supplement, never replace, the Node adapter.
 * No provider entrypoint may use this seam until that evidence gap is resolved. */
export function validateNetlifyFetchRequest(request:Request, allowedOrigin:string):void {
 const origin=validateHostedOrigin(allowedOrigin),url=new URL(request.url);
 if(url.origin!==origin||url.username||url.password||url.hash||request.headers.get('host')!==url.host)throw Error('INVALID_REQUEST');
 for(const name of ['host','origin','cookie','content-length','content-type','sec-fetch-site','idempotency-key']){
  const value=request.headers.get(name);if(value!==null&&/[\r\n,]/.test(value))throw Error('INVALID_REQUEST');
 }
 // Transfer framing is never interpreted or trusted after Fetch conversion.
 if(request.headers.has('transfer-encoding'))throw Error('INVALID_REQUEST');
 const length=request.headers.get('content-length');
 if(length!==null&&(!/^(?:0|[1-9]\d*)$/.test(length)||Number(length)>65536))throw Error('INVALID_REQUEST');
 if((request.method==='GET'||request.method==='HEAD')&&(request.body!==null||length!==null&&length!=='0'))throw Error('INVALID_REQUEST');
 if(request.bodyUsed)throw Error('INVALID_REQUEST');
}
export interface PreparedFetchRuntime {origin:string;handle:(request:Request)=>Promise<Response>}
/** Singleton fail-closed initializer for local dependency-injected tests. Never
 * receives request-selected configuration and never retries failed initialization. */
export function createPreparedNetlifyHandler(options:{buildNodeVersion:unknown;initialize:()=>Promise<PreparedFetchRuntime>}){
 const initialized=(async()=>{
  try{
   if(!inspectHostedRuntime(options.buildNodeVersion).verified)throw Error('Runtime mismatch');
   const runtime=await options.initialize();const origin=validateHostedOrigin(runtime.origin);
   const handle=runtime.handle.bind(runtime);return Object.freeze({origin,handle});
  }catch{return null;}
 })();
 return async(request:Request):Promise<Response>=>{
  const runtime=await initialized;if(!runtime)return hostedFailure('SERVICE_UNAVAILABLE');
  try{validateNetlifyFetchRequest(request,runtime.origin);}catch{return hostedFailure('INVALID_REQUEST');}
  try{return await runtime.handle(request);}catch{return hostedFailure('SERVICE_UNAVAILABLE');}
 };
}
