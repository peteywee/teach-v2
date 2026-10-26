import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { createHash, randomUUID } from 'node:crypto';
import pg from 'pg';
import { assertIsolatedDatabaseTarget } from '../../../scripts/db/isolated-database-target.mjs';
import { applyIsolatedSchemaMigrations } from '../../../scripts/db/migrate-isolated-schema.mjs';
import { verifyIsolatedLineage } from '../../../scripts/db/compile-isolated-schema.mjs';
import { newDemoContent, newRecipeDemoContent } from '../../../src/modules/content/application/demo-template.js';
import { newStationDemoContent } from '../../../src/modules/content/application/demo-kitchen-template.js';
import { canonicalJson, type StationTeachingContent, type TeachingContent } from '../../../src/modules/content/domain/demo-content.js';

const connectionString = assertIsolatedDatabaseTarget(process.env.DATABASE_URL);
const pool = new pg.Pool({ connectionString });
const organizationId = randomUUID(), contentPackId = randomUUID();
let nextVersion = 0; let beforeBoundary: unknown; let legacyRows: unknown;
function kitchen(): StationTeachingContent {
  const value = newStationDemoContent(organizationId, randomUUID).content;
  if (value.schemaVersion !== '1.2.0') throw new Error('Expected kitchen');
  return { ...structuredClone(value), contentPackId, version: `3.0.${++nextVersion}` };
}
async function insert(value: TeachingContent) {
  const bytes = canonicalJson(value), digest = `sha256:${createHash('sha256').update(bytes).digest('hex')}`;
  await pool.query('INSERT INTO teach_v2_demo.content_pack_versions(content_pack_id,version,digest,canonical_json) VALUES($1,$2,$3,$4)', [contentPackId, value.version, digest, bytes]);
}
async function rejects(value: TeachingContent, label: string) {
  await assert.rejects(insert(value), (error: unknown) => {
    assert.equal((error as { code?: string }).code, '23514', label); return true;
  });
}
async function boundary() {
  return {
    tables: (await pool.query("SELECT c.oid,c.relname,c.relrowsecurity,c.relacl FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='teach_v2_demo' AND c.relkind='r' ORDER BY c.relname")).rows,
    constraints: (await pool.query("SELECT k.oid,c.relname,k.conname,pg_get_constraintdef(k.oid) definition FROM pg_constraint k JOIN pg_class c ON c.oid=k.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='teach_v2_demo' ORDER BY c.relname,k.conname")).rows,
    triggers: (await pool.query("SELECT t.oid,c.relname,t.tgname,t.tgenabled,pg_get_triggerdef(t.oid) definition FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='teach_v2_demo' ORDER BY c.relname,t.tgname")).rows,
    functions: (await pool.query("SELECT p.oid,p.proname,p.proacl,p.prosecdef FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='teach_v2_demo' ORDER BY p.oid")).rows,
  };
}

async function installVerifiedHistoricalPrefix() {
  const { manifest, files } = verifyIsolatedLineage();
  assert.equal(manifest.migrations.length, 8);
  const prefix = manifest.migrations.slice(0, 7);
  assert.equal(prefix.at(-1)!.name, '0006_demo_recipe_content_guard.sql');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const actual = (await client.query('SELECT pg_catalog.host(pg_catalog.inet_server_addr()) AS host, pg_catalog.current_database() AS database')).rows[0];
    assert.ok(['127.0.0.1', '::1'].includes(actual.host));
    assert.equal(actual.database, new URL(connectionString).pathname.slice(1));
    await client.query('CREATE SCHEMA "teach_v2_demo"');
    await client.query('CREATE TABLE "teach_v2_demo"."__drizzle_migrations" (id serial PRIMARY KEY, hash text NOT NULL, created_at bigint NOT NULL UNIQUE)');
    await client.query('REVOKE ALL ON SCHEMA "teach_v2_demo" FROM PUBLIC');
    for (const migration of prefix) {
      // Execute each genuine pinned historical migration before recording its
      // real applied hash/timestamp. Never substitute a fabricated journal.
      for (const statement of files.get(migration.name)!.split('--> statement-breakpoint')) {
        if (statement.trim()) await client.query(statement);
      }
      await client.query('INSERT INTO "teach_v2_demo"."__drizzle_migrations" (hash, created_at) VALUES ($1, $2)', [migration.isolatedSha256, migration.when]);
    }
    await client.query('COMMIT');
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
}

