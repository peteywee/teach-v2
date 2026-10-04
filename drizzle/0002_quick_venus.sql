CREATE TABLE "identity_invitations" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_identity_id" text NOT NULL,
	"invited_identity_id" text,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"verifier_version" text DEFAULT 'v1' NOT NULL,
	"secret_verifier" "bytea" NOT NULL,
	"issued_at" timestamp with time zone NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"accepted_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"expired_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "identity_invitation_status_check" CHECK ("identity_invitations"."status" IN ('PENDING','ACCEPTED','REVOKED','EXPIRED')),
	CONSTRAINT "identity_invitation_verifier_check" CHECK ("identity_invitations"."verifier_version" = 'v1' AND octet_length("identity_invitations"."secret_verifier") = 32),
	CONSTRAINT "identity_invitation_lifetime_check" CHECK ("identity_invitations"."expires_at" = "identity_invitations"."issued_at" + interval '7 days'),
	CONSTRAINT "identity_invitation_terminal_timestamp_check" CHECK ((
      ("identity_invitations"."status"='PENDING' AND "identity_invitations"."accepted_at" IS NULL AND "identity_invitations"."revoked_at" IS NULL AND "identity_invitations"."expired_at" IS NULL)
      OR ("identity_invitations"."status"='ACCEPTED' AND "identity_invitations"."accepted_at" IS NOT NULL AND "identity_invitations"."revoked_at" IS NULL AND "identity_invitations"."expired_at" IS NULL)
      OR ("identity_invitations"."status"='REVOKED' AND "identity_invitations"."revoked_at" IS NOT NULL AND "identity_invitations"."accepted_at" IS NULL AND "identity_invitations"."expired_at" IS NULL)
      OR ("identity_invitations"."status"='EXPIRED' AND "identity_invitations"."expired_at" IS NOT NULL AND "identity_invitations"."accepted_at" IS NULL AND "identity_invitations"."revoked_at" IS NULL)
    ))
);
--> statement-breakpoint
CREATE TABLE "identity_password_reset_tokens" (
	"id" text PRIMARY KEY NOT NULL,
	"identity_id" text NOT NULL,
	"status" text DEFAULT 'ACTIVE' NOT NULL,
	"verifier_version" text DEFAULT 'v1' NOT NULL,
	"secret_verifier" "bytea" NOT NULL,
	"issued_at" timestamp with time zone NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"consumed_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"expired_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "identity_password_reset_token_status_check" CHECK ("identity_password_reset_tokens"."status" IN ('ACTIVE','CONSUMED','EXPIRED','REVOKED')),
	CONSTRAINT "identity_password_reset_token_verifier_check" CHECK ("identity_password_reset_tokens"."verifier_version"='v1' AND octet_length("identity_password_reset_tokens"."secret_verifier")=32),
	CONSTRAINT "identity_password_reset_token_lifetime_check" CHECK ("identity_password_reset_tokens"."expires_at" = "identity_password_reset_tokens"."issued_at" + interval '1 hour'),
	CONSTRAINT "identity_password_reset_token_terminal_timestamp_check" CHECK ((
      ("identity_password_reset_tokens"."status"='ACTIVE' AND "identity_password_reset_tokens"."consumed_at" IS NULL AND "identity_password_reset_tokens"."revoked_at" IS NULL AND "identity_password_reset_tokens"."expired_at" IS NULL)
      OR ("identity_password_reset_tokens"."status"='CONSUMED' AND "identity_password_reset_tokens"."consumed_at" IS NOT NULL AND "identity_password_reset_tokens"."revoked_at" IS NULL AND "identity_password_reset_tokens"."expired_at" IS NULL)
      OR ("identity_password_reset_tokens"."status"='REVOKED' AND "identity_password_reset_tokens"."revoked_at" IS NOT NULL AND "identity_password_reset_tokens"."consumed_at" IS NULL AND "identity_password_reset_tokens"."expired_at" IS NULL)
      OR ("identity_password_reset_tokens"."status"='EXPIRED' AND "identity_password_reset_tokens"."expired_at" IS NOT NULL AND "identity_password_reset_tokens"."consumed_at" IS NULL AND "identity_password_reset_tokens"."revoked_at" IS NULL)
    ))
);
--> statement-breakpoint
CREATE TABLE "identity_setup_tokens" (
	"id" text PRIMARY KEY NOT NULL,
	"identity_id" text NOT NULL,
	"status" text DEFAULT 'ACTIVE' NOT NULL,
	"verifier_version" text DEFAULT 'v1' NOT NULL,
	"secret_verifier" "bytea" NOT NULL,
	"issued_at" timestamp with time zone NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"consumed_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"expired_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "identity_setup_token_status_check" CHECK ("identity_setup_tokens"."status" IN ('ACTIVE','CONSUMED','EXPIRED','REVOKED')),
	CONSTRAINT "identity_setup_token_verifier_check" CHECK ("identity_setup_tokens"."verifier_version"='v1' AND octet_length("identity_setup_tokens"."secret_verifier")=32),
	CONSTRAINT "identity_setup_token_lifetime_check" CHECK ("identity_setup_tokens"."expires_at" = "identity_setup_tokens"."issued_at" + interval '15 minutes'),
	CONSTRAINT "identity_setup_token_terminal_timestamp_check" CHECK ((
      ("identity_setup_tokens"."status"='ACTIVE' AND "identity_setup_tokens"."consumed_at" IS NULL AND "identity_setup_tokens"."revoked_at" IS NULL AND "identity_setup_tokens"."expired_at" IS NULL)
      OR ("identity_setup_tokens"."status"='CONSUMED' AND "identity_setup_tokens"."consumed_at" IS NOT NULL AND "identity_setup_tokens"."revoked_at" IS NULL AND "identity_setup_tokens"."expired_at" IS NULL)
      OR ("identity_setup_tokens"."status"='REVOKED' AND "identity_setup_tokens"."revoked_at" IS NOT NULL AND "identity_setup_tokens"."consumed_at" IS NULL AND "identity_setup_tokens"."expired_at" IS NULL)
      OR ("identity_setup_tokens"."status"='EXPIRED' AND "identity_setup_tokens"."expired_at" IS NOT NULL AND "identity_setup_tokens"."consumed_at" IS NULL AND "identity_setup_tokens"."revoked_at" IS NULL)
    ))
);
--> statement-breakpoint
ALTER TABLE "identity_invitations" ADD CONSTRAINT "identity_invitation_owner_fk" FOREIGN KEY ("owner_identity_id") REFERENCES "public"."identity_identities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "identity_invitations" ADD CONSTRAINT "identity_invitation_invited_fk" FOREIGN KEY ("invited_identity_id") REFERENCES "public"."identity_identities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "identity_password_reset_tokens" ADD CONSTRAINT "identity_password_reset_token_identity_fk" FOREIGN KEY ("identity_id") REFERENCES "public"."identity_identities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "identity_setup_tokens" ADD CONSTRAINT "identity_setup_token_identity_fk" FOREIGN KEY ("identity_id") REFERENCES "public"."identity_identities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "identity_invitation_secret_verifier_uq" ON "identity_invitations" USING btree ("secret_verifier");--> statement-breakpoint
CREATE INDEX "identity_invitation_owner_status_idx" ON "identity_invitations" USING btree ("owner_identity_id","status");--> statement-breakpoint
CREATE INDEX "identity_invitation_invited_idx" ON "identity_invitations" USING btree ("invited_identity_id");--> statement-breakpoint
CREATE UNIQUE INDEX "identity_password_reset_token_secret_verifier_uq" ON "identity_password_reset_tokens" USING btree ("secret_verifier");--> statement-breakpoint
CREATE INDEX "identity_password_reset_token_identity_status_idx" ON "identity_password_reset_tokens" USING btree ("identity_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "identity_setup_token_secret_verifier_uq" ON "identity_setup_tokens" USING btree ("secret_verifier");--> statement-breakpoint
CREATE INDEX "identity_setup_token_identity_status_idx" ON "identity_setup_tokens" USING btree ("identity_id","status");
--> statement-breakpoint
CREATE FUNCTION "identity_guard_invitation_insert"()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW."status" <> 'PENDING' THEN RAISE EXCEPTION 'Invitation must start PENDING'; END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER "identity_guard_invitation_insert_trigger"
BEFORE INSERT ON "identity_invitations"
FOR EACH ROW EXECUTE FUNCTION "identity_guard_invitation_insert"();
--> statement-breakpoint
CREATE FUNCTION "identity_guard_invitation_update"()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW."id" IS DISTINCT FROM OLD."id"
     OR NEW."owner_identity_id" IS DISTINCT FROM OLD."owner_identity_id"
     OR NEW."verifier_version" IS DISTINCT FROM OLD."verifier_version"
     OR NEW."secret_verifier" IS DISTINCT FROM OLD."secret_verifier"
     OR NEW."issued_at" IS DISTINCT FROM OLD."issued_at"
     OR NEW."expires_at" IS DISTINCT FROM OLD."expires_at"
     OR NEW."created_at" IS DISTINCT FROM OLD."created_at"
  THEN RAISE EXCEPTION 'immutable Invitation fields cannot change'; END IF;
  IF OLD."status" IN ('ACCEPTED','REVOKED','EXPIRED') AND NEW."status" IS DISTINCT FROM OLD."status"
  THEN RAISE EXCEPTION 'terminal Invitation status cannot change'; END IF;
  IF OLD."status"='PENDING' AND NEW."status" IS DISTINCT FROM OLD."status"
     AND NEW."status" NOT IN ('ACCEPTED','REVOKED','EXPIRED')
  THEN RAISE EXCEPTION 'unsupported Invitation lifecycle transition'; END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER "identity_guard_invitation_update_trigger"
BEFORE UPDATE ON "identity_invitations"
FOR EACH ROW EXECUTE FUNCTION "identity_guard_invitation_update"();
--> statement-breakpoint
CREATE FUNCTION "identity_guard_single_use_token_update"()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW."id" IS DISTINCT FROM OLD."id"
     OR NEW."identity_id" IS DISTINCT FROM OLD."identity_id"
     OR NEW."verifier_version" IS DISTINCT FROM OLD."verifier_version"
     OR NEW."secret_verifier" IS DISTINCT FROM OLD."secret_verifier"
     OR NEW."issued_at" IS DISTINCT FROM OLD."issued_at"
     OR NEW."expires_at" IS DISTINCT FROM OLD."expires_at"
     OR NEW."created_at" IS DISTINCT FROM OLD."created_at"
  THEN RAISE EXCEPTION 'immutable single-use token fields cannot change'; END IF;
  IF OLD."status" IN ('CONSUMED','REVOKED','EXPIRED') AND NEW."status" IS DISTINCT FROM OLD."status"
  THEN RAISE EXCEPTION 'terminal single-use token status cannot change'; END IF;
  IF OLD."status"='ACTIVE' AND NEW."status" IS DISTINCT FROM OLD."status"
     AND NEW."status" NOT IN ('CONSUMED','REVOKED','EXPIRED')
  THEN RAISE EXCEPTION 'unsupported single-use token lifecycle transition'; END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER "identity_guard_setup_token_update_trigger"
BEFORE UPDATE ON "identity_setup_tokens"
FOR EACH ROW EXECUTE FUNCTION "identity_guard_single_use_token_update"();
--> statement-breakpoint
CREATE TRIGGER "identity_guard_password_reset_token_update_trigger"
BEFORE UPDATE ON "identity_password_reset_tokens"
FOR EACH ROW EXECUTE FUNCTION "identity_guard_single_use_token_update"();
