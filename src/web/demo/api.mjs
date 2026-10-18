import { definitions, errorContract } from './wire-contract.mjs';
export class ApiError extends Error {
 constructor(kind, {status=0, code='', requestId=null, retryAfterSeconds=null}={}) { super(kind); this.name='ApiError';Object.assign(this,{kind,status,code,requestId,retryAfterSeconds}); }
}
const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
/** Bounded schema checks for the fixed approved subset. Unknown schema keywords are not invented. */
export function conforms(value,schema,depth=0) {
 if(depth>30)return false;
 if(schema.$ref){const key=schema.$ref.split('/').pop();return schema.$ref==='baseline-error-envelope.schema.json#'?conforms(value,errorContract,depth+1):!!definitions[key]&&conforms(value,definitions[key],depth+1);}
 if(schema===definitions.ContentVersion&&(!/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[A-Za-z-][0-9A-Za-z-]*)(?:\.(?:0|[1-9]\d*|\d*[A-Za-z-][0-9A-Za-z-]*))*))?(?:\+([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$/.test(value?.version)||new TextEncoder().encode(value.version).length>38))return false;
 if(schema.anyOf)return schema.anyOf.some(s=>conforms(value,s,depth+1));
 if(schema.enum&&!schema.enum.some(v=>equal(v,value)))return false;
 if(Object.hasOwn(schema,'const')&&!equal(schema.const,value))return false;
 if(schema.type==='null')return value===null;
 if(schema.type==='boolean'&&typeof value!=='boolean')return false;
 if(schema.type==='string'){
  if(typeof value!=='string'||(schema.minLength!==undefined&&[...value].length<schema.minLength)||(schema.maxLength!==undefined&&[...value].length>schema.maxLength))return false;
  if(schema.pattern&&!new RegExp(schema.pattern).test(value))return false;
  if(schema.format==='date-time'&&(!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?(?:Z|[+-]\d\d:\d\d)$/.test(value)||!Number.isFinite(Date.parse(value))))return false;
 }
 if(schema.type==='integer'&&(!Number.isSafeInteger(value)||(schema.minimum!==undefined&&value<schema.minimum)||(schema.maximum!==undefined&&value>schema.maximum)))return false;
 if(schema.type==='array')return Array.isArray(value)&&(schema.minItems===undefined||value.length>=schema.minItems)&&(schema.maxItems===undefined||value.length<=schema.maxItems)&&value.every(v=>conforms(v,schema.items,depth+1));
 if(schema.type==='object'){
  if(!value||typeof value!=='object'||Array.isArray(value))return false;
  const props=schema.properties||{};if((schema.required||[]).some(k=>!Object.hasOwn(value,k)))return false;
  if(schema.additionalProperties===false&&Object.keys(value).some(k=>!Object.hasOwn(props,k)))return false;
  if(Object.entries(value).some(([k,v])=>props[k]&&!conforms(v,props[k],depth+1)))return false;
 }
 return true;
}
const encode=value=>encodeURIComponent(String(value));
const root=s=>`/api/v1/organizations/${encode(s.organizationId)}/locations/${encode(s.locationId)}`;
const routes={
 ReadCurrentSession:()=>['GET','/api/v1/session',200,'CurrentSession'],
 ListOwnMemberships:()=>['GET','/api/v1/memberships',200,'Memberships'],
 ListTeam:x=>['GET',root(x)+'/team',200,'Team'],
 ReadTeamMemberLearnerState:x=>['GET',root(x)+`/team/${encode(x.identityId)}/learner-state`,200,'TeamStates'],
 ListOwnAssignments:x=>['GET',root(x)+'/assignments/mine',200,'Assignments'],
 ReadOwnLearnerState:x=>['GET',root(x)+'/learner-state/mine',200,'OwnStates'],
 ReadAssignedContentVersion:x=>['GET',root(x)+`/content/${encode(x.contentPackId)}/versions/${encode(x.contentVersion)}`,200,'PublicContent'],
 BeginDemoRun:()=>['POST','/api/v1/demo/start',201,'CurrentSession'],
 SwitchDemoPersona:()=>['POST','/api/v1/demo/persona',200,'CurrentSession'],
 CloseDemoRun:()=>['POST','/api/v1/demo/close',204,null],
 RevokeApplicationSession:()=>['DELETE','/api/v1/session',204,null],
 AssignContent:x=>['POST',root(x)+'/assignments',201,'Assignment'],
 StartLearningSession:x=>['POST',root(x)+'/learning-sessions',201,'Session'],
 RecordProgressEvent:x=>['POST',root(x)+`/learning-sessions/${encode(x.learningSessionId)}/progress-events`,201,'ProgressEvent'],
 CompleteLearningSession:x=>['POST',root(x)+`/learning-sessions/${encode(x.learningSessionId)}/complete`,200,'Session'],
};
export const operations=Object.freeze(Object.keys(routes));
export function createDemoApi({fetchImpl=globalThis.fetch,timeoutMs=12000}={}) {
 return {async call(operation,{params={},body,query={},key,signal}={}){
  if(!routes[operation])throw new ApiError('protocol');
  const [method,path,status,schema]=routes[operation](params),search=new URLSearchParams();
  for(const [k,v] of Object.entries(query))if(v!==null&&v!==undefined)search.set(k,String(v));
  const controller=new AbortController(),abort=()=>controller.abort();signal?.addEventListener('abort',abort,{once:true});if(signal?.aborted)abort();
  const timer=setTimeout(abort,timeoutMs),headers={Accept:'application/json'};
  if(method!=='GET')headers['Content-Type']='application/json';if(key)headers['Idempotency-Key']=key;
  try {
   const response=await fetchImpl(path+(search.size?'?'+search:''),{method,headers,credentials:'same-origin',cache:'no-store',redirect:'error',signal:controller.signal,...(method==='POST'?{body:JSON.stringify(body??{})}:{})});
   if(!response.ok){
    let result;try{result=await response.json();}catch{throw new ApiError('protocol',{status:response.status});}
    const e=result?.error;
    if(!conforms(result,errorContract)||!e||errorContract['x-status-by-code'][e.code]!==response.status||errorContract['x-messages'][e.code]!==e.message||(e.details&&e.code!=='INVALID_REQUEST')||(e.retryAfterSeconds&&!['RATE_LIMITED','SERVICE_UNAVAILABLE'].includes(e.code)))throw new ApiError('protocol',{status:response.status});
    throw new ApiError('server',{status:response.status,code:e.code,requestId:e.requestId,retryAfterSeconds:e.retryAfterSeconds??null});
   }
   if(response.status!==status)throw new ApiError('protocol',{status:response.status});
   if(status===204)return null;
   let result;try{result=await response.json();}catch{throw new ApiError('protocol');}
   if(!conforms(result,definitions[schema]))throw new ApiError('protocol');return result;
  }catch(error){if(error instanceof ApiError)throw error;throw new ApiError(signal?.aborted?'cancelled':globalThis.navigator?.onLine===false?'offline':'network');}
  finally{clearTimeout(timer);signal?.removeEventListener('abort',abort);}
 }};
}
