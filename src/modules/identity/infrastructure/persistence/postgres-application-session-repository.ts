import { snapshotPersistenceInput } from './input-snapshot.mjs';
import { and, eq, sql } from 'drizzle-orm';
import type { IdentityDatabase } from './identity-database.js';
import {
  ApplicationSessionNotFoundError,
  type ApplicationSessionRepository,
} from '../../application/ports/application-session-repository.js';
import {
  absoluteExpiryFromIssuedAt,
  type ApplicationSessionRecord,
} from '../../domain/application-session.js';
import {
  applicationSessions,
  identities,
  type ApplicationSessionRow,
} from './schema.js';

export class PostgresApplicationSessionRepository
  implements ApplicationSessionRepository
{
  constructor(private readonly db: IdentityDatabase) {}

  async create(input: {
    readonly id: string;
    readonly identityId: string;
    readonly credential: {
      readonly verifierVersion: 'v1';
      readonly verifier: Buffer;
    };
    readonly now: Date;
  }): Promise<ApplicationSessionRecord> {
    input = snapshotPersistenceInput(input);
    if (input.id.trim().length === 0) {
      throw new RangeError('ApplicationSessionId must be non-blank');
    }

    return this.db.transaction(async (tx) => {
      const lock = await tx.execute(
        sql`select "status" from "identity_identities" where "id" = ${input.identityId} for update`,
      );
      if (lock.rows[0]?.status !== 'ACTIVE') {
        throw new ApplicationSessionNotFoundError();
      }

      const [created] = await tx
        .insert(applicationSessions)
        .values({
          id: input.id,
          identityId: input.identityId,
          status: 'ACTIVE',
          verifierVersion: input.credential.verifierVersion,
          credentialVerifier: input.credential.verifier,
          issuedAt: input.now,
          absoluteExpiresAt: absoluteExpiryFromIssuedAt(input.now),
          lastUsedAt: input.now,
          createdAt: input.now,
          updatedAt: input.now,
        })
        .returning();

      if (!created) throw new Error('ApplicationSession insert returned no row');
      return mapSession(created);
    });
  }

  async getById(input: {
    readonly id: string;
    readonly identityId: string;
  }): Promise<ApplicationSessionRecord | null> {
    input = snapshotPersistenceInput(input);
    const [row] = await this.db
      .select()
      .from(applicationSessions)
      .where(
        and(
          eq(applicationSessions.id, input.id),
          eq(applicationSessions.identityId, input.identityId),
        ),
      )
      .limit(1);
    return row ? mapSession(row) : null;
  }

  async revoke(input: {
    readonly id: string;
    readonly identityId: string;
    readonly now: Date;
  }): Promise<ApplicationSessionRecord> {
    input = snapshotPersistenceInput(input);
    return (await this.revokeWithOutcome(input)).session;
  }

  async revokeWithOutcome(input: {
    readonly id: string;
    readonly identityId: string;
    readonly now: Date;
  }): Promise<{ session: ApplicationSessionRecord; transitioned: boolean }> {
    input = snapshotPersistenceInput(input);
    return this.db.transaction(async tx => {
      const [current] = await tx.select().from(applicationSessions).where(and(
        eq(applicationSessions.id, input.id), eq(applicationSessions.identityId, input.identityId),
      )).limit(1).for('update');
      if (!current) throw new ApplicationSessionNotFoundError();
      if (current.status !== 'ACTIVE') return { session: mapSession(current), transitioned: false };
      const [updated] = await tx.update(applicationSessions).set({
        status: 'REVOKED', revokedAt: input.now, updatedAt: input.now,
      }).where(and(eq(applicationSessions.id, input.id), eq(applicationSessions.identityId, input.identityId), eq(applicationSessions.status, 'ACTIVE'))).returning();
      if (!updated) throw new Error('Locked ApplicationSession transition returned no row');
      return { session: mapSession(updated), transitioned: true };
    });
  }

  async authenticateByVerifier(input: {
    readonly verifierVersion: 'v1';
    readonly verifier: Buffer;
    readonly now: Date;
  }): Promise<ApplicationSessionRecord | null> {
    input = snapshotPersistenceInput(input);
    const authenticated = await this.db.transaction(async (tx) => {
      const [candidate] = await tx
        .select({
          id: applicationSessions.id,
          identityId: applicationSessions.identityId,
        })
        .from(applicationSessions)
        .where(
          and(
            eq(applicationSessions.verifierVersion, input.verifierVersion),
            eq(applicationSessions.credentialVerifier, input.verifier),
          ),
        )
        .limit(1);
      if (!candidate) return null;

      const identityLock = await tx.execute(
        sql`select "status" from "identity_identities" where "id" = ${candidate.identityId} for update`,
      );
      if (identityLock.rows[0]?.status !== 'ACTIVE') return null;

      const [updated] = await tx
        .update(applicationSessions)
        .set({ lastUsedAt: input.now, updatedAt: input.now })
        .where(
          and(
            eq(applicationSessions.id, candidate.id),
            eq(applicationSessions.identityId, candidate.identityId),
            eq(applicationSessions.status, 'ACTIVE'),
            sql`${input.now} < ${applicationSessions.absoluteExpiresAt}`,
            sql`${input.now} < ${applicationSessions.lastUsedAt} + interval '30 minutes'`,
          ),
        )
        .returning();

      return updated ? mapSession(updated) : null;
    });

    if (authenticated) return authenticated;

    try {
      await this.db
        .update(applicationSessions)
        .set({
          status: 'EXPIRED',
          expiredAt: input.now,
          updatedAt: input.now,
        })
        .where(
          and(
            eq(applicationSessions.verifierVersion, input.verifierVersion),
            eq(applicationSessions.credentialVerifier, input.verifier),
            eq(applicationSessions.status, 'ACTIVE'),
            sql`(
              ${input.now} >= ${applicationSessions.absoluteExpiresAt}
              OR ${input.now} >= ${applicationSessions.lastUsedAt} + interval '30 minutes'
            )`,
          ),
        );
    } catch {
      // Denial is authoritative even when lazy EXPIRED persistence fails.
    }

    return null;
  }
}

function mapSession(row: ApplicationSessionRow): ApplicationSessionRecord {
  return {
    id: row.id,
    identityId: row.identityId,
    status: row.status,
    verifierVersion: 'v1',
    verifier: row.credentialVerifier,
    issuedAt: row.issuedAt,
    absoluteExpiresAt: row.absoluteExpiresAt,
    lastUsedAt: row.lastUsedAt,
    revokedAt: row.revokedAt,
    expiredAt: row.expiredAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
