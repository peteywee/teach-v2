import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative, resolve } from 'node:path';
import { inspectAuthoringPhysicalSuccessor } from '../persistence/demo-authoring-physical-successor.mjs';

const root = resolve(process.cwd()), dir = mkdtempSync(join(tmpdir(), 'authoring-generated-'));
try {
  const proof = inspectAuthoringPhysicalSuccessor(root);
  assert.equal(proof.admitted, true); assert.deepEqual(proof.errors, [], 'current authoring generation requires exact reviewed physical admission');
  cpSync(join(root, 'drizzle'), dir, { recursive: true });
  rmSync(join(dir, '0008_demo_manager_authoring.sql')); rmSync(join(dir, 'meta/0008_snapshot.json'));
  const journal = JSON.parse(readFileSync(join(dir, 'meta/_journal.json'), 'utf8'));
  assert.equal(journal.entries.length, 9); journal.entries = journal.entries.slice(0, 8);
  writeFileSync(join(dir, 'meta/_journal.json'), JSON.stringify(journal));
  const config = join(dir, 'generation.config.ts');
  writeFileSync(config, `import config from ${JSON.stringify(join(root, 'drizzle.config.ts'))};\nexport default {...config,out:${JSON.stringify(relative(root, dir))}};\n`);
  execFileSync('pnpm', ['exec', 'drizzle-kit', 'generate', '--name', 'demo_manager_authoring', '--config', config], { cwd: root, encoding: 'utf8', timeout: 25000, stdio: 'pipe' });
  const committed = readFileSync(join(root, 'drizzle/0008_demo_manager_authoring.sql'), 'utf8');
  const marker = '\n--> statement-breakpoint\n-- Reviewed demo authoring guards.';
  assert.equal(committed.split(marker).length, 2, 'one exact boundary between generated DDL and separately reviewed guards');
  assert.equal(readFileSync(join(dir, '0008_demo_manager_authoring.sql'), 'utf8').trim(), committed.split(marker)[0].trim());
  const generated = JSON.parse(readFileSync(join(dir, 'meta/0008_snapshot.json'), 'utf8'));
  const snapshot = JSON.parse(readFileSync(join(root, 'drizzle/meta/0008_snapshot.json'), 'utf8'));
  delete generated.id; delete snapshot.id; assert.deepEqual(generated, snapshot);
  assert.equal(Object.keys(snapshot.tables).length, 24);
  const old = JSON.parse(readFileSync(join(root, 'drizzle/meta/0007_snapshot.json'), 'utf8'));
  assert.equal(Object.keys(old.tables).length, 22);
  for (const [table, model] of Object.entries(old.tables)) assert.deepEqual(snapshot.tables[table], model, `old model changed: ${table}`);
  console.log('AUTHORING PINNED DRIZZLE GENERATION PASS: 2 new tables, 24 total; prior eight immutable');
} finally { rmSync(dir, { recursive: true, force: true }); }
