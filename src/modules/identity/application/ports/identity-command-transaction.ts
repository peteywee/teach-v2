import type { IdentityRepository } from './identity-repository.js';
import type { IdentityCommandAuthorizationPort } from '../../../authorization/application/ports/identity-command-authorization.js';
import type { TransactionAuditAppendPort } from '../../../audit-lifecycle/application/ports/audit-append.js';

export interface IdentityCommandTransaction {
  run<T>(work: (context: {
    readonly identities: IdentityRepository;
    readonly authorization: IdentityCommandAuthorizationPort;
    readonly audit: TransactionAuditAppendPort;
  }) => Promise<T>): Promise<T>;
}
export class IdentityCommandDependenciesUnavailableError extends Error {
  constructor() {
    super('Identity command BLOCKED: authoritative transaction-bound authorization and audit adapters are required');
    this.name = 'IdentityCommandDependenciesUnavailableError';
  }
}
