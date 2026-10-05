import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type { IdentityCommandTransaction } from '../../application/ports/identity-command-transaction.js';
import { IdentityCommandDependenciesUnavailableError } from '../../application/ports/identity-command-transaction.js';
import type { IdentityCommandAuthorizationPort } from '../../../authorization/application/ports/identity-command-authorization.js';
import type { TransactionAuditAppendPort } from '../../../audit-lifecycle/application/ports/audit-append.js';
import { PostgresIdentityRepository } from './postgres-identity-repository.js';
import type * as schema from './schema.js';

type Transaction = Parameters<Parameters<NodePgDatabase<typeof schema>['transaction']>[0]>[0];
export interface IdentityTransactionBindings {
  // Factories receive the exact transaction that owns lifecycle/session writes.
  // Real backend adapters remain required; no default grant/no-op audit exists.
  readonly authorization: (transaction: Transaction) => IdentityCommandAuthorizationPort;
  readonly audit: (transaction: Transaction) => TransactionAuditAppendPort;
}
export class PostgresIdentityCommandTransaction implements IdentityCommandTransaction {
  constructor(private readonly db: NodePgDatabase<typeof schema>, private readonly bindings?: IdentityTransactionBindings) {}
  async run<T>(work: (context: { readonly identities: import('../../application/ports/identity-repository.js').IdentityRepository; readonly authorization: IdentityCommandAuthorizationPort; readonly audit: TransactionAuditAppendPort }) => Promise<T>): Promise<T> {
    const bindings = this.bindings;
    if (!bindings || typeof bindings.authorization !== 'function' || typeof bindings.audit !== 'function') throw new IdentityCommandDependenciesUnavailableError();
    return this.db.transaction(async transaction => {
      const authorization = bindings.authorization(transaction), audit = bindings.audit(transaction);
      if (!authorization || typeof authorization.requireAuthorization !== 'function' || !audit || typeof audit.appendRequired !== 'function') throw new IdentityCommandDependenciesUnavailableError();
      return work({ identities: new PostgresIdentityRepository(transaction), authorization, audit });
    });
  }
}
