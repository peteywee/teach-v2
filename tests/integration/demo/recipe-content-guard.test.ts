import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { createHash, randomUUID } from 'node:crypto';
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import pg from 'pg';
import { assertIsolatedDatabaseTarget } from '../../../scripts/db/isolated-database-target.mjs';
import { applyDemoMigrations } from '../../../scripts/db/migrate-demo-isolated.js';
import { newDemoContent, newRecipeDemoContent } from '../../../src/modules/content/application/demo-template.js';
import { canonicalJson, validateContent, type RecipeTeachingContent, type TeachingContent } from '../../../src/modules/content/domain/demo-content.js';

// Real direct SQL, not a repository mock: each runner suite owns its own
// disposable loopback database. Never disable a trigger or mutate old migrations.
const connectionString = assertIsolatedDatabaseTarget(process.env.DATABASE_URL);
const pool = new pg.Pool({ connectionString });
const organizationId = randomUUID();
const contentPackId = randomUUID();
let nextVersion = 0;
let legacyBytes: string;
let legacyDigest: string;
let priorBoundary: unknown;
let priorGuardOid: number;
const hash = (bytes: string) => `sha256:${createHash('sha256').update(bytes, 'utf8').digest('hex')}`;
const object = (value: object) => value as unknown as Record<string, unknown>;

function recipeContent(): RecipeTeachingContent {
  const result = newRecipeDemoContent(organizationId, randomUUID).content;
  assert.equal(result.schemaVersion, '1.1.0');
  if (result.schemaVersion !== '1.1.0') throw new Error('Expected recipe successor');
  return { ...structuredClone(result), contentPackId, version: `2.0.${++nextVersion}` };
}
function legacyContent(): TeachingContent {
  return { ...structuredClone(newDemoContent(organizationId, randomUUID).content), contentPackId, version: `2.0.${++nextVersion}` };
}
async function insertRaw(input: TeachingContent, bytes: string, digest = hash(bytes), packId: string = contentPackId, version = input.version) {
  await pool.query('INSERT INTO content_pack_versions(content_pack_id,version,digest,canonical_json) VALUES($1,$2,$3,$4)', [packId, version, digest, bytes]);
}
async function insert(input: TeachingContent) {
  await insertRaw(input, canonicalJson(input));
}
// Report only a safe case label and SQLSTATE, never the full rejected payload.
async function rejectsSql(action: () => Promise<unknown>, label: string, codes = ['23514']) {
  let rejected = false;
  try { await action(); }
  catch (error) {
    rejected = true;
    const code = error && typeof error === 'object' && 'code' in error ? String(error.code) : 'unknown';
    assert.ok(codes.includes(code), `${label}: unexpected SQLSTATE ${code}`);
  }
  assert.equal(rejected, true, `${label}: database accepted invalid content`);
}
async function boundary() {
  return {
    tables: (await pool.query("SELECT c.relname,c.relrowsecurity,c.relacl FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind='r' ORDER BY c.relname")).rows,
    constraints: (await pool.query("SELECT c.relname,k.conname,pg_get_constraintdef(k.oid) AS definition FROM pg_constraint k JOIN pg_class c ON c.oid=k.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' ORDER BY c.relname,k.conname")).rows,
    triggers: (await pool.query("SELECT c.relname,t.tgname,t.tgenabled,pg_get_triggerdef(t.oid) AS definition FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' ORDER BY c.relname,t.tgname")).rows,
    functionAccess: (await pool.query("SELECT p.oid,p.proname,p.proacl,p.prosecdef FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' ORDER BY p.oid")).rows,
  };
}

