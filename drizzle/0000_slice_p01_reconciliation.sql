CREATE TABLE "transaction_control_reconciliation_records" (
  "id" text PRIMARY KEY NOT NULL,
  "status" text DEFAULT 'OPEN' NOT NULL,
  "outcome" text NOT NULL,
  "operation_name" text NOT NULL,
  "scope_fingerprint" text NOT NULL,
  "authoritative_scope" jsonb NOT NULL,
  "provider_name" text NOT NULL,
  "provider_reference" text,
  "provider_detail" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "last_readback_at" timestamp with time zone,
  "last_readback_error" text,
  "idempotency_key" text,
  "idempotency_key_source" text,
  "payload_hash" text,
  "retry_horizon_ends_at" timestamp with time zone,
  "idempotency_retention_until" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "resolved_at" timestamp with time zone,
  CONSTRAINT "transaction_control_reconciliation_status_outcome_check"
    CHECK (
      (
        "status" = 'OPEN'
        AND "outcome" IN ('AMBIGUOUS', 'PARTIAL_FAILURE')
        AND "resolved_at" IS NULL
      )
      OR
      (
        "status" = 'RESOLVED'
        AND "outcome" IN ('CONFIRMED_SUCCESS', 'CONFIRMED_NO_EFFECT')
        AND "resolved_at" IS NOT NULL
      )
    ),
  CONSTRAINT "transaction_control_reconciliation_idempotency_binding_check"
    CHECK (
      (
        "idempotency_key" IS NULL
        AND "idempotency_key_source" IS NULL
        AND "payload_hash" IS NULL
        AND "retry_horizon_ends_at" IS NULL
        AND "idempotency_retention_until" IS NULL
      )
      OR
      (
        "idempotency_key" IS NOT NULL
        AND "idempotency_key_source" IN ('CLIENT_SUPPLIED', 'SERVER_DERIVED')
        AND "payload_hash" IS NOT NULL
        AND "retry_horizon_ends_at" IS NOT NULL
        AND "idempotency_retention_until" IS NOT NULL
        AND "idempotency_retention_until" >= "retry_horizon_ends_at"
      )
    ),
  CONSTRAINT "transaction_control_reconciliation_nonblank_check"
    CHECK (
      length(btrim("id")) > 0
      AND length(btrim("operation_name")) > 0
      AND length(btrim("scope_fingerprint")) > 0
      AND length(btrim("provider_name")) > 0
    )
);
--> statement-breakpoint
CREATE INDEX "transaction_control_reconciliation_status_idx"
  ON "transaction_control_reconciliation_records" USING btree ("status");
--> statement-breakpoint
CREATE INDEX "transaction_control_reconciliation_scope_idx"
  ON "transaction_control_reconciliation_records"
  USING btree ("scope_fingerprint", "status");
--> statement-breakpoint
CREATE INDEX "transaction_control_reconciliation_idempotency_key_idx"
  ON "transaction_control_reconciliation_records" USING btree ("idempotency_key");
--> statement-breakpoint
CREATE FUNCTION "transaction_control_guard_reconciliation_record_update"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW."id" IS DISTINCT FROM OLD."id"
     OR NEW."operation_name" IS DISTINCT FROM OLD."operation_name"
     OR NEW."scope_fingerprint" IS DISTINCT FROM OLD."scope_fingerprint"
     OR NEW."authoritative_scope" IS DISTINCT FROM OLD."authoritative_scope"
     OR NEW."provider_name" IS DISTINCT FROM OLD."provider_name"
     OR NEW."provider_reference" IS DISTINCT FROM OLD."provider_reference"
     OR NEW."idempotency_key" IS DISTINCT FROM OLD."idempotency_key"
     OR NEW."idempotency_key_source" IS DISTINCT FROM OLD."idempotency_key_source"
     OR NEW."payload_hash" IS DISTINCT FROM OLD."payload_hash"
     OR NEW."retry_horizon_ends_at" IS DISTINCT FROM OLD."retry_horizon_ends_at"
     OR NEW."idempotency_retention_until" IS DISTINCT FROM OLD."idempotency_retention_until"
  THEN
    RAISE EXCEPTION 'immutable reconciliation identity/scope fields cannot change';
  END IF;

  IF OLD."status" = 'RESOLVED' AND (
    NEW."status" IS DISTINCT FROM OLD."status"
    OR NEW."outcome" IS DISTINCT FROM OLD."outcome"
    OR NEW."resolved_at" IS DISTINCT FROM OLD."resolved_at"
  ) THEN
    RAISE EXCEPTION 'resolved reconciliation state is terminal';
  END IF;

  IF OLD."status" = 'OPEN'
     AND NEW."status" IS DISTINCT FROM OLD."status"
     AND NEW."status" <> 'RESOLVED'
  THEN
    RAISE EXCEPTION 'only OPEN -> RESOLVED transition is permitted';
  END IF;

  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER "transaction_control_guard_reconciliation_record_update_trigger"
BEFORE UPDATE ON "transaction_control_reconciliation_records"
FOR EACH ROW
EXECUTE FUNCTION "transaction_control_guard_reconciliation_record_update"();
