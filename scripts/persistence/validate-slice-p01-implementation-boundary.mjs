#!/usr/bin/env node
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve, relative } from 'node:path';

const ROOT = resolve(process.cwd());
const errors = [];
const load = (p) => JSON.parse(readFileSync(join(ROOT, p), 'utf8'));
const text = (p) => readFileSync(join(ROOT, p), 'utf8');

const admission = load(
  'persistence/physical-slices/transaction-control/admission.json',
);
const readiness = load('persistence/physical-slices/readiness.json');
const implementation = load(
  'persistence/physical-slices/transaction-control/implementation.json',
);
const identifiers = load('kernel/identifiers.json');
const values = load('kernel/values.json');
const schema = text(
  'src/modules/transaction-control/infrastructure/persistence/schema.ts',
);
const repository = text(
  'src/modules/transaction-control/infrastructure/persistence/postgres-reconciliation-record-repository.ts',
);
const domain = text(
  'src/modules/transaction-control/domain/reconciliation-record.ts',
);
const migration = text('drizzle/0000_slice_p01_reconciliation.sql');
const snapshot = load('drizzle/meta/0000_snapshot.json');
const lockfile = text('pnpm-lock.yaml');

if (
  admission?.version !== '2.0.0' ||
  admission?.decision !== 'ADMIT' ||
  admission?.implementation_authorized !== true
) {
  errors.push('SLICE-P01 implementation: active ADMIT authority missing');
}
if (
  readiness?.version !== '0.8.0' ||
  readiness?.current_admitted_slice_count !== 1 ||
  readiness?.current_physical_slice_admissions?.[0]?.id !== 'SLICE-P01' ||
  readiness?.candidate_slices?.find((entry) => entry.id === 'SLICE-P01')?.current_state !== 'IMPLEMENTED'
) {
  errors.push('SLICE-P01 implementation: readiness does not record exactly SLICE-P01 as implemented');
}
if (
  implementation?.version !== '1.0.0' ||
  implementation?.status !== 'recorded' ||
  implementation?.verification_source_commit !== '8147efa69ce9c4c4bd93d4a1529e116edcf1776a'
) {
  errors.push('SLICE-P01 implementation: canonical verified implementation record missing');
}
if (
  readiness?.implementation_guard
    ?.shared_or_production_migration_execution_authorized !== false
) {
  errors.push(
    'SLICE-P01 implementation: shared/production migration execution must remain blocked',
  );
}

const idempotencyIdentifier = identifiers?.entries?.find(
  (entry) => entry.id === 'IdempotencyKey',
);
if (
  idempotencyIdentifier?.status !== 'approved' ||
  idempotencyIdentifier?.owning_domain !== 'TransactionControl'
) {
  errors.push(
    'SLICE-P01 implementation: approved TransactionControl IdempotencyKey identifier required',
  );
}

const candidateValue = values?.entries?.find(
  (entry) => entry.id === 'IdempotencyKey',
);
if (candidateValue?.status !== 'candidate') {
  errors.push(
    'SLICE-P01 implementation: expected candidate duplicate value-object representation to remain non-authoritative',
  );
}
if (!schema.includes('kernel/identifiers.json:IdempotencyKey')) {
  errors.push(
    'SLICE-P01 implementation: schema must document approved identifier authority for idempotency_key',
  );
}


if (
  snapshot?.version !== '7' ||
  !snapshot?.tables?.['public.transaction_control_reconciliation_records']
) {
  errors.push(
    'SLICE-P01 implementation: Drizzle baseline snapshot missing or does not contain the admitted table',
  );
}
if (
  !lockfile.includes("lockfileVersion: '9.0'") ||
  !lockfile.includes('drizzle-orm@0.45.3') ||
  !lockfile.includes('pg@8.23.1')
) {
  errors.push(
    'SLICE-P01 implementation: frozen pnpm lockfile missing admitted implementation dependencies',
  );
}

const createTables = migration.match(/CREATE TABLE/gi) ?? [];
if (createTables.length !== 1) {
  errors.push(
    `SLICE-P01 implementation: migration must create exactly one table, found ${createTables.length}`,
  );
}
if (!migration.includes('"transaction_control_reconciliation_records"')) {
  errors.push('SLICE-P01 implementation: reconciliation table missing');
}
if (/UNIQUE[^;\n]*idempotency_key/i.test(migration)) {
  errors.push(
    'SLICE-P01 implementation: idempotency_key must not be globally unique; cardinality is many-to-zero-or-one',
  );
}
if (!repository.includes('pg_advisory_xact_lock')) {
  errors.push(
    'SLICE-P01 implementation: concurrency-safe idempotency binding guard missing',
  );
}
const inputStart = domain.indexOf(
  'export interface OpenReconciliationRecordInput {',
);
const inputEnd =
  inputStart >= 0 ? domain.indexOf('\n}', inputStart) : -1;
const openInputBody =
  inputStart >= 0 && inputEnd > inputStart
    ? domain.slice(inputStart, inputEnd)
    : '';
if (
  openInputBody.includes('scopeFingerprint') ||
  !openInputBody.includes('authoritativeScope') ||
  !repository.includes('deriveScopeFingerprint(input.authoritativeScope)') ||
  !repository.includes('deriveScopeFingerprint(authoritativeScope)')
) {
  errors.push(
    'SLICE-P01 implementation: scope fingerprint must be derived from one authoritative scope object',
  );
}
if (
  !migration.includes(
    'transaction_control_guard_reconciliation_record_update_trigger',
  )
) {
  errors.push('SLICE-P01 implementation: immutable scope/terminal-state trigger missing');
}

for (const file of walk(join(ROOT, 'src', 'modules'))) {
  const rel = relative(ROOT, file).replaceAll('\\', '/');
  if (rel.startsWith('src/modules/transaction-control/')) continue;
  const body = readFileSync(file, 'utf8');
  if (
    body.includes(
      'transaction-control/infrastructure/persistence',
    )
  ) {
    errors.push(
      `SLICE-P01 implementation: foreign module imports TransactionControl persistence: ${rel}`,
    );
  }
}

if (errors.length) {
  console.error(
    `SLICE-P01 IMPLEMENTATION BOUNDARY FAILED (${errors.length} problem${errors.length === 1 ? '' : 's'}):`,
  );
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log('SLICE-P01 IMPLEMENTATION BOUNDARY PASS');
console.log('Physical tables in slice: 1');
console.log('IdempotencyKey storage authority: approved identifier');
console.log('Candidate value-object representation consumed: false');
console.log('Shared/production migration execution authorized: false');

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) out.push(...walk(path));
    else if (/\.(?:ts|js|mjs)$/.test(name)) out.push(path);
  }
  return out;
}
