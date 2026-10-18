import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { canonicalJson, parseStrictJson, validateContent, publicContent, isExactSemver, type TeachingContent } from '../../src/modules/content/domain/demo-content.js';
import { newDemoContent } from '../../src/modules/content/application/demo-template.js';
import { evaluateResponse } from '../../src/modules/learning/domain/demo-evaluation.js';

function content(): TeachingContent {
  return { schemaVersion: '1.0.0', contentPackId: 'pack_1', organizationId: 'org_1', version: '1.0.0-rc.1+build.2', title: 'A clear team handoff', blocks: [0, 1, 2].map(index => ({ id: `block_${index}`, kind: 'SINGLE_CHOICE' as const, instruction: 'Read the ticket and clarify the next action.', prompt: 'What should you do?', options: ['Guess.', 'Clarify.'], expectedOptionIndex: 1, feedback: ['Pause rather than guess.', 'Yes: clarify the next action.'] })) };
}

test('canonical bytes sort keys, preserve arrays and Unicode, and bind the exact scoped pack', () => {
  assert.equal(canonicalJson({ z: [3, 2, 1], a: 'Café' }), '{"a":"Café","z":[3,2,1]}');
  const validated = validateContent(content());
  assert.equal(validated.content.version, '1.0.0-rc.1+build.2');
  assert.equal(validated.digest, 'sha256:b0b338accad027601f70961891bd70e52457460fb8ca8d87eefbd367fff13630');
  assert.equal(validated.digest, `sha256:${createHash('sha256').update(validated.canonicalJson).digest('hex')}`);
  const changed = content(); changed.organizationId = 'org_2';
  assert.notEqual(validateContent(changed).digest, validated.digest);
});

test('duplicate JSON keys, invalid Unicode, floats, prototype keys, trailing data reject', () => {
  for (const input of ['{"a":1,"a":2}', '{"a":{"x":1,"x":2}}', '{"a":"\\ud800"}', '{"a":1.2}', '{"a":1e1}', '{"__proto__":{}}', '{}{}']) {
    assert.throws(() => parseStrictJson(input), input);
  }
});

test('schema, immutable version, text, block uniqueness and answer bounds are strict', () => {
  const changes: Array<(v: any) => void> = [
    v => v.schemaVersion = '2.0.0', v => v.extra = true, v => v.version = '01.0.0', v => v.version = '1.0',
    v => v.version = '1.0.0-01', v => v.version = '1.0.0+'.padEnd(39, 'x'), v => v.title = '',
    v => v.blocks[1].id = v.blocks[0].id, v => v.blocks.pop(), v => v.blocks[0].options = ['same', 'same'],
    v => v.blocks[0].expectedOptionIndex = 2, v => v.blocks[0].feedback.pop(), v => v.blocks[0].instruction = '<script>alert(1)</script>',
    v => v.blocks[0].instruction = 'x'.repeat(4001), v => v.blocks[0].prompt = '\ud800', v => delete v.blocks[0].feedback,
  ];
  for (const change of changes) { const value = content(); change(value); assert.throws(() => validateContent(value)); }
});

test('public exact-version content reveals instruction and choices but no grading material', () => {
  const value = validateContent(content());
  const result = publicContent(value);
  assert.equal(result.synthetic, true);
  assert.equal(result.contentVersion.digest, value.digest);
  assert.equal(result.blocks.length, 3);
  assert.ok(!JSON.stringify(result).includes('expectedOptionIndex'));
  assert.ok(!JSON.stringify(result).includes('feedback'));
});

test('engine is deterministic v1.0.0 and wrong choices are recorded teaching feedback, not failure', () => {
  const pack = content();
  const actual = evaluateResponse(pack, 'block_0', 0, 0);
  assert.deepEqual(actual, { engineVersion: '1.0.0', blockId: 'block_0', selectedOptionIndex: 0, matchesExpectedChoice: false, feedback: 'Pause rather than guess.' });
  assert.equal(canonicalJson(actual), canonicalJson(evaluateResponse(pack, 'block_0', 0, 0)));
  assert.equal(evaluateResponse(pack, 'block_0', 1, 0).matchesExpectedChoice, true);
  for (const index of [-1, 2, 0.5, NaN]) assert.throws(() => evaluateResponse(pack, 'block_0', index, 0));
  assert.throws(() => evaluateResponse(pack, 'missing', 0, 0));
  assert.throws(() => evaluateResponse(pack, 'block_0', 0, 1));
});

