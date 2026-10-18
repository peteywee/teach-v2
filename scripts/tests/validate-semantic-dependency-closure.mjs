import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { inspectSemanticDependencyClosure } from '../kernel/semantic-dependency-closure.mjs';

// Synthetic promotion-shaped fixtures live only in memory. These tests do not
// change the kernel, ownership, authority, or any admission/promotion status.
const families = {
  'entities.json': 'entity', 'identifiers.json': 'identifier',
  'values.json': 'value_object', 'relationships.json': 'relationship',
  'states.json': 'state_set', 'state-machines.json': 'state_machine',
  'invariants.json': 'invariant', 'decision-tables.json': 'decision_table',
  'capabilities.json': 'capability', 'commands.json': 'command', 'events.json': 'event',
};
const entry = (id, kind, status = 'approved', fields = {}) => ({ id, kind, status, ...fields });
const fixture = (...rows) => {
  const docs = Object.fromEntries(Object.keys(families).map(file => [file, { entries: [] }]));
  for (const [file, value] of rows) docs[file].entries.push(value);
  return docs;
};
const fail = (docs, pattern) => {
  const result = inspectSemanticDependencyClosure(docs);
  assert.ok(result.errors.length, 'expected a dependency-closure failure');
  assert.match(result.errors.join('\n'), pattern);
  return result;
};
const live = Object.fromEntries(Object.keys(families).map(file => [file,
  JSON.parse(readFileSync(new URL(`../../kernel/${file}`, import.meta.url), 'utf8'))]));
const source = JSON.parse(readFileSync(new URL('../../domains/demo-runtime/source-baseline.json', import.meta.url), 'utf8'));
const historicalEntities = JSON.parse(source.files['kernel/entities.json']);
const heldMembership = historicalEntities.entries.find(item => item.id === 'Membership');
function runKernel(overrides = {}) {
  // Exercise the real CLI while changing only its in-memory read results.
  // No candidate is promoted, no registry file is written, and child changes
  // cannot leak into the remaining tests.
  const program = `
    import fs from 'node:fs';
    import { syncBuiltinESMExports } from 'node:module';
    const overrides = ${JSON.stringify(overrides)};
    const read = fs.readFileSync;
    fs.readFileSync = (path, options) => {
      const file = String(path).split('/kernel/')[1];
      return Object.hasOwn(overrides, file) ? JSON.stringify(overrides[file]) : read(path, options);
    };
    syncBuiltinESMExports();
    await import('./scripts/kernel/validate-semantic-kernel.mjs');
  `;
  return spawnSync(process.execPath, ['--input-type=module', '-e', program], {
    cwd: new URL('../../', import.meta.url), encoding: 'utf8', timeout: 5000,
  });
}
const holdFixture = (command = 'CreateMembership') => fixture(
  ['commands.json', entry(command, 'command', 'approved', { requires: ['Membership'] })],
  ['entities.json', structuredClone(heldMembership)],
);

test('SEM-36: every current approved entry passes without historical hold exceptions', () => {
  const before = JSON.stringify(live);
  const result = inspectSemanticDependencyClosure(live);
  assert.deepEqual(result.errors, []);
  assert.equal(result.approvedEntries, 236);
  assert.equal(result.checkedReferences, 583);
  assert.deepEqual(result.exceptions, []);
  assert.equal(JSON.stringify(live), before, 'validation must not mutate registry data');
});

test('SEM-36 CLI: current approved closure and absence of holds are visibly enumerated', () => {
  const result = runKernel();
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /SEM-36: checked 236 approved entries \/ 583 semantic references/);
  assert.match(result.stdout, /SEM-36 owner-directed hold exceptions: 0/);
  assert.doesNotMatch(result.stdout, /requires -> Membership:.*OQ-TEN-1/);
  assert.match(result.stdout, /Semantic kernel PASS: TEACH-K00 0\.18\.0/);
});

test('SEM-36 CLI: malformed live-entry references fail through actual checker wiring', () => {
  for (const field of ['requires', 'from', 'to', 'entity', 'emitted_by', 'scope']) {
    for (const value of [{ id: 'Membership' }, [['Membership']], true, 123, 'NoSuch Dependency']) {
      const entities = structuredClone(live['entities.json']);
      entities.entries.find(item => item.id === 'Identity')[field] = value;
      const result = runKernel({ 'entities.json': entities });
      assert.equal(result.status, 1, result.stdout + result.stderr);
      assert.match(result.stderr, new RegExp(`Identity\\.${field}.*dependency closure cannot be established.*SEM-36`));
    }
  }
});

