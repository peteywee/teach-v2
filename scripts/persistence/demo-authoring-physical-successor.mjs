import { inspectSourceInScope } from '../verification/source-inspection-scope.mjs';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import { authoringHash as hash, authoringReader, exactAuthoringDirectory } from '../kernel/authoring-source-reader.mjs';
import { AUTHORING_BASELINE, AUTHORING_TABLES } from '../kernel/demo-authoring-registration.mjs';
import { inspectAuthoringEngineering } from '../verification/demo-authoring-engineering.mjs';
import { verifyIsolatedLineage } from '../db/compile-isolated-schema.mjs';

export const AUTHORING_PHYSICAL_BASE = 'persistence/physical-slices/demo-authoring';
export const AUTHORING_PUBLIC_MIGRATION = 'drizzle/0008_demo_manager_authoring.sql';
export const AUTHORING_ISOLATED_MIGRATION = 'drizzle-isolated/0008_demo_manager_authoring.sql';
const NAMES = Object.freeze(['0000_slice_p01_reconciliation', '0001_odd_photon', '0002_quick_venus', '0003_slice_p04_credential', '0004_slice_p05_learning_session', '0005_demo_runtime_owner_storage', '0006_demo_recipe_content_guard', '0007_demo_kitchen_content_guard']);
const PREFIX_PATHS = Object.freeze([...NAMES.map(name => `drizzle/${name}.sql`), ...NAMES.map((_, index) => `drizzle/meta/${String(index).padStart(4, '0')}_snapshot.json`), ...NAMES.map(name => `drizzle-isolated/${name}.sql`)]);
const PRIOR_JOURNAL_SHA256 = 'c7fe91cffd5a9ed952ef2183f671c67068632f865e2cd22f206d2ca8724e2a40';
export const AUTHORING_OWNER_STORAGE = Object.freeze([
  { owner: 'content', schema: 'demo-authoring-schema.ts', adapter: 'postgres-demo-authoring.ts', className: 'PostgresDemoAuthoring', port: 'AuthoringPort', table: 'content_authoring_drafts', readable: ['content_packs', 'content_pack_versions', 'content_authoring_drafts'] },
  { owner: 'transaction-control', schema: 'demo-authoring-receipt-schema.ts', adapter: 'postgres-demo-authoring-receipts.ts', className: 'PostgresDemoAuthoringReceipts', port: 'AuthoringReceiptPort', table: 'content_authoring_receipts', readable: ['content_authoring_receipts'] },
]);
export const AUTHORING_STORAGE_PATHS = Object.freeze(AUTHORING_OWNER_STORAGE.flatMap(row => [row.schema, row.adapter].map(file => `src/modules/${row.owner}/infrastructure/persistence/${file}`)));


/** Independently reviewed, finite additive storage admission. It does not run
 * SQL, change grants or authorize a production action. Older physical inspectors
 * may consume the exact predecessor only after this entire current proof passes. */
