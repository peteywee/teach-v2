import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// Persistence Model 1.0.0's complete gate. Evidence text documents a proof;
// the owning slice validator still checks its semantic prerequisites.
export const requiredAdmissionCriteria = Object.freeze([
  'entity is approved',
  'canonical identifier is approved',
  'every persisted lifecycle state set is approved',
  'every relationship/cardinality encoded by the schema is approved',
  'no blocking open question changes the record shape',
  'owning module is explicit',
  'protected ownership/scope fields are derivable from approved semantics',
  'migration and acceptance evidence plan exists',
]);

export function inspectAdmissionCriteria(authority, admission, label) {
  const errors = [];
  const fail = (message) => errors.push(`${label} admission: ${message}`);
  const expected = new Set(requiredAdmissionCriteria);
  const policy = authority?.schema_admission_gate?.criteria;
  if (!Array.isArray(policy) || policy.length !== expected.size ||
      new Set(policy).size !== expected.size || policy.some((name) => !expected.has(name))) {
    fail('Persistence Model must define the exact eight distinct admission criteria');
  }
  const criteria = admission?.criteria;
  if (!Array.isArray(criteria)) {
    fail('criteria must be an array containing the exact eight distinct criteria');
    return errors;
  }
  if (criteria.length !== expected.size) fail('exactly eight distinct criteria required');
  const seen = new Set();
  for (const item of criteria) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      fail('criterion must be an object');
      continue;
    }
    if (!expected.has(item.criterion)) fail(`unknown criterion ${JSON.stringify(item.criterion)}`);
    if (seen.has(item.criterion)) fail(`duplicate criterion ${JSON.stringify(item.criterion)}`);
    seen.add(item.criterion);
    if (item.state !== 'PROVEN') fail('all eight Persistence Model criteria must be PROVEN');
    if (typeof item.evidence !== 'string' || item.evidence.trim().length === 0) {
      fail(`non-blank evidence required for ${JSON.stringify(item.criterion)}`);
    }
  }
  for (const name of expected) if (!seen.has(name)) fail(`missing criterion ${JSON.stringify(name)}`);
  return errors;
}

export const sliceAdmissionPaths = Object.freeze([
  'transaction-control', 'identity-session', 'identity-tokens', 'identity-credentials', 'learning-session',
]);

export function inspectAllAdmissionCriteria(root) {
  const errors = [];
  const load = (path) => {
    try { return JSON.parse(readFileSync(join(root, path), 'utf8')); }
    catch (error) { errors.push(`${path}: ${error.message}`); return null; }
  };
  const authority = load('persistence/authority.json');
  for (const [index, lane] of sliceAdmissionPaths.entries()) {
    const admission = load(`persistence/physical-slices/${lane}/admission.json`);
    errors.push(...inspectAdmissionCriteria(authority, admission, `SLICE-P0${index + 1}`));
  }
  return errors;
}
