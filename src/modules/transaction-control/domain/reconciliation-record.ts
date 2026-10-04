export const reconciliationRecordStatuses = ['OPEN', 'RESOLVED'] as const;
export type ReconciliationRecordStatus =
  (typeof reconciliationRecordStatuses)[number];

export const externalEffectOutcomes = [
  'AMBIGUOUS',
  'PARTIAL_FAILURE',
  'CONFIRMED_SUCCESS',
  'CONFIRMED_NO_EFFECT',
] as const;
export type ExternalEffectOutcome = (typeof externalEffectOutcomes)[number];

export type OpenExternalEffectOutcome = Extract<
  ExternalEffectOutcome,
  'AMBIGUOUS' | 'PARTIAL_FAILURE'
>;

export type ConfirmedExternalEffectOutcome = Extract<
  ExternalEffectOutcome,
  'CONFIRMED_SUCCESS' | 'CONFIRMED_NO_EFFECT'
>;

export const idempotencyKeySources = [
  'CLIENT_SUPPLIED',
  'SERVER_DERIVED',
] as const;
export type IdempotencyKeySource = (typeof idempotencyKeySources)[number];

export type JsonObject = Readonly<Record<string, unknown>>;

export interface IdempotencyBinding {
  readonly key: string;
  readonly source: IdempotencyKeySource;
  readonly payloadHash: string;
  readonly retryHorizonEndsAt: Date;
  readonly retentionUntil: Date;
}

export interface OpenReconciliationRecordInput {
  readonly id: string;
  readonly outcome: OpenExternalEffectOutcome;
  readonly operationName: string;
  readonly authoritativeScope: JsonObject;
  readonly providerName: string;
  readonly providerReference?: string;
  readonly providerDetail?: JsonObject;
  readonly idempotency?: IdempotencyBinding;
}

export interface ReconciliationRecord {
  readonly id: string;
  readonly status: ReconciliationRecordStatus;
  readonly outcome: ExternalEffectOutcome;
  readonly operationName: string;
  readonly scopeFingerprint: string;
  readonly authoritativeScope: JsonObject;
  readonly providerName: string;
  readonly providerReference: string | null;
  readonly providerDetail: JsonObject;
  readonly lastReadbackAt: Date | null;
  readonly lastReadbackError: string | null;
  readonly idempotencyKey: string | null;
  readonly idempotencyKeySource: IdempotencyKeySource | null;
  readonly payloadHash: string | null;
  readonly retryHorizonEndsAt: Date | null;
  readonly idempotencyRetentionUntil: Date | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly resolvedAt: Date | null;
}

export function validateOpenReconciliationRecordInput(
  input: OpenReconciliationRecordInput,
): void {
  requireNonBlank(input.id, 'id');
  requireNonBlank(input.operationName, 'operationName');
  requireNonBlank(input.providerName, 'providerName');

  if (input.providerReference !== undefined) {
    requireNonBlank(input.providerReference, 'providerReference');
  }

  if (!input.idempotency) return;

  requireNonBlank(input.idempotency.key, 'idempotency.key');
  requireNonBlank(input.idempotency.payloadHash, 'idempotency.payloadHash');

  if (
    input.idempotency.retentionUntil.getTime() <
    input.idempotency.retryHorizonEndsAt.getTime()
  ) {
    throw new RangeError(
      'idempotency retention must not end before the retry/reconciliation horizon',
    );
  }
}

export function assertConfirmedOutcome(
  outcome: ExternalEffectOutcome,
): asserts outcome is ConfirmedExternalEffectOutcome {
  if (
    outcome !== 'CONFIRMED_SUCCESS' &&
    outcome !== 'CONFIRMED_NO_EFFECT'
  ) {
    throw new RangeError(
      'reconciliation may resolve only to CONFIRMED_SUCCESS or CONFIRMED_NO_EFFECT',
    );
  }
}

function requireNonBlank(value: string, name: string): void {
  if (value.trim().length === 0) {
    throw new RangeError(`${name} must be non-blank`);
  }
}
