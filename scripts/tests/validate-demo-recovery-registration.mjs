import { spawnSync } from 'node:child_process';
import { inspectConsolidatedVerification, preservedRegistrationTestBytes } from '../verification/consolidated-ci-evidence.mjs';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { cpSync, mkdtempSync, readFileSync, writeFileSync, renameSync, symlinkSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { RECOVERY_BASE as BASE, RECOVERY_REGISTRATION, RECOVERY_REVIEW, RECOVERY_REVIEW_SHA256, RECOVERY_AUTHORITY_PATHS, RECOVERY_ARCHIVES, RECOVERY_SOURCE_REVISIONS, RECOVERY_SOURCE_ADDITIONS, inspectDemoRecoveryRegistration } from '../kernel/demo-recovery-registration.mjs';
import { inspectSchemaIsolationRegistration } from '../kernel/demo-schema-isolation-registration.mjs';
import { inspectSchemaIsolationEngineering } from '../verification/demo-schema-isolation-engineering.mjs';
const root = resolve(new URL('../..', import.meta.url).pathname);
const fixture = mkdtempSync(join(tmpdir(), 'teach-recovery-registration-'));
for (const name of ['docs', 'scripts', '.github', 'kernel', 'domains', 'contracts', 'application-interfaces', 'governance', 'persistence', 'drizzle', 'drizzle-isolated', 'verification', 'src', 'tests']) cpSync(join(root, name), join(fixture, name), { recursive: true });
after(() => rmSync(fixture, { recursive: true, force: true }));
const raw = path => readFileSync(join(fixture, path), 'utf8');
const denied = () => {
  const result = inspectDemoRecoveryRegistration(fixture);
  assert.ok(result.errors.length);
  for (const field of ['predecessorFiles', 'predecessorSources']) assert.deepEqual(result[field], {});
  for (const field of ['revisedPaths', 'addedPaths']) assert.deepEqual(result[field], []);
  assert.throws(() => preservedRegistrationTestBytes(fixture));
  assert.ok(inspectSchemaIsolationRegistration(fixture).errors.length);
  assert.ok(inspectSchemaIsolationEngineering(fixture).errors.length);
};
const change = (path, mutate) => { const before = raw(path); try { writeFileSync(join(fixture, path), mutate(before)); denied(); } finally { writeFileSync(join(fixture, path), before); } };
const reviewReady = { skip: !RECOVERY_REVIEW_SHA256 ? 'Real independent review is pending; no synthetic PASS is issued.' : false };
test('unsealed adoption fails closed; sealed adoption exposes only finite predecessor bytes', () => {
  if (!RECOVERY_REVIEW_SHA256) { denied(); return; }
  const result = inspectDemoRecoveryRegistration(fixture);
  assert.deepEqual(result.errors, []);
  assert.equal(createHash('sha256').update(preservedRegistrationTestBytes(fixture)).digest('hex'), '0aec40789483d97aafbeaa69846037de42b7f2f8a71c34979cd74aac8ce5a639');
  assert.deepEqual(result.revisedPaths, [...RECOVERY_AUTHORITY_PATHS]);
  assert.deepEqual(result.addedPaths, [...RECOVERY_ARCHIVES]);
  assert.deepEqual(Object.keys(result.predecessorSources), [...RECOVERY_SOURCE_REVISIONS]);
  assert.deepEqual(inspectSchemaIsolationRegistration(fixture).errors, []);
  assert.deepEqual(inspectSchemaIsolationEngineering(fixture).errors, []);
});
test('every current authority and source byte and every adoption evidence record is sealed', reviewReady, () => {
  for (const path of [...RECOVERY_AUTHORITY_PATHS, ...RECOVERY_ARCHIVES, ...RECOVERY_SOURCE_REVISIONS, ...RECOVERY_SOURCE_ADDITIONS, RECOVERY_REGISTRATION, RECOVERY_REVIEW, ...['source-baseline.json', 'source-compatibility-baseline.json', 'owner-adoption.json'].map(name => `${BASE}/${name}`)]) change(path, text => text + '\n');
});
test('caller rehashed authority, injected paths, wrong target and live authority do not expand adoption', reviewReady, () => {
  for (const mutate of [value => { value.project_id = 'other'; }, value => { value.operation = 'LATER_MIGRATION'; }, value => { value.live_database_changes_authorized = true; }, value => { value.actual_recovery_evidence = 'PASS'; }, value => { value.authority_file_hashes['../../outside'] = '0'.repeat(64); }, value => { value.source_current_sha256['contracts/C00.md'] = '0'.repeat(64); }, value => { value.predecessor_file_hashes[RECOVERY_AUTHORITY_PATHS[0]] = '0'.repeat(64); }]) change(RECOVERY_REGISTRATION, text => { const value = JSON.parse(text); mutate(value); return JSON.stringify(value, null, 2) + '\n'; });
});
test('missing review, missing registration, symlink evidence and source ancestors fail closed', reviewReady, () => {
  for (const path of [RECOVERY_REVIEW, RECOVERY_REGISTRATION, `${BASE}/source-baseline.json`, 'scripts/kernel']) {
    const original = join(fixture, path), held = join(fixture, 'held-evidence');
    try { renameSync(original, held); denied(); symlinkSync(held, original); denied(); }
    finally { rmSync(original, { force: true }); renameSync(held, original); }
  }
});

test('workflow drift blocks the new seal and still exercises specific checkpoint-order control', reviewReady, () => {
  const path='.github/workflows/development-self-audit.yml',before=raw(path);
  try {
    const changed=before.replace('        run: node scripts/verification/run-self-audit.mjs --stage authority\n','        run: node scripts/verification/run-self-audit.mjs --stage removed_authority\n');
    assert.notEqual(changed,before);writeFileSync(join(fixture,path),changed);
    const errors=inspectConsolidatedVerification(fixture).join('\n');
    assert.match(errors,/current source differs: \.github\/workflows\/development-self-audit\.yml/);
    assert.match(errors,/complete ordered checkpoint workflow required/);
    assert.throws(()=>preservedRegistrationTestBytes(fixture),/current source differs/);
  }finally{writeFileSync(join(fixture,path),before);}
});

// Exercise every existing workflow-negative route, not just the leaf inspector.
for(const [name,script,from,to,pattern] of [
 ['omitted checkpoint','scripts/verification/validate-development-self-audit.mjs','--stage typecheck','--stage invented',/complete ordered/],
 ['missing finalizer','scripts/verification/validate-development-self-audit.mjs','if: always()','if: success()',/finalize and be retained/],
 ['missing Identity PG','scripts/verification/validate-development-self-audit.mjs','run: node scripts/verification/run-self-audit.mjs --stage postgres-identity-commands','run: echo skipped',/atomic Identity integration/],
 ['missing session PG','scripts/verification/validate-legacy-foundation-recovery.mjs','run: node scripts/verification/run-self-audit.mjs --stage postgres-session-commands','run: echo skipped',/session transaction PG automation/],
 ['path-filtered PR','scripts/architecture/validate-repository-integration.mjs','pull_request:',"pull_request:\n    paths: ['src/**']",/physical proofs must run on every PR and main tree/],
])test(`workflow route ${name} retains seal denial and specific control`,reviewReady,()=>{
 const path='.github/workflows/development-self-audit.yml',before=raw(path);
 try{
  const changed=before.replace(from,to);assert.notEqual(changed,before);writeFileSync(join(fixture,path),changed);
  const run=spawnSync(process.execPath,[script],{cwd:fixture,encoding:'utf8',timeout:5000});
  assert.equal(run.error,undefined);assert.equal(run.signal,null);assert.equal(run.status,1);
  const output=run.stdout+run.stderr;assert.match(output,/current source differs: \.github\/workflows\/development-self-audit\.yml/);assert.match(output,pattern);
 }finally{writeFileSync(join(fixture,path),before);}
});
