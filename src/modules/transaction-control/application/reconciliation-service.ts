import type { ReconciliationRecord } from '../domain/reconciliation-record.js';
import { ReconciliationRecordNotFoundError, type ReconciliationRecordRepository } from './ports/reconciliation-record-repository.js';
import type { ExternalProviderReadbackPort, ReconciliationRequest } from './ports/external-provider-readback.js';

// Foundation for ReconcileExternalEffect (TXN-6/7/8/14/16). The composition root
// must supply server-resolved scope, a canonical provider adapter and clock.
// No runtime adapter or permission to retry is established by this service.
export async function reconcileExternalEffect(
  repository: ReconciliationRecordRepository,
  provider: ExternalProviderReadbackPort,
  request: ReconciliationRequest,
  clock: () => Date,
): Promise<ReconciliationRecord> {
  const captured = structuredClone(request);
  const record = await repository.getById(captured.id, captured.authoritativeScope);
  if (!record) throw new ReconciliationRecordNotFoundError();
  if (record.status === 'RESOLVED') return record;
  let outcome: unknown;
  try {
    const readback = await provider.readCanonicalState(structuredClone(record));
    outcome = readback?.outcome;
  } catch {
    // Provider errors may contain secrets. Persist only a fixed safe diagnostic.
    outcome = 'UNAVAILABLE';
  }
  const readbackAt = new Date(clock().getTime());
  if (!Number.isFinite(readbackAt.getTime())) throw new RangeError('readback clock must return a finite date');
  const target = { id: captured.id, authoritativeScope: captured.authoritativeScope, readbackAt };
  if (outcome === 'CONFIRMED_SUCCESS' || outcome === 'CONFIRMED_NO_EFFECT') {
    return repository.resolve({ ...target, outcome });
  }
  // Absent, malformed, ambiguous and partial readbacks all remain unresolved.
  return repository.recordReadbackUnavailable({ ...target, error: 'canonical provider readback unavailable' });
}
