import { and, eq } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import {
  ApplicationSessionNotFoundError,
  type ApplicationSessionRepository,
  type SessionAuthenticationLookup,
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

    const [identity] = await this.db
      .select({ status: identities.status })
      .from(identities)
      .where(eq(identities.id, input.identityId))
      .limit(1);
    if (!identity || identity.status !== 'ACTIVE') {
      throw new ApplicationSessionNotFoundError();
    }

    const [created] = await this.db
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

  async findForAuthenticationByVerifier(input: {
    readonly verifierVersion: 'v1';
    readonly verifier: Buffer;
  }): Promise<SessionAuthenticationLookup | null> {
    const [row] = await this.db
      .select({
        session: applicationSessions,
        identityStatus: identities.status,
      })
      .from(applicationSessions)
      .innerJoin(identities, eq(applicationSessions.identityId, identities.id))
      .where(
        and(
          eq(applicationSessions.verifierVersion, input.verifierVersion),
          eq(applicationSessions.credentialVerifier, input.verifier),
        ),
      )
      .limit(1);

    if (!row) return null;
    return {
      session: mapSession(row.session),
      identityStatus: row.identityStatus,
    };
  }

  async touchLastUsed(input: {
    readonly id: string;
    readonly identityId: string;
    readonly now: Date;
  }): Promise<ApplicationSessionRecord | null> {
    const [row] = await this.db
      .update(applicationSessions)
      .set({ lastUsedAt: input.now, updatedAt: input.now })
      .where(
        and(
          eq(applicationSessions.id, input.id),
          eq(applicationSessions.identityId, input.identityId),
          eq(applicationSessions.status, 'ACTIVE'),
        ),
      )
      .returning();
    return row ? mapSession(row) : null;
  }

  async markExpired(input: {
    readonly id: string;
    readonly identityId: string;
    readonly now: Date;
  }): Promise<void> {
    await this.db
      .update(applicationSessions)
      .set({
        status: 'EXPIRED',
        expiredAt: input.now,
        updatedAt: input.now,
      })
      .where(
        and(
          eq(applicationSessions.id, input.id),
          eq(applicationSessions.identityId, input.identityId),
          eq(applicationSessions.status, 'ACTIVE'),
        ),
      );
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
