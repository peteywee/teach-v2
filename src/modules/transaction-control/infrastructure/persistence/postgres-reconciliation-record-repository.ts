import { snapshotPersistenceInput } from './input-snapshot.mjs';
import { createHash } from 'node:crypto';
import { and, eq, sql } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import {
  IdempotencyKeyBindingConflictError,
  ReconciliationRecordConflictError,
  ReconciliationRecordNotFoundError,
  type ReconciliationReadbackUnavailableInput,
  type ReconciliationRecordRepository,
  type ResolveReconciliationRecordInput,
} from '../../application/ports/reconciliation-record-repository.js';
import {
  assertConfirmedOutcome,
  validateOpenReconciliationRecordInput,
  type JsonObject,
  type OpenReconciliationRecordInput,
  type ReconciliationRecord,
} from '../../domain/reconciliation-record.js';
import * as schema from './schema.js';
import {
  reconciliationRecords,
  type ReconciliationRecordRow,
} from './schema.js';

export class PostgresReconciliationRecordRepository
  implements ReconciliationRecordRepository
{
  constructor(private readonly db: NodePgDatabase<typeof schema>) {}

  async createOpen(
    input: OpenReconciliationRecordInput,
  ): Promise<ReconciliationRecord> {
    input = snapshotPersistenceInput(input);
    validateOpenReconciliationRecordInput(input);
    const scopeFingerprint = deriveScopeFingerprint(input.authoritativeScope);

    return this.db.transaction(async (tx) => {
      if (input.idempotency) {
        // Serialize binding decisions for the same approved IdempotencyKey identifier.
        // This permits many records to share one key only when they belong to the
        // same operation/payload binding.
        await tx.execute(
          sql`select pg_advisory_xact_lock(hashtextextended(${input.idempotency.key}, 0))`,
        );

        const [bound] = await tx
          .select({
            operationName: reconciliationRecords.operationName,
            payloadHash: reconciliationRecords.payloadHash,
            source: reconciliationRecords.idempotencyKeySource,
          })
          .from(reconciliationRecords)
          .where(eq(reconciliationRecords.idempotencyKey, input.idempotency.key))
          .limit(1);

        if (
          bound &&
          (bound.operationName !== input.operationName ||
            bound.payloadHash !== input.idempotency.payloadHash ||
            bound.source !== input.idempotency.source)
        ) {
          throw new IdempotencyKeyBindingConflictError();
        }
      }

      const [inserted] = await tx
        .insert(reconciliationRecords)
        .values({
          id: input.id,
          status: 'OPEN',
          outcome: input.outcome,
          operationName: input.operationName,
          scopeFingerprint,
          authoritativeScope: input.authoritativeScope,
          providerName: input.providerName,
          providerReference: input.providerReference ?? null,
          providerDetail: input.providerDetail ?? {},
          idempotencyKey: input.idempotency?.key ?? null,
          idempotencyKeySource: input.idempotency?.source ?? null,
          payloadHash: input.idempotency?.payloadHash ?? null,
          retryHorizonEndsAt:
            input.idempotency?.retryHorizonEndsAt ?? null,
          idempotencyRetentionUntil:
            input.idempotency?.retentionUntil ?? null,
        })
        .onConflictDoNothing({ target: reconciliationRecords.id })
        .returning();

      if (inserted) return mapRow(inserted);

      const [existing] = await tx
        .select()
        .from(reconciliationRecords)
        .where(eq(reconciliationRecords.id, input.id))
        .limit(1);

      if (!existing) {
        throw new ReconciliationRecordConflictError(
          'reconciliation record insert conflicted without a readable row',
        );
      }

      assertEquivalentReplay(existing, input);
      return mapRow(existing);
    });
  }

  async getById(
    id: string,
    authoritativeScope: JsonObject,
  ): Promise<ReconciliationRecord | null> {
    const scopeFingerprint = deriveScopeFingerprint(authoritativeScope);
    const [row] = await this.db
      .select()
      .from(reconciliationRecords)
      .where(
        and(
          eq(reconciliationRecords.id, id),
          eq(reconciliationRecords.scopeFingerprint, scopeFingerprint),
        ),
      )
      .limit(1);

    return row ? mapRow(row) : null;
  }

  async recordReadbackUnavailable(
    input: ReconciliationReadbackUnavailableInput,
  ): Promise<ReconciliationRecord> {
    input = snapshotPersistenceInput(input);
    if (input.error.trim().length === 0) {
      throw new RangeError('readback error must be non-blank');
    }

    const [updated] = await this.db
      .update(reconciliationRecords)
      .set({
        lastReadbackAt: input.readbackAt,
        lastReadbackError: input.error,
        updatedAt: new Date(),
        ...(input.providerDetail === undefined
          ? {}
          : { providerDetail: input.providerDetail }),
      })
      .where(
        and(
          eq(reconciliationRecords.id, input.id),
          eq(
            reconciliationRecords.scopeFingerprint,
            deriveScopeFingerprint(input.authoritativeScope),
          ),
          eq(reconciliationRecords.status, 'OPEN'),
        ),
      )
      .returning();

    if (updated) return mapRow(updated);

    const existing = await this.getById(input.id, input.authoritativeScope);
    if (!existing) throw new ReconciliationRecordNotFoundError();

    throw new ReconciliationRecordConflictError(
      'a RESOLVED reconciliation record cannot be marked unreadable',
    );
  }

  async resolve(
    input: ResolveReconciliationRecordInput,
  ): Promise<ReconciliationRecord> {
    input = snapshotPersistenceInput(input);
    assertConfirmedOutcome(input.outcome);

    const [updated] = await this.db
      .update(reconciliationRecords)
      .set({
        status: 'RESOLVED',
        outcome: input.outcome,
        resolvedAt: input.readbackAt,
        lastReadbackAt: input.readbackAt,
        lastReadbackError: null,
        updatedAt: new Date(),
        ...(input.providerDetail === undefined
          ? {}
          : { providerDetail: input.providerDetail }),
      })
      .where(
        and(
          eq(reconciliationRecords.id, input.id),
          eq(
            reconciliationRecords.scopeFingerprint,
            deriveScopeFingerprint(input.authoritativeScope),
          ),
          eq(reconciliationRecords.status, 'OPEN'),
        ),
      )
      .returning();

    if (updated) return mapRow(updated);

    const existing = await this.getById(input.id, input.authoritativeScope);
    if (!existing) throw new ReconciliationRecordNotFoundError();

    if (
      existing.status === 'RESOLVED' &&
      existing.outcome === input.outcome
    ) {
      return existing;
    }

    throw new ReconciliationRecordConflictError(
      'reconciliation record is already resolved to a different outcome',
    );
  }
}

