import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import type { DemoApplicationPort, DemoInput, DemoOperation } from './application-port.js';
import { DemoError, type DemoErrorCode } from '../../modules/authorization/application/demo-error.js';
import { deriveSessionVerifier } from '../../modules/identity/domain/application-session.js';
import { isExactSemver, parseStrictJson } from '../../modules/content/domain/demo-content.js';

const scope='/api/v1/organizations/{organizationId}/locations/{locationId}';
export const DEMO_ROUTES:ReadonlyArray<{method:string;path:string;operation:DemoOperation;status:number}>=Object.freeze([
  {method:'GET',path:'/api/v1/session',operation:'ReadCurrentSession',status:200},
  {method:'DELETE',path:'/api/v1/session',operation:'RevokeApplicationSession',status:204},
  {method:'GET',path:'/api/v1/memberships',operation:'ListOwnMemberships',status:200},
  {method:'GET',path:scope+'/team',operation:'ListTeam',status:200},
  {method:'GET',path:scope+'/team/{identityId}/learner-state',operation:'ReadTeamMemberLearnerState',status:200},
  {method:'POST',path:scope+'/assignments',operation:'AssignContent',status:201},
  {method:'GET',path:scope+'/assignments/mine',operation:'ListOwnAssignments',status:200},
  {method:'GET',path:scope+'/content/{contentPackId}/versions/{contentVersion}',operation:'ReadAssignedContentVersion',status:200},
  {method:'POST',path:scope+'/learning-sessions',operation:'StartLearningSession',status:201},
  {method:'POST',path:scope+'/learning-sessions/{learningSessionId}/progress-events',operation:'RecordProgressEvent',status:201},
  {method:'POST',path:scope+'/learning-sessions/{learningSessionId}/complete',operation:'CompleteLearningSession',status:200},
  {method:'GET',path:scope+'/learner-state/mine',operation:'ReadOwnLearnerState',status:200},
  {method:'POST',path:'/api/v1/demo/start',operation:'BeginDemoRun',status:201},
  {method:'POST',path:'/api/v1/demo/persona',operation:'SwitchDemoPersona',status:200},
  {method:'POST',path:'/api/v1/demo/close',operation:'CloseDemoRun',status:204},
].map(route=>Object.freeze(route)) as Array<{method:string;path:string;operation:DemoOperation;status:number}>);
const errorSchema=JSON.parse(readFileSync(new URL('../../../domains/demo-runtime/proposal-0.1.0/baseline-error-envelope.schema.json',import.meta.url),'utf8')) as {'x-status-by-code':Record<DemoErrorCode,number>;'x-messages':Record<DemoErrorCode,string>};
const identifier=/^[A-Za-z0-9_-]{1,128}$(?![\s\S])/;
const receiptOperations=new Set<DemoOperation>(['AssignContent','StartLearningSession','RecordProgressEvent']);
const listOperations=new Set<DemoOperation>(['ListTeam','ListOwnAssignments','ReadOwnLearnerState','ReadTeamMemberLearnerState']);
const stateOperations=new Set<DemoOperation>(['ReadOwnLearnerState','ReadTeamMemberLearnerState']);
const cookieAttributes='; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=';
const clearCookie='__Host-teach_session='+cookieAttributes+'0';
function invalid():never{throw new DemoError('INVALID_REQUEST');}
function cookieCredential(header:string|null):string|null{
  if(!header)return null;
  const found=header.split(';').map(part=>part.trim()).filter(part=>part.split('=',1)[0]==='__Host-teach_session');
  if(found.length!==1)return null;
  const value=found[0]!.slice('__Host-teach_session='.length);
  try{deriveSessionVerifier(value);return value;}catch{return null;}
}
function queryInput(url:URL,operation:DemoOperation):DemoInput['query']{
  const allowed=new Set<string>(listOperations.has(operation)?['limit','cursor']:[]);if(stateOperations.has(operation))allowed.add('assignmentId');
  for(const key of url.searchParams.keys())if(!allowed.has(key)||url.searchParams.getAll(key).length!==1)invalid();
  const rawLimit=url.searchParams.get('limit');if(rawLimit!==null&&!/^(?:[1-9]|[1-4][0-9]|50)$/.test(rawLimit))invalid();
  const cursor=url.searchParams.get('cursor');
  if(cursor!==null){
    if(cursor.length>512||!/^[-_A-Za-z0-9]+$/.test(cursor))invalid();
    try{const bytes=Buffer.from(cursor,'base64url');if(bytes.toString('base64url')!==cursor)invalid();const tuple=parseStrictJson(new TextDecoder('utf-8',{fatal:true}).decode(bytes));if(!Array.isArray(tuple)||tuple.length!==(operation==='ListTeam'?1:2)||tuple.some(x=>typeof x!=='string'))invalid();if(Buffer.from(JSON.stringify(tuple)).toString('base64url')!==cursor)invalid();}catch{invalid();}
  }
  const assignmentId=url.searchParams.get('assignmentId');if(assignmentId!==null&&!identifier.test(assignmentId))invalid();
  return {limit:rawLimit===null?20:Number(rawLimit),cursor,assignmentId};
}
async function boundedBody(request:Request):Promise<string>{
  const size=request.headers.get('content-length');if(size!==null&&(!/^\d+$/.test(size)||Number(size)>65536))invalid();
  if(!request.body)return '';
  const reader=request.body.getReader();let length=0;const chunks:Uint8Array[]=[];
  try{for(;;){const item=await reader.read();if(item.done)break;length+=item.value.byteLength;if(length>65536){await reader.cancel();invalid();}chunks.push(item.value);}return new TextDecoder('utf-8',{fatal:true}).decode(Buffer.concat(chunks));}catch(error){if(error instanceof DemoError)throw error;invalid();}finally{reader.releaseLock();}
}
function bodyInput(text:string,operation:DemoOperation,method:string):Record<string,unknown>{
  if(method!=='POST'){if(text!=='')invalid();return {};}
  let value:unknown;try{value=parseStrictJson(text,{allowFractionalNumbers:true});}catch{invalid();}
  if(value===null||typeof value!=='object'||Array.isArray(value))invalid();
  const body=value as Record<string,unknown>;
  const fields:Partial<Record<DemoOperation,readonly string[]>>={AssignContent:['identityId','contentPackId','contentVersion'],StartLearningSession:['assignmentId'],RecordProgressEvent:['blockId','selectedOptionIndex'],SwitchDemoPersona:['organizationId','locationId','persona'],CloseDemoRun:['organizationId','locationId']};
  const keys=fields[operation]??[];if(Object.keys(body).length!==keys.length||keys.some(key=>!Object.hasOwn(body,key)))invalid();
  for(const key of keys){const value=body[key];if(key==='contentVersion'){if(value===null||typeof value!=='object'||Array.isArray(value))invalid();const version=value as Record<string,unknown>;if(Object.keys(version).length!==2||!isExactSemver(version.version)||typeof version.digest!=='string'||!/^sha256:[0-9a-f]{64}$(?![\s\S])/.test(version.digest))invalid();}else if(key==='persona'){if(value!=='LEARNER'&&value!=='MANAGER')invalid();}else if(key==='selectedOptionIndex'){if(typeof value!=='number'||!Number.isInteger(value)||value<0||value>4)invalid();}else if(typeof value!=='string'||!identifier.test(value))invalid();}
  return body;
}
/** Pure HTTP adapter. No listener or global activation is created by constructing it. */
export function createDemoHttpHandler(options:{application:DemoApplicationPort;allowedOrigin:string}):(request:Request)=>Promise<Response>{
  const origin=new URL(options.allowedOrigin);if(origin.origin!==options.allowedOrigin||!['http:','https:'].includes(origin.protocol)||origin.username||origin.password)throw new DemoError('SERVICE_UNAVAILABLE');
  return async request=>{
    const requestId=randomUUID();const headers=new Headers({'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
    try{
      const url=new URL(request.url);const route=DEMO_ROUTES.find(route=>route.method===request.method&&new RegExp('^'+route.path.replace(/\{[A-Za-z]+\}/g,'([^/]+)')+'$').test(url.pathname));
      if(!route)throw new DemoError('NOT_FOUND');
      if(route.method!=='GET'){
        if(request.headers.get('Origin')!==options.allowedOrigin||(request.headers.has('Sec-Fetch-Site')&&request.headers.get('Sec-Fetch-Site')!=='same-origin')){
          try{await options.application.recordOriginDenial?.(requestId,route.operation);}catch{/* The rejected request remains rejected. */}throw new DemoError('FORBIDDEN');
        }
        if(!/^application\/json(?:\s*;\s*charset=utf-8)?$/i.test(request.headers.get('Content-Type')??''))throw new DemoError('UNSUPPORTED_MEDIA_TYPE');
      }
      const credential=cookieCredential(request.headers.get('Cookie'));if(route.operation!=='BeginDemoRun'&&credential===null)throw new DemoError('UNAUTHENTICATED');
      const query=queryInput(url,route.operation);
      const params:Record<string,string>={};const names=[...route.path.matchAll(/\{([A-Za-z]+)\}/g)].map(match=>match[1]!);const matches=url.pathname.match(new RegExp('^'+route.path.replace(/\{[A-Za-z]+\}/g,'([^/]+)')+'$'))!;
      for(let index=0;index<names.length;index++){let value:string;try{value=decodeURIComponent(matches[index+1]!);}catch{invalid();}if(names[index]==='contentVersion'?!isExactSemver(value):!identifier.test(value))invalid();params[names[index]!]=value;}
      const idempotencyKey=request.headers.get('Idempotency-Key');if(receiptOperations.has(route.operation)?!idempotencyKey||!/^[-_A-Za-z0-9]{16,128}$/.test(idempotencyKey):idempotencyKey!==null)invalid();
      const rawBody=await boundedBody(request);let validated:DemoInput|undefined;
      const result=await options.application.execute({operation:route.operation,requestId,credential,admissionPrefix:'SHARED_UNKNOWN',readInput(){validated??={params,body:bodyInput(rawBody,route.operation,route.method),query,idempotencyKey};return structuredClone(validated);}});
      if(result.issuedCredential!==undefined){try{deriveSessionVerifier(result.issuedCredential);}catch{throw new DemoError('SERVICE_UNAVAILABLE');}if(route.operation!=='BeginDemoRun'&&route.operation!=='SwitchDemoPersona')throw new DemoError('SERVICE_UNAVAILABLE');headers.set('Set-Cookie','__Host-teach_session='+result.issuedCredential+cookieAttributes+'43200');}
      else if(result.clearCookie)headers.set('Set-Cookie',clearCookie);
      if(route.status===204)return new Response(null,{status:204,headers});
      headers.set('Content-Type','application/json; charset=utf-8');return new Response(JSON.stringify(result.body),{status:route.status,headers});
    }catch(error){
      const failure=error instanceof DemoError?error:new DemoError('SERVICE_UNAVAILABLE');headers.delete('Set-Cookie');if(failure.code==='UNAUTHENTICATED')headers.set('Set-Cookie',clearCookie);
      const wire:{code:DemoErrorCode;message:string;requestId:string;retryAfterSeconds?:number}={code:failure.code,message:errorSchema['x-messages'][failure.code],requestId};
      if(failure.retryAfterSeconds!==undefined){headers.set('Retry-After',String(failure.retryAfterSeconds));wire.retryAfterSeconds=failure.retryAfterSeconds;}
      headers.set('Content-Type','application/json; charset=utf-8');return new Response(JSON.stringify({error:wire}),{status:errorSchema['x-status-by-code'][failure.code],headers});
    }
  };
}
