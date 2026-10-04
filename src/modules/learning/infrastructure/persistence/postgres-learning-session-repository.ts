import { and, eq } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type { LearningSessionRepository, LearningSessionScope } from '../../application/ports/learning-session-repository.js';
import { assertActiveLearningSession, assertValidLearningSession, newLearningSession, type LearningSessionRecord } from '../../domain/learning-session.js';
import type { LearningSessionRow, LearningSessionTable } from './schema.js';

export type LearningDbSchema = { learningSessions: LearningSessionTable };

// Storage adapter only. createAuthorizedStart requires the Application boundary
// to establish LRN-2; no Assignment presence or fixture grant proves that policy.
export class PostgresLearningSessionRepository implements LearningSessionRepository {
  constructor(private readonly db: NodePgDatabase<LearningDbSchema>, private readonly table: LearningSessionTable) {}

  async createAuthorizedStart(record: LearningSessionRecord): Promise<LearningSessionRecord> {
    assertActiveLearningSession(record);
    const requested = newLearningSession(record);
    const [row] = await this.db.insert(this.table).values(requested).returning();
    if (!row) throw new Error('LearningSession insert returned no row');
    return map(row);
  }

  async getById(scope: LearningSessionScope): Promise<LearningSessionRecord | null> {
    const [row] = await this.db.select().from(this.table)
      .where(and(eq(this.table.id, scope.id), eq(this.table.identityId, scope.identityId))).limit(1);
    return row ? map(row) : null;
  }

  async completeActive(scope: LearningSessionScope): Promise<LearningSessionRecord | null> {
    // One compare-and-set statement: concurrent callers recheck ACTIVE after
    // the winning update commits. Missing/wrong-scope/terminal rows do no write.
    const [row] = await this.db.update(this.table).set({ status: 'COMPLETED' })
      .where(and(eq(this.table.id, scope.id), eq(this.table.identityId, scope.identityId), eq(this.table.status, 'ACTIVE'))).returning();
    return row ? map(row) : null;
  }
}

function map(row: LearningSessionRow): LearningSessionRecord {
  assertValidLearningSession(row);
  return Object.freeze({ id: row.id, identityId: row.identityId, assignmentId: row.assignmentId, status: row.status });
}
