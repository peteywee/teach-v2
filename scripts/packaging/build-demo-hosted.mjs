import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { chmodSync, lstatSync, mkdirSync, readFileSync, readdirSync, realpathSync, utimesSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, join, posix, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

/** H01 is a local, inert source artifact, not a provider bundle or activation authority.
 * No dependency installation, transpilation, listener, database or provider access occurs.
 * Changing these finite paths or immutable pins requires a separately reviewed source change.
 */
export const HOSTED_PACKAGE_MANIFEST = 'hosted-source-manifest.json';
export const HOSTED_PACKAGE_NODE = '20.20.2';
const BUILDER = 'scripts/packaging/build-demo-hosted.mjs';
const SHA256 = /^[a-f0-9]{64}$/;
const GIT_ID = /^[a-f0-9]{40}$/;
const MAX_FILE_BYTES = 5 * 1024 * 1024;
const PACKAGE_ID = 'TEACH-DEMO-RUNTIME-2026-10-17';
const PACKAGE_VERSION = '0.1.0';
const PACKAGE_SUMS = 'domains/demo-runtime/proposal-0.1.0/SHA256SUMS';
const REGISTRATION = 'domains/demo-runtime/registration.json';
const SEMANTIC_REVIEW = 'persistence/physical-slices/demo-runtime/semantic-independent-review.md';
const ADMISSION = 'persistence/physical-slices/demo-runtime/admission.json';
const MAPPING = 'persistence/physical-slices/demo-runtime/representation.proposed.json';
const ERROR_SCHEMA = 'domains/demo-runtime/proposal-0.1.0/baseline-error-envelope.schema.json';
const AUTOMATION = 'governance/automation-principals.json';
const MIGRATION_HEAD = '0005_demo_runtime_owner_storage';
const MIGRATION_FILE = `drizzle/${MIGRATION_HEAD}.sql`;
const MIGRATION_SHA256 = '441c579790de90a71c904a6a49e8b22b3bfb5b72bd3bf4171a5b1d062f1d6775';
const MIGRATION_JOURNAL = 'drizzle/meta/_journal.json';
const MIGRATION_JOURNAL_SHA256 = '412b21579a8deb58d06aaa6890e8bd34ce398ad9801b70d2196ea8332af83ddf';
const LOCK_SHA256 = 'caeaaf24245a911d99d5447c779cb5e86eaeb3a0bccf57b8d9ad911169a316a2';
const AUTHORITY_SHA256 = Object.freeze({
  [PACKAGE_SUMS]: 'a1df23b03a0f0660a072cff00eb40d3d2fb60bc8c521f12b56977f559601196a',
  [REGISTRATION]: 'b94cf7c7c9bab35ad2454470295ae2b04b8814bd0ac55c282cdd3dd6df67218d',
  [SEMANTIC_REVIEW]: '1695c5ff3a884c063323eda27e6905f3af61f4814da8aee8d7ea534aa347f655',
  [ADMISSION]: 'ebf8c356d724af08036aa557f4b0d45ccb0561d4273a60a2bb6a7494765ec901',
  [MAPPING]: '5cac3a47dc4ac22085fc262c14a89a5f4e9586d7b4dc0004b5ca084bf34c7ae4',
  [ERROR_SCHEMA]: '81028a4c0c42620fc93f0acdaef204d7559456bcc2f2d45efe1d5cfb42571a90',
  [AUTOMATION]: 'a814059a41fcd07419d43cdb4824c11cc4adfbd9b91b49edf28908a0934a40d6',
});
const DEPENDENCIES = Object.freeze({ 'drizzle-orm': '0.45.3', pg: '8.23.1' });
const DEV_DEPENDENCIES = Object.freeze({ '@types/node': '20.19.33', '@types/pg': '8.23.1', 'drizzle-kit': '0.31.11', tsx: '4.23.15', typescript: '7.0.2' });

export const HOSTED_WEB_ASSETS = Object.freeze([
  { path: '/', file: 'index.html', contentType: 'text/html; charset=utf-8' },
  { path: '/assets/styles.css', file: 'styles.css', contentType: 'text/css; charset=utf-8' },
  { path: '/assets/app.mjs', file: 'app.mjs', contentType: 'text/javascript; charset=utf-8' },
  { path: '/assets/api.mjs', file: 'api.mjs', contentType: 'text/javascript; charset=utf-8' },
  { path: '/assets/controller.mjs', file: 'controller.mjs', contentType: 'text/javascript; charset=utf-8' },
  { path: '/assets/views.mjs', file: 'views.mjs', contentType: 'text/javascript; charset=utf-8' },
  { path: '/assets/wire-contract.mjs', file: 'wire-contract.mjs', contentType: 'text/javascript; charset=utf-8' },
].map(Object.freeze));

// Exact reviewed static import closure, including type-only source dependencies.
// The .d.mts sibling preserves the type surface of the required .mjs module.
export const HOSTED_RUNTIME_SOURCES = Object.freeze([
  'src/bootstrap/demo-hosted/composition.ts',
  'src/bootstrap/demo-hosted/configuration.ts',
  'src/bootstrap/demo-hosted/expiry.ts',
  'src/bootstrap/demo-hosted/pool.ts',
  'src/bootstrap/demo-hosted/transport.ts',
  'src/bootstrap/demo/application-port.ts',
  'src/bootstrap/demo/application.ts',
  'src/bootstrap/demo/demo-transaction.ts',
  'src/bootstrap/demo/http.ts',
  'src/bootstrap/demo/postgres-demo-transaction.ts',
  'src/modules/audit-lifecycle/application/demo-audit.ts',
  'src/modules/audit-lifecycle/application/ports/audit-append.ts',
  'src/modules/audit-lifecycle/application/ports/demo-audit.ts',
  'src/modules/audit-lifecycle/infrastructure/persistence/postgres-demo-audit.ts',
  'src/modules/authorization/application/demo-authorization.ts',
  'src/modules/authorization/application/demo-error.ts',
  'src/modules/authorization/application/ports/demo-actor.ts',
  'src/modules/authorization/application/ports/demo-command-context.ts',
  'src/modules/authorization/application/ports/session-command-authorization.ts',
  'src/modules/content/application/demo-content-service.ts',
  'src/modules/content/application/demo-template.ts',
  'src/modules/content/application/ports/demo-content.ts',
  'src/modules/content/domain/demo-content.ts',
  'src/modules/content/infrastructure/persistence/postgres-demo-content.ts',
  'src/modules/identity/application/demo-session-service.ts',
  'src/modules/identity/application/ports/application-session-command-transaction.ts',
  'src/modules/identity/application/ports/application-session-repository.ts',
  'src/modules/identity/application/ports/demo-identity.ts',
  'src/modules/identity/application/session-revocation-service.ts',
  'src/modules/identity/application/session-service.ts',
  'src/modules/identity/domain/application-session.ts',
  'src/modules/identity/domain/identity.ts',
  'src/modules/identity/infrastructure/persistence/identity-database.ts',
  'src/modules/identity/infrastructure/persistence/input-snapshot.d.mts',
  'src/modules/identity/infrastructure/persistence/input-snapshot.mjs',
  'src/modules/identity/infrastructure/persistence/postgres-application-session-repository.ts',
  'src/modules/identity/infrastructure/persistence/postgres-demo-identity.ts',
  'src/modules/identity/infrastructure/persistence/schema.ts',
  'src/modules/learning/application/demo-learning-service.ts',
  'src/modules/learning/application/learning-session-service.ts',
  'src/modules/learning/application/ports/demo-learning.ts',
  'src/modules/learning/application/ports/learning-session-repository.ts',
  'src/modules/learning/domain/demo-evaluation.ts',
  'src/modules/learning/domain/learning-session.ts',
  'src/modules/learning/infrastructure/persistence/postgres-demo-learning.ts',
  'src/modules/organization/application/demo-run-service.ts',
  'src/modules/organization/application/ports/demo-organization.ts',
  'src/modules/organization/infrastructure/persistence/postgres-demo-organization.ts',
  'src/modules/transaction-control/application/demo-receipts.ts',
  'src/modules/transaction-control/application/ports/demo-receipts.ts',
  'src/modules/transaction-control/infrastructure/persistence/postgres-demo-receipts.ts',
]);

export const HOSTED_PACKAGE_FILES = Object.freeze([
  ...HOSTED_RUNTIME_SOURCES,
  ...Object.keys(AUTHORITY_SHA256),
  ...HOSTED_WEB_ASSETS.map(asset => `src/web/demo/${asset.file}`),
  'src/web/demo/assets.json', 'package.json', 'pnpm-lock.yaml',
].sort());

function fail(message) { throw new Error(`Hosted source package rejected: ${message}`); }
function digest(value) { return createHash('sha256').update(value).digest('hex'); }
function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`;
  return JSON.stringify(value);
}
function json(bytes, description) {
  try { return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)); }
  catch { fail(`invalid JSON in ${description}`); }
}
function same(left, right) { return canonical(left) === canonical(right); }
function safeRelative(path) {
  if (typeof path !== 'string' || !/^[A-Za-z0-9_-][A-Za-z0-9_./-]*$/.test(path)
      || path.split('/').some(part => !part || part === '.' || part === '..')
      || path.includes('\\') || isAbsolute(path)) fail('unsafe relative path');
  return path;
}
function absolutePath(path) {
  if (typeof path !== 'string' || !isAbsolute(path) || path.includes('\0') || path.includes('\\')
      || path.split(sep).some(part => part === '.' || part === '..')) fail('an absolute path without traversal is required');
  return resolve(path);
}
function noSymlinkPath(path) {
  const absolute = absolutePath(path);
  let current = sep;
  for (const part of absolute.split(sep).filter(Boolean)) {
    current = join(current, part);
    if (lstatSync(current).isSymbolicLink()) fail('symlink path');
  }
  if (realpathSync(absolute) !== absolute) fail('aliased path');
  return absolute;
}
function readRegular(root, path) {
  safeRelative(path);
  const full = noSymlinkPath(join(root, path));
  const info = lstatSync(full);
  if (!info.isFile() || info.nlink !== 1 || info.size > MAX_FILE_BYTES) fail(`not a bounded regular file: ${path}`);
  return readFileSync(full);
}
function git(root, args, raw = false) {
  try {
    const result = execFileSync('git', ['--no-optional-locks', ...args], {
      cwd: root, timeout: 5000, maxBuffer: 8 * 1024 * 1024,
      stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, GIT_NO_REPLACE_OBJECTS: '1' },
    });
    return raw ? result : result.toString('utf8').trim();
  } catch { fail('Git source evidence unavailable'); }
}
function assertSource(root, expectedCommit, expectedTree) {
  if (typeof expectedCommit !== 'string' || !GIT_ID.test(expectedCommit)
      || typeof expectedTree !== 'string' || !GIT_ID.test(expectedTree)) fail('exact source commit and tree are required');
  if (git(root, ['rev-parse', '--show-toplevel']) !== root) fail('source must be the repository root');
  if (git(root, ['rev-parse', 'HEAD']) !== expectedCommit
      || git(root, ['rev-parse', 'HEAD^{tree}']) !== expectedTree) fail('source identity mismatch');
  if (git(root, ['status', '--porcelain=v1', '--untracked-files=all']) !== '') fail('dirty source');
  // Git status alone can overlook deliberately hidden worktree changes.
  if (git(root, ['ls-files', '-v', '-z'], true).toString('utf8').split('\0').filter(Boolean).some(line => !line.startsWith('H '))) fail('hidden or nonstandard index entries');
}
function sourceEntries(root, commit) {
  const entries = new Map();
  for (const entry of git(root, ['ls-tree', '-rz', '--full-tree', commit], true).toString('utf8').split('\0').filter(Boolean)) {
    const tab = entry.indexOf('\t');
    entries.set(entry.slice(tab + 1), entry.slice(0, tab));
  }
  return entries;
}
function readCommitted(root, path, entries) {
  const bytes = readRegular(root, path);
  const entry = entries.get(path);
  if (!/^100(?:644|755) blob [a-f0-9]{40}$/.test(entry ?? '')) fail(`untracked or nonregular source: ${path}`);
  const gitBlob = createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
  if (gitBlob !== entry.slice(-40)) fail(`source byte mismatch: ${path}`);
  return bytes;
}
function listTree(root) {
  const files = [], directories = [];
  function walk(path) {
    for (const entry of readdirSync(join(root, path), { withFileTypes: true })) {
      const child = path ? `${path}/${entry.name}` : entry.name;
      safeRelative(child);
      if (entry.isSymbolicLink()) fail('symlink in file inventory');
      if (entry.isDirectory()) { directories.push(child); walk(child); }
      else if (entry.isFile()) files.push(child);
      else fail('nonregular inventory entry');
      if (files.length + directories.length > 1000) fail('oversized inventory');
    }
  }
  walk('');
  return { files: files.sort(), directories: directories.sort() };
}
function parentDirectories(files) {
  const directories = new Set();
  for (const file of files) {
    let parent = posix.dirname(file);
    while (parent !== '.') { directories.add(parent); parent = posix.dirname(parent); }
  }
  return [...directories].sort();
}
// A small fail-closed scanner for this finite source format, not a TS compiler.
// It ignores comments/string contents, understands compact static imports and
// rejects computed imports, require calls and escaped module specifiers.
function moduleSpecifiers(source) {
  const tokens = [];
  for (let offset = 0; offset < source.length;) {
    const remaining = source.slice(offset), first = source[offset];
    if (/\s/.test(first)) { offset++; continue; }
    if (remaining.startsWith('//')) { const end = source.indexOf('\n', offset + 2); offset = end < 0 ? source.length : end; continue; }
    if (remaining.startsWith('/*')) { const end = source.indexOf('*/', offset + 2); if (end < 0) fail('unterminated source comment'); offset = end + 2; continue; }
    if (first === '/' && (!tokens.length || ['=', '(', '[', '{', ',', ':', ';', '?', '!', '|', '&', '>', 'return', 'case', 'yield'].includes(tokens.at(-1).value))) {
      let characterClass = false; offset++;
      for (; offset < source.length; offset++) {
        if (source[offset] === '\\') { offset++; continue; }
        if (source[offset] === '[') characterClass = true;
        if (source[offset] === ']') characterClass = false;
        if (source[offset] === '/' && !characterClass) break;
      }
      if (offset >= source.length) fail('unsupported regular-expression syntax');
      offset++; while (/[a-z]/i.test(source[offset] ?? '') && offset < source.length) offset++;
      tokens.push({ kind: 'literal', value: 'REGEXP' }); continue;
    }
    if (first === '"' || first === "'" || first === '`') {
      const start = ++offset;
      while (offset < source.length && source[offset] !== first) { if (source[offset] === '\\') offset++; offset++; }
      if (offset >= source.length) fail('unterminated source literal');
      const value = source.slice(start, offset++);
      if (first === '`' && /\b(?:import|require)\b/.test(value)) fail('dynamic module loading in template');
      tokens.push({ kind: 'string', value }); continue;
    }
    const identifier = remaining.match(/^[A-Za-z_$][A-Za-z0-9_$]*/)?.[0];
    if (identifier) { tokens.push({ kind: 'identifier', value: identifier }); offset += identifier.length; }
    else { tokens.push({ kind: 'symbol', value: first }); offset++; }
  }
  const specifiers = [];
  for (let index = 0; index < tokens.length; index++) {
    const token = tokens[index], next = tokens[index + 1];
    if (token.kind !== 'identifier') continue;
    if (token.value === 'require' && next?.value === '(') fail('dynamic module loading');
    if (!['import', 'export'].includes(token.value)) continue;
    if (token.value === 'import' && next?.value === '.') continue; // import.meta
    if (token.value === 'import' && next?.value === '(') fail('dynamic module loading');
    const isImport = token.value === 'import';
    if (!isImport && next?.value !== '*' && next?.value !== '{' && !(next?.value === 'type' && tokens[index + 2]?.value === '{')) continue;
    let specifier = isImport && next?.kind === 'string' ? next : undefined;
    for (let cursor = index + 1; !specifier && cursor < tokens.length && tokens[cursor].value !== ';'; cursor++) {
      if (tokens[cursor].kind === 'identifier' && tokens[cursor].value === 'from') specifier = tokens[cursor + 1];
    }
    if (!specifier) { if (isImport) fail('unsupported module import syntax'); else continue; }
    if (specifier.kind !== 'string' || specifier.value.includes('\\')) fail('unsupported module specifier');
    specifiers.push(specifier.value);
  }
  return specifiers;
}
function validateRuntimeImports(buffers) {
  const approved = new Set(HOSTED_RUNTIME_SOURCES);
  for (const path of HOSTED_RUNTIME_SOURCES) {
    const source = buffers.get(path).toString('utf8');
    let specifiers;
    try { specifiers = moduleSpecifiers(source); } catch (error) { fail(`${path}: ${error.message}`); }
    for (const specifier of specifiers) {
      if (specifier.startsWith('.')) {
        const target = posix.normalize(posix.join(posix.dirname(path), specifier.replace(/\.js$/, '.ts')));
        if (!approved.has(target)) fail(`runtime import outside finite closure: ${path}`);
      } else if (!specifier.startsWith('node:') && !['pg', 'drizzle-orm', 'drizzle-orm/node-postgres', 'drizzle-orm/pg-core'].includes(specifier)) fail(`unpinned runtime dependency: ${path}`);
    }
  }
}
function prepare(options) {
  if (process.versions.node !== HOSTED_PACKAGE_NODE) fail(`Node ${HOSTED_PACKAGE_NODE} is required`);
  const root = noSymlinkPath(options.sourceRoot);
  const { expectedCommit, expectedTree } = options;
  assertSource(root, expectedCommit, expectedTree);
  const entries = sourceEntries(root, expectedCommit);
  // A caller-selected source cannot silently substitute a different builder.
  const builderBytes = readCommitted(root, BUILDER, entries);
  if (!builderBytes.equals(readFileSync(fileURLToPath(import.meta.url)))) fail('builder source mismatch');
  const buffers = new Map(HOSTED_PACKAGE_FILES.map(path => [path, readCommitted(root, path, entries)]));
  const webFiles = ['README.md', 'assets.json', ...HOSTED_WEB_ASSETS.map(asset => asset.file)].sort();
  const webInventory = listTree(join(root, 'src/web/demo'));
  if (!same(webInventory.files, webFiles) || webInventory.directories.length) fail('unexpected web asset inventory');
  if (!same(json(buffers.get('src/web/demo/assets.json'), 'assets.json'), HOSTED_WEB_ASSETS)) fail('web asset manifest mismatch');
  for (const [path, expected] of Object.entries(AUTHORITY_SHA256)) if (digest(buffers.get(path)) !== expected) fail(`immutable authority mismatch: ${path}`);
  // Check the entire pinned semantic package in source, but do not ship its
  // validators/docs as runtime code. The pinned sums fix this finite evidence set.
  const sums = buffers.get(PACKAGE_SUMS).toString('utf8').trim().split('\n');
  const proposalFiles = new Set();
  if (sums.length !== 16) fail('semantic package inventory mismatch');
  for (const line of sums) {
    const match = line.match(/^([a-f0-9]{64})  ([A-Za-z0-9_.-]+)$/);
    if (!match || match[2].includes('..') || proposalFiles.has(match[2])) fail('semantic package inventory mismatch');
    proposalFiles.add(match[2]);
    if (digest(readCommitted(root, `${posix.dirname(PACKAGE_SUMS)}/${match[2]}`, entries)) !== match[1]) fail('semantic package byte mismatch');
  }
  const registration = json(buffers.get(REGISTRATION), REGISTRATION);
  const admission = json(buffers.get(ADMISSION), ADMISSION);
  if (registration.package_id !== PACKAGE_ID || registration.package_version !== PACKAGE_VERSION
      || registration.package_sha256 !== AUTHORITY_SHA256[PACKAGE_SUMS]
      || admission.decision !== 'ADMIT' || admission.mapping_sha256 !== AUTHORITY_SHA256[MAPPING]
      || admission.semantic_review?.verdict !== 'PASS' || admission.semantic_review?.registration_sha256 !== AUTHORITY_SHA256[REGISTRATION]
      || admission.shared_or_production_migration_execution_authorized !== false
      || admission.criteria?.length !== 8 || !admission.criteria.every(item => item.state === 'PROVEN')) fail('authority identity mismatch');
  const descriptor = json(buffers.get('package.json'), 'package.json');
  if (descriptor.type !== 'module' || descriptor.private !== true || descriptor.packageManager !== 'pnpm@12.8.1'
      || !same(descriptor.dependencies, DEPENDENCIES) || !same(descriptor.devDependencies, DEV_DEPENDENCIES)
      || digest(buffers.get('pnpm-lock.yaml')) !== LOCK_SHA256) fail('dependency descriptor mismatch');
  // SQL is source identity evidence only. It is neither copied nor executed.
  const migration = readCommitted(root, MIGRATION_FILE, entries);
  const journalBytes = readCommitted(root, MIGRATION_JOURNAL, entries);
  const journal = json(journalBytes, MIGRATION_JOURNAL);
  if (digest(migration) !== MIGRATION_SHA256 || digest(journalBytes) !== MIGRATION_JOURNAL_SHA256 || journal.entries?.length !== 6
      || journal.entries.at(-1)?.idx !== 5 || journal.entries.at(-1)?.tag !== MIGRATION_HEAD) fail('migration identity mismatch');
  validateRuntimeImports(buffers);
  const manifest = {
    schemaVersion: 1, kind: 'TEACH_DEMO_HOSTED_SOURCE_PACKAGE', activation: 'DISABLED', providerDeployable: false,
    source: { commit: expectedCommit, tree: expectedTree, clean: true },
    runtime: {
      node: HOSTED_PACKAGE_NODE, packageManager: 'pnpm@12.8.1', dependencies: DEPENDENCIES,
      developmentDependencies: DEV_DEPENDENCIES, dependencyInstallation: 'NOT_INCLUDED', transpilation: 'NOT_PERFORMED',
      packageDescriptor: 'package.json', lockDescriptor: 'pnpm-lock.yaml', lockSha256: LOCK_SHA256,
    },
    authority: {
      packageId: PACKAGE_ID, packageVersion: PACKAGE_VERSION, packageSha256sums: AUTHORITY_SHA256[PACKAGE_SUMS],
      registrationSha256: AUTHORITY_SHA256[REGISTRATION], semanticReviewSha256: AUTHORITY_SHA256[SEMANTIC_REVIEW],
      physicalAdmissionSha256: AUTHORITY_SHA256[ADMISSION], physicalMappingSha256: AUTHORITY_SHA256[MAPPING], physicalDecision: 'ADMIT',
      migrationHead: MIGRATION_HEAD, migrationFile: MIGRATION_FILE, migrationSha256: MIGRATION_SHA256,
      migrationJournalSha256: digest(journalBytes), migrationsIncluded: false,
      hostedActivationAuthorized: false,
    },
    build: { algorithm: 'sha256-canonical-manifest-v1', builder: BUILDER, builderSha256: digest(builderBytes) },
    files: HOSTED_PACKAGE_FILES.map(path => ({ path, size: buffers.get(path).length, sha256: digest(buffers.get(path)) })),
    webAssets: HOSTED_WEB_ASSETS,
  };
  manifest.build.identity = digest(canonical(manifest));
  const manifestBytes = Buffer.from(`${canonical(manifest)}\n`);
  // Source changes during reading do not produce an artifact labelled clean.
  assertSource(root, expectedCommit, expectedTree);
  return { root, buffers, manifest, manifestBytes, manifestSha256: digest(manifestBytes) };
}