before(async () => {
  // A populated 0005 upgrade proves old history remains valid and byte-identical.
  const prior = await mkdtemp(join(tmpdir(), 'teach-recipe-guard-prior-'));
  try {
    await cp('drizzle', prior, { recursive: true });
    const journalPath = join(prior, 'meta/_journal.json');
    const journal = JSON.parse(await readFile(journalPath, 'utf8'));
    journal.entries = journal.entries.filter((entry: { idx: number }) => entry.idx <= 5);
    await writeFile(journalPath, JSON.stringify(journal));
    await applyDemoMigrations(pool, prior);
    assert.equal((await pool.query('SELECT count(*)::int n FROM drizzle.__drizzle_migrations')).rows[0].n, 6);
    await pool.query("INSERT INTO organization_organizations(id,classification,created_at) VALUES($1,'DEMO_ONLY',clock_timestamp())", [organizationId]);
    await pool.query('INSERT INTO content_packs(id,organization_id) VALUES($1,$2)', [contentPackId, organizationId]);
    const legacy = legacyContent();
    // Existing SQL permits this legacy title. 0006 must not silently tighten it.
    legacy.title = 'Legacy reference https://example.invalid with <3> and control\u0001';
    legacyBytes = canonicalJson(legacy);
    legacyDigest = hash(legacyBytes);
    await insertRaw(legacy, legacyBytes, legacyDigest);
    const successor = recipeContent();
    await rejectsSql(() => insert(successor), '0005 rejects the successor');
    priorBoundary = await boundary();
    priorGuardOid = (await pool.query("SELECT 'content_guard_demo_version()'::regprocedure::oid AS oid")).rows[0].oid;
    await applyDemoMigrations(pool);
    await applyDemoMigrations(pool); // Drizzle replay is an idempotent no-op.
  } finally { await rm(prior, { recursive: true, force: true }); }
});
after(async () => { await pool.end(); });

test('additive 0006 upgrade preserves populated legacy bytes, protections, ACLs and trigger identity', async () => {
  assert.equal((await pool.query('SELECT count(*)::int n FROM drizzle.__drizzle_migrations')).rows[0].n, 7);
  assert.deepEqual(await boundary(), priorBoundary);
  assert.equal((await pool.query("SELECT 'content_guard_demo_version()'::regprocedure::oid AS oid")).rows[0].oid, priorGuardOid);
  assert.deepEqual((await pool.query('SELECT canonical_json,digest FROM content_pack_versions WHERE digest=$1', [legacyDigest])).rows, [{ canonical_json: legacyBytes, digest: legacyDigest }]);
  const legacy = legacyContent();
  legacy.title = 'Legacy reference https://example.invalid with <3> and control\u0001';
  await insert(legacy);
  const ordinaryLegacy = legacyContent();
  validateContent(ordinaryLegacy);
  await insert(ordinaryLegacy);
  const successor = recipeContent();
  const validated = validateContent(successor);
  await insertRaw(successor, validated.canonicalJson, validated.digest);
  assert.deepEqual((await pool.query('SELECT canonical_json,digest FROM content_pack_versions WHERE version=$1 AND content_pack_id=$2', [successor.version, contentPackId])).rows, [{ canonical_json: validated.canonicalJson, digest: validated.digest }]);
});

test('direct SQL accepts exact recipe bounds, Unicode scalars and non-reference plain text', async () => {
  const input = recipeContent();
  const first = input.recipes[0]!;
  first.id = 'r'.repeat(128);
  first.title = '🍊'.repeat(160);
  first.station = '🍊'.repeat(80);
  first.servings = 100;
  first.reference = '🍊'.repeat(1000);
  first.ingredients = Array.from({ length: 30 }, () => 'Ingredient');
  first.ingredients[0] = '🍊'.repeat(500);
  first.steps = Array.from({ length: 20 }, () => 'Step');
  first.steps[0] = '🍊'.repeat(2000);
  input.recipes[1]!.servings = 1;
  input.recipes[1]!.ingredients = ['One'];
  input.recipes[1]!.steps = ['One'];
  input.recipes[2]!.reference = 'Line one\nLine two\twith CR\rand café e\u0301 🍊; < unfinished; A/B; ratio 1:2; awww.example; x//y; //\u00a0blank';
  const validated = validateContent(input);
  await insertRaw(input, validated.canonicalJson, validated.digest);
});

