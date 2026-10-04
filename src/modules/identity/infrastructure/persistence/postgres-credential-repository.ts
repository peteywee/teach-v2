import { snapshotPersistenceInput } from './input-snapshot.mjs';
import { and, eq, sql } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import {
  assertValidCredential,
  type CredentialRecord,
  type CredentialType,
} from '../../domain/credential.js';
import * as identitySchema from './schema.js';
import * as credentialSchema from './credential-schema.js';
import { credentials, type CredentialRow } from './credential-schema.js';
import type { CredentialRepository } from '../../application/ports/credential-repository.js';

type DbSchema = typeof identitySchema & typeof credentialSchema;

export class PostgresCredentialRepository implements CredentialRepository {
  constructor(private readonly db: NodePgDatabase<DbSchema>) {}

  async create(input: {
    readonly id: string;
    readonly identityId: string;
    readonly credentialType: CredentialType;
    readonly passwordHash: string | null;
    readonly now: Date;
  }): Promise<CredentialRecord> {
    input = snapshotPersistenceInput(input);
    assertValidCredential(input);
    return this.db.transaction(async (tx) => {
      // IDN-14: Identity must be ACTIVE to receive credentials
      const lock = await tx.execute(
        sql`select "status" from "identity_identities" where "id"=${input.identityId} for update`,
      );
      if (lock.rows[0]?.status !== 'ACTIVE') {
        throw new Error('authoritative Identity must be ACTIVE');
      }
      const [row] = await tx
        .insert(credentials)
        .values({
          id: input.id,
          identityId: input.identityId,
          credentialType: input.credentialType,
          passwordHash: input.passwordHash,
          createdAt: input.now,
          updatedAt: input.now,
        })
        .returning();
      if (!row) throw new Error('Credential insert returned no row');
      return map(row);
    });
  }

  async findById(input: { readonly id: string; readonly identityId: string }): Promise<CredentialRecord | null> {
    input = snapshotPersistenceInput(input);
    const [row] = await this.db
      .select()
      .from(credentials)
      .where(and(eq(credentials.id, input.id), eq(credentials.identityId, input.identityId)))
      .limit(1);
    return row ? map(row) : null;
  }

  async revoke(input: { readonly id: string; readonly identityId: string; readonly now: Date }): Promise<CredentialRecord | null> {
    input = snapshotPersistenceInput(input);
    const [row] = await this.db
      .update(credentials)
      .set({ revokedAt: input.now, updatedAt: input.now })
      .where(
        and(
          eq(credentials.id, input.id),
          eq(credentials.identityId, input.identityId),
          sql`${credentials.revokedAt} IS NULL`,
        ),
      )
      .returning();
    return row ? map(row) : null;
  }

  async listByIdentity(input: { readonly identityId: string }): Promise<CredentialRecord[]> {
    input = snapshotPersistenceInput(input);
    const rows = await this.db
      .select()
      .from(credentials)
      .where(eq(credentials.identityId, input.identityId));
    return rows.map(map);
  }
}

function map(row: CredentialRow): CredentialRecord {
  return {
    id: row.id,
    identityId: row.identityId,
    credentialType: row.credentialType,
    passwordHash: row.passwordHash,
    revokedAt: row.revokedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
