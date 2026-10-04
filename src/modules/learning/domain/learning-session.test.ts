import assert from 'node:assert/strict';
import { test } from 'node:test';
import { assertActiveLearningSession, assertValidLearningSession, completeLearningSession, newLearningSession, type LearningSessionRecord } from './learning-session.js';

const references = { id: 'session-1', identityId: 'learner-1', assignmentId: 'assignment-1' };
test('new session is ACTIVE with exactly one required learner and assignment', () => {
  assert.deepEqual(newLearningSession(references), { ...references, status: 'ACTIVE' });
  assert.ok(Object.isFrozen(newLearningSession(references)));
});
for (const key of ['id', 'identityId', 'assignmentId'] as const) {
  for (const value of ['', ' ', null, undefined]) {
    test(`reject ${key}=${String(value)}`, () => assert.throws(() => newLearningSession({ ...references, [key]: value } as unknown as typeof references), /must be non-blank/));
  }
}
test('ACTIVE completes once and COMPLETED is terminal', () => {
  const active = newLearningSession(references);
  const completed = completeLearningSession(active);
  assert.equal(active.status, 'ACTIVE');
  assert.deepEqual(completed, { ...references, status: 'COMPLETED' });
  assert.throws(() => completeLearningSession(completed), /terminal/);
  assert.throws(() => assertActiveLearningSession(completed), /terminal/);
});
for (const status of ['PAUSED', 'ABANDONED', 'REOPENED', '', null]) {
  test(`reject unregistered status ${String(status)}`, () => {
    const record = { ...references, status } as unknown as LearningSessionRecord;
    assert.throws(() => assertValidLearningSession(record), /unregistered/);
    assert.throws(() => completeLearningSession(record), /unregistered/);
  });
}
