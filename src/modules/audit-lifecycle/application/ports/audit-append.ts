// Application Interfaces: AuditAppendInterface; C23 AUD-2/3.
// Logical facts only. This does not admit AuditEvent storage or retention.
interface AuditFactsBase {
  readonly actorReference: string;
  readonly actorClass: 'HumanActor' | 'AutomationActor';
  readonly targetIdentityId: string;
  readonly requestId: string;
  readonly occurredAt: Date;
  readonly result: 'SUCCEEDED';
}
export type RequiredAuditFacts = AuditFactsBase & (
  | { readonly action: 'DeactivateIdentity' | 'ReactivateIdentity' }
  | { readonly action: 'RevokeApplicationSession'; readonly targetSessionId: string }
);

export interface TransactionAuditAppendPort {
  appendRequired(facts: RequiredAuditFacts): Promise<void>;
}
