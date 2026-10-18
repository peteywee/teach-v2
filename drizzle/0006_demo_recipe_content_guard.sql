-- TEACH-DEMO-RECIPES-2026-10-18@0.1.1: additive, backend-only Content guard.
-- Existing tables, trigger attachment, ACLs, canonical digest/size constraints,
-- and update/delete history protection are unchanged. No data is rewritten.
CREATE OR REPLACE FUNCTION content_guard_demo_version() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE payload jsonb; block jsonb; option_count integer; block_ids text[]:=ARRAY[]::text[]; organization_ref text;
 recipe jsonb; recipe_ids text[]:=ARRAY[]::text[]; recipe_content boolean;
 plain_values jsonb[]:=ARRAY[]::jsonb[]; plain_value jsonb; plain_text text;
 -- JavaScript whitespace for the 1.1.0 protocol-relative URL rule, including
 -- scalar spaces not recognized by every PostgreSQL locale's \s class.
 js_whitespace text:=chr(9)||chr(10)||chr(11)||chr(12)||chr(13)||' '||chr(160)||chr(5760)||chr(8192)||chr(8193)||chr(8194)||chr(8195)||chr(8196)||chr(8197)||chr(8198)||chr(8199)||chr(8200)||chr(8201)||chr(8202)||chr(8232)||chr(8233)||chr(8239)||chr(8287)||chr(12288)||chr(65279);