/** Reconstructs all expectations from an independently selected clean source.
 * Never treat a successful local validation or a caller's manifest as activation.
 */
export function validateDemoHostedPackage(options) {
  const prepared = prepare(options);
  const directory = noSymlinkPath(options.packageDirectory);
  const expectedFiles = [...HOSTED_PACKAGE_FILES, HOSTED_PACKAGE_MANIFEST].sort();
  const inventory = listTree(directory);
  if (!same(inventory.files, expectedFiles) || !same(inventory.directories, parentDirectories(expectedFiles))) fail('package inventory mismatch');
  const manifestBytes = readRegular(directory, HOSTED_PACKAGE_MANIFEST);
  if (!manifestBytes.equals(prepared.manifestBytes)) fail('manifest bytes mismatch');
  if (options.expectedManifestSha256 !== undefined && (!SHA256.test(options.expectedManifestSha256)
      || options.expectedManifestSha256 !== prepared.manifestSha256)) fail('manifest identity mismatch');
  for (const [path, bytes] of prepared.buffers) if (!readRegular(directory, path).equals(bytes)) fail(`package byte mismatch: ${path}`);
  assertSource(prepared.root, options.expectedCommit, options.expectedTree);
  return { manifest: prepared.manifest, manifestSha256: prepared.manifestSha256 };
}