test('direct SQL rejects missing and extra top-level and recipe keys without schema fallback', async () => {
  const fields = ['schemaVersion', 'contentPackId', 'organizationId', 'version', 'title', 'blocks', 'recipes'];
  for (const key of fields) {
    const input = recipeContent(); delete object(input)[key];
    await rejectsSql(() => insertRaw(input, canonicalJson(input), undefined, contentPackId, '3.0.0'), `missing top-level ${key}`);
  }
  for (const key of ['id', 'title', 'station', 'servings', 'ingredients', 'steps', 'reference']) {
    const input = recipeContent(); delete object(input.recipes[0]!)[key];
    await rejectsSql(() => insert(input), `missing recipe ${key}`);
  }
  for (const mutate of [
    (value: RecipeTeachingContent) => { object(value).extra = true; },
    (value: RecipeTeachingContent) => { object(value.recipes[0]!).media = 'Unsupported'; },
    (value: RecipeTeachingContent) => { object(value).schemaVersion = '1.2.0'; },
    (value: RecipeTeachingContent) => { object(value).schemaVersion = '1.0.0'; },
    (value: RecipeTeachingContent) => { object(value).schemaVersion = 1.1; },
  ]) {
    const input = recipeContent(); mutate(input);
    // JSON.stringify allows the intentionally noninteger schema discriminator.
    const bytes = typeof object(input).schemaVersion === 'number' ? JSON.stringify(input) : canonicalJson(input);
    await rejectsSql(() => insertRaw(input, bytes), 'unknown key or unsupported discriminator');
  }
  const legacy = legacyContent(); object(legacy).recipes = [];
  await rejectsSql(() => insert(legacy), 'legacy recipes remain forbidden');
});

test('direct SQL rejects recipe cardinality, shape, identifier and numeric violations', async () => {
  const cases: Array<[string, (input: RecipeTeachingContent) => void]> = [
    ['two recipes', value => { value.recipes.pop(); }],
    ['four recipes', value => { value.recipes.push({ ...value.recipes[0]!, id: 'fourth' }); }],
    ['null recipes', value => { object(value).recipes = null; }],
    ['object recipes', value => { object(value).recipes = {}; }],
    ['null recipe', value => { object(value.recipes)[0] = null; }],
    ['array recipe', value => { object(value.recipes)[0] = []; }],
    ['duplicate recipe ID', value => { value.recipes[1]!.id = value.recipes[0]!.id; }],
  ];
  for (const id of ['', 'a'.repeat(129), 'has space', 'bad\n', 'café', '🍊']) cases.push(['invalid recipe ID', value => { value.recipes[0]!.id = id; }]);
  for (const servings of [0, -1, 101, '1', null, true, {}, []]) cases.push(['invalid servings', value => { object(value.recipes[0]!).servings = servings; }]);
  for (const [label, mutate] of cases) {
    const input = recipeContent(); mutate(input);
    assert.throws(() => validateContent(input), label);
    await rejectsSql(() => insert(input), label);
  }
  for (const lexeme of ['1.0', '1.5', '1e0', '1e2', '9007199254740992']) {
    const input = recipeContent();
    const bytes = canonicalJson(input).replace(/"servings":\d+/, `"servings":${lexeme}`);
    await rejectsSql(() => insertRaw(input, bytes), 'noncanonical or unsafe recipe number');
  }
});

test('direct SQL enforces every recipe text and collection bound without coercion', async () => {
  for (const [key, limit] of [['title', 160], ['station', 80], ['reference', 1000]] as const) {
    for (const value of ['', '🍊'.repeat(limit + 1), null, 3, [], {}]) {
      const input = recipeContent(); object(input.recipes[0]!)[key] = value;
      assert.throws(() => validateContent(input), `${key} bounds`);
      await rejectsSql(() => insert(input), `${key} bounds`);
    }
  }
  for (const [key, count, limit] of [['ingredients', 30, 500], ['steps', 20, 2000]] as const) {
    for (const value of [[], Array.from({ length: count + 1 }, () => 'Item'), null, 'Item', {}, [''], ['🍊'.repeat(limit + 1)], [3], [null], [{}], [[]]]) {
      const input = recipeContent(); object(input.recipes[0]!)[key] = value;
      assert.throws(() => validateContent(input), `${key} bounds`);
      await rejectsSql(() => insert(input), `${key} bounds`);
    }
  }
});

