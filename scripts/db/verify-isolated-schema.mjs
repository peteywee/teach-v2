import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import pg from 'pg';
import { assertIsolatedDatabaseTarget } from './isolated-database-target.mjs';
import { applyIsolatedSchemaMigrations } from './migrate-isolated-schema.mjs';
import { sha256, verifyIsolatedLineage } from './compile-isolated-schema.mjs';
import { dropReplayDatabase } from './replay-database-cleanup.mjs';

const q = (name) => { assert.match(name, /^[a-z0-9_]+$/); return `"${name}"`; };
const schema = 'teach_v2_demo';

async function legacySnapshot(pool) {
  const rows = {};
  const queries = {
    namespaces: `SELECT nspname,pg_catalog.pg_get_userbyid(nspowner) AS owner,nspacl::text FROM pg_catalog.pg_namespace WHERE nspname IN ('public','legacy_shadow','drizzle') ORDER BY 1`,
    relations: `SELECT n.nspname,c.relname,c.relkind,c.relrowsecurity,c.relforcerowsecurity,c.relacl::text,pg_catalog.pg_get_userbyid(c.relowner) AS owner FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname IN ('public','legacy_shadow','drizzle') ORDER BY 1,2`,
    columns: `SELECT n.nspname,c.relname,a.attname,a.attnum,pg_catalog.format_type(a.atttypid,a.atttypmod) AS type,a.attnotnull,pg_catalog.pg_get_expr(d.adbin,d.adrelid) AS default_value FROM pg_catalog.pg_attribute a JOIN pg_catalog.pg_class c ON c.oid=a.attrelid JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace LEFT JOIN pg_catalog.pg_attrdef d ON d.adrelid=c.oid AND d.adnum=a.attnum WHERE n.nspname IN ('public','legacy_shadow','drizzle') AND a.attnum>0 AND NOT a.attisdropped ORDER BY 1,2,4`,
    constraints: `SELECT n.nspname,c.relname,k.conname,pg_catalog.pg_get_constraintdef(k.oid) AS definition FROM pg_catalog.pg_constraint k JOIN pg_catalog.pg_class c ON c.oid=k.conrelid JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname IN ('public','legacy_shadow','drizzle') ORDER BY 1,2,3`,
    indexes: `SELECT schemaname,tablename,indexname,indexdef FROM pg_catalog.pg_indexes WHERE schemaname IN ('public','legacy_shadow','drizzle') ORDER BY 1,2,3`,
    functions: `SELECT n.nspname,p.proname,p.prokind,p.proacl::text,p.prosecdef,p.proconfig,pg_catalog.pg_get_function_identity_arguments(p.oid) AS arguments,CASE WHEN p.prokind='a' THEN NULL ELSE pg_catalog.pg_get_functiondef(p.oid) END AS definition FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname IN ('public','legacy_shadow','drizzle') ORDER BY 1,2,7`,
    aggregates: `SELECT n.nspname,p.proname,a.aggkind,a.aggtransfn::pg_catalog.regprocedure::text,a.agginitval,pg_catalog.format_type(a.aggtranstype,NULL) AS state_type FROM pg_catalog.pg_aggregate a JOIN pg_catalog.pg_proc p ON p.oid=a.aggfnoid JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname IN ('public','legacy_shadow','drizzle') ORDER BY 1,2`,
    triggers: `SELECT n.nspname,c.relname,t.tgname,pg_catalog.pg_get_triggerdef(t.oid) AS definition FROM pg_catalog.pg_trigger t JOIN pg_catalog.pg_class c ON c.oid=t.tgrelid JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname IN ('public','legacy_shadow','drizzle') AND NOT t.tgisinternal ORDER BY 1,2,3`,
    policies: `SELECT schemaname,tablename,policyname,permissive,roles,cmd,qual,with_check FROM pg_catalog.pg_policies WHERE schemaname IN ('public','legacy_shadow','drizzle') ORDER BY 1,2,3`,
    defaults: `SELECT pg_catalog.pg_get_userbyid(d.defaclrole) AS owner,COALESCE(n.nspname,'GLOBAL') AS schema,d.defaclobjtype,d.defaclacl::text FROM pg_catalog.pg_default_acl d LEFT JOIN pg_catalog.pg_namespace n ON n.oid=d.defaclnamespace WHERE d.defaclrole=(SELECT oid FROM pg_catalog.pg_roles WHERE rolname=current_user) ORDER BY 1,2,3`,
    records: 'SELECT * FROM public.legacy_records ORDER BY id',
    collision: 'SELECT * FROM public.identity_identities ORDER BY id',
    sequence: 'SELECT * FROM public.legacy_sequence',
    publicJournal: 'SELECT * FROM public.__drizzle_migrations ORDER BY id',
    drizzleJournal: 'SELECT * FROM drizzle.__drizzle_migrations ORDER BY id',
  };
  for (const [name, sql] of Object.entries(queries)) rows[name] = (await pool.query(sql)).rows;
  return rows;
}

