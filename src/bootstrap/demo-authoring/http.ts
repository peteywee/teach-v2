import {randomUUID} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {createDemoHttpHandler} from '../demo/http.js';
import {AuthoringRequestValidationError,type AuthoringApplication,type AuthoringInput} from './application.js';
import type {AuthoringOperation} from '../../modules/authorization/application/demo-authoring-authorization.js';
import {DemoError,type DemoErrorCode} from '../../modules/authorization/application/demo-error.js';
import {deriveSessionVerifier} from '../../modules/identity/domain/application-session.js';
import {parseStrictJson} from '../../modules/content/domain/demo-content.js';
const pack=JSON.parse(readFileSync(new URL('../../../domains/demo-authoring/proposal-0.1.0/authoring-operations.json',import.meta.url),'utf8'));
export const AUTHORING_ROUTES:ReadonlyArray<{method:string;path:string;operation:AuthoringOperation;success_status:200}>=Object.freeze(pack.routes.map((r:any)=>Object.freeze({method:r.method,path:r.path,operation:r.operation,success_status:r.success_status})));
const errors=JSON.parse(readFileSync(new URL('../../../domains/demo-runtime/proposal-0.1.0/baseline-error-envelope.schema.json',import.meta.url),'utf8')) as {'x-status-by-code':Record<DemoErrorCode,number>;'x-messages':Record<DemoErrorCode,string>};
const identifier=/^[A-Za-z0-9_-]{1,128}$(?![\s\S])/;const keyPattern=/^[-_A-Za-z0-9]{16,128}$(?![\s\S])/;const digest=/^sha256:[0-9a-f]{64}$(?![\s\S])/;
const clearCookie='__Host-teach_session=; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=0';
function invalid():never{throw new DemoError('INVALID_REQUEST');}
function credential(header:string|null){if(!header)return null;const found=header.split(';').map(x=>x.trim()).filter(x=>x.split('=',1)[0]==='__Host-teach_session');if(found.length!==1)return null;const value=found[0]!.slice('__Host-teach_session='.length);try{deriveSessionVerifier(value);return value;}catch{return null;}}
function exact(value:unknown,keys:string[]):value is Record<string,unknown>{return value!==null&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).length===keys.length&&keys.every(k=>Object.hasOwn(value,k));}
function ref(value:unknown){if(!exact(value,['contentPackId','version','digest'])||typeof value.contentPackId!=='string'||!identifier.test(value.contentPackId)||typeof value.version!=='string'||!/^1\.2\.(?:[0-9]|10)$/.test(value.version)||typeof value.digest!=='string'||!digest.test(value.digest))invalid();}
function bodyInput(text:string,operation:AuthoringOperation,method:string){if(method==='GET'){if(text!=='')invalid();return {};}
 let body:unknown;try{body=parseStrictJson(text,{allowFractionalNumbers:true});}catch{invalid();}
 if(operation==='SaveContentDraft'){
  if(!exact(body,['expectedRevision','mode','catalog'])&&!exact(body,['expectedRevision','mode','publishedContentRef']))invalid();
  if(!Number.isSafeInteger(body.expectedRevision)||(body.expectedRevision as number)<0||(body.expectedRevision as number)>100)invalid();
  if(body.mode==='replace'){if(!Object.hasOwn(body,'catalog'))invalid();}else if(body.mode==='restorePublished'){ref(body.publishedContentRef);}else invalid();return body;
 }
 if(!exact(body,['expectedRevision','draftDigest'])||!Number.isSafeInteger(body.expectedRevision)||(body.expectedRevision as number)<1||(body.expectedRevision as number)>100||typeof body.draftDigest!=='string'||!digest.test(body.draftDigest))invalid();return body;
}
async function boundedBody(request:Request){const length=request.headers.get('Content-Length');if(length!==null&&(!/^\d+$/.test(length)||Number(length)>65536))invalid();if(!request.body)return '';const reader=request.body.getReader();let size=0;const chunks:Uint8Array[]=[];try{for(;;){const item=await reader.read();if(item.done)break;size+=item.value.byteLength;if(size>65536){await reader.cancel();invalid();}chunks.push(item.value);}return new TextDecoder('utf-8',{fatal:true}).decode(Buffer.concat(chunks));}catch(error){if(error instanceof DemoError)throw error;invalid();}finally{reader.releaseLock();}}
/** Exactly five opt-in manager routes; the frozen fifteen-route handler is delegated unchanged. */
export function createAuthoringHttpHandler(options:{application:AuthoringApplication;allowedOrigin:string}):(request:Request)=>Promise<Response>{
 const legacy=createDemoHttpHandler(options);
 return async request=>{
  const url=new URL(request.url),route=AUTHORING_ROUTES.find(r=>r.method===request.method&&new RegExp('^'+r.path.replace(/\{[A-Za-z]+\}/g,'([^/]+)')+'$').test(url.pathname));if(!route)return legacy(request);
  const requestId=randomUUID(),headers=new Headers({'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Content-Type':'application/json; charset=utf-8'});
  try{
   if(route.method==='POST'){
    if(request.headers.get('Origin')!==options.allowedOrigin||(request.headers.has('Sec-Fetch-Site')&&request.headers.get('Sec-Fetch-Site')!=='same-origin')){try{await options.application.recordOriginDenial(requestId,route.operation);}catch{}throw new DemoError('FORBIDDEN');}
    if(!/^application\/json(?:\s*;\s*charset=utf-8)?$/i.test(request.headers.get('Content-Type')??''))throw new DemoError('UNSUPPORTED_MEDIA_TYPE');
   }
   const presented=credential(request.headers.get('Cookie'));if(!presented)throw new DemoError('UNAUTHENTICATED');
   const params:Record<string,string>={},names=[...route.path.matchAll(/\{([A-Za-z]+)\}/g)].map(m=>m[1]!),matches=url.pathname.match(new RegExp('^'+route.path.replace(/\{[A-Za-z]+\}/g,'([^/]+)')+'$'))!;
   for(let i=0;i<names.length;i++){let value:string;try{value=decodeURIComponent(matches[i+1]!);}catch{invalid();}if(!(names[i]==='key'?keyPattern:identifier).test(value))invalid();params[names[i]!]=value;}
   const allowed=route.operation==='PreviewContentDraft'?['revision']:route.operation==='ReadAuthoringOperation'?['operation']:[];
   if([...url.searchParams.keys()].some(k=>!allowed.includes(k)||url.searchParams.getAll(k).length!==1)||allowed.some(k=>!url.searchParams.has(k)))invalid();
   const query:AuthoringInput['query']={limit:20,cursor:null,assignmentId:null};
   if(route.operation==='PreviewContentDraft'){const value=url.searchParams.get('revision')!;if(!/^(?:[1-9]|[1-9][0-9]|100)$/.test(value))invalid();query.revision=Number(value);}
   if(route.operation==='ReadAuthoringOperation'){const op=url.searchParams.get('operation');if(op!=='SaveContentDraft'&&op!=='PublishContentDraft')invalid();query.operation=op;}
   const idempotencyKey=request.headers.get('Idempotency-Key');if(route.method==='POST'?!idempotencyKey||!keyPattern.test(idempotencyKey):idempotencyKey!==null)invalid();
   const raw=await boundedBody(request);let validated:AuthoringInput|undefined;
   const result=await options.application.execute({operation:route.operation,requestId,credential:presented,admissionPrefix:'SHARED_UNKNOWN',readInput(){validated??={params,body:bodyInput(raw,route.operation,route.method),query,idempotencyKey};return structuredClone(validated);}});
   if(result.issuedCredential!==undefined||result.clearCookie)throw new DemoError('SERVICE_UNAVAILABLE');const encoded=JSON.stringify(result.body);if(!encoded||Buffer.byteLength(encoded)>262144)throw new DemoError('SERVICE_UNAVAILABLE');return new Response(encoded,{status:200,headers});
  }catch(error){const failure=error instanceof DemoError?error:new DemoError('SERVICE_UNAVAILABLE');if(failure.code==='UNAUTHENTICATED')headers.set('Set-Cookie',clearCookie);const wire:Record<string,unknown>={code:failure.code,message:errors['x-messages'][failure.code],requestId};if(failure instanceof AuthoringRequestValidationError)wire.details=failure.details;if(failure.retryAfterSeconds!==undefined){wire.retryAfterSeconds=failure.retryAfterSeconds;headers.set('Retry-After',String(failure.retryAfterSeconds));}return new Response(JSON.stringify({error:wire}),{status:errors['x-status-by-code'][failure.code],headers});}
 };
}