test('strict parser preserves valid strings and rejects every unsupported lexical form', () => {
  const valid = { a: [null, false, true, -2, 0], quoted: '"\\\n', unicode: 'Café 😀 e\u0301' };
  assert.deepEqual(parseStrictJson(JSON.stringify(valid)), valid);
  assert.deepEqual(parseStrictJson(' \t\r\n{"integer":-9007199254740991}\n'), { integer: -9007199254740991 });
  for (const input of [
    '', ' ', '[1,]', '{"a":1,}', '{"a":}', '{"a" 1}', '{a:1}', '{"a":1 "b":2}',
    '01', '+1', '1.', '.1', '--1', 'NaN', 'Infinity', '9007199254740993', '-9007199254740993',
    '"\udfff"', '"\ud800x"', '"\\uZZZZ"', '"\\x00"', '"line\nfeed"', '"\\"',
    '{"a":1,"\\u0061":2}', '{"constructor":1}', '{"prototype":1}', 'true false', '[null]null', '\ufeff{}',
  ]) assert.throws(() => parseStrictJson(input), input);
  assert.deepEqual(parseStrictJson('{"value":0.25}', { allowFractionalNumbers: true }), { value: 0.25 });
  assert.throws(() => parseStrictJson('{"value":1e999}', { allowFractionalNumbers: true }));
  assert.throws(() => parseStrictJson('{"value":1,"value":2}', { allowFractionalNumbers: true }));
});

test('canonical JSON rejects lossy JavaScript inputs without evaluating hooks', () => {
  let hookCalled = false;
  const getter = Object.defineProperty({}, 'field', { enumerable: true, get() { hookCalled = true; return 1; } });
  const hidden = Object.defineProperty({}, 'field', { enumerable: false, value: 1 });
  const cycle: Record<string, unknown> = {}; cycle.cycle = cycle;
  const customArray = [1] as number[] & { extra?: number }; customArray.extra = 2;
  for (const value of [undefined, 1.2, NaN, Infinity, 2 ** 53, 1n, Symbol('x'), () => 1,
    new Date(), new Map(), Object.create({ inherited: true }), getter, hidden, cycle,
    [undefined], new Array(2), customArray, { value: undefined }, { [Symbol('key')]: 1 },
    { toJSON() { hookCalled = true; return 1; } }, { constructor: 'bad' }, { prototype: 'bad' },
    { '\ud800': 'bad' }, { key: '\udfff' },
  ]) assert.throws(() => canonicalJson(value));
  assert.equal(hookCalled, false);
  assert.equal(canonicalJson(-0), '0');
  assert.equal(canonicalJson(Object.assign(Object.create(null), { b: 2, a: 1 })), '{"a":1,"b":2}');
  const shared = { x: 1 };
  assert.equal(canonicalJson([shared, shared]), '[{"x":1},{"x":1}]');
});

test('strict SemVer retains exact build identity and the admitted 38-byte bound', () => {
  for (const version of ['0.0.0', '1.2.3', '1.0.0-0', '1.0.0-01a', '1.0.0-a.1+002.x', '1.0.0+01', '1.0.0+'.padEnd(38, 'x')]) {
    assert.equal(isExactSemver(version), true, version);
    const pack = content(); pack.version = version;
    assert.equal(validateContent(pack).content.version, version);
  }
  for (const version of [null, 1, '', 'v1.0.0', '1.0', '01.0.0', '1.01.0', '1.0.01', '1.0.0-01',
    '1.0.0-alpha.01', '1.0.0-', '1.0.0+', '1.0.0-a..b', '1.0.0+x..y', '1.0.0_a', '1.0.0\n',
    '1.0.0 ', '^1.0.0', '*', 'latest', '1.0.0+'.padEnd(39, 'x')]) assert.equal(isExactSemver(version), false, String(version));
  const first = content(); first.version = '1.0.0+first';
  const second = content(); second.version = '1.0.0+second';
  assert.notEqual(validateContent(first).digest, validateContent(second).digest);
});

test('text limits count Unicode scalar values without normalization', () => {
  const input = content(); input.title = '😀'.repeat(160);
  input.blocks[0]!.instruction = '😀'.repeat(4000);
  input.blocks[0]!.prompt = '😀'.repeat(1000);
  input.blocks[0]!.options[0] = '😀'.repeat(500);
  input.blocks[0]!.feedback[0] = '😀'.repeat(2000);
  assert.equal(validateContent(input).content.title, input.title);
  input.title += '😀'; assert.throws(() => validateContent(input));
  const composed = content(); composed.title = 'Café';
  const decomposed = content(); decomposed.title = 'Cafe\u0301';
  assert.notEqual(validateContent(composed).digest, validateContent(decomposed).digest);
  for (const text of ['<img src=x>', '<script/>', 'https://example.test', '//example.test/media', 'mailto:person@example.test', 'javascript:alert(1)', 'data:image/png;base64,abc', '\u0000']) {
    const invalid = content(); invalid.blocks[0]!.prompt = text; assert.throws(() => validateContent(invalid));
  }
});

