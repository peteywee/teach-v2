import {fixedMembership,sameScope,type DemoContext,type DemoAuthorityPorts} from './demo-authorization.js';
import {DemoError} from './demo-error.js';
import type {Scope} from '../../organization/application/ports/demo-organization.js';
import type {AuthoringOwner} from '../../content/application/ports/demo-authoring.js';
export const AUTHORING_OPERATIONS=['ReadAuthoringWorkspace','SaveContentDraft','PreviewContentDraft','PublishContentDraft','ReadAuthoringOperation'] as const;
export type AuthoringOperation=typeof AUTHORING_OPERATIONS[number];
export function isAuthoringOperation(value:string):value is AuthoringOperation{return (AUTHORING_OPERATIONS as readonly string[]).includes(value);}
export async function authorizeDemoAuthoring(ports:DemoAuthorityPorts,context:DemoContext,scope:Scope):Promise<AuthoringOwner>{
 if(!isAuthoringOperation(context.operation)||context.persona.kind!=='MANAGER'||context.actor.actorClass!=='HumanActor'||context.actor.actorReference!==context.persona.identityId)throw new DemoError('FORBIDDEN');
 if(!sameScope(scope,context.run))throw new DemoError('NOT_FOUND');
 const membership=await ports.organization.getMembership(context.persona.identityId,context.run);if(!fixedMembership(membership,context.persona,context.run))throw new DemoError('FORBIDDEN');
 context.membership=membership;await context.refresh();return {...context.scope,runId:context.run.id,managerIdentityId:context.persona.identityId};
}
