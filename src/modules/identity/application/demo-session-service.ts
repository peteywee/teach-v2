import { randomUUID } from 'node:crypto';
import type { IdentityPort,Persona,PersonaKind } from './ports/demo-identity.js';
import type { AuditPort } from '../../audit-lifecycle/application/ports/demo-audit.js';
import type { DemoRun,OrganizationPort } from '../../organization/application/ports/demo-organization.js';
import type { DemoCommandContext } from '../../authorization/application/ports/demo-command-context.js';
import type { DemoContext } from '../../authorization/application/demo-authorization.js';
import { fixedMembership,PERSONA_OPERATIONS,SELF_OPERATIONS } from '../../authorization/application/demo-authorization.js';
import { DemoError } from '../../authorization/application/demo-error.js';
import { appendDemoSuccess,appendDemoLifecycle } from '../../audit-lifecycle/application/demo-audit.js';
import { issueApplicationSession } from './session-service.js';
import { revokeApplicationSession } from './session-revocation-service.js';
import type { ApplicationSessionRecord } from '../domain/application-session.js';

export interface DemoIdentityPorts {identity:IdentityPort;audit:AuditPort;organization:OrganizationPort}
export async function createDemoPersona(ports:DemoIdentityPorts,context:DemoCommandContext,run:DemoRun,kind:PersonaKind):Promise<Persona>{
  if(context.actor.actorClass!=='AutomationActor'||context.actor.actorReference!=='automation:demo-admission-v1'||run.status!=='ACTIVE')throw new DemoError('FORBIDDEN');
  const existing=await ports.identity.listPersonas(run.id);if(existing.some(p=>p.kind===kind)||existing.length>=2)throw new DemoError('CONFLICT');
  const persona=await ports.identity.createPersona({id:randomUUID(),identityId:randomUUID(),demoRunId:run.id,kind,createdAt:new Date(context.now)});
  if(persona.demoRunId!==run.id||persona.kind!==kind||persona.identityStatus!=='ACTIVE')throw new DemoError('SERVICE_UNAVAILABLE');
  await appendDemoLifecycle(ports.audit,context,'CreateDemoPersona','Identity',persona.identityId,{schemaVersion:1,id:persona.identityId,status:'ACTIVE',offboardedAt:null,createdAt:context.now.toISOString(),updatedAt:context.now.toISOString()});
  await appendDemoSuccess(ports.audit,context,'CreateDemoPersona',{type:'Identity',id:persona.identityId});return persona;
}
export async function createDemoApplicationSession(ports:DemoIdentityPorts,context:DemoCommandContext,identityId:string):Promise<{credential:string;session:ApplicationSessionRecord}>{
  const result=await issueApplicationSession(ports.identity.sessions,{id:randomUUID(),identityId,now:new Date(context.now)});
  await appendDemoSuccess(ports.audit,context,'CreateApplicationSession',{type:'ApplicationSession',id:result.session.id});return result;
}
async function revokeOne(ports:DemoIdentityPorts,context:DemoCommandContext,id:string,identityId:string):Promise<void>{
  await revokeApplicationSession({run:async work=>work({sessions:ports.identity.sessions,sessionAuthorization:{requireSessionAuthorization:async request=>{
    if(request.targetSessionId!==id||request.targetIdentityId!==identityId||request.actorReference!==context.actor.actorReference||request.actorClass!==context.actor.actorClass)throw new DemoError('FORBIDDEN');
    const persona=await ports.identity.getPersona(identityId);if(!persona)throw new DemoError('NOT_FOUND');
    const run=await ports.organization.findRun(persona.demoRunId);if(!run||run.organizationId!==context.scope.organizationId||run.locationId!==context.scope.locationId)throw new DemoError('NOT_FOUND');
  }},audit:{appendRequired:async facts=>{if(facts.action!=='RevokeApplicationSession')throw new DemoError('SERVICE_UNAVAILABLE');await appendDemoSuccess(ports.audit,context,'RevokeApplicationSession',{type:'ApplicationSession',id:facts.targetSessionId});}}})},{...context.actor,targetIdentityId:identityId,targetSessionId:id,requestId:context.requestId,now:new Date(context.now)});
}
export async function revokePresentedDemoSession(ports:DemoIdentityPorts,context:DemoContext):Promise<void>{await context.refresh();await revokeOne(ports,context,context.session.id,context.persona.identityId);}
export async function revokeDemoSessions(ports:DemoIdentityPorts,context:DemoCommandContext,run:DemoRun):Promise<void>{
  const personas=await ports.identity.listPersonas(run.id);if(personas.length!==2||new Set(personas.map(p=>p.kind)).size!==2)throw new DemoError('SERVICE_UNAVAILABLE');
  const sessions=await ports.identity.listActiveSessions(run.id);for(const session of sessions){if(!personas.some(p=>p.identityId===session.identityId))throw new DemoError('SERVICE_UNAVAILABLE');await revokeOne(ports,context,session.id,session.identityId);}
  await appendDemoSuccess(ports.audit,context,'RevokeDemoSessions',{type:'DemoRun',id:run.id});
}
export async function switchDemoPersona(ports:DemoIdentityPorts,context:DemoContext,targetKind:PersonaKind):Promise<{credential:string;session:ApplicationSessionRecord;persona:Persona}>{
  if(targetKind===context.persona.kind)throw new DemoError('CONFLICT');
  const personas=await ports.identity.listPersonas(context.run.id);
  if(personas.length!==2||new Set(personas.map(p=>p.kind)).size!==2||new Set(personas.map(p=>p.identityId)).size!==2)throw new DemoError('SERVICE_UNAVAILABLE');
  const target=personas.find(p=>p.kind===targetKind);if(!target||target.identityStatus!=='ACTIVE')throw new DemoError('FORBIDDEN');
  const membership=await ports.organization.getMembership(target.identityId,context.run);if(!fixedMembership(membership,target,context.run))throw new DemoError('FORBIDDEN');
  const count=await ports.identity.countSessions(context.run.id);if(!Number.isSafeInteger(count)||count<1)throw new DemoError('SERVICE_UNAVAILABLE');if(count>=100)throw new DemoError('PRECONDITION_FAILED');
  const active=await ports.identity.listActiveSessions(context.run.id);await context.refresh();
  for(const session of active){if(!personas.some(p=>p.identityId===session.identityId))throw new DemoError('SERVICE_UNAVAILABLE');await revokeOne(ports,context,session.id,session.identityId);}
  const issued=await createDemoApplicationSession(ports,context,target.identityId);
  await appendDemoSuccess(ports.audit,context,'SwitchDemoPersona',{type:'ApplicationSession',id:issued.session.id});return {...issued,persona:target};
}
export async function currentDemoSession(ports:Pick<DemoIdentityPorts,'organization'>,context:DemoContext,session=context.session,persona=context.persona){
  const membership=await ports.organization.getMembership(persona.identityId,context.run);
  const allowed=fixedMembership(membership,persona,context.run)?PERSONA_OPERATIONS[persona.kind]:SELF_OPERATIONS;
  // Session/run issuance code calls this after its last authority check; ordinary reads recheck in composition.
  return {identityId:persona.identityId,displayLabel:persona.kind==='LEARNER'?'Alex, demo learner':'Jordan, demo manager',sessionExpiresAt:new Date(Math.min(session.absoluteExpiresAt.getTime(),session.lastUsedAt.getTime()+1800000,context.run.expiresAt.getTime())).toISOString(),demo:{runId:context.run.id,persona:persona.kind,expiresAt:context.run.expiresAt.toISOString(),scope:{...context.scope}},allowedOperations:[...allowed],synthetic:true as const};
}
