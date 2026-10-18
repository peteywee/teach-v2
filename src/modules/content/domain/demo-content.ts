import { createHash } from 'node:crypto';

// TEACH-DEMO-RUNTIME-2026-10-17@0.1.0: immutable, organization-bound teaching content.
export interface TeachingBlock {
  id: string;
  kind: 'SINGLE_CHOICE';
  instruction: string;
  prompt: string;
  options: string[];
  expectedOptionIndex: number;
  feedback: string[];
}

export interface TeachingRecipe {
  id: string;
  title: string;
  station: string;
  servings: number;
  ingredients: string[];
  steps: string[];
  reference: string;
}

interface TeachingContentBase {
  contentPackId: string;
  organizationId: string;
  version: string;
  title: string;
  blocks: TeachingBlock[];
}

export interface LegacyTeachingContent extends TeachingContentBase {
  schemaVersion: '1.0.0';
}

export interface RecipeTeachingContent extends TeachingContentBase {
  schemaVersion: '1.1.0';
  recipes: TeachingRecipe[];
}

export type TeachingContent = LegacyTeachingContent | RecipeTeachingContent;

export interface ValidatedContent {
  readonly content: TeachingContent;
  readonly canonicalJson: string;
  readonly digest: string;
}

const forbiddenKeys = new Set(['__proto__', 'prototype', 'constructor']);
const opaqueId = /^[A-Za-z0-9_-]{1,128}$/;
const maxCanonicalBytes = 65_536;
const numericIdentifier = '(?:0|[1-9][0-9]*)';
const prereleaseIdentifier = `(?:${numericIdentifier}|[0-9]*[A-Za-z-][0-9A-Za-z-]*)`;
const semver = new RegExp(`^${numericIdentifier}\\.${numericIdentifier}\\.${numericIdentifier}(?:-${prereleaseIdentifier}(?:\\.${prereleaseIdentifier})*)?(?:\\+[0-9A-Za-z-]+(?:\\.[0-9A-Za-z-]+)*)?$(?![\\s\\S])`);

function invalid(reason: string): never {
  throw new TypeError(`Invalid teaching content: ${reason}`);
}

function validUnicode(value: string): void {
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i);
    if (code >= 0xd800 && code <= 0xdbff) {
      const next = value.charCodeAt(++i);
      if (!(next >= 0xdc00 && next <= 0xdfff)) invalid('lone Unicode surrogate');
    } else if (code >= 0xdc00 && code <= 0xdfff) {
      invalid('lone Unicode surrogate');
    }
  }
}

function validKey(value: string): void {
  validUnicode(value);
  if (forbiddenKeys.has(value)) invalid('unsupported property');
}

/** Restricted canonical JSON. No coercion, toJSON hooks, getters, or silent omission. */
export function canonicalJson(value: unknown): string {
  const ancestors = new Set<object>();
  function encode(current: unknown, depth: number): string {
    if (depth > 128) invalid('excessive JSON depth');
    if (current === null) return 'null';
    if (typeof current === 'string') {
      validUnicode(current);
      return JSON.stringify(current);
    }
    if (typeof current === 'boolean') return current ? 'true' : 'false';
    if (typeof current === 'number') {
      if (!Number.isSafeInteger(current)) invalid('only safe decimal integers are supported');
      return String(current);
    }
    if (typeof current !== 'object') invalid('unsupported JSON value');
    if (ancestors.has(current)) invalid('cyclic JSON value');
    ancestors.add(current);
    try {
      if (Array.isArray(current)) {
        if (Reflect.ownKeys(current).length !== current.length + 1) invalid('unsupported array property or hole');
        const elements: string[] = [];
        for (let i = 0; i < current.length; i++) {
          const descriptor = Object.getOwnPropertyDescriptor(current, String(i));
          if (!descriptor || !('value' in descriptor) || !descriptor.enumerable) invalid('unsupported array property or hole');
          elements.push(encode(descriptor.value, depth + 1));
        }
        return `[${elements.join(',')}]`;
      }
      const prototype: unknown = Object.getPrototypeOf(current);
      if (prototype !== Object.prototype && prototype !== null) invalid('only plain JSON objects are supported');
      const keys = Reflect.ownKeys(current);
      if (keys.some(key => typeof key !== 'string')) invalid('unsupported symbol property');
      const fields = (keys as string[]).sort().map(key => {
        validKey(key);
        const descriptor = Object.getOwnPropertyDescriptor(current, key)!;
        if (!('value' in descriptor) || !descriptor.enumerable) invalid('unsupported object property');
        return `${JSON.stringify(key)}:${encode(descriptor.value, depth + 1)}`;
      });
      return `{${fields.join(',')}}`;
    } finally {
      ancestors.delete(current);
    }
  }
  return encode(value, 0);
}

