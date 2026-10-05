import type { SessionRevocationRequest } from '../../authorization/application/ports/session-command-authorization.js';
import type { ApplicationSessionRecord } from '../domain/application-session.js';
import type { ApplicationSessionCommandTransaction } from './ports/application-session-command-transaction.js';

export async function revokeApplicationSession(
  transaction: ApplicationSessionCommandTransaction,
  request: Omit<SessionRevocationRequest, 'command'>,
): Promise<ApplicationSessionRecord> {
  const captured: SessionRevocationRequest = structuredClone({ ...request, command: 'RevokeApplicationSession' as const });
  for (const value of [captured.actorReference, captured.targetIdentityId, captured.targetSessionId, captured.requestId]) {
    if (typeof value !== 'string' || !value.trim()) throw new RangeError('Session command references and requestId must be non-blank');
  }
  if (!['HumanActor', 'AutomationActor'].includes(captured.actorClass)) throw new RangeError('unsupported actor class');
  if (!(captured.now instanceof Date) || !Number.isFinite(captured.now.getTime())) throw new RangeError('Session command clock must be finite');
  return transaction.run(async context => {
    await context.sessionAuthorization.requireSessionAuthorization(structuredClone(captured));
    const outcome = await context.sessions.revokeWithOutcome({ id: captured.targetSessionId, identityId: captured.targetIdentityId, now: new Date(captured.now) });
    const session = outcome.session;
    if (session.id !== captured.targetSessionId || session.identityId !== captured.targetIdentityId ||
        typeof outcome.transitioned !== 'boolean' || !['REVOKED', 'EXPIRED'].includes(session.status) || outcome.transitioned && session.status !== 'REVOKED') {
      throw new Error('Identity owner returned an inconsistent session revocation result');
    }
    // Terminal sessions stay terminal; repeated revocation cannot append another success event.
    if (outcome.transitioned) await context.audit.appendRequired({
      actorReference: captured.actorReference, actorClass: captured.actorClass, action: captured.command,
      targetIdentityId: captured.targetIdentityId, targetSessionId: captured.targetSessionId,
      requestId: captured.requestId, occurredAt: new Date(captured.now), result: 'SUCCEEDED',
    });
    return session;
  });
}