function assertEquivalentReplay(
  existing: ReconciliationRecordRow,
  input: OpenReconciliationRecordInput,
): void {
  const idempotency = input.idempotency;

  if (
    existing.outcome !== input.outcome ||
    existing.operationName !== input.operationName ||
    existing.scopeFingerprint !== deriveScopeFingerprint(input.authoritativeScope) ||
    stableJson(existing.authoritativeScope) !== stableJson(input.authoritativeScope) ||
    existing.providerName !== input.providerName ||
    existing.providerReference !== (input.providerReference ?? null) ||
    existing.idempotencyKey !== (idempotency?.key ?? null) ||
    existing.idempotencyKeySource !== (idempotency?.source ?? null) ||
    existing.payloadHash !== (idempotency?.payloadHash ?? null) ||
    existing.retryHorizonEndsAt?.getTime() !==
      (idempotency?.retryHorizonEndsAt.getTime() ?? undefined) ||
    existing.idempotencyRetentionUntil?.getTime() !==
      (idempotency?.retentionUntil.getTime() ?? undefined)
  ) {
    throw new ReconciliationRecordConflictError(
      'replayed reconciliation record id carries different immutable inputs',
    );
  }
}

function mapRow(row: ReconciliationRecordRow): ReconciliationRecord {
  return {
    id: row.id,
    status: row.status,
    outcome: row.outcome,
    operationName: row.operationName,
    scopeFingerprint: row.scopeFingerprint,
    authoritativeScope: row.authoritativeScope,
    providerName: row.providerName,
    providerReference: row.providerReference,
    providerDetail: row.providerDetail,
    lastReadbackAt: row.lastReadbackAt,
    lastReadbackError: row.lastReadbackError,
    idempotencyKey: row.idempotencyKey,
    idempotencyKeySource: row.idempotencyKeySource,
    payloadHash: row.payloadHash,
    retryHorizonEndsAt: row.retryHorizonEndsAt,
    idempotencyRetentionUntil: row.idempotencyRetentionUntil,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    resolvedAt: row.resolvedAt,
  };
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(stableJson).join(',')}]`;
  }
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableJson(record[key])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}

export function deriveScopeFingerprint(scope: JsonObject): string {
  return createHash('sha256').update(stableJson(scope)).digest('hex');
}
