CREATE TABLE "content_authoring_drafts" (
	"id" text PRIMARY KEY NOT NULL,
	"demo_run_id" text NOT NULL,
	"organization_id" text NOT NULL,
	"location_id" text NOT NULL,
	"manager_identity_id" text NOT NULL,
	"content_pack_id" text NOT NULL,
	"base_version" text NOT NULL,
	"base_digest" text NOT NULL,
	"revision" integer NOT NULL,
	"catalog_json" text NOT NULL,
	"catalog_digest" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"published_revision" integer,
	"published_version" text,
	"published_digest" text,
	CONSTRAINT "authoring_draft_run_uq" UNIQUE("demo_run_id"),
	CONSTRAINT "authoring_draft_shape_check" CHECK ("content_authoring_drafts"."revision" BETWEEN 1 AND 100 AND "content_authoring_drafts"."base_version"='1.2.0' AND octet_length("content_authoring_drafts"."catalog_json")<=49152 AND "content_authoring_drafts"."catalog_digest"='sha256:'||encode(sha256(convert_to("content_authoring_drafts"."catalog_json",'UTF8')),'hex') AND isfinite("content_authoring_drafts"."created_at") AND isfinite("content_authoring_drafts"."updated_at") AND "content_authoring_drafts"."updated_at">="content_authoring_drafts"."created_at"),
	CONSTRAINT "authoring_draft_published_shape_check" CHECK (("content_authoring_drafts"."published_revision" IS NULL AND "content_authoring_drafts"."published_version" IS NULL AND "content_authoring_drafts"."published_digest" IS NULL) OR ("content_authoring_drafts"."published_revision" IS NOT NULL AND "content_authoring_drafts"."published_version" IS NOT NULL AND "content_authoring_drafts"."published_digest" IS NOT NULL AND "content_authoring_drafts"."published_revision" BETWEEN 1 AND "content_authoring_drafts"."revision" AND "content_authoring_drafts"."published_version" ~ '^1\.2\.([0-9]|10)$' AND "content_authoring_drafts"."published_digest" ~ '^sha256:[0-9a-f]{64}$'))
);
--> statement-breakpoint
CREATE TABLE "content_authoring_receipts" (
	"demo_run_id" text NOT NULL,
	"organization_id" text NOT NULL,
	"location_id" text NOT NULL,
	"manager_identity_id" text NOT NULL,
	"key" text NOT NULL,
	"operation" text NOT NULL,
	"payload_digest" text NOT NULL,
	"result" jsonb NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	CONSTRAINT "authoring_receipt_pk" PRIMARY KEY("demo_run_id","manager_identity_id","key"),
	CONSTRAINT "authoring_receipt_shape_check" CHECK ("content_authoring_receipts"."operation" IN ('SaveContentDraft','PublishContentDraft') AND "content_authoring_receipts"."key" ~ '^[A-Za-z0-9_-]{16,128}$' AND "content_authoring_receipts"."payload_digest" ~ '^[0-9a-f]{64}$' AND octet_length("content_authoring_receipts"."result"::text)<=4096 AND isfinite("content_authoring_receipts"."created_at") AND isfinite("content_authoring_receipts"."expires_at") AND "content_authoring_receipts"."expires_at">"content_authoring_receipts"."created_at")
);
--> statement-breakpoint
ALTER TABLE "content_authoring_drafts" ADD CONSTRAINT "authoring_draft_run_fk" FOREIGN KEY ("demo_run_id") REFERENCES "public"."organization_demo_runs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_authoring_drafts" ADD CONSTRAINT "authoring_draft_org_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization_organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_authoring_drafts" ADD CONSTRAINT "authoring_draft_location_fk" FOREIGN KEY ("location_id","organization_id") REFERENCES "public"."organization_locations"("id","organization_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_authoring_drafts" ADD CONSTRAINT "authoring_draft_manager_fk" FOREIGN KEY ("manager_identity_id") REFERENCES "public"."identity_identities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_authoring_drafts" ADD CONSTRAINT "authoring_draft_pack_fk" FOREIGN KEY ("content_pack_id","organization_id") REFERENCES "public"."content_packs"("id","organization_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_authoring_drafts" ADD CONSTRAINT "authoring_draft_base_fk" FOREIGN KEY ("content_pack_id","base_version","base_digest") REFERENCES "public"."content_pack_versions"("content_pack_id","version","digest") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_authoring_drafts" ADD CONSTRAINT "authoring_draft_published_fk" FOREIGN KEY ("content_pack_id","published_version","published_digest") REFERENCES "public"."content_pack_versions"("content_pack_id","version","digest") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_authoring_receipts" ADD CONSTRAINT "authoring_receipt_run_fk" FOREIGN KEY ("demo_run_id") REFERENCES "public"."organization_demo_runs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_authoring_receipts" ADD CONSTRAINT "authoring_receipt_org_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization_organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_authoring_receipts" ADD CONSTRAINT "authoring_receipt_location_fk" FOREIGN KEY ("location_id","organization_id") REFERENCES "public"."organization_locations"("id","organization_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_authoring_receipts" ADD CONSTRAINT "authoring_receipt_manager_fk" FOREIGN KEY ("manager_identity_id") REFERENCES "public"."identity_identities"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
-- Reviewed demo authoring guards.
-- The catalog validator preserves the admitted 1.2 content rules and merges only four editable fields.
CREATE FUNCTION content_authoring_validate_catalog(base_json text,catalog_json text) RETURNS boolean LANGUAGE plpgsql AS $$
DECLARE payload jsonb; block jsonb; option_count integer; block_ids text[]:=ARRAY[]::text[]; organization_ref text;
 recipe jsonb; recipe_ids text[]:=ARRAY[]::text[]; recipe_content boolean; kitchen_content boolean;
 item jsonb; requirement jsonb; station_ids text[]:=ARRAY[]::text[]; person_ids text[]:=ARRAY[]::text[]; equipment_ids text[]:=ARRAY[]::text[]; requirement_ids text[]; holding_keys text[]:=ARRAY[]::text[]; holding_key text;
 plain_values jsonb[]:=ARRAY[]::jsonb[]; plain_value jsonb; plain_text text;
 -- JavaScript whitespace for the 1.1.0 protocol-relative URL rule, including
 -- scalar spaces not recognized by every PostgreSQL locale's \s class.
 js_whitespace text:=pg_catalog.chr(9)||pg_catalog.chr(10)||pg_catalog.chr(11)||pg_catalog.chr(12)||pg_catalog.chr(13)||' '||pg_catalog.chr(160)||pg_catalog.chr(5760)||pg_catalog.chr(8192)||pg_catalog.chr(8193)||pg_catalog.chr(8194)||pg_catalog.chr(8195)||pg_catalog.chr(8196)||pg_catalog.chr(8197)||pg_catalog.chr(8198)||pg_catalog.chr(8199)||pg_catalog.chr(8200)||pg_catalog.chr(8201)||pg_catalog.chr(8202)||pg_catalog.chr(8232)||pg_catalog.chr(8233)||pg_catalog.chr(8239)||pg_catalog.chr(8287)||pg_catalog.chr(12288)||pg_catalog.chr(65279);
BEGIN
 IF NOT "demo_valid_semver"((base_json::jsonb->>'version')) THEN RAISE EXCEPTION 'Content version must be strict SemVer within 38 characters' USING ERRCODE='23514'; END IF;
 payload:=base_json::jsonb || catalog_json::jsonb;
 IF NOT demo_json_keys(catalog_json::jsonb,ARRAY['stations','equipment','inventory','recipes']) OR demo_canonical_json(catalog_json::jsonb) IS DISTINCT FROM catalog_json OR payload->>'schemaVersion' IS DISTINCT FROM '1.2.0' OR octet_length(demo_canonical_json(payload))>65536 THEN RAISE EXCEPTION 'Invalid authoring catalog envelope' USING ERRCODE='23514'; END IF;

 -- Do not reinterpret or tighten existing 1.0.0 bytes. The successor is an
 -- exact, additive schema branch in the same immutable Content version table.
 kitchen_content:=payload->'schemaVersion'='"1.2.0"'::jsonb;
 recipe_content:=payload->'schemaVersion' IN ('"1.1.0"'::jsonb,'"1.2.0"'::jsonb);
 IF kitchen_content IS TRUE THEN
  IF NOT "demo_json_keys"(payload,ARRAY['schemaVersion','contentPackId','organizationId','version','title','blocks','recipes','stations','people','equipment','inventory']) THEN RAISE EXCEPTION 'Invalid finite kitchen content schema' USING ERRCODE='23514'; END IF;
 ELSIF recipe_content IS TRUE THEN
  IF NOT "demo_json_keys"(payload,ARRAY['schemaVersion','contentPackId','organizationId','version','title','blocks','recipes']) THEN RAISE EXCEPTION 'Invalid finite recipe content schema' USING ERRCODE='23514'; END IF;
 ELSE
  IF NOT "demo_json_keys"(payload,ARRAY['schemaVersion','contentPackId','organizationId','version','title','blocks']) OR payload->'schemaVersion' IS DISTINCT FROM '"1.0.0"'::jsonb THEN RAISE EXCEPTION 'Invalid finite content schema' USING ERRCODE='23514'; END IF;
 END IF;
 IF NOT "demo_json_id"(payload->'contentPackId') OR NOT "demo_json_id"(payload->'organizationId') OR payload->>'contentPackId' IS DISTINCT FROM (base_json::jsonb->>'contentPackId') OR payload->>'version' IS DISTINCT FROM (base_json::jsonb->>'version') OR "demo_plain_text"(payload->'title',1,160) IS DISTINCT FROM true OR pg_catalog.jsonb_typeof(payload->'blocks') IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'Invalid finite content schema' USING ERRCODE='23514'; END IF;
 SELECT organization_id INTO organization_ref FROM "content_packs" WHERE id=(base_json::jsonb->>'contentPackId');
 IF NOT FOUND OR payload->>'organizationId' IS DISTINCT FROM organization_ref THEN RAISE EXCEPTION 'Canonical content ownership mismatch' USING ERRCODE='23514'; END IF;
 IF pg_catalog.jsonb_array_length(payload->'blocks')<>3 THEN RAISE EXCEPTION 'Content requires exactly three blocks' USING ERRCODE='23514'; END IF;
 IF recipe_content THEN plain_values:=pg_catalog.array_append(plain_values,payload->'title'); END IF;
 FOR block IN SELECT value FROM pg_catalog.jsonb_array_elements(payload->'blocks') LOOP
  IF NOT "demo_json_keys"(block,ARRAY['id','kind','instruction','prompt','options','expectedOptionIndex','feedback']) OR NOT "demo_json_id"(block->'id') OR block->'kind' IS DISTINCT FROM '"SINGLE_CHOICE"'::jsonb OR "demo_plain_text"(block->'instruction',1,4000) IS DISTINCT FROM true OR "demo_plain_text"(block->'prompt',1,1000) IS DISTINCT FROM true OR pg_catalog.jsonb_typeof(block->'options') IS DISTINCT FROM 'array' OR pg_catalog.jsonb_typeof(block->'feedback') IS DISTINCT FROM 'array' OR pg_catalog.jsonb_typeof(block->'expectedOptionIndex') IS DISTINCT FROM 'number' OR (block->>'expectedOptionIndex') !~ '^[0-4]$' THEN RAISE EXCEPTION 'Invalid finite ContentBlock shape' USING ERRCODE='23514'; END IF;
  IF block->>'id'=ANY(block_ids) THEN RAISE EXCEPTION 'ContentBlock IDs must be unique' USING ERRCODE='23514'; END IF;
  block_ids:=pg_catalog.array_append(block_ids,block->>'id');
  option_count:=pg_catalog.jsonb_array_length(block->'options');
  IF option_count NOT BETWEEN 2 AND 5 OR (block->>'expectedOptionIndex')::integer>=option_count OR pg_catalog.jsonb_array_length(block->'feedback')<>option_count OR (SELECT pg_catalog.count(DISTINCT value) FROM pg_catalog.jsonb_array_elements(block->'options'))<>option_count OR EXISTS(SELECT 1 FROM pg_catalog.jsonb_array_elements(block->'options') item WHERE "demo_plain_text"(item.value,1,500) IS DISTINCT FROM true) OR EXISTS(SELECT 1 FROM pg_catalog.jsonb_array_elements(block->'feedback') item WHERE "demo_plain_text"(item.value,1,2000) IS DISTINCT FROM true) THEN RAISE EXCEPTION 'Invalid ContentBlock option or authored feedback bounds' USING ERRCODE='23514'; END IF;
  IF recipe_content THEN
   plain_values:=plain_values||ARRAY[block->'instruction',block->'prompt'];
   plain_values:=plain_values||ARRAY(SELECT value FROM pg_catalog.jsonb_array_elements(block->'options'))||ARRAY(SELECT value FROM pg_catalog.jsonb_array_elements(block->'feedback'));
  END IF;
 END LOOP;
 IF recipe_content AND NOT kitchen_content THEN
  IF pg_catalog.jsonb_typeof(payload->'recipes') IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'Content requires exactly three recipes' USING ERRCODE='23514'; END IF;
  IF pg_catalog.jsonb_array_length(payload->'recipes')<>3 THEN RAISE EXCEPTION 'Content requires exactly three recipes' USING ERRCODE='23514'; END IF;
  FOR recipe IN SELECT value FROM pg_catalog.jsonb_array_elements(payload->'recipes') LOOP
   IF NOT "demo_json_keys"(recipe,ARRAY['id','title','station','servings','ingredients','steps','reference']) OR NOT "demo_json_id"(recipe->'id') OR NOT "demo_json_string"(recipe->'title',1,160) OR NOT "demo_json_string"(recipe->'station',1,80) OR NOT "demo_json_string"(recipe->'reference',1,1000) OR pg_catalog.jsonb_typeof(recipe->'servings') IS DISTINCT FROM 'number' OR (recipe->>'servings') !~ '^([1-9][0-9]?|100)$' OR pg_catalog.jsonb_typeof(recipe->'ingredients') IS DISTINCT FROM 'array' OR pg_catalog.jsonb_typeof(recipe->'steps') IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'Invalid finite Recipe shape' USING ERRCODE='23514'; END IF;
   IF recipe->>'id'=ANY(recipe_ids) THEN RAISE EXCEPTION 'Recipe IDs must be unique' USING ERRCODE='23514'; END IF;
   recipe_ids:=pg_catalog.array_append(recipe_ids,recipe->>'id');
   IF pg_catalog.jsonb_array_length(recipe->'ingredients') NOT BETWEEN 1 AND 30 OR pg_catalog.jsonb_array_length(recipe->'steps') NOT BETWEEN 1 AND 20 OR EXISTS(SELECT 1 FROM pg_catalog.jsonb_array_elements(recipe->'ingredients') item WHERE NOT "demo_json_string"(item.value,1,500)) OR EXISTS(SELECT 1 FROM pg_catalog.jsonb_array_elements(recipe->'steps') item WHERE NOT "demo_json_string"(item.value,1,2000)) THEN RAISE EXCEPTION 'Invalid Recipe ingredient or step bounds' USING ERRCODE='23514'; END IF;
   plain_values:=plain_values||ARRAY[recipe->'title',recipe->'station',recipe->'reference'];
   plain_values:=plain_values||ARRAY(SELECT value FROM pg_catalog.jsonb_array_elements(recipe->'ingredients'))||ARRAY(SELECT value FROM pg_catalog.jsonb_array_elements(recipe->'steps'));
  END LOOP;
 END IF;
 IF kitchen_content THEN
  IF pg_catalog.jsonb_typeof(payload->'people') IS DISTINCT FROM 'array' OR pg_catalog.jsonb_typeof(payload->'stations') IS DISTINCT FROM 'array' OR pg_catalog.jsonb_typeof(payload->'equipment') IS DISTINCT FROM 'array' OR pg_catalog.jsonb_typeof(payload->'inventory') IS DISTINCT FROM 'array' OR pg_catalog.jsonb_typeof(payload->'recipes') IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'Kitchen collections must be arrays' USING ERRCODE='23514'; END IF;
  IF pg_catalog.jsonb_array_length(payload->'people') NOT BETWEEN 1 AND 24 OR pg_catalog.jsonb_array_length(payload->'stations') NOT BETWEEN 1 AND 12 OR pg_catalog.jsonb_array_length(payload->'equipment') NOT BETWEEN 1 AND 40 OR pg_catalog.jsonb_array_length(payload->'inventory') NOT BETWEEN 1 AND 80 OR pg_catalog.jsonb_array_length(payload->'recipes') NOT BETWEEN 1 AND 24 THEN RAISE EXCEPTION 'Kitchen collection count out of bounds' USING ERRCODE='23514'; END IF;
  FOR item IN SELECT value FROM pg_catalog.jsonb_array_elements(payload->'people') LOOP
   IF NOT "demo_json_keys"(item,ARRAY['id','displayLabel','roleLabel']) OR NOT "demo_json_id"(item->'id') OR NOT "demo_json_string"(item->'displayLabel',1,80) OR NOT "demo_json_string"(item->'roleLabel',1,80) OR item->>'id'=ANY(person_ids) THEN RAISE EXCEPTION 'Invalid finite fictional person' USING ERRCODE='23514'; END IF;
   person_ids:=pg_catalog.array_append(person_ids,item->>'id'); plain_values:=plain_values||ARRAY[item->'displayLabel',item->'roleLabel'];
  END LOOP;
  FOR item IN SELECT value FROM pg_catalog.jsonb_array_elements(payload->'stations') LOOP
   IF NOT "demo_json_keys"(item,ARRAY['id','label','responsiblePersonId']) OR NOT "demo_json_id"(item->'id') OR NOT "demo_json_string"(item->'label',1,80) OR NOT "demo_json_id"(item->'responsiblePersonId') OR NOT (item->>'responsiblePersonId'=ANY(person_ids)) OR item->>'id'=ANY(station_ids) THEN RAISE EXCEPTION 'Invalid finite station or responsible person' USING ERRCODE='23514'; END IF;
   station_ids:=pg_catalog.array_append(station_ids,item->>'id'); plain_values:=pg_catalog.array_append(plain_values,item->'label');
  END LOOP;
  FOR item IN SELECT value FROM pg_catalog.jsonb_array_elements(payload->'equipment') LOOP
   IF NOT "demo_json_keys"(item,ARRAY['id','label','kind']) OR NOT "demo_json_id"(item->'id') OR NOT "demo_json_string"(item->'label',1,80) OR item->'kind' NOT IN ('"TOOL"'::jsonb,'"EQUIPMENT"'::jsonb) OR item->>'id'=ANY(equipment_ids) THEN RAISE EXCEPTION 'Invalid finite equipment item' USING ERRCODE='23514'; END IF;
   equipment_ids:=pg_catalog.array_append(equipment_ids,item->>'id'); plain_values:=pg_catalog.array_append(plain_values,item->'label');
  END LOOP;
  FOR item IN SELECT value FROM pg_catalog.jsonb_array_elements(payload->'inventory') LOOP
   IF NOT "demo_json_keys"(item,ARRAY['equipmentId','stationId','quantity']) OR NOT "demo_json_id"(item->'equipmentId') OR NOT (item->>'equipmentId'=ANY(equipment_ids)) OR (item->'stationId' IS DISTINCT FROM 'null'::jsonb AND (NOT "demo_json_id"(item->'stationId') OR NOT (item->>'stationId'=ANY(station_ids)))) OR pg_catalog.jsonb_typeof(item->'quantity') IS DISTINCT FROM 'number' OR (item->>'quantity') !~ '^([1-9][0-9]?|100)$' THEN RAISE EXCEPTION 'Invalid finite inventory holding' USING ERRCODE='23514'; END IF;
   holding_key:=pg_catalog.jsonb_build_array(item->'equipmentId',item->'stationId')::text;
   IF holding_key=ANY(holding_keys) THEN RAISE EXCEPTION 'Duplicate inventory holding' USING ERRCODE='23514'; END IF;
   holding_keys:=pg_catalog.array_append(holding_keys,holding_key);
  END LOOP;
  FOR recipe IN SELECT value FROM pg_catalog.jsonb_array_elements(payload->'recipes') LOOP
   IF NOT "demo_json_keys"(recipe,ARRAY['id','title','stationId','servings','ingredients','steps','reference','requirements']) OR NOT "demo_json_id"(recipe->'id') OR NOT "demo_json_string"(recipe->'title',1,160) OR NOT "demo_json_id"(recipe->'stationId') OR NOT (recipe->>'stationId'=ANY(station_ids)) OR NOT "demo_json_string"(recipe->'reference',1,1000) OR pg_catalog.jsonb_typeof(recipe->'servings') IS DISTINCT FROM 'number' OR (recipe->>'servings') !~ '^([1-9][0-9]?|100)$' OR pg_catalog.jsonb_typeof(recipe->'ingredients') IS DISTINCT FROM 'array' OR pg_catalog.jsonb_typeof(recipe->'steps') IS DISTINCT FROM 'array' OR pg_catalog.jsonb_typeof(recipe->'requirements') IS DISTINCT FROM 'array' OR recipe->>'id'=ANY(recipe_ids) THEN RAISE EXCEPTION 'Invalid finite station recipe' USING ERRCODE='23514'; END IF;
   recipe_ids:=pg_catalog.array_append(recipe_ids,recipe->>'id'); requirement_ids:=ARRAY[]::text[];
   IF pg_catalog.jsonb_array_length(recipe->'ingredients') NOT BETWEEN 1 AND 30 OR pg_catalog.jsonb_array_length(recipe->'steps') NOT BETWEEN 1 AND 20 OR pg_catalog.jsonb_array_length(recipe->'requirements') NOT BETWEEN 1 AND 20 OR EXISTS(SELECT 1 FROM pg_catalog.jsonb_array_elements(recipe->'ingredients') element WHERE NOT "demo_json_string"(element.value,1,500)) OR EXISTS(SELECT 1 FROM pg_catalog.jsonb_array_elements(recipe->'steps') element WHERE NOT "demo_json_string"(element.value,1,2000)) THEN RAISE EXCEPTION 'Station recipe bounds invalid' USING ERRCODE='23514'; END IF;
   FOR requirement IN SELECT value FROM pg_catalog.jsonb_array_elements(recipe->'requirements') LOOP
    IF NOT "demo_json_keys"(requirement,ARRAY['equipmentId','quantity']) OR NOT "demo_json_id"(requirement->'equipmentId') OR NOT (requirement->>'equipmentId'=ANY(equipment_ids)) OR pg_catalog.jsonb_typeof(requirement->'quantity') IS DISTINCT FROM 'number' OR (requirement->>'quantity') !~ '^([1-9][0-9]?|100)$' OR requirement->>'equipmentId'=ANY(requirement_ids) THEN RAISE EXCEPTION 'Invalid finite equipment requirement' USING ERRCODE='23514'; END IF;
    requirement_ids:=pg_catalog.array_append(requirement_ids,requirement->>'equipmentId');
   END LOOP;
   plain_values:=plain_values||ARRAY[recipe->'title',recipe->'reference'];
   plain_values:=plain_values||ARRAY(SELECT value FROM pg_catalog.jsonb_array_elements(recipe->'ingredients'))||ARRAY(SELECT value FROM pg_catalog.jsonb_array_elements(recipe->'steps'));
  END LOOP;
 END IF;
 IF recipe_content THEN
  -- String length above is in Unicode scalar values. jsonb decoding rejects
  -- NUL and lone surrogates; the final exact-canonical comparison also rejects
  -- duplicate keys, alternate number lexemes, escapes and key order changes.
  FOREACH plain_value IN ARRAY plain_values LOOP
   plain_text:=plain_value#>>'{}';
   IF plain_text ~ ('['||pg_catalog.chr(1)||'-'||pg_catalog.chr(8)||pg_catalog.chr(11)||pg_catalog.chr(12)||pg_catalog.chr(14)||'-'||pg_catalog.chr(31)||pg_catalog.chr(127)||']')
    OR plain_text ~ '<[^>]*>'
    OR plain_text COLLATE pg_catalog."C" ~* '(^|[^A-Za-z0-9_])([A-Za-z][A-Za-z0-9+.-]*://|https?:|ftp:|file:|data:|javascript:|vbscript:|mailto:|tel:|www\.)'
    OR plain_text ~ ('(^|['||js_whitespace||'("''])//[^'||js_whitespace||']+') THEN
    RAISE EXCEPTION 'Recipe content requires plain text without HTML, scripts, URLs, media or prohibited controls' USING ERRCODE='23514';
   END IF;
  END LOOP;
 END IF;

 -- Draft-only trim parity: do not tighten immutable people/title/training or the published 1.2 guard.
 IF EXISTS(SELECT 1 FROM jsonb_array_elements(payload->'stations') x WHERE length(btrim(x->>'label',js_whitespace))=0) OR EXISTS(SELECT 1 FROM jsonb_array_elements(payload->'equipment') x WHERE length(btrim(x->>'label',js_whitespace))=0) THEN RAISE EXCEPTION 'Authoring labels must contain non-whitespace text' USING ERRCODE='23514'; END IF;
 FOR recipe IN SELECT value FROM jsonb_array_elements(payload->'recipes') LOOP
  IF length(btrim(recipe->>'title',js_whitespace))=0 OR length(btrim(recipe->>'reference',js_whitespace))=0 OR EXISTS(SELECT 1 FROM jsonb_array_elements(recipe->'ingredients') x WHERE length(btrim(x#>>'{}',js_whitespace))=0) OR EXISTS(SELECT 1 FROM jsonb_array_elements(recipe->'steps') x WHERE length(btrim(x#>>'{}',js_whitespace))=0) THEN RAISE EXCEPTION 'Authoring recipe text must contain non-whitespace text' USING ERRCODE='23514'; END IF;
 END LOOP;
 RETURN true;
END $$;
--> statement-breakpoint
CREATE FUNCTION demo_authoring_owner_active(run_ref text,organization_ref text,location_ref text,manager_ref text,at_time timestamptz) RETURNS boolean LANGUAGE plpgsql AS $$
DECLARE r organization_demo_runs%ROWTYPE; member_ref text; bundles text[];
BEGIN
 SELECT * INTO r FROM organization_demo_runs WHERE id=run_ref FOR UPDATE;
 IF NOT FOUND OR r.organization_id IS DISTINCT FROM organization_ref OR r.location_id IS DISTINCT FROM location_ref OR r.status<>'ACTIVE' OR r.closed_at IS NOT NULL OR NOT isfinite(at_time) OR at_time<r.created_at OR at_time>=r.expires_at OR clock_timestamp()>=r.expires_at THEN RETURN false; END IF;
 IF NOT EXISTS(SELECT 1 FROM identity_demo_personas p JOIN identity_identities i ON i.id=p.identity_id WHERE p.demo_run_id=run_ref AND p.identity_id=manager_ref AND p.kind='MANAGER' AND i.status='ACTIVE') THEN RETURN false; END IF;
 SELECT id INTO member_ref FROM organization_memberships WHERE identity_id=manager_ref AND organization_id=organization_ref AND location_id=location_ref AND status='ACTIVE';
 IF NOT FOUND THEN RETURN false; END IF;
 SELECT array_agg(bundle ORDER BY bundle) INTO bundles FROM organization_membership_grants WHERE membership_id=member_ref;
 RETURN COALESCE(bundles=ARRAY['demo_visitor','manager'],false);
END $$;
--> statement-breakpoint
CREATE FUNCTION content_guard_authoring_draft() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE base_json text; published_json text; r organization_demo_runs%ROWTYPE; expected_json text; version_count integer;
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Draft history cannot be deleted' USING ERRCODE='23514'; END IF;
 IF demo_authoring_owner_active(NEW.demo_run_id,NEW.organization_id,NEW.location_id,NEW.manager_identity_id,NEW.updated_at) IS DISTINCT FROM true THEN RAISE EXCEPTION 'Draft owner or active visit invalid' USING ERRCODE='23514'; END IF;
 SELECT * INTO r FROM organization_demo_runs WHERE id=NEW.demo_run_id;
 IF NEW.created_at<r.created_at OR NEW.updated_at>=r.expires_at OR NEW.updated_at>clock_timestamp()+interval '1 second' THEN RAISE EXCEPTION 'Draft time outside visit' USING ERRCODE='23514'; END IF;
 SELECT v.canonical_json INTO base_json FROM content_pack_versions v JOIN content_packs p ON p.id=v.content_pack_id WHERE p.id=NEW.content_pack_id AND p.organization_id=NEW.organization_id AND v.version=NEW.base_version AND v.digest=NEW.base_digest;
 IF NOT FOUND OR NEW.base_version<>'1.2.0' OR NOT EXISTS(SELECT 1 FROM learning_assignments a JOIN identity_demo_personas learner ON learner.identity_id=a.identity_id WHERE a.organization_id=NEW.organization_id AND a.location_id=NEW.location_id AND a.content_pack_id=NEW.content_pack_id AND a.content_version=NEW.base_version AND a.content_digest=NEW.base_digest AND learner.demo_run_id=NEW.demo_run_id AND learner.kind='LEARNER') THEN RAISE EXCEPTION 'Draft base is not the visit seed' USING ERRCODE='23514'; END IF;
 PERFORM content_authoring_validate_catalog(base_json,NEW.catalog_json);
 IF TG_OP='INSERT' THEN
  IF NEW.revision<>1 OR NEW.created_at IS DISTINCT FROM NEW.updated_at OR NEW.published_revision IS NOT NULL OR NEW.published_version IS NOT NULL OR NEW.published_digest IS NOT NULL THEN RAISE EXCEPTION 'Invalid initial draft' USING ERRCODE='23514'; END IF;
 ELSE
  IF (NEW.id,NEW.demo_run_id,NEW.organization_id,NEW.location_id,NEW.manager_identity_id,NEW.content_pack_id,NEW.base_version,NEW.base_digest,NEW.created_at) IS DISTINCT FROM (OLD.id,OLD.demo_run_id,OLD.organization_id,OLD.location_id,OLD.manager_identity_id,OLD.content_pack_id,OLD.base_version,OLD.base_digest,OLD.created_at) THEN RAISE EXCEPTION 'Draft ownership and base are immutable' USING ERRCODE='23514'; END IF;
  IF (NEW.catalog_json,NEW.catalog_digest) IS DISTINCT FROM (OLD.catalog_json,OLD.catalog_digest) THEN
   IF NEW.revision<>OLD.revision+1 OR NEW.updated_at<OLD.updated_at OR (NEW.published_revision,NEW.published_version,NEW.published_digest) IS DISTINCT FROM (OLD.published_revision,OLD.published_version,OLD.published_digest) THEN RAISE EXCEPTION 'Invalid draft revision transition' USING ERRCODE='23514'; END IF;
  ELSE
   IF NEW.revision<>OLD.revision OR NEW.updated_at IS DISTINCT FROM OLD.updated_at OR NEW.published_revision IS DISTINCT FROM NEW.revision OR OLD.published_revision IS NOT DISTINCT FROM NEW.revision THEN RAISE EXCEPTION 'Invalid publication marker transition' USING ERRCODE='23514'; END IF;
   SELECT canonical_json INTO published_json FROM content_pack_versions WHERE content_pack_id=NEW.content_pack_id AND version=NEW.published_version AND digest=NEW.published_digest;
   expected_json:=demo_canonical_json(base_json::jsonb || NEW.catalog_json::jsonb || jsonb_build_object('version',NEW.published_version));
   SELECT count(*) INTO version_count FROM content_pack_versions WHERE content_pack_id=NEW.content_pack_id;
   IF NOT FOUND OR published_json IS DISTINCT FROM expected_json OR NEW.published_version IS DISTINCT FROM '1.2.'||(version_count-1)::text OR version_count NOT BETWEEN 1 AND 11 THEN RAISE EXCEPTION 'Publication must append the exact saved catalog with unchanged training' USING ERRCODE='23514'; END IF;
  END IF;
 END IF;
 RETURN NEW;
END $$;
--> statement-breakpoint
CREATE TRIGGER content_authoring_draft_guard BEFORE INSERT OR UPDATE OR DELETE ON content_authoring_drafts FOR EACH ROW EXECUTE FUNCTION content_guard_authoring_draft();
--> statement-breakpoint
CREATE FUNCTION transaction_guard_authoring_receipt() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE d content_authoring_drafts%ROWTYPE; r organization_demo_runs%ROWTYPE; receipt_count integer; expected_result jsonb;
BEGIN
 IF demo_authoring_owner_active(NEW.demo_run_id,NEW.organization_id,NEW.location_id,NEW.manager_identity_id,NEW.created_at) IS DISTINCT FROM true THEN RAISE EXCEPTION 'Receipt owner or active visit invalid' USING ERRCODE='23514'; END IF;
 SELECT * INTO r FROM organization_demo_runs WHERE id=NEW.demo_run_id;
 IF NEW.expires_at IS DISTINCT FROM r.expires_at OR NEW.created_at>clock_timestamp()+interval '1 second' THEN RAISE EXCEPTION 'Receipt expiry must match visit' USING ERRCODE='23514'; END IF;
 SELECT count(*) INTO receipt_count FROM content_authoring_receipts WHERE demo_run_id=NEW.demo_run_id AND manager_identity_id=NEW.manager_identity_id;
 IF receipt_count>=256 THEN RAISE EXCEPTION 'Authoring receipt bound reached' USING ERRCODE='23514'; END IF;
 SELECT * INTO d FROM content_authoring_drafts WHERE demo_run_id=NEW.demo_run_id AND organization_id=NEW.organization_id AND location_id=NEW.location_id AND manager_identity_id=NEW.manager_identity_id;
 IF NOT FOUND OR NEW.result->>'draftId' IS DISTINCT FROM d.id OR NEW.result->'revision' IS DISTINCT FROM to_jsonb(d.revision) OR NEW.result->>'operation' IS DISTINCT FROM NEW.operation THEN RAISE EXCEPTION 'Receipt must confirm the current scoped draft' USING ERRCODE='23514'; END IF;
 IF NEW.operation='SaveContentDraft' THEN
  IF NOT demo_json_keys(NEW.result,ARRAY['operation','draftId','revision','catalogDigest','updatedAt']) OR NEW.result->>'catalogDigest' IS DISTINCT FROM d.catalog_digest OR NOT demo_json_timestamp_equals(NEW.result->'updatedAt',d.updated_at) THEN RAISE EXCEPTION 'Invalid save receipt' USING ERRCODE='23514'; END IF;
 ELSE
  expected_result:=jsonb_build_object('contentPackId',d.content_pack_id,'version',d.published_version,'digest',d.published_digest);
  IF d.published_revision IS DISTINCT FROM d.revision OR NOT demo_json_keys(NEW.result,ARRAY['operation','draftId','revision','contentRef','unchanged']) OR NEW.result->'contentRef' IS DISTINCT FROM expected_result OR jsonb_typeof(NEW.result->'unchanged') IS DISTINCT FROM 'boolean' THEN RAISE EXCEPTION 'Invalid publication receipt' USING ERRCODE='23514'; END IF;
 END IF;
 RETURN NEW;
END $$;
--> statement-breakpoint
CREATE TRIGGER transaction_authoring_receipt_guard BEFORE INSERT ON content_authoring_receipts FOR EACH ROW EXECUTE FUNCTION transaction_guard_authoring_receipt();
--> statement-breakpoint
CREATE TRIGGER transaction_authoring_receipt_immutable BEFORE UPDATE OR DELETE ON content_authoring_receipts FOR EACH ROW EXECUTE FUNCTION demo_reject_history_change();
--> statement-breakpoint
CREATE OR REPLACE FUNCTION demo_audit_target_matches(kind text, record_id text, version_ref text, digest_ref text, organization_ref text, location_ref text, check_scope boolean) RETURNS boolean LANGUAGE plpgsql STABLE AS $$
DECLARE exists_and_matches boolean;
BEGIN
 IF kind='UNRESOLVED' THEN RETURN NOT check_scope AND record_id IS NULL AND version_ref IS NULL AND digest_ref IS NULL; END IF;
 IF record_id IS NULL OR record_id !~ '^[A-Za-z0-9_-]{1,128}$' THEN RETURN false; END IF;
 IF kind='ContentDraft' THEN
  RETURN version_ref ~ '^[1-9][0-9]?$|^100$' AND digest_ref ~ '^sha256:[0-9a-f]{64}$' AND EXISTS(SELECT 1 FROM content_authoring_drafts d WHERE d.id=record_id AND d.revision::text=version_ref AND d.catalog_digest=digest_ref AND (NOT check_scope OR (d.organization_id=organization_ref AND d.location_id=location_ref)));
 END IF;
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
CREATE OR REPLACE FUNCTION audit_guard_demo_event() RETURNS trigger LANGUAGE plpgsql AS $$
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
 IF NEW.result='SUCCEEDED' AND NEW.action='SaveContentDraft' THEN
  IF NEW.actor_class<>'HumanActor' OR NEW.target_type<>'ContentDraft' OR NOT EXISTS(SELECT 1 FROM content_authoring_drafts d WHERE d.id=NEW.target_id AND d.manager_identity_id=NEW.actor_reference AND d.organization_id=NEW.organization_id AND d.location_id=NEW.location_id AND d.revision::text=NEW.target_version AND d.catalog_digest=NEW.target_digest) THEN RAISE EXCEPTION 'Draft audit requires its manager and saved revision' USING ERRCODE='23514'; END IF;
 END IF;
 IF NEW.result='SUCCEEDED' THEN
  IF NEW.action NOT IN ('SaveContentDraft','BeginDemoRun','CreateDemoPersona','CreateMembership','PublishContentPack','AssignContent','CreateApplicationSession','StartLearningSession','CompleteLearningSession','SwitchDemoPersona','CloseDemoRun','RevokeApplicationSession','RevokeDemoSessions','CreateIdentity','DeactivateIdentity','ReactivateIdentity','OffboardIdentity') OR NEW.denial_class IS NOT NULL OR NEW.ip_prefix IS NOT NULL OR NEW.dedup_bucket_start IS NOT NULL OR NEW.overflow_bucket_start IS NOT NULL OR NOT demo_audit_target_matches(NEW.target_type,NEW.target_id,NEW.target_version,NEW.target_digest,NEW.organization_id,NEW.location_id,true) THEN RAISE EXCEPTION 'Invalid successful audit action, target, scope or denial metadata' USING ERRCODE='23514'; END IF;
  RETURN NEW;
 END IF;
 IF NEW.actor_class<>'UNAUTHENTICATED_DENIAL' AND NEW.denial_class IS DISTINCT FROM 'CREDENTIAL_ABUSE' AND NEW.ip_prefix IS NOT NULL THEN RAISE EXCEPTION 'Audit prefix is only credential-abuse or unauthenticated denial metadata' USING ERRCODE='23514'; END IF;
 subject:=demo_audit_denial_subject(NEW.actor_class,NEW.actor_reference,NEW.ip_prefix);
 PERFORM pg_advisory_xact_lock(hashtextextended('demo-denial:' || subject,0));
 hour_start:=date_bin(interval '1 hour',NEW.occurred_at,'2000-01-01 00:00:00+00'::timestamptz);
 SELECT count(*) INTO denial_count FROM audit_events a WHERE a.result='DENIED' AND demo_audit_denial_subject(a.actor_class,a.actor_reference,a.ip_prefix)=subject AND a.occurred_at>=hour_start AND a.occurred_at<hour_start+interval '1 hour';
 IF NEW.result='DENIED' THEN
  -- This is the finite registered operation set, not user-provided request text.
  IF NEW.action NOT IN ('ReadAuthoringWorkspace','SaveContentDraft','PreviewContentDraft','PublishContentDraft','ReadAuthoringOperation','AcceptInvitation','AssignContent','AuthenticateIdentity','ChangeCredential','CompleteLearningSession','CreateApplicationSession','CreateIdentity','CreateMembership','DeactivateIdentity','DeactivateMembership','InviteIdentity','IssueCertification','OffboardIdentity','PublishContentPack','ReactivateIdentity','ReconcileExternalEffect','RecordProgressEvent','RevokeApplicationSession','RevokeCertification','RevokeInvitation','RevokeMembership','RevokeSingleUseToken','StartLearningSession','BeginDemoRun','CreateDemoPersona','SwitchDemoPersona','CloseDemoRun','RevokeDemoSessions','ReadCurrentSession','ListOwnMemberships','ListTeam','ReadTeamMemberLearnerState','ListOwnAssignments','ReadAssignedContentVersion','ReadOwnLearnerState') OR NEW.denial_class IS NULL OR NEW.denial_class NOT IN ('CAPABILITY','TENANT_SCOPE','TARGET_SCOPE','CREDENTIAL_ABUSE','ORIGIN') OR NEW.dedup_bucket_start IS DISTINCT FROM date_bin(interval '5 minutes',NEW.occurred_at,'2000-01-01 00:00:00+00'::timestamptz) OR NEW.overflow_bucket_start IS NOT NULL THEN RAISE EXCEPTION 'Invalid redacted denial representation' USING ERRCODE='23514'; END IF;
  IF NEW.actor_class='UNAUTHENTICATED_DENIAL' AND NEW.denial_class NOT IN ('CREDENTIAL_ABUSE','ORIGIN') THEN RAISE EXCEPTION 'Plain unauthenticated requests must not be denial audits' USING ERRCODE='23514'; END IF;
  IF NOT demo_audit_target_matches(NEW.target_type,NEW.target_id,NEW.target_version,NEW.target_digest,NEW.organization_id,NEW.location_id,false) OR (NEW.denial_class<>'TARGET_SCOPE' AND NEW.target_type<>'UNRESOLVED') OR (NEW.denial_class IN ('CREDENTIAL_ABUSE','ORIGIN') AND (NEW.organization_id IS NOT NULL OR NEW.location_id IS NOT NULL)) THEN RAISE EXCEPTION 'Denial target or scope is not class-redacted' USING ERRCODE='23514'; END IF;
  IF denial_count>=100 THEN RAISE EXCEPTION 'Denial hourly limit reached; append one overflow instead' USING ERRCODE='23514'; END IF;
 ELSIF NEW.result='OVERFLOW' THEN
  IF NEW.action<>'DENIAL_OVERFLOW' OR NEW.denial_class IS NOT NULL OR NEW.dedup_bucket_start IS NOT NULL OR NEW.overflow_bucket_start IS DISTINCT FROM hour_start OR NEW.organization_id IS NOT NULL OR NEW.location_id IS NOT NULL OR NEW.target_type<>'UNRESOLVED' OR NEW.target_id IS NOT NULL OR NEW.target_version IS NOT NULL OR NEW.target_digest IS NOT NULL OR NEW.idempotency_key IS NOT NULL OR denial_count<100 THEN RAISE EXCEPTION 'Invalid denial overflow representation' USING ERRCODE='23514'; END IF;
 ELSE RAISE EXCEPTION 'Unknown audit result' USING ERRCODE='23514';
 END IF;
 RETURN NEW;
END $$;
