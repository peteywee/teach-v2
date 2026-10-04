import type { ConfirmedExternalEffectOutcome, JsonObject, ReconciliationRecord } from '../../domain/reconciliation-record.js';

// Application Interfaces 1.0.0: ExternalProviderReadbackInterface.
// An Infrastructure adapter must establish canonical provider facts. Test doubles
// prove orchestration only; this port has no send or retry operation.
export interface ExternalProviderReadbackPort {
  readCanonicalState(record: Readonly<ReconciliationRecord>): Promise<
    | { readonly outcome: ConfirmedExternalEffectOutcome }
    | { readonly outcome: 'UNAVAILABLE' }
  >;
}

export interface ReconciliationRequest {
  readonly id: string;
  readonly authoritativeScope: JsonObject;
}
