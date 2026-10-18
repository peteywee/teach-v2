-- This extension must not fabricate timestamps or assignments for historical P05 rows.
DO $$ BEGIN
 IF EXISTS (SELECT 1 FROM learning_sessions) THEN
  RAISE EXCEPTION 'Demo migration blocked: historical P05 sessions require separately approved reconciliation' USING ERRCODE='23514';
 END IF;
END $$;
--> statement-breakpoint
CREATE TABLE "learning_assignments" (
	"id" text PRIMARY KEY NOT NULL,
	"identity_id" text NOT NULL,
	"organization_id" text NOT NULL,
	"location_id" text NOT NULL,
	"content_pack_id" text NOT NULL,
	"content_version" text NOT NULL,
	"content_digest" text NOT NULL,
	"assigned_at" timestamp with time zone NOT NULL,
	"status" text NOT NULL,
	CONSTRAINT "assignment_learner_uq" UNIQUE("id","identity_id"),
	CONSTRAINT "assignment_status_check" CHECK ("learning_assignments"."status"='ACTIVE')
);
--> statement-breakpoint
CREATE TABLE "audit_events" (
	"id" text PRIMARY KEY NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL,
	"request_id" text NOT NULL,
	"idempotency_key" text,
	"actor_class" text NOT NULL,
	"actor_reference" text,
	"action" text NOT NULL,
	"result" text NOT NULL,
	"target_type" text NOT NULL,
	"target_id" text,
	"target_version" text,
	"target_digest" text,
	"organization_id" text,
	"location_id" text,
	"denial_class" text,
	"ip_prefix" text,
	"dedup_bucket_start" timestamp with time zone,
	"overflow_bucket_start" timestamp with time zone,
	CONSTRAINT "audit_result_check" CHECK ("audit_events"."result" IN ('SUCCEEDED','DENIED','OVERFLOW')),
	CONSTRAINT "audit_location_requires_org" CHECK ("audit_events"."location_id" IS NULL OR "audit_events"."organization_id" IS NOT NULL)
);
--> statement-breakpoint
CREATE TABLE "organization_membership_grants" (
	"id" text PRIMARY KEY NOT NULL,
	"membership_id" text NOT NULL,
	"bundle" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	CONSTRAINT "grant_membership_bundle_uq" UNIQUE("membership_id","bundle"),
	CONSTRAINT "grant_bundle_check" CHECK ("organization_membership_grants"."bundle" IN ('learner','observer','manager','org_admin','demo_visitor'))
);
--> statement-breakpoint
CREATE TABLE "lifecycle_events" (
	"id" text PRIMARY KEY NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL,
	"request_id" text NOT NULL,
	"owner_command" text NOT NULL,
	"organization_id" text,
	"location_id" text,
	"aggregate_type" text NOT NULL,
	"aggregate_id" text NOT NULL,
	"sequence" integer NOT NULL,
	"previous_state" jsonb,
	"next_state" jsonb NOT NULL,
	CONSTRAINT "lifecycle_aggregate_sequence_uq" UNIQUE("aggregate_type","aggregate_id","sequence"),
	CONSTRAINT "lifecycle_type_sequence_check" CHECK ("lifecycle_events"."aggregate_type" IN ('Identity','Membership','Assignment','DemoRun') AND "lifecycle_events"."sequence">0),
	CONSTRAINT "lifecycle_location_requires_org" CHECK ("lifecycle_events"."location_id" IS NULL OR "lifecycle_events"."organization_id" IS NOT NULL)
);
--> statement-breakpoint
CREATE TABLE "organization_locations" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	CONSTRAINT "location_scope_uq" UNIQUE("id","organization_id")
);
--> statement-breakpoint
CREATE TABLE "organization_memberships" (
	"id" text PRIMARY KEY NOT NULL,
	"identity_id" text NOT NULL,
	"organization_id" text NOT NULL,
	"location_id" text,
	"status" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "membership_identity_scope_uq" UNIQUE NULLS NOT DISTINCT("identity_id","organization_id","location_id"),
	CONSTRAINT "membership_status_check" CHECK ("organization_memberships"."status" IN ('ACTIVE','INACTIVE','REVOKED')),
	CONSTRAINT "membership_time_check" CHECK (isfinite("organization_memberships"."created_at") AND isfinite("organization_memberships"."updated_at") AND "organization_memberships"."updated_at">="organization_memberships"."created_at")
);
--> statement-breakpoint
CREATE TABLE "organization_organizations" (
	"id" text PRIMARY KEY NOT NULL,
	"classification" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	CONSTRAINT "organization_demo_class_check" CHECK ("organization_organizations"."classification" = 'DEMO_ONLY')
);
--> statement-breakpoint
CREATE TABLE "content_packs" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	CONSTRAINT "content_identity_scope_uq" UNIQUE("id","organization_id")
);
--> statement-breakpoint
CREATE TABLE "identity_demo_personas" (
	"id" text PRIMARY KEY NOT NULL,
	"identity_id" text NOT NULL,
	"demo_run_id" text NOT NULL,
	"kind" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	CONSTRAINT "demo_persona_identity_uq" UNIQUE("identity_id"),
	CONSTRAINT "demo_persona_slot_uq" UNIQUE("demo_run_id","kind"),
	CONSTRAINT "demo_persona_kind_check" CHECK ("identity_demo_personas"."kind" IN ('LEARNER','MANAGER'))
);
--> statement-breakpoint
CREATE TABLE "learning_progress_events" (
	"id" text PRIMARY KEY NOT NULL,
	"learning_session_id" text NOT NULL,
	"content_pack_id" text NOT NULL,
	"content_version" text NOT NULL,
	"content_digest" text NOT NULL,
	"event_schema_version" text NOT NULL,
	"sequence" integer NOT NULL,
	"evaluation" jsonb NOT NULL,
	"recorded_at" timestamp with time zone NOT NULL,
	CONSTRAINT "progress_session_sequence_uq" UNIQUE("learning_session_id","sequence"),
	CONSTRAINT "progress_event_schema_check" CHECK ("learning_progress_events"."event_schema_version"='1.0.0' AND "learning_progress_events"."sequence" BETWEEN 1 AND 3)
);
--> statement-breakpoint
CREATE TABLE "transaction_command_receipts" (
	"id" text PRIMARY KEY NOT NULL,
	"actor_class" text NOT NULL,
	"actor_reference" text NOT NULL,
	"organization_id" text NOT NULL,
	"location_id" text NOT NULL,
	"operation" text NOT NULL,
	"key" text NOT NULL,
	"canonical_payload_digest" text NOT NULL,
	"response_schema_version" integer NOT NULL,
	"response" jsonb NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"replay_until" timestamp with time zone NOT NULL,
	CONSTRAINT "receipt_authority_key_uq" UNIQUE("actor_class","actor_reference","organization_id","location_id","operation","key"),
	CONSTRAINT "receipt_operation_check" CHECK ("transaction_command_receipts"."operation" IN ('AssignContent','StartLearningSession','RecordProgressEvent')),
	CONSTRAINT "receipt_actor_check" CHECK ("transaction_command_receipts"."actor_class" IN ('HumanActor','AutomationActor')),
	CONSTRAINT "receipt_shape_check" CHECK ("transaction_command_receipts"."response_schema_version"=1 AND "transaction_command_receipts"."canonical_payload_digest" ~ '^[a-f0-9]{64}$' AND isfinite("transaction_command_receipts"."created_at") AND "transaction_command_receipts"."replay_until"="transaction_command_receipts"."created_at"+interval '24 hours')
);
--> statement-breakpoint
CREATE TABLE "organization_reporting_relationships" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"location_id" text NOT NULL,
	"manager_identity_id" text NOT NULL,
	"learner_identity_id" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	CONSTRAINT "report_edge_uq" UNIQUE("organization_id","location_id","manager_identity_id","learner_identity_id"),
	CONSTRAINT "report_distinct_endpoints_check" CHECK ("organization_reporting_relationships"."manager_identity_id"<>"organization_reporting_relationships"."learner_identity_id")
);
--> statement-breakpoint
CREATE TABLE "organization_demo_runs" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"location_id" text NOT NULL,
	"status" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"closed_at" timestamp with time zone,
	"close_reason" text,
	"admission_prefix" text NOT NULL,
	CONSTRAINT "demo_run_organization_uq" UNIQUE("organization_id"),
	CONSTRAINT "demo_run_location_uq" UNIQUE("location_id"),
	CONSTRAINT "demo_run_deadline_check" CHECK (isfinite("organization_demo_runs"."created_at") AND isfinite("organization_demo_runs"."expires_at") AND "organization_demo_runs"."expires_at" = "organization_demo_runs"."created_at" + interval '60 minutes'),
	CONSTRAINT "demo_run_terminal_check" CHECK (("organization_demo_runs"."status"='ACTIVE' AND "organization_demo_runs"."closed_at" IS NULL AND "organization_demo_runs"."close_reason" IS NULL) OR ("organization_demo_runs"."status"='CLOSED' AND "organization_demo_runs"."close_reason"='USER_EXIT' AND isfinite("organization_demo_runs"."closed_at") AND "organization_demo_runs"."closed_at">="organization_demo_runs"."created_at") OR ("organization_demo_runs"."status"='EXPIRED' AND "organization_demo_runs"."close_reason"='EXPIRED' AND isfinite("organization_demo_runs"."closed_at") AND "organization_demo_runs"."closed_at">="organization_demo_runs"."expires_at"))
);
--> statement-breakpoint
CREATE TABLE "content_pack_versions" (
	"content_pack_id" text NOT NULL,
	"version" text NOT NULL,
	"digest" text NOT NULL,
	"canonical_json" text NOT NULL,
	CONSTRAINT "content_version_pk" PRIMARY KEY("content_pack_id","version"),
	CONSTRAINT "content_exact_version_uq" UNIQUE("content_pack_id","version","digest"),
	CONSTRAINT "content_digest_check" CHECK ("content_pack_versions"."digest" ~ '^sha256:[0-9a-f]{64}$' AND "content_pack_versions"."digest" = 'sha256:' || encode(sha256(convert_to("content_pack_versions"."canonical_json",'UTF8')),'hex')),
	CONSTRAINT "content_payload_size_check" CHECK (octet_length("content_pack_versions"."canonical_json") <= 65536)
);
--> statement-breakpoint
ALTER TABLE "learning_sessions" ADD COLUMN "started_at" timestamp with time zone NOT NULL;--> statement-breakpoint
ALTER TABLE "learning_sessions" ADD COLUMN "completed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "learning_assignments" ADD CONSTRAINT "assignment_identity_fk" FOREIGN KEY ("identity_id") REFERENCES "public"."identity_identities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learning_assignments" ADD CONSTRAINT "assignment_membership_scope_fk" FOREIGN KEY ("identity_id","organization_id","location_id") REFERENCES "public"."organization_memberships"("identity_id","organization_id","location_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learning_assignments" ADD CONSTRAINT "assignment_location_scope_fk" FOREIGN KEY ("location_id","organization_id") REFERENCES "public"."organization_locations"("id","organization_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learning_assignments" ADD CONSTRAINT "assignment_content_scope_fk" FOREIGN KEY ("content_pack_id","organization_id") REFERENCES "public"."content_packs"("id","organization_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learning_assignments" ADD CONSTRAINT "assignment_exact_content_fk" FOREIGN KEY ("content_pack_id","content_version","content_digest") REFERENCES "public"."content_pack_versions"("content_pack_id","version","digest") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_organization_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization_organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_location_scope_fk" FOREIGN KEY ("location_id","organization_id") REFERENCES "public"."organization_locations"("id","organization_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_membership_grants" ADD CONSTRAINT "grant_membership_fk" FOREIGN KEY ("membership_id") REFERENCES "public"."organization_memberships"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lifecycle_events" ADD CONSTRAINT "lifecycle_organization_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization_organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lifecycle_events" ADD CONSTRAINT "lifecycle_location_scope_fk" FOREIGN KEY ("location_id","organization_id") REFERENCES "public"."organization_locations"("id","organization_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_locations" ADD CONSTRAINT "location_organization_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization_organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_memberships" ADD CONSTRAINT "membership_identity_fk" FOREIGN KEY ("identity_id") REFERENCES "public"."identity_identities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_memberships" ADD CONSTRAINT "membership_organization_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization_organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_memberships" ADD CONSTRAINT "membership_location_scope_fk" FOREIGN KEY ("location_id","organization_id") REFERENCES "public"."organization_locations"("id","organization_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_packs" ADD CONSTRAINT "content_organization_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization_organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "identity_demo_personas" ADD CONSTRAINT "demo_persona_identity_fk" FOREIGN KEY ("identity_id") REFERENCES "public"."identity_identities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "identity_demo_personas" ADD CONSTRAINT "demo_persona_run_fk" FOREIGN KEY ("demo_run_id") REFERENCES "public"."organization_demo_runs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learning_progress_events" ADD CONSTRAINT "progress_session_fk" FOREIGN KEY ("learning_session_id") REFERENCES "public"."learning_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learning_progress_events" ADD CONSTRAINT "progress_exact_content_fk" FOREIGN KEY ("content_pack_id","content_version","content_digest") REFERENCES "public"."content_pack_versions"("content_pack_id","version","digest") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transaction_command_receipts" ADD CONSTRAINT "receipt_organization_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization_organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transaction_command_receipts" ADD CONSTRAINT "receipt_location_scope_fk" FOREIGN KEY ("location_id","organization_id") REFERENCES "public"."organization_locations"("id","organization_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_reporting_relationships" ADD CONSTRAINT "report_manager_scope_fk" FOREIGN KEY ("manager_identity_id","organization_id","location_id") REFERENCES "public"."organization_memberships"("identity_id","organization_id","location_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_reporting_relationships" ADD CONSTRAINT "report_learner_scope_fk" FOREIGN KEY ("learner_identity_id","organization_id","location_id") REFERENCES "public"."organization_memberships"("identity_id","organization_id","location_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_demo_runs" ADD CONSTRAINT "demo_run_scope_fk" FOREIGN KEY ("location_id","organization_id") REFERENCES "public"."organization_locations"("id","organization_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_pack_versions" ADD CONSTRAINT "content_version_pack_fk" FOREIGN KEY ("content_pack_id") REFERENCES "public"."content_packs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learning_sessions" ADD CONSTRAINT "learning_session_assignment_learner_fk" FOREIGN KEY ("assignment_id","identity_id") REFERENCES "public"."learning_assignments"("id","identity_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learning_sessions" ADD CONSTRAINT "learning_session_assignment_uq" UNIQUE("assignment_id");--> statement-breakpoint
ALTER TABLE "learning_sessions" ADD CONSTRAINT "learning_session_time_check" CHECK (isfinite("learning_sessions"."started_at") AND (("learning_sessions"."status"='ACTIVE' AND "learning_sessions"."completed_at" IS NULL) OR ("learning_sessions"."status"='COMPLETED' AND "learning_sessions"."completed_at" IS NOT NULL AND isfinite("learning_sessions"."completed_at") AND "learning_sessions"."completed_at">="learning_sessions"."started_at")));
--> statement-breakpoint
-- Reviewed demo owner guards. No destructive down migration or deletion executor.
CREATE FUNCTION demo_reject_history_change() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Immutable retained history cannot be updated or deleted' USING ERRCODE='23514'; END $$;
--> statement-breakpoint
CREATE FUNCTION demo_valid_network_prefix(value text, ipv6_bits integer) RETURNS boolean LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE parsed cidr;
BEGIN
 IF value IS NULL THEN RETURN true; END IF;
 parsed:=value::cidr;
 RETURN value=parsed::text AND ((family(parsed)=4 AND masklen(parsed)=24) OR (family(parsed)=6 AND masklen(parsed)=ipv6_bits));
EXCEPTION WHEN OTHERS THEN RETURN false;
END $$;
--> statement-breakpoint
ALTER TABLE organization_demo_runs ADD CONSTRAINT demo_prefix_check CHECK(admission_prefix='SHARED_UNKNOWN' OR demo_valid_network_prefix(admission_prefix,56));
--> statement-breakpoint
ALTER TABLE audit_events ADD CONSTRAINT audit_prefix_check CHECK(demo_valid_network_prefix(ip_prefix,48));
--> statement-breakpoint
CREATE FUNCTION organization_guard_demo_run() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE sampled timestamptz;
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'DemoRun history retained' USING ERRCODE='23514'; END IF;
 IF TG_OP='INSERT' THEN
  PERFORM pg_advisory_xact_lock(737304,1); sampled:=clock_timestamp();
  IF NEW.status<>'ACTIVE' OR NEW.created_at>sampled THEN RAISE EXCEPTION 'Invalid DemoRun creation' USING ERRCODE='23514'; END IF;
  IF (SELECT count(*) FROM organization_demo_runs)>=1000 OR
     (SELECT count(*) FROM organization_demo_runs WHERE created_at>sampled-interval '1 hour')>=100 OR
     (SELECT count(*) FROM organization_demo_runs WHERE admission_prefix=NEW.admission_prefix AND created_at>sampled-interval '1 hour')>=10
  THEN RAISE EXCEPTION 'Demo admission capacity reached' USING ERRCODE='23514'; END IF;
 ELSE
  IF (NEW.id,NEW.organization_id,NEW.location_id,NEW.created_at,NEW.expires_at,NEW.admission_prefix) IS DISTINCT FROM (OLD.id,OLD.organization_id,OLD.location_id,OLD.created_at,OLD.expires_at,OLD.admission_prefix) OR OLD.status<>'ACTIVE' OR NEW.status NOT IN ('CLOSED','EXPIRED')
  THEN RAISE EXCEPTION 'Invalid DemoRun transition' USING ERRCODE='23514'; END IF;
 END IF; RETURN NEW;
END $$;
--> statement-breakpoint
CREATE TRIGGER organization_demo_run_guard BEFORE INSERT OR UPDATE OR DELETE ON organization_demo_runs FOR EACH ROW EXECUTE FUNCTION organization_guard_demo_run();
--> statement-breakpoint
CREATE FUNCTION organization_guard_membership() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Membership history retained' USING ERRCODE='23514'; END IF;
 IF TG_OP='INSERT' THEN
  IF NEW.status<>'ACTIVE' OR NOT EXISTS(SELECT 1 FROM identity_demo_personas p JOIN organization_demo_runs r ON r.id=p.demo_run_id JOIN identity_identities i ON i.id=p.identity_id WHERE p.identity_id=NEW.identity_id AND r.organization_id=NEW.organization_id AND r.location_id=NEW.location_id AND i.status='ACTIVE' AND r.status='ACTIVE') THEN RAISE EXCEPTION 'Membership requires fixed active same-run persona' USING ERRCODE='23514'; END IF;
 ELSE
  IF (NEW.id,NEW.identity_id,NEW.organization_id,NEW.location_id,NEW.created_at) IS DISTINCT FROM (OLD.id,OLD.identity_id,OLD.organization_id,OLD.location_id,OLD.created_at) OR NEW.updated_at<OLD.updated_at OR NOT ((OLD.status='ACTIVE' AND NEW.status='INACTIVE') OR (OLD.status='INACTIVE' AND NEW.status='REVOKED')) THEN RAISE EXCEPTION 'Invalid Membership transition' USING ERRCODE='23514'; END IF;
 END IF; RETURN NEW;
END $$;
--> statement-breakpoint
CREATE TRIGGER organization_membership_guard BEFORE INSERT OR UPDATE OR DELETE ON organization_memberships FOR EACH ROW EXECUTE FUNCTION organization_guard_membership();
--> statement-breakpoint
CREATE FUNCTION organization_guard_grant() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE kind text;
BEGIN
 SELECT p.kind INTO kind FROM organization_memberships m JOIN identity_demo_personas p ON p.identity_id=m.identity_id WHERE m.id=NEW.membership_id AND m.status='ACTIVE';
 IF kind IS NULL OR NEW.bundle NOT IN (lower(kind),'demo_visitor') THEN RAISE EXCEPTION 'Invalid fixed demo grant' USING ERRCODE='23514'; END IF; RETURN NEW;
END $$;
--> statement-breakpoint
CREATE TRIGGER organization_grant_guard BEFORE INSERT ON organization_membership_grants FOR EACH ROW EXECUTE FUNCTION organization_guard_grant();
--> statement-breakpoint
CREATE FUNCTION organization_guard_report() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM identity_demo_personas manager JOIN identity_demo_personas learner ON learner.demo_run_id=manager.demo_run_id JOIN organization_demo_runs r ON r.id=manager.demo_run_id JOIN organization_memberships mm ON mm.identity_id=manager.identity_id AND mm.organization_id=r.organization_id AND mm.location_id=r.location_id JOIN organization_memberships lm ON lm.identity_id=learner.identity_id AND lm.organization_id=r.organization_id AND lm.location_id=r.location_id WHERE manager.identity_id=NEW.manager_identity_id AND manager.kind='MANAGER' AND learner.identity_id=NEW.learner_identity_id AND learner.kind='LEARNER' AND r.organization_id=NEW.organization_id AND r.location_id=NEW.location_id AND mm.status='ACTIVE' AND lm.status='ACTIVE') THEN RAISE EXCEPTION 'Report requires fixed active same-run endpoints' USING ERRCODE='23514'; END IF; RETURN NEW;
END $$;
--> statement-breakpoint
CREATE TRIGGER organization_report_guard BEFORE INSERT ON organization_reporting_relationships FOR EACH ROW EXECUTE FUNCTION organization_guard_report();
--> statement-breakpoint
CREATE FUNCTION identity_guard_demo_persona() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM identity_identities i JOIN organization_demo_runs r ON r.id=NEW.demo_run_id WHERE i.id=NEW.identity_id AND i.status='ACTIVE' AND i.created_at=NEW.created_at AND r.status='ACTIVE') OR EXISTS(SELECT 1 FROM identity_credentials WHERE identity_id=NEW.identity_id) THEN RAISE EXCEPTION 'DemoPersona requires new credentialless active Identity' USING ERRCODE='23514'; END IF; RETURN NEW;
END $$;
--> statement-breakpoint
CREATE TRIGGER identity_demo_persona_guard BEFORE INSERT ON identity_demo_personas FOR EACH ROW EXECUTE FUNCTION identity_guard_demo_persona();
--> statement-breakpoint
CREATE FUNCTION identity_guard_demo_session() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE run_id text; run_status text; deadline timestamptz;
BEGIN
 SELECT p.demo_run_id INTO run_id FROM identity_demo_personas p WHERE p.identity_id=COALESCE(NEW.identity_id,OLD.identity_id);
 IF run_id IS NULL THEN RETURN COALESCE(NEW,OLD); END IF;
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Demo ApplicationSession history retained' USING ERRCODE='23514'; END IF;
 SELECT status,expires_at INTO run_status,deadline FROM organization_demo_runs WHERE id=run_id FOR UPDATE;
 IF run_status<>'ACTIVE' OR clock_timestamp()>=deadline OR (SELECT count(*) FROM identity_application_sessions s JOIN identity_demo_personas p ON p.identity_id=s.identity_id WHERE p.demo_run_id=run_id)>=100 OR EXISTS(SELECT 1 FROM identity_application_sessions s JOIN identity_demo_personas p ON p.identity_id=s.identity_id WHERE p.demo_run_id=run_id AND s.status='ACTIVE') THEN RAISE EXCEPTION 'Demo session admission invariant failed' USING ERRCODE='23514'; END IF;
 RETURN NEW;
END $$;
--> statement-breakpoint
CREATE TRIGGER identity_demo_session_insert_guard BEFORE INSERT OR DELETE ON identity_application_sessions FOR EACH ROW EXECUTE FUNCTION identity_guard_demo_session();
--> statement-breakpoint
CREATE FUNCTION learning_guard_demo_assignment() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE run_id text;
BEGIN
 SELECT r.id INTO run_id FROM organization_demo_runs r WHERE r.organization_id=NEW.organization_id AND r.location_id=NEW.location_id FOR UPDATE;
 IF run_id IS NULL OR NOT EXISTS(SELECT 1 FROM organization_demo_runs WHERE id=run_id AND status='ACTIVE' AND clock_timestamp()<expires_at) OR (SELECT count(*) FROM learning_assignments WHERE organization_id=NEW.organization_id AND location_id=NEW.location_id)>=10 OR NOT EXISTS(SELECT 1 FROM organization_memberships m JOIN identity_identities i ON i.id=m.identity_id JOIN identity_demo_personas p ON p.identity_id=i.id WHERE m.identity_id=NEW.identity_id AND m.organization_id=NEW.organization_id AND m.location_id=NEW.location_id AND m.status='ACTIVE' AND i.status='ACTIVE' AND p.kind='LEARNER' AND p.demo_run_id=run_id) THEN RAISE EXCEPTION 'Demo assignment scope or quota failed' USING ERRCODE='23514'; END IF; RETURN NEW;
END $$;
--> statement-breakpoint
CREATE TRIGGER learning_demo_assignment_guard BEFORE INSERT ON learning_assignments FOR EACH ROW EXECUTE FUNCTION learning_guard_demo_assignment();
--> statement-breakpoint
CREATE OR REPLACE FUNCTION learning_guard_session_write() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='INSERT' THEN
  IF NEW.status<>'ACTIVE' OR NEW.completed_at IS NOT NULL THEN RAISE EXCEPTION 'LearningSession must start ACTIVE' USING ERRCODE='23514'; END IF;
 ELSE
  IF (NEW.id,NEW.identity_id,NEW.assignment_id,NEW.started_at) IS DISTINCT FROM (OLD.id,OLD.identity_id,OLD.assignment_id,OLD.started_at) THEN RAISE EXCEPTION 'LearningSession references are immutable' USING ERRCODE='23514'; END IF;
  IF OLD.status<>'ACTIVE' OR NEW.status<>'COMPLETED' OR (SELECT count(*) FROM learning_progress_events WHERE learning_session_id=NEW.id)<>3 THEN RAISE EXCEPTION 'Completion requires all three responses and ACTIVE state' USING ERRCODE='23514'; END IF;
 END IF; RETURN NEW;
END $$;
--> statement-breakpoint
CREATE FUNCTION learning_guard_progress() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE session_status text; pack_id text; pack_version text; pack_digest text; payload jsonb; block jsonb; selected integer; expected jsonb;
BEGIN
 SELECT s.status,a.content_pack_id,a.content_version,a.content_digest INTO session_status,pack_id,pack_version,pack_digest FROM learning_sessions s JOIN learning_assignments a ON a.id=s.assignment_id WHERE s.id=NEW.learning_session_id FOR UPDATE OF s;
 IF session_status IS DISTINCT FROM 'ACTIVE' OR (NEW.content_pack_id,NEW.content_version,NEW.content_digest) IS DISTINCT FROM (pack_id,pack_version,pack_digest) OR NEW.sequence<>(SELECT count(*)+1 FROM learning_progress_events WHERE learning_session_id=NEW.learning_session_id) THEN RAISE EXCEPTION 'Progress scope, state or order failed' USING ERRCODE='23514'; END IF;
 SELECT canonical_json::jsonb INTO payload FROM content_pack_versions WHERE content_pack_id=pack_id AND version=pack_version AND digest=pack_digest; block:=payload->'blocks'->(NEW.sequence-1);
 IF jsonb_typeof(NEW.evaluation)<>'object' OR NOT(NEW.evaluation ?& ARRAY['engineVersion','blockId','selectedOptionIndex','matchesExpectedChoice','feedback']) OR (NEW.evaluation-ARRAY['engineVersion','blockId','selectedOptionIndex','matchesExpectedChoice','feedback'])<>'{}'::jsonb OR jsonb_typeof(NEW.evaluation->'selectedOptionIndex')<>'number' OR (NEW.evaluation->>'selectedOptionIndex')!~'^[0-9]+$' THEN RAISE EXCEPTION 'Invalid evaluation shape' USING ERRCODE='23514'; END IF;
 selected:=(NEW.evaluation->>'selectedOptionIndex')::integer;
 IF block IS NULL OR selected<0 OR selected>=jsonb_array_length(block->'options') THEN RAISE EXCEPTION 'Invalid authored option' USING ERRCODE='23514'; END IF;
 expected:=jsonb_build_object('engineVersion','1.0.0','blockId',block->>'id','selectedOptionIndex',selected,'matchesExpectedChoice',selected=(block->>'expectedOptionIndex')::integer,'feedback',block->'feedback'->>selected);
 IF NEW.evaluation<>expected THEN RAISE EXCEPTION 'Evaluation is not server authored result' USING ERRCODE='23514'; END IF; RETURN NEW;
END $$;
--> statement-breakpoint
CREATE TRIGGER learning_progress_guard BEFORE INSERT ON learning_progress_events FOR EACH ROW EXECUTE FUNCTION learning_guard_progress();
--> statement-breakpoint
CREATE UNIQUE INDEX progress_session_block_uq ON learning_progress_events (learning_session_id,(evaluation->>'blockId'));
--> statement-breakpoint
-- Retain admitted synthetic history. No DELETE/upsert path implements reset.
DO $$
DECLARE tab text;
BEGIN
 FOREACH tab IN ARRAY ARRAY['organization_organizations','organization_locations','organization_membership_grants','organization_reporting_relationships','identity_demo_personas','content_packs','content_pack_versions','learning_assignments','learning_progress_events','audit_events','lifecycle_events','transaction_command_receipts'] LOOP
  EXECUTE format('CREATE TRIGGER %I BEFORE UPDATE OR DELETE ON %I FOR EACH ROW EXECUTE FUNCTION demo_reject_history_change()',tab||'_immutable',tab);
 END LOOP;
END $$;
--> statement-breakpoint
CREATE TRIGGER learning_session_no_delete BEFORE DELETE ON learning_sessions FOR EACH ROW EXECUTE FUNCTION demo_reject_history_change();
--> statement-breakpoint
CREATE FUNCTION identity_guard_demo_credential() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF EXISTS(SELECT 1 FROM identity_demo_personas WHERE identity_id=NEW.identity_id) THEN RAISE EXCEPTION 'Synthetic persona cannot receive Credential' USING ERRCODE='23514'; END IF;
 RETURN NEW;
END $$;
--> statement-breakpoint
CREATE TRIGGER identity_demo_credential_guard BEFORE INSERT OR UPDATE ON identity_credentials FOR EACH ROW EXECUTE FUNCTION identity_guard_demo_credential();

--> statement-breakpoint
-- Finite representation guards for the admitted demo owner slice.
-- These validators constrain representation; they do not grant runtime authority.
CREATE FUNCTION demo_json_keys(value jsonb, keys text[]) RETURNS boolean LANGUAGE sql IMMUTABLE AS $$
 SELECT COALESCE(jsonb_typeof(value)='object' AND value ?& keys AND value-keys='{}'::jsonb,false)
$$;
--> statement-breakpoint
CREATE FUNCTION demo_json_string(value jsonb, low integer, high integer) RETURNS boolean LANGUAGE sql IMMUTABLE AS $$
 SELECT COALESCE(jsonb_typeof(value)='string' AND length(value#>>'{}') BETWEEN low AND high,false)
$$;
--> statement-breakpoint
CREATE FUNCTION demo_json_id(value jsonb) RETURNS boolean LANGUAGE sql IMMUTABLE AS $$
 SELECT COALESCE(jsonb_typeof(value)='string' AND (value#>>'{}') ~ '^[A-Za-z0-9_-]{1,128}$',false)
$$;
--> statement-breakpoint
CREATE FUNCTION demo_json_timestamp(value jsonb, nullable boolean DEFAULT false) RETURNS boolean LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE parsed timestamptz;
BEGIN
 IF value='null'::jsonb THEN RETURN nullable; END IF;
 IF jsonb_typeof(value) IS DISTINCT FROM 'string' OR (value#>>'{}') !~ '^[0-9]{4}-(0[1-9]|1[0-2])-([0-2][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9](\.[0-9]+)?Z$' THEN RETURN false; END IF;
 parsed:=(value#>>'{}')::timestamptz;
 RETURN isfinite(parsed);
EXCEPTION WHEN OTHERS THEN RETURN false;
END $$;
--> statement-breakpoint
CREATE FUNCTION demo_json_timestamp_equals(value jsonb, expected timestamptz) RETURNS boolean LANGUAGE plpgsql IMMUTABLE AS $$
BEGIN
 IF expected IS NULL THEN RETURN value IS NOT DISTINCT FROM 'null'::jsonb; END IF;
 IF NOT demo_json_timestamp(value) THEN RETURN false; END IF;
 RETURN (value#>>'{}')::timestamptz=expected;
END $$;
--> statement-breakpoint
CREATE FUNCTION demo_valid_semver(value text) RETURNS boolean LANGUAGE sql IMMUTABLE AS $$
 SELECT COALESCE(length(value) BETWEEN 1 AND 38 AND value ~ '^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)(-((0|[1-9][0-9]*)|([0-9]*[A-Za-z-][0-9A-Za-z-]*))(\.((0|[1-9][0-9]*)|([0-9]*[A-Za-z-][0-9A-Za-z-]*)))*)?(\+[0-9A-Za-z-]+(\.[0-9A-Za-z-]+)*)?$',false)
$$;
--> statement-breakpoint
CREATE FUNCTION demo_content_version_shape(value jsonb) RETURNS boolean LANGUAGE sql IMMUTABLE AS $$
 SELECT demo_json_keys(value,ARRAY['version','digest']) AND demo_json_string(value->'version',1,38) AND demo_valid_semver(value->>'version') AND COALESCE(jsonb_typeof(value->'digest')='string' AND value->>'digest' ~ '^sha256:[0-9a-f]{64}$',false)
$$;
--> statement-breakpoint
CREATE FUNCTION demo_assignment_shape(value jsonb, snapshot boolean DEFAULT false) RETURNS boolean LANGUAGE sql IMMUTABLE AS $$
 SELECT COALESCE((demo_json_keys(value,ARRAY['id','identityId','organizationId','locationId','contentPackId','contentVersion','status','assignedAt'] || CASE WHEN snapshot THEN ARRAY['schemaVersion'] ELSE ARRAY[]::text[] END)
 AND (NOT snapshot OR value->'schemaVersion'='1'::jsonb)
 AND demo_json_id(value->'id') AND demo_json_id(value->'identityId') AND demo_json_id(value->'organizationId') AND demo_json_id(value->'locationId') AND demo_json_id(value->'contentPackId')
 AND demo_content_version_shape(value->'contentVersion') AND value->'status'='"ACTIVE"'::jsonb AND demo_json_timestamp(value->'assignedAt')
),false)
$$;
--> statement-breakpoint
CREATE FUNCTION demo_session_shape(value jsonb) RETURNS boolean LANGUAGE sql IMMUTABLE AS $$
 SELECT COALESCE((demo_json_keys(value,ARRAY['id','identityId','assignmentId','status','startedAt','completedAt'])
 AND demo_json_id(value->'id') AND demo_json_id(value->'identityId') AND demo_json_id(value->'assignmentId') AND value->>'status' IN ('ACTIVE','COMPLETED')
 AND demo_json_timestamp(value->'startedAt') AND demo_json_timestamp(value->'completedAt',true)
 AND ((value->>'status'='ACTIVE' AND value->'completedAt'='null'::jsonb) OR (value->>'status'='COMPLETED' AND value->'completedAt'<>'null'::jsonb))
),false)
$$;
--> statement-breakpoint
CREATE FUNCTION demo_evaluation_shape(value jsonb) RETURNS boolean LANGUAGE sql IMMUTABLE AS $$
 SELECT COALESCE((demo_json_keys(value,ARRAY['engineVersion','blockId','selectedOptionIndex','matchesExpectedChoice','feedback'])
 AND value->'engineVersion'='"1.0.0"'::jsonb AND demo_json_id(value->'blockId')
 AND jsonb_typeof(value->'selectedOptionIndex')='number' AND value->>'selectedOptionIndex' ~ '^[0-4]$'
 AND jsonb_typeof(value->'matchesExpectedChoice')='boolean' AND demo_json_string(value->'feedback',1,2000)
),false)
$$;
--> statement-breakpoint
CREATE FUNCTION demo_progress_shape(value jsonb) RETURNS boolean LANGUAGE sql IMMUTABLE AS $$
 SELECT COALESCE((demo_json_keys(value,ARRAY['id','learningSessionId','contentPackId','contentVersion','eventSchemaVersion','sequence','evaluation','recordedAt'])
 AND demo_json_id(value->'id') AND demo_json_id(value->'learningSessionId') AND demo_json_id(value->'contentPackId') AND demo_content_version_shape(value->'contentVersion')
 AND value->'eventSchemaVersion'='"1.0.0"'::jsonb AND jsonb_typeof(value->'sequence')='number' AND value->>'sequence' ~ '^[1-3]$'
 AND demo_evaluation_shape(value->'evaluation') AND demo_json_timestamp(value->'recordedAt')
),false)
$$;
--> statement-breakpoint
CREATE FUNCTION demo_lifecycle_shape(kind text, value jsonb) RETURNS boolean LANGUAGE plpgsql IMMUTABLE AS $$
BEGIN
 IF kind='Assignment' THEN RETURN COALESCE(demo_assignment_shape(value,true),false); END IF;
 IF kind='Identity' THEN
  RETURN COALESCE(demo_json_keys(value,ARRAY['schemaVersion','id','status','offboardedAt','createdAt','updatedAt']) AND value->'schemaVersion'='1'::jsonb AND demo_json_id(value->'id') AND value->>'status' IN ('ACTIVE','INACTIVE','DELETED') AND demo_json_timestamp(value->'offboardedAt',true) AND demo_json_timestamp(value->'createdAt') AND demo_json_timestamp(value->'updatedAt'),false);
 ELSIF kind='Membership' THEN
  RETURN COALESCE(demo_json_keys(value,ARRAY['schemaVersion','id','identityId','organizationId','locationId','status','createdAt','updatedAt']) AND value->'schemaVersion'='1'::jsonb AND demo_json_id(value->'id') AND demo_json_id(value->'identityId') AND demo_json_id(value->'organizationId') AND (value->'locationId'='null'::jsonb OR demo_json_id(value->'locationId')) AND value->>'status' IN ('ACTIVE','INACTIVE','REVOKED') AND demo_json_timestamp(value->'createdAt') AND demo_json_timestamp(value->'updatedAt'),false);
 ELSIF kind='DemoRun' THEN
  RETURN COALESCE(demo_json_keys(value,ARRAY['schemaVersion','id','organizationId','locationId','status','createdAt','expiresAt','closedAt','closeReason']) AND value->'schemaVersion'='1'::jsonb AND demo_json_id(value->'id') AND demo_json_id(value->'organizationId') AND demo_json_id(value->'locationId') AND value->>'status' IN ('ACTIVE','CLOSED','EXPIRED') AND demo_json_timestamp(value->'createdAt') AND demo_json_timestamp(value->'expiresAt') AND demo_json_timestamp(value->'closedAt',true) AND (value->'closeReason'='null'::jsonb OR value->>'closeReason' IN ('USER_EXIT','EXPIRED')),false);
 END IF;
 RETURN false;
END $$;
--> statement-breakpoint
CREATE FUNCTION demo_identity_scope_matches(identity_ref text, organization_ref text, location_ref text) RETURNS boolean LANGUAGE sql STABLE AS $$
 SELECT EXISTS (SELECT 1 FROM identity_identities i WHERE i.id=identity_ref) AND
 CASE WHEN EXISTS (SELECT 1 FROM identity_demo_personas p WHERE p.identity_id=identity_ref)
 THEN EXISTS (SELECT 1 FROM identity_demo_personas p JOIN organization_demo_runs r ON r.id=p.demo_run_id WHERE p.identity_id=identity_ref AND r.organization_id=organization_ref AND r.location_id=location_ref)
 ELSE (organization_ref IS NULL AND location_ref IS NULL) OR EXISTS (SELECT 1 FROM organization_memberships m WHERE m.identity_id=identity_ref AND m.organization_id=organization_ref AND m.location_id IS NOT DISTINCT FROM location_ref) END
$$;
--> statement-breakpoint
CREATE FUNCTION audit_guard_demo_lifecycle() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE prior lifecycle_events%ROWTYPE; identity_row identity_identities%ROWTYPE; membership_row organization_memberships%ROWTYPE; assignment_row learning_assignments%ROWTYPE; run_row organization_demo_runs%ROWTYPE; shape jsonb; old_status text; new_status text;
BEGIN
 IF NOT isfinite(NEW.occurred_at) OR length(btrim(NEW.request_id))=0 OR NOT demo_lifecycle_shape(NEW.aggregate_type,NEW.next_state) OR NEW.next_state->>'id' IS DISTINCT FROM NEW.aggregate_id OR (NEW.previous_state IS NOT NULL AND NOT demo_lifecycle_shape(NEW.aggregate_type,NEW.previous_state)) THEN RAISE EXCEPTION 'Invalid finite lifecycle snapshot' USING ERRCODE='23514'; END IF;
 -- Lock the authoritative aggregate, never a separately allocated sequence counter.
 CASE NEW.aggregate_type
 WHEN 'Identity' THEN
  SELECT * INTO identity_row FROM identity_identities WHERE id=NEW.aggregate_id FOR UPDATE;
  IF NOT FOUND OR NOT demo_identity_scope_matches(NEW.aggregate_id,NEW.organization_id,NEW.location_id) THEN RAISE EXCEPTION 'Identity lifecycle target scope mismatch' USING ERRCODE='23514'; END IF;
  shape:=jsonb_build_object('schemaVersion',1,'id',identity_row.id,'status',identity_row.status);
  IF NEW.next_state-ARRAY['offboardedAt','createdAt','updatedAt']<>shape OR NOT demo_json_timestamp_equals(NEW.next_state->'offboardedAt',identity_row.offboarded_at) OR NOT demo_json_timestamp_equals(NEW.next_state->'createdAt',identity_row.created_at) OR NOT demo_json_timestamp_equals(NEW.next_state->'updatedAt',identity_row.updated_at) THEN RAISE EXCEPTION 'Identity lifecycle does not equal owner row' USING ERRCODE='23514'; END IF;
 WHEN 'Membership' THEN
  SELECT * INTO membership_row FROM organization_memberships WHERE id=NEW.aggregate_id FOR UPDATE;
  IF NOT FOUND OR (NEW.organization_id,NEW.location_id) IS DISTINCT FROM (membership_row.organization_id,membership_row.location_id) THEN RAISE EXCEPTION 'Membership lifecycle target scope mismatch' USING ERRCODE='23514'; END IF;
  shape:=jsonb_build_object('schemaVersion',1,'id',membership_row.id,'identityId',membership_row.identity_id,'organizationId',membership_row.organization_id,'locationId',membership_row.location_id,'status',membership_row.status);
  IF NEW.next_state-ARRAY['createdAt','updatedAt']<>shape OR NOT demo_json_timestamp_equals(NEW.next_state->'createdAt',membership_row.created_at) OR NOT demo_json_timestamp_equals(NEW.next_state->'updatedAt',membership_row.updated_at) THEN RAISE EXCEPTION 'Membership lifecycle does not equal owner row' USING ERRCODE='23514'; END IF;
 WHEN 'Assignment' THEN
  SELECT * INTO assignment_row FROM learning_assignments WHERE id=NEW.aggregate_id FOR UPDATE;
  IF NOT FOUND OR (NEW.organization_id,NEW.location_id) IS DISTINCT FROM (assignment_row.organization_id,assignment_row.location_id) THEN RAISE EXCEPTION 'Assignment lifecycle target scope mismatch' USING ERRCODE='23514'; END IF;
  shape:=jsonb_build_object('schemaVersion',1,'id',assignment_row.id,'identityId',assignment_row.identity_id,'organizationId',assignment_row.organization_id,'locationId',assignment_row.location_id,'contentPackId',assignment_row.content_pack_id,'contentVersion',jsonb_build_object('version',assignment_row.content_version,'digest',assignment_row.content_digest),'status',assignment_row.status);
  IF NEW.next_state-ARRAY['assignedAt']<>shape OR NOT demo_json_timestamp_equals(NEW.next_state->'assignedAt',assignment_row.assigned_at) THEN RAISE EXCEPTION 'Assignment lifecycle does not equal owner row' USING ERRCODE='23514'; END IF;
 WHEN 'DemoRun' THEN
  SELECT * INTO run_row FROM organization_demo_runs WHERE id=NEW.aggregate_id FOR UPDATE;
  IF NOT FOUND OR (NEW.organization_id,NEW.location_id) IS DISTINCT FROM (run_row.organization_id,run_row.location_id) THEN RAISE EXCEPTION 'DemoRun lifecycle target scope mismatch' USING ERRCODE='23514'; END IF;
  shape:=jsonb_build_object('schemaVersion',1,'id',run_row.id,'organizationId',run_row.organization_id,'locationId',run_row.location_id,'status',run_row.status,'closeReason',run_row.close_reason);
  IF NEW.next_state-ARRAY['createdAt','expiresAt','closedAt']<>shape OR NOT demo_json_timestamp_equals(NEW.next_state->'createdAt',run_row.created_at) OR NOT demo_json_timestamp_equals(NEW.next_state->'expiresAt',run_row.expires_at) OR NOT demo_json_timestamp_equals(NEW.next_state->'closedAt',run_row.closed_at) THEN RAISE EXCEPTION 'DemoRun lifecycle does not equal owner row' USING ERRCODE='23514'; END IF;
 ELSE RAISE EXCEPTION 'Unknown lifecycle aggregate' USING ERRCODE='23514';
 END CASE;
 SELECT * INTO prior FROM lifecycle_events WHERE aggregate_type=NEW.aggregate_type AND aggregate_id=NEW.aggregate_id ORDER BY sequence DESC LIMIT 1;
 new_status:=NEW.next_state->>'status';
 IF NOT FOUND THEN
  IF NEW.sequence<>1 OR NEW.previous_state IS NOT NULL OR new_status<>'ACTIVE' OR NOT ((NEW.aggregate_type='Identity' AND NEW.owner_command IN ('CreateIdentity','CreateDemoPersona')) OR (NEW.aggregate_type='Membership' AND NEW.owner_command='CreateMembership') OR (NEW.aggregate_type='Assignment' AND NEW.owner_command='AssignContent') OR (NEW.aggregate_type='DemoRun' AND NEW.owner_command='BeginDemoRun')) THEN RAISE EXCEPTION 'Lifecycle must begin with an authorized creation snapshot' USING ERRCODE='23514'; END IF;
  IF NEW.aggregate_type='Identity' AND NEW.next_state->'offboardedAt'<>'null'::jsonb THEN RAISE EXCEPTION 'Identity creation cannot start offboarded' USING ERRCODE='23514'; END IF;
 ELSE
  IF NEW.sequence<>prior.sequence+1 OR NEW.previous_state IS DISTINCT FROM prior.next_state OR NEW.occurred_at<prior.occurred_at THEN RAISE EXCEPTION 'Broken lifecycle sequence or prior snapshot chain' USING ERRCODE='23514'; END IF;
  old_status:=prior.next_state->>'status';
  CASE NEW.aggregate_type
  WHEN 'Identity' THEN
   IF NEW.next_state-ARRAY['status','offboardedAt','updatedAt'] IS DISTINCT FROM prior.next_state-ARRAY['status','offboardedAt','updatedAt'] OR (NEW.next_state->>'updatedAt')::timestamptz<(prior.next_state->>'updatedAt')::timestamptz OR (prior.next_state->'offboardedAt'<>'null'::jsonb AND NEW.next_state->'offboardedAt' IS DISTINCT FROM prior.next_state->'offboardedAt') OR NOT ((NEW.owner_command='DeactivateIdentity' AND old_status='ACTIVE' AND new_status='INACTIVE' AND NEW.next_state->'offboardedAt' IS NOT DISTINCT FROM prior.next_state->'offboardedAt') OR (NEW.owner_command='ReactivateIdentity' AND old_status='INACTIVE' AND new_status='ACTIVE' AND NEW.next_state->'offboardedAt' IS NOT DISTINCT FROM prior.next_state->'offboardedAt') OR (NEW.owner_command='OffboardIdentity' AND old_status IN ('ACTIVE','INACTIVE') AND new_status='INACTIVE' AND NEW.next_state->'offboardedAt'<>'null'::jsonb AND NEW.next_state IS DISTINCT FROM prior.next_state)) THEN RAISE EXCEPTION 'Unauthorized Identity lifecycle transition' USING ERRCODE='23514'; END IF;
  WHEN 'Membership' THEN
   IF NEW.next_state-ARRAY['status','updatedAt'] IS DISTINCT FROM prior.next_state-ARRAY['status','updatedAt'] OR (NEW.next_state->>'updatedAt')::timestamptz<(prior.next_state->>'updatedAt')::timestamptz OR NOT ((NEW.owner_command='DeactivateMembership' AND old_status='ACTIVE' AND new_status='INACTIVE') OR (NEW.owner_command='RevokeMembership' AND old_status='INACTIVE' AND new_status='REVOKED')) THEN RAISE EXCEPTION 'Unauthorized Membership lifecycle transition' USING ERRCODE='23514'; END IF;
  WHEN 'DemoRun' THEN
   IF NEW.next_state-ARRAY['status','closedAt','closeReason'] IS DISTINCT FROM prior.next_state-ARRAY['status','closedAt','closeReason'] OR NEW.owner_command<>'CloseDemoRun' OR old_status<>'ACTIVE' OR new_status NOT IN ('CLOSED','EXPIRED') THEN RAISE EXCEPTION 'Unauthorized DemoRun lifecycle transition' USING ERRCODE='23514'; END IF;
  ELSE RAISE EXCEPTION 'Assignment lifecycle is creation-only' USING ERRCODE='23514';
  END CASE;
 END IF;
 RETURN NEW;
END $$;
--> statement-breakpoint
CREATE TRIGGER audit_demo_lifecycle_guard BEFORE INSERT ON lifecycle_events FOR EACH ROW EXECUTE FUNCTION audit_guard_demo_lifecycle();
--> statement-breakpoint
CREATE FUNCTION demo_audit_target_matches(kind text, record_id text, version_ref text, digest_ref text, organization_ref text, location_ref text, check_scope boolean) RETURNS boolean LANGUAGE plpgsql STABLE AS $$
DECLARE exists_and_matches boolean;
BEGIN
 IF kind='UNRESOLVED' THEN RETURN NOT check_scope AND record_id IS NULL AND version_ref IS NULL AND digest_ref IS NULL; END IF;
 IF record_id IS NULL OR record_id !~ '^[A-Za-z0-9_-]{1,128}$' THEN RETURN false; END IF;
 IF kind='ContentPack' THEN
  IF NOT demo_valid_semver(version_ref) OR digest_ref IS NULL OR digest_ref !~ '^sha256:[0-9a-f]{64}$' THEN RETURN false; END IF;
 ELSE
  IF version_ref IS NOT NULL OR digest_ref IS NOT NULL THEN RETURN false; END IF;
 END IF;
 CASE kind
 WHEN 'Identity' THEN SELECT EXISTS(SELECT 1 FROM identity_identities i WHERE i.id=record_id AND (NOT check_scope OR demo_identity_scope_matches(i.id,organization_ref,location_ref))) INTO exists_and_matches;
 WHEN 'ApplicationSession' THEN SELECT EXISTS(SELECT 1 FROM identity_application_sessions s WHERE s.id=record_id AND (NOT check_scope OR demo_identity_scope_matches(s.identity_id,organization_ref,location_ref))) INTO exists_and_matches;
 WHEN 'Organization' THEN SELECT EXISTS(SELECT 1 FROM organization_organizations o WHERE o.id=record_id AND (NOT check_scope OR (o.id=organization_ref AND location_ref IS NULL))) INTO exists_and_matches;
 WHEN 'Location' THEN SELECT EXISTS(SELECT 1 FROM organization_locations l WHERE l.id=record_id AND (NOT check_scope OR (l.organization_id=organization_ref AND l.id=location_ref))) INTO exists_and_matches;
 WHEN 'Membership' THEN SELECT EXISTS(SELECT 1 FROM organization_memberships m WHERE m.id=record_id AND (NOT check_scope OR (m.organization_id=organization_ref AND m.location_id IS NOT DISTINCT FROM location_ref))) INTO exists_and_matches;
 WHEN 'MembershipGrant' THEN SELECT EXISTS(SELECT 1 FROM organization_membership_grants g JOIN organization_memberships m ON m.id=g.membership_id WHERE g.id=record_id AND (NOT check_scope OR (m.organization_id=organization_ref AND m.location_id IS NOT DISTINCT FROM location_ref))) INTO exists_and_matches;
 WHEN 'ReportingRelationship' THEN SELECT EXISTS(SELECT 1 FROM organization_reporting_relationships r WHERE r.id=record_id AND (NOT check_scope OR (r.organization_id=organization_ref AND r.location_id=location_ref))) INTO exists_and_matches;
 WHEN 'DemoRun' THEN SELECT EXISTS(SELECT 1 FROM organization_demo_runs r WHERE r.id=record_id AND (NOT check_scope OR (r.organization_id=organization_ref AND r.location_id=location_ref))) INTO exists_and_matches;
 WHEN 'ContentPack' THEN SELECT EXISTS(SELECT 1 FROM content_packs p JOIN content_pack_versions v ON v.content_pack_id=p.id WHERE p.id=record_id AND v.version=version_ref AND v.digest=digest_ref AND (NOT check_scope OR (p.organization_id=organization_ref AND (location_ref IS NULL OR EXISTS(SELECT 1 FROM organization_locations l WHERE l.id=location_ref AND l.organization_id=p.organization_id))))) INTO exists_and_matches;
 WHEN 'Assignment' THEN SELECT EXISTS(SELECT 1 FROM learning_assignments a WHERE a.id=record_id AND (NOT check_scope OR (a.organization_id=organization_ref AND a.location_id=location_ref))) INTO exists_and_matches;
 WHEN 'LearningSession' THEN SELECT EXISTS(SELECT 1 FROM learning_sessions s JOIN learning_assignments a ON a.id=s.assignment_id WHERE s.id=record_id AND (NOT check_scope OR (a.organization_id=organization_ref AND a.location_id=location_ref))) INTO exists_and_matches;
 ELSE RETURN false;
 END CASE;
 RETURN COALESCE(exists_and_matches,false);
END $$;
--> statement-breakpoint
CREATE FUNCTION demo_audit_denial_subject(actor_kind text, actor_ref text, prefix text) RETURNS text LANGUAGE sql IMMUTABLE AS $$
 SELECT CASE WHEN actor_ref IS NOT NULL THEN actor_kind || ':' || actor_ref ELSE 'IP:' || COALESCE(prefix,'UNKNOWN') END
$$;
--> statement-breakpoint
CREATE FUNCTION audit_guard_demo_event() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE subject text; hour_start timestamptz; denial_count integer;
BEGIN
 IF NOT isfinite(NEW.occurred_at) OR length(btrim(NEW.request_id))=0 OR (NEW.idempotency_key IS NOT NULL AND length(btrim(NEW.idempotency_key))=0) THEN RAISE EXCEPTION 'Audit requires finite time and request identity' USING ERRCODE='23514'; END IF;
 IF NEW.actor_class='HumanActor' THEN
  IF NEW.actor_reference IS NULL OR NOT EXISTS(SELECT 1 FROM identity_identities WHERE id=NEW.actor_reference) THEN RAISE EXCEPTION 'Human audit actor must reference Identity' USING ERRCODE='23514'; END IF;
 ELSIF NEW.actor_class='AutomationActor' THEN
  IF NEW.actor_reference IS NULL OR NEW.actor_reference NOT IN ('automation:demo-admission-v1','automation:demo-expiry-v1') THEN RAISE EXCEPTION 'Unknown automation audit principal' USING ERRCODE='23514'; END IF;
 ELSIF NEW.actor_class='UNAUTHENTICATED_DENIAL' THEN
  IF NEW.actor_reference IS NOT NULL OR NEW.result='SUCCEEDED' THEN RAISE EXCEPTION 'Unauthenticated actor is denial metadata only' USING ERRCODE='23514'; END IF;
 ELSE RAISE EXCEPTION 'Unknown finite audit actor' USING ERRCODE='23514';
 END IF;
 IF NEW.result='SUCCEEDED' THEN
  IF NEW.action NOT IN ('BeginDemoRun','CreateDemoPersona','CreateMembership','PublishContentPack','AssignContent','CreateApplicationSession','StartLearningSession','CompleteLearningSession','SwitchDemoPersona','CloseDemoRun','RevokeApplicationSession','RevokeDemoSessions','CreateIdentity','DeactivateIdentity','ReactivateIdentity','OffboardIdentity') OR NEW.denial_class IS NOT NULL OR NEW.ip_prefix IS NOT NULL OR NEW.dedup_bucket_start IS NOT NULL OR NEW.overflow_bucket_start IS NOT NULL OR NOT demo_audit_target_matches(NEW.target_type,NEW.target_id,NEW.target_version,NEW.target_digest,NEW.organization_id,NEW.location_id,true) THEN RAISE EXCEPTION 'Invalid successful audit action, target, scope or denial metadata' USING ERRCODE='23514'; END IF;
  RETURN NEW;
 END IF;
 IF NEW.actor_class<>'UNAUTHENTICATED_DENIAL' AND NEW.denial_class IS DISTINCT FROM 'CREDENTIAL_ABUSE' AND NEW.ip_prefix IS NOT NULL THEN RAISE EXCEPTION 'Audit prefix is only credential-abuse or unauthenticated denial metadata' USING ERRCODE='23514'; END IF;
 subject:=demo_audit_denial_subject(NEW.actor_class,NEW.actor_reference,NEW.ip_prefix);
 PERFORM pg_advisory_xact_lock(hashtextextended('demo-denial:' || subject,0));
 hour_start:=date_bin(interval '1 hour',NEW.occurred_at,'2000-01-01 00:00:00+00'::timestamptz);
 SELECT count(*) INTO denial_count FROM audit_events a WHERE a.result='DENIED' AND demo_audit_denial_subject(a.actor_class,a.actor_reference,a.ip_prefix)=subject AND a.occurred_at>=hour_start AND a.occurred_at<hour_start+interval '1 hour';
 IF NEW.result='DENIED' THEN
  -- This is the finite registered operation set, not user-provided request text.
  IF NEW.action NOT IN ('AcceptInvitation','AssignContent','AuthenticateIdentity','ChangeCredential','CompleteLearningSession','CreateApplicationSession','CreateIdentity','CreateMembership','DeactivateIdentity','DeactivateMembership','InviteIdentity','IssueCertification','OffboardIdentity','PublishContentPack','ReactivateIdentity','ReconcileExternalEffect','RecordProgressEvent','RevokeApplicationSession','RevokeCertification','RevokeInvitation','RevokeMembership','RevokeSingleUseToken','StartLearningSession','BeginDemoRun','CreateDemoPersona','SwitchDemoPersona','CloseDemoRun','RevokeDemoSessions','ReadCurrentSession','ListOwnMemberships','ListTeam','ReadTeamMemberLearnerState','ListOwnAssignments','ReadAssignedContentVersion','ReadOwnLearnerState') OR NEW.denial_class IS NULL OR NEW.denial_class NOT IN ('CAPABILITY','TENANT_SCOPE','TARGET_SCOPE','CREDENTIAL_ABUSE','ORIGIN') OR NEW.dedup_bucket_start IS DISTINCT FROM date_bin(interval '5 minutes',NEW.occurred_at,'2000-01-01 00:00:00+00'::timestamptz) OR NEW.overflow_bucket_start IS NOT NULL THEN RAISE EXCEPTION 'Invalid redacted denial representation' USING ERRCODE='23514'; END IF;
  IF NEW.actor_class='UNAUTHENTICATED_DENIAL' AND NEW.denial_class NOT IN ('CREDENTIAL_ABUSE','ORIGIN') THEN RAISE EXCEPTION 'Plain unauthenticated requests must not be denial audits' USING ERRCODE='23514'; END IF;
  IF NOT demo_audit_target_matches(NEW.target_type,NEW.target_id,NEW.target_version,NEW.target_digest,NEW.organization_id,NEW.location_id,false) OR (NEW.denial_class<>'TARGET_SCOPE' AND NEW.target_type<>'UNRESOLVED') OR (NEW.denial_class IN ('CREDENTIAL_ABUSE','ORIGIN') AND (NEW.organization_id IS NOT NULL OR NEW.location_id IS NOT NULL)) THEN RAISE EXCEPTION 'Denial target or scope is not class-redacted' USING ERRCODE='23514'; END IF;
  IF denial_count>=100 THEN RAISE EXCEPTION 'Denial hourly limit reached; append one overflow instead' USING ERRCODE='23514'; END IF;
 ELSIF NEW.result='OVERFLOW' THEN
  IF NEW.action<>'DENIAL_OVERFLOW' OR NEW.denial_class IS NOT NULL OR NEW.dedup_bucket_start IS NOT NULL OR NEW.overflow_bucket_start IS DISTINCT FROM hour_start OR NEW.organization_id IS NOT NULL OR NEW.location_id IS NOT NULL OR NEW.target_type<>'UNRESOLVED' OR NEW.target_id IS NOT NULL OR NEW.target_version IS NOT NULL OR NEW.target_digest IS NOT NULL OR NEW.idempotency_key IS NOT NULL OR denial_count<100 THEN RAISE EXCEPTION 'Invalid denial overflow representation' USING ERRCODE='23514'; END IF;
 ELSE RAISE EXCEPTION 'Unknown audit result' USING ERRCODE='23514';
 END IF;
 RETURN NEW;
END $$;
--> statement-breakpoint
CREATE TRIGGER audit_demo_event_guard BEFORE INSERT ON audit_events FOR EACH ROW EXECUTE FUNCTION audit_guard_demo_event();
--> statement-breakpoint
CREATE UNIQUE INDEX audit_denial_dedup_uq ON audit_events (demo_audit_denial_subject(actor_class,actor_reference,ip_prefix),denial_class,action,dedup_bucket_start) NULLS NOT DISTINCT WHERE result='DENIED';
--> statement-breakpoint
CREATE UNIQUE INDEX audit_denial_overflow_uq ON audit_events (demo_audit_denial_subject(actor_class,actor_reference,ip_prefix),overflow_bucket_start) NULLS NOT DISTINCT WHERE result='OVERFLOW';
--> statement-breakpoint
CREATE INDEX audit_denial_hour_lookup ON audit_events (demo_audit_denial_subject(actor_class,actor_reference,ip_prefix),occurred_at) WHERE result='DENIED';
--> statement-breakpoint
CREATE FUNCTION transaction_guard_demo_receipt() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE run_row organization_demo_runs%ROWTYPE; assignment_row learning_assignments%ROWTYPE; session_row learning_sessions%ROWTYPE; progress_row learning_progress_events%ROWTYPE; shape jsonb; fresh_run boolean;
BEGIN
 SELECT r.* INTO run_row FROM organization_demo_runs r WHERE r.organization_id=NEW.organization_id AND r.location_id=NEW.location_id FOR UPDATE;
 IF NOT FOUND OR run_row.status<>'ACTIVE' OR clock_timestamp()>=run_row.expires_at THEN RAISE EXCEPTION 'Receipt requires current exact live-run scope' USING ERRCODE='23514'; END IF;
 SELECT r.xmin::text=pg_current_xact_id()::text INTO fresh_run FROM organization_demo_runs r WHERE r.id=run_row.id;
 IF NEW.actor_class='AutomationActor' THEN
  IF NEW.actor_reference<>'automation:demo-admission-v1' OR NEW.operation<>'AssignContent' OR NOT fresh_run OR (SELECT count(*) FROM learning_assignments WHERE organization_id=NEW.organization_id AND location_id=NEW.location_id)<>1 THEN RAISE EXCEPTION 'Automation receipt requires initial fresh-run assignment' USING ERRCODE='23514'; END IF;
 ELSIF NEW.actor_class='HumanActor' THEN
  PERFORM 1 FROM organization_memberships m JOIN identity_identities i ON i.id=m.identity_id WHERE m.identity_id=NEW.actor_reference AND m.organization_id=NEW.organization_id AND m.location_id=NEW.location_id AND m.status='ACTIVE' AND i.status='ACTIVE' FOR UPDATE OF m,i;
  IF NOT FOUND THEN RAISE EXCEPTION 'Receipt actor lacks active exact-scope membership' USING ERRCODE='23514'; END IF;
 ELSE RAISE EXCEPTION 'Unknown receipt actor' USING ERRCODE='23514';
 END IF;
 IF length(btrim(NEW.key))=0 THEN RAISE EXCEPTION 'Receipt requires idempotency identity' USING ERRCODE='23514'; END IF;
 CASE NEW.operation
 WHEN 'AssignContent' THEN
  IF demo_assignment_shape(NEW.response) IS DISTINCT FROM true THEN RAISE EXCEPTION 'Receipt is not exact Assignment DTO' USING ERRCODE='23514'; END IF;
  SELECT * INTO assignment_row FROM learning_assignments WHERE id=NEW.response->>'id';
  IF NOT FOUND OR (assignment_row.organization_id,assignment_row.location_id) IS DISTINCT FROM (NEW.organization_id,NEW.location_id) THEN RAISE EXCEPTION 'Receipt assignment scope mismatch' USING ERRCODE='23514'; END IF;
  shape:=jsonb_build_object('id',assignment_row.id,'identityId',assignment_row.identity_id,'organizationId',assignment_row.organization_id,'locationId',assignment_row.location_id,'contentPackId',assignment_row.content_pack_id,'contentVersion',jsonb_build_object('version',assignment_row.content_version,'digest',assignment_row.content_digest),'status',assignment_row.status);
  IF NEW.response-ARRAY['assignedAt']<>shape OR NOT demo_json_timestamp_equals(NEW.response->'assignedAt',assignment_row.assigned_at) THEN RAISE EXCEPTION 'Receipt Assignment DTO differs from effect' USING ERRCODE='23514'; END IF;
 WHEN 'StartLearningSession' THEN
  IF demo_session_shape(NEW.response) IS DISTINCT FROM true THEN RAISE EXCEPTION 'Receipt is not exact Session DTO' USING ERRCODE='23514'; END IF;
  SELECT s.* INTO session_row FROM learning_sessions s JOIN learning_assignments a ON a.id=s.assignment_id WHERE s.id=NEW.response->>'id' AND a.organization_id=NEW.organization_id AND a.location_id=NEW.location_id;
  IF NOT FOUND OR NEW.actor_class<>'HumanActor' OR session_row.identity_id<>NEW.actor_reference OR session_row.status<>'ACTIVE' THEN RAISE EXCEPTION 'Receipt Session actor, state or scope mismatch' USING ERRCODE='23514'; END IF;
  shape:=jsonb_build_object('id',session_row.id,'identityId',session_row.identity_id,'assignmentId',session_row.assignment_id,'status',session_row.status);
  IF NEW.response-ARRAY['startedAt','completedAt']<>shape OR NOT demo_json_timestamp_equals(NEW.response->'startedAt',session_row.started_at) OR NOT demo_json_timestamp_equals(NEW.response->'completedAt',session_row.completed_at) THEN RAISE EXCEPTION 'Receipt Session DTO differs from effect' USING ERRCODE='23514'; END IF;
 WHEN 'RecordProgressEvent' THEN
  IF demo_progress_shape(NEW.response) IS DISTINCT FROM true THEN RAISE EXCEPTION 'Receipt is not exact ProgressEvent DTO' USING ERRCODE='23514'; END IF;
  SELECT p.* INTO progress_row FROM learning_progress_events p JOIN learning_sessions s ON s.id=p.learning_session_id JOIN learning_assignments a ON a.id=s.assignment_id WHERE p.id=NEW.response->>'id' AND s.identity_id=NEW.actor_reference AND a.organization_id=NEW.organization_id AND a.location_id=NEW.location_id;
  IF NOT FOUND OR NEW.actor_class<>'HumanActor' THEN RAISE EXCEPTION 'Receipt ProgressEvent actor or scope mismatch' USING ERRCODE='23514'; END IF;
  shape:=jsonb_build_object('id',progress_row.id,'learningSessionId',progress_row.learning_session_id,'contentPackId',progress_row.content_pack_id,'contentVersion',jsonb_build_object('version',progress_row.content_version,'digest',progress_row.content_digest),'eventSchemaVersion',progress_row.event_schema_version,'sequence',progress_row.sequence,'evaluation',progress_row.evaluation);
  IF NEW.response-ARRAY['recordedAt']<>shape OR NOT demo_json_timestamp_equals(NEW.response->'recordedAt',progress_row.recorded_at) THEN RAISE EXCEPTION 'Receipt ProgressEvent DTO differs from effect' USING ERRCODE='23514'; END IF;
 ELSE RAISE EXCEPTION 'Unknown receipt operation' USING ERRCODE='23514';
 END CASE;
 RETURN NEW;
END $$;
--> statement-breakpoint
CREATE TRIGGER transaction_demo_receipt_guard BEFORE INSERT ON transaction_command_receipts FOR EACH ROW EXECUTE FUNCTION transaction_guard_demo_receipt();
--> statement-breakpoint
CREATE FUNCTION demo_canonical_json(value jsonb) RETURNS text LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE result text;
BEGIN
 CASE jsonb_typeof(value)
 WHEN 'object' THEN SELECT '{'||COALESCE(string_agg(to_jsonb(key)::text||':'||demo_canonical_json(val),',' ORDER BY key COLLATE "C"),'')||'}' INTO result FROM jsonb_each(value) AS item(key,val);
 WHEN 'array' THEN SELECT '['||COALESCE(string_agg(demo_canonical_json(val),',' ORDER BY ordinal),'')||']' INTO result FROM jsonb_array_elements(value) WITH ORDINALITY AS item(val,ordinal);
 WHEN 'number' THEN
  IF value::text !~ '^-?(0|[1-9][0-9]*)$' THEN RAISE EXCEPTION 'Canonical content prohibits non-integer numbers' USING ERRCODE='23514'; END IF;
  result:=value::text;
 ELSE result:=value::text;
 END CASE;
 RETURN result;
END $$;
--> statement-breakpoint
CREATE FUNCTION demo_plain_text(value jsonb, low integer, high integer) RETURNS boolean LANGUAGE sql IMMUTABLE AS $$
 SELECT demo_json_string(value,low,high) AND COALESCE((value#>>'{}') !~ '<[!/?A-Za-z][^>]*>',false)
$$;
--> statement-breakpoint
CREATE FUNCTION content_guard_demo_version() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE payload jsonb; block jsonb; option_count integer; block_ids text[]:=ARRAY[]::text[]; organization_ref text;
BEGIN
 IF NOT demo_valid_semver(NEW.version) THEN RAISE EXCEPTION 'Content version must be strict SemVer within 38 characters' USING ERRCODE='23514'; END IF;
 payload:=NEW.canonical_json::jsonb;
 IF NOT demo_json_keys(payload,ARRAY['schemaVersion','contentPackId','organizationId','version','title','blocks']) OR payload->'schemaVersion' IS DISTINCT FROM '"1.0.0"'::jsonb OR NOT demo_json_id(payload->'contentPackId') OR NOT demo_json_id(payload->'organizationId') OR payload->>'contentPackId' IS DISTINCT FROM NEW.content_pack_id OR payload->>'version' IS DISTINCT FROM NEW.version OR demo_plain_text(payload->'title',1,160) IS DISTINCT FROM true OR jsonb_typeof(payload->'blocks') IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'Invalid finite content schema' USING ERRCODE='23514'; END IF;
 SELECT organization_id INTO organization_ref FROM content_packs WHERE id=NEW.content_pack_id;
 IF NOT FOUND OR payload->>'organizationId' IS DISTINCT FROM organization_ref THEN RAISE EXCEPTION 'Canonical content ownership mismatch' USING ERRCODE='23514'; END IF;
 IF jsonb_array_length(payload->'blocks')<>3 THEN RAISE EXCEPTION 'Content requires exactly three blocks' USING ERRCODE='23514'; END IF;
 FOR block IN SELECT value FROM jsonb_array_elements(payload->'blocks') LOOP
  IF NOT demo_json_keys(block,ARRAY['id','kind','instruction','prompt','options','expectedOptionIndex','feedback']) OR NOT demo_json_id(block->'id') OR block->'kind' IS DISTINCT FROM '"SINGLE_CHOICE"'::jsonb OR demo_plain_text(block->'instruction',1,4000) IS DISTINCT FROM true OR demo_plain_text(block->'prompt',1,1000) IS DISTINCT FROM true OR jsonb_typeof(block->'options') IS DISTINCT FROM 'array' OR jsonb_typeof(block->'feedback') IS DISTINCT FROM 'array' OR jsonb_typeof(block->'expectedOptionIndex') IS DISTINCT FROM 'number' OR (block->>'expectedOptionIndex') !~ '^[0-4]$' THEN RAISE EXCEPTION 'Invalid finite ContentBlock shape' USING ERRCODE='23514'; END IF;
  IF block->>'id'=ANY(block_ids) THEN RAISE EXCEPTION 'ContentBlock IDs must be unique' USING ERRCODE='23514'; END IF;
  block_ids:=array_append(block_ids,block->>'id');
  option_count:=jsonb_array_length(block->'options');
  IF option_count NOT BETWEEN 2 AND 5 OR (block->>'expectedOptionIndex')::integer>=option_count OR jsonb_array_length(block->'feedback')<>option_count OR (SELECT count(DISTINCT value) FROM jsonb_array_elements(block->'options'))<>option_count OR EXISTS(SELECT 1 FROM jsonb_array_elements(block->'options') item WHERE demo_plain_text(item.value,1,500) IS DISTINCT FROM true) OR EXISTS(SELECT 1 FROM jsonb_array_elements(block->'feedback') item WHERE demo_plain_text(item.value,1,2000) IS DISTINCT FROM true) THEN RAISE EXCEPTION 'Invalid ContentBlock option or authored feedback bounds' USING ERRCODE='23514'; END IF;
 END LOOP;
 IF demo_canonical_json(payload) IS DISTINCT FROM NEW.canonical_json THEN RAISE EXCEPTION 'Content payload is not exact canonical JSON' USING ERRCODE='23514'; END IF;
 RETURN NEW;
END $$;
--> statement-breakpoint
CREATE TRIGGER content_demo_version_guard BEFORE INSERT ON content_pack_versions FOR EACH ROW EXECUTE FUNCTION content_guard_demo_version();
--> statement-breakpoint
-- Backend-only local schema posture. Browser policies and API grants are absent.
-- This does not configure a project, deploy, or claim Supabase Data API evidence.
DO $$
DECLARE tab text; fn record; role_name text;
BEGIN
 FOR tab IN SELECT tablename FROM pg_tables WHERE schemaname='public' LOOP
  EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',tab);
  EXECUTE format('REVOKE ALL ON TABLE public.%I FROM PUBLIC',tab);
  FOREACH role_name IN ARRAY ARRAY['anon','authenticated'] LOOP
   IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname=role_name) THEN EXECUTE format('REVOKE ALL ON TABLE public.%I FROM %I',tab,role_name); END IF;
  END LOOP;
 END LOOP;
 FOR fn IN SELECT p.oid::regprocedure AS signature FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' LOOP
  EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC',fn.signature);
  FOREACH role_name IN ARRAY ARRAY['anon','authenticated'] LOOP
   IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname=role_name) THEN EXECUTE format('REVOKE ALL ON FUNCTION %s FROM %I',fn.signature,role_name); END IF;
  END LOOP;
 END LOOP;
END $$;
--> statement-breakpoint
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM PUBLIC;
--> statement-breakpoint
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM PUBLIC;
--> statement-breakpoint
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM PUBLIC;
--> statement-breakpoint
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