/** Parse before JSON.parse can discard duplicate keys or round unsafe integers.
 * The optional HTTP mode still rejects malformed/non-finite numbers; content
 * publication always uses the default integer-only mode and canonicalJson.
 */
export function parseStrictJson(text: string, options: { allowFractionalNumbers?: boolean } = {}): unknown {
  if (typeof text !== 'string') invalid('JSON input must be a string');
  let position = 0;
  function whitespace(): void {
    while (position < text.length && /[\x20\t\r\n]/.test(text[position]!)) position++;
  }
  function string(): string {
    const start = position++;
    while (position < text.length) {
      const character = text[position++]!;
      if (character === '"') {
        let parsed: string;
        try { parsed = JSON.parse(text.slice(start, position)) as string; }
        catch { invalid('malformed JSON string'); }
        validUnicode(parsed);
        return parsed;
      }
      if (character === '\\') position++;
    }
    return invalid('unterminated JSON string');
  }
  function value(depth: number): unknown {
    if (depth > 128) invalid('excessive JSON depth');
    whitespace();
    const next = text[position];
    if (next === '"') return string();
    if (next === '{') {
      position++; whitespace();
      const result: Record<string, unknown> = {};
      const keys = new Set<string>();
      if (text[position] === '}') { position++; return result; }
      while (position < text.length) {
        if (text[position] !== '"') invalid('object key must be a JSON string');
        const key = string(); validKey(key);
        if (keys.has(key)) invalid('duplicate JSON key');
        keys.add(key); whitespace();
        if (text[position++] !== ':') invalid('missing object colon');
        result[key] = value(depth + 1); whitespace();
        const separator = text[position++];
        if (separator === '}') return result;
        if (separator !== ',') invalid('malformed JSON object');
        whitespace();
      }
      return invalid('unterminated JSON object');
    }
    if (next === '[') {
      position++; whitespace();
      const result: unknown[] = [];
      if (text[position] === ']') { position++; return result; }
      while (position < text.length) {
        result.push(value(depth + 1)); whitespace();
        const separator = text[position++];
        if (separator === ']') return result;
        if (separator !== ',') invalid('malformed JSON array');
      }
      return invalid('unterminated JSON array');
    }
    for (const [literal, parsed] of [['true', true], ['false', false], ['null', null]] as const) {
      if (text.startsWith(literal, position)) { position += literal.length; return parsed; }
    }
    const token = /^-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?(?:[eE][+-]?[0-9]+)?/.exec(text.slice(position))?.[0];
    if (!token) invalid('malformed JSON value');
    const parsed = Number(token);
    if (options.allowFractionalNumbers !== true && /[.eE]/.test(token)) invalid('floats are not supported');
    if (!Number.isFinite(parsed) || (Number.isInteger(parsed) && !Number.isSafeInteger(parsed))) invalid('unsupported JSON number');
    position += token.length;
    return parsed;
  }
  const result = value(0); whitespace();
  if (position !== text.length) invalid('trailing JSON data');
  return result;
}

/** Exact identity includes prerelease AND build metadata, without normalization. */
export function isExactSemver(value: unknown): value is string {
  return typeof value === 'string' && value.length <= 38 && semver.test(value);
}

function record(value: unknown, keys: readonly string[]): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) invalid('expected object');
  const ownKeys = Object.keys(value);
  if (ownKeys.length !== keys.length || keys.some(key => !Object.hasOwn(value, key))) invalid('missing or additional field');
  return value as Record<string, unknown>;
}

function identifier(value: unknown): string {
  if (typeof value !== 'string' || !opaqueId.test(value) || value.includes('\n')) invalid('invalid opaque identifier');
  return value;
}

