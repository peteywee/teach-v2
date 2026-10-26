import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

// This is a closed, reviewed compiler for these exact historical bytes, not a
// general SQL rewriter and never a runtime search/replace migration mechanism.
export const ISOLATED_SCHEMA = 'teach_v2_demo';
export const REPOSITORY_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
export const HISTORICAL_PINS = Object.freeze({
  '0000_slice_p01_reconciliation.sql': 'c372f6ed790e8adb38a2e1b3102f11c4addd284acd274e1da3add4d23ef64c2c',
  '0001_odd_photon.sql': 'e151cdc4b7c1a040aac0bd4769b4033dd130cb0b5eb0835ccde95729cea26994',
  '0002_quick_venus.sql': '76f4f620023d2310d5147b8764bc9f275cbff4d4faf4c8c4975bbeb0dc6a65e2',
  '0003_slice_p04_credential.sql': '3396caa659e905d87ab8a3f92759e7d5bda72eecae27d275fd12cd8e4d284fef',
  '0004_slice_p05_learning_session.sql': 'dda0c34f193797f0ad9a3fb5916500ff1038da0cf7701d63a4d8e6b193cca0b4',
  '0005_demo_runtime_owner_storage.sql': '441c579790de90a71c904a6a49e8b22b3bfb5b72bd3bf4171a5b1d062f1d6775',
  '0006_demo_recipe_content_guard.sql': 'f8c240898131aca26fcaa4a7cb5d11cb84412358901c20f626667de8ee12851f',
  '0007_demo_kitchen_content_guard.sql': '9fb45f65daebf30479de6cc08d62ee0884a210ca74b9ad377a7bb34c33645655',
});
const JOURNAL_PIN = '82d436f093d623ac3b90785073f7226e7ed2994283754a39084bfdea2aec33e0';
const KITCHEN_JOURNAL_PIN = 'c7fe91cffd5a9ed952ef2183f671c67068632f865e2cd22f206d2ca8724e2a40';
const BREAKPOINT = '\n--> statement-breakpoint\n';
const RETAINED_TABLES = ['organization_organizations', 'organization_locations', 'organization_membership_grants', 'organization_reporting_relationships', 'identity_demo_personas', 'content_packs', 'content_pack_versions', 'learning_assignments', 'learning_progress_events', 'audit_events', 'lifecycle_events', 'transaction_command_receipts'];
const CATALOG_FUNCTIONS = new Set(['now', 'length', 'btrim', 'octet_length', 'isfinite', 'encode', 'sha256', 'convert_to', 'family', 'masklen', 'pg_advisory_xact_lock', 'clock_timestamp', 'count', 'lower', 'jsonb_typeof', 'jsonb_array_length', 'jsonb_build_object', 'hashtextextended', 'date_bin', 'pg_current_xact_id', 'string_agg', 'to_jsonb', 'jsonb_each', 'jsonb_array_elements', 'array_append', 'chr']);
export const sha256 = (value) => createHash('sha256').update(value).digest('hex');
const q = (value) => '"' + value.replaceAll('"', '""') + '"';
const qualified = (value) => `${q(ISOLATED_SCHEMA)}.${q(value)}`;