test('SEM-36 CLI: a forged value-object kind cannot conceal a candidate identifier', () => {
  const identifiers = structuredClone(live['identifiers.json']);
  identifiers.entries.find(item => item.id === 'LocationId').kind = 'value_object';
  identifiers.entries.find(item => item.id === 'LocationId').status = 'candidate';
  const values = structuredClone(live['values.json']);
  values.entries.push(entry('LocationId', 'identifier'));
  const relationships = structuredClone(live['relationships.json']);
  relationships.entries.find(item => item.id === 'AssignmentReferencesContentPack').to = 'LocationId';
  const result = runKernel({ 'identifiers.json': identifiers, 'values.json': values, 'relationships.json': relationships });
  assert.equal(result.status, 1, result.stdout + result.stderr);
  assert.match(result.stderr, /AssignmentReferencesContentPack\.to -> LocationId: depends on candidate.*SEM-36/);
});

for (const [file, kind] of Object.entries(families)) {
  test(`SEM-36: ${file} approved sources cannot reference candidates or missing entries`, () => {
    for (const status of ['candidate', 'deprecated']) {
      fail(fixture(
        [file, entry('Source', kind, 'approved', { requires: ['Dependency'] })],
        ['entities.json', entry('Dependency', 'entity', status)],
      ), new RegExp(`Source\\.requires -> Dependency: depends on ${status}.*SEM-36`));
    }
    fail(fixture([file, entry('Source', kind, 'approved', { requires: ['UnknownDependency'] })]), /unregistered dependency.*SEM-36/);
    assert.deepEqual(inspectSemanticDependencyClosure(fixture(
      [file, entry('Source', kind, 'approved', { requires: ['Dependency'] })],
      ['entities.json', entry('Dependency', 'entity')],
    )).errors, []);
  });
  test(`SEM-36: dependencies in ${file} participate in the lookup`, () => {
    fail(fixture(
      ['commands.json', entry('Source', 'command', 'approved', { requires: ['Dependency'] })],
      [file, entry('Dependency', kind, 'candidate')],
    ), /Source\.requires -> Dependency: depends on candidate.*SEM-36/);
  });
}

for (const field of ['requires', 'from', 'to', 'entity', 'emitted_by', 'scope']) {
  for (const shape of ['scalar', 'array']) {
    test(`SEM-36: ${field} ${shape} rejects candidate and unknown reference IDs`, () => {
      for (const id of ['Dependency', 'UnknownDependency']) {
        const value = shape === 'array' ? [id] : id;
        fail(fixture(
          ['capabilities.json', entry('Source', 'capability', 'approved', { [field]: value })],
          ['entities.json', entry('Dependency', 'entity', 'candidate')],
        ), new RegExp(`Source\\.${field} -> ${id}:.*SEM-36`));
      }
    });
  }
}

test('SEM-36: typed relationship endpoints do not shadow approved identifiers with value-object homonyms', () => {
  const docs = fixture(
    ['relationships.json', entry('Link', 'relationship', 'approved', { to: ['SharedId'] })],
    ['identifiers.json', entry('SharedId', 'identifier')],
    ['values.json', entry('SharedId', 'value_object', 'candidate')],
  );
  assert.deepEqual(inspectSemanticDependencyClosure(docs).errors, []);
  assert.deepEqual(inspectSemanticDependencyClosure(Object.fromEntries(Object.entries(docs).reverse())).errors, []);
  docs['identifiers.json'].entries[0].status = 'candidate';
  docs['values.json'].entries[0].status = 'approved';
  fail(docs, /Link\.to -> SharedId: depends on candidate/);
});

test('SEM-36: an untyped homonym fails rather than choosing whichever registry was indexed last', () => {
  const docs = fixture(
    ['commands.json', entry('Source', 'command', 'approved', { requires: ['SharedId'] })],
    ['identifiers.json', entry('SharedId', 'identifier')],
    ['values.json', entry('SharedId', 'value_object', 'candidate')],
  );
  fail(docs, /ambiguous dependency/);
  fail(Object.fromEntries(Object.entries(docs).reverse()), /ambiguous dependency/);
});

test('SEM-36: mutable kind fields cannot substitute a different registry family', () => {
  const docs = fixture(
    ['relationships.json', entry('Link', 'relationship', 'approved', { to: 'Dependency' })],
    ['identifiers.json', entry('Dependency', 'value_object', 'candidate')],
    ['values.json', entry('Dependency', 'identifier')],
  );
  fail(docs, /Link\.to -> Dependency: depends on candidate/);
  docs['identifiers.json'].entries = [];
  fail(docs, /unregistered dependency/);
  for (const [file, kind, field, targetFile] of [
    ['events.json', 'event', 'emitted_by', 'commands.json'],
    ['state-machines.json', 'state_machine', 'entity', 'entities.json'],
  ]) {
    fail(fixture(
      [file, entry('Source', kind, 'approved', { [field]: 'Dependency' })],
      [targetFile, entry('Dependency', 'identifier', 'candidate')],
      ['identifiers.json', entry('Dependency', targetFile === 'commands.json' ? 'command' : 'entity')],
    ), /depends on candidate/);
  }
});

