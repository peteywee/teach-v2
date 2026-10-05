import type { IdentityLifecycleRequest } from '../../authorization/application/ports/identity-command-authorization.js';
import type { IdentityRecord } from '../domain/identity.js';
import type { IdentityCommandTransaction } from './ports/identity-command-transaction.js';

// These are mechanisms for the approved lifecycle commands. Trusted backend
// composition must provide real authority and atomic audit; fixtures do not.
export function deactivateIdentity(transaction: IdentityCommandTransaction, request: Omit<IdentityLifecycleRequest, 'command'>): Promise<IdentityRecord> {
  return changeIdentityStatus(transaction, { ...request, command: 'DeactivateIdentity' });
}
export function reactivateIdentity(transaction: IdentityCommandTransaction, request: Omit<IdentityLifecycleRequest, 'command'>): Promise<IdentityRecord> {
  return changeIdentityStatus(transaction, { ...request, command: 'ReactivateIdentity' });
}
async function changeIdentityStatus(transaction: IdentityCommandTransaction, request: IdentityLifecycleRequest): Promise<IdentityRecord> {
  const captured = structuredClone(request);
  for (const value of [captured.actorReference, captured.targetIdentityId, captured.requestId]) {
    if (typeof value !== 'string' || !value.trim()) throw new RangeError('Identity command references and requestId must be non-blank');
  }
  if (!['HumanActor', 'AutomationActor'].includes(captured.actorClass)) throw new RangeError('unsupported actor class');
  if (!(captured.now instanceof Date) || !Number.isFinite(captured.now.getTime())) throw new RangeError('Identity command clock must be finite');
  return transaction.run(async context => {
    await context.authorization.requireAuthorization(structuredClone(captured));
    const record = captured.command === 'DeactivateIdentity'
      ? await context.identities.deactivate({ id: captured.targetIdentityId, now: new Date(captured.now) })
      : await context.identities.reactivate({ id: captured.targetIdentityId, now: new Date(captured.now) });
    if (record.id !== captured.targetIdentityId || record.status !== (captured.command === 'DeactivateIdentity' ? 'INACTIVE' : 'ACTIVE')) {
      throw new Error('Identity owner returned an inconsistent lifecycle result');
    }
    await context.audit.appendRequired({
      actorReference: captured.actorReference, actorClass: captured.actorClass,
      action: captured.command, targetIdentityId: captured.targetIdentityId,
      requestId: captured.requestId, occurredAt: new Date(captured.now), result: 'SUCCEEDED',
    });
    return record;
  });
}