test('direct SQL matches strict plain-text rejection for every successor text surface', async () => {
  const fields: Array<[string, (input: RecipeTeachingContent, value: string) => void]> = [
    ['content title', (input, value) => { input.title = value; }],
    ['block instruction', (input, value) => { input.blocks[0]!.instruction = value; }],
    ['block prompt', (input, value) => { input.blocks[0]!.prompt = value; }],
    ['block option', (input, value) => { input.blocks[0]!.options[0] = value; }],
    ['block feedback', (input, value) => { input.blocks[0]!.feedback[0] = value; }],
    ['recipe title', (input, value) => { input.recipes[0]!.title = value; }],
    ['recipe station', (input, value) => { input.recipes[0]!.station = value; }],
    ['recipe reference', (input, value) => { input.recipes[0]!.reference = value; }],
    ['recipe ingredient', (input, value) => { input.recipes[0]!.ingredients[0] = value; }],
    ['recipe step', (input, value) => { input.recipes[0]!.steps[0] = value; }],
  ];
  const forbidden = ['<b>HTML</b>', '<3>', '<>', '<\n>', 'https://example.invalid', 'HTTP:example', 'ftp:example', 'file:example', 'data:example', 'javascript:example', 'vbscript:example', 'mailto:example', 'tel:123', 'www.example', 'custom+scheme://example', 'éhttps://example', '//example', '(//example', '"//example', "'//example", '\u00a0//example', '\ufeff//example', 'control\u0001', 'control\u0008', 'control\u000b', 'control\u000c', 'control\u001f', 'control\u007f'];
  for (const [name, set] of fields) {
    for (const value of forbidden) {
      const input = recipeContent(); set(input, value);
      assert.throws(() => validateContent(input), name);
      await rejectsSql(() => insert(input), `${name} plain text`);
    }
  }
});

test('direct SQL retains all original three-block shape, ID, answer and feedback guards', async () => {
  const cases: Array<[string, (input: TeachingContent) => void]> = [
    ['block count', value => { value.blocks.pop(); }],
    ['duplicate block IDs', value => { value.blocks[1]!.id = value.blocks[0]!.id; }],
    ['invalid block ID', value => { value.blocks[0]!.id = 'bad\n'; }],
    ['unknown block key', value => { object(value.blocks[0]!).extra = true; }],
    ['unsupported block kind', value => { object(value.blocks[0]!).kind = 'MEDIA'; }],
    ['missing block instruction', value => { delete object(value.blocks[0]!).instruction; }],
    ['instruction bound', value => { value.blocks[0]!.instruction = 'x'.repeat(4001); }],
    ['prompt bound', value => { value.blocks[0]!.prompt = 'x'.repeat(1001); }],
    ['too few options', value => { value.blocks[0]!.options = ['Only']; }],
    ['too many options', value => { value.blocks[0]!.options = ['A', 'B', 'C', 'D', 'E', 'F']; }],
    ['duplicate options', value => { value.blocks[0]!.options[1] = value.blocks[0]!.options[0]!; }],
    ['option text bound', value => { value.blocks[0]!.options[0] = 'x'.repeat(501); }],
    ['feedback text bound', value => { value.blocks[0]!.feedback[0] = 'x'.repeat(2001); }],
    ['negative answer', value => { value.blocks[0]!.expectedOptionIndex = -1; }],
    ['answer past last option', value => { value.blocks[0]!.expectedOptionIndex = value.blocks[0]!.options.length; }],
    ['feedback count', value => { value.blocks[0]!.feedback.pop(); }],
  ];
  for (const factory of [legacyContent, recipeContent]) {
    for (const [label, mutate] of cases) {
      const input = factory(); mutate(input);
      await rejectsSql(() => insert(input), label);
    }
  }
});

