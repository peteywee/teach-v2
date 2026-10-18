import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import test from 'node:test';
import { newDemoContent, newRecipeDemoContent } from '../../src/modules/content/application/demo-template.js';
import { readPublishedDemoContent } from '../../src/modules/content/application/demo-content-service.js';
import type { ContentRecord } from '../../src/modules/content/application/ports/demo-content.js';
import { canonicalJson, parseStrictJson, publicContent, validateContent, type RecipeTeachingContent } from '../../src/modules/content/domain/demo-content.js';
import { PostgresDemoContent } from '../../src/modules/content/infrastructure/persistence/postgres-demo-content.js';
import { evaluateResponse } from '../../src/modules/learning/domain/demo-evaluation.js';

function makeIds() {
  let index = 0;
  return () => `id_${++index}`;
}

function content(): RecipeTeachingContent {
  const validated = newRecipeDemoContent('org_golden', makeIds());
  if (validated.content.schemaVersion !== '1.1.0') throw new Error('Expected recipe content');
  return structuredClone(validated.content);
}

function persisted(input = content()): ContentRecord {
  const validated = validateContent(input);
  return {
    id: validated.content.contentPackId, organizationId: validated.content.organizationId,
    version: validated.content.version, digest: validated.digest, canonicalJson: validated.canonicalJson,
  };
}

test('recipe successor is additive and leaves the original frozen factory and scoring exact', () => {
  const original = newDemoContent('org_golden', makeIds());
  assert.equal(original.digest, 'sha256:4d184f89b2c040bf8d89e25cf1ac1c8bdc3dab5da4bae46e072669cffa93a790');
  assert.equal(original.content.schemaVersion, '1.0.0');
  assert.equal(original.content.version, '1.0.0');
  assert.equal(Object.hasOwn(original.content, 'recipes'), false);
  assert.equal(Object.hasOwn(publicContent(original), 'recipes'), false);
  let count = 0;
  const successor = newRecipeDemoContent('org_golden', () => `id_${++count}`);
  assert.equal(count, 7);
  assert.equal(successor.content.schemaVersion, '1.1.0');
  assert.equal(successor.content.version, '1.1.0');
  assert.deepEqual(successor.content.blocks, original.content.blocks);
  assert.notEqual(successor.digest, original.digest);
  for (const block of original.content.blocks) {
    for (const [selected] of block.options.entries()) {
      assert.deepEqual(evaluateResponse(successor.content, block.id, selected, 0), evaluateResponse(original.content, block.id, selected, 0));
    }
  }
});

test('recipe sample factory supplies three explicitly fictional recipes with fresh scoped identities', () => {
  const ids = makeIds();
  const first = newRecipeDemoContent('org_first', ids).content;
  const second = newRecipeDemoContent('org_second', ids).content;
  assert.equal(first.schemaVersion, '1.1.0');
  assert.equal(second.schemaVersion, '1.1.0');
  if (first.schemaVersion !== '1.1.0' || second.schemaVersion !== '1.1.0') throw new Error('Expected recipe content');
  assert.equal(first.recipes.length, 3);
  assert.ok(first.recipes.every(recipe => recipe.title.startsWith('Fictional sample: ') && recipe.reference === 'General handoff practice'));
  assert.equal(new Set([...first.recipes, ...second.recipes].map(recipe => recipe.id)).size, 6);
  assert.notEqual(first.contentPackId, second.contentPackId);
  assert.equal(first.organizationId, 'org_first');
  assert.equal(second.organizationId, 'org_second');
  assert.throws(() => newRecipeDemoContent('invalid organization', makeIds()));
  let index = 0;
  assert.throws(() => newRecipeDemoContent('org_valid', () => ++index <= 4 ? `id_${index}` : 'reused_recipe'));
});