BEGIN
 IF NOT demo_valid_semver(NEW.version) THEN RAISE EXCEPTION 'Content version must be strict SemVer within 38 characters' USING ERRCODE='23514'; END IF;
 payload:=NEW.canonical_json::jsonb;
 -- Do not reinterpret or tighten existing 1.0.0 bytes. The successor is an
 -- exact, additive schema branch in the same immutable Content version table.
 recipe_content:=payload->'schemaVersion'='"1.1.0"'::jsonb;
 IF recipe_content IS TRUE THEN
  IF NOT demo_json_keys(payload,ARRAY['schemaVersion','contentPackId','organizationId','version','title','blocks','recipes']) THEN RAISE EXCEPTION 'Invalid finite recipe content schema' USING ERRCODE='23514'; END IF;
 ELSE
  IF NOT demo_json_keys(payload,ARRAY['schemaVersion','contentPackId','organizationId','version','title','blocks']) OR payload->'schemaVersion' IS DISTINCT FROM '"1.0.0"'::jsonb THEN RAISE EXCEPTION 'Invalid finite content schema' USING ERRCODE='23514'; END IF;
 END IF;
 IF NOT demo_json_id(payload->'contentPackId') OR NOT demo_json_id(payload->'organizationId') OR payload->>'contentPackId' IS DISTINCT FROM NEW.content_pack_id OR payload->>'version' IS DISTINCT FROM NEW.version OR demo_plain_text(payload->'title',1,160) IS DISTINCT FROM true OR jsonb_typeof(payload->'blocks') IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'Invalid finite content schema' USING ERRCODE='23514'; END IF;
 SELECT organization_id INTO organization_ref FROM content_packs WHERE id=NEW.content_pack_id;
 IF NOT FOUND OR payload->>'organizationId' IS DISTINCT FROM organization_ref THEN RAISE EXCEPTION 'Canonical content ownership mismatch' USING ERRCODE='23514'; END IF;
 IF jsonb_array_length(payload->'blocks')<>3 THEN RAISE EXCEPTION 'Content requires exactly three blocks' USING ERRCODE='23514'; END IF;
 IF recipe_content THEN plain_values:=array_append(plain_values,payload->'title'); END IF;
 FOR block IN SELECT value FROM jsonb_array_elements(payload->'blocks') LOOP
  IF NOT demo_json_keys(block,ARRAY['id','kind','instruction','prompt','options','expectedOptionIndex','feedback']) OR NOT demo_json_id(block->'id') OR block->'kind' IS DISTINCT FROM '"SINGLE_CHOICE"'::jsonb OR demo_plain_text(block->'instruction',1,4000) IS DISTINCT FROM true OR demo_plain_text(block->'prompt',1,1000) IS DISTINCT FROM true OR jsonb_typeof(block->'options') IS DISTINCT FROM 'array' OR jsonb_typeof(block->'feedback') IS DISTINCT FROM 'array' OR jsonb_typeof(block->'expectedOptionIndex') IS DISTINCT FROM 'number' OR (block->>'expectedOptionIndex') !~ '^[0-4]$' THEN RAISE EXCEPTION 'Invalid finite ContentBlock shape' USING ERRCODE='23514'; END IF;
  IF block->>'id'=ANY(block_ids) THEN RAISE EXCEPTION 'ContentBlock IDs must be unique' USING ERRCODE='23514'; END IF;
  block_ids:=array_append(block_ids,block->>'id');
  option_count:=jsonb_array_length(block->'options');
  IF option_count NOT BETWEEN 2 AND 5 OR (block->>'expectedOptionIndex')::integer>=option_count OR jsonb_array_length(block->'feedback')<>option_count OR (SELECT count(DISTINCT value) FROM jsonb_array_elements(block->'options'))<>option_count OR EXISTS(SELECT 1 FROM jsonb_array_elements(block->'options') item WHERE demo_plain_text(item.value,1,500) IS DISTINCT FROM true) OR EXISTS(SELECT 1 FROM jsonb_array_elements(block->'feedback') item WHERE demo_plain_text(item.value,1,2000) IS DISTINCT FROM true) THEN RAISE EXCEPTION 'Invalid ContentBlock option or authored feedback bounds' USING ERRCODE='23514'; END IF;
  IF recipe_content THEN
   plain_values:=plain_values||ARRAY[block->'instruction',block->'prompt'];
   plain_values:=plain_values||ARRAY(SELECT value FROM jsonb_array_elements(block->'options'))||ARRAY(SELECT value FROM jsonb_array_elements(block->'feedback'));
  END IF;
 END LOOP;
 IF recipe_content THEN
  IF jsonb_typeof(payload->'recipes') IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'Content requires exactly three recipes' USING ERRCODE='23514'; END IF;
  IF jsonb_array_length(payload->'recipes')<>3 THEN RAISE EXCEPTION 'Content requires exactly three recipes' USING ERRCODE='23514'; END IF;
  FOR recipe IN SELECT value FROM jsonb_array_elements(payload->'recipes') LOOP
   IF NOT demo_json_keys(recipe,ARRAY['id','title','station','servings','ingredients','steps','reference']) OR NOT demo_json_id(recipe->'id') OR NOT demo_json_string(recipe->'title',1,160) OR NOT demo_json_string(recipe->'station',1,80) OR NOT demo_json_string(recipe->'reference',1,1000) OR jsonb_typeof(recipe->'servings') IS DISTINCT FROM 'number' OR (recipe->>'servings') !~ '^([1-9][0-9]?|100)$' OR jsonb_typeof(recipe->'ingredients') IS DISTINCT FROM 'array' OR jsonb_typeof(recipe->'steps') IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'Invalid finite Recipe shape' USING ERRCODE='23514'; END IF;
   IF recipe->>'id'=ANY(recipe_ids) THEN RAISE EXCEPTION 'Recipe IDs must be unique' USING ERRCODE='23514'; END IF;
   recipe_ids:=array_append(recipe_ids,recipe->>'id');
   IF jsonb_array_length(recipe->'ingredients') NOT BETWEEN 1 AND 30 OR jsonb_array_length(recipe->'steps') NOT BETWEEN 1 AND 20 OR EXISTS(SELECT 1 FROM jsonb_array_elements(recipe->'ingredients') item WHERE NOT demo_json_string(item.value,1,500)) OR EXISTS(SELECT 1 FROM jsonb_array_elements(recipe->'steps') item WHERE NOT demo_json_string(item.value,1,2000)) THEN RAISE EXCEPTION 'Invalid Recipe ingredient or step bounds' USING ERRCODE='23514'; END IF;
   plain_values:=plain_values||ARRAY[recipe->'title',recipe->'station',recipe->'reference'];
   plain_values:=plain_values||ARRAY(SELECT value FROM jsonb_array_elements(recipe->'ingredients'))||ARRAY(SELECT value FROM jsonb_array_elements(recipe->'steps'));
  END LOOP;
  -- String length above is in Unicode scalar values. jsonb decoding rejects
  -- NUL and lone surrogates; the final exact-canonical comparison also rejects
  -- duplicate keys, alternate number lexemes, escapes and key order changes.
  FOREACH plain_value IN ARRAY plain_values LOOP
   plain_text:=plain_value#>>'{}';
   IF plain_text ~ ('['||chr(1)||'-'||chr(8)||chr(11)||chr(12)||chr(14)||'-'||chr(31)||chr(127)||']')
    OR plain_text ~ '<[^>]*>'
    OR plain_text COLLATE "C" ~* '(^|[^A-Za-z0-9_])([A-Za-z][A-Za-z0-9+.-]*://|https?:|ftp:|file:|data:|javascript:|vbscript:|mailto:|tel:|www\.)'
    OR plain_text ~ ('(^|['||js_whitespace||'("''])//[^'||js_whitespace||']+') THEN
    RAISE EXCEPTION 'Recipe content requires plain text without HTML, scripts, URLs, media or prohibited controls' USING ERRCODE='23514';
   END IF;
  END LOOP;
 END IF;
 IF demo_canonical_json(payload) IS DISTINCT FROM NEW.canonical_json THEN RAISE EXCEPTION 'Content payload is not exact canonical JSON' USING ERRCODE='23514'; END IF;
 RETURN NEW;
END $$;
