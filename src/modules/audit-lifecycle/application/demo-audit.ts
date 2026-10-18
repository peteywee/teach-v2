import { randomUUID } from 'node:crypto';
import type { AuditPort,AuditFact,LifecycleFact } from './ports/demo-audit.js';
import type { DemoCommandContext } from '../../authorization/application/ports/demo-command-context.js';
export async function appendDemoSuccess(audit:AuditPort,context:DemoCommandContext,action:string,target:AuditFact['target'],idempotencyKey:string|null=null):Promise<void>{
  await audit.append({id:randomUUID(),...context.actor,...context.scope,occurredAt:new Date(context.now),requestId:context.requestId,idempotencyKey,action,target});
}
export async function appendDemoLifecycle(audit:AuditPort,context:DemoCommandContext,ownerCommand:string,aggregateType:LifecycleFact['aggregateType'],aggregateId:string,nextState:object,previousState:object|null=null):Promise<void>{
  await audit.appendLifecycle({id:randomUUID(),occurredAt:new Date(context.now),requestId:context.requestId,ownerCommand,...context.scope,aggregateType,aggregateId,previousState,nextState});
}
