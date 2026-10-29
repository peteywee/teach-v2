import {createDemoApi,ApiError,conforms} from './api.mjs';
import {errorContract} from './wire-contract.mjs';
import {authoringWire} from './authoring-wire.mjs';
const defs=authoringWire.$defs,equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const annotations=new Set(['$schema','$id','$comment','title','description','default','examples','readOnly','writeOnly','deprecated']);
const keywords=new Set(['$ref','type','const','enum','anyOf','allOf','oneOf','not','if','then','else','properties','required','additionalProperties','items','minItems','maxItems','uniqueItems','minLength','maxLength','pattern','format','minimum','maximum']);
/** Finite schema subset used by the exact source-bound authoring wire contract. */
export function conformsAuthoring(value,schema,depth=0){
 if(depth>40||!schema||typeof schema!=='object'||Object.keys(schema).some(k=>!keywords.has(k)&&!annotations.has(k)))return false;
 if(schema.$ref){if(!/^#\/\$defs\/[A-Za-z0-9_]+$/.test(schema.$ref))return false;return conformsAuthoring(value,defs[schema.$ref.slice(8)],depth+1);}
 if(Object.hasOwn(schema,'const')&&!equal(value,schema.const))return false;
 if(schema.enum&&!schema.enum.some(x=>equal(x,value)))return false;
 if(schema.anyOf&&!schema.anyOf.some(x=>conformsAuthoring(value,x,depth+1)))return false;
 if(schema.oneOf&&schema.oneOf.filter(x=>conformsAuthoring(value,x,depth+1)).length!==1)return false;
 if(schema.allOf&&!schema.allOf.every(x=>conformsAuthoring(value,x,depth+1)))return false;
 if(schema.not&&conformsAuthoring(value,schema.not,depth+1))return false;
 if(schema.if){const branch=conformsAuthoring(value,schema.if,depth+1)?schema.then:schema.else;if(branch&&!conformsAuthoring(value,branch,depth+1))return false;}
 if(schema.type==='null')return value===null;
 if(schema.type==='boolean'&&typeof value!=='boolean')return false;
 if(schema.type==='string'){
  if(typeof value!=='string'||(schema.minLength!==undefined&&[...value].length<schema.minLength)||(schema.maxLength!==undefined&&[...value].length>schema.maxLength)||(schema.pattern&&!new RegExp(schema.pattern).test(value)))return false;
  if(schema.format==='date-time'&&(!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?(?:Z|[+-]\d\d:\d\d)$/.test(value)||!Number.isFinite(Date.parse(value))))return false;
 }
 if((schema.type==='integer'||schema.type==='number')&&(typeof value!=='number'||!Number.isFinite(value)||(schema.type==='integer'&&!Number.isSafeInteger(value))||(schema.minimum!==undefined&&value<schema.minimum)||(schema.maximum!==undefined&&value>schema.maximum)))return false;
 if(schema.type==='array'){if(!Array.isArray(value)||(schema.minItems!==undefined&&value.length<schema.minItems)||(schema.maxItems!==undefined&&value.length>schema.maxItems)||(schema.uniqueItems&&new Set(value.map(x=>JSON.stringify(x))).size!==value.length))return false;if(schema.items&&!value.every(x=>conformsAuthoring(x,schema.items,depth+1)))return false;}
 if(schema.type==='object'||schema.properties||schema.required){if(!value||typeof value!=='object'||Array.isArray(value))return false;const properties=schema.properties||{};if((schema.required||[]).some(k=>!Object.hasOwn(value,k))||(schema.additionalProperties===false&&Object.keys(value).some(k=>!Object.hasOwn(properties,k)))||Object.entries(value).some(([k,v])=>properties[k]&&!conformsAuthoring(v,properties[k],depth+1)))return false;}
 return true;
}
const encode=x=>encodeURIComponent(String(x)),root=p=>`/api/v1/organizations/${encode(p.organizationId)}/locations/${encode(p.locationId)}/authoring`;
const routes={ReadAuthoringWorkspace:p=>['GET',root(p)+'/workspace'],SaveContentDraft:p=>['POST',root(p)+'/draft'],PreviewContentDraft:p=>['GET',root(p)+'/draft/preview'],PublishContentDraft:p=>['POST',root(p)+'/draft/publish'],ReadAuthoringOperation:p=>['GET',root(p)+'/operations/'+encode(p.key)]};
export const authoringOperations=Object.freeze(Object.keys(routes));
export function createAuthoringDemoApi({fetchImpl=globalThis.fetch,timeoutMs=12000}={}){
 const legacy=createDemoApi({fetchImpl,timeoutMs});
 return {async call(operation,{params={},body,query={},key,signal}={}){
  if(!Object.hasOwn(routes,operation))return legacy.call(operation,{params,body,query,key,signal});
  if(!/^[A-Za-z0-9_-]{1,128}$/.test(params.organizationId)||!/^[A-Za-z0-9_-]{1,128}$/.test(params.locationId))throw new ApiError('protocol');
  const [method,path]=routes[operation](params),search=new URLSearchParams();
  if(operation==='PreviewContentDraft'){if(Object.keys(query).join(',')!=='revision'||!Number.isInteger(query.revision)||query.revision<1||query.revision>100)throw new ApiError('protocol');search.set('revision',String(query.revision));}
  else if(operation==='ReadAuthoringOperation'){if(!/^[A-Za-z0-9_-]{16,128}$/.test(params.key)||Object.keys(query).join(',')!=='operation'||!['SaveContentDraft','PublishContentDraft'].includes(query.operation))throw new ApiError('protocol');search.set('operation',query.operation);}
  else if(Object.keys(query).length)throw new ApiError('protocol');
  const encoded=method==='POST'?JSON.stringify(body):undefined;
  if(method==='POST'&&(!/^[A-Za-z0-9_-]{16,128}$/.test(key)||!conformsAuthoring(body,authoringWire.requests[operation])||new TextEncoder().encode(encoded).length>65536))throw new ApiError('protocol');
  const aborter=new AbortController(),abort=()=>aborter.abort();signal?.addEventListener('abort',abort,{once:true});if(signal?.aborted)abort();const timer=setTimeout(abort,timeoutMs),headers={Accept:'application/json'};if(method==='POST'){headers['Content-Type']='application/json';headers['Idempotency-Key']=key;}
  try{
   const response=await fetchImpl(path+(search.size?'?'+search:''),{method,headers,credentials:'same-origin',cache:'no-store',redirect:'error',signal:aborter.signal,...(method==='POST'?{body:encoded}:{})});
   const raw=await response.text();if(new TextEncoder().encode(raw).length>262144)throw new ApiError('protocol');let value;try{value=JSON.parse(raw);}catch{throw new ApiError('protocol',{status:response.status});}
   if(!response.ok){const e=value?.error;if(!conforms(value,errorContract)||!e||errorContract['x-status-by-code'][e.code]!==response.status||errorContract['x-messages'][e.code]!==e.message||(e.details&&e.code!=='INVALID_REQUEST')||(e.retryAfterSeconds&&!['RATE_LIMITED','SERVICE_UNAVAILABLE'].includes(e.code)))throw new ApiError('protocol',{status:response.status});const error=new ApiError('server',{status:response.status,code:e.code,requestId:e.requestId,retryAfterSeconds:e.retryAfterSeconds??null});error.details=structuredClone(e.details||[]);throw error;}
   if(response.status!==200||!conformsAuthoring(value,authoringWire.responses[operation]))throw new ApiError('protocol',{status:response.status});
   if(operation==='ReadAuthoringOperation'&&(value.key!==params.key||value.operation!==query.operation||(value.found&&value.result.operation!==query.operation)))throw new ApiError('protocol');
   return value;
  }catch(error){if(error instanceof ApiError)throw error;throw new ApiError(signal?.aborted?'cancelled':globalThis.navigator?.onLine===false?'offline':'network');}
  finally{clearTimeout(timer);signal?.removeEventListener('abort',abort);}
 }};
}
