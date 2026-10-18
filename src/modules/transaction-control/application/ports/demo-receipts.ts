import type { Scope } from '../../../organization/application/ports/demo-organization.js';
import type { Actor } from '../../../authorization/application/ports/demo-actor.js';
export type ReceiptKey = Scope & Actor & { operation: 'AssignContent'|'StartLearningSession'|'RecordProgressEvent'; key: string };
export type Receipt = ReceiptKey & { id: string; canonicalPayloadDigest: string; responseSchemaVersion: 1; response: object; createdAt: Date; replayUntil: Date };
export interface ReceiptPort { get(key:ReceiptKey):Promise<Receipt|null>; put(receipt:Receipt):Promise<void> }
