#!/usr/bin/env node
// Focused regression coverage for the APPLY live-pin guard.
// Each case runs in a scratch copy so repository state is never mutated.

import { execFileSync } from 'node:child_process';
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const ROOT = resolve(new URL('.', import.meta.url).pathname, '../..');
const results = [];

function scratch() {
  const dir = mkdtempSync(join(tmpdir(), 'pin-guard-'));
  cpSync(ROOT, dir, {
    recursive: true,
    filter: (src) => !src.includes('/.git'),
  });
  return dir;
}

function replaceOrThrow(dir, rel, from, to) {
  const path = join(dir, rel);
  const before = readFileSync(path, 'utf8');
  if (!before.includes(from)) throw new Error(`${rel}: regression fixture source not found: ${from}`);
  writeFileSync(path, before.replace(from, to));
}

function runGuard(dir) {
  try {
    const out = execFileSync('node', [join(dir, 'scripts/packaging/validate-apply-guards.mjs'), 'pins'], {
      cwd: dir,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return { exit: 0, output: out };
  } catch (e) {
    return { exit: e.status ?? 1, output: (e.stdout ?? '') + (e.stderr ?? '') };
  }
}

function test(name, mutate, expect) {
  const dir = scratch();
  try {
    mutate(dir);
    const r = runGuard(dir);
    const ok = expect.pass ? r.exit === 0 : r.exit !== 0 && expect.pattern.test(r.output);
    results.push({
      name,
      ok,
      detail: ok ? 'as expected' : `exit ${r.exit}: ${r.output.slice(0, 500)}`,
    });
  } catch (e) {
    results.push({ name, ok: false, detail: e.message });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

test(
  'alias: stale short K00 handle fails',
  (dir) => {
    replaceOrThrow(
      dir,
      'scripts/persistence/validate-persistence-authority.mjs',
      "m?.version!=='0.15.0'",
      "m?.version!=='0.14.0'",
    );
  },
  { pattern: /stale K00 manifest version pin '0\.14\.0'/ },
);

test(
  'alias: arbitrary live K00 handle fails',
  (dir) => {
    const p = join(dir, 'scripts/tests/pin-alias-regression-fixture.mjs');
    const fixture = [
      ['const j', "=load('kernel/manifest.json');"].join(''),
      ["if(j?.version!==", "'0.13.0') throw new Error('stale');"].join(''),
    ].join('\n');
    writeFileSync(p, fixture + '\n');
  },
  { pattern: /stale K00 manifest version pin '0\.14\.0'/ },
);

test(
  'count: stale approved identifier count fails',
  (dir) => {
    replaceOrThrow(
      dir,
      'scripts/persistence/validate-persistence-authority.mjs',
      ".filter(x=>x.status==='approved').length!==12",
      ".filter(x=>x.status==='approved').length!==4",
    );
  },
  { pattern: /stale live kernel approved count pin '4'.*kernel\/identifiers\.json/ },
);

test(
  'count: stale approved relationship count fails',
  (dir) => {
    replaceOrThrow(
      dir,
      'scripts/persistence/validate-persistence-authority.mjs',
      ".filter(x=>x.status==='approved').length!==11",
      ".filter(x=>x.status==='approved').length!==0",
    );
  },
  { pattern: /stale live kernel approved count pin '0'.*kernel\/relationships\.json/ },
);

test(
  'count: stale state candidate tuple fails',
  (dir) => {
    replaceOrThrow(
      dir,
      'scripts/persistence/audit-first-physical-slice-readiness.mjs',
      "['states-candidate',(states?.entries||[]).filter(x=>x.status==='candidate').length,2]",
      "['states-candidate',(states?.entries||[]).filter(x=>x.status==='candidate').length,18]",
    );
  },
  { pattern: /stale live kernel candidate count pin '18'.*kernel\/states\.json/ },
);

test(
  'relative loader: kernel-rooted manifest pin fails',
  (dir) => {
    replaceOrThrow(
      dir,
      'scripts/kernel/validate-semantic-kernel.mjs',
      "if (manifest.version !== '0.15.0')",
      "if (manifest.version !== '0.14.0')",
    );
  },
  { pattern: /stale K00 manifest version pin '0\.13\.0'/ },
);

test(
  'derived registry: stale approved commands count fails',
  (dir) => {
    replaceOrThrow(
      dir,
      'scripts/kernel/validate-semantic-kernel.mjs',
      "if ([...(docs['commands.json']?.entries || [])].filter(c => c.status === 'approved').length !== 23)",
      "if ([...(docs['commands.json']?.entries || [])].filter(c => c.status === 'approved').length !== 22)",
    );
  },
  { pattern: /stale live kernel approved count pin '22'.*kernel\/commands\.json/ },
);

test(
  'contract package: stale live package pin fails',
  (dir) => {
    replaceOrThrow(
      dir,
      'scripts/governance/validate-strict-nine-ratification.mjs',
      "!index.includes('\"version\": \"0.12.1\"') || !index.includes('- Package version: `0.12.1`')",
      "!index.includes('\"version\": \"0.12.0\"') || !index.includes('- Package version: `0.12.0`')",
    );
  },
  { pattern: /stale contract package version pin '0\.12\.0'/ },
);

test(
  'frozen evidence: historical versions do not become live pins',
  (dir) => {
    const p = join(dir, 'scripts/tests/frozen-pin-regression-fixture.mjs');
    const fixture = [
      ['const frozen', "=load('governance/2026-10-04-strict-nine-ratification.json');"].join(''),
      ["if(frozen?.kernel_version!==", "'0.13.0') throw new Error('historical K00 drift');"].join(''),
      ["if(frozen?.contract_package_version!==", "'0.11.2') throw new Error('historical package drift');"].join(''),
    ].join('\n');
    writeFileSync(p, fixture + '\n');
  },
  { pass: true },
);

test('clean repository passes', () => {}, { pass: true });

let failed = 0;
for (const r of results) {
  console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.name}`);
  if (!r.ok) {
    failed++;
    console.log(`      ${r.detail}`);
  }
}
console.log(`\n${results.length - failed}/${results.length} APPLY guard regression tests passed.`);
process.exit(failed ? 1 : 0);
