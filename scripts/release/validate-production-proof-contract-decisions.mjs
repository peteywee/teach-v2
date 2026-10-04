#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = resolve(process.cwd());
const errors = [];
const load = (path) => {
  try { return JSON.parse(readFileSync(join(ROOT, path), 'utf8')); }
  catch (error) { errors.push(`${path}: ${error.message}`); return null; }
};
const text = (path) => {
  try { return readFileSync(join(ROOT, path), 'utf8'); }
  catch (error) { errors.push(`${path}: ${error.message}`); return ''; }
};

const decision = load('production-proof/issue-30-decisions.json');
const c21 = text('contracts/c21-database-migration-contract.md');
const c52 = text('contracts/c52-deployment-release-recovery-contract.md');
const index = text('contracts/README.md');
const approvals = text('contracts/APPROVAL-RECORD.md');
const readiness = load('persistence/physical-slices/readiness.json');

if (
  decision?.decision_id !== 'TEACH-PRODUCTION-PROOF-OWNER-DECISIONS' ||
  decision?.version !== '1.0.0' ||
  decision?.status !== 'recorded' ||
  decision?.issue !== '#30'
) errors.push('production proof decisions: decision record identity/state mismatch');

const selections = new Map((decision?.decisions ?? []).map((entry) => [entry.id, entry.selection]));
for (const [id, expected] of [
  ['OQ-MIG-1', 'MIGRATION_SCOPED_PLATFORM_NATIVE_BACKUP'],
  ['OQ-MIG-2', 'ISOLATED_RESTORE_MAX_30D'],
  ['OQ-REL-2', 'CANONICAL_CONFIG_MANIFEST_SHA256'],
]) {
  if (selections.get(id) !== expected) errors.push(`production proof decisions: ${id} must be ${expected}`);
}

if (!c21.includes('"version": "1.1.0"') || !c21.includes('| Version            | 1.1.0')) {
  errors.push('production proof decisions: C21 1.1.0 missing');
}
if (!c21.includes('MIGRATION_SCOPED_PLATFORM_NATIVE_BACKUP') || !c21.includes('ISOLATED_RESTORE_MAX_30D')) {
  errors.push('production proof decisions: C21 resolved-decision text missing');
}
if (c21.includes('| OQ-MIG-1 |') || c21.includes('| OQ-MIG-2 |')) {
  errors.push('production proof decisions: resolved C21 questions still listed as open');
}
if (!c21.includes('automated backups at least daily') || !c21.includes('no older than 30 days')) {
  errors.push('production proof decisions: C21 policy semantics drifted');
}

if (!c52.includes('"version": "1.1.0"') || !c52.includes('| Version            | 1.1.0')) {
  errors.push('production proof decisions: C52 1.1.0 missing');
}
if (!c52.includes('CANONICAL_CONFIG_MANIFEST_SHA256') || c52.includes('| OQ-REL-2 |')) {
  errors.push('production proof decisions: C52 OQ-REL-2 resolution missing');
}
if (!c52.includes('SHA-256 of the sorted canonical manifest') || !c52.includes('never raw secret values or secret-derived hashes')) {
  errors.push('production proof decisions: C52 configuration-identity semantics drifted');
}

if (!index.includes('"version": "0.14.0"') || !index.includes('- Package version: `0.14.0`')) {
  errors.push('production proof decisions: contract package must be 0.14.0');
}
if (!index.includes('| C21 |') || !index.includes('| 1.1.0   | `MIG`') || !index.includes('| 1.1.0   | `REL`')) {
  errors.push('production proof decisions: C21/C52 index versions not synchronized');
}
if (!index.includes('**386**') || !index.includes('**262**') || !index.includes('**71**') || !index.includes('**19**')) {
  errors.push('production proof decisions: contract totals not synchronized');
}
if (!approvals.includes('- Contract package version: `0.14.0`') || !approvals.includes('## Part 22 — Production-proof owner decisions')) {
  errors.push('production proof decisions: canonical approval ledger missing');
}
for (const selection of [
  'MIGRATION_SCOPED_PLATFORM_NATIVE_BACKUP',
  'ISOLATED_RESTORE_MAX_30D',
  'CANONICAL_CONFIG_MANIFEST_SHA256',
]) {
  if (!approvals.includes(selection)) errors.push(`production proof decisions: approval ledger missing ${selection}`);
}

if (readiness?.implementation_guard?.shared_or_production_migration_execution_authorized !== false) {
  errors.push('production proof decisions: shared/production migration execution must remain blocked');
}
if (decision?.effects?.shared_or_production_migration_execution_authorized !== false ||
    decision?.effects?.production_promotion_authorized !== false ||
    decision?.effects?.production_provider_capability_proven !== false) {
  errors.push('production proof decisions: decision package over-authorizes production');
}

if (errors.length) {
  console.error(`PRODUCTION PROOF DECISIONS FAILED (${errors.length} problem${errors.length === 1 ? '' : 's'}):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}
console.log('PRODUCTION PROOF DECISIONS PASS');
console.log('C21: 1.1.0 / blocking open questions: 0');
console.log('C52: 1.1.0 / blocking open questions: 0');
console.log('Package: 0.14.0');
console.log('Shared/production migration execution: BLOCKED pending concrete provider/release evidence');
