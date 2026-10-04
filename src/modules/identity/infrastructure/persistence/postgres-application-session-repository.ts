import { and, eq, sql } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import {
  ApplicationSessionNotFoundError,
  type ApplicationSessionRepository,
} from '../../application/ports/application-session-repository.js';
import {
  absoluteExpiryFromIssuedAt,
  type ApplicationSessionRecord,
} from '../../domain/application-session.js';
import * as schema from './schema.js';
import {
  applicationSessions,
  identities,
  type ApplicationSessionRow,
} from './schema.js';

export class PostgresApplicationSessionRepository
  implements ApplicationSessionRepository
{
  constructor(private readonly db: NodePgDatabase<typeof schema>) {}

  async create(input: {
    readonly id: string;
    readonly identityId: string;
    readonly credential: {
      readonly verifierVersion: 'v1';
      readonly verifier: Buffer;
    };
    readonly now: Date;
  }): Promise<ApplicationSessionRecord> {
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
    const [updated] = await this.db
      .update(applicationSessions)
      .set({
        status: 'REVOKED',
        revokedAt: input.now,
        updatedAt: input.now,
      })
      .where(
        and(
          eq(applicationSessions.id, input.id),
          eq(applicationSessions.identityId, input.identityId),
          eq(applicationSessions.status, 'ACTIVE'),
        ),
      )
      .returning();
    if (updated) return mapSession(updated);

    const existing = await this.getById(input);
    if (!existing) throw new ApplicationSessionNotFoundError();
    return existing;
  }

  async authenticateByVerifier(input: {
    readonly verifierVersion: 'v1';
    readonly verifier: Buffer;
    readonly now: Date;
  }): Promise<ApplicationSessionRecord | null> {
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
