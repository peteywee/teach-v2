import { sql } from 'drizzle-orm';
import { check, foreignKey, index, pgTable, text, type AnyPgColumn } from 'drizzle-orm/pg-core';
import type { LearningSessionStatus } from '../../domain/learning-session.js';

// The composition root supplies the Identity-owned reference. Learning neither
// imports Identity Infrastructure nor acquires an Identity write path.
export function defineLearningSessionTable(identityId: AnyPgColumn<{ data: string }>) {
  return pgTable('learning_sessions', {
    id: text('id').primaryKey(),
    identityId: text('identity_id').notNull(),
    assignmentId: text('assignment_id').notNull(),
    status: text('status').$type<LearningSessionStatus>().notNull().default('ACTIVE'),
  }, (table) => [
    foreignKey({ name: 'learning_session_identity_fk', columns: [table.identityId], foreignColumns: [identityId] }),
    check('learning_session_status_check', sql`${table.status} IN ('ACTIVE', 'COMPLETED')`),
    check('learning_session_references_check', sql`length(btrim(${table.id})) > 0 AND length(btrim(${table.identityId})) > 0 AND length(btrim(${table.assignmentId})) > 0`),
    index('learning_session_identity_idx').on(table.identityId),
  ]);
}

export type LearningSessionTable = ReturnType<typeof defineLearningSessionTable>;
export type LearningSessionRow = LearningSessionTable['$inferSelect'];
