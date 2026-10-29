import assert from 'node:assert/strict';
import test, { after } from 'node:test';
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildIsolatedLineage as buildCurrentLineage, HISTORICAL_PINS, qualifySql, REPOSITORY_ROOT as CURRENT_ROOT, tokenizeSql, verifyIsolatedLineage as verifyCurrentLineage } from '../db/compile-isolated-schema.mjs';
import { applyIsolatedSchemaMigrations } from '../db/migrate-isolated-schema.mjs';
import { createAuthoringPredecessorCopy } from './authoring-proof-copy.mjs';

// Preserve all five original cases and their exact eight/22/39 assertions.
// Current successor coverage lives in a distinct mandatory authoring suite.
const predecessor = createAuthoringPredecessorCopy(CURRENT_ROOT);
after(predecessor.remove);
const REPOSITORY_ROOT = predecessor.root;
const buildIsolatedLineage = (root = REPOSITORY_ROOT) => buildCurrentLineage(root);
const verifyIsolatedLineage = (root = REPOSITORY_ROOT) => verifyCurrentLineage(root);

test('committed isolated lineage is deterministic and historical migrations are pinned', () => {
  const first = verifyIsolatedLineage(), second = buildIsolatedLineage();
  assert.deepEqual(first, second);
  assert.equal(first.manifest.schema, 'teach_v2_demo');
  assert.equal(first.manifest.journal, 'teach_v2_demo.__drizzle_migrations');
  assert.equal(first.manifest.tables.length, 22);
  assert.equal(first.manifest.functions.length, 39);
  assert.equal(first.manifest.migrations.length, 8);
  for (const [name, bytes] of first.files) {
    if (!name.endsWith('.sql')) continue;
    assert.doesNotMatch(bytes, /IN SCHEMA public|ALTER TABLE public\.|schemaname='public'|nspname='public'/);
    assert.doesNotMatch(bytes, /EXECUTE format\(/);
    assert.doesNotMatch(bytes, /SET (?:LOCAL )?search_path/i);
    assert.doesNotMatch(bytes, /CREATE (?:ROLE|POLICY)|GRANT /);
  }
});

test('token qualification preserves comments and string payloads, visits function bodies and %ROWTYPE', () => {
  const input = `-- content_packs public.content_packs\nSELECT 'content_packs', "content_packs".id FROM "public"."content_packs";\nCREATE FUNCTION demo_valid_semver(value text) RETURNS boolean LANGUAGE plpgsql AS $body$ DECLARE row content_packs%ROWTYPE; BEGIN PERFORM demo_valid_semver('content_packs'); RETURN true; END $body$;`;
  const result = qualifySql(input, new Set(['content_packs', 'demo_valid_semver']));
  assert.match(result, /-- content_packs public.content_packs/);
  assert.match(result, /SELECT 'content_packs', "teach_v2_demo"\."content_packs"\.id FROM "teach_v2_demo"\."content_packs"/);
  assert.match(result, /row "teach_v2_demo"\."content_packs"%ROWTYPE/);
  assert.match(result, /PERFORM "teach_v2_demo"\."demo_valid_semver"\('content_packs'\)/);
  assert.equal(tokenizeSql("/* ' /* inner */ ' */ SELECT 'it''s';")[0].kind, 'comment');
  assert.throws(() => qualifySql('SELECT * FROM public.unreviewed', new Set()), /unreviewed public/);
  assert.throws(() => qualifySql('SELECT * FROM unrelated.content_packs', new Set(['content_packs'])), /unexpected qualified/);
});

test('all known app references are explicitly qualified, including nested function bodies', () => {
  const { files, manifest } = verifyIsolatedLineage();
  const known = new Set([...manifest.tables, ...manifest.functions]);
  function inspect(sql) {
    const tokens = tokenizeSql(sql).filter((token) => !['space', 'comment'].includes(token.kind));
    for (const [index, token] of tokens.entries()) {
      if (token.kind === 'body') inspect(token.body);
      if (token.kind === 'identifier' && known.has(token.value)) {
        assert.equal(tokens[index - 1]?.text, '.', `${token.value} is unqualified`);
        assert.equal(tokens[index - 2]?.value, 'teach_v2_demo');
      }
    }
  }
  for (const [name, bytes] of files) if (name.endsWith('.sql')) inspect(bytes);
});

test('compiler rejects historical drift and verifier rejects generated drift or extra SQL', () => {
  const root = mkdtempSync(join(tmpdir(), 'teach-isolated-lineage-'));
  try {
    cpSync(join(REPOSITORY_ROOT, 'drizzle'), join(root, 'drizzle'), { recursive: true });
    cpSync(join(REPOSITORY_ROOT, 'drizzle-isolated'), join(root, 'drizzle-isolated'), { recursive: true });
    cpSync(join(REPOSITORY_ROOT, 'persistence/physical-slices/demo-kitchen'), join(root, 'persistence/physical-slices/demo-kitchen'), { recursive: true });
    const name = Object.keys(HISTORICAL_PINS)[0], historical = join(root, 'drizzle', name), generated = join(root, 'drizzle-isolated', name);
    const original = readFileSync(historical, 'utf8');
    writeFileSync(historical, original + '\n');
    assert.throws(() => buildIsolatedLineage(root), /historical migration drift/);
    writeFileSync(historical, original);
    const historicalSuffix = join(root, 'drizzle/0007_unreviewed.sql');
    writeFileSync(historicalSuffix, 'SELECT 1;');
    assert.throws(() => buildIsolatedLineage(root), /unreviewed historical SQL suffix/);
    rmSync(historicalSuffix);
    const journal = join(root, 'drizzle/meta/_journal.json'), journalBytes = readFileSync(journal, 'utf8');
    writeFileSync(journal, journalBytes + '\n');
    assert.throws(() => buildIsolatedLineage(root), /historical journal drift/);
    writeFileSync(journal, journalBytes);
    writeFileSync(generated, readFileSync(generated, 'utf8') + '\n');
    assert.throws(() => verifyIsolatedLineage(root), /isolated lineage drift/);
    writeFileSync(generated, buildIsolatedLineage(root).files.get(name));
    writeFileSync(join(root, 'drizzle-isolated/9999_unreviewed.sql'), 'SELECT 1;');
    assert.throws(() => verifyIsolatedLineage(root), /unregistered isolated SQL/);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('migration runner rejects missing opt-in and remote/ambiguous targets before connection', async () => {
  let connected = false;
  const connect = async () => { connected = true; throw new Error('must not connect'); };
  for (const target of ['postgresql://user@remote.example/teach_v2_demo', 'postgresql://user@localhost/teach_v2_live', 'postgresql://user@localhost/teach_v2_demo?host=remote.example']) {
    await assert.rejects(applyIsolatedSchemaMigrations({ options: { connectionString: target }, connect }, { TEACH_ISOLATED_DB: '1' }), /Database execution BLOCKED/);
  }
  await assert.rejects(applyIsolatedSchemaMigrations({ options: { connectionString: 'postgresql://user@localhost/teach_v2_demo' }, connect }, {}), /TEACH_ISOLATED_DB=1/);
  for (const overrides of [{ host: 'remote.example' }, { database: 'production' }, { port: 5000 }, { user: 'different' }, { stream: {} }]) {
    await assert.rejects(applyIsolatedSchemaMigrations({ options: { connectionString: 'postgresql://user@localhost/teach_v2_demo', ...overrides }, connect }, { TEACH_ISOLATED_DB: '1' }), /Database execution BLOCKED/);
  }
  assert.equal(connected, false);
});