test('canonical 64 KiB bound counts UTF-8 bytes, including exact-boundary acceptance', () => {
  const input = content();
  for (const block of input.blocks) {
    block.instruction = 'x'.repeat(4000); block.prompt = 'x'.repeat(1000);
    block.options = Array.from({ length: 5 }, (_, i) => String(i) + 'x'.repeat(499));
    block.feedback = Array.from({ length: 5 }, () => 'x'.repeat(2000));
  }
  const baselineBytes = Buffer.byteLength(canonicalJson(input));
  const extra = 65_536 - baselineBytes;
  assert.ok(extra > 0 && extra < 36_000);
  // Replacing one ASCII scalar with a four-byte scalar adds three bytes.
  let remaining = extra;
  for (const block of input.blocks) {
    const emojiCount = Math.min(4000, Math.floor(remaining / 3)); remaining -= emojiCount * 3;
    const twoByteCount = Math.min(4000 - emojiCount, remaining); remaining -= twoByteCount;
    block.instruction = '😀'.repeat(emojiCount) + 'é'.repeat(twoByteCount) + 'x'.repeat(4000 - emojiCount - twoByteCount);
  }
  assert.equal(Buffer.byteLength(canonicalJson(input)), 65_536);
  assert.equal(Buffer.byteLength(validateContent(input).canonicalJson), 65_536);
  input.blocks[2]!.instruction = 'é' + input.blocks[2]!.instruction.slice(1);
  assert.equal(Buffer.byteLength(canonicalJson(input)), 65_537);
  assert.throws(() => validateContent(input));
});

test('validated content is a detached immutable snapshot and public DTOs are allowlisted', () => {
  const original = content(), validated = validateContent(original);
  original.title = 'Changed'; original.blocks[0]!.feedback[0] = 'Changed';
  assert.equal(validated.content.title, 'A clear team handoff');
  assert.equal(validated.content.blocks[0]!.feedback[0], 'Pause rather than guess.');
  assert.throws(() => { validated.content.blocks[0]!.feedback[0] = 'Changed'; });
  const result = publicContent(validated);
  assert.deepEqual(Object.keys(result).sort(), ['blocks', 'contentPackId', 'contentVersion', 'organizationId', 'schemaVersion', 'synthetic', 'title']);
  assert.deepEqual(Object.keys(result.blocks[0]!).sort(), ['id', 'instruction', 'kind', 'options', 'prompt']);
  result.blocks[0]!.options[0] = 'Changed';
  assert.equal(validated.content.blocks[0]!.options[0], 'Guess.');
});

test('provisioned lesson equals the approved frozen template and has fresh scoped identities', () => {
  const approved = JSON.parse(readFileSync(new URL('../../domains/demo-runtime/proposal-0.1.0/learning-definition.json', import.meta.url), 'utf8')).synthetic_content_template;
  let index = 0;
  const first = newDemoContent('org_golden', () => `id_${++index}`);
  assert.equal(index, 4);
  assert.equal(first.digest, 'sha256:4d184f89b2c040bf8d89e25cf1ac1c8bdc3dab5da4bae46e072669cffa93a790');
  assert.deepEqual({
    schemaVersion: first.content.schemaVersion, version: first.content.version, title: first.content.title,
    blocks_template: first.content.blocks.map(({ id: _id, ...block }) => block),
  }, { schemaVersion: approved.schemaVersion, version: approved.version, title: approved.title, blocks_template: approved.blocks_template });
  const next = newDemoContent('org_other', () => `id_${++index}`);
  assert.notEqual(first.content.contentPackId, next.content.contentPackId);
  assert.notEqual(first.digest, next.digest);
  assert.equal(new Set([...first.content.blocks, ...next.content.blocks].map(block => block.id)).size, 6);
  assert.throws(() => newDemoContent('org', () => 'reused'));
  assert.throws(() => newDemoContent('invalid organization', () => `id_${++index}`));
});

test('frozen lesson all-choice engine vectors preserve exact authored feedback and order', () => {
  let index = 0;
  const pack = newDemoContent('org_golden', () => `id_${++index}`).content;
  const evaluations = pack.blocks.flatMap(block => block.options.map((_, selected) => evaluateResponse(pack, block.id, selected, 0)));
  assert.equal(evaluations.length, 9);
  assert.deepEqual(evaluations.map(evaluation => evaluation.matchesExpectedChoice), [false, true, false, true, false, false, false, false, true]);
  assert.deepEqual(evaluations.map(evaluation => evaluation.feedback), pack.blocks.flatMap(block => block.feedback));
  for (const evaluation of evaluations) {
    assert.equal(canonicalJson(evaluation), canonicalJson(evaluateResponse(pack, evaluation.blockId, evaluation.selectedOptionIndex, 0)));
    assert.deepEqual(Object.keys(evaluation).sort(), ['blockId', 'engineVersion', 'feedback', 'matchesExpectedChoice', 'selectedOptionIndex']);
  }
  const duplicate = content(); duplicate.blocks[1]!.id = duplicate.blocks[0]!.id;
  assert.throws(() => evaluateResponse(duplicate, 'block_0', 0, 0));
  for (const seed of [NaN, Infinity, -1, 0.5]) assert.throws(() => evaluateResponse(pack, pack.blocks[0]!.id, 0, seed));
});
