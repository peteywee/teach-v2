import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { newDemoContent, newRecipeDemoContent } from '../../src/modules/content/application/demo-template.js';
import { newStationDemoContent } from '../../src/modules/content/application/demo-kitchen-template.js';
import { canonicalJson, parseStrictJson, publicContent, validateContent, type StationTeachingContent } from '../../src/modules/content/domain/demo-content.js';
import { evaluateResponse } from '../../src/modules/learning/domain/demo-evaluation.js';

function ids() { let i = 0; return () => `id_${++i}`; }
function content(): StationTeachingContent {
  const value = newStationDemoContent('org_golden', ids()).content;
  assert.equal(value.schemaVersion, '1.2.0');
  if (value.schemaVersion !== '1.2.0') throw new Error('Expected station content');
  return structuredClone(value);
}

test('kitchen successor preserves original training and historical factories byte-for-byte', () => {
  const legacy = newDemoContent('org_golden', ids());
  assert.equal(legacy.digest, 'sha256:4d184f89b2c040bf8d89e25cf1ac1c8bdc3dab5da4bae46e072669cffa93a790');
  const recipes = newRecipeDemoContent('org_golden', ids());
  assert.equal(recipes.content.schemaVersion, '1.1.0');
  const kitchen = newStationDemoContent('org_golden', ids());
  assert.deepEqual(kitchen.content.blocks, legacy.content.blocks);
  for (const block of legacy.content.blocks) for (const choice of block.options.keys()) {
    assert.deepEqual(evaluateResponse(kitchen.content, block.id, choice, 0), evaluateResponse(legacy.content, block.id, choice, 0));
  }
  assert.notEqual(kitchen.digest, recipes.digest);
  assert.deepEqual(validateContent(parseStrictJson(kitchen.canonicalJson)), kitchen);
});

test('one source template defines the bounded fictional station graph', () => {
  const source = JSON.parse(readFileSync(new URL('../../domains/demo-kitchen/proposal-0.1.0/synthetic-content-template-1.2.0.json', import.meta.url), 'utf8'));
  const value = content();
  const { contentPackId: _pack, organizationId: _org, blocks, ...catalog } = value;
  const { note: _note, blocks_template: blocksTemplate, ...expected } = source;
  assert.deepEqual(catalog, expected);
  assert.deepEqual(blocks.map(({ id: _id, ...block }) => block), blocksTemplate);
  assert.deepEqual(value.stations.map(item => item.label), ['Fry', 'Cold Prep', 'Hot Prep']);
  assert.equal(value.people.length, 3); assert.equal(value.recipes.length, 3); assert.equal(value.equipment.length, 8);
  assert.ok(value.people.every(item => item.displayLabel.includes('(fictional)')));
  assert.ok(value.recipes.every(item => item.title.startsWith('Fictional sample: ')));
  assert.equal(value.inventory.filter(item => item.equipmentId === 'tool-tongs').length, 1);
  assert.equal(value.recipes.filter(item => item.requirements.some(part => part.equipmentId === 'tool-tongs')).length, 2);
  const makeId = ids(); const first = newStationDemoContent('org_first', makeId).content;
  const second = newStationDemoContent('org_second', makeId).content;
  assert.notEqual(first.contentPackId, second.contentPackId);
  assert.notEqual(first.blocks[0]!.id, second.blocks[0]!.id);
  assert.equal(first.organizationId, 'org_first'); assert.equal(second.organizationId, 'org_second');
});

test('catalog is detached/deeply immutable, digest-bound, and grading stays private', () => {
  const original = content(); const validated = validateContent(original);
  original.inventory[0]!.quantity = 50;
  assert.notEqual(canonicalJson(original), validated.canonicalJson);
  if (validated.content.schemaVersion !== '1.2.0') throw new Error('Expected station content');
  assert.ok(Object.isFrozen(validated.content.recipes[0]!.requirements[0]));
  assert.ok(Object.isFrozen(validated.content.inventory));
  const publicValue = publicContent(validated);
  if (publicValue.schemaVersion !== '1.2.0') throw new Error('Expected station content');
  assert.ok(publicValue.blocks.every(item => !Object.hasOwn(item, 'feedback') && !Object.hasOwn(item, 'expectedOptionIndex')));
  assert.equal(publicValue.contentVersion.digest, validated.digest);
  publicValue.recipes[0]!.requirements[0]!.quantity = 99;
  publicValue.stations[0]!.label = 'Changed';
  assert.equal(validated.content.recipes[0]!.requirements[0]!.quantity, 1);
  assert.equal(validated.content.stations[0]!.label, 'Fry');
  const changed = content(); changed.people[0]!.displayLabel = 'Other fictional person';
  assert.notEqual(validateContent(changed).digest, validated.digest);
});

