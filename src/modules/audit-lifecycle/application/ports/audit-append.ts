// Application Interfaces: AuditAppendInterface; C23 AUD-2/3.
// Logical facts only. This does not admit AuditEvent storage or retention.
export interface RequiredAuditFacts {
  readonly actorReference: string;
  readonly actorClass: 'HumanActor' | 'AutomationActor';
  readonly action: 'DeactivateIdentity' | 'ReactivateIdentity';
  readonly targetIdentityId: string;
  readonly requestId: string;
  readonly occurredAt: Date;
  readonly result: 'SUCCEEDED';
}
export interface TransactionAuditAppendPort {
  appendRequired(facts: RequiredAuditFacts): Promise<void>;
}
