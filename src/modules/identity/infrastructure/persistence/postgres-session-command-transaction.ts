import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type { ApplicationSessionCommandTransaction, ApplicationSessionRevocationRepository } from '../../application/ports/application-session-command-transaction.js';
import { IdentityCommandDependenciesUnavailableError } from '../../application/ports/identity-command-transaction.js';
import type { SessionCommandAuthorizationPort } from '../../../authorization/application/ports/session-command-authorization.js';
import type { TransactionAuditAppendPort } from '../../../audit-lifecycle/application/ports/audit-append.js';
import { PostgresApplicationSessionRepository } from './postgres-application-session-repository.js';
import type * as schema from './schema.js';

type Transaction = Parameters<Parameters<NodePgDatabase<typeof schema>['transaction']>[0]>[0];
export interface SessionTransactionBindings {
  readonly authorization: (transaction: Transaction) => SessionCommandAuthorizationPort;
  readonly audit: (transaction: Transaction) => TransactionAuditAppendPort;
}
export class PostgresSessionCommandTransaction implements ApplicationSessionCommandTransaction {
  constructor(private readonly db: NodePgDatabase<typeof schema>, private readonly bindings?: SessionTransactionBindings) {}
  async run<T>(work: (context: { readonly sessions: ApplicationSessionRevocationRepository; readonly sessionAuthorization: SessionCommandAuthorizationPort; readonly audit: TransactionAuditAppendPort }) => Promise<T>): Promise<T> {
    const authorizationFactory = this.bindings?.authorization, auditFactory = this.bindings?.audit;
    if (typeof authorizationFactory !== 'function' || typeof auditFactory !== 'function') throw new IdentityCommandDependenciesUnavailableError();
    return this.db.transaction(async transaction => {
      const sessionAuthorization = authorizationFactory(transaction), audit = auditFactory(transaction);
      if (!sessionAuthorization || typeof sessionAuthorization.requireSessionAuthorization !== 'function' || !audit || typeof audit.appendRequired !== 'function') throw new IdentityCommandDependenciesUnavailableError();
      return work({ sessions: new PostgresApplicationSessionRepository(transaction), sessionAuthorization, audit });
    });
  }
}