// Retain literal/comment tokens verbatim. Dollar bodies are separately lexed as
// SQL/PLpgSQL, so table references, %ROWTYPEs and recursive calls are qualified.
export function tokenizeSql(sql) {
  const tokens = [];
  let offset = 0;
  while (offset < sql.length) {
    const rest = sql.slice(offset);
    const push = (kind, text, extra = {}) => { tokens.push({ kind, text, ...extra }); offset += text.length; };
    let match;
    if ((match = /^\s+/.exec(rest))) { push('space', match[0]); continue; }
    if (rest.startsWith('--')) { const end = rest.indexOf('\n'); push('comment', end < 0 ? rest : rest.slice(0, end)); continue; }
    if (rest.startsWith('/*')) {
      let depth = 1, end = 2;
      while (end < rest.length && depth) {
        if (rest.slice(end, end + 2) === '/*') { depth++; end += 2; }
        else if (rest.slice(end, end + 2) === '*/') { depth--; end += 2; }
        else end++;
      }
      assert.equal(depth, 0, 'unterminated SQL comment'); push('comment', rest.slice(0, end)); continue;
    }
    if ((match = /^\$(?:[A-Za-z_][A-Za-z_0-9]*)?\$/.exec(rest))) {
      const tag = match[0], end = rest.indexOf(tag, tag.length);
      assert.ok(end >= 0, 'unterminated dollar body');
      push('body', rest.slice(0, end + tag.length), { tag, body: rest.slice(tag.length, end) }); continue;
    }
    if (rest[0] === "'" || rest[0] === '"') {
      const quote = rest[0]; let end = 1, closed = false;
      while (end < rest.length) {
        if (rest[end] === quote) {
          if (rest[end + 1] === quote) { end += 2; continue; }
          end++; closed = true; break;
        }
        end++;
      }
      assert.ok(closed, 'unterminated quoted SQL token');
      const text = rest.slice(0, end);
      push(quote === '"' ? 'identifier' : 'literal', text, quote === '"' ? { value: text.slice(1, -1).replaceAll('""', '"') } : {}); continue;
    }
    if ((match = /^[A-Za-z_][A-Za-z_0-9$]*/.exec(rest))) { push('identifier', match[0], { value: match[0].toLowerCase() }); continue; }
    push('symbol', rest[0]);
  }
  return tokens;
}

export function qualifySql(sql, objectNames) {
  const tokens = tokenizeSql(sql);
  const meaningful = (index, direction) => {
    for (let i = index + direction; i >= 0 && i < tokens.length; i += direction) {
      if (!['comment', 'space'].includes(tokens[i].kind)) return i;
    }
    return -1;
  };
  return tokens.map((token, index) => {
    if (token.kind === 'body') return token.tag + qualifySql(token.body, objectNames) + token.tag;
    if (token.kind !== 'identifier') return token.text;
    const previous = meaningful(index, -1), next = meaningful(index, 1);
    if (token.value === 'public' && tokens[next]?.text === '.') {
      const target = tokens[meaningful(next, 1)];
      assert.ok(objectNames.has(target?.value), 'unreviewed public schema reference');
      return q(ISOLATED_SCHEMA);
    }
    if (objectNames.has(token.value)) {
      if (tokens[previous]?.text === '.') {
        const schema = tokens[meaningful(previous, -1)];
        assert.ok(['public', ISOLATED_SCHEMA].includes(schema?.value), 'unexpected qualified object reference');
        return q(token.value);
      }
      return qualified(token.value);
    }
    if (CATALOG_FUNCTIONS.has(token.value) && tokens[next]?.text === '(' && tokens[previous]?.text !== '.') return `pg_catalog.${token.value}`;
    if (token.value === 'C' && tokens[previous]?.value === 'collate') return 'pg_catalog."C"';
    return token.text;
  }).join('');
}

