import type { ApplicationSessionRecord } from '../../domain/application-session.js';
import type { ApplicationSessionRepository } from './application-session-repository.js';
import type { ApplicationSessionRevocationRepository } from './application-session-command-transaction.js';
export type PersonaKind = 'LEARNER' | 'MANAGER';
export type Persona = { id: string; identityId: string; demoRunId: string; kind: PersonaKind; createdAt: Date; identityStatus: 'ACTIVE'|'INACTIVE'|'DELETED' };
export interface IdentityPort {
 now():Promise<Date>;
 findDemoRunId(identityId:string):Promise<string|null>;
 getIdentityStatus(identityId:string):Promise<'ACTIVE'|'INACTIVE'|'DELETED'|null>;
 lockSession(id:string,identityId:string):Promise<ApplicationSessionRecord|null>;
 findSessionByVerifier(verifier: Buffer): Promise<{id:string;identityId:string}|null>;
 // Uses the existing canonical session repository for creation/authentication/revocation.
 sessions: ApplicationSessionRepository & ApplicationSessionRevocationRepository;
 createPersona(value:{id:string;identityId:string;demoRunId:string;kind:PersonaKind;createdAt:Date}): Promise<Persona>;
 getPersona(identityId:string): Promise<Persona|null>;
 listPersonas(runId:string): Promise<Persona[]>;
 countSessions(runId:string): Promise<number>;
 listActiveSessions(runId:string): Promise<Array<{id:string;identityId:string}>>;
}
