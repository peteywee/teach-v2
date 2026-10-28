import assert from 'node:assert/strict';
import test from 'node:test';
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { AUTHORING_FUNCTION_SIGNATURES, AUTHORING_MIGRATION, AUTHORING_TABLES, buildIsolatedLineage, HISTORICAL_PINS, REPOSITORY_ROOT as root, tokenizeSql, verifyIsolatedLineage } from '../db/compile-isolated-schema.mjs';
import { inspectAuthoringPhysicalSuccessor } from '../persistence/demo-authoring-physical-successor.mjs';

const physical = inspectAuthoringPhysicalSuccessor(root);
assert.deepEqual(physical.errors, []); assert.equal(physical.admitted, true, 'entire reviewed current source must authenticate before lineage tests');

function fixture(work) {
  const dir = mkdtempSync(join(tmpdir(), 'teach-authoring-lineage-'));
  try {
    for (const path of ['drizzle', 'drizzle-isolated', 'persistence/physical-slices/demo-kitchen', 'persistence/physical-slices/demo-authoring']) cpSync(join(root, path), join(dir, path), { recursive: true });
    return work(dir);
  } finally { rmSync(dir, { recursive: true, force: true }); }
}

test('current authoring lineage is deterministic with exactly nine migrations and two additional tables', () => {
  const first = verifyIsolatedLineage(), second = buildIsolatedLineage();
  assert.deepEqual(first, second);
  assert.equal(first.manifest.migrations.length, 9); assert.equal(first.manifest.tables.length, 24); assert.equal(first.manifest.functions.length, 43);
  assert.equal(first.manifest.migrations[8].name, AUTHORING_MIGRATION);
  assert.deepEqual(first.manifest.tables.filter(table => table.startsWith('content_authoring_')), [...AUTHORING_TABLES]);
  assert.deepEqual(first.manifest.migrations.slice(0, 8).map(row => row.name), Object.keys(HISTORICAL_PINS));
});

test('current successor preserves every isolated historical byte and emits new security only in its suffix', () => {
  const { files } = verifyIsolatedLineage();
  for (const name of Object.keys(HISTORICAL_PINS)) {
    assert.equal(files.get(name), readFileSync(join(root, 'drizzle-isolated', name), 'utf8'));
    assert.doesNotMatch(files.get(name), /content_authoring_(?:drafts|receipts)/);
  }
  const suffix = files.get(AUTHORING_MIGRATION);
  for (const table of AUTHORING_TABLES) {
    assert.ok(suffix.includes(`ALTER TABLE "teach_v2_demo"."${table}" ENABLE ROW LEVEL SECURITY;`));
    for (const role of ['PUBLIC', '"anon"', '"authenticated"']) assert.ok(suffix.includes(`REVOKE ALL ON TABLE "teach_v2_demo"."${table}" FROM ${role};`));
  }
  for (const [name, args] of Object.entries(AUTHORING_FUNCTION_SIGNATURES)) {
    for (const role of ['PUBLIC', '"anon"', '"authenticated"']) assert.ok(suffix.includes(`REVOKE ALL ON FUNCTION "teach_v2_demo"."${name}"(${args}) FROM ${role};`));
  }
  assert.doesNotMatch(suffix, /\b(?:GRANT|CREATE\s+(?:ROLE|POLICY)|SECURITY\s+DEFINER)\b/);
  assert.doesNotMatch(suffix, /REVOKE ALL ON ALL|ALTER DEFAULT PRIVILEGES/);
});

test('every current table and function reference is explicitly isolated even inside authoring guard bodies', () => {
  const { files, manifest } = verifyIsolatedLineage(), known = new Set([...manifest.tables, ...manifest.functions]);
  function inspect(sql) {
    const tokens = tokenizeSql(sql).filter(token => !['space', 'comment'].includes(token.kind));
    for (const [index, token] of tokens.entries()) {
      if (token.kind === 'body') inspect(token.body);
      if (token.kind === 'identifier' && known.has(token.value)) {
        assert.equal(tokens[index - 1]?.text, '.', `${token.value} is unqualified`);
        assert.equal(tokens[index - 2]?.value, 'teach_v2_demo');
      }
    }
  }
  for (const [name, sql] of files) if (name.endsWith('.sql')) inspect(sql);
});

test('current compiler rejects changed ninth SQL, journal bytes and historical prefix without reusing a cached verdict', () => fixture(dir => {
  verifyIsolatedLineage(dir);
  for (const path of [`drizzle/${AUTHORING_MIGRATION}`, 'drizzle/meta/_journal.json', 'persistence/physical-slices/demo-authoring/prior-journal.json', `drizzle/${Object.keys(HISTORICAL_PINS)[5]}`]) {
    const full = join(dir, path), original = readFileSync(full, 'utf8');
    try { writeFileSync(full, original + '\n'); assert.throws(() => buildIsolatedLineage(dir), /drift/); }
    finally { writeFileSync(full, original); }
    verifyIsolatedLineage(dir);
  }
}));

test('current verifier denies rewritten compiled ninth migration and an unregistered tenth migration', () => fixture(dir => {
  const path = join(dir, 'drizzle-isolated', AUTHORING_MIGRATION), original = readFileSync(path, 'utf8');
  try { writeFileSync(path, original + '\n'); assert.throws(() => verifyIsolatedLineage(dir), /isolated lineage drift/); }
  finally { writeFileSync(path, original); }
  const publicPath = join(dir, 'drizzle', AUTHORING_MIGRATION), publicBytes = readFileSync(publicPath, 'utf8');
  try { rmSync(publicPath); assert.throws(() => buildIsolatedLineage(dir), /cannot fall back to a historical lineage/); }
  finally { writeFileSync(publicPath, publicBytes); }
  for (const folder of ['drizzle', 'drizzle-isolated']) {
    const extra = join(dir, folder, '0009_unreviewed.sql');
    try { writeFileSync(extra, 'SELECT 1;'); assert.throws(() => verifyIsolatedLineage(dir), /unreviewed historical SQL suffix|unregistered isolated SQL/); }
    finally { rmSync(extra); }
  }
  verifyIsolatedLineage(dir);
}));
