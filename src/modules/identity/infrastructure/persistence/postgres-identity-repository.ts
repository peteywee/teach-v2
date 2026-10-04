import { and, eq, sql } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import {
  IdentityNotFoundError,
  IdentityTransitionConflictError,
  type IdentityRepository,
} from '../../application/ports/identity-repository.js';
import {
  assertAllowedIdentityTransition,
  type IdentityRecord,
  type IdentityStatus,
} from '../../domain/identity.js';
import * as schema from './schema.js';
import {
  applicationSessions,
  identities,
  type IdentityRow,
} from './schema.js';

export class PostgresIdentityRepository implements IdentityRepository {
  constructor(private readonly db: NodePgDatabase<typeof schema>) {}

  async create(input: { readonly id: string; readonly now: Date }): Promise<IdentityRecord> {
    if (input.id.trim().length === 0) throw new RangeError('IdentityId must be non-blank');
    const [created] = await this.db
      .insert(identities)
      .values({
        id: input.id,
        status: 'ACTIVE',
        createdAt: input.now,
        updatedAt: input.now,
      })
      .onConflictDoNothing({ target: identities.id })
      .returning();
    if (created) return mapIdentity(created);
    const existing = await this.getById(input.id);
    if (!existing) throw new IdentityTransitionConflictError('Identity insert conflicted without readable row');
    return existing;
  }

  async getById(id: string): Promise<IdentityRecord | null> {
    const [row] = await this.db.select().from(identities).where(eq(identities.id, id)).limit(1);
    return row ? mapIdentity(row) : null;
  }

  async deactivate(input: { readonly id: string; readonly now: Date }): Promise<IdentityRecord> {
    return this.db.transaction(async (tx) => {
      const status = await lockIdentityStatus(tx, input.id);
      if (status === null) throw new IdentityNotFoundError();
      if (status !== 'ACTIVE' && status !== 'INACTIVE') {
        throw new IdentityTransitionConflictError(
          `Identity transition ${status} -> INACTIVE is not permitted`,
        );
      }

      let current: IdentityRow;
      if (status === 'ACTIVE') {
        assertAllowedIdentityTransition('ACTIVE', 'INACTIVE');
        const [updated] = await tx
          .update(identities)
          .set({ status: 'INACTIVE', updatedAt: input.now })
          .where(and(eq(identities.id, input.id), eq(identities.status, 'ACTIVE')))
          .returning();
        if (!updated) throw new IdentityTransitionConflictError('Identity deactivation lost its locked row');
        current = updated;
      } else {
        const [row] = await tx.select().from(identities).where(eq(identities.id, input.id)).limit(1);
        if (!row) throw new IdentityNotFoundError();
        current = row;
      }

      await tx
        .update(applicationSessions)
        .set({
          status: 'REVOKED',
          revokedAt: input.now,
          updatedAt: input.now,
        })
        .where(
          and(
            eq(applicationSessions.identityId, input.id),
            eq(applicationSessions.status, 'ACTIVE'),
          ),
        );

      return mapIdentity(current);
    });
  }

  async reactivate(input: { readonly id: string; readonly now: Date }): Promise<IdentityRecord> {
    return this.db.transaction(async (tx) => {
      const status = await lockIdentityStatus(tx, input.id);
      if (status === null) throw new IdentityNotFoundError();
      if (status === 'ACTIVE') {
        const [row] = await tx.select().from(identities).where(eq(identities.id, input.id)).limit(1);
        if (!row) throw new IdentityNotFoundError();
        return mapIdentity(row);
      }
      if (status !== 'INACTIVE') {
        throw new IdentityTransitionConflictError(
          `Identity transition ${status} -> ACTIVE is not permitted`,
        );
      }
      assertAllowedIdentityTransition('INACTIVE', 'ACTIVE');
      const [updated] = await tx
        .update(identities)
        .set({ status: 'ACTIVE', updatedAt: input.now })
        .where(and(eq(identities.id, input.id), eq(identities.status, 'INACTIVE')))
        .returning();
      if (!updated) throw new IdentityTransitionConflictError('Identity reactivation lost its locked row');
      return mapIdentity(updated);
    });
  }
}

async function lockIdentityStatus(
  tx: Parameters<Parameters<NodePgDatabase<typeof schema>['transaction']>[0]>[0],
  id: string,
): Promise<IdentityStatus | null> {
  const result = await tx.execute(
    sql`select "status" from "identity_identities" where "id" = ${id} for update`,
  );
  const status = result.rows[0]?.status;
  return typeof status === 'string' ? (status as IdentityStatus) : null;
}

function mapIdentity(row: IdentityRow): IdentityRecord {
  return {
    id: row.id,
    status: row.status,
    offboardedAt: row.offboardedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
