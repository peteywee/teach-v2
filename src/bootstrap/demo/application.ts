import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import type { DemoTransactionRunner } from './demo-transaction.js';
import type { DemoApplicationPort,DemoApplicationRequest,DemoApplicationResult,DemoInput } from './application-port.js';
import type { DemoContext } from '../../modules/authorization/application/demo-authorization.js';
import type { DemoCommandContext } from '../../modules/authorization/application/ports/demo-command-context.js';
import { authenticateDemo,authorizeDemoOperation,assertCanBegin,requireDemoLearnerTarget } from '../../modules/authorization/application/demo-authorization.js';
import { DemoError } from '../../modules/authorization/application/demo-error.js';
import { beginDemoRun,closeDemoRun,listOwnDemoMemberships,listDemoTeam } from '../../modules/organization/application/demo-run-service.js';
import { currentDemoSession,switchDemoPersona,revokePresentedDemoSession } from '../../modules/identity/application/demo-session-service.js';
import { readAssignedDemoContent } from '../../modules/content/application/demo-content-service.js';
import { assignDemoContent,startAssignedDemoSession,recordDemoProgress,completeDemoSession,listDemoAssignments,readDemoLearnerStates } from '../../modules/learning/application/demo-learning-service.js';
import { deriveSessionVerifier } from '../../modules/identity/domain/application-session.js';
import type { PersonaKind } from '../../modules/identity/application/ports/demo-identity.js';
import type { ContentVersion } from '../../modules/content/application/ports/demo-content.js';

