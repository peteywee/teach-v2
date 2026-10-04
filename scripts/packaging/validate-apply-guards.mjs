#!/usr/bin/env node
// Guards for owner-approval / discovery package APPLY runs.
//
// Recurrent APPLY failures this guard must catch before mutation:
//
//   1. A live version bump leaves another validator pinning an old K00,
//      Domain Ownership Map, or contract-package version.
//   2. A semantic promotion changes a live kernel approved/candidate count but
//      an audit/validator still pins the previous count.
//   3. A patched file is missing from the APPLY stage list, so validators read
//      it from the working tree and pass while the committed tree is broken.
//
// Live-pin detection is structural: it first binds each local variable to the
// artifact it loads, so aliases such as `m`, `x`, or `j` are equivalent to
// descriptive names. Historical/frozen records are intentionally ignored unless
// they load one of the live authority artifacts named below.
//
// Usage, from the repository root:
//
//   node scripts/packaging/validate-apply-guards.mjs pins      # after PATCH.py, before `git add`
//   node scripts/packaging/validate-apply-guards.mjs staging   # after `git add`, before `git commit`
//   node scripts/packaging/validate-apply-guards.mjs           # both
//
// `pins` derives expected versions/counts from live artifacts, so it needs no
// arguments and catches a pin that is stale in either direction.

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, resolve } from 'node:path';
import { inspectMigrationHistory } from './migration-history-guards.mjs';

const ROOT = resolve(process.cwd());
const errors = [];

const load = (p) => {
  try { return JSON.parse(readFileSync(join(ROOT, p), 'utf8')); }
  catch (e) { errors.push(`${p}: ${e.message}`); return null; }
};

const walk = (dir) => {
  const out = [];
  for (const name of readdirSync(join(ROOT, dir))) {
    const rel = `${dir}/${name}`;
    if (statSync(join(ROOT, rel)).isDirectory()) out.push(...walk(rel));
    else if (name.endsWith('.mjs')) out.push(rel);
  }
  return out;
};

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const lineOf = (text, index) => text.slice(0, index).split('\n').length;