/** Writes a new local directory only. Existing outputs are never overwritten. */
export function buildDemoHostedPackage(options) {
  const prepared = prepare(options);
  const directory = absolutePath(options.outputDirectory);
  if (directory === prepared.root || directory.startsWith(`${prepared.root}${sep}`)) fail('output inside source');
  noSymlinkPath(dirname(directory));
  try { lstatSync(directory); fail('output already exists'); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  mkdirSync(directory, { mode: 0o755 });
  chmodSync(directory, 0o755);
  const files = [...prepared.buffers, [HOSTED_PACKAGE_MANIFEST, prepared.manifestBytes]];
  const directories = parentDirectories(files.map(([path]) => path));
  for (const path of directories) { mkdirSync(join(directory, path), { mode: 0o755 }); chmodSync(join(directory, path), 0o755); }
  for (const [path, bytes] of files) {
    writeFileSync(join(directory, path), bytes, { flag: 'wx', mode: 0o644 });
    chmodSync(join(directory, path), 0o644); utimesSync(join(directory, path), 0, 0);
  }
  for (const path of [...directories].reverse()) utimesSync(join(directory, path), 0, 0);
  utimesSync(directory, 0, 0);
  // Keep a failed output for inspection; it is never returned as a valid build.
  return validateDemoHostedPackage({ ...options, packageDirectory: directory, expectedManifestSha256: prepared.manifestSha256 });
}

function main(args) {
  const [operation, sourceRoot, packageDirectory, expectedCommit, expectedTree, expectedManifestSha256] = args;
  if (!['build', 'validate'].includes(operation) || args.length < 5 || args.length > (operation === 'build' ? 5 : 6)) {
    fail('usage: build-demo-hosted.mjs build|validate ABSOLUTE_SOURCE ABSOLUTE_OUTPUT COMMIT TREE [MANIFEST_SHA256 (validate only)]');
  }
  const options = { sourceRoot, expectedCommit, expectedTree };
  const result = operation === 'build'
    ? buildDemoHostedPackage({ ...options, outputDirectory: packageDirectory })
    : validateDemoHostedPackage({ ...options, packageDirectory, expectedManifestSha256 });
  console.log(JSON.stringify({ status: 'PASS', kind: result.manifest.kind, activation: 'DISABLED', providerDeployable: false, buildIdentity: result.manifest.build.identity, manifestSha256: result.manifestSha256 }));
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { main(process.argv.slice(2)); } catch (error) { console.error(error.message); process.exitCode = 1; }
}