/** Validate the immutable registered dispatch graph. Request data cannot choose an automation identity. */
function validateDispatchers():void{
  const manifest=JSON.parse(readFileSync(new URL('../../../governance/automation-principals.json',import.meta.url),'utf8'));
  const expected=[{id:'automation:demo-admission-v1',entry:'BeginDemoRun',capability:'organization.demo.begin',scope:'DEMO_NEW_RUN',graph:['CreateDemoPersona','CreateMembership','PublishContentPack','AssignContent','CreateApplicationSession']},{id:'automation:demo-expiry-v1',entry:'CloseDemoRun',capability:'organization.demo.close',scope:'RECORD',graph:['RevokeDemoSessions','RevokeApplicationSession']}];
  if(manifest.public_or_shared_deployment_authorized!==false||manifest.arbitrary_internal_code_inherits_authority!==false||manifest.physical_admission_required!==true||manifest.principals?.length!==2)throw new DemoError('SERVICE_UNAVAILABLE');
  for(const item of expected){const principal=manifest.principals.find((p:any)=>p.principal_id===item.id);if(!principal||principal.actor_class!=='AutomationActor'||principal.authentication_method!=='IN_PROCESS_BOOT_VALIDATED_DISPATCHER'||principal.credential!==null||principal.entry_command!==item.entry||principal.scope_class!==item.scope||JSON.stringify(principal.capabilities)!==JSON.stringify([item.capability])||JSON.stringify(principal.allowed_internal_command_graph)!==JSON.stringify(item.graph))throw new DemoError('SERVICE_UNAVAILABLE');}
}
export interface DemoApplication extends DemoApplicationPort {expireDueRuns():Promise<number>}
/** This composes owning application boundaries. It opens no network listener. */
export function createDemoApplication(options:{transactions:DemoTransactionRunner}):DemoApplication{
  validateDispatchers();const runner=options.transactions;
  async function denial(requestId:string,operation:string,context:DemoContext|null,kind:'CAPABILITY'|'TARGET_SCOPE'|'ORIGIN'){
    try{await runner.run(async tx=>{await tx.audit.appendDenial({requestId,operation,actorReference:context?.actor.actorReference??null,organizationId:context?.scope.organizationId??null,locationId:context?.scope.locationId??null,denialClass:kind,ipPrefix:null,occurredAt:await tx.identity.now()});});}catch{/* Denial never becomes permission if its separate bounded audit fails. */}
  }
  return {
    async execute(request:DemoApplicationRequest):Promise<DemoApplicationResult>{
      const captured={operation:request.operation,requestId:request.requestId,credential:request.credential,admissionPrefix:request.admissionPrefix,readInput:request.readInput};let context:DemoContext|null=null;
      try{return await runner.run(async tx=>{
        if(captured.operation==='BeginDemoRun'){
          await assertCanBegin(tx,captured.credential);const input=structuredClone(captured.readInput());if(Object.keys(input.body).length!==0)throw new DemoError('INVALID_REQUEST');
          const started=await beginDemoRun(tx,captured.requestId,captured.admissionPrefix);
          const current:DemoContext={...started.context,run:started.run,persona:started.persona,session:started.session,membership:null,operation:'ReadCurrentSession'};
          const body=await currentDemoSession(tx,current);await current.refresh();return {body,issuedCredential:started.credential};
        }
        context=await authenticateDemo(tx,captured.credential,captured.requestId,captured.operation);const current=context;
        const input:DemoInput=structuredClone(captured.readInput());
        const self=['ReadCurrentSession','ListOwnMemberships','RevokeApplicationSession'].includes(captured.operation);
        const bodyScope=captured.operation==='SwitchDemoPersona'||captured.operation==='CloseDemoRun';
        const source=bodyScope?input.body:input.params;
        await authorizeDemoOperation(tx,current,self?null:{organizationId:source.organizationId as string,locationId:source.locationId as string});
        // Safe reads do not mutate last-use. Failed unsafe commands roll this touch back with the effect.
        if(['AssignContent','StartLearningSession','RecordProgressEvent','CompleteLearningSession','SwitchDemoPersona','CloseDemoRun','RevokeApplicationSession'].includes(captured.operation)){
          const touched=await tx.identity.sessions.authenticateByVerifier({verifierVersion:'v1',verifier:deriveSessionVerifier(captured.credential!),now:new Date(current.now)});if(!touched)throw new DemoError('UNAUTHENTICATED');current.session=touched;
        }
        const result=await (async():Promise<DemoApplicationResult>=>{switch(captured.operation){
          case 'ReadCurrentSession':{const body=await currentDemoSession(tx,current);await current.refresh();return {body};}
          case 'RevokeApplicationSession':await revokePresentedDemoSession(tx,current);return {clearCookie:true};
          case 'ListOwnMemberships':return {body:await listOwnDemoMemberships(tx,current)};
          case 'ListTeam':return {body:await listDemoTeam(tx,current,input.query.limit,input.query.cursor)};
          case 'ReadTeamMemberLearnerState':{const target=await requireDemoLearnerTarget(tx,current,input.params.identityId!);return {body:await readDemoLearnerStates(tx,current,target.identityId,input.query,false)};}
          case 'AssignContent':await requireDemoLearnerTarget(tx,current,input.body.identityId as string);return {body:await assignDemoContent(tx,current,{identityId:input.body.identityId as string,contentPackId:input.body.contentPackId as string,contentVersion:input.body.contentVersion as ContentVersion},input.idempotencyKey)};
          case 'ListOwnAssignments':return {body:await listDemoAssignments(tx,current,input.query.limit,input.query.cursor)};
          case 'ReadAssignedContentVersion':return {body:await readAssignedDemoContent(tx,current,input.params.contentPackId!,input.params.contentVersion!)};
          case 'StartLearningSession':return {body:await startAssignedDemoSession(tx,current,input.body.assignmentId as string,input.idempotencyKey)};
          case 'RecordProgressEvent':return {body:await recordDemoProgress(tx,current,input.params.learningSessionId!,{blockId:input.body.blockId as string,selectedOptionIndex:input.body.selectedOptionIndex as number},input.idempotencyKey)};
          case 'CompleteLearningSession':return {body:await completeDemoSession(tx,current,input.params.learningSessionId!)};
          case 'ReadOwnLearnerState':return {body:await readDemoLearnerStates(tx,current,current.persona.identityId,input.query,true)};
          case 'SwitchDemoPersona':{const issued=await switchDemoPersona(tx,current,input.body.persona as PersonaKind);const body=await currentDemoSession(tx,current,issued.session,issued.persona);return {body,issuedCredential:issued.credential};}
          case 'CloseDemoRun':await closeDemoRun(tx,current,current.run,'USER_EXIT');return {clearCookie:true};
          default:throw new DemoError('NOT_FOUND');
        }})();
        // Audit, lifecycle, receipt and projection reads may block after the first
        // authority check. Fence the entire transaction after every such lock,
        // so a crossed deadline rolls all effects back before outer commit.
        await current.refresh();return result;
      });}catch(error){if(error instanceof DemoError&&(error.code==='FORBIDDEN'||error.code==='NOT_FOUND'))await denial(captured.requestId,captured.operation,context,error.code==='FORBIDDEN'?'CAPABILITY':'TARGET_SCOPE');throw error instanceof DemoError?error:new DemoError('SERVICE_UNAVAILABLE');}
    },
    async recordOriginDenial(requestId,operation){await denial(requestId,operation,null,'ORIGIN');},
    async expireDueRuns(){
      const due=await runner.run(tx=>tx.organization.listExpiredRuns(100));if(due.length>100)throw new DemoError('SERVICE_UNAVAILABLE');let count=0;
      for(const candidate of due){const changed=await runner.run(async tx=>{
        const locked=await tx.organization.lockRun(candidate.id);if(!locked)return false;
        if(locked.run.organizationId!==candidate.organizationId||locked.run.locationId!==candidate.locationId||locked.run.expiresAt.getTime()!==candidate.expiresAt.getTime())throw new DemoError('SERVICE_UNAVAILABLE');
        const context:DemoCommandContext={actor:{actorClass:'AutomationActor',actorReference:'automation:demo-expiry-v1'},scope:{organizationId:locked.run.organizationId,locationId:locked.run.locationId},requestId:randomUUID(),now:locked.now,refresh:async()=>{const now=await tx.identity.now();if(!Number.isFinite(now.getTime())||now<locked.run.expiresAt)throw new DemoError('FORBIDDEN');context.now=now;return now;}};
        return closeDemoRun(tx,context,locked.run,'EXPIRED');
      });if(changed)count++;}return count;
    },
  };
}
