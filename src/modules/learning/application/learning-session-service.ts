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
  const requested = snapshotScope(scope);
  const record = await repository.getById(requested);
  if (!record || record.id !== requested.id || record.identityId !== requested.identityId) throw new LearningSessionUnavailableError();
  assertValidLearningSession(record);
  return record;
}

export async function finishLearningSession(repository: LearningSessionRepository, scope: LearningSessionScope): Promise<LearningSessionRecord> {
  const requested = snapshotScope(scope);
  const record = await repository.completeActive(requested);
  if (!record || record.id !== requested.id || record.identityId !== requested.identityId || record.status !== 'COMPLETED') {
    throw new LearningSessionUnavailableError();
  }
  assertValidLearningSession(record);
  return record;
}

function snapshotScope(scope: LearningSessionScope): LearningSessionScope {
  const requested = Object.freeze({ id: scope?.id, identityId: scope?.identityId });
  for (const key of ['id', 'identityId'] as const) {
    if (typeof requested[key] !== 'string' || requested[key].trim().length === 0) throw new LearningSessionUnavailableError();
  }
  return requested;
}