function plainText(value: unknown, maxLength: number): string {
  if (typeof value !== 'string') invalid('expected plain text');
  validUnicode(value);
  const length = [...value].length;
  if (length < 1 || length > maxLength) invalid('plain text length out of bounds');
  if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value)
    || /<[^>]*>|\b(?:[A-Za-z][A-Za-z0-9+.-]*:\/\/|https?:|ftp:|file:|data:|javascript:|vbscript:|mailto:|tel:|www\.)|(?:^|[\s("'])\/\/\S+/i.test(value)) {
    invalid('HTML, scripts, URLs, media and control characters are not supported');
  }
  return value;
}

function block(value: unknown): TeachingBlock {
  const input = record(value, ['id', 'kind', 'instruction', 'prompt', 'options', 'expectedOptionIndex', 'feedback']);
  if (input.kind !== 'SINGLE_CHOICE') invalid('unsupported block kind');
  if (!Array.isArray(input.options) || input.options.length < 2 || input.options.length > 5) invalid('option count out of bounds');
  const options = input.options.map(option => plainText(option, 500));
  if (new Set(options).size !== options.length) invalid('duplicate option');
  if (typeof input.expectedOptionIndex !== 'number' || !Number.isInteger(input.expectedOptionIndex)
    || input.expectedOptionIndex < 0 || input.expectedOptionIndex >= options.length) invalid('expected option index out of bounds');
  if (!Array.isArray(input.feedback) || input.feedback.length !== options.length) invalid('feedback must match options');
  const feedback = input.feedback.map(value => plainText(value, 2000));
  return {
    id: identifier(input.id), kind: 'SINGLE_CHOICE', instruction: plainText(input.instruction, 4000),
    prompt: plainText(input.prompt, 1000), options, expectedOptionIndex: input.expectedOptionIndex, feedback,
  };
}

function recipe(value: unknown): TeachingRecipe {
  const input = record(value, ['id', 'title', 'station', 'servings', 'ingredients', 'steps', 'reference']);
  if (typeof input.servings !== 'number' || !Number.isInteger(input.servings)
    || input.servings < 1 || input.servings > 100) invalid('recipe servings out of bounds');
  if (!Array.isArray(input.ingredients) || input.ingredients.length < 1 || input.ingredients.length > 30) invalid('recipe ingredient count out of bounds');
  if (!Array.isArray(input.steps) || input.steps.length < 1 || input.steps.length > 20) invalid('recipe step count out of bounds');
  return {
    id: identifier(input.id), title: plainText(input.title, 160), station: plainText(input.station, 80),
    servings: input.servings, ingredients: input.ingredients.map(value => plainText(value, 500)),
    steps: input.steps.map(value => plainText(value, 2000)), reference: plainText(input.reference, 1000),
  };
}

/** Returns a detached, deeply frozen payload, binding the exact scope and version. */
export function validateContent(value: unknown): ValidatedContent {
  // Validate the full original value first: unsupported hidden properties or getters
  // must not vanish while a schema-shaped object is constructed below.
  canonicalJson(value);
  const schemaVersion = value && typeof value === 'object' && !Array.isArray(value)
    ? Object.getOwnPropertyDescriptor(value, 'schemaVersion')?.value : undefined;
  if (schemaVersion !== '1.0.0' && schemaVersion !== '1.1.0') invalid('unsupported schema version');
  const keys = ['schemaVersion', 'contentPackId', 'organizationId', 'version', 'title', 'blocks'];
  const input = record(value, schemaVersion === '1.1.0' ? [...keys, 'recipes'] : keys);
  if (!isExactSemver(input.version)) invalid('invalid exact SemVer');
  if (!Array.isArray(input.blocks) || input.blocks.length !== 3) invalid('exactly three blocks are required');
  const blocks = input.blocks.map(block);
  if (new Set(blocks.map(item => item.id)).size !== 3) invalid('duplicate block identifier');
  const base = {
    contentPackId: identifier(input.contentPackId), organizationId: identifier(input.organizationId),
    version: input.version, title: plainText(input.title, 160), blocks,
  };
  let content: TeachingContent;
  if (schemaVersion === '1.1.0') {
    if (!Array.isArray(input.recipes) || input.recipes.length !== 3) invalid('exactly three recipes are required');
    const recipes = input.recipes.map(recipe);
    if (new Set(recipes.map(item => item.id)).size !== 3) invalid('duplicate recipe identifier');
    for (const item of recipes) { Object.freeze(item.ingredients); Object.freeze(item.steps); Object.freeze(item); }
    Object.freeze(recipes);
    content = { schemaVersion, ...base, recipes };
  } else {
    content = { schemaVersion, ...base };
  }
  const canonical = canonicalJson(content);
  if (Buffer.byteLength(canonical, 'utf8') > maxCanonicalBytes) invalid('canonical content exceeds 64 KiB');
  for (const item of blocks) { Object.freeze(item.options); Object.freeze(item.feedback); Object.freeze(item); }
  Object.freeze(blocks); Object.freeze(content);
  return Object.freeze({ content, canonicalJson: canonical, digest: `sha256:${createHash('sha256').update(canonical, 'utf8').digest('hex')}` });
}

export function publicContent(validated: ValidatedContent) {
  const { content, digest } = validated;
  const base = {
    contentPackId: content.contentPackId, organizationId: content.organizationId,
    contentVersion: { version: content.version, digest }, schemaVersion: content.schemaVersion,
    title: content.title,
    blocks: content.blocks.map(({ id, kind, instruction, prompt, options }) => ({ id, kind, instruction, prompt, options: [...options] })),
    synthetic: true as const,
  };
  if (content.schemaVersion === '1.1.0') {
    return {
      ...base, schemaVersion: content.schemaVersion,
      recipes: content.recipes.map(({ id, title, station, servings, ingredients, steps, reference }) => ({
        id, title, station, servings, ingredients: [...ingredients], steps: [...steps], reference,
      })),
    };
  }
  return { ...base, schemaVersion: content.schemaVersion };
}
