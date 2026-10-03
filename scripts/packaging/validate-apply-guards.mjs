#!/usr/bin/env node
// Guards for owner-approval / discovery package APPLY runs.
//
// Two failure modes have recurred across packages 0.3.0, 0.4.0 and 0.5.0:
//
//   1. A version bump in one artifact (Domain Ownership Map, K00 manifest) left
//      another validator still pinning the old version, so APPLY died in its
//      own VALIDATE stage.
//   2. A patched file was missing from the APPLY stage list, so validators read
//      it from the working tree and passed while the committed tree was broken
//      — green locally, red in CI.
//
// Usage, from the repository root:
//
//   node scripts/packaging/validate-apply-guards.mjs pins      # after PATCH.py, before `git add`
//   node scripts/packaging/validate-apply-guards.mjs staging   # after `git add`, before `git commit`
//   node scripts/packaging/validate-apply-guards.mjs           # both
//
// `pins` derives expected versions from the live artifacts, so it needs no
// arguments and catches a pin that is stale in either direction.

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, resolve } from 'node:path';

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

// ---------------------------------------------------------------- guard: pins
function checkPins() {
  const ownership = load('domains/ownership-map.json');
  const manifest = load('kernel/manifest.json');
  const mapVersion = ownership?.version;
  const kernelVersion = manifest?.version;
  if (!mapVersion) errors.push('domains/ownership-map.json: no version to compare pins against');
  if (!kernelVersion) errors.push('kernel/manifest.json: no version to compare pins against');
  if (!mapVersion || !kernelVersion) return;

  // Each rule: a pattern whose first capture group is a pinned version, and the
  // live version that capture must equal.
  //
  // Only pins that gate on a LIVE artifact belong here. A registration record's
  // `kernel_version` / `ownership_map_version` is frozen at the revision it was
  // recorded against and must not be rewritten, and version numbers inside
  // error-message prose are historical wording — neither can break an APPLY run,
  // and flagging them would make this guard fail permanently.
  const rules = [
    [/(?:ownership\??\.|map\.)version\s*!==\s*'(\d+\.\d+\.\d+)'/g, mapVersion, 'ownership map version pin'],
    [/manifest\??\.version\s*!==\s*'(\d+\.\d+\.\d+)'/g, kernelVersion, 'K00 manifest version pin'],
  ];

  for (const file of walk('scripts')) {
    if (file === 'scripts/packaging/validate-apply-guards.mjs') continue;
    const text = readFileSync(join(ROOT, file), 'utf8');
    const lines = text.split('\n');
    for (const [pattern, expected, label] of rules) {
      for (const [i, line] of lines.entries()) {
        for (const m of line.matchAll(pattern)) {
          if (m[1] !== expected) {
            errors.push(`${file}:${i + 1}: stale ${label} '${m[1]}' — live value is '${expected}'`);
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
if (mode === 'pins' || mode === 'all') checkPins();
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
}
if (mode !== 'pins') {
  console.log('Stage list covers every modified path');
}
