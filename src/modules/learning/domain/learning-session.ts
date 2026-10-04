// P05-D01; C32 LRN-1/LRN-3. This model does not grant start authorization.
export const learningSessionStatuses = ['ACTIVE', 'COMPLETED'] as const;
export type LearningSessionStatus = (typeof learningSessionStatuses)[number];

export interface LearningSessionRecord {
  readonly id: string;
  readonly identityId: string;
  readonly assignmentId: string;
  readonly status: LearningSessionStatus;
}

export function assertLearningSessionReferences(input: {
  readonly id: string;
  readonly identityId: string;
  readonly assignmentId: string;
}): void {
  for (const key of ['id', 'identityId', 'assignmentId'] as const) {
    if (typeof input[key] !== 'string' || input[key].trim().length === 0) {
      throw new RangeError(`LearningSession ${key} must be non-blank`);
    }
  }
}

export function assertValidLearningSession(record: LearningSessionRecord): void {
  assertLearningSessionReferences(record);
  if (!learningSessionStatuses.includes(record.status)) {
    throw new RangeError('unregistered LearningSession status');
  }
}

export function newLearningSession(input: Omit<LearningSessionRecord, 'status'>): LearningSessionRecord {
  assertLearningSessionReferences(input);
  return Object.freeze({ id: input.id, identityId: input.identityId, assignmentId: input.assignmentId, status: 'ACTIVE' });
}

export function assertActiveLearningSession(record: LearningSessionRecord): void {
  assertValidLearningSession(record);
  if (record.status !== 'ACTIVE') throw new RangeError('LearningSession COMPLETED is terminal');
}

export function completeLearningSession(record: LearningSessionRecord): LearningSessionRecord {
  assertActiveLearningSession(record);
  return Object.freeze({ ...record, status: 'COMPLETED' });
}