async function isolatedSnapshot(pool) {
  const rows = {};
  const queries = {
    relations: `SELECT c.relname,c.relkind,c.relrowsecurity,c.relforcerowsecurity,c.relacl::text FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='teach_v2_demo' ORDER BY 1`,
    columns: `SELECT table_name,ordinal_position,column_name,data_type,is_nullable,column_default FROM information_schema.columns WHERE table_schema='teach_v2_demo' ORDER BY 1,2`,
    constraints: `SELECT c.relname,k.conname,pg_catalog.pg_get_constraintdef(k.oid) AS definition FROM pg_catalog.pg_constraint k JOIN pg_catalog.pg_class c ON c.oid=k.conrelid JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='teach_v2_demo' ORDER BY 1,2`,
    indexes: `SELECT tablename,indexname,indexdef FROM pg_catalog.pg_indexes WHERE schemaname='teach_v2_demo' ORDER BY 1,2`,
    functions: `SELECT p.proname,p.proacl::text,p.prosecdef,p.proconfig,pg_catalog.pg_get_functiondef(p.oid) AS definition FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='teach_v2_demo' ORDER BY 1,3`,
    triggers: `SELECT c.relname,t.tgname,pg_catalog.pg_get_triggerdef(t.oid) AS definition FROM pg_catalog.pg_trigger t JOIN pg_catalog.pg_class c ON c.oid=t.tgrelid JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='teach_v2_demo' AND NOT t.tgisinternal ORDER BY 1,2`,
    journal: 'SELECT id,hash,created_at::text FROM teach_v2_demo.__drizzle_migrations ORDER BY id',
  };
  for (const [name, sql] of Object.entries(queries)) rows[name] = (await pool.query(sql)).rows;
  return rows;
}

async function deny(pool, sql) {
  await assert.rejects(pool.query(sql), (error) => error.code === '42501', `expected insufficient_privilege: ${sql}`);
}

