import assert from 'node:assert/strict';
import test from 'node:test';
import {
  assertConfirmedOutcome,
  validateOpenReconciliationRecordInput,
  type OpenReconciliationRecordInput,
} from './reconciliation-record.js';

const base: OpenReconciliationRecordInput = {
  id: 'recon-1',
  outcome: 'AMBIGUOUS',
  operationName: 'SendInvitationEmail',
  authoritativeScope: { organizationId: 'acme' },
  providerName: 'email-provider',
};

test('open reconciliation input accepts ambiguous provider state', () => {
  assert.doesNotThrow(() => validateOpenReconciliationRecordInput(base));
});

test('idempotency retention must cover the full retry/reconciliation horizon', () => {
  assert.throws(
    () =>
      validateOpenReconciliationRecordInput({
        ...base,
        idempotency: {
          key: 'idem-1',
          source: 'CLIENT_SUPPLIED',
          payloadHash: 'payload-a',
          retryHorizonEndsAt: new Date('2026-10-05T00:00:00Z'),
          retentionUntil: new Date('2026-10-04T23:59:59Z'),
        },
      }),
    /retention must not end before/,
  );
});

test('resolution accepts only canonical confirmed outcomes', () => {
  assert.doesNotThrow(() => assertConfirmedOutcome('CONFIRMED_SUCCESS'));
  assert.doesNotThrow(() => assertConfirmedOutcome('CONFIRMED_NO_EFFECT'));
  assert.throws(() => assertConfirmedOutcome('AMBIGUOUS'), /may resolve only/);
  assert.throws(() => assertConfirmedOutcome('PARTIAL_FAILURE'), /may resolve only/);
});
