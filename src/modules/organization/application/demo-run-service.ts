import { randomUUID } from 'node:crypto';
import type { DemoRun,Membership } from './ports/demo-organization.js';
import type { DemoCommandContext } from '../../authorization/application/ports/demo-command-context.js';
import type { DemoContext } from '../../authorization/application/demo-authorization.js';
import { DemoError } from '../../authorization/application/demo-error.js';
import { fixedMembership,requireDemoLearnerTarget } from '../../authorization/application/demo-authorization.js';
import { appendDemoSuccess,appendDemoLifecycle } from '../../audit-lifecycle/application/demo-audit.js';
import { createDemoPersona,createDemoApplicationSession,revokeDemoSessions } from '../../identity/application/demo-session-service.js';
import { publishDemoContent } from '../../content/application/demo-content-service.js';
import { newStationDemoContent } from '../../content/application/demo-kitchen-template.js';
import { assignDemoContent,type DemoLearningPorts } from '../../learning/application/demo-learning-service.js';

export function demoRunSnapshot(run:DemoRun){return {schemaVersion:1,id:run.id,organizationId:run.organizationId,locationId:run.locationId,status:run.status,createdAt:run.createdAt.toISOString(),expiresAt:run.expiresAt.toISOString(),closedAt:run.closedAt?.toISOString()??null,closeReason:run.closeReason};}
export async function beginDemoRun(ports:DemoLearningPorts,requestId:string,prefix:string){
  // There is no verified public peer resolver in the isolated demo. All callers share this bounded bucket.
  if(prefix!=='SHARED_UNKNOWN')throw new DemoError('INVALID_REQUEST');
  const admission=await ports.organization.lockAdmission(prefix);
  if(!Number.isFinite(admission.now.getTime())||[admission.prefixHour,admission.globalHour,admission.total].some(v=>!Number.isSafeInteger(v)||v<0))throw new DemoError('SERVICE_UNAVAILABLE');
  if(admission.total>=1000||admission.prefixHour>=10||admission.globalHour>=100)throw new DemoError('RATE_LIMITED',admission.retryAfterSeconds===null?{}:{retryAfterSeconds:admission.retryAfterSeconds});
  const run:DemoRun={id:randomUUID(),organizationId:randomUUID(),locationId:randomUUID(),status:'ACTIVE',createdAt:new Date(admission.now),expiresAt:new Date(admission.now.getTime()+3600000),closedAt:null,closeReason:null,admissionPrefix:prefix};
  const context:DemoCommandContext={actor:{actorClass:'AutomationActor',actorReference:'automation:demo-admission-v1'},scope:{organizationId:run.organizationId,locationId:run.locationId},requestId,now:new Date(admission.now),refresh:async()=>{const now=await ports.identity.now();if(!Number.isFinite(now.getTime())||now<run.createdAt||now>=run.expiresAt)throw new DemoError('SERVICE_UNAVAILABLE');context.now=now;return now;}};
  await ports.organization.createScope(run);await appendDemoLifecycle(ports.audit,context,'BeginDemoRun','DemoRun',run.id,demoRunSnapshot(run));
  const learner=await createDemoPersona(ports,context,run,'LEARNER');const manager=await createDemoPersona(ports,context,run,'MANAGER');
  for(const persona of [learner,manager]){
    const membership:Omit<Membership,'bundles'>={id:randomUUID(),identityId:persona.identityId,...context.scope,status:'ACTIVE',createdAt:new Date(context.now),updatedAt:new Date(context.now)};
    await ports.organization.createMembership(membership);
    await appendDemoLifecycle(ports.audit,context,'CreateMembership','Membership',membership.id,{schemaVersion:1,...membership,createdAt:membership.createdAt.toISOString(),updatedAt:membership.updatedAt.toISOString()});
    await appendDemoSuccess(ports.audit,context,'CreateMembership',{type:'Membership',id:membership.id});
    for(const bundle of [persona.kind==='LEARNER'?'learner':'manager','demo_visitor'] as const)await ports.organization.createGrant({id:randomUUID(),membershipId:membership.id,bundle,createdAt:new Date(context.now)});
  }
  await ports.organization.createReporting({id:randomUUID(),...context.scope,managerIdentityId:manager.identityId,learnerIdentityId:learner.identityId,createdAt:new Date(context.now)});
  const content=newStationDemoContent(run.organizationId,randomUUID);await publishDemoContent(ports,context,content);
  await assignDemoContent(ports,context,{identityId:learner.identityId,contentPackId:content.content.contentPackId,contentVersion:{version:content.content.version,digest:content.digest}},randomUUID(),run);
  await context.refresh();const issued=await createDemoApplicationSession(ports,context,learner.identityId);
  await appendDemoSuccess(ports.audit,context,'BeginDemoRun',{type:'DemoRun',id:run.id});
  return {run,persona:learner,session:issued.session,credential:issued.credential,context};
}
export async function closeDemoRun(ports:DemoLearningPorts,context:DemoCommandContext,run:DemoRun,reason:'USER_EXIT'|'EXPIRED'):Promise<boolean>{
  if(reason==='EXPIRED'){
    if(context.actor.actorClass!=='AutomationActor'||context.actor.actorReference!=='automation:demo-expiry-v1')throw new DemoError('FORBIDDEN');
    if(run.status!=='ACTIVE')return false;
    const now=await ports.identity.now();if(now<run.expiresAt)throw new DemoError('FORBIDDEN');context.now=now;
  }else if(context.actor.actorClass!=='HumanActor'||run.status!=='ACTIVE')throw new DemoError('UNAUTHENTICATED');
  // Acquire both persona/session sets before the final deadline check and mutation.
  const personas=await ports.identity.listPersonas(run.id);if(personas.length!==2)throw new DemoError('SERVICE_UNAVAILABLE');await ports.identity.listActiveSessions(run.id);await context.refresh();
  const terminal=await ports.organization.closeRun(run.id,reason,new Date(context.now));
  if(terminal.id!==run.id||terminal.status!==(reason==='EXPIRED'?'EXPIRED':'CLOSED')||terminal.closedAt?.getTime()!==context.now.getTime())throw new DemoError('SERVICE_UNAVAILABLE');
  await revokeDemoSessions(ports,context,run);
  await appendDemoLifecycle(ports.audit,context,'CloseDemoRun','DemoRun',run.id,demoRunSnapshot(terminal),demoRunSnapshot(run));
  await appendDemoSuccess(ports.audit,context,'CloseDemoRun',{type:'DemoRun',id:run.id});return true;
}
export async function listOwnDemoMemberships(ports:DemoLearningPorts,context:DemoContext){
  const rows=await ports.organization.listMemberships(context.persona.identityId);const items=[];
  for(const membership of rows){if(membership.organizationId!==context.run.organizationId||membership.locationId!==context.run.locationId)continue;if(membership.identityId===context.persona.identityId&&membership.status==='ACTIVE'){items.push({id:membership.id,organizationId:membership.organizationId,locationId:membership.locationId,status:'ACTIVE' as const,organizationLabel:'Demo workspace',locationLabel:'Practice location',synthetic:true as const});}}
  items.sort((a,b)=>a.id<b.id?-1:a.id>b.id?1:0);await context.refresh();return {items,nextCursor:null};
}
export async function listDemoTeam(ports:DemoLearningPorts,context:DemoContext,limit:number,cursor:string|null){
  const reports=await ports.organization.listDirectReports(context.persona.identityId,context.scope);if(reports.length!==1)throw new DemoError('FORBIDDEN');const learner=await requireDemoLearnerTarget(ports,context,reports[0]!);
  if(cursor){let tuple;try{const bytes=Buffer.from(cursor,'base64url');if(bytes.toString('base64url')!==cursor)throw 0;tuple=JSON.parse(bytes.toString('utf8'));}catch{throw new DemoError('INVALID_REQUEST');}if(JSON.stringify(tuple)!==JSON.stringify([learner.identityId]))throw new DemoError('NOT_FOUND');await context.refresh();return {items:[],nextCursor:null};}
  await context.refresh();return {items:[{identityId:learner.identityId,displayLabel:'Alex, demo learner',scope:{...context.scope},synthetic:true as const}].slice(0,limit),nextCursor:null};
}
