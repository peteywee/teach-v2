-- Read-only; namespace must be absent for FIRST installation. Any existing object means STOP, not adoption.
BEGIN READ ONLY;
SET LOCAL statement_timeout = '5s';
SELECT nspname, nspowner::regrole::text AS owner FROM pg_catalog.pg_namespace WHERE nspname='teach_v2_demo';
SELECT rolname, rolsuper, rolbypassrls, rolcreaterole, rolcreatedb, rolcanlogin
FROM pg_catalog.pg_roles WHERE rolname IN ('teach_v2_demo_creator','teach_v2_demo_runtime');
-- Existing roles require exact separate provisioning readback, never guessed ownership or password reuse.
ROLLBACK;