export function inspectAuthoringPhysicalSuccessor(root) { return inspectSourceInScope('authoringPhysical', root); }
// Internal finite dispatcher entry. Direct invocation establishes no shared scope.
export function inspectAuthoringPhysicalSuccessorUncached(root) {
  const empty = { present: false, admitted: false, errors: [], migrationCount: null, revisedPaths: [], addedPaths: [], predecessorFiles: {} };
  const errors = [], fail = message => errors.push(`demo authoring physical successor: ${message}`);
  const equal = (actual, expected, message) => { if (!isDeepStrictEqual(actual, expected)) fail(message); };
  const reader = authoringReader(root), raw = path => reader.read(path), json = path => JSON.parse(raw(path));
  try {
    if (!existsSync(join(root, AUTHORING_PHYSICAL_BASE))) {
      if ([AUTHORING_PUBLIC_MIGRATION, AUTHORING_ISOLATED_MIGRATION, 'drizzle/meta/0008_snapshot.json', 'verification/demo-authoring/engineering-manifest.json'].some(path => existsSync(join(root, path)))) fail('orphan authoring migration or engineering evidence without physical lane');
      return { ...empty, present: errors.length > 0, errors };
    }
    exactAuthoringDirectory(reader, AUTHORING_PHYSICAL_BASE, ['physical-successor.json', 'immutable-baseline.json', 'prior-journal.json']);
    // Engineering itself authenticates the raw registration; do not parse the
    // same source package twice inside this synchronous physical inspection.
    const engineering = inspectAuthoringEngineering(root);
    errors.push(...engineering.errors);
    if (!engineering.present) fail('exact source registration and genuine independent review required');
    if (errors.length) return { ...empty, present: true, errors };
    const envelope = json(`${AUTHORING_PHYSICAL_BASE}/physical-successor.json`), baseline = json(`${AUTHORING_PHYSICAL_BASE}/immutable-baseline.json`);
    equal(envelope.successor_id, 'TEACH-DEMO-AUTHORING-PHYSICAL-SUCCESSOR-2026-10-26', 'exact physical successor required');
    equal(envelope.baseline_commit, AUTHORING_BASELINE, 'exact released predecessor required');
    equal(baseline.baseline_commit, AUTHORING_BASELINE, 'exact immutable predecessor required');
    equal(envelope.prior_migration_count, 8, 'eight original migrations required');
    equal(envelope.current_migration_count, 9, 'one finite migration suffix required');
    equal(envelope.new_tables, [...AUTHORING_TABLES], 'only exact two private authoring representations allowed');
    equal(envelope.application_tables, 24, 'exact twenty-four application tables required');
    equal(envelope.new_roles, 0, 'no new database roles');
    equal(envelope.deleted_or_rewritten_historical_rows, 0, 'existing content and training history immutable');
    equal(envelope.content_schema_versions, ['1.0.0', '1.1.0', '1.2.0'], 'published content format unchanged');
    for (const flag of ['runtime_activation_authorized', 'shared_or_production_execution_authorized', 'deployment_authorized', 'credential_creation_authorized']) equal(envelope[flag], false, `source admission cannot grant ${flag}`);
    equal(Object.keys(baseline.files ?? {}).sort(), [...PREFIX_PATHS].sort(), 'exact immutable eight-migration prefix inventory required');
    for (const path of PREFIX_PATHS) equal(hash(raw(path)), baseline.files[path], `historical bytes changed: ${path}`);
    const priorBytes = raw(`${AUTHORING_PHYSICAL_BASE}/prior-journal.json`), prior = JSON.parse(priorBytes), journal = json('drizzle/meta/_journal.json');
    equal(hash(priorBytes), PRIOR_JOURNAL_SHA256, 'exact released eight-entry journal required');
    equal({ ...journal, entries: journal.entries?.slice(0, 8) }, prior, 'eight-entry journal prefix immutable');
    equal(journal.entries?.length, 9, 'one append only');
    equal(journal.entries?.[8], envelope.journal_entry, 'exact reviewed journal suffix required');
    equal([envelope.journal_entry?.idx, envelope.journal_entry?.version, envelope.journal_entry?.tag, envelope.journal_entry?.breakpoints], [8, '7', '0008_demo_manager_authoring', true], 'exact authoring journal identity required');
    if (!Number.isSafeInteger(envelope.journal_entry?.when) || envelope.journal_entry.when <= prior.entries.at(-1).when) fail('strictly later finite journal timestamp required');
    equal(json('drizzle-isolated/meta/_journal.json'), journal, 'public and isolated journals must match exactly');
    const names = [...NAMES.map(name => `${name}.sql`), '0008_demo_manager_authoring.sql'].sort();
    for (const dir of ['drizzle', 'drizzle-isolated']) equal(reader.inventory(dir).filter(entry => entry.name.endsWith('.sql')).map(entry => entry.name).sort(), names, 'no unregistered SQL suffix');
    equal(reader.inventory('drizzle/meta').filter(entry => entry.name.endsWith('_snapshot.json')).map(entry => entry.name).sort(), Array.from({ length: 9 }, (_, index) => `${String(index).padStart(4, '0')}_snapshot.json`), 'exact nine snapshots required');
    const oldSnapshot = json('drizzle/meta/0007_snapshot.json'), snapshot = json('drizzle/meta/0008_snapshot.json');
    equal(snapshot.prevId, oldSnapshot.id, 'snapshot links exact released predecessor');
    const newTables = Object.keys(snapshot.tables ?? {}).filter(table => !Object.hasOwn(oldSnapshot.tables, table)).sort();
    equal(newTables, AUTHORING_TABLES.map(table => `public.${table}`).sort(), 'only two new model tables admitted');
    const restoredTables = { ...snapshot.tables }; for (const table of newTables) delete restoredTables[table];
    equal({ ...snapshot, id: oldSnapshot.id, prevId: oldSnapshot.prevId, tables: restoredTables }, oldSnapshot, 'all previous model structures remain identical');
    if (!/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(snapshot.id) || snapshot.id === '00000000-0000-0000-0000-000000000000' || NAMES.some((_, index) => json(`drizzle/meta/${String(index).padStart(4, '0')}_snapshot.json`).id === snapshot.id)) fail('unique nonzero snapshot ID required');
    for (const path of [AUTHORING_PUBLIC_MIGRATION, AUTHORING_ISOLATED_MIGRATION]) equal(hash(raw(path)), envelope.migration_sha256?.[path], `reviewed migration differs: ${path}`);
    const publicSql = raw(AUTHORING_PUBLIC_MIGRATION);
    equal([...publicSql.matchAll(/CREATE TABLE "([a-z_]+)"/g)].map(match => match[1]).sort(), [...AUTHORING_TABLES].sort(), 'exact two CREATE TABLE statements required');
    if (/\bSECURITY\s+DEFINER\b|\bCREATE\s+(?:ROLE|DATABASE|SCHEMA)\b|\b(?:DROP|TRUNCATE)\b/i.test(publicSql.replace(/--[^\n]*/g, '').replace(/'(?:[^']|'')*'/g, "''"))) fail('role/schema/destructive/definer expansion forbidden');
    for (const row of AUTHORING_OWNER_STORAGE) {
      const base = `src/modules/${row.owner}/infrastructure/persistence/`;
      const schema = raw(base + row.schema), adapter = raw(base + row.adapter);
      equal([...schema.matchAll(/\bpgTable\s*\(\s*['"]([^'"]+)['"]/g)].map(match => match[1]), [row.table], `exact owner schema required: ${row.owner}`);
      equal([...adapter.matchAll(/\bexport\s+class\s+(Postgres\w+)\s+implements\s+(\w+)/g)].map(match => [match[1], match[2]]), [[row.className, row.port]], `Application-owned port required: ${row.owner}`);
      for (const match of adapter.matchAll(/databaseObject\(['"]([a-z_]+)['"]\)/g)) if (!row.readable.includes(match[1])) fail(`owner adapter cannot access foreign table ${match[1]}`);
      if (/\b(?:TRUNCATE|DELETE)\b/.test(adapter)) fail('authoring adapter cannot delete persisted history');
    }
    const composition = raw('src/bootstrap/demo/demo-persistence-schema.ts');
    for (const row of AUTHORING_OWNER_STORAGE) if (!composition.includes(`../../modules/${row.owner}/infrastructure/persistence/${row.schema.replace(/\.ts$/, '.js')}`)) fail('new schemas must be included through owner-reference composition');
    const lineage = verifyIsolatedLineage(root); // Pure compiler; never calls predecessor gates or a database.
    equal(lineage.manifest.migrations.length, 9, 'exact ninth isolated migration required');
    equal(lineage.manifest.tables.length, 24, 'exact isolated table count required');
    equal(lineage.manifest.functions, envelope.functions, 'exact reviewed isolated function inventory required');
    equal(lineage.manifest.migrations[8], { name: '0008_demo_manager_authoring.sql', historicalSha256: hash(raw(AUTHORING_PUBLIC_MIGRATION)), isolatedSha256: hash(raw(AUTHORING_ISOLATED_MIGRATION)), when: envelope.journal_entry.when }, 'exact compiled suffix binding required');
    const admitted = errors.length === 0;
    return { ...empty, present: true, admitted, errors, migrationCount: admitted ? 9 : null, revisedPaths: admitted ? ['drizzle/meta/_journal.json', 'drizzle-isolated/meta/_journal.json', 'drizzle-isolated/manifest.json'] : [], addedPaths: admitted ? [AUTHORING_PUBLIC_MIGRATION, AUTHORING_ISOLATED_MIGRATION, 'drizzle/meta/0008_snapshot.json'] : [], predecessorFiles: admitted ? { ...engineering.predecessorFiles } : {} };
  } catch (error) { fail(`missing or malformed physical evidence: ${error.message}`); return { ...empty, present: true, errors }; }
}
