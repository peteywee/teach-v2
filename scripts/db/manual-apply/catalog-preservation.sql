-- Read-only metadata fingerprints; no user rows, auth secrets, function bodies or policy expressions returned.
-- Run BEFORE and AFTER using the same authorized connection and compare sorted outputs.
-- This is NOT a data backup or full data/sequence-state preservation proof.
BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY;
SET LOCAL statement_timeout = '5s';
SET LOCAL lock_timeout = '2s';
SET LOCAL search_path = pg_catalog;
SELECT current_database() AS database, current_user AS actor, current_setting('server_version') AS server_version;
SELECT nspname AS schema, nspowner::text AS owner_oid, md5(coalesce(nspacl::text,'')) AS acl_digest
FROM pg_namespace WHERE nspname !~ '^pg_' AND nspname NOT IN ('information_schema','teach_v2_demo') ORDER BY nspname;
SELECT n.nspname AS schema, c.relname AS object, c.relkind, c.relpersistence, c.relowner::text AS owner_oid,
 c.relrowsecurity, c.relforcerowsecurity, md5(coalesce(c.relacl::text,'')) AS acl_digest,
 md5(coalesce(c.reloptions::text,'')) AS options_digest
FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname !~ '^pg_' AND n.nspname NOT IN ('information_schema','teach_v2_demo') ORDER BY 1,2;
SELECT n.nspname AS schema, c.relname AS object, a.attnum, a.attname,
 md5(concat_ws('|',a.atttypid,a.atttypmod,a.attnotnull,a.attidentity,a.attgenerated,a.attcollation,
 pg_get_expr(d.adbin,d.adrelid),a.attacl::text)) AS column_digest
FROM pg_attribute a JOIN pg_class c ON c.oid=a.attrelid JOIN pg_namespace n ON n.oid=c.relnamespace
LEFT JOIN pg_attrdef d ON d.adrelid=c.oid AND d.adnum=a.attnum
WHERE a.attnum>0 AND NOT a.attisdropped AND n.nspname !~ '^pg_' AND n.nspname NOT IN ('information_schema','teach_v2_demo') ORDER BY 1,2,3;
SELECT n.nspname AS schema, c.relname AS object, x.conname,
 md5(pg_get_constraintdef(x.oid,true)) AS definition_digest
FROM pg_constraint x JOIN pg_class c ON c.oid=x.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname !~ '^pg_' AND n.nspname NOT IN ('information_schema','teach_v2_demo') ORDER BY 1,2,3;
SELECT n.nspname AS schema, c.relname AS object, p.polname,
 md5(concat_ws('|',p.polcmd,p.polpermissive,p.polroles::text,pg_get_expr(p.polqual,p.polrelid),pg_get_expr(p.polwithcheck,p.polrelid))) AS policy_digest
FROM pg_policy p JOIN pg_class c ON c.oid=p.polrelid JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname !~ '^pg_' AND n.nspname NOT IN ('information_schema','teach_v2_demo') ORDER BY 1,2,3;
SELECT n.nspname AS schema, p.proname, p.oid::text AS object_oid,
 md5(concat_ws('|',p.prosrc,p.probin,p.proconfig::text,p.proacl::text,p.proowner,p.prosecdef,p.proleakproof,p.provolatile,p.proparallel,p.proargtypes::text,p.prorettype)) AS function_digest
FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname !~ '^pg_' AND n.nspname NOT IN ('information_schema','teach_v2_demo') ORDER BY 1,2,3;
SELECT n.nspname AS schema, c.relname AS object, t.tgname,
 md5(concat_ws('|',pg_get_triggerdef(t.oid,true),t.tgenabled)) AS trigger_digest
FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname !~ '^pg_' AND n.nspname NOT IN ('information_schema','teach_v2_demo') ORDER BY 1,2,3;
SELECT coalesce(n.nspname,'<global>') AS schema, d.defaclrole::text AS owner_oid, d.defaclobjtype,
 md5(d.defaclacl::text) AS defaults_digest
FROM pg_default_acl d LEFT JOIN pg_namespace n ON n.oid=d.defaclnamespace
WHERE n.nspname IS DISTINCT FROM 'teach_v2_demo' ORDER BY 1,2,3;
SELECT rolname, rolsuper, rolinherit, rolcreaterole, rolcreatedb, rolcanlogin, rolreplication, rolbypassrls
FROM pg_roles WHERE rolname NOT IN ('teach_v2_demo_creator','teach_v2_demo_runtime') ORDER BY rolname;
SELECT pg_get_userbyid(roleid) AS granted_role, pg_get_userbyid(member) AS member, admin_option, inherit_option, set_option
FROM pg_auth_members ORDER BY 1,2;
SELECT extname, extversion, extnamespace::regnamespace::text AS schema FROM pg_extension ORDER BY extname;
SELECT n.nspname AS schema, c.relname AS object, md5(pg_get_indexdef(c.oid)) AS index_digest
FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE c.relkind IN ('i','I') AND n.nspname !~ '^pg_' AND n.nspname NOT IN ('information_schema','teach_v2_demo') ORDER BY 1,2;
SELECT n.nspname AS schema, c.relname AS object, md5(pg_get_viewdef(c.oid,true)) AS view_digest
FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE c.relkind IN ('v','m') AND n.nspname !~ '^pg_' AND n.nspname NOT IN ('information_schema','teach_v2_demo') ORDER BY 1,2;
SELECT n.nspname AS schema, t.typname, md5(to_jsonb(t)::text) AS type_catalog_digest
FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace
WHERE n.nspname !~ '^pg_' AND n.nspname NOT IN ('information_schema','teach_v2_demo') ORDER BY 1,2;
SELECT n.nspname AS schema, t.typname, e.enumsortorder, md5(e.enumlabel) AS label_digest
FROM pg_enum e JOIN pg_type t ON t.oid=e.enumtypid JOIN pg_namespace n ON n.oid=t.typnamespace
WHERE n.nspname !~ '^pg_' AND n.nspname NOT IN ('information_schema','teach_v2_demo') ORDER BY 1,2,3;
SELECT n.nspname AS schema, c.collname, md5(to_jsonb(c)::text) AS collation_digest
FROM pg_collation c JOIN pg_namespace n ON n.oid=c.collnamespace
WHERE n.nspname !~ '^pg_' AND n.nspname NOT IN ('information_schema','teach_v2_demo') ORDER BY 1,2;
SELECT n.nspname AS schema, c.relname AS sequence, md5(to_jsonb(s)::text) AS sequence_definition_digest
FROM pg_sequence s JOIN pg_class c ON c.oid=s.seqrelid JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname !~ '^pg_' AND n.nspname NOT IN ('information_schema','teach_v2_demo') ORDER BY 1,2;
ROLLBACK;
