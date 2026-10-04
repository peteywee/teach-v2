import type {
  ConfirmedExternalEffectOutcome,
  JsonObject,
  OpenReconciliationRecordInput,
  ReconciliationRecord,
} from '../../domain/reconciliation-record.js';

export interface ReconciliationReadbackUnavailableInput {
  readonly id: string;
  readonly authoritativeScope: JsonObject;
  readonly readbackAt: Date;
  readonly error: string;
  readonly providerDetail?: JsonObject;
}

export interface ResolveReconciliationRecordInput {
  readonly id: string;
  readonly authoritativeScope: JsonObject;
  readonly outcome: ConfirmedExternalEffectOutcome;
  readonly readbackAt: Date;
  readonly providerDetail?: JsonObject;
}

export interface ReconciliationRecordRepository {
  createOpen(input: OpenReconciliationRecordInput): Promise<ReconciliationRecord>;

  getById(
    id: string,
    authoritativeScope: JsonObject,
  ): Promise<ReconciliationRecord | null>;

  recordReadbackUnavailable(
    input: ReconciliationReadbackUnavailableInput,
  ): Promise<ReconciliationRecord>;

  resolve(
    input: ResolveReconciliationRecordInput,
  ): Promise<ReconciliationRecord>;
}

export class ReconciliationRecordNotFoundError extends Error {
  constructor() {
    super('reconciliation record not found in authoritative scope');
    this.name = 'ReconciliationRecordNotFoundError';
  }
}

export class ReconciliationRecordConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ReconciliationRecordConflictError';
  }
}

export class IdempotencyKeyBindingConflictError extends Error {
  constructor() {
    super('idempotency key is already bound to a different operation, payload, or key source');
    this.name = 'IdempotencyKeyBindingConflictError';
  }
}
