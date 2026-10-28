import { installAuthoringPredecessor } from './authoring-predecessor-fixture.mjs';
import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { spawnSync, execFileSync } from 'node:child_process';
import { runInNewContext } from 'node:vm';
import { cpSync, mkdtempSync, readFileSync, writeFileSync, rmSync, mkdirSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { inspectDemoRuntimeRegistration, buildDemoKernelOverlay, createHistoricalSourceReader, DEMO_BASE, DEMO_PROPOSAL, inspectDemoCapabilityNames, DEMO_CAPABILITY_NAME_EXCEPTIONS } from '../kernel/demo-runtime-registration.mjs';
import { inspectCapabilityAdmission } from '../kernel/capability-admission.mjs';

const root = resolve(new URL('../..', import.meta.url).pathname);
const fixture = mkdtempSync(join(tmpdir(), 'teach-demo-registration-'));
for (const path of ['docs', 'scripts', '.github', 'verification', 'kernel', 'domains', 'contracts', 'application-interfaces', 'governance', 'persistence', 'drizzle', 'drizzle-isolated', 'src', 'tests']) cpSync(join(root, path), join(fixture, path), { recursive: true });
installAuthoringPredecessor(fixture);
after(() => rmSync(fixture, { recursive: true, force: true }));
const raw = path => readFileSync(join(fixture, path), 'utf8');
const json = path => JSON.parse(raw(path));
const proposal = json(`${DEMO_PROPOSAL}/registry-proposal.json`);
const rejected = (path, mutate, pattern = /demo registration|SEM-36/) => {
  const original = raw(path);
  try {
    writeFileSync(join(fixture, path), mutate(original));
    const result = inspectDemoRuntimeRegistration(fixture);
    assert.ok(result.errors.length, `accepted mutation of ${path}`);
    assert.match(result.errors.join('\n'), pattern);
  } finally { writeFileSync(join(fixture, path), original); }
};
const rejectedJson = (path, mutate, pattern) => rejected(path, text => {
  const value = JSON.parse(text); mutate(value); return JSON.stringify(value, null, 2) + '\n';
}, pattern);

// A snapshot can establish its historical facts only. Every current file is
// separately tied to the approved deterministic overlay or exact frozen hash.
test('exact demo successor proves 131 entries, 236 approved, 583 references and no holds', () => {
  for (const target of [root, fixture]) {
    const result = inspectDemoRuntimeRegistration(target);
    assert.deepEqual(result.errors, []);
    assert.equal(result.registeredEntries, 131);
    assert.equal(result.closure.approvedEntries, 236);
    assert.equal(result.closure.checkedReferences, 583);
    assert.deepEqual(result.closure.exceptions, []);
    const historical = inspectCapabilityAdmission(target);
    assert.deepEqual(historical.errors, []);
    assert.equal(historical.promotedEntries, 36);
    assert.equal(historical.closure.approvedEntries, 120);
    assert.equal(historical.closure.checkedReferences, 147);
    assert.equal(historical.closure.exceptions.length, 3);
  }
});

test('all 131 exact registered entries reject partial approval and deletion', () => {
  for (const entry of proposal.entries) {
    const path = `kernel/${entry.family}.json`;
    rejectedJson(path, doc => { doc.entries.find(row => row.id === entry.id).status = 'candidate'; }, /exact approved overlay/);
    rejectedJson(path, doc => { doc.entries = doc.entries.filter(row => row.id !== entry.id); }, /exact approved overlay/);
  }
});

test('every family rejects extra entries and unrelated status promotions', () => {
  for (const family of new Set(proposal.entries.map(entry => entry.family))) {
    rejectedJson(`kernel/${family}.json`, doc => { doc.entries.push({ ...doc.entries[0], id: 'UnapprovedExtra' }); }, /exact approved overlay/);
  }
  rejectedJson('kernel/events.json', doc => { doc.entries.find(entry => entry.id === 'MembershipCreated').status = 'approved'; }, /exact approved overlay/);
  rejectedJson('kernel/values.json', doc => { doc.entries.find(entry => entry.id === 'IdempotencyKey').status = 'approved'; }, /exact approved overlay/);
});

test('typed references cannot substitute a candidate homonym or wrong family', () => {
  rejectedJson('kernel/entities.json', doc => { doc.entries.find(entry => entry.id === 'CommandReceipt').requires.find(ref => ref.id === 'IdempotencyKey').family = 'values'; }, /depends on candidate/);
  rejectedJson('kernel/entities.json', doc => { doc.entries.find(entry => entry.id === 'DemoRun').requires[0].family = 'values'; }, /unregistered dependency/);
  rejectedJson('kernel/entities.json', doc => { doc.entries.find(entry => entry.id === 'DemoRun').requires.push({ family: 'unknown', id: 'DemoRunId' }); }, /cannot be established/);
  const deniedBeforeProjection = (changes, pattern) => {
    const originals = new Map(Object.keys(changes).map(path => [path, raw(path)]));
    try {
      for (const [path, mutate] of Object.entries(changes)) {
        const doc = JSON.parse(originals.get(path)); mutate(doc); writeFileSync(join(fixture, path), JSON.stringify(doc));
      }
      const result = inspectDemoRuntimeRegistration(fixture);
      assert.match(result.errors.join('\n'), pattern);
      assert.deepEqual(Object.keys(result).sort(), ['errors', 'registered']);
      assert.equal(result.registered, true);
    } finally { for (const [path, bytes] of originals) writeFileSync(join(fixture, path), bytes); }
  };
  deniedBeforeProjection({
    'kernel/identifiers.json': doc => { const entry = doc.entries.find(row => row.id === 'LocationId'); entry.kind = 'value_object'; entry.status = 'candidate'; },
    'kernel/values.json': doc => { doc.entries.push({ id: 'LocationId', kind: 'identifier', status: 'approved' }); },
    'kernel/relationships.json': doc => { doc.entries.find(row => row.id === 'AssignmentReferencesContentPack').to = 'LocationId'; },
  }, /AssignmentReferencesContentPack\.to -> LocationId: depends on candidate.*SEM-36/);
  deniedBeforeProjection({
    'kernel/entities.json': doc => { doc.entries.find(row => row.id === 'Identity').requires = { id: 'Membership' }; },
  }, /Identity\.requires.*dependency closure cannot be established.*SEM-36/);
});

test('Membership promotion removes only old hold and cannot promote candidate business events', () => {
  rejectedJson('kernel/entities.json', doc => { doc.entries.find(entry => entry.id === 'Membership').promotion_hold = { allowed: true }; }, /exact approved overlay/);
  rejectedJson('kernel/state-machines.json', doc => { doc.entries.find(entry => entry.id === 'MembershipStateMachine').creation_event = 'MembershipCreated'; }, /exact approved overlay/);
});

test('baseline bytes, exact owner evidence and proposal files are immutable', () => {
  rejectedJson(`${DEMO_BASE}/source-baseline.json`, doc => { doc.files['kernel/entities.json'] += '\n'; }, /immutable evidence|original source hash/);
  rejectedJson(`${DEMO_BASE}/owner-approval.json`, doc => { doc.response.text = 'approved'; }, /immutable evidence/);
  rejectedJson(`${DEMO_PROPOSAL}/registry-proposal.json`, doc => { doc.entries.pop(); }, /immutable package/);
  rejected(`${DEMO_PROPOSAL}/SHA256SUMS`, text => text + '\n', /immutable package/);
});

test('registration inventory, activation scope and authority hash allowlist cannot be forged', () => {
  const path = `${DEMO_BASE}/registration.json`;
  for (const flag of ['runtime_activation_authorized', 'physical_admission_performed', 'shared_or_production_execution_authorized']) rejectedJson(path, doc => { doc[flag] = true; });
  rejectedJson(path, doc => { doc.registered_entries.pop(); });
  rejectedJson(path, doc => { doc.authority_file_hashes['domains/capabilities/owner-approval.json'] = '0'.repeat(64); });
  rejectedJson(path, doc => { doc.authority_file_hashes = {}; });
});

test('manifest ancestry and exact one-owner assignments remain closed', () => {
  rejectedJson('kernel/manifest.json', doc => { doc.version = '0.19.0'; }, /metadata ancestry/);
  rejectedJson('kernel/manifest.json', doc => { doc.slice_p03_relationship_registration.issue = '#999'; }, /metadata ancestry/);
  rejectedJson('domains/ownership-map.json', doc => { doc.approval_history = []; }, /metadata ancestry/);
  rejectedJson('domains/ownership-map.json', doc => { doc.entries.find(entry => entry.id === 'DemoRun').proposed_owner = 'Identity'; }, /metadata ancestry/);
  rejectedJson('domains/ownership-map.json', doc => { doc.entries.pop(); }, /metadata ancestry/);
});

test('current immutable historical evidence is checked live, never hidden by baseline reads', () => {
  for (const path of [
    'domains/capabilities/owner-approval.json', 'domains/capabilities/registration.json',
    'domains/capabilities/proposal-0.1.1/SHA256SUMS', 'domains/commands-events/command-registration.json',
    'kernel/schema/capability-admission.schema.json', 'governance/decision-closure/api-error-envelope.schema.json',
  ]) rejected(path, text => text + '\n', /unchanged preceding source drift/);
  const reader = createHistoricalSourceReader(fixture);
  const path = 'domains/capabilities/owner-approval.json';
  const original = raw(path);
  try { writeFileSync(join(fixture, path), original + '\n'); assert.equal(reader(path), original + '\n'); }
  finally { writeFileSync(join(fixture, path), original); }
});

test('every registered changed authority file remains byte-bound to reviewed registration', () => {
  for (const path of Object.keys(json(`${DEMO_BASE}/registration.json`).authority_file_hashes)) rejected(path, text => text + '\n', /registered authority file differs/);
});

test('envelope collisions never rename ContentPack or replace LifecycleSnapshot definition', () => {
  const source = json(`${DEMO_BASE}/source-baseline.json`);
  const overlay = buildDemoKernelOverlay(source, proposal);
  const pack = overlay['kernel/entities.json'].entries.find(entry => entry.id === 'ContentPack');
  assert.equal(pack.fields.id, 'ContentPackId');
  assert.equal(pack.kind, 'entity');
  const snapshot = overlay['kernel/values.json'].entries.find(entry => entry.id === 'LifecycleSnapshot');
  assert.equal(snapshot.definition, proposal.entries.find(entry => entry.id === 'LifecycleSnapshot').definition);
  assert.equal(snapshot.fields.definition, 'authority-and-audit.md');
});

test('actual kernel, admission and historical discovery CLIs reject changed live authority', () => {
  const path = 'kernel/entities.json', original = raw(path);
  try {
    const doc = JSON.parse(original);
    doc.entries.find(entry => entry.id === 'DemoRun').definition = 'Unauthorized replacement';
    writeFileSync(join(fixture, path), JSON.stringify(doc));
    for (const script of ['kernel/validate-demo-runtime-registration.mjs', 'kernel/validate-semantic-kernel.mjs', 'kernel/validate-capability-admission.mjs', 'domains/validate-domain-ownership.mjs', 'domains/validate-state-discovery.mjs']) {
      const result = spawnSync(process.execPath, [join(root, 'scripts', script)], { cwd: fixture, encoding: 'utf8', timeout: 5000 });
      assert.equal(result.status, 1, result.stdout + result.stderr);
      assert.match(result.stderr, /exact approved overlay/);
    }
  } finally { writeFileSync(join(fixture, path), original); }
});

test('only three exact approved four-segment names extend baseline grammar', () => {
  const grammar = JSON.parse(json(`${DEMO_BASE}/source-baseline.json`).files['governance/decision-closure/c14-capability-matrix.json']).capability_identifier_grammar;
  assert.deepEqual(inspectDemoCapabilityNames(DEMO_CAPABILITY_NAME_EXCEPTIONS.map(id => ({ id })), grammar), []);
  for (const id of ['identity.demo.persona.admin', 'identity.demo.sessions.allow', 'identity.demo.everything.allow', 'RuntimeAgent']) {
    assert.equal(inspectDemoCapabilityNames([{ id }], grammar).length, 1, id);
  }
  rejectedJson('kernel/identifiers.json', doc => { doc.entries.find(entry => entry.id === 'CapabilityId').validation.pattern = '.*'; }, /exact approved overlay/);
  rejectedJson('kernel/capabilities.json', doc => { doc.entries.push({ ...doc.entries[0], id: 'identity.demo.everything.allow' }); }, /unapproved capability identifier grammar/);
});

test('frozen proposal directory rejects unexpected files and nested directories', () => {
  const file = join(fixture, DEMO_PROPOSAL, 'unauthorized.md');
  try { writeFileSync(file, 'not approved'); assert.match(inspectDemoRuntimeRegistration(fixture).errors.join('\n'), /directory inventory/); }
  finally { rmSync(file, { force: true }); }
  const directory = join(fixture, DEMO_PROPOSAL, 'extra');
  try { mkdirSync(directory); assert.match(inspectDemoRuntimeRegistration(fixture).errors.join('\n'), /directory inventory|regular files/); }
  finally { rmSync(directory, { recursive: true, force: true }); }
});

test('historical physical criterion order remains non-authoritative without allowing changed evidence', () => {
  const path = 'persistence/physical-slices/identity-tokens/admission.json', original = raw(path);
  try {
    const doc = JSON.parse(original); doc.criteria.reverse(); writeFileSync(join(fixture, path), JSON.stringify(doc));
    assert.deepEqual(inspectDemoRuntimeRegistration(fixture).errors, []);
    assert.deepEqual(JSON.parse(createHistoricalSourceReader(fixture)(path)).criteria, doc.criteria);
    doc.criteria[0].evidence += ' unauthorized'; writeFileSync(join(fixture, path), JSON.stringify(doc));
    assert.match(inspectDemoRuntimeRegistration(fixture).errors.join('\n'), /unchanged preceding source drift: persistence\/physical-slices\/identity-tokens\/admission\.json/);
  } finally { writeFileSync(join(fixture, path), original); }
});

test('active authority roots reject unregistered files, subdirectories and symlinks', () => {
  for (const directory of ['contracts', 'kernel', 'domains', 'governance/decision-closure', 'application-interfaces']) {
    const file = join(fixture, directory, 'unauthorized-runtime-grants.json');
    try { writeFileSync(file, '{"runtime_activation_authorized":true}'); assert.match(inspectDemoRuntimeRegistration(fixture).errors.join('\n'), /unexpected active authority file/); }
    finally { rmSync(file, { force: true }); }
    const extra = join(fixture, directory, 'unregistered');
    try { mkdirSync(extra); assert.match(inspectDemoRuntimeRegistration(fixture).errors.join('\n'), /unexpected active authority directory/); }
    finally { rmSync(extra, { recursive: true, force: true }); }
  }
  const link = join(fixture, 'governance/decision-closure/unregistered-link.json');
  try { symlinkSync('registration.json', link); assert.match(inspectDemoRuntimeRegistration(fixture).errors.join('\n'), /active authority must be regular file/); }
  finally { rmSync(link, { force: true }); }
});

test('validator harness never accepts expected stderr followed by timeout, signal or launch failure', () => {
  const source = readFileSync(join(root, 'scripts/tests/validate-validators.mjs'), 'utf8');
  const start = source.indexOf('const aggregateTimeouts ='), end = source.indexOf('function test(name, script, mutate, expect)', start);
  assert.ok(start > 0 && end > start);
  const runner = runInNewContext(`${source.slice(start, end)}; ({ runValidator, validatorResultMatches });`, {
    join,
    execFileSync: (command, args, options) => execFileSync(command, args, { ...options, timeout: 150 }),
  });
  const file = join(fixture, 'expected-diagnostic-hang.mjs');
  try {
    writeFileSync(file, "console.error('expected specific rejection'); setInterval(() => {}, 1000);\n");
    const timeout = runner.runValidator(fixture, 'expected-diagnostic-hang.mjs');
    assert.match(timeout.output, /expected specific rejection/);
    assert.equal(timeout.exit, 124);
    assert.equal(timeout.ordinaryProcessExit, false);
    assert.equal(runner.validatorResultMatches(timeout, { pattern: /expected specific rejection/ }), false);
    writeFileSync(file, "console.error('expected specific rejection'); process.kill(process.pid, 'SIGTERM');\n");
    const signal = runner.runValidator(fixture, 'expected-diagnostic-hang.mjs');
    assert.equal(signal.ordinaryProcessExit, false);
    assert.equal(runner.validatorResultMatches(signal, { pattern: /expected specific rejection/ }), false);
    writeFileSync(file, "console.error('expected specific rejection'); process.exit(1);\n");
    const rejection = runner.runValidator(fixture, 'expected-diagnostic-hang.mjs');
    assert.equal(rejection.ordinaryProcessExit, true);
    assert.equal(runner.validatorResultMatches(rejection, { pattern: /expected specific rejection/ }), true);
    const missing = { exit: 1, output: 'expected specific rejection', ordinaryProcessExit: false };
    assert.equal(runner.validatorResultMatches(missing, { pattern: /expected specific rejection/ }), false);
  } finally { rmSync(file, { force: true }); }
});
