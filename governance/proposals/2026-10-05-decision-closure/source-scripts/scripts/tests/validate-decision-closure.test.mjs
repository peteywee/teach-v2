// PROPOSED tests for scripts/verification/validate-decision-closure.mjs.
// Run from repository root: node --test scripts/tests/validate-decision-closure.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadPackage, validateDecisionClosure } from '../verification/validate-decision-closure.mjs';

const root = process.cwd();
const fresh = () => structuredClone(loadPackage(root));
const fails = (pkg, pattern) => {
  const { errors } = validateDecisionClosure(root, pkg);
  assert.ok(errors.some((e) => pattern.test(e)), `expected an error matching ${pattern}; got:\n${errors.join('\n') || '(none)'}`);
};

test('positive: package is consistent with the live repository', () => {
  const { errors } = validateDecisionClosure(root);
  assert.deepEqual(errors, []);
});

test('negative: dropping a row leaves a live question unmapped', () => {
  const p = fresh(); p.closure.rows = p.closure.rows.filter((r) => r.id !== 'OQ-CERT-2');
  fails(p, /OQ-CERT-2 has no row/);
});
test('negative: duplicate row', () => {
  const p = fresh(); p.closure.rows.push(structuredClone(p.closure.rows[0]));
  fails(p, /duplicate row/);
});
test('negative: tampered answer hash', () => {
  const p = fresh(); p.closure.rows[0].answer_register.packet_answer_sha256 = '0'.repeat(64);
  fails(p, /packet answer hash mismatch/);
});
test('negative: stale contract version on an open row', () => {
  const p = fresh(); const r = p.closure.rows.find((x) => x.live_state === 'UNRESOLVED'); r.contract_version_live = '0.0.1';
  fails(p, /stale/);
});
test('negative: READY row carrying a missing owner value', () => {
  const p = fresh(); const r = p.closure.rows.find((x) => x.closure_class === 'READY_TO_REGISTER'); r.missing_owner_values = ['x'];
  fails(p, /cannot carry missing owner values/);
});
test('negative: UNKNOWN row with no named missing value', () => {
  const p = fresh(); const r = p.closure.rows.find((x) => x.id === 'OQ-CERT-2'); r.missing_owner_values = [];
  fails(p, /requires a named missing value/);
});
test('negative: package claims owner approval', () => {
  const p = fresh(); p.closure.owner_approval_recorded = true;
  fails(p, /must not claim authority/);
});
test('negative: command removed from C14 matrix', () => {
  const p = fresh(); p.c14.operations = p.c14.operations.filter((o) => o.id !== 'OffboardIdentity');
  fails(p, /approved command OffboardIdentity missing/);
});
test('negative: one capability mapped to two operations (AUTHZ-2)', () => {
  const p = fresh(); p.c14.operations[1].capability = p.c14.operations[0].capability;
  fails(p, /AUTHZ-2/);
});
test('negative: bad capability grammar', () => {
  const p = fresh(); p.c14.operations[0].capability = 'Identity.Login';
  fails(p, /violates grammar/);
});
test('negative: cross-tenant scope (AUTHZ-20)', () => {
  const p = fresh(); p.c14.scopes.PLATFORM = 'x'; p.c14.operations[0].scope = 'PLATFORM';
  fails(p, /AUTHZ-20/);
});
test('negative: blocked operation granted to a bundle', () => {
  const p = fresh(); const o = p.c14.operations.find((x) => x.id === 'PublishContentPack'); o.bundles = ['org_admin'];
  fails(p, /held by a bundle|BLOCKED but granted/);
});
test('negative: capability without denial tests (AUTHZ-18)', () => {
  const p = fresh(); p.tests.cases = p.tests.cases.filter((c) => c.operation !== 'AssignContent'); p.tests.case_count = p.tests.cases.length;
  fails(p, /AssignContent has no cases/);
});
test('negative: route to an internal operation', () => {
  const p = fresh(); p.api.routes.push({ ...p.api.routes[0], method: 'POST', path: '/api/v1/memberships', operation: 'CreateMembership', capability: 'organization.membership.create' });
  fails(p, /unroutable operation CreateMembership/);
});
test('negative: proposal claims a mounted route', () => {
  const p = fresh(); p.api.routes[0].mounted = true;
  fails(p, /claims mounted/);
});
test('negative: unsafe method without Origin check', () => {
  const p = fresh(); const r = p.api.routes.find((x) => x.method === 'POST'); r.origin_check = false;
  fails(p, /without Origin check/);
});
test('negative: route outside /api/v1', () => {
  const p = fresh(); p.api.routes[0].path = '/v1/session';
  fails(p, /outside \/api\/v1/);
});
test('negative: disabled feature missing from deferred register', () => {
  const p = fresh(); p.deferred.entries = p.deferred.entries.filter((d) => d.oq !== 'OQ-PWA-1');
  fails(p, /OQ-PWA-1 REGISTER_AS_DISABLED but absent/);
});
test('negative: row marked RESOLVED while still open', () => {
  const p = fresh(); const r = p.closure.rows.find((x) => x.id === 'OQ-CERT-2'); r.live_state = 'RESOLVED'; r.registered_by = '#74';
  fails(p, /marked RESOLVED but is still unresolved/);
});
test('negative: row registered by #74 marked UNRESOLVED', () => {
  const p = fresh(); const r = p.closure.rows.find((x) => x.id === 'OQ-IDN-1'); r.live_state = 'UNRESOLVED'; r.registered_by = null;
  fails(p, /marked UNRESOLVED but is resolved/);
});
test('negative: operation with no owner (#67)', () => {
  const p = fresh(); p.c14.operations[0].owning_domain = null;
  fails(p, /missing owner/);
});
test('negative: command traced to the wrong module (#67)', () => {
  const p = fresh(); const o = p.c14.operations.find((x) => x.id === 'CreateMembership'); o.owning_domain = 'Identity';
  fails(p, /owner disagrees/);
});
test('negative: registry denial case removed (#67)', () => {
  const p = fresh(); p.tests.registry_cases = p.tests.registry_cases.filter((c) => c.case_id !== 'C14-REG-UNKNOWN-SCOPE-CLASS');
  fails(p, /registry case C14-REG-UNKNOWN-SCOPE-CLASS missing/);
});

