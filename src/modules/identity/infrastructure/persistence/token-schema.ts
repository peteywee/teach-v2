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
import { identities } from './schema.js';
import type {
  InvitationStatus,
  SingleUseTokenStatus,
} from '../../domain/identity-tokens.js';

const bytea = customType<{ data: Buffer }>({
  dataType() { return 'bytea'; },
  toDriver(value) { return value; },
  fromDriver(value) { return value as Buffer; },
});

export const invitations = pgTable(
  'identity_invitations',
  {
    id: text('id').primaryKey(),
    ownerIdentityId: text('owner_identity_id').notNull(),
    invitedIdentityId: text('invited_identity_id'),
    status: text('status').$type<InvitationStatus>().notNull().default('PENDING'),
    verifierVersion: text('verifier_version').notNull().default('v1'),
    secretVerifier: bytea('secret_verifier').notNull(),
    issuedAt: timestamp('issued_at', { withTimezone: true, mode: 'date' }).notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'date' }).notNull(),
    acceptedAt: timestamp('accepted_at', { withTimezone: true, mode: 'date' }),
    revokedAt: timestamp('revoked_at', { withTimezone: true, mode: 'date' }),
    expiredAt: timestamp('expired_at', { withTimezone: true, mode: 'date' }),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (table) => [
    foreignKey({ name:'identity_invitation_owner_fk', columns:[table.ownerIdentityId], foreignColumns:[identities.id] }),
    foreignKey({ name:'identity_invitation_invited_fk', columns:[table.invitedIdentityId], foreignColumns:[identities.id] }),
    check('identity_invitation_status_check', sql`${table.status} IN ('PENDING','ACCEPTED','REVOKED','EXPIRED')`),
    check('identity_invitation_verifier_check', sql`${table.verifierVersion} = 'v1' AND octet_length(${table.secretVerifier}) = 32`),
    check('identity_invitation_lifetime_check', sql`${table.expiresAt} = ${table.issuedAt} + interval '7 days'`),
    check('identity_invitation_terminal_timestamp_check', sql`(
      (${table.status}='PENDING' AND ${table.acceptedAt} IS NULL AND ${table.revokedAt} IS NULL AND ${table.expiredAt} IS NULL)
      OR (${table.status}='ACCEPTED' AND ${table.acceptedAt} IS NOT NULL AND ${table.revokedAt} IS NULL AND ${table.expiredAt} IS NULL)
      OR (${table.status}='REVOKED' AND ${table.revokedAt} IS NOT NULL AND ${table.acceptedAt} IS NULL AND ${table.expiredAt} IS NULL)
      OR (${table.status}='EXPIRED' AND ${table.expiredAt} IS NOT NULL AND ${table.acceptedAt} IS NULL AND ${table.revokedAt} IS NULL)
    )`),
    uniqueIndex('identity_invitation_secret_verifier_uq').on(table.secretVerifier),
    index('identity_invitation_owner_status_idx').on(table.ownerIdentityId, table.status),
    index('identity_invitation_invited_idx').on(table.invitedIdentityId),
  ],
);

