import { timingSafeEqual } from 'node:crypto';
import { deriveSessionVerifier, evaluateSessionAuthentication, type ApplicationSessionRecord } from '../../identity/domain/application-session.js';
import type { IdentityPort,Persona } from '../../identity/application/ports/demo-identity.js';
import type { OrganizationPort,DemoRun,Scope,Membership } from '../../organization/application/ports/demo-organization.js';
import type { Actor } from './ports/demo-actor.js';
import { DemoError } from './demo-error.js';

export const SELF_OPERATIONS = ['ReadCurrentSession','ListOwnMemberships','RevokeApplicationSession'] as const;
const COMMON = [...SELF_OPERATIONS,'SwitchDemoPersona','CloseDemoRun'];
export const PERSONA_OPERATIONS:Readonly<Record<'LEARNER'|'MANAGER',readonly string[]>>=Object.freeze({
  LEARNER:Object.freeze([...COMMON,'ListOwnAssignments','ReadAssignedContentVersion','StartLearningSession','RecordProgressEvent','CompleteLearningSession','ReadOwnLearnerState']),
  MANAGER:Object.freeze([...COMMON,'ListTeam','ReadTeamMemberLearnerState','AssignContent']),
});
export interface DemoAuthorityPorts {organization:OrganizationPort;identity:IdentityPort}
export interface DemoContext {
  actor:Actor;scope:Scope;run:DemoRun;persona:Persona;session:ApplicationSessionRecord;membership:Membership|null;now:Date;requestId:string;operation:string;
  /** Re-read database time after every potentially blocking target/receipt lookup. */
  refresh():Promise<Date>;
}
export function sameScope(a:Scope,b:Scope):boolean{return a.organizationId===b.organizationId&&a.locationId===b.locationId;}
function validRun(run:DemoRun):boolean{return run.status==='ACTIVE'&&run.closedAt===null&&run.closeReason===null&&Number.isFinite(run.createdAt.getTime())&&run.expiresAt.getTime()===run.createdAt.getTime()+3600000;}
export async function authenticateDemo(ports:DemoAuthorityPorts,credential:string|null,requestId:string,operation:string):Promise<DemoContext>{
  if(!credential)throw new DemoError('UNAUTHENTICATED');
  let verifier:Buffer;try{verifier=deriveSessionVerifier(credential);}catch{throw new DemoError('UNAUTHENTICATED');}
  const found=await ports.identity.findSessionByVerifier(verifier);if(!found)throw new DemoError('UNAUTHENTICATED');
  const runId=await ports.identity.findDemoRunId(found.identityId);if(!runId)throw new DemoError('UNAUTHENTICATED');
  const locked=await ports.organization.lockRun(runId);if(!locked||!validRun(locked.run))throw new DemoError('UNAUTHENTICATED');
  const identityStatus=await ports.identity.getIdentityStatus(found.identityId);
  const session=await ports.identity.lockSession(found.id,found.identityId);
  const persona=await ports.identity.getPersona(found.identityId);
  if(identityStatus!=='ACTIVE'||!session||!persona||persona.identityStatus!=='ACTIVE'||persona.identityId!==found.identityId||persona.demoRunId!==locked.run.id||session.identityId!==found.identityId||session.id!==found.id||session.verifierVersion!=='v1'||session.verifier.length!==verifier.length||!timingSafeEqual(Buffer.from(session.verifier),verifier))throw new DemoError('UNAUTHENTICATED');
  const context:DemoContext={actor:{actorClass:'HumanActor',actorReference:persona.identityId},scope:{organizationId:locked.run.organizationId,locationId:locked.run.locationId},run:locked.run,persona,session,membership:null,now:locked.now,requestId,operation,refresh:async()=>{
    const now=await ports.identity.now();
    if(!Number.isFinite(now.getTime())||now<locked.run.createdAt||now>=locked.run.expiresAt||!evaluateSessionAuthentication({...context.session,identityActive:true},now).allowed)throw new DemoError('UNAUTHENTICATED');
    context.now=now;return now;
  }};
  await context.refresh();return context;
}
export function fixedMembership(membership:Membership|null,persona:Persona,scope:Scope):membership is Membership {
  if(!membership||membership.status!=='ACTIVE'||membership.identityId!==persona.identityId||!sameScope(membership,scope))return false;
  const expected=[persona.kind==='LEARNER'?'learner':'manager','demo_visitor'].sort();
  return membership.bundles.length===2&&[...membership.bundles].sort().every((bundle,index)=>bundle===expected[index]);
}
export async function authorizeDemoOperation(ports:DemoAuthorityPorts,context:DemoContext,scope:Scope|null):Promise<void>{
  const allowed=PERSONA_OPERATIONS[context.persona.kind];if(!allowed||!allowed.includes(context.operation))throw new DemoError('FORBIDDEN');
  if((SELF_OPERATIONS as readonly string[]).includes(context.operation)){await context.refresh();return;}
  if(!scope||!sameScope(scope,context.run))throw new DemoError('NOT_FOUND');
  const membership=await ports.organization.getMembership(context.persona.identityId,scope);
  if(!fixedMembership(membership,context.persona,scope))throw new DemoError('FORBIDDEN');
  context.membership=membership;await context.refresh();
}
export async function requireDemoLearnerTarget(ports:DemoAuthorityPorts,context:DemoContext,identityId:string):Promise<Persona>{
  const reports=await ports.organization.listDirectReports(context.persona.identityId,context.run);
  if(reports.length!==1||new Set(reports).size!==1)throw new DemoError('FORBIDDEN');
  if(reports[0]!==identityId)throw new DemoError('NOT_FOUND');
  const target=await ports.identity.getPersona(identityId);
  if(!target||target.kind!=='LEARNER'||target.demoRunId!==context.run.id||target.identityStatus!=='ACTIVE')throw new DemoError('NOT_FOUND');
  const membership=await ports.organization.getMembership(identityId,context.run);
  if(!fixedMembership(membership,target,context.run))throw new DemoError('NOT_FOUND');
  await context.refresh();return target;
}
/** Deliberate admission may discard stale credentials, but never replaces a live normal or demo session. */
export async function assertCanBegin(ports:DemoAuthorityPorts,credential:string|null):Promise<void>{
  if(!credential)return;let verifier:Buffer;try{verifier=deriveSessionVerifier(credential);}catch{return;}
  const found=await ports.identity.findSessionByVerifier(verifier);if(!found)return;
  const runId=await ports.identity.findDemoRunId(found.identityId);const locked=runId?await ports.organization.lockRun(runId):null;
  const status=await ports.identity.getIdentityStatus(found.identityId);const session=await ports.identity.lockSession(found.id,found.identityId);const now=await ports.identity.now();
  if(!session||!evaluateSessionAuthentication({...session,identityActive:status==='ACTIVE'},now).allowed)return;
  if(!runId)throw new DemoError('PRECONDITION_FAILED');
  if(locked&&validRun(locked.run)&&now<locked.run.expiresAt)throw new DemoError('PRECONDITION_FAILED');
}
