import { sql } from 'drizzle-orm';
import { check, pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import { identities } from './schema.js';
import type { CredentialType } from '../../domain/credential.js';

export const credentials = pgTable(
  'identity_credentials',
  {
    id: text('id').primaryKey(),
    identityId: text('identity_id')
      .notNull()
      .references(() => identities.id, { onDelete: 'restrict' }),
    credentialType: text('credential_type').$type<CredentialType>().notNull(),
    passwordHash: text('password_hash'), // salted hash only (IDN-5); null for OAUTH_LINK
    revokedAt: timestamp('revoked_at', { withTimezone: true, mode: 'date' }),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (table) => [
    check(
      'identity_credential_type_check',
      sql`${table.credentialType} IN ('PASSWORD','PIN','OAUTH_LINK')`,
    ),
    check(
      'identity_credential_hash_check',
      sql`(((${table.credentialType} IN ('PASSWORD','PIN')) AND (${table.passwordHash} IS NOT NULL)) OR ((${table.credentialType} = 'OAUTH_LINK') AND (${table.passwordHash} IS NULL)))`,
    ),
  ],
);

export type CredentialRow = typeof credentials.$inferSelect;