test('SEM-36: typed event and machine targets cannot be replaced by a different kind', () => {
  for (const [file, kind, field, targetKind] of [
    ['events.json', 'event', 'emitted_by', 'command'],
    ['state-machines.json', 'state_machine', 'entity', 'entity'],
  ]) {
    const targetFile = targetKind === 'command' ? 'commands.json' : 'entities.json';
    const docs = fixture(
      [file, entry('Source', kind, 'approved', { [field]: 'Dependency' })],
      [targetFile, entry('Dependency', targetKind, 'candidate')],
      ['identifiers.json', entry('Dependency', 'identifier')],
    );
    fail(docs, /depends on candidate/);
    docs[targetFile].entries = [];
    fail(docs, /unregistered dependency/);
  }
});

test('SEM-36: approved dependency cycles terminate and a transitive candidate still fails', () => {
  const docs = fixture(
    ['entities.json', entry('A', 'entity', 'approved', { requires: ['B'] })],
    ['entities.json', entry('B', 'entity', 'approved', { requires: ['A'] })],
    ['entities.json', entry('C', 'entity', 'candidate')],
  );
  assert.deepEqual(inspectSemanticDependencyClosure(docs).errors, []);
  docs['entities.json'].entries[1].requires.push('C');
  fail(docs, /B\.requires -> C: depends on candidate/);
});

test('SEM-36: every permitted hold edge is enumerated, not silently passed', () => {
  for (const command of ['CreateMembership', 'DeactivateMembership', 'RevokeMembership']) {
    const result = inspectSemanticDependencyClosure(holdFixture(command));
    assert.deepEqual(result.errors, []);
    assert.equal(result.exceptions.length, 1);
    assert.match(result.exceptions[0], new RegExp(`${command}\\.requires -> Membership:.*OQ-TEN-1`));
  }
});

test('SEM-36: missing, truthy and partial promotion_hold cannot impersonate owner direction', () => {
  for (const hold of [undefined, null, true, 'approved by owner', {}, { blocked_by: 'OQ-TEN-1' }]) {
    const docs = holdFixture();
    docs['entities.json'].entries[0].promotion_hold = hold;
    assert.deepEqual(fail(docs, /without the exact owner-directed hold/).exceptions, []);
  }
});

test('SEM-36: every recorded hold field must match exactly', () => {
  for (const field of Object.keys(heldMembership.promotion_hold)) {
    const docs = holdFixture();
    docs['entities.json'].entries[0].promotion_hold[field] += ' changed';
    fail(docs, /without the exact owner-directed hold/);
  }
  const docs = holdFixture();
  docs['entities.json'].entries[0].promotion_hold.extra_permission = true;
  fail(docs, /without the exact owner-directed hold/);
});

test('SEM-36: a listed command cannot use the Membership exception for another candidate', () => {
  const docs = holdFixture();
  docs['entities.json'].entries.push(entry('OtherCandidate', 'entity', 'candidate', {
    promotion_hold: structuredClone(heldMembership.promotion_hold),
  }));
  docs['commands.json'].entries[0].requires.push('OtherCandidate');
  const result = fail(docs, /OtherCandidate: depends on candidate/);
  assert.equal(result.exceptions.length, 1);
  assert.match(result.exceptions[0], /requires -> Membership:/);
});

test('SEM-36: hold permission is restricted to the exact source kind, file, field and target', () => {
  fail(holdFixture('OtherCommand'), /without the exact owner-directed hold/);
  for (const field of ['from', 'to', 'entity', 'emitted_by', 'scope']) {
    const docs = holdFixture();
    docs['commands.json'].entries[0][field] = docs['commands.json'].entries[0].requires;
    delete docs['commands.json'].entries[0].requires;
    fail(docs, /without the exact owner-directed hold/);
  }
  for (const [file, kind] of [['entities.json', 'entity'], ['capabilities.json', 'capability']]) {
    const docs = holdFixture();
    const command = docs['commands.json'].entries.pop();
    docs[file].entries.push({ ...command, kind });
    fail(docs, /without the exact owner-directed hold/);
  }
  const docs = holdFixture();
  docs['entities.json'].entries[0].kind = 'value_object';
  fail(docs, /without the exact owner-directed hold/);
});

test('SEM-36: an allowed held entry does not conceal additional candidate dependencies', () => {
  const docs = holdFixture();
  docs['entities.json'].entries[0].requires = ['OtherCandidate'];
  docs['entities.json'].entries.push(entry('OtherCandidate', 'entity', 'candidate'));
  const result = fail(docs, /Membership\.requires -> OtherCandidate: depends on candidate/);
  assert.equal(result.exceptions.length, 1);
});