// ---- revision 3 / 3.1: semantic binding, manifest, totals, envelope policy, registration form ----
import { cpSync, mkdtempSync, rmSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PKG, MANIFEST } from '../verification/validate-decision-closure.mjs';
function inCopy(mutate) {
  const dir = mkdtempSync(join(tmpdir(), 'decision-closure-'));
  try {
    cpSync(root, dir, { recursive: true, filter: (p) => !p.includes('/.git') && !p.includes('node_modules') });
    mutate(dir);
    return validateDecisionClosure(dir).errors;
  } finally { rmSync(dir, { recursive: true, force: true }); }
}
const edit = (dir, rel, fn) => writeFileSync(join(dir, rel), fn(readFileSync(join(dir, rel), 'utf8')));
const expectErr = (errors, pattern) => assert.ok(errors.some((e) => pattern.test(e)), `expected ${pattern}; got:\n${errors.join('\n') || '(none)'}`);

test('negative: changed selection token in governing document (SameSite=Lax -> Strict)', () => {
  const errors = inCopy((d) => edit(d, `${PKG}/04-session-transport-security-spec.md`, (t) => t.replaceAll('SameSite=Lax', 'SameSite=Strict')));
  expectErr(errors, /binding: OQ-SES-1 approved value missing/);
  expectErr(errors, /binding: OQ-SES-1 contradicting value present/);
  expectErr(errors, /manifest: sha256 drift .*04-session/);
});
test('negative: changed semantic value in the matrix row', () => {
  const p = fresh(); p.closure.rows.find((r) => r.id === 'OQ-SES-1').semantic_assertions[0].contains = ['SameSite=Strict'];
  fails(p, /binding: OQ-SES-1 approved value missing/);
});
test('negative: changed controlling-document bytes (whitespace only)', () => {
  const errors = inCopy((d) => edit(d, `${PKG}/09-governance-content-certification-web-packet.md`, (t) => t + '\n'));
  expectErr(errors, /manifest: sha256 drift .*09-governance/);
});
test('negative: changed artifact manifest entry', () => {
  const p = fresh(); p.manifest.artifacts[0].sha256 = '0'.repeat(64);
  fails(p, /manifest: sha256 drift/);
});
test('negative: manifest file edited without updating its sidecar hash', () => {
  const errors = inCopy((d) => edit(d, MANIFEST, (t) => t.replace('"revision": "r3.1"', '"revision": "r3.1x"')));
  expectErr(errors, /package-manifest.sha256 does not match/);
});
test('negative: altered totals', () => {
  const p = fresh(); p.closure.totals.live_unresolved = 48;
  fails(p, /totals: live_unresolved/);
});
test('negative: extra package artifact', () => {
  const errors = inCopy((d) => writeFileSync(join(d, `${PKG}/extra-notes.md`), 'x'));
  expectErr(errors, /unlisted package artifact .*extra-notes\.md/);
});
test('negative: missing package artifact', () => {
  const errors = inCopy((d) => rmSync(join(d, `${PKG}/deferred-feature-register.json`)));
  expectErr(errors, /listed artifact missing .*deferred-feature-register\.json/);
});
test('negative: manifest file counts do not match artifacts', () => {
  const p = fresh(); p.manifest.listed_artifact_counts.json = 7;
  fails(p, /manifest: listed artifact counts/);
});
test('negative: complete archive inventory does not match archive files', () => {
  const p = fresh(); p.manifest.archive_inventory.json = 8;
  fails(p, /manifest: archive inventory/);
});
test('negative: /api/ready put under the standard envelope', () => {
  const p = fresh(); p.api.boundary_exceptions.find((x) => x.path === '/api/ready').error_envelope = 'STANDARD_ENVELOPE';
  fails(p, /exception \/api\/ready envelope policy is wrong/);
});
test('negative: exception without envelope policy', () => {
  const p = fresh(); delete p.api.boundary_exceptions.find((x) => x.path === '/api/auth/callback/{provider}').error_envelope;
  fails(p, /has no envelope policy/);
});
test('negative: document proposes a new requirement ID (#75 registration form)', () => {
  const errors = inCopy((d) => edit(d, `${PKG}/06-identity-tenancy-manager-registration-packet.md`, (t) => t.replace('## 10. Definition of Done', 'Proposal: New IDN-31 for this rule.\n\n## 10. Definition of Done')));
  expectErr(errors, /proposes a new requirement\/acceptance ID/);
});
test('negative: manifest registration form adds IDs', () => {
  const p = fresh(); p.manifest.registration_form.new_requirement_ids = 4;
  fails(p, /registration form must add no requirement/);
});
