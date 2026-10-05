import type { ApplicationSessionRecord } from '../../domain/application-session.js';
import type { SessionCommandAuthorizationPort } from '../../../authorization/application/ports/session-command-authorization.js';
import type { TransactionAuditAppendPort } from '../../../audit-lifecycle/application/ports/audit-append.js';

export interface ApplicationSessionRevocationRepository {
  // The owner must serialize status read and transition, including duplicate calls.
  revokeWithOutcome(input: { readonly id: string; readonly identityId: string; readonly now: Date }): Promise<{ readonly session: ApplicationSessionRecord; readonly transitioned: boolean }>;
}
export interface ApplicationSessionCommandTransaction {
  run<T>(work: (context: {
    readonly sessions: ApplicationSessionRevocationRepository;
    readonly sessionAuthorization: SessionCommandAuthorizationPort;
    readonly audit: TransactionAuditAppendPort;
  }) => Promise<T>): Promise<T>;
}