before(async () => {
  await installVerifiedHistoricalPrefix();
  assert.equal((await pool.query('SELECT count(*)::int n FROM teach_v2_demo.__drizzle_migrations')).rows[0].n, 7);
  await pool.query("INSERT INTO teach_v2_demo.organization_organizations(id,classification,created_at) VALUES($1,'DEMO_ONLY',clock_timestamp())", [organizationId]);
  await pool.query('INSERT INTO teach_v2_demo.content_packs(id,organization_id) VALUES($1,$2)', [contentPackId, organizationId]);
  for (const factory of [newDemoContent, newRecipeDemoContent]) {
    const value = { ...structuredClone(factory(organizationId, randomUUID).content), contentPackId, version: `3.0.${++nextVersion}` };
    // Keep the historically admitted 1.0.0 SQL behavior, even where its JS validator was stricter.
    if (value.schemaVersion === '1.0.0') value.title = 'Legacy https://example.invalid with <3> and control\u0001';
    await insert(value);
  }
  legacyRows = (await pool.query('SELECT * FROM teach_v2_demo.content_pack_versions ORDER BY version')).rows;
  await rejects(kitchen(), 'old guard rejects 1.2');
  beforeBoundary = await boundary();
  assert.deepEqual(await applyIsolatedSchemaMigrations(pool), { schema: 'teach_v2_demo', applied: 1, total: 8 });
  assert.deepEqual(await applyIsolatedSchemaMigrations(pool), { schema: 'teach_v2_demo', applied: 0, total: 8 });
});
after(async () => { await pool.end(); });

test('1.2 guard replaces only its body, preserving tables, grants, constraints, triggers, OID and legacy history', async () => {
  assert.equal((await pool.query('SELECT count(*)::int n FROM teach_v2_demo.__drizzle_migrations')).rows[0].n, 8);
  assert.deepEqual(await boundary(), beforeBoundary);
  assert.deepEqual((await pool.query('SELECT * FROM teach_v2_demo.content_pack_versions ORDER BY version')).rows, legacyRows);
  for (const factory of [newDemoContent, newRecipeDemoContent]) await insert({ ...factory(organizationId, randomUUID).content, contentPackId, version: `3.0.${++nextVersion}` });
  const permissiveLegacy = { ...newDemoContent(organizationId, randomUUID).content, contentPackId, version: `3.0.${++nextVersion}` };
  permissiveLegacy.title = 'Legacy https://example.invalid with <3> and control\u0001';
  await insert(permissiveLegacy);
  await insert(kitchen());
});

test('direct SQL rejects broken or ambiguous catalog references and incorrect shapes', async () => {
  const changes: Array<[string, (v: StationTeachingContent) => void]> = [
    ['unknown responsible person', v => { v.stations[0]!.responsiblePersonId = 'missing'; }],
    ['duplicate person', v => { v.people.push(v.people[0]!); }],
    ['duplicate station', v => { v.stations.push(v.stations[0]!); }],
    ['duplicate equipment', v => { v.equipment.push(v.equipment[0]!); }],
    ['duplicate recipe', v => { v.recipes.push(v.recipes[0]!); }],
    ['unknown station', v => { v.recipes[0]!.stationId = 'missing'; }],
    ['unknown inventory station', v => { v.inventory[0]!.stationId = 'missing'; }],
    ['unknown inventory equipment', v => { v.inventory[0]!.equipmentId = 'missing'; }],
    ['unknown required equipment', v => { v.recipes[0]!.requirements[0]!.equipmentId = 'missing'; }],
    ['duplicate requirement', v => { v.recipes[0]!.requirements.push(v.recipes[0]!.requirements[0]!); }],
    ['duplicate shared holding', v => { v.inventory.push(v.inventory.find(item => item.stationId === null)!); }],
    ['duplicate station holding', v => { v.inventory.push(v.inventory[0]!); }],
    ['zero quantity', v => { v.inventory[0]!.quantity = 0; }],
    ['excess quantity', v => { v.recipes[0]!.requirements[0]!.quantity = 101; }],
    ['empty recipes', v => { v.recipes = []; }],
    ['empty stations', v => { v.stations = []; }],
    ['empty equipment', v => { v.equipment = []; }],
    ['empty people', v => { v.people = []; }],
    ['empty inventory', v => { v.inventory = []; }],
    ['HTML label', v => { v.people[0]!.displayLabel = '<b>fictional</b>'; }],
    ['URL label', v => { v.equipment[0]!.label = 'https://example.invalid'; }],
    ['URL recipe', v => { v.recipes[0]!.steps[0] = 'data:text/html,unsafe'; }],
  ];
  for (const [label, change] of changes) { const value = kitchen(); change(value); await rejects(value, label); }
  for (const change of [
    (v: any) => { v.equipment[0].kind = null; }, (v: any) => { v.inventory[0].stationId = 3; },
    (v: any) => { v.people[0].identityId = 'real_identity'; }, (v: any) => { v.recipes[0].preparedByPersonId = 'person-casey'; },
    (v: any) => { v.inventory[0].available = true; }, (v: any) => { v.schemaVersion = '1.3.0'; },
  ]) { const value = kitchen(); change(value); await rejects(value, 'unknown field or invalid type'); }
});

test('sample holdings can differ from requirements, and historical rows stay immutable', async () => {
  const value = kitchen(); value.recipes[0]!.requirements[0]!.quantity = 2; await insert(value);
  await assert.rejects(pool.query("UPDATE teach_v2_demo.content_pack_versions SET version='9.0.0' WHERE content_pack_id=$1", [contentPackId]));
  await assert.rejects(pool.query('DELETE FROM teach_v2_demo.content_pack_versions WHERE content_pack_id=$1', [contentPackId]));
});
