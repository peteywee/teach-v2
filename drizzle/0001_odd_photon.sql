CREATE TABLE "identity_application_sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"identity_id" text NOT NULL,
	"status" text DEFAULT 'ACTIVE' NOT NULL,
	"verifier_version" text DEFAULT 'v1' NOT NULL,
	"credential_verifier" "bytea" NOT NULL,
	"issued_at" timestamp with time zone NOT NULL,
	"absolute_expires_at" timestamp with time zone NOT NULL,
	"last_used_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"expired_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "identity_application_session_status_check" CHECK ("identity_application_sessions"."status" IN ('ACTIVE', 'EXPIRED', 'REVOKED')),
	CONSTRAINT "identity_application_session_verifier_check" CHECK ("identity_application_sessions"."verifier_version" = 'v1' AND octet_length("identity_application_sessions"."credential_verifier") = 32),
	CONSTRAINT "identity_application_session_absolute_lifetime_check" CHECK ("identity_application_sessions"."absolute_expires_at" = "identity_application_sessions"."issued_at" + interval '12 hours'),
	CONSTRAINT "identity_application_session_last_use_check" CHECK ("identity_application_sessions"."last_used_at" >= "identity_application_sessions"."issued_at" AND "identity_application_sessions"."last_used_at" <= "identity_application_sessions"."absolute_expires_at"),
	CONSTRAINT "identity_application_session_terminal_timestamp_check" CHECK ((
        ("identity_application_sessions"."status" = 'ACTIVE' AND "identity_application_sessions"."revoked_at" IS NULL AND "identity_application_sessions"."expired_at" IS NULL)
        OR
        ("identity_application_sessions"."status" = 'REVOKED' AND "identity_application_sessions"."revoked_at" IS NOT NULL AND "identity_application_sessions"."expired_at" IS NULL)
        OR
        ("identity_application_sessions"."status" = 'EXPIRED' AND "identity_application_sessions"."expired_at" IS NOT NULL AND "identity_application_sessions"."revoked_at" IS NULL)
      ))
);
--> statement-breakpoint
CREATE TABLE "identity_identities" (
	"id" text PRIMARY KEY NOT NULL,
	"status" text DEFAULT 'ACTIVE' NOT NULL,
	"offboarded_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "identity_identity_status_check" CHECK ("identity_identities"."status" IN ('ACTIVE', 'INACTIVE', 'DELETED')),
	CONSTRAINT "identity_identity_nonblank_check" CHECK (length(btrim("identity_identities"."id")) > 0)
);
--> statement-breakpoint
ALTER TABLE "identity_application_sessions" ADD CONSTRAINT "identity_application_session_identity_fk" FOREIGN KEY ("identity_id") REFERENCES "public"."identity_identities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "identity_application_session_verifier_uq" ON "identity_application_sessions" USING btree ("credential_verifier");--> statement-breakpoint
CREATE INDEX "identity_application_session_identity_status_idx" ON "identity_application_sessions" USING btree ("identity_id","status");--> statement-breakpoint
CREATE INDEX "identity_identity_status_idx" ON "identity_identities" USING btree ("status");
--> statement-breakpoint
CREATE FUNCTION "identity_guard_identity_update"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW."status" = 'DELETED' THEN
      RAISE EXCEPTION 'Identity DELETED ingress is not authorized';
    END IF;
    RETURN NEW;
  END IF;

  IF NEW."id" IS DISTINCT FROM OLD."id"
     OR NEW."created_at" IS DISTINCT FROM OLD."created_at"
  THEN
    RAISE EXCEPTION 'immutable Identity fields cannot change';
  END IF;

  IF NEW."status" = 'DELETED' AND OLD."status" <> 'DELETED' THEN
    RAISE EXCEPTION 'Identity DELETED ingress is not authorized';
  END IF;

  IF OLD."status" = 'DELETED' AND NEW."status" IS DISTINCT FROM OLD."status" THEN
    RAISE EXCEPTION 'Identity DELETED is terminal';
  END IF;

  IF NEW."status" IS DISTINCT FROM OLD."status"
     AND NOT (
       (OLD."status" = 'ACTIVE' AND NEW."status" = 'INACTIVE')
       OR (OLD."status" = 'INACTIVE' AND NEW."status" = 'ACTIVE')
     )
  THEN
    RAISE EXCEPTION 'unsupported Identity lifecycle transition';
  END IF;

  IF OLD."offboarded_at" IS NOT NULL
     AND NEW."offboarded_at" IS DISTINCT FROM OLD."offboarded_at"
  THEN
    RAISE EXCEPTION 'offboarded_at is immutable once set';
  END IF;

  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER "identity_guard_identity_update_trigger"
BEFORE INSERT OR UPDATE ON "identity_identities"
FOR EACH ROW
EXECUTE FUNCTION "identity_guard_identity_update"();
--> statement-breakpoint
CREATE FUNCTION "identity_guard_application_session_update"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW."id" IS DISTINCT FROM OLD."id"
     OR NEW."identity_id" IS DISTINCT FROM OLD."identity_id"
     OR NEW."verifier_version" IS DISTINCT FROM OLD."verifier_version"
     OR NEW."credential_verifier" IS DISTINCT FROM OLD."credential_verifier"
     OR NEW."issued_at" IS DISTINCT FROM OLD."issued_at"
     OR NEW."absolute_expires_at" IS DISTINCT FROM OLD."absolute_expires_at"
     OR NEW."created_at" IS DISTINCT FROM OLD."created_at"
  THEN
    RAISE EXCEPTION 'immutable ApplicationSession fields cannot change';
  END IF;

  IF OLD."status" IN ('EXPIRED', 'REVOKED')
     AND NEW."status" IS DISTINCT FROM OLD."status"
  THEN
    RAISE EXCEPTION 'terminal ApplicationSession status cannot change';
  END IF;

  IF OLD."status" = 'ACTIVE'
     AND NEW."status" IS DISTINCT FROM OLD."status"
     AND NEW."status" NOT IN ('EXPIRED', 'REVOKED')
  THEN
    RAISE EXCEPTION 'unsupported ApplicationSession lifecycle transition';
  END IF;

  IF NEW."last_used_at" < OLD."last_used_at" THEN
    RAISE EXCEPTION 'ApplicationSession last_used_at cannot move backward';
  END IF;

  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER "identity_guard_application_session_update_trigger"
BEFORE UPDATE ON "identity_application_sessions"
FOR EACH ROW
EXECUTE FUNCTION "identity_guard_application_session_update"();
