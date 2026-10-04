import type { LearningSessionRecord } from '../../domain/learning-session.js';

// All scope IDs must come from the authenticated command boundary. No client
// boolean or possession of an AssignmentId supplies that authority.
export interface LearningSessionScope {
  readonly id: string;
  readonly identityId: string;
}

export interface LearningSessionRepository {
  // Must insert a new row; a duplicate ID may never overwrite/reopen a record.
  createAuthorizedStart(record: LearningSessionRecord): Promise<LearningSessionRecord>;
  getById(scope: LearningSessionScope): Promise<LearningSessionRecord | null>;
  // An adapter must compare ACTIVE and authoritative IdentityId atomically.
  // null means nonexistent, wrong scope, or not ACTIVE; it must perform no write.
  completeActive(scope: LearningSessionScope): Promise<LearningSessionRecord | null>;
}

// C32 LRN-2: only a deterministic backend adapter may supply this decision.
// null, an exception, or a mismatched scope denies creation. P05 does not
// implement that adapter or pretend Assignment storage already exists.
export interface LearningAssignmentAuthorizationPort {
  authorizeSessionStart(input: {
    readonly identityId: string;
    readonly assignmentId: string;
  }): Promise<{
    readonly identityId: string;
    readonly assignmentId: string;
    readonly assigned: true;
    readonly authorized: true;
  } | null>;
}
