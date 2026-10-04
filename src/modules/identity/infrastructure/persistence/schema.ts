import { sql } from 'drizzle-orm';
import {
  check,
  customType,
  foreignKey,
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import type { IdentityStatus } from '../../domain/identity.js';
import type { ApplicationSessionStatus } from '../../domain/application-session.js';

const bytea = customType<{ data: Buffer }>({
  dataType() {
    return 'bytea';
  },
  toDriver(value) {
    return value;
  },
  fromDriver(value) {
    return value as Buffer;
  },
});

export const identities = pgTable(
  'identity_identities',
  {
    id: text('id').primaryKey(),
    status: text('status').$type<IdentityStatus>().notNull().default('ACTIVE'),
    offboardedAt: timestamp('offboarded_at', { withTimezone: true, mode: 'date' }),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check(
      'identity_identity_status_check',
      sql`${table.status} IN ('ACTIVE', 'INACTIVE', 'DELETED')`,
    ),
    check('identity_identity_nonblank_check', sql`length(btrim(${table.id})) > 0`),
    index('identity_identity_status_idx').on(table.status),
  ],
);

export const applicationSessions = pgTable(
  'identity_application_sessions',
  {
    id: text('id').primaryKey(),
    identityId: text('identity_id').notNull(),
    status: text('status')
      .$type<ApplicationSessionStatus>()
      .notNull()
      .default('ACTIVE'),
    verifierVersion: text('verifier_version').notNull().default('v1'),
    credentialVerifier: bytea('credential_verifier').notNull(),
    issuedAt: timestamp('issued_at', { withTimezone: true, mode: 'date' }).notNull(),
    absoluteExpiresAt: timestamp('absolute_expires_at', {
      withTimezone: true,
      mode: 'date',
    }).notNull(),
    lastUsedAt: timestamp('last_used_at', {
      withTimezone: true,
      mode: 'date',
    }).notNull(),
    revokedAt: timestamp('revoked_at', { withTimezone: true, mode: 'date' }),
    expiredAt: timestamp('expired_at', { withTimezone: true, mode: 'date' }),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    foreignKey({
      name: 'identity_application_session_identity_fk',
      columns: [table.identityId],
      foreignColumns: [identities.id],
    }),
    check(
      'identity_application_session_status_check',
      sql`${table.status} IN ('ACTIVE', 'EXPIRED', 'REVOKED')`,
    ),
    check(
      'identity_application_session_verifier_check',
      sql`${table.verifierVersion} = 'v1' AND octet_length(${table.credentialVerifier}) = 32`,
    ),
    check(
      'identity_application_session_absolute_lifetime_check',
      sql`${table.absoluteExpiresAt} = ${table.issuedAt} + interval '12 hours'`,
    ),
    check(
      'identity_application_session_last_use_check',
      sql`${table.lastUsedAt} >= ${table.issuedAt} AND ${table.lastUsedAt} <= ${table.absoluteExpiresAt}`,
    ),
    check(
      'identity_application_session_terminal_timestamp_check',
      sql`(
        (${table.status} = 'ACTIVE' AND ${table.revokedAt} IS NULL AND ${table.expiredAt} IS NULL)
        OR
        (${table.status} = 'REVOKED' AND ${table.revokedAt} IS NOT NULL AND ${table.expiredAt} IS NULL)
        OR
        (${table.status} = 'EXPIRED' AND ${table.expiredAt} IS NOT NULL AND ${table.revokedAt} IS NULL)
      )`,
    ),
    uniqueIndex('identity_application_session_verifier_uq').on(
      table.credentialVerifier,
    ),
    index('identity_application_session_identity_status_idx').on(
      table.identityId,
      table.status,
    ),
  ],
);

export type IdentityRow = typeof identities.$inferSelect;
export type ApplicationSessionRow = typeof applicationSessions.$inferSelect;