test('SEM-36: candidate-only graphs are not approvals and do not trigger closure requirements', () => {
  const docs = fixture(['entities.json', entry('Candidate', 'entity', 'candidate', { requires: ['Missing'] })]);
  assert.deepEqual(inspectSemanticDependencyClosure(docs), { errors: [], exceptions: [], approvedEntries: 0, checkedReferences: 0 });
});

test('SEM-36: existing invariant scope labels are descriptions, not unknown semantic IDs', () => {
  for (const invariant of live['invariants.json'].entries) {
    assert.deepEqual(inspectSemanticDependencyClosure(fixture(
      ['invariants.json', entry('SyntheticInvariant', 'invariant', 'approved', { scope: invariant.scope })],
    )).errors, []);
  }
  fail(fixture(['invariants.json', entry('Source', 'invariant', 'approved', { scope: 'FutureScope' })]), /unregistered dependency/);
  fail(fixture(['capabilities.json', entry('Source', 'capability', 'approved', { scope: 'system' })]), /unregistered dependency/);
  fail(fixture(
    ['invariants.json', entry('Source', 'invariant', 'approved', { scope: 'system' })],
    ['entities.json', entry('system', 'entity', 'candidate')],
  ), /depends on candidate/);
});

test('SEM-36: surrounding whitespace cannot disguise candidate or unknown reference tokens', () => {
  for (const field of ['requires', 'from', 'to', 'entity', 'emitted_by', 'scope']) {
    for (const ref of ['  Dependency  ', '\tUnknownDependency\n']) {
      fail(fixture(
        ['capabilities.json', entry('Source', 'capability', 'approved', { [field]: ref })],
        ['entities.json', entry('Dependency', 'entity', 'candidate')],
      ), new RegExp(`Source\\.${field} -> ${ref.trim()}:.*SEM-36`));
    }
  }
});

test('SEM-36: absent/null/empty fields do not invent references or completeness requirements', () => {
  const docs = fixture(['capabilities.json', entry('Source', 'capability', 'approved', {
    requires: [null, ''], from: null, to: [], emitted_by: '',
    identifier: 'UnregisteredIdentifier', represents: 'UnregisteredRepresentation',
    transitions: [{ from: 'ACTIVE', to: 'INACTIVE' }], requirements: ['C01'],
  })]);
  assert.deepEqual(inspectSemanticDependencyClosure(docs).errors, []);
  docs['capabilities.json'].entries[0].requires.push('UnknownDependency');
  fail(docs, /unregistered dependency/);
});

for (const field of ['requires', 'from', 'to', 'entity', 'emitted_by', 'scope']) {
  test(`SEM-36: ${field} cannot establish PASS for uninspectable representations`, () => {
    for (const value of [{ id: 'Membership' }, [['Membership']], true, 123, 'NoSuch Dependency',
      'This prose mentions Membership but is not a registered reference representation.',
      [null, '', 'Dependency', { id: 'Membership' }]]) {
      const docs = fixture(
        ['capabilities.json', entry('Source', 'capability', 'approved', { [field]: value })],
        ['entities.json', entry('Dependency', 'entity')],
      );
      fail(docs, /dependency closure cannot be established for this representation \(SEM-36\)/);
    }
  });
}

for (const [file, kind] of Object.entries(families)) {
  test(`SEM-36: explicit ${file} reference cannot resolve a homonym in another family`, () => {
    const family = file.slice(0, -5);
    const other = family === 'values' ? 'identifiers.json' : 'values.json';
    const docs = fixture(
      ['commands.json', entry('Source', 'command', 'approved', { requires: [{ family, id: 'Shared' }] })],
      [file, entry('Shared', kind, 'candidate')],
      [other, entry('Shared', families[other], 'approved')],
    );
    fail(docs, /depends on candidate/);
    docs[file].entries.find(item => item.id === 'Shared').status = 'approved';
    assert.deepEqual(inspectSemanticDependencyClosure(docs).errors, []);
    docs[file].entries = docs[file].entries.filter(item => item.id !== 'Shared');
    fail(docs, /unregistered dependency/);
  });
}
test('SEM-36: explicit references reject unknown families, extra keys and malformed IDs', () => {
  for (const ref of [
    { family: 'unknown', id: 'Shared' }, { family: 'entities.json', id: 'Shared' },
    { family: 'entities', id: ' Shared' }, { family: 'entities', id: 'Shared', approved: true },
    { family: 'entities' }, { id: 'Shared' },
  ]) fail(fixture(['commands.json', entry('Source', 'command', 'approved', { requires: [ref] })]), /cannot be established/);
});
