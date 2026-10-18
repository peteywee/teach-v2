import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { copyFileSync, existsSync, linkSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import {
  buildDemoHostedPackage, validateDemoHostedPackage, HOSTED_PACKAGE_FILES,
  HOSTED_PACKAGE_MANIFEST, HOSTED_RUNTIME_SOURCES, HOSTED_WEB_ASSETS,
} from '../packaging/build-demo-hosted.mjs';

const repository = fileURLToPath(new URL('../../', import.meta.url));
const builder = 'scripts/packaging/build-demo-hosted.mjs';
const proposalPrefix = 'domains/demo-runtime/proposal-0.1.0/';
const proposalFiles = readFileSync(join(repository, proposalPrefix, 'SHA256SUMS'), 'utf8').trim().split('\n').map(line => `${proposalPrefix}${line.split('  ')[1]}`);
const fixtureExtras = [builder, 'src/web/demo/README.md', 'drizzle/0005_demo_runtime_owner_storage.sql', 'drizzle/meta/_journal.json', ...proposalFiles];
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`;
  return JSON.stringify(value);
}
function git(root, args) {
  return execFileSync('git', args, {
    cwd: root, timeout: 5000, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, GIT_AUTHOR_NAME: 'Hosted Package Fixture', GIT_AUTHOR_EMAIL: 'fixture@example.invalid', GIT_COMMITTER_NAME: 'Hosted Package Fixture', GIT_COMMITTER_EMAIL: 'fixture@example.invalid', GIT_CONFIG_NOSYSTEM: '1' },
  }).trim();
}
function put(root, path, bytes) { mkdirSync(dirname(join(root, path)), { recursive: true }); writeFileSync(join(root, path), bytes); }
function fixture(t) {
  const temporary = mkdtempSync(join(tmpdir(), 'teach-hosted-package-'));
  t.after(() => rmSync(temporary, { recursive: true, force: true }));
  const sourceRoot = join(temporary, 'source');
  mkdirSync(sourceRoot);
  for (const path of [...HOSTED_PACKAGE_FILES, ...fixtureExtras]) {
    mkdirSync(dirname(join(sourceRoot, path)), { recursive: true });
    copyFileSync(join(repository, path), join(sourceRoot, path));
  }
  // Inert decoys prove that selection is finite, not a broad source-tree copy.
  put(sourceRoot, 'tests/demo-hosted/test-only-harness.ts', 'export const testOnly = true;\n');
  put(sourceRoot, 'src/bootstrap/demo/local-activation.ts', '// excluded local activation fixture\n');
  put(sourceRoot, '.env', 'FIXTURE_MARKER=not-a-credential\n');
  put(sourceRoot, '.gitignore', 'ignored-local/\n');
  git(sourceRoot, ['init', '-q']);
  git(sourceRoot, ['config', 'core.hooksPath', '/dev/null']);
  git(sourceRoot, ['config', 'commit.gpgsign', 'false']);
  const f = {
    temporary, sourceRoot,
    identity() { return { sourceRoot, expectedCommit: git(sourceRoot, ['rev-parse', 'HEAD']), expectedTree: git(sourceRoot, ['rev-parse', 'HEAD^{tree}']) }; },
    // These are isolated disposable fixture commits, never candidate worktree commits.
    commit() { git(sourceRoot, ['add', '-A']); git(sourceRoot, ['commit', '-qm', 'Isolated packaging test fixture']); return f.identity(); },
    build(name = 'package') { const outputDirectory = join(temporary, name); return { ...buildDemoHostedPackage({ ...f.identity(), outputDirectory }), outputDirectory }; },
    validate(outputDirectory, extra = {}) { return validateDemoHostedPackage({ ...f.identity(), packageDirectory: outputDirectory, ...extra }); },
  };
  f.commit();
  return f;
}
function inventory(root, parent = '') {
  return readdirSync(join(root, parent), { withFileTypes: true }).flatMap(entry => {
    const path = parent ? `${parent}/${entry.name}` : entry.name;
    return entry.isDirectory() ? inventory(root, path) : [path];
  }).sort();
}

test('two builds are byte-identical, source-bound, finite and explicitly not deployable', t => {
  const f = fixture(t), first = f.build('first'), second = f.build('second');
  assert.deepEqual(first.manifest, second.manifest);
  assert.equal(first.manifestSha256, second.manifestSha256);
  const manifest = first.manifest;
  assert.equal(manifest.activation, 'DISABLED');
  assert.equal(manifest.providerDeployable, false);
  assert.equal(manifest.authority.hostedActivationAuthorized, false);
  assert.equal(manifest.runtime.node, '20.20.2');
  assert.equal(manifest.runtime.packageManager, 'pnpm@12.8.1');
  assert.equal(manifest.runtime.dependencyInstallation, 'NOT_INCLUDED');
  assert.equal(manifest.runtime.transpilation, 'NOT_PERFORMED');
  assert.equal(manifest.authority.physicalDecision, 'ADMIT');
  assert.equal(manifest.authority.migrationHead, '0005_demo_runtime_owner_storage');
  assert.equal(manifest.authority.migrationSha256, sha(readFileSync(join(f.sourceRoot, 'drizzle/0005_demo_runtime_owner_storage.sql'))));
  assert.equal(manifest.authority.migrationsIncluded, false);
  assert.deepEqual(manifest.source, { commit: f.identity().expectedCommit, tree: f.identity().expectedTree, clean: true });
  assert.deepEqual(manifest.webAssets, HOSTED_WEB_ASSETS);
  assert.equal(manifest.webAssets.length, 7);
  assert.deepEqual(manifest.files.map(file => file.path), HOSTED_PACKAGE_FILES);
  const copy = structuredClone(manifest), identity = copy.build.identity;
  delete copy.build.identity;
  assert.equal(identity, sha(canonical(copy)));
  assert.deepEqual(inventory(first.outputDirectory), [...HOSTED_PACKAGE_FILES, HOSTED_PACKAGE_MANIFEST].sort());
  for (const path of inventory(first.outputDirectory)) {
    const bytes = readFileSync(join(first.outputDirectory, path));
    assert.deepEqual(bytes, readFileSync(join(second.outputDirectory, path)));
    assert.equal(lstatSync(join(first.outputDirectory, path)).mode & 0o777, 0o644);
    assert.equal(lstatSync(join(first.outputDirectory, path)).mtimeMs, 0);
    assert.ok(!/(?:^|\/)(?:\.git|\.env|node_modules|tests|local-activation|local-server)|\.test\.|\.sql$/.test(path), path);
  }
  for (const file of manifest.files) {
    const bytes = readFileSync(join(first.outputDirectory, file.path));
    assert.equal(bytes.length, file.size);
    assert.equal(sha(bytes), file.sha256);
  }
  assert.equal(sha(readFileSync(join(first.outputDirectory, HOSTED_PACKAGE_MANIFEST))), first.manifestSha256);
  assert.equal(f.validate(first.outputDirectory, { expectedManifestSha256: first.manifestSha256 }).manifestSha256, first.manifestSha256);
  assert.equal(git(f.sourceRoot, ['status', '--porcelain']), '');
});

test('runtime, web, authority and dependency bytes cannot be tampered after building', t => {
  const f = fixture(t), built = f.build();
  for (const path of ['src/bootstrap/demo-hosted/composition.ts', 'src/web/demo/app.mjs', 'governance/automation-principals.json', 'package.json', 'pnpm-lock.yaml']) {
    const full = join(built.outputDirectory, path), original = readFileSync(full);
    writeFileSync(full, Buffer.concat([original, Buffer.from('\nTAMPERED\n')]));
    assert.throws(() => f.validate(built.outputDirectory), /package byte mismatch/, path);
    writeFileSync(full, original);
  }
});

test('inventory rejects missing, extra, secret-looking, test-only, empty-directory and symlink entries', t => {
  const f = fixture(t), built = f.build();
  for (const path of ['unexpected.txt', '.env', '.git/config', 'tests/demo-hosted/verifier.ts', 'browser-state/storage.json', 'src/web/demo/extra.mjs']) {
    put(built.outputDirectory, path, 'inert fixture\n');
    assert.throws(() => f.validate(built.outputDirectory), /inventory|unsafe relative path/, path);
    rmSync(join(built.outputDirectory, path.includes('/') ? path.split('/')[0] === 'src' ? path : path.split('/')[0] : path), { recursive: true });
  }
  mkdirSync(join(built.outputDirectory, 'empty'));
  assert.throws(() => f.validate(built.outputDirectory), /inventory/);
  rmSync(join(built.outputDirectory, 'empty'), { recursive: true });
  const target = join(built.outputDirectory, 'src/web/demo/index.html'), original = readFileSync(target);
  rmSync(target);
  assert.throws(() => f.validate(built.outputDirectory), /inventory/);
  symlinkSync(join(f.sourceRoot, 'src/web/demo/index.html'), target);
  assert.throws(() => f.validate(built.outputDirectory), /symlink/);
  rmSync(target); writeFileSync(target, original);
  const outside = join(f.temporary, 'hard-link.html');
  writeFileSync(outside, original); rmSync(target); linkSync(outside, target);
  assert.throws(() => f.validate(built.outputDirectory), /not a bounded regular file/);
});

test('a rewritten self-hashed manifest cannot authorize enabled mode, new paths or changed identities', t => {
  const f = fixture(t), built = f.build(), full = join(built.outputDirectory, HOSTED_PACKAGE_MANIFEST), original = readFileSync(full);
  const mutations = [
    m => { m.activation = 'ENABLED'; }, m => { m.providerDeployable = true; },
    m => { m.source.commit = 'a'.repeat(40); }, m => { m.source.clean = false; },
    m => { m.runtime.node = '22.0.0'; }, m => { m.authority.physicalDecision = 'ADMIT_ANY'; },
    m => { m.authority.migrationSha256 = '0'.repeat(64); },
    m => { m.files[0].path = '../escape.ts'; }, m => { m.files[0].path = '/absolute.ts'; },
    m => { m.files.push({ path: 'tests/demo-hosted/trust.ts', size: 0, sha256: sha('') }); },
    m => { m.webAssets[0].file = '../outside.html'; },
  ];
  for (const mutate of mutations) {
    const manifest = JSON.parse(original); mutate(manifest); delete manifest.build.identity;
    manifest.build.identity = sha(canonical(manifest));
    const malicious = Buffer.from(`${canonical(manifest)}\n`); writeFileSync(full, malicious);
    assert.throws(() => f.validate(built.outputDirectory, { expectedManifestSha256: sha(malicious) }), /manifest bytes mismatch/);
  }
  writeFileSync(full, original.toString().replace('"activation":"DISABLED"', '"activation":"ENABLED","activation":"DISABLED"'));
  assert.throws(() => f.validate(built.outputDirectory), /manifest bytes mismatch/);
  writeFileSync(full, original);
  assert.throws(() => f.validate(built.outputDirectory, { expectedManifestSha256: 'a'.repeat(64) }), /manifest identity mismatch/);
});

test('dirty, staged, untracked and index-hidden source changes fail before creating output', t => {
  const f = fixture(t), file = 'src/web/demo/app.mjs', original = readFileSync(join(f.sourceRoot, file)), outputDirectory = join(f.temporary, 'blocked');
  const attempt = () => buildDemoHostedPackage({ ...f.identity(), outputDirectory });
  writeFileSync(join(f.sourceRoot, file), 'modified\n');
  assert.throws(attempt, /dirty source/); assert.equal(existsSync(outputDirectory), false);
  git(f.sourceRoot, ['add', file]);
  assert.throws(attempt, /dirty source/);
  git(f.sourceRoot, ['reset', '--quiet', 'HEAD', '--', file]); writeFileSync(join(f.sourceRoot, file), original);
  put(f.sourceRoot, 'untracked.txt', 'untracked\n'); assert.throws(attempt, /dirty source/); rmSync(join(f.sourceRoot, 'untracked.txt'));
  for (const mode of ['assume-unchanged', 'skip-worktree']) {
    git(f.sourceRoot, ['update-index', `--${mode}`, file]); writeFileSync(join(f.sourceRoot, file), 'hidden\n');
    assert.throws(attempt, /hidden or nonstandard index entries/);
    writeFileSync(join(f.sourceRoot, file), original); git(f.sourceRoot, ['update-index', `--no-${mode}`, file]);
  }
  assert.equal(existsSync(outputDirectory), false);
});

test('wrong source commit/tree, builder identity and non-root paths are rejected', t => {
  const f = fixture(t), outputDirectory = join(f.temporary, 'blocked'), options = { ...f.identity(), outputDirectory };
  assert.throws(() => buildDemoHostedPackage({ ...options, expectedCommit: 'a'.repeat(40) }), /source identity mismatch/);
  assert.throws(() => buildDemoHostedPackage({ ...options, expectedTree: 'b'.repeat(40) }), /source identity mismatch/);
  assert.throws(() => buildDemoHostedPackage({ ...options, expectedCommit: 'HEAD' }), /exact source commit/);
  assert.throws(() => buildDemoHostedPackage({ ...options, sourceRoot: join(f.sourceRoot, 'src') }), /repository root/);
  put(f.sourceRoot, builder, '// substituted builder\n'); f.commit();
  assert.throws(() => f.build('blocked'), /builder source mismatch/);
  assert.equal(existsSync(outputDirectory), false);
});

test('outputs cannot overwrite files or directories, alias symlinks, traverse or enter source', t => {
  const f = fixture(t), built = f.build(), options = f.identity();
  assert.throws(() => buildDemoHostedPackage({ ...options, outputDirectory: built.outputDirectory }), /output already exists/);
  const marker = join(f.temporary, 'marker'); writeFileSync(marker, 'keep');
  assert.throws(() => buildDemoHostedPackage({ ...options, outputDirectory: marker }), /output already exists/); assert.equal(readFileSync(marker, 'utf8'), 'keep');
  assert.throws(() => buildDemoHostedPackage({ ...options, outputDirectory: join(f.sourceRoot, 'dist') }), /output inside source/);
  assert.throws(() => buildDemoHostedPackage({ ...options, outputDirectory: `${f.temporary}/source/../escape` }), /without traversal/);
  assert.throws(() => buildDemoHostedPackage({ ...options, outputDirectory: 'relative-output' }), /absolute path/);
  const alias = join(f.temporary, 'alias'); symlinkSync(built.outputDirectory, alias);
  assert.throws(() => f.validate(alias), /symlink path/);
  assert.throws(() => buildDemoHostedPackage({ ...options, outputDirectory: join(alias, 'nested') }), /symlink path/);
  const sourceAlias = join(f.temporary, 'source-alias'); symlinkSync(f.sourceRoot, sourceAlias);
  assert.throws(() => buildDemoHostedPackage({ ...options, sourceRoot: sourceAlias, outputDirectory: join(f.temporary, 'other') }), /symlink path/);
  const broken = join(f.temporary, 'broken'); symlinkSync(join(f.temporary, 'absent'), broken);
  assert.throws(() => buildDemoHostedPackage({ ...options, outputDirectory: broken }), /output already exists/);
});

test('committed source symlinks and extra web assets are rejected', t => {
  const f = fixture(t), path = 'src/web/demo/index.html', full = join(f.sourceRoot, path), original = readFileSync(full);
  const outside = join(f.temporary, 'outside'); writeFileSync(outside, original); rmSync(full); symlinkSync(outside, full); f.commit();
  assert.throws(() => f.build('symlink'), /symlink path/);
  rmSync(full); writeFileSync(full, original); f.commit();
  put(f.sourceRoot, 'src/web/demo/extra.mjs', 'export {};\n'); f.commit();
  assert.throws(() => f.build('extra'), /unexpected web asset inventory/);
  rmSync(join(f.sourceRoot, 'src/web/demo/extra.mjs')); f.commit();
  put(f.sourceRoot, 'src/web/demo/.gitignore', 'hidden.html\n'); f.commit();
  put(f.sourceRoot, 'src/web/demo/hidden.html', 'ignored but not allowed\n');
  assert.throws(() => f.build('ignored'), /unsafe relative path|unexpected web asset inventory/);
});

test('committed dependency, authority, migration and asset-descriptor drift fail closed', t => {
  const f = fixture(t);
  const variants = [
    ['package.json', text => text.replace('"pg": "8.23.1"', '"pg": "8.23.2"'), /dependency descriptor mismatch/],
    ['pnpm-lock.yaml', text => `${text}\n# changed lock\n`, /dependency descriptor mismatch/],
    ['persistence/physical-slices/demo-runtime/admission.json', text => text.replace('"ADMIT"', '"REJECT"'), /immutable authority mismatch/],
    ['governance/automation-principals.json', text => `${text}\n`, /immutable authority mismatch/],
    ['domains/demo-runtime/proposal-0.1.0/decision-and-scope.md', text => `${text}\nChanged semantic evidence.\n`, /semantic package byte mismatch/],
    ['drizzle/0005_demo_runtime_owner_storage.sql', text => `${text}\n-- changed migration\n`, /migration identity mismatch/],
    ['drizzle/meta/_journal.json', text => text.replace('0005_demo_runtime_owner_storage', '0006_unapproved'), /migration identity mismatch/],
    ['src/web/demo/assets.json', text => text.replace('index.html', '../index.html'), /web asset manifest mismatch/],
  ];
  for (const [path, mutate, expected] of variants) {
    const original = readFileSync(join(f.sourceRoot, path)); put(f.sourceRoot, path, mutate(original.toString())); f.commit();
    assert.throws(() => f.build('blocked'), expected, path);
    put(f.sourceRoot, path, original); f.commit();
  }
});