/** Creates only disposable loopback databases and unique synthetic roles. */
export async function verifyIsolatedSchemaProof({ exerciseRuntime } = {}) {
  const connectionString = assertIsolatedDatabaseTarget(process.env.DATABASE_URL);
  const { manifest } = verifyIsolatedLineage();
  const suffix = `${process.pid}_${randomBytes(4).toString('hex')}`;
  const roles = Object.fromEntries(['creator', 'runtime', 'browser', 'legacy'].map((kind) => [kind, `teach_iso_${kind}_${suffix}`]));
  const names = ['a', 'b'].map((part) => `teach_v2_isolated_${part}_${suffix}`);
  const databaseUrl = (name, role) => {
    const url = new URL(connectionString); url.pathname = '/' + name;
    if (role) { url.username = role; url.password = ''; }
    return url.toString();
  };
  const adminUrl = new URL(connectionString); adminUrl.pathname = '/postgres';
  const admin = new pg.Pool({ connectionString: adminUrl.toString(), max: 1 });
  const pools = [], createdDatabases = [], createdRoles = [];
  let probes = 0, shadowProbes = 0;
  try {
    const version = Number((await admin.query('SHOW server_version_num')).rows[0].server_version_num);
    assert.ok(version >= 170000 && version < 180000, 'local isolation proof requires PostgreSQL 17');
    for (const role of Object.values(roles)) {
      await admin.query(`CREATE ROLE ${q(role)} LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS`);
      createdRoles.push(role);
    }
    for (const role of ['anon', 'authenticated']) {
      const existing = await admin.query('SELECT rolsuper,rolbypassrls FROM pg_catalog.pg_roles WHERE rolname=$1', [role]);
      if (existing.rows.length === 0) {
        await admin.query(`CREATE ROLE ${q(role)} NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS`);
        createdRoles.push(role);
      } else assert.ok(!existing.rows[0].rolsuper && !existing.rows[0].rolbypassrls, 'existing local API role must not bypass privilege/RLS tests');
    }
    const fingerprints = [];
    for (const [index, name] of names.entries()) {
      await admin.query(`CREATE DATABASE ${q(name)}`); createdDatabases.push(name);
      const owner = new pg.Pool({ connectionString: databaseUrl(name), max: 1 }); pools.push(owner);
      await owner.query(`GRANT CREATE ON DATABASE ${q(name)} TO ${q(roles.creator)}`);
      await owner.query(`
        CREATE SCHEMA legacy_shadow;
        CREATE SCHEMA drizzle;
        CREATE TABLE public.legacy_records (id integer PRIMARY KEY, payload text NOT NULL);
        INSERT INTO public.legacy_records VALUES (1, 'legacy sentinel, not demo data');
        CREATE TABLE public.identity_identities (id text PRIMARY KEY);
        INSERT INTO public.identity_identities VALUES ('legacy_identity_sentinel');
        CREATE SEQUENCE public.legacy_sequence START WITH 41;
        SELECT pg_catalog.nextval('public.legacy_sequence');
        CREATE FUNCTION public.legacy_lookup() RETURNS text LANGUAGE sql AS $fn$ SELECT payload FROM public.legacy_records WHERE id=1 $fn$;
        CREATE FUNCTION public.legacy_touch() RETURNS trigger LANGUAGE plpgsql AS $fn$ BEGIN RETURN NEW; END $fn$;
        CREATE TRIGGER legacy_touch BEFORE UPDATE ON public.legacy_records FOR EACH ROW EXECUTE FUNCTION public.legacy_touch();
        CREATE TABLE public.__drizzle_migrations (id integer, hash text);
        INSERT INTO public.__drizzle_migrations VALUES (1, 'legacy-public-journal');
        CREATE TABLE drizzle.__drizzle_migrations (id integer, hash text);
        INSERT INTO drizzle.__drizzle_migrations VALUES (1, 'legacy-drizzle-journal');
        CREATE FUNCTION legacy_shadow.demo_valid_semver(text) RETURNS boolean LANGUAGE sql AS $fn$ SELECT false $fn$;
        CREATE FUNCTION legacy_shadow.length(text) RETURNS integer LANGUAGE sql AS $fn$ SELECT 0 $fn$;
        CREATE FUNCTION legacy_shadow.clock_timestamp() RETURNS timestamptz LANGUAGE plpgsql AS $fn$ BEGIN RAISE EXCEPTION 'hostile search_path function executed'; END $fn$;
        CREATE FUNCTION legacy_shadow.pg_advisory_xact_lock(integer,integer) RETURNS void LANGUAGE plpgsql AS $fn$ BEGIN RAISE EXCEPTION 'hostile search_path function executed'; END $fn$;
        CREATE FUNCTION legacy_shadow.pg_advisory_xact_lock(bigint) RETURNS void LANGUAGE plpgsql AS $fn$ BEGIN RAISE EXCEPTION 'hostile search_path function executed'; END $fn$;
        CREATE FUNCTION legacy_shadow.hashtext(text) RETURNS integer LANGUAGE plpgsql AS $fn$ BEGIN RAISE EXCEPTION 'hostile search_path function executed'; END $fn$;
        CREATE FUNCTION legacy_shadow.hashtextextended(text,bigint) RETURNS bigint LANGUAGE plpgsql AS $fn$ BEGIN RAISE EXCEPTION 'hostile search_path function executed'; END $fn$;
        CREATE FUNCTION legacy_shadow.ceil(numeric) RETURNS numeric LANGUAGE plpgsql AS $fn$ BEGIN RAISE EXCEPTION 'hostile search_path function executed'; END $fn$;
        CREATE FUNCTION legacy_shadow.ceil(double precision) RETURNS double precision LANGUAGE plpgsql AS $fn$ BEGIN RAISE EXCEPTION 'hostile search_path function executed'; END $fn$;
        CREATE FUNCTION legacy_shadow.json_build_object(text,text,text,text) RETURNS json LANGUAGE plpgsql AS $fn$ BEGIN RAISE EXCEPTION 'hostile search_path function executed'; END $fn$;
        CREATE FUNCTION legacy_shadow.bad_count(bigint) RETURNS bigint LANGUAGE plpgsql AS $fn$ BEGIN RAISE EXCEPTION 'hostile search_path function executed'; END $fn$;
        CREATE AGGREGATE legacy_shadow.count(*) (SFUNC=legacy_shadow.bad_count, STYPE=bigint, INITCOND='0');
        CREATE FUNCTION legacy_shadow.bad_max(integer,integer) RETURNS integer LANGUAGE plpgsql AS $fn$ BEGIN RAISE EXCEPTION 'hostile search_path function executed'; END $fn$;
        CREATE AGGREGATE legacy_shadow.max(integer) (SFUNC=legacy_shadow.bad_max, STYPE=integer, INITCOND='0');
        REVOKE ALL ON ALL TABLES IN SCHEMA public FROM PUBLIC;
        REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM PUBLIC;
        REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC;
        GRANT USAGE ON SCHEMA public,drizzle,legacy_shadow TO ${q(roles.legacy)};
        GRANT USAGE ON SCHEMA legacy_shadow TO ${q(roles.runtime)},${q(roles.creator)};
        GRANT SELECT ON ALL TABLES IN SCHEMA public,drizzle TO ${q(roles.legacy)};
        GRANT USAGE ON SEQUENCE public.legacy_sequence TO ${q(roles.legacy)};
        GRANT EXECUTE ON FUNCTION public.legacy_lookup() TO ${q(roles.legacy)};
        GRANT SELECT ON public.legacy_records TO anon,authenticated;
        GRANT EXECUTE ON FUNCTION public.legacy_lookup() TO anon,authenticated;
        ALTER TABLE public.legacy_records ENABLE ROW LEVEL SECURITY;
        CREATE POLICY legacy_reader ON public.legacy_records FOR SELECT TO ${q(roles.legacy)} USING (true);
        CREATE POLICY legacy_api_reader ON public.legacy_records FOR SELECT TO anon,authenticated USING (true);
        ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO ${q(roles.legacy)};
        ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE ON SEQUENCES TO ${q(roles.legacy)};
        ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO ${q(roles.legacy)};
      `);
      // A newly-created local creator can change its own global function default
      // without weakening or rewriting any existing creator's default ACLs.
      await owner.query(`ALTER DEFAULT PRIVILEGES FOR ROLE ${q(roles.creator)} REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC`);
      const before = await legacySnapshot(owner);
      const creator = new pg.Pool({ connectionString: databaseUrl(name, roles.creator), max: 1, options: '-c search_path=legacy_shadow,public,pg_catalog' }); pools.push(creator);
      if (index === 1) {
        await owner.query('CREATE SCHEMA teach_v2_demo; CREATE TABLE teach_v2_demo.unrelated(id integer); INSERT INTO teach_v2_demo.unrelated VALUES (9)');
        await assert.rejects(applyIsolatedSchemaMigrations(creator), /not owned by the current migration role/);
        assert.deepEqual((await owner.query('SELECT * FROM teach_v2_demo.unrelated')).rows, [{ id: 9 }]);
        await owner.query('DROP SCHEMA teach_v2_demo CASCADE');
        await creator.query('CREATE SCHEMA teach_v2_demo; CREATE TABLE teach_v2_demo.unrelated(id integer); INSERT INTO teach_v2_demo.unrelated VALUES (9)');
        await assert.rejects(applyIsolatedSchemaMigrations(creator), /lacks a verified journal/);
        assert.deepEqual((await creator.query('SELECT * FROM teach_v2_demo.unrelated')).rows, [{ id: 9 }]);
        await creator.query('DROP SCHEMA teach_v2_demo CASCADE');
      }
      assert.deepEqual(await applyIsolatedSchemaMigrations(creator), { schema, applied: 7, total: 7 });
      assert.deepEqual(await legacySnapshot(owner), before, 'legacy inventory, ACL, RLS, defaults, sequences, journals or rows changed');
      const first = await isolatedSnapshot(owner);
      assert.deepEqual(await applyIsolatedSchemaMigrations(creator), { schema, applied: 0, total: 7 });
      assert.deepEqual(await isolatedSnapshot(owner), first, 'second application was not a no-op');
      assert.equal(first.relations.filter((row) => row.relkind === 'r').length, 23);
      assert.equal(first.functions.length, 39);
      assert.ok(first.relations.filter((row) => row.relkind === 'r').every((row) => row.relrowsecurity));
      assert.ok(first.functions.every((row) => !row.prosecdef), 'SECURITY DEFINER is not admitted');
      const fks = await owner.query(`SELECT childns.nspname AS child,parentns.nspname AS parent FROM pg_catalog.pg_constraint fk JOIN pg_catalog.pg_class child ON child.oid=fk.conrelid JOIN pg_catalog.pg_namespace childns ON childns.oid=child.relnamespace JOIN pg_catalog.pg_class parent ON parent.oid=fk.confrelid JOIN pg_catalog.pg_namespace parentns ON parentns.oid=parent.relnamespace WHERE fk.contype='f' AND childns.nspname='teach_v2_demo'`);
      assert.ok(fks.rows.length > 20 && fks.rows.every((row) => row.child === schema && row.parent === schema), 'cross-schema foreign key');
      const triggerFunctions = await owner.query(`SELECT fnns.nspname FROM pg_catalog.pg_trigger t JOIN pg_catalog.pg_class c ON c.oid=t.tgrelid JOIN pg_catalog.pg_namespace ns ON ns.oid=c.relnamespace JOIN pg_catalog.pg_proc p ON p.oid=t.tgfoid JOIN pg_catalog.pg_namespace fnns ON fnns.oid=p.pronamespace WHERE ns.nspname='teach_v2_demo' AND NOT t.tgisinternal`);
      assert.ok(triggerFunctions.rows.every((row) => row.nspname === schema), 'cross-schema trigger function');
      fingerprints.push(sha256(JSON.stringify(first)));
      if (index === 1) continue;

      // Local proof grants only: no runtime role or policy is part of the lineage.
      await creator.query(`GRANT USAGE ON SCHEMA teach_v2_demo TO ${q(roles.runtime)};
        GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA teach_v2_demo TO ${q(roles.runtime)};`);
      for (const table of manifest.tables) {
        await creator.query(`GRANT SELECT, INSERT, UPDATE ON teach_v2_demo.${q(table)} TO ${q(roles.runtime)};
          CREATE POLICY isolated_runtime_test ON teach_v2_demo.${q(table)} TO ${q(roles.runtime)} USING (true) WITH CHECK (true);`);
      }
      const runtimeConnection = databaseUrl(name, roles.runtime);
      const runtime = new pg.Pool({ connectionString: runtimeConnection, max: 2, options: '-c search_path=legacy_shadow,public,pg_catalog' }); pools.push(runtime);
      const browser = new pg.Pool({ connectionString: databaseUrl(name, roles.browser), max: 1 }); pools.push(browser);
      for (const role of ['anon', 'authenticated']) {
        const apiRole = new pg.Pool({ connectionString: databaseUrl(name), max: 1, options: `-c role=${role}` }); pools.push(apiRole);
        assert.equal((await apiRole.query('SELECT current_user AS role')).rows[0].role, role);
        assert.deepEqual((await apiRole.query('SELECT * FROM public.legacy_records')).rows, before.records, `${role} lost legacy Data API access`);
        assert.equal((await apiRole.query('SELECT public.legacy_lookup() AS value')).rows[0].value, 'legacy sentinel, not demo data');
        for (const sql of ['SELECT * FROM teach_v2_demo.identity_identities', "INSERT INTO teach_v2_demo.identity_identities(id) VALUES ('forbidden')", "SELECT teach_v2_demo.demo_valid_semver('1.0.0')", "SELECT pg_catalog.nextval('teach_v2_demo.__drizzle_migrations_id_seq')"]) { await deny(apiRole, sql); probes++; }
      }
      assert.equal((await runtime.query("SELECT teach_v2_demo.demo_valid_semver('1.1.0') AS valid")).rows[0].valid, true);
      assert.equal((await runtime.query("SELECT demo_valid_semver('1.1.0') AS valid")).rows[0].valid, false, 'hostile function fixture not reached');
      assert.equal((await runtime.query("SELECT teach_v2_demo.demo_json_string('\"text\"'::jsonb, 1, 20) AS valid")).rows[0].valid, true, 'built-in function shadowing affected guard');
      for (const sql of [
        'SELECT clock_timestamp()', 'SELECT pg_advisory_xact_lock(1,1)', 'SELECT pg_advisory_xact_lock(1::bigint)',
        "SELECT hashtext('x'::text)", "SELECT hashtextextended('x'::text,1::bigint)",
        'SELECT ceil(1.1::numeric)', 'SELECT ceil(1.1::double precision)',
        "SELECT json_build_object('a'::text,'b'::text,'c'::text,'d'::text)",
        'SELECT count(*) FROM (VALUES (1)) AS probe(id)', 'SELECT max(id) FROM (VALUES (1)) AS probe(id)',
      ]) { await assert.rejects(runtime.query(sql), /hostile search_path function executed/); shadowProbes++; }
      await runtime.query("INSERT INTO teach_v2_demo.identity_identities(id) VALUES ('isolated_probe_identity')");
      await assert.rejects(runtime.query("UPDATE teach_v2_demo.identity_identities SET id='changed' WHERE id='isolated_probe_identity'"), /immutable Identity/, 'qualified trigger did not execute');
      for (const sql of ['SELECT * FROM public.legacy_records', "INSERT INTO public.legacy_records VALUES (2, 'forbidden')", 'SELECT * FROM public.identity_identities', 'SELECT public.legacy_lookup()', "SELECT pg_catalog.nextval('public.legacy_sequence')", 'SELECT * FROM public.__drizzle_migrations', 'SELECT * FROM drizzle.__drizzle_migrations', 'SELECT * FROM teach_v2_demo.__drizzle_migrations', "SELECT pg_catalog.nextval('teach_v2_demo.__drizzle_migrations_id_seq')", 'CREATE TABLE teach_v2_demo.forbidden (id integer)', 'CREATE TABLE public.forbidden (id integer)']) { await deny(runtime, sql); probes++; }
      for (const sql of ['SELECT * FROM teach_v2_demo.identity_identities', "INSERT INTO teach_v2_demo.identity_identities(id) VALUES ('forbidden')", "SELECT teach_v2_demo.demo_valid_semver('1.0.0')", "SELECT pg_catalog.nextval('teach_v2_demo.__drizzle_migrations_id_seq')"]) { await deny(browser, sql); probes++; }
      await creator.query(`CREATE TABLE teach_v2_demo.future_table (id integer);
        CREATE SEQUENCE teach_v2_demo.future_sequence;
        CREATE FUNCTION teach_v2_demo.future_function() RETURNS integer LANGUAGE sql AS $fn$ SELECT 1 $fn$;`);
      // Effective privileges on new objects, not merely the presence of an ACL statement.
      for (const role of [roles.browser, roles.runtime, 'anon', 'authenticated']) {
        const privileges = (await owner.query(`SELECT pg_catalog.has_table_privilege($1,'teach_v2_demo.future_table','SELECT') AS tab, pg_catalog.has_sequence_privilege($1,'teach_v2_demo.future_sequence','USAGE') AS seq, pg_catalog.has_function_privilege($1,'teach_v2_demo.future_function()','EXECUTE') AS fn`, [role])).rows[0];
        assert.deepEqual(privileges, { tab: false, seq: false, fn: false }); probes += 3;
      }
      await creator.query('DROP FUNCTION teach_v2_demo.future_function(); DROP SEQUENCE teach_v2_demo.future_sequence; DROP TABLE teach_v2_demo.future_table;');
      if (exerciseRuntime) await exerciseRuntime({ pool: runtime, connectionString: runtimeConnection });
      assert.deepEqual(await legacySnapshot(owner), before, 'legacy state changed during runtime/probe exercise');
      const protectedState = await isolatedSnapshot(owner);
      await creator.query("UPDATE teach_v2_demo.__drizzle_migrations SET hash='tampered' WHERE id=1");
      await assert.rejects(applyIsolatedSchemaMigrations(creator), /isolated journal hash mismatch/);
      await creator.query('UPDATE teach_v2_demo.__drizzle_migrations SET hash=$1 WHERE id=1', [manifest.migrations[0].isolatedSha256]);
      assert.deepEqual(await isolatedSnapshot(owner), protectedState, 'journal drift rejection mutated schema');
    }
    assert.equal(fingerprints[0], fingerprints[1], 'independent clean replays differ');
    const result = { postgresMajor: 17, migrations: 7, applicationTables: 22, journalTables: 1, functions: 39, denialAndDefaultProbes: probes, hostileBuiltinProbes: shadowProbes, namedApiRolesTested: 2, legacyUnchanged: true, cleanReplayIdentical: true, runtimeExercised: Boolean(exerciseRuntime), schemaFingerprint: fingerprints[0] };
    console.log(`ISOLATED SCHEMA PROOF PASS: ${JSON.stringify(result)}`);
    return result;
  } finally {
    await Promise.all(pools.map((pool) => pool.end()));
    try {
      for (const name of createdDatabases) await dropReplayDatabase(admin, name);
      for (const role of createdRoles.reverse()) await admin.query(`DROP ROLE ${q(role)}`);
    } finally { await admin.end(); }
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await verifyIsolatedSchemaProof();
