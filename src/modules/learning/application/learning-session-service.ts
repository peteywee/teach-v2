import {
  assertValidLearningSession,
  newLearningSession,
  type LearningSessionRecord,
} from '../domain/learning-session.js';
import type {
  LearningAssignmentAuthorizationPort,
  LearningSessionRepository,
  LearningSessionScope,
} from './ports/learning-session-repository.js';

export class LearningSessionUnavailableError extends Error {
  constructor() {
    super('LearningSession unavailable in authoritative Identity scope');
    this.name = 'LearningSessionUnavailableError';
  }
}

export async function startLearningSession(
  repository: LearningSessionRepository,
  authorization: LearningAssignmentAuthorizationPort,
  input: Omit<LearningSessionRecord, 'status'>,
): Promise<LearningSessionRecord> {
  const requested = newLearningSession(input);
  const grant = await authorization.authorizeSessionStart({ identityId: requested.identityId, assignmentId: requested.assignmentId });
  if (!grant || grant.assigned !== true || grant.authorized !== true ||
      grant.identityId !== requested.identityId || grant.assignmentId !== requested.assignmentId) {
    throw new LearningSessionUnavailableError();
  }
  const created = await repository.createAuthorizedStart(requested);
  if (created.id !== requested.id || created.identityId !== requested.identityId ||
      created.assignmentId !== requested.assignmentId || created.status !== 'ACTIVE') {
    throw new LearningSessionUnavailableError();
  }
  assertValidLearningSession(created);
  return created;
}

export async function readLearningSession(repository: LearningSessionRepository, scope: LearningSessionScope): Promise<LearningSessionRecord> {
  assertScope(scope);
  const record = await repository.getById(scope);
  if (!record || record.id !== scope.id || record.identityId !== scope.identityId) throw new LearningSessionUnavailableError();
  assertValidLearningSession(record);
  return record;
}

export async function finishLearningSession(repository: LearningSessionRepository, scope: LearningSessionScope): Promise<LearningSessionRecord> {
  assertScope(scope);
  const record = await repository.completeActive(scope);
  if (!record || record.id !== scope.id || record.identityId !== scope.identityId || record.status !== 'COMPLETED') {
    throw new LearningSessionUnavailableError();
  }
  assertValidLearningSession(record);
  return record;
}

function assertScope(scope: LearningSessionScope): void {
  for (const key of ['id', 'identityId'] as const) {
    if (typeof scope[key] !== 'string' || scope[key].trim().length === 0) throw new LearningSessionUnavailableError();
  }
}
