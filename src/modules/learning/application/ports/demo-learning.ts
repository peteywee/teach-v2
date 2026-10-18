import type { Scope } from '../../../organization/application/ports/demo-organization.js';
import type { ContentVersion, Evaluation } from '../../../content/application/ports/demo-content.js';
export type Assignment = Scope & { id: string; identityId: string; contentPackId: string; contentVersion: ContentVersion; assignedAt: Date; status: 'ACTIVE' };
export type LearningSession = { id: string; identityId: string; assignmentId: string; status: 'ACTIVE'|'COMPLETED'; startedAt: Date; completedAt: Date|null };
export type Progress = { id: string; learningSessionId: string; contentPackId: string; contentVersion: ContentVersion; eventSchemaVersion: '1.0.0'; sequence: number; evaluation: Evaluation; recordedAt: Date };
export interface LearningPort {
 countAssignments(scope:Scope): Promise<number>;
 createAssignment(value:Assignment): Promise<void>;
 getAssignment(id:string,scope:Scope): Promise<Assignment|null>;
 listAssignments(identityId:string,scope:Scope): Promise<Assignment[]>;
 createSession(value:LearningSession): Promise<void>;
 getSession(id:string): Promise<LearningSession|null>;
 getSessionByAssignment(assignmentId:string): Promise<LearningSession|null>;
 listProgress(sessionId:string): Promise<Progress[]>;
 appendProgress(value:Progress): Promise<void>;
 completeSession(id:string,now:Date): Promise<LearningSession>;
}
