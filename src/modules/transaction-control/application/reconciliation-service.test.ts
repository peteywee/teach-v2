import assert from 'node:assert/strict';
import test from 'node:test';
import { reconcileExternalEffect } from './reconciliation-service.js';
import { ReconciliationRecordNotFoundError, type ReconciliationRecordRepository } from './ports/reconciliation-record-repository.js';
import type { ExternalProviderReadbackPort } from './ports/external-provider-readback.js';
import type { ReconciliationRecord } from '../domain/reconciliation-record.js';

const at = new Date('2026-10-04T12:00:00Z');
const request = () => ({ id: 'recon', authoritativeScope: { organizationId: 'acme', nested: { locationId: 'one' } } });
function record(): ReconciliationRecord {
  return { id: 'recon', status: 'OPEN', outcome: 'AMBIGUOUS', operationName: 'SendInvitationEmail',
    scopeFingerprint: 'fixture', authoritativeScope: request().authoritativeScope, providerName: 'email-provider',
    providerReference: 'ref', providerDetail: {}, lastReadbackAt: null, lastReadbackError: null,
    idempotencyKey: null, idempotencyKeySource: null, payloadHash: null, retryHorizonEndsAt: null,
    idempotencyRetentionUntil: null, createdAt: at, updatedAt: at, resolvedAt: null };
}
function fixture(initial: ReconciliationRecord | null = record()) {
  let current = initial;
  const writes: unknown[] = [];
  const repository: ReconciliationRecordRepository = {
    async createOpen() { throw new Error('service must not open a new record'); },
    async getById() { return current; },
    async resolve(input) { writes.push(input); return current = { ...current!, status: 'RESOLVED', outcome: input.outcome, resolvedAt: input.readbackAt, lastReadbackAt: input.readbackAt, lastReadbackError: null }; },
    async recordReadbackUnavailable(input) { writes.push(input); return current = { ...current!, lastReadbackAt: input.readbackAt, lastReadbackError: input.error }; },
  };
  return { repository, writes };
}
for (const outcome of ['CONFIRMED_SUCCESS', 'CONFIRMED_NO_EFFECT'] as const) {
  test(`canonical ${outcome} readback precedes resolution and never sends`, async () => {
    const f = fixture(); let reads = 0;
    const result = await reconcileExternalEffect(f.repository, { async readCanonicalState(row) {
      reads++; assert.equal(row.status, 'OPEN'); assert.equal(row.providerReference, 'ref'); assert.equal(f.writes.length, 0); return { outcome };
    } }, request(), () => at);
    assert.equal(reads, 1); assert.equal(result.status, 'RESOLVED'); assert.equal(result.outcome, outcome);
    assert.equal(f.writes.length, 1); assert.equal(result.resolvedAt?.getTime(), at.getTime());
  });
  test(`resolved ${outcome} replay does not re-read provider or write`, async () => {
    const f = fixture({ ...record(), status: 'RESOLVED', outcome, resolvedAt: at });
    await reconcileExternalEffect(f.repository, { async readCanonicalState() { throw new Error('must not read'); } }, request(), () => { throw new Error('must not clock'); });
    assert.equal(f.writes.length, 0);
  });
}
for (const reply of [undefined, null, {}, { outcome: 'AMBIGUOUS' }, { outcome: 'PARTIAL_FAILURE' }, { outcome: 'SUCCESS' }, { outcome: 'UNAVAILABLE' }]) {
  test(`unconfirmed provider reply ${JSON.stringify(reply)} preserves OPEN`, async () => {
    const f = fixture();
    const provider = { async readCanonicalState() { return reply; } } as unknown as ExternalProviderReadbackPort;
    const result = await reconcileExternalEffect(f.repository, provider, request(), () => at);
    assert.equal(result.status, 'OPEN'); assert.equal(result.outcome, 'AMBIGUOUS'); assert.equal(result.resolvedAt, null);
    assert.equal(f.writes.length, 1); assert.equal(result.lastReadbackError, 'canonical provider readback unavailable');
  });
}
test('provider exception preserves partial failure without persisting secret diagnostics', async () => {
  const f = fixture({ ...record(), outcome: 'PARTIAL_FAILURE' });
  const result = await reconcileExternalEffect(f.repository, { async readCanonicalState() { throw new Error('secret-provider-token'); } }, request(), () => at);
  assert.equal(result.status, 'OPEN'); assert.equal(result.outcome, 'PARTIAL_FAILURE');
  assert.equal(JSON.stringify(f.writes).includes('secret-provider-token'), false);
});
test('missing or wrong-scope record prevents provider access and writes', async () => {
  const f = fixture(null); let reads = 0;
  await assert.rejects(reconcileExternalEffect(f.repository, { async readCanonicalState() { reads++; return { outcome: 'CONFIRMED_SUCCESS' }; } }, request(), () => at), ReconciliationRecordNotFoundError);
  assert.equal(reads, 0); assert.equal(f.writes.length, 0);
});
test('caller and provider mutation cannot redirect the captured scope or record', async () => {
  const f = fixture(); const mutable = request();
  const result = await reconcileExternalEffect(f.repository, { async readCanonicalState(row) {
    mutable.id = 'redirect'; mutable.authoritativeScope.nested.locationId = 'other';
    (row.authoritativeScope.nested as { locationId: string }).locationId = 'provider-changed';
    return { outcome: 'CONFIRMED_SUCCESS' };
  } }, mutable, () => at);
  assert.equal(result.id, 'recon');
  assert.deepEqual(f.writes[0], { ...request(), readbackAt: at, outcome: 'CONFIRMED_SUCCESS' });
  assert.equal((result.authoritativeScope.nested as { locationId: string }).locationId, 'one');
});
test('repository failure propagates and provider is called once', async () => {
  const f = fixture(); let reads = 0;
  f.repository.resolve = async () => { throw new Error('forced persistence failure'); };
  await assert.rejects(reconcileExternalEffect(f.repository, { async readCanonicalState() { reads++; return { outcome: 'CONFIRMED_SUCCESS' }; } }, request(), () => at), /forced persistence failure/);
  assert.equal(reads, 1);
});
test('invalid clock prevents all writes after canonical readback', async () => {
  const f = fixture();
  await assert.rejects(reconcileExternalEffect(f.repository, { async readCanonicalState() { return { outcome: 'CONFIRMED_SUCCESS' }; } }, request(), () => new Date(NaN)), /finite date/);
  assert.equal(f.writes.length, 0);
});