const invalidChanges: Array<[string, (value: StationTeachingContent) => void]> = [
  ['empty stations', value => { value.stations = []; }],
  ['too many stations', value => { value.stations = Array.from({ length: 13 }, (_, i) => ({ ...value.stations[0]!, id: `station_${i}` })); }],
  ['empty people', value => { value.people = []; }],
  ['empty equipment', value => { value.equipment = []; }],
  ['empty inventory', value => { value.inventory = []; }],
  ['empty recipes', value => { value.recipes = []; }],
  ['duplicate station', value => { value.stations.push(value.stations[0]!); }],
  ['duplicate person', value => { value.people.push(value.people[0]!); }],
  ['duplicate equipment', value => { value.equipment.push(value.equipment[0]!); }],
  ['duplicate recipe', value => { value.recipes.push(value.recipes[0]!); }],
  ['unknown person', value => { value.stations[0]!.responsiblePersonId = 'missing'; }],
  ['unknown recipe station', value => { value.recipes[0]!.stationId = 'missing'; }],
  ['unknown holding station', value => { value.inventory[0]!.stationId = 'missing'; }],
  ['unknown equipment requirement', value => { value.recipes[0]!.requirements[0]!.equipmentId = 'missing'; }],
  ['unknown held equipment', value => { value.inventory[0]!.equipmentId = 'missing'; }],
  ['duplicate holding', value => { value.inventory.push(value.inventory[0]!); }],
  ['duplicate shared holding', value => { value.inventory.push(value.inventory.find(item => item.stationId === null)!); }],
  ['duplicate requirement', value => { value.recipes[0]!.requirements.push(value.recipes[0]!.requirements[0]!); }],
  ['missing requirements', value => { value.recipes[0]!.requirements = []; }],
  ['zero quantity', value => { value.inventory[0]!.quantity = 0; }],
  ['negative quantity', value => { value.recipes[0]!.requirements[0]!.quantity = -1; }],
  ['fractional quantity', value => { value.inventory[0]!.quantity = 1.5; }],
  ['excess quantity', value => { value.inventory[0]!.quantity = 101; }],
  ['HTML person', value => { value.people[0]!.displayLabel = '<b>Person</b>'; }],
  ['URL station', value => { value.stations[0]!.label = 'https://example.com'; }],
  ['invalid identifier', value => { value.equipment[0]!.id = 'equipment\n'; }],
];
for (const [label, change] of invalidChanges) test(`strict kitchen graph rejects ${label}`, () => {
  const value = content(); change(value); assert.throws(() => validateContent(value), TypeError);
});

test('schema mixing, unrecognized fields, operational claims and unknown versions fail closed', () => {
  const value = content();
  for (const changed of [
    { ...value, schemaVersion: '1.3.0' }, { ...value, schemaVersion: '1.1.0' },
    { ...value, availability: true }, { ...value, people: [{ ...value.people[0], identityId: 'actual_identity' }] },
    { ...value, equipment: [{ ...value.equipment[0], kind: 'CONSUMABLE' }] },
    { ...value, inventory: [{ ...value.inventory[0], available: true }] },
    { ...value, recipes: [{ ...value.recipes[0], station: 'Fry' }] },
    { ...value, recipes: [{ ...value.recipes[0], preparedByPersonId: 'person-alex' }] },
  ]) assert.throws(() => validateContent(changed));
});

test('holdings are independent samples, not a reservation or availability calculation', () => {
  const value = content(); value.recipes[0]!.requirements[0]!.quantity = 2;
  assert.doesNotThrow(() => validateContent(value));
  value.inventory.push({ equipmentId: 'tool-tongs', stationId: 'station-fry', quantity: 1 });
  assert.doesNotThrow(() => validateContent(value));
});
