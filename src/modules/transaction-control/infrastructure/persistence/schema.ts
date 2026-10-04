import { sql } from 'drizzle-orm';
import {
  check,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';
import type {
  ExternalEffectOutcome,
  IdempotencyKeySource,
  JsonObject,
  ReconciliationRecordStatus,
} from '../../domain/reconciliation-record.js';

// The idempotency_key column represents kernel/identifiers.json:IdempotencyKey
// (approved). It does not consume kernel/values.json:IdempotencyKey (candidate).
export const reconciliationRecords = pgTable(
  'transaction_control_reconciliation_records',
  {
    id: text('id').primaryKey(),
    status: text('status')
      .$type<ReconciliationRecordStatus>()
      .notNull()
      .default('OPEN'),
    outcome: text('outcome').$type<ExternalEffectOutcome>().notNull(),

    operationName: text('operation_name').notNull(),
    scopeFingerprint: text('scope_fingerprint').notNull(),
    authoritativeScope: jsonb('authoritative_scope')
      .$type<JsonObject>()
      .notNull(),

    providerName: text('provider_name').notNull(),
    providerReference: text('provider_reference'),
    providerDetail: jsonb('provider_detail')
      .$type<JsonObject>()
      .notNull()
      .default(sql`'{}'::jsonb`),
    lastReadbackAt: timestamp('last_readback_at', {
      withTimezone: true,
      mode: 'date',
    }),
    lastReadbackError: text('last_readback_error'),

    idempotencyKey: text('idempotency_key'),
    idempotencyKeySource: text('idempotency_key_source')
      .$type<IdempotencyKeySource>(),
    payloadHash: text('payload_hash'),
    retryHorizonEndsAt: timestamp('retry_horizon_ends_at', {
      withTimezone: true,
      mode: 'date',
    }),
    idempotencyRetentionUntil: timestamp('idempotency_retention_until', {
      withTimezone: true,
      mode: 'date',
    }),

    createdAt: timestamp('created_at', {
      withTimezone: true,
      mode: 'date',
    })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', {
      withTimezone: true,
      mode: 'date',
    })
      .notNull()
      .defaultNow(),
    resolvedAt: timestamp('resolved_at', {
      withTimezone: true,
      mode: 'date',
    }),
  },
  (table) => [
    check(
      'transaction_control_reconciliation_status_outcome_check',
      sql`(
        (
          ${table.status} = 'OPEN'
          AND ${table.outcome} IN ('AMBIGUOUS', 'PARTIAL_FAILURE')
          AND ${table.resolvedAt} IS NULL
        )
        OR
        (
          ${table.status} = 'RESOLVED'
          AND ${table.outcome} IN ('CONFIRMED_SUCCESS', 'CONFIRMED_NO_EFFECT')
          AND ${table.resolvedAt} IS NOT NULL
        )
      )`,
    ),
    check(
      'transaction_control_reconciliation_idempotency_binding_check',
      sql`(
        (
          ${table.idempotencyKey} IS NULL
          AND ${table.idempotencyKeySource} IS NULL
          AND ${table.payloadHash} IS NULL
          AND ${table.retryHorizonEndsAt} IS NULL
          AND ${table.idempotencyRetentionUntil} IS NULL
        )
        OR
        (
          ${table.idempotencyKey} IS NOT NULL
          AND ${table.idempotencyKeySource} IN ('CLIENT_SUPPLIED', 'SERVER_DERIVED')
          AND ${table.payloadHash} IS NOT NULL
          AND ${table.retryHorizonEndsAt} IS NOT NULL
          AND ${table.idempotencyRetentionUntil} IS NOT NULL
          AND ${table.idempotencyRetentionUntil} >= ${table.retryHorizonEndsAt}
        )
      )`,
    ),
    check(
      'transaction_control_reconciliation_nonblank_check',
      sql`
        length(btrim(${table.id})) > 0
        AND length(btrim(${table.operationName})) > 0
        AND length(btrim(${table.scopeFingerprint})) > 0
        AND length(btrim(${table.providerName})) > 0
      `,
    ),
    index('transaction_control_reconciliation_status_idx').on(table.status),
    index('transaction_control_reconciliation_scope_idx').on(
      table.scopeFingerprint,
      table.status,
    ),
    index('transaction_control_reconciliation_idempotency_key_idx').on(
      table.idempotencyKey,
    ),
  ],
);

export type ReconciliationRecordRow =
  typeof reconciliationRecords.$inferSelect;
export type NewReconciliationRecordRow =
  typeof reconciliationRecords.$inferInsert;
