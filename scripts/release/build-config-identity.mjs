#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const ALLOWED_KEYS = new Set([
  'schema_version',
  'environment',
  'non_secret',
  'secret_revisions',
  'required_secret_keys',
]);

export function buildConfigurationIdentity(input) {
  assertPlainObject(input, 'manifest');
  for (const key of Object.keys(input)) {
    if (!ALLOWED_KEYS.has(key)) {
      throw new Error(`configuration manifest: unsupported top-level field ${key}`);
    }
  }
  if (input.schema_version !== '1.0.0') {
    throw new Error('configuration manifest: schema_version must be 1.0.0');
  }
  if (typeof input.environment !== 'string' || input.environment.trim() === '') {
    throw new Error('configuration manifest: environment must be non-blank');
  }
  assertPlainObject(input.non_secret, 'non_secret');
  assertPlainObject(input.secret_revisions, 'secret_revisions');
  if (!Array.isArray(input.required_secret_keys)) {
    throw new Error('configuration manifest: required_secret_keys must be an array');
  }

  const required = [...new Set(input.required_secret_keys)].sort();
  for (const key of required) {
    if (typeof key !== 'string' || key.trim() === '') {
      throw new Error('configuration manifest: required secret keys must be non-blank strings');
    }
    const revision = input.secret_revisions[key];
    if (typeof revision !== 'string' || revision.trim() === '') {
      throw new Error(`configuration manifest: missing stable revision identity for required secret ${key}`);
    }
  }
  for (const [key, revision] of Object.entries(input.secret_revisions)) {
    if (typeof revision !== 'string' || revision.trim() === '') {
      throw new Error(`configuration manifest: secret revision ${key} must be a non-blank opaque revision identifier`);
    }
  }

  const normalized = {
    schema_version: '1.0.0',
    environment: input.environment,
    non_secret: input.non_secret,
    secret_revisions: input.secret_revisions,
    required_secret_keys: required,
  };
  const canonical_manifest = stableJson(normalized);
  const digest = createHash('sha256').update(canonical_manifest).digest('hex');
  return {
    algorithm: 'sha256',
    configuration_identity: `sha256:${digest}`,
    canonical_manifest,
  };
}

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function assertPlainObject(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`configuration manifest: ${label} must be an object`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const path = process.argv[2];
  if (!path) {
    console.error('usage: node scripts/release/build-config-identity.mjs <manifest.json>');
    process.exit(2);
  }
  try {
    const input = JSON.parse(readFileSync(path, 'utf8'));
    console.log(JSON.stringify(buildConfigurationIdentity(input), null, 2));
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
