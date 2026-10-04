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
