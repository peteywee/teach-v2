import type { ContentPort,ContentVersion } from './ports/demo-content.js';
import type { LearningPort } from '../../learning/application/ports/demo-learning.js';
import type { Scope } from '../../organization/application/ports/demo-organization.js';
import type { AuditPort } from '../../audit-lifecycle/application/ports/demo-audit.js';
import type { DemoCommandContext } from '../../authorization/application/ports/demo-command-context.js';
import type { DemoContext } from '../../authorization/application/demo-authorization.js';
import { DemoError } from '../../authorization/application/demo-error.js';
import { appendDemoSuccess } from '../../audit-lifecycle/application/demo-audit.js';
import { validateContent,parseStrictJson,publicContent,type ValidatedContent } from '../domain/demo-content.js';

export async function readPublishedDemoContent(content:ContentPort,scope:Scope,id:string,version:string):Promise<ValidatedContent>{
  const record=await content.getVersion(id,scope.organizationId,version);if(!record)throw new DemoError('NOT_FOUND');
  let validated:ValidatedContent;try{validated=validateContent(parseStrictJson(record.canonicalJson));}catch{throw new DemoError('SERVICE_UNAVAILABLE');}
  if(record.id!==id||record.organizationId!==scope.organizationId||record.version!==version||validated.content.contentPackId!==id||validated.content.organizationId!==scope.organizationId||validated.content.version!==version||record.digest!==validated.digest||record.canonicalJson!==validated.canonicalJson)throw new DemoError('SERVICE_UNAVAILABLE');
  return validated;
}
export function sameContentVersion(a:ContentVersion,b:ContentVersion):boolean{return a.version===b.version&&a.digest===b.digest;}
export async function publishDemoContent(ports:{content:ContentPort;audit:AuditPort},context:DemoCommandContext,validated:ValidatedContent):Promise<void>{
  if(context.actor.actorClass!=='AutomationActor'||context.actor.actorReference!=='automation:demo-admission-v1'||validated.content.organizationId!==context.scope.organizationId)throw new DemoError('FORBIDDEN');
  const pack=validated.content;const existing=await ports.content.getVersion(pack.contentPackId,pack.organizationId,pack.version);
  if(existing){if(existing.digest!==validated.digest||existing.canonicalJson!==validated.canonicalJson)throw new DemoError('CONFLICT');return;}
  await context.refresh();await ports.content.publish({id:pack.contentPackId,organizationId:pack.organizationId,version:pack.version,digest:validated.digest,canonicalJson:validated.canonicalJson});
  await appendDemoSuccess(ports.audit,context,'PublishContentPack',{type:'ContentPack',id:pack.contentPackId,version:pack.version,digest:validated.digest});
}
export async function readAssignedDemoContent(ports:{content:ContentPort;learning:LearningPort},context:DemoContext,id:string,version:string){
  const assignments=await ports.learning.listAssignments(context.persona.identityId,context.scope);
  const matching=assignments.filter(a=>a.status==='ACTIVE'&&a.identityId===context.persona.identityId&&a.organizationId===context.scope.organizationId&&a.locationId===context.scope.locationId&&a.contentPackId===id&&a.contentVersion.version===version);
  if(!matching.length)throw new DemoError('NOT_FOUND');
  const value=await readPublishedDemoContent(ports.content,context.scope,id,version);
  if(matching.some(a=>a.contentVersion.digest!==value.digest))throw new DemoError('SERVICE_UNAVAILABLE');
  await context.refresh();return publicContent(value);
}