test('runtime import expansion and dynamic imports require reviewed closure changes', t => {
  const f = fixture(t), path = HOSTED_RUNTIME_SOURCES[0], original = readFileSync(join(f.sourceRoot, path));
  for (const addition of [
    "import './unreviewed.js';\n", "import{hidden}from'./unreviewed.js';\n", "export{hidden}from'./unreviewed.js';\n",
    "import fs from 'unapproved-dependency';\n", "const dynamic = import('./configuration.js');\n",
    "const dynamic = import/* comment */('./configuration.js');\n", "const dynamic = require/* comment */('pg');\n",
    "const dynamic = `${import('./configuration.js')}`;\n",
  ]) {
    put(f.sourceRoot, path, Buffer.concat([original, Buffer.from(addition)])); f.commit();
    assert.throws(() => f.build('blocked'), /runtime import outside finite closure|unpinned runtime dependency|dynamic module loading/);
  }
});

test('CLI returns an explicit inert identity and validation rejects mismatch without changing source', t => {
  const f = fixture(t), identity = f.identity(), output = join(f.temporary, 'cli');
  const invoke = args => execFileSync(process.execPath, [resolve(repository, builder), ...args], { cwd: f.temporary, timeout: 10000, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  const built = JSON.parse(invoke(['build', f.sourceRoot, output, identity.expectedCommit, identity.expectedTree]));
  assert.equal(built.status, 'PASS'); assert.equal(built.activation, 'DISABLED'); assert.equal(built.providerDeployable, false);
  const checked = JSON.parse(invoke(['validate', f.sourceRoot, output, identity.expectedCommit, identity.expectedTree, built.manifestSha256]));
  assert.deepEqual(checked, built);
  assert.throws(() => invoke(['validate', f.sourceRoot, output, identity.expectedCommit, identity.expectedTree, 'f'.repeat(64)]));
  assert.throws(() => invoke(['build']));
  assert.equal(git(f.sourceRoot, ['status', '--porcelain']), '');
});
