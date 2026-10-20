import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
const fixedBody='{"error":{"code":"SERVICE_UNAVAILABLE","message":"Canary unavailable"}}';
const expectedEvidenceDigest='__EVIDENCE_DIGEST__';
let records=0;
const initialized=(async()=>{
 let evidenceVerified=false,privateClosureVerified=false,importsResolved=false,buildNodeVersion=null,fileCount=0;
 try{
  const bytes=readFileSync(new URL('../private/canary-evidence.json',import.meta.url));
  if(digest(bytes)!==expectedEvidenceDigest)throw Error('evidence');
  const evidence=JSON.parse(bytes);evidenceVerified=true;buildNodeVersion=evidence.nodePatch;
  for(const [path,hash] of Object.entries(evidence.files)){
   if(!path.startsWith('private/runtime/')||path.split('/').includes('..'))throw Error('path');
   if(digest(readFileSync(new URL('../'+path,import.meta.url)))!==hash)throw Error('closure');fileCount++;
  }
  privateClosureVerified=true;
  const require=createRequire(new URL('../private/runtime/package.json',import.meta.url));require('pg');require('drizzle-orm');importsResolved=true;
 }catch{/* Log booleans only, never paths, errors, config or environment values. */}
 console.log(JSON.stringify({marker:'TEACH_CANARY_COLD_V1',nodePatch:process.versions.node,buildNodeVersion,exactPatchMatch:buildNodeVersion===process.versions.node,evidenceVerified,privateClosureVerified,importsResolved,fileCount}));
})();
const probePaths=new Map([['/','root'],['/assets/app.mjs','asset'],['/private/runtime/build-runtime.json','private'],['/__teach_canary_probe__/target','target'],['/__teach_canary_probe__/body','body'],['/__teach_canary_probe__/headers','headers'],['/.netlify/functions/demo','default-function']]);
export default async function handler(request){
 await initialized;
 let path;try{path=new URL(request.url).pathname;}catch{}
 const probe=probePaths.get(path);
 if(probe&&records<16){records++;
  const h=request.headers;let bodyObserved=false,bodyReadFailed=false;
  if(probe==='body'&&request.method==='POST'&&request.body){
   const reader=request.body.getReader();let count=0,timer;
   const deadline=new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('deadline')),1000);});
   try{for(;;){const item=await Promise.race([reader.read(),deadline]);if(item.done)break;count+=item.value.byteLength;if(count>64){void reader.cancel().catch(()=>{});break;}}bodyObserved=count===2;}
   catch{bodyReadFailed=true;void reader.cancel().catch(()=>{});}
   finally{clearTimeout(timer);reader.releaseLock();}
  }
  console.log(JSON.stringify({marker:'TEACH_CANARY_PROBE_V1',probe,method:request.method==='POST'?'POST':request.method==='GET'?'GET':'OTHER',hostPresent:h.has('host'),hostComma:(h.get('host')??'').includes(','),originJoined:h.get('origin')==='https://synthetic.invalid, https://synthetic.invalid',cookieJoined:h.get('cookie')==='canary=one, canary=two',cookieSemicolonJoined:h.get('cookie')==='canary=one; canary=two',lengthPresent:h.has('content-length'),lengthJoined:(h.get('content-length')??'').includes(','),transferPresent:h.has('transfer-encoding'),bodyObserved,bodyReadFailed}));
 }
 return new Response(fixedBody,{status:503,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff','content-security-policy':"default-src 'none'; frame-ancestors 'none'"}});
}
export const config={path:'/*',preferStatic:false,nodeBundler:'none',nodeVersion:'24',includedFiles:['.netlify-canary/private/**']};
