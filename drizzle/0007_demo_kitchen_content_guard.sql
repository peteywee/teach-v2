-- TEACH-DEMO-KITCHEN-2026-10-26: finite 1.2.0 Content guard successor.
-- Only the existing function body changes; no tables, grants or historical rows.
CREATE OR REPLACE FUNCTION "content_guard_demo_version"() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE payload jsonb; block jsonb; option_count integer; block_ids text[]:=ARRAY[]::text[]; organization_ref text;
 recipe jsonb; recipe_ids text[]:=ARRAY[]::text[]; recipe_content boolean; kitchen_content boolean;
 item jsonb; requirement jsonb; station_ids text[]:=ARRAY[]::text[]; person_ids text[]:=ARRAY[]::text[]; equipment_ids text[]:=ARRAY[]::text[]; requirement_ids text[]; holding_keys text[]:=ARRAY[]::text[]; holding_key text;
 plain_values jsonb[]:=ARRAY[]::jsonb[]; plain_value jsonb; plain_text text;
 -- JavaScript whitespace for the 1.1.0 protocol-relative URL rule, including
 -- scalar spaces not recognized by every PostgreSQL locale's \s class.
 js_whitespace text:=pg_catalog.chr(9)||pg_catalog.chr(10)||pg_catalog.chr(11)||pg_catalog.chr(12)||pg_catalog.chr(13)||' '||pg_catalog.chr(160)||pg_catalog.chr(5760)||pg_catalog.chr(8192)||pg_catalog.chr(8193)||pg_catalog.chr(8194)||pg_catalog.chr(8195)||pg_catalog.chr(8196)||pg_catalog.chr(8197)||pg_catalog.chr(8198)||pg_catalog.chr(8199)||pg_catalog.chr(8200)||pg_catalog.chr(8201)||pg_catalog.chr(8202)||pg_catalog.chr(8232)||pg_catalog.chr(8233)||pg_catalog.chr(8239)||pg_catalog.chr(8287)||pg_catalog.chr(12288)||pg_catalog.chr(65279);
BEGIN
 IF NOT "demo_valid_semver"(NEW.version) THEN RAISE EXCEPTION 'Content version must be strict SemVer within 38 characters' USING ERRCODE='23514'; END IF;
 payload:=NEW.canonical_json::jsonb;
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
 IF NOT "demo_json_id"(payload->'contentPackId') OR NOT "demo_json_id"(payload->'organizationId') OR payload->>'contentPackId' IS DISTINCT FROM NEW.content_pack_id OR payload->>'version' IS DISTINCT FROM NEW.version OR "demo_plain_text"(payload->'title',1,160) IS DISTINCT FROM true OR pg_catalog.jsonb_typeof(payload->'blocks') IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'Invalid finite content schema' USING ERRCODE='23514'; END IF;
 SELECT organization_id INTO organization_ref FROM "content_packs" WHERE id=NEW.content_pack_id;
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
 IF "demo_canonical_json"(payload) IS DISTINCT FROM NEW.canonical_json THEN RAISE EXCEPTION 'Content payload is not exact canonical JSON' USING ERRCODE='23514'; END IF;
 RETURN NEW;
END $$;
