import assert from 'node:assert/strict';
import { test } from 'node:test';
import { newLearningSession, completeLearningSession, type LearningSessionRecord } from '../domain/learning-session.js';
import { startLearningSession, readLearningSession, finishLearningSession, LearningSessionUnavailableError } from './learning-session-service.js';
import type { LearningSessionRepository, LearningAssignmentAuthorizationPort } from './ports/learning-session-repository.js';

const references = { id: 'session-1', identityId: 'learner-1', assignmentId: 'assignment-1' };
function fixture() {
  const rows = new Map<string, LearningSessionRecord>();
  let writes = 0;
  const repository: LearningSessionRepository = {
    async createAuthorizedStart(record) {
      if (rows.has(record.id)) throw new Error('duplicate LearningSessionId');
      writes++; rows.set(record.id, record); return record;
    },
    async getById(scope) { const record = rows.get(scope.id); return record?.identityId === scope.identityId ? record : null; },
    async completeActive(scope) {
      const record = rows.get(scope.id);
      if (!record || record.identityId !== scope.identityId || record.status !== 'ACTIVE') return null;
      const completed = completeLearningSession(record); writes++; rows.set(completed.id, completed); return completed;
    },
  };
  const authorization: LearningAssignmentAuthorizationPort = {
    async authorizeSessionStart(input) { return { ...input, assigned: true, authorized: true }; },
  };
  return { repository, authorization, rows, writes: () => writes };
}
test('assigned and authorized start persists ACTIVE', async () => {
  const f = fixture();
  assert.deepEqual(await startLearningSession(f.repository, f.authorization, references), newLearningSession(references));
  assert.equal(f.writes(), 1);
});
for (const grant of [null, undefined, { ...references, assigned: false, authorized: true },
  { ...references, assigned: true, authorized: false },
  { ...references, identityId: 'other', assigned: true, authorized: true },
  { ...references, assignmentId: 'other', assigned: true, authorized: true }]) {
  test(`deny invalid authorization ${JSON.stringify(grant)} without write`, async () => {
    const f = fixture();
    const authorization = { async authorizeSessionStart() { return grant; } } as unknown as LearningAssignmentAuthorizationPort;
    await assert.rejects(startLearningSession(f.repository, authorization, references), LearningSessionUnavailableError);
    assert.equal(f.writes(), 0);
  });
}
test('unavailable authorization denies without retry or write', async () => {
  const f = fixture(); let calls = 0;
  const authorization: LearningAssignmentAuthorizationPort = { async authorizeSessionStart() { calls++; throw new Error('authoritative adapter unavailable'); } };
  await assert.rejects(startLearningSession(f.repository, authorization, references), /adapter unavailable/);
  assert.equal(calls, 1); assert.equal(f.writes(), 0);
});
test('invalid assignment is rejected before invoking authorization', async () => {
  const f = fixture(); let calls = 0;
  const authorization: LearningAssignmentAuthorizationPort = { async authorizeSessionStart() { calls++; return null; } };
  await assert.rejects(startLearningSession(f.repository, authorization, { ...references, assignmentId: '' }), /non-blank/);
  assert.equal(calls, 0); assert.equal(f.writes(), 0);
});
test('cross-Identity read and completion deny without write', async () => {
  const f = fixture(); f.rows.set(references.id, newLearningSession(references));
  const scope = { id: references.id, identityId: 'other' };
  await assert.rejects(readLearningSession(f.repository, scope), LearningSessionUnavailableError);
  await assert.rejects(finishLearningSession(f.repository, scope), LearningSessionUnavailableError);
  assert.equal(f.writes(), 0);
});
test('completion once; duplicate and missing completion deny without more writes', async () => {
  const f = fixture(); f.rows.set(references.id, newLearningSession(references));
  const scope = { id: references.id, identityId: references.identityId };
  assert.equal((await finishLearningSession(f.repository, scope)).status, 'COMPLETED');
  await assert.rejects(finishLearningSession(f.repository, scope), LearningSessionUnavailableError);
  await assert.rejects(finishLearningSession(f.repository, { ...scope, id: 'missing' }), LearningSessionUnavailableError);
  assert.equal(f.writes(), 1);
});
test('wrong-scope repository result is rejected without disclosure', async () => {
  const f = fixture();
  f.repository.getById = async () => newLearningSession({ ...references, identityId: 'other' });
  await assert.rejects(readLearningSession(f.repository, references), LearningSessionUnavailableError);
});
test('duplicate start cannot overwrite or reopen a completed record', async () => {
  const f = fixture(); f.rows.set(references.id, completeLearningSession(newLearningSession(references)));
  await assert.rejects(startLearningSession(f.repository, f.authorization, references), /duplicate/);
  assert.equal(f.rows.get(references.id)?.status, 'COMPLETED'); assert.equal(f.writes(), 0);
});
test('caller mutation during authorization cannot change the persisted request', async () => {
  const f = fixture(); const input = { ...references };
  const authorization: LearningAssignmentAuthorizationPort = {
    async authorizeSessionStart(scope) {
      input.identityId = 'other'; input.assignmentId = 'other'; input.id = 'other';
      return { ...scope, assigned: true, authorized: true };
    },
  };
  assert.deepEqual(await startLearningSession(f.repository, authorization, input), newLearningSession(references));
});
test('wrong-scope create result is rejected without disclosure', async () => {
  const f = fixture();
  f.repository.createAuthorizedStart = async () => newLearningSession({ ...references, identityId: 'other' });
  await assert.rejects(startLearningSession(f.repository, f.authorization, references), LearningSessionUnavailableError);
});