function securityStatements(tables) {
  const parts = [
    '-- Backend-only isolated namespace. No browser policies, runtime roles or grants are created.',
    `REVOKE ALL ON SCHEMA ${q(ISOLATED_SCHEMA)} FROM PUBLIC;`,
    ...[...tables, '__drizzle_migrations'].map((table) => `ALTER TABLE ${qualified(table)} ENABLE ROW LEVEL SECURITY;`),
    `REVOKE ALL ON ALL TABLES IN SCHEMA ${q(ISOLATED_SCHEMA)} FROM PUBLIC;`,
    `REVOKE ALL ON ALL SEQUENCES IN SCHEMA ${q(ISOLATED_SCHEMA)} FROM PUBLIC;`,
    `REVOKE ALL ON ALL FUNCTIONS IN SCHEMA ${q(ISOLATED_SCHEMA)} FROM PUBLIC;`,
    // Schema-local defaults cannot override a creator's global default EXECUTE.
    // Explicit function revocation above and denied schema USAGE are decisive.
    `ALTER DEFAULT PRIVILEGES IN SCHEMA ${q(ISOLATED_SCHEMA)} REVOKE ALL ON TABLES FROM PUBLIC;`,
    `ALTER DEFAULT PRIVILEGES IN SCHEMA ${q(ISOLATED_SCHEMA)} REVOKE ALL ON SEQUENCES FROM PUBLIC;`,
    `ALTER DEFAULT PRIVILEGES IN SCHEMA ${q(ISOLATED_SCHEMA)} REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;`,
  ];
  for (const role of ['anon', 'authenticated']) {
    parts.push(`DO $isolated_acl$ BEGIN
 IF EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname='${role}') THEN
  REVOKE ALL ON SCHEMA ${q(ISOLATED_SCHEMA)} FROM ${q(role)};
  REVOKE ALL ON ALL TABLES IN SCHEMA ${q(ISOLATED_SCHEMA)} FROM ${q(role)};
  REVOKE ALL ON ALL SEQUENCES IN SCHEMA ${q(ISOLATED_SCHEMA)} FROM ${q(role)};
  REVOKE ALL ON ALL FUNCTIONS IN SCHEMA ${q(ISOLATED_SCHEMA)} FROM ${q(role)};
  ALTER DEFAULT PRIVILEGES IN SCHEMA ${q(ISOLATED_SCHEMA)} REVOKE ALL ON TABLES FROM ${q(role)};
  ALTER DEFAULT PRIVILEGES IN SCHEMA ${q(ISOLATED_SCHEMA)} REVOKE ALL ON SEQUENCES FROM ${q(role)};
  ALTER DEFAULT PRIVILEGES IN SCHEMA ${q(ISOLATED_SCHEMA)} REVOKE EXECUTE ON FUNCTIONS FROM ${q(role)};
 END IF;
END $isolated_acl$;`);
  }
  return parts.join(BREAKPOINT) + '\n';
}

