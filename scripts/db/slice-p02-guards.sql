CREATE FUNCTION "identity_guard_identity_update"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
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
BEFORE UPDATE ON "identity_identities"
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
