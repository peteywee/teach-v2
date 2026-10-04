import { and, eq } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import {
  IdentityNotFoundError,
  IdentityTransitionConflictError,
  type IdentityRepository,
} from '../../application/ports/identity-repository.js';
import {
  assertAllowedIdentityTransition,
  type IdentityRecord,
} from '../../domain/identity.js';
import * as schema from './schema.js';
import { identities, type IdentityRow } from './schema.js';

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
    return this.transition(input.id, 'ACTIVE', 'INACTIVE', input.now);
  }

  async reactivate(input: { readonly id: string; readonly now: Date }): Promise<IdentityRecord> {
    return this.transition(input.id, 'INACTIVE', 'ACTIVE', input.now);
  }

  private async transition(
    id: string,
    from: 'ACTIVE' | 'INACTIVE',
    to: 'ACTIVE' | 'INACTIVE',
    now: Date,
  ): Promise<IdentityRecord> {
    assertAllowedIdentityTransition(from, to);
    const [updated] = await this.db
      .update(identities)
      .set({ status: to, updatedAt: now })
      .where(and(eq(identities.id, id), eq(identities.status, from)))
      .returning();
    if (updated) return mapIdentity(updated);

    const current = await this.getById(id);
    if (!current) throw new IdentityNotFoundError();
    if (current.status === to) return current;
    throw new IdentityTransitionConflictError(
      `Identity transition ${current.status} -> ${to} is not permitted`,
    );
  }
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