const normalizeLoadPath = (base, rel) => {
  const cleanRel = rel.replace(/^\.\//, '');
  if (!base) return cleanRel;
  return `${base.replace(/\/$/, '')}/${cleanRel.replace(/^\//, '')}`;
};

function detectLoadBase(source) {
  const bases = new Map([['ROOT', '']]);
  for (const match of source.matchAll(/\bconst\s+([A-Za-z_$][\w$]*)\s*=\s*(?:join|resolve)\(\s*ROOT\s*,\s*['"]([^'"]+)['"]\s*\)/g)) {
    bases.set(match[1], match[2].replace(/^\.\//, '').replace(/\/$/, ''));
  }

  const declaration = source.match(/\bconst\s+load\s*=\s*\(\s*([A-Za-z_$][\w$]*)\s*\)\s*=>/);
  if (!declaration) return '';

  const param = declaration[1];
  const snippet = source.slice(declaration.index, declaration.index + 800);
  const joined = snippet.match(new RegExp(`join\\(\\s*([A-Za-z_$][\\w$]*)\\s*,\\s*${escapeRegex(param)}\\s*\\)`));
  if (!joined) return '';
  return bases.get(joined[1]) ?? '';
}

// ---------------------------------------------------------------- guard: pins
function checkPins() {
  const ownership = load('domains/ownership-map.json');
  const manifest = load('kernel/manifest.json');
  const mapVersion = ownership?.version;
  const kernelVersion = manifest?.version;

  let contractIndex = '';
  try { contractIndex = readFileSync(join(ROOT, 'contracts/README.md'), 'utf8'); }
  catch (e) { errors.push(`contracts/README.md: ${e.message}`); }
  const contractVersion = contractIndex.match(/^- Package version: `(\d+\.\d+\.\d+)`/m)?.[1];

  if (!mapVersion) errors.push('domains/ownership-map.json: no version to compare pins against');
  if (!kernelVersion) errors.push('kernel/manifest.json: no version to compare pins against');
  if (!contractVersion) errors.push('contracts/README.md: no package version to compare pins against');
  if (!mapVersion || !kernelVersion || !contractVersion) return;

  for (const file of walk('scripts')) {
    if (file === 'scripts/packaging/validate-apply-guards.mjs') continue;
    const source = readFileSync(join(ROOT, file), 'utf8');
    const bindings = new Map();
    const collections = new Map();
    const loadBase = detectLoadBase(source);

    for (const match of source.matchAll(/\bconst\s+([A-Za-z_$][\w$]*)\s*=\s*load\(\s*['"]([^'"]+)['"]\s*\)/g)) {
      bindings.set(match[1], { kind: 'json', path: normalizeLoadPath(loadBase, match[2]) });
    }
    for (const match of source.matchAll(/\bconst\s+([A-Za-z_$][\w$]*)\s*=\s*text\(\s*['"]([^'"]+)['"]\s*\)/g)) {
      bindings.set(match[1], { kind: 'text', path: match[2] });
    }
    for (const match of source.matchAll(/\bconst\s+([A-Za-z_$][\w$]*)\s*=\s*Object\.fromEntries\([^;]*?\bload\(\s*[A-Za-z_$][\w$]*\s*\)[^;]*?\);/g)) {
      collections.set(match[1], { base: loadBase });
    }

    for (const [alias, binding] of bindings) {
      const a = escapeRegex(alias);

      if (binding.path === 'kernel/manifest.json' || binding.path === 'domains/ownership-map.json') {
        const expected = binding.path === 'kernel/manifest.json' ? kernelVersion : mapVersion;
        const label = binding.path === 'kernel/manifest.json' ? 'K00 manifest version pin' : 'ownership map version pin';
        const pattern = new RegExp(`\\b${a}\\s*(?:\\?\\.|\\.)\\s*version\\s*!==?\\s*['"](\\d+\\.\\d+\\.\\d+)['"]`, 'g');
        for (const match of source.matchAll(pattern)) {
          if (match[1] !== expected) {
            errors.push(`${file}:${lineOf(source, match.index)}: stale ${label} '${match[1]}' — live value is '${expected}'`);
          }
        }
      }

      if (binding.kind === 'json' && /^kernel\/[a-z0-9-]+\.json$/i.test(binding.path)) {
        const artifact = load(binding.path);
        if (Array.isArray(artifact?.entries)) {
          const countExpr = `\\(\\s*${a}(?:\\?\\.|\\.)entries\\s*\\|\\|\\s*\\[\\]\\s*\\)\\.filter\\(\\s*[A-Za-z_$][\\w$]*\\s*=>\\s*[A-Za-z_$][\\w$]*(?:\\?\\.|\\.)status\\s*===\\s*['"]([^'"]+)['"]\\s*\\)\\.length`;
          const patterns = [
            new RegExp(`${countExpr}\\s*!==?\\s*(\\d+)`, 'g'),
            new RegExp(`${countExpr}\\s*,\\s*(\\d+)\\s*\\]`, 'g'),
          ];
          for (const pattern of patterns) {
            for (const match of source.matchAll(pattern)) {
              const status = match[1];
              const pinned = Number(match[2]);
              const actual = artifact.entries.filter((entry) => entry?.status === status).length;
              if (pinned !== actual) {
                errors.push(`${file}:${lineOf(source, match.index)}: stale live kernel ${status} count pin '${pinned}' for ${binding.path} — live value is '${actual}'`);
              }
            }
          }
        }
      }

      if (binding.kind === 'text' && ['contracts/README.md', 'contracts/APPROVAL-RECORD.md'].includes(binding.path)) {
        const lines = source.split('\n');
        const includesCall = new RegExp(`\\b${a}\\.includes\\(`);
        for (const [i, line] of lines.entries()) {
          if (!includesCall.test(line)) continue;
          if (!/(?:["']version["']\s*:|(?:Contract )?Package version:)/.test(line)) continue;
          for (const pinned of line.match(/\d+\.\d+\.\d+/g) ?? []) {
            if (pinned !== contractVersion) {
              errors.push(`${file}:${i + 1}: stale contract package version pin '${pinned}' — live value is '${contractVersion}'`);
            }
          }
        }
      }
    }

    for (const [collection, binding] of collections) {
      const c = escapeRegex(collection);
      const countExpr = `(?:\\[\\.\\.\\.\\s*)?\\(\\s*${c}\\[\\s*['"]([^'"]+\\.json)['"]\\s*\\](?:\\?\\.|\\.)entries\\s*\\|\\|\\s*\\[\\]\\s*\\)(?:\\s*\\])?\\.filter\\(\\s*[A-Za-z_$][\\w$]*\\s*=>\\s*[A-Za-z_$][\\w$]*(?:\\?\\.|\\.)status\\s*===\\s*['"]([^'"]+)['"]\\s*\\)\\.length`;
      const patterns = [
        new RegExp(`${countExpr}\\s*!==?\\s*(\\d+)`, 'g'),
        new RegExp(`${countExpr}\\s*,\\s*(\\d+)\\s*\\]`, 'g'),
      ];

      for (const pattern of patterns) {
        for (const match of source.matchAll(pattern)) {
          const artifactPath = normalizeLoadPath(binding.base, match[1]);
          if (!/^kernel\/[a-z0-9-]+\.json$/i.test(artifactPath)) continue;
          const artifact = load(artifactPath);
          if (!Array.isArray(artifact?.entries)) continue;

          const status = match[2];
          const pinned = Number(match[3]);
          const actual = artifact.entries.filter((entry) => entry?.status === status).length;
          if (pinned !== actual) {
            errors.push(`${file}:${lineOf(source, match.index)}: stale live kernel ${status} count pin '${pinned}' for ${artifactPath} — live value is '${actual}'`);
          }
        }
      }
    }
  }
}

// ------------------------------------------------------------- guard: staging
function checkStaging() {
  let porcelain;
  try {
    porcelain = execFileSync('git', ['status', '--porcelain'], { cwd: ROOT, encoding: 'utf8' });
  } catch (e) {
    errors.push(`git status failed: ${e.message}`);
    return;
  }
  for (const line of porcelain.split('\n').filter(Boolean)) {
    // XY path: X is the index state, Y the worktree state. Anything with a
    // worktree state is unstaged, and '??' is untracked — either way the patch
    // touched something the stage list does not cover.
    const worktree = line[1];
    if (worktree !== ' ') {
      errors.push(`unstaged after staging: ${line} (add it to the APPLY stage list, or exclude it)`);
    }
  }
}

const mode = process.argv[2] ?? 'all';
if (!['pins', 'staging', 'all'].includes(mode)) {
  console.error(`Unknown mode '${mode}'. Use: pins | staging | all`);
  process.exit(2);
}
if (mode === 'pins' || mode === 'all') {
  checkPins();
  errors.push(...inspectMigrationHistory(ROOT));
}
if (mode === 'staging' || mode === 'all') checkStaging();

if (errors.length) {
  console.error(`Apply guards FAILED (${errors.length} problem${errors.length === 1 ? '' : 's'}):`);
  for (const e of errors) console.error(`- ${e}`);
  process.exit(1);
}

console.log(`Apply guards PASS (${mode})`);
if (mode !== 'staging') {
  console.log(`Domain Ownership Map pins agree: ${load('domains/ownership-map.json')?.version}`);
  console.log(`K00 manifest pins agree: ${load('kernel/manifest.json')?.version}`);
  const contractIndex = readFileSync(join(ROOT, 'contracts/README.md'), 'utf8');
  console.log(`Contract package pins agree: ${contractIndex.match(/^- Package version: `(\d+\.\d+\.\d+)`/m)?.[1]}`);
  console.log('Migration journal, snapshot chain, FK targets, and readiness counts agree');
  console.log('Structural migration checks do not replace PostgreSQL replay evidence');
}
if (mode !== 'pins') {
  console.log('Stage list covers every modified path');
}