test('recipe payloads canonicalize through the existing strict parser and bind every field into the digest', () => {
  const input = content();
  const validated = validateContent(input);
  assert.equal(validated.digest, `sha256:${createHash('sha256').update(validated.canonicalJson, 'utf8').digest('hex')}`);
  assert.deepEqual(validateContent(parseStrictJson(validated.canonicalJson)), validated);
  const changes: Array<(value: RecipeTeachingContent) => void> = [
    value => { value.organizationId = 'other_org'; },
    value => { value.contentPackId = 'other_pack'; },
    value => { value.version = '1.1.0+changed'; },
    value => { value.recipes[0]!.id = 'other_recipe'; },
    value => { value.recipes[0]!.title += ' changed'; },
    value => { value.recipes[0]!.station = 'Other station'; },
    value => { value.recipes[0]!.servings = 3; },
    value => { value.recipes[0]!.ingredients[0] = 'Changed sample ingredient'; },
    value => { value.recipes[0]!.steps[0] = 'Changed sample step'; },
    value => { value.recipes[0]!.reference = 'Changed sample reference'; },
    value => { value.recipes.reverse(); },
    value => { value.recipes[0]!.ingredients.reverse(); },
    value => { value.recipes[0]!.steps.reverse(); },
  ];
  for (const change of changes) {
    const changed = structuredClone(input); change(changed);
    assert.notEqual(validateContent(changed).digest, validated.digest);
  }
});

test('the version discriminator requires recipes only in 1.1.0 and keeps exactly three lesson blocks', () => {
  const changes: Array<(value: any) => void> = [
    value => { value.schemaVersion = '1.0.0'; },
    value => { value.schemaVersion = '1.2.0'; },
    value => { delete value.recipes; },
    value => { value.recipes = []; },
    value => { value.recipes = null; },
    value => { value.recipes.pop(); },
    value => { value.recipes.push({ ...value.recipes[0], id: 'fourth_recipe' }); },
    value => { value.recipes[1].id = value.recipes[0].id; },
    value => { value.blocks.pop(); },
    value => { value.blocks.push({ ...value.blocks[0], id: 'fourth_block' }); },
    value => { value.blocks[0].expectedOptionIndex = 99; },
    value => { value.extra = true; },
    value => { value.recipes[0].extra = true; },
    value => { delete value.recipes[0].reference; },
  ];
  for (const change of changes) { const input = content(); change(input); assert.throws(() => validateContent(input)); }
});

test('recipe counts, integer servings, identifiers, and text lengths reject out-of-bounds input', () => {
  const changes: Array<(recipe: any) => void> = [
    recipe => { recipe.id = ''; }, recipe => { recipe.id = 'invalid id'; },
    recipe => { recipe.id = 'x'.repeat(129); }, recipe => { recipe.servings = 0; },
    recipe => { recipe.servings = 101; }, recipe => { recipe.servings = 1.5; },
    recipe => { recipe.servings = '1'; }, recipe => { recipe.servings = NaN; },
    recipe => { recipe.title = ''; }, recipe => { recipe.title = 'x'.repeat(161); },
    recipe => { recipe.station = ''; }, recipe => { recipe.station = 'x'.repeat(81); },
    recipe => { recipe.reference = ''; }, recipe => { recipe.reference = 'x'.repeat(1001); },
    recipe => { recipe.ingredients = []; }, recipe => { recipe.ingredients = 'not an array'; },
    recipe => { recipe.ingredients = Array(31).fill('Sample ingredient'); },
    recipe => { recipe.ingredients[0] = ''; }, recipe => { recipe.ingredients[0] = 'x'.repeat(501); },
    recipe => { recipe.steps = []; }, recipe => { recipe.steps = 'not an array'; },
    recipe => { recipe.steps = Array(21).fill('Sample step'); },
    recipe => { recipe.steps[0] = ''; }, recipe => { recipe.steps[0] = 'x'.repeat(2001); },
  ];
  for (const change of changes) { const input = content(); change(input.recipes[0]); assert.throws(() => validateContent(input)); }
});

