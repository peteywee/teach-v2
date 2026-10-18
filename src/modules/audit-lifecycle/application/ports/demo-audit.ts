import type { Scope } from '../../../organization/application/ports/demo-organization.js';
import type { Actor } from '../../../authorization/application/ports/demo-actor.js';
export type AuditFact = Actor & { organizationId:string|null; locationId:string|null; id: string; occurredAt: Date; requestId: string; idempotencyKey: string|null; action: string; target: { type: string; id: string; version?: string; digest?: string } };
export type LifecycleFact = { id: string; occurredAt: Date; requestId: string; ownerCommand: string; organizationId: string|null; locationId: string|null; aggregateType: 'Identity'|'Membership'|'Assignment'|'DemoRun'; aggregateId: string; previousState: object|null; nextState: object };
export type DenialFact = { requestId:string; operation:string; actorReference:string|null; identityId?:string; organizationId:string|null; locationId:string|null; denialClass:'CAPABILITY'|'TENANT_SCOPE'|'TARGET_SCOPE'|'CREDENTIAL_ABUSE'|'ORIGIN'; ipPrefix:string|null; occurredAt:Date };
export interface AuditPort { append(fact:AuditFact):Promise<void>; appendLifecycle(fact:LifecycleFact):Promise<void>; appendDenial(fact:DenialFact):Promise<void> }