test('direct SQL rejects malformed scalars, duplicate keys and noncanonical bytes before publication', async () => {
  for (const encoded of ['"\\ud800"', '"\\udc00"', '"\\ud800x"', '"\\udc00\\ud800"', '"\\u0000"']) {
    const input = recipeContent(); input.recipes[0]!.reference = 'scalar_marker';
    const bytes = canonicalJson(input).replace('"scalar_marker"', encoded);
    await rejectsSql(() => insertRaw(input, bytes), 'malformed Unicode scalar', ['22P02', '22P05']);
  }
  const transforms: Array<(bytes: string) => string> = [
    bytes => ` ${bytes}`,
    bytes => bytes.replace('"schemaVersion":"1.1.0"', '"schemaVersion":"1.1.0","schemaVersion":"1.1.0"'),
    bytes => bytes.replace('"servings":1', '"servings":1,"servings":1'),
    bytes => bytes.replace('"recipes":', '"__proto__":{},"recipes":'),
    bytes => bytes.replace('"reference":', '"constructor":{},"reference":'),
    bytes => bytes.replace('"reference":', '"prototype":{},"reference":'),
    bytes => bytes.replace('"schemaVersion"', '"schema\\u0056ersion"'),
  ];
  for (const transform of transforms) {
    const input = recipeContent();
    await rejectsSql(() => insertRaw(input, transform(canonicalJson(input))), 'noncanonical or forbidden key');
  }
});

test('direct SQL keeps exact scope/version/digest binding, byte cap and immutable history', async () => {
  const input = recipeContent(); const bytes = canonicalJson(input);
  await rejectsSql(() => insertRaw(input, bytes, 'sha256:' + '0'.repeat(64)), 'wrong digest');
  await rejectsSql(() => insertRaw(input, bytes, undefined, 'different_pack'), 'wrong pack binding');
  await rejectsSql(() => insertRaw(input, bytes, undefined, contentPackId, '9.9.9'), 'wrong version binding');
  const wrongOrg = { ...recipeContent(), organizationId: 'different_org' };
  await rejectsSql(() => insert(wrongOrg), 'wrong organization binding');
  for (const version of ['01.1.0', '1.1', '1.1.0\n', '1.1.0-01', `1.1.0+${'x'.repeat(33)}`]) {
    const invalid = { ...recipeContent(), version };
    await rejectsSql(() => insert(invalid), 'invalid exact SemVer');
  }
  const large = recipeContent();
  for (const recipe of large.recipes) recipe.steps = Array.from({ length: 20 }, () => 'x'.repeat(2000));
  assert.ok(Buffer.byteLength(canonicalJson(large), 'utf8') > 65_536);
  await rejectsSql(() => insert(large), 'canonical byte limit');
  const exact = { ...recipeContent(), version: '4.0.0-rc.1+build.A' };
  await insert(exact);
  const changed = structuredClone(exact); changed.recipes[0]!.title += ' changed';
  await rejectsSql(() => insertRaw(changed, canonicalJson(changed), hash(canonicalJson(exact))), 'recipe changed without digest');
  const changedBytes = canonicalJson(changed);
  await rejectsSql(() => pool.query('UPDATE content_pack_versions SET canonical_json=$3,digest=$4 WHERE content_pack_id=$1 AND version=$2', [contentPackId, exact.version, changedBytes, hash(changedBytes)]), 'immutable update');
  await rejectsSql(() => pool.query('UPDATE content_pack_versions SET canonical_json=canonical_json WHERE content_pack_id=$1 AND version=$2', [contentPackId, exact.version]), 'immutable no-op update');
  await rejectsSql(() => pool.query('DELETE FROM content_pack_versions WHERE content_pack_id=$1 AND version=$2', [contentPackId, exact.version]), 'immutable delete');
  await rejectsSql(() => insert(exact), 'no duplicate exact version', ['23505']);
  assert.equal((await pool.query('SELECT canonical_json FROM content_pack_versions WHERE content_pack_id=$1 AND version=$2', [contentPackId, exact.version])).rows[0].canonical_json, canonicalJson(exact));
});
