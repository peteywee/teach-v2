CREATE TABLE "learning_sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"identity_id" text NOT NULL,
	"assignment_id" text NOT NULL,
	"status" text DEFAULT 'ACTIVE' NOT NULL,
	CONSTRAINT "learning_session_status_check" CHECK ("learning_sessions"."status" IN ('ACTIVE', 'COMPLETED')),
	CONSTRAINT "learning_session_references_check" CHECK (length(btrim("learning_sessions"."id")) > 0 AND length(btrim("learning_sessions"."identity_id")) > 0 AND length(btrim("learning_sessions"."assignment_id")) > 0)
);
--> statement-breakpoint
ALTER TABLE "learning_sessions" ADD CONSTRAINT "learning_session_identity_fk" FOREIGN KEY ("identity_id") REFERENCES "public"."identity_identities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "learning_session_identity_idx" ON "learning_sessions" USING btree ("identity_id");
--> statement-breakpoint
-- P05 lifecycle guards (custom PostgreSQL enforcement; not Drizzle snapshot objects).
CREATE FUNCTION "learning_guard_session_write"() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.status <> 'ACTIVE' THEN
      RAISE EXCEPTION 'LearningSession must start ACTIVE' USING ERRCODE = '23514';
    END IF;
  ELSE
    IF NEW.id IS DISTINCT FROM OLD.id OR NEW.identity_id IS DISTINCT FROM OLD.identity_id
       OR NEW.assignment_id IS DISTINCT FROM OLD.assignment_id THEN
      RAISE EXCEPTION 'LearningSession references are immutable' USING ERRCODE = '23514';
    END IF;
    IF OLD.status <> 'ACTIVE' OR NEW.status <> 'COMPLETED' THEN
      RAISE EXCEPTION 'LearningSession allows only ACTIVE to COMPLETED' USING ERRCODE = '23514';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER "learning_session_write_guard"
BEFORE INSERT OR UPDATE ON "learning_sessions"
FOR EACH ROW EXECUTE FUNCTION "learning_guard_session_write"();
