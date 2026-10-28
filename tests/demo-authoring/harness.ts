/** In-memory transaction double. PostgreSQL locks/guards are verified separately. */
import {randomUUID} from 'node:crypto';
import {MemoryDemoTransaction} from '../demo/memory-transaction.js';
import type {DemoTransaction} from '../../src/bootstrap/demo/demo-transaction.js';
import {createAuthoringApplication,type AuthoringRequest,type AuthoringInput,type AuthoringTransaction} from '../../src/bootstrap/demo-authoring/application.js';
import type {DemoApplicationRequest} from '../../src/bootstrap/demo/application-port.js';
import type {ContentDraft,AuthoringOwner} from '../../src/modules/content/application/ports/demo-authoring.js';
import type {AuthoringReceipt} from '../../src/modules/transaction-control/application/ports/demo-authoring-receipts.js';
const same=(a:AuthoringOwner,b:AuthoringOwner)=>a.runId===b.runId&&a.organizationId===b.organizationId&&a.locationId===b.locationId&&a.managerIdentityId===b.managerIdentityId;
export class MemoryAuthoringTransaction extends MemoryDemoTransaction {
 readonly authoring=true as const;drafts=new Map<string,ContentDraft>();authoringReceipts=new Map<string,AuthoringReceipt>();failAuthoringReceipt=false;expireAfterAuthoringRead=false;
 override async run<T>(work:(tx:AuthoringTransaction)=>Promise<T>):Promise<T>{const before=structuredClone({drafts:this.drafts,receipts:this.authoringReceipts});try{return await super.run(tx=>work({...tx,authoring:{
  getDraft:async o=>{const d=this.drafts.get(o.runId);return d&&same(d,o)?structuredClone(d):null;},
  saveDraft:async(d,expected)=>{const prior=this.drafts.get(d.runId);if((prior?.revision??0)!==expected)return false;this.drafts.set(d.runId,structuredClone(d));return true;},
  listPublished:async(o,id)=>structuredClone([...this.state.content.values()].filter(c=>c.organizationId===o.organizationId&&c.id===id)),
  appendVersion:async(o,v)=>{if(v.organizationId!==o.organizationId||![...this.state.content.values()].some(c=>c.id===v.id&&c.organizationId===o.organizationId)||this.state.content.has(v.id+':'+v.version))throw Error('scope or duplicate');this.state.content.set(v.id+':'+v.version,structuredClone(v));},
  markPublished:async(o,id,revision,contentRef)=>{const d=this.drafts.get(o.runId);if(!d||!same(d,o)||d.id!==id||d.revision!==revision||d.lastPublished?.revision===revision)return false;d.lastPublished={revision,contentRef:structuredClone(contentRef)};return true;},
 },authoringReceipts:{get:async(o,key)=>{if(this.expireAfterAuthoringRead){this.now=new Date([...this.state.runs.values()][0]!.expiresAt);this.expireAfterAuthoringRead=false;}const r=this.authoringReceipts.get(o.runId+':'+key);return r&&same(r,o)?structuredClone(r):null;},countOwnedReceipts:async o=>[...this.authoringReceipts.values()].filter(r=>same(r,o)).length,put:async r=>{if(this.failAuthoringReceipt)throw Error('receipt failure');this.authoringReceipts.set(r.runId+':'+r.key,structuredClone(r));}}}));}catch(error){this.drafts=before.drafts;this.authoringReceipts=before.receipts;throw error;}}
}
export function authoringHarness(){const database=new MemoryAuthoringTransaction(),application=createAuthoringApplication({transactions:database});let credential:string|null=null,scope:Record<string,string>={};
 return {database,application,get credential(){return credential;},get scope(){return scope;},async invoke(operation:DemoApplicationRequest['operation']|AuthoringRequest['operation'],body:Record<string,unknown>={},params:Record<string,string>={},key:string|null=null,query:Partial<AuthoringInput['query']>={},overrideCredential?:string|null):Promise<any>{
  const result=await application.execute({operation,requestId:randomUUID(),credential:overrideCredential===undefined?credential:overrideCredential,admissionPrefix:'SHARED_UNKNOWN',readInput:()=>({params:{...scope,...params},body,query:{limit:20,cursor:null,assignmentId:null,...query},idempotencyKey:key})} as AuthoringRequest);
  if(result.issuedCredential)credential=result.issuedCredential;if(result.clearCookie)credential=null;if(operation==='BeginDemoRun')scope=(result.body as any).demo.scope;return result.body;
 }};
}
export async function managerHarness(){const h=authoringHarness();await h.invoke('BeginDemoRun');await h.invoke('SwitchDemoPersona',{...h.scope,persona:'MANAGER'});return h;}