test('recipe bounds accept endpoints and count Unicode scalar values', () => {
  const input = content();
  const recipe = input.recipes[0]!;
  recipe.id = 'x'.repeat(128); recipe.title = '😀'.repeat(160); recipe.station = '😀'.repeat(80);
  recipe.servings = 100; recipe.reference = '😀'.repeat(1000);
  recipe.ingredients = ['😀'.repeat(500)]; recipe.steps = ['😀'.repeat(2000)];
  const accepted = validateContent(input);
  assert.deepEqual(accepted.content, input);
  recipe.ingredients = Array(30).fill('Sample ingredient'); recipe.steps = Array(20).fill('Sample step');
  validateContent(input);
  recipe.servings = 1; recipe.ingredients = ['x']; recipe.steps = ['x'];
  validateContent(input);
  recipe.title += '😀'; assert.throws(() => validateContent(input));
});

test('all recipe text fields reject markup, URLs, control characters, invalid Unicode, and nontext values', () => {
  const setters: Array<(recipe: any, value: unknown) => void> = [
    (recipe, value) => { recipe.title = value; }, (recipe, value) => { recipe.station = value; },
    (recipe, value) => { recipe.reference = value; }, (recipe, value) => { recipe.ingredients[0] = value; },
    (recipe, value) => { recipe.steps[0] = value; },
  ];
  for (const bad of ['<img src=x>', 'https://example.test', '//example.test', 'javascript:alert(1)', 'data:text/plain,sample', '\u0000', '\ud800', 1, null]) {
    for (const set of setters) { const input = content(); set(input.recipes[0], bad); assert.throws(() => validateContent(input)); }
  }
});

test('recipes retain the strict no-hook JSON boundary and the existing 64 KiB payload limit', () => {
  let hookCalled = false;
  const input = content();
  Object.defineProperty(input.recipes[0], 'reference', { enumerable: true, get() { hookCalled = true; return 'Sample'; } });
  assert.throws(() => validateContent(input));
  assert.equal(hookCalled, false);
  const hidden = content(); Object.defineProperty(hidden.recipes[0], 'hidden', { value: true });
  assert.throws(() => validateContent(hidden));
  const hole = content(); delete hole.recipes[0]!.ingredients[0];
  assert.throws(() => validateContent(hole));
  const oversized = content();
  for (const recipe of oversized.recipes) recipe.steps = Array(20).fill('x'.repeat(2000));
  assert.ok(Buffer.byteLength(canonicalJson(oversized), 'utf8') > 65_536);
  assert.throws(() => validateContent(oversized), /canonical content exceeds 64 KiB/);
});

test('recipes are deeply frozen detached snapshots and public DTOs expose only the allowlisted reference fields', () => {
  const input = content();
  const validated = validateContent(input);
  if (validated.content.schemaVersion !== '1.1.0') throw new Error('Expected recipe content');
  const originalTitle = validated.content.recipes[0]!.title;
  const originalIngredient = validated.content.recipes[0]!.ingredients[0];
  const originalStep = validated.content.recipes[0]!.steps[0];
  input.recipes[0]!.title = 'Changed'; input.recipes[0]!.ingredients[0] = 'Changed'; input.recipes.pop();
  assert.equal(validated.content.recipes.length, 3);
  assert.equal(validated.content.recipes[0]!.title, originalTitle);
  assert.equal(validated.content.recipes[0]!.ingredients[0], originalIngredient);
  const stored = validated.content.recipes;
  assert.throws(() => { stored.pop(); });
  assert.throws(() => { stored[0]!.title = 'Changed'; });
  assert.throws(() => { stored[0]!.ingredients[0] = 'Changed'; });
  assert.throws(() => { stored[0]!.steps[0] = 'Changed'; });
  const result = publicContent(validated);
  if (result.schemaVersion !== '1.1.0') throw new Error('Expected public recipe content');
  assert.equal(result.synthetic, true);
  assert.equal(result.contentVersion.digest, validated.digest);
  assert.deepEqual(Object.keys(result).sort(), ['blocks', 'contentPackId', 'contentVersion', 'organizationId', 'recipes', 'schemaVersion', 'synthetic', 'title']);
  assert.deepEqual(Object.keys(result.recipes[0]!).sort(), ['id', 'ingredients', 'reference', 'servings', 'station', 'steps', 'title']);
  assert.ok(!JSON.stringify(result).includes('expectedOptionIndex'));
  assert.ok(!JSON.stringify(result).includes('feedback'));
  result.recipes[0]!.title = 'Changed'; result.recipes[0]!.ingredients[0] = 'Changed'; result.recipes[0]!.steps[0] = 'Changed'; result.recipes.pop();
  assert.equal(stored.length, 3);
  assert.equal(stored[0]!.title, originalTitle);
  assert.equal(stored[0]!.ingredients[0], originalIngredient);
  assert.equal(stored[0]!.steps[0], originalStep);
});