export const setupTokens = pgTable(
  'identity_setup_tokens',
  {
    id: text('id').primaryKey(),
    identityId: text('identity_id').notNull(),
    status: text('status').$type<SingleUseTokenStatus>().notNull().default('ACTIVE'),
    verifierVersion: text('verifier_version').notNull().default('v1'),
    secretVerifier: bytea('secret_verifier').notNull(),
    issuedAt: timestamp('issued_at', { withTimezone: true, mode: 'date' }).notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'date' }).notNull(),
    consumedAt: timestamp('consumed_at', { withTimezone: true, mode: 'date' }),
    revokedAt: timestamp('revoked_at', { withTimezone: true, mode: 'date' }),
    expiredAt: timestamp('expired_at', { withTimezone: true, mode: 'date' }),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (table) => [
    foreignKey({ name:'identity_setup_token_identity_fk', columns:[table.identityId], foreignColumns:[identities.id] }),
    check('identity_setup_token_status_check', sql`${table.status} IN ('ACTIVE','CONSUMED','EXPIRED','REVOKED')`),
    check('identity_setup_token_verifier_check', sql`${table.verifierVersion}='v1' AND octet_length(${table.secretVerifier})=32`),
    check('identity_setup_token_lifetime_check', sql`${table.expiresAt} = ${table.issuedAt} + interval '15 minutes'`),
    check('identity_setup_token_terminal_timestamp_check', sql`(
      (${table.status}='ACTIVE' AND ${table.consumedAt} IS NULL AND ${table.revokedAt} IS NULL AND ${table.expiredAt} IS NULL)
      OR (${table.status}='CONSUMED' AND ${table.consumedAt} IS NOT NULL AND ${table.revokedAt} IS NULL AND ${table.expiredAt} IS NULL)
      OR (${table.status}='REVOKED' AND ${table.revokedAt} IS NOT NULL AND ${table.consumedAt} IS NULL AND ${table.expiredAt} IS NULL)
      OR (${table.status}='EXPIRED' AND ${table.expiredAt} IS NOT NULL AND ${table.consumedAt} IS NULL AND ${table.revokedAt} IS NULL)
    )`),
    uniqueIndex('identity_setup_token_secret_verifier_uq').on(table.secretVerifier),
    index('identity_setup_token_identity_status_idx').on(table.identityId, table.status),
  ],
);

export const passwordResetTokens = pgTable(
  'identity_password_reset_tokens',
  {
    id: text('id').primaryKey(),
    identityId: text('identity_id').notNull(),
    status: text('status').$type<SingleUseTokenStatus>().notNull().default('ACTIVE'),
    verifierVersion: text('verifier_version').notNull().default('v1'),
    secretVerifier: bytea('secret_verifier').notNull(),
    issuedAt: timestamp('issued_at', { withTimezone: true, mode: 'date' }).notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'date' }).notNull(),
    consumedAt: timestamp('consumed_at', { withTimezone: true, mode: 'date' }),
    revokedAt: timestamp('revoked_at', { withTimezone: true, mode: 'date' }),
    expiredAt: timestamp('expired_at', { withTimezone: true, mode: 'date' }),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (table) => [
    foreignKey({ name:'identity_password_reset_token_identity_fk', columns:[table.identityId], foreignColumns:[identities.id] }),
    check('identity_password_reset_token_status_check', sql`${table.status} IN ('ACTIVE','CONSUMED','EXPIRED','REVOKED')`),
    check('identity_password_reset_token_verifier_check', sql`${table.verifierVersion}='v1' AND octet_length(${table.secretVerifier})=32`),
    check('identity_password_reset_token_lifetime_check', sql`${table.expiresAt} = ${table.issuedAt} + interval '1 hour'`),
    check('identity_password_reset_token_terminal_timestamp_check', sql`(
      (${table.status}='ACTIVE' AND ${table.consumedAt} IS NULL AND ${table.revokedAt} IS NULL AND ${table.expiredAt} IS NULL)
      OR (${table.status}='CONSUMED' AND ${table.consumedAt} IS NOT NULL AND ${table.revokedAt} IS NULL AND ${table.expiredAt} IS NULL)
      OR (${table.status}='REVOKED' AND ${table.revokedAt} IS NOT NULL AND ${table.consumedAt} IS NULL AND ${table.expiredAt} IS NULL)
      OR (${table.status}='EXPIRED' AND ${table.expiredAt} IS NOT NULL AND ${table.consumedAt} IS NULL AND ${table.revokedAt} IS NULL)
    )`),
    uniqueIndex('identity_password_reset_token_secret_verifier_uq').on(table.secretVerifier),
    index('identity_password_reset_token_identity_status_idx').on(table.identityId, table.status),
  ],
);

export type InvitationRow = typeof invitations.$inferSelect;
export type SetupTokenRow = typeof setupTokens.$inferSelect;
export type PasswordResetTokenRow = typeof passwordResetTokens.$inferSelect;