export function buildIsolatedLineage(root = REPOSITORY_ROOT) {
  assert.deepEqual(readdirSync(resolve(root, 'drizzle')).filter((name) => name.endsWith('.sql')).sort(), Object.keys(HISTORICAL_PINS).sort(), 'unreviewed historical SQL suffix');
  const sources = Object.entries(HISTORICAL_PINS).map(([name, hash]) => {
    const sql = readFileSync(resolve(root, 'drizzle', name), 'utf8');
    assert.equal(sha256(sql), hash, `historical migration drift: ${name}`);
    return { name, hash, sql };
  });
  const journalBytes = readFileSync(resolve(root, 'drizzle/meta/_journal.json'), 'utf8');
  assert.equal(sha256(journalBytes), KITCHEN_JOURNAL_PIN, 'historical journal drift');
  const priorBytes = readFileSync(resolve(root, 'persistence/physical-slices/demo-kitchen/prior-journal.json'), 'utf8');
  assert.equal(sha256(priorBytes), JOURNAL_PIN, 'preserved seven-migration journal drift');
  assert.deepEqual({ ...JSON.parse(journalBytes), entries: JSON.parse(journalBytes).entries.slice(0, 7) }, JSON.parse(priorBytes), 'historical journal prefix drift');
  const journal = JSON.parse(journalBytes);
  const combined = sources.map(({ sql }) => sql).join('\n');
  const tables = [...new Set([...combined.matchAll(/CREATE TABLE "?([a-z_]+)"?/g)].map((match) => match[1]))].sort();
  const functions = [...new Set([...combined.matchAll(/CREATE (?:OR REPLACE )?FUNCTION "?([a-z_]+)"?/g)].map((match) => match[1]))].sort();
  assert.equal(tables.length, 22); assert.equal(functions.length, 39);
  const objectNames = new Set([...tables, ...functions]);
  const files = new Map();
  for (const source of sources) {
    let sql = source.sql;
    if (source.name.startsWith('0005_')) {
      const start = sql.indexOf('DO $$\nDECLARE tab text;\nBEGIN\n FOREACH tab');
      const end = sql.indexOf('\nEND $$;', start) + '\nEND $$;'.length;
      assert.ok(start > 0 && end > start, 'reviewed immutable trigger loop missing');
      const explicit = RETAINED_TABLES.map((table) => `CREATE TRIGGER ${q(table + '_immutable')} BEFORE UPDATE OR DELETE ON ${table} FOR EACH ROW EXECUTE FUNCTION demo_reject_history_change();`).join(BREAKPOINT);
      sql = sql.slice(0, start) + explicit + sql.slice(end);
      const securityOffset = sql.indexOf('-- Backend-only local schema posture.');
      assert.ok(securityOffset > 0, 'reviewed public security sweep missing');
      sql = sql.slice(0, securityOffset);
    }
    sql = qualifySql(sql, objectNames);
    const assertStatic = (text) => {
      const tokens = tokenizeSql(text).filter((token) => !['comment', 'space'].includes(token.kind));
      for (const [index, token] of tokens.entries()) {
        if (token.kind === 'body') assertStatic(token.body);
        if (token.kind === 'identifier' && token.value === 'execute') assert.equal(tokens[index + 1]?.value, 'function', 'dynamic SQL is not admitted');
      }
    };
    assertStatic(sql);
    const prefix = `-- ISOLATED LINEAGE v1; generated by scripts/db/compile-isolated-schema.mjs.\n-- Historical source: drizzle/${source.name}; sha256:${source.hash}\n-- Do not edit generated SQL. Historical public migrations are never executed here.\n`;
    if (source.name.startsWith('0005_')) sql += securityStatements(tables);
    files.set(source.name, prefix + sql);
  }
  files.set('meta/_journal.json', JSON.stringify(journal, null, 2) + '\n');
  const manifest = { version: 1, schema: ISOLATED_SCHEMA, journal: `${ISOLATED_SCHEMA}.__drizzle_migrations`, historicalJournalSha256: KITCHEN_JOURNAL_PIN, tables, functions, migrations: sources.map(({ name, hash }, idx) => ({ name, historicalSha256: hash, isolatedSha256: sha256(files.get(name)), when: journal.entries[idx].when })) };
  files.set('manifest.json', JSON.stringify(manifest, null, 2) + '\n');
  return { files, manifest };
}

export function verifyIsolatedLineage(root = REPOSITORY_ROOT) {
  const lineage = buildIsolatedLineage(root);
  for (const [name, bytes] of lineage.files) assert.equal(readFileSync(resolve(root, 'drizzle-isolated', name), 'utf8'), bytes, `isolated lineage drift: ${name}`);
  assert.deepEqual(readdirSync(resolve(root, 'drizzle-isolated')).filter((name) => name.endsWith('.sql')).sort(), Object.keys(HISTORICAL_PINS).sort(), 'unregistered isolated SQL');
  return lineage;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  assert.ok(process.argv.length === 2 || (process.argv.length === 3 && process.argv[2] === '--write'), 'only --write is supported');
  if (process.argv[2] === '--write') {
    for (const [name, bytes] of buildIsolatedLineage().files) {
      const path = resolve(REPOSITORY_ROOT, 'drizzle-isolated', name);
      mkdirSync(dirname(path), { recursive: true }); writeFileSync(path, bytes);
    }
  }
  const { manifest } = verifyIsolatedLineage();
  console.log(`ISOLATED LINEAGE PASS: ${manifest.migrations.length} pinned migrations; ${manifest.tables.length} tables; ${manifest.functions.length} functions; ${manifest.journal}`);
}