test('existing content persistence adapter carries recipe bytes in content_pack_versions without new table writes', async () => {
  const record = persisted();
  const calls: Array<{ sql: string; values: readonly unknown[] }> = [];
  let selected = record;
  // Query spy only: PostgreSQL storage/locking proof remains an integration gate.
  const repository = new PostgresDemoContent({
    async query<T>(sql: string, values: readonly unknown[] = []): Promise<T[]> {
      calls.push({ sql, values });
      return sql.startsWith('SELECT ') ? [selected as T] : [];
    },
  });
  await repository.publish(record);
  assert.equal(calls.length, 2);
  assert.ok(calls[0]!.sql.startsWith('INSERT INTO content_packs('));
  assert.ok(calls[1]!.sql.startsWith('INSERT INTO content_pack_versions('));
  assert.deepEqual(calls[1]!.values, [record.id, record.version, record.digest, record.canonicalJson]);
  assert.deepEqual(await repository.getVersion(record.id, record.organizationId, record.version), record);
  assert.deepEqual(calls[2]!.values, [record.id, record.organizationId, record.version]);
  const changed = content(); changed.recipes[0]!.steps[0] = 'Changed stored sample step';
  selected = { ...record, canonicalJson: validateContent(changed).canonicalJson };
  await assert.rejects(repository.getVersion(record.id, record.organizationId, record.version), /Invalid persisted content binding/);
  const countBefore = calls.length;
  await assert.rejects(repository.publish(selected), /Invalid persisted content binding/);
  assert.equal(calls.length, countBefore);
});

test('published recipe reads reject altered digest, canonical bytes, version, pack, and organization bindings', async () => {
  const record = persisted();
  let selected = record;
  const port = { getVersion: async () => selected, publish: async () => {} };
  const scope = { organizationId: record.organizationId, locationId: 'location_sample' };
  const read = () => readPublishedDemoContent(port, scope, record.id, record.version);
  assert.equal((await read()).content.schemaVersion, '1.1.0');
  const changed = content(); changed.recipes[0]!.reference = 'Changed sample reference';
  for (const bad of [
    { ...record, digest: `sha256:${'0'.repeat(64)}` },
    { ...record, canonicalJson: validateContent(changed).canonicalJson },
    { ...record, canonicalJson: ` ${record.canonicalJson}` },
    { ...record, version: '1.1.0+other' },
    { ...record, id: 'other_pack' },
    { ...record, organizationId: 'other_org' },
  ]) {
    selected = bad;
    await assert.rejects(read(), (error: any) => error.code === 'SERVICE_UNAVAILABLE');
  }
});

test('missing own schema version never invokes an inherited getter', () => {
  let called = false;
  Object.defineProperty(Object.prototype, 'schemaVersion', { configurable: true, get() { called = true; return '1.1.0'; } });
  try { assert.throws(() => validateContent({})); assert.equal(called, false); }
  finally { Reflect.deleteProperty(Object.prototype, 'schemaVersion'); }
});
