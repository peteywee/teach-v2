import {readFileSync} from 'node:fs';
import {createDemoApplication,type DemoApplication} from '../demo/application.js';
import type {DemoApplicationRequest,DemoApplicationResult,DemoInput} from '../demo/application-port.js';
import type {DemoTransaction,DemoTransactionRunner} from '../demo/demo-transaction.js';
import {authenticateDemo,type DemoContext} from '../../modules/authorization/application/demo-authorization.js';
import {AUTHORING_OPERATIONS,isAuthoringOperation,authorizeDemoAuthoring,type AuthoringOperation} from '../../modules/authorization/application/demo-authoring-authorization.js';
import {DemoError} from '../../modules/authorization/application/demo-error.js';
import {AuthoringValidationError} from '../../modules/content/domain/demo-authoring.js';
/** Map the pure domain failure to the finite application/HTTP error boundary. */
export class AuthoringRequestValidationError extends DemoError {
 readonly details:AuthoringValidationError['details'];
 constructor(error:AuthoringValidationError){super('INVALID_REQUEST');this.details=error.details;}
}
import {deriveSessionVerifier} from '../../modules/identity/domain/application-session.js';
import {readAuthoringWorkspace,saveContentDraft,previewContentDraft,publishContentDraft,type SaveDraftInput} from '../../modules/content/application/demo-authoring-service.js';
import {readAuthoringOperation} from '../../modules/transaction-control/application/demo-authoring-receipts.js';
import type {AuthoringMutation} from '../../modules/transaction-control/application/ports/demo-authoring-receipts.js';
export interface AuthoringInput extends DemoInput {query:DemoInput['query']&{revision?:number;operation?:AuthoringMutation}}
export interface AuthoringRequest extends Omit<DemoApplicationRequest,'operation'|'readInput'> {operation:AuthoringOperation;readInput():AuthoringInput}
export interface AuthoringApplication extends Omit<DemoApplication,'execute'|'recordOriginDenial'> {execute(request:DemoApplicationRequest|AuthoringRequest):Promise<DemoApplicationResult>;recordOriginDenial(requestId:string,operation:string):Promise<void>}
export type AuthoringTransaction=DemoTransaction&Required<Pick<DemoTransaction,'authoring'|'authoringReceipts'>>;
export interface AuthoringTransactionRunner extends DemoTransactionRunner {readonly authoring:true;run<T>(work:(tx:AuthoringTransaction)=>Promise<T>):Promise<T>}
/** An explicit composition proof, not inheritance of an admission automation principal. */
function validateAuthoringRegistration(){
 const pack=JSON.parse(readFileSync(new URL('../../../domains/demo-authoring/proposal-0.1.0/authoring-operations.json',import.meta.url),'utf8'));
 const capabilities=['content.draft.read','content.draft.write','content.draft.preview','content.draft.publish','transaction.authoring.read'];
 if(pack.schema_version!==1||pack.actor!=='HumanActor'||pack.required_persona!=='MANAGER'||pack.routes?.length!==5)throw new DemoError('SERVICE_UNAVAILABLE');
 for(let i=0;i<5;i++){const row=pack.routes[i];if(row.operation!==AUTHORING_OPERATIONS[i]||row.capability!==capabilities[i]||row.kind!==([1,3].includes(i)?'command':'query')||row.receipt_operation!==([1,3].includes(i)?row.operation:null))throw new DemoError('SERVICE_UNAVAILABLE');}
}
export function createAuthoringApplication(options:{transactions:AuthoringTransactionRunner}):AuthoringApplication{
 validateAuthoringRegistration();if(options.transactions.authoring!==true)throw new DemoError('SERVICE_UNAVAILABLE');
 const legacy=createDemoApplication(options),runner=options.transactions;
 async function denial(requestId:string,operation:string,context:DemoContext|null,kind:'CAPABILITY'|'TARGET_SCOPE'|'ORIGIN'){
  try{await runner.run(async tx=>tx.audit.appendDenial({requestId,operation,actorReference:context?.actor.actorReference??null,organizationId:context?.scope.organizationId??null,locationId:context?.scope.locationId??null,denialClass:kind,ipPrefix:null,occurredAt:await tx.identity.now()}));}catch{/* A failed denial audit never grants access. */}
 }
 return {expireDueRuns:()=>legacy.expireDueRuns(),recordOriginDenial:(requestId,operation)=>isAuthoringOperation(operation)?denial(requestId,operation,null,'ORIGIN'):legacy.recordOriginDenial!(requestId,operation as DemoApplicationRequest['operation']),
 async execute(request){
  if(!isAuthoringOperation(request.operation))return legacy.execute(request as DemoApplicationRequest);
  const captured=request as AuthoringRequest;let context:DemoContext|null=null;
  try{return await runner.run(async tx=>{
   if(!tx.authoring||!tx.authoringReceipts)throw new DemoError('SERVICE_UNAVAILABLE');
   context=await authenticateDemo(tx,captured.credential,captured.requestId,captured.operation);const current=context;
   const input=structuredClone(captured.readInput()),owner=await authorizeDemoAuthoring(tx,current,{organizationId:input.params.organizationId!,locationId:input.params.locationId!});
   if(captured.operation==='SaveContentDraft'||captured.operation==='PublishContentDraft'){
    const touched=await tx.identity.sessions.authenticateByVerifier({verifierVersion:'v1',verifier:deriveSessionVerifier(captured.credential!),now:new Date(current.now)});if(!touched)throw new DemoError('UNAUTHENTICATED');current.session=touched;await current.refresh();
   }
   const ports={content:tx.content,organization:tx.organization,authoring:tx.authoring,authoringReceipts:tx.authoringReceipts,audit:tx.audit,learning:tx.learning};let body:unknown;
   switch(captured.operation){
    case 'ReadAuthoringWorkspace':body=await readAuthoringWorkspace(ports,owner,current);break;
    case 'SaveContentDraft':body=await saveContentDraft(ports,owner,current,input.body as SaveDraftInput,input.idempotencyKey);break;
    case 'PreviewContentDraft':body=await previewContentDraft(ports,owner,current,input.query.revision!);break;
    case 'PublishContentDraft':body=await publishContentDraft(ports,owner,current,input.body as {expectedRevision:number;draftDigest:string},input.idempotencyKey);break;
    case 'ReadAuthoringOperation':body=await readAuthoringOperation(ports.authoringReceipts,owner,current,input.params.key!,input.query.operation!);break;
   }
   await current.refresh();return {body};
  });}catch(error){if(error instanceof AuthoringValidationError)throw new AuthoringRequestValidationError(error);if(error instanceof DemoError&&(error.code==='FORBIDDEN'||error.code==='NOT_FOUND'))await denial(captured.requestId,captured.operation,context,error.code==='FORBIDDEN'?'CAPABILITY':'TARGET_SCOPE');throw error instanceof DemoError?error:new DemoError('SERVICE_UNAVAILABLE');}
 }};
}
