import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative, resolve } from 'node:path';
const root = resolve(process.cwd());
const dir = mkdtempSync(join(tmpdir(), 'p05-generated-'));
try {
  cpSync(join(root, 'drizzle'), dir, { recursive: true });
  rmSync(join(dir, '0004_slice_p05_learning_session.sql'));
  rmSync(join(dir, 'meta/0004_snapshot.json'));
  const journal = JSON.parse(readFileSync(join(dir, 'meta/_journal.json'), 'utf8'));
  journal.entries = journal.entries.filter((entry) => entry.idx < 4);
  writeFileSync(join(dir, 'meta/_journal.json'), JSON.stringify(journal));
  const config = join(dir, 'generation.config.ts');
  writeFileSync(config, `import config from ${JSON.stringify(join(root, 'drizzle.config.ts'))};\nexport default { ...config, out: ${JSON.stringify(relative(root, dir))} };\n`);
  execFileSync('pnpm', ['exec', 'drizzle-kit', 'generate', '--name', 'slice_p05_learning_session', '--config', config], { cwd: root, encoding: 'utf8', timeout: 25000, stdio: 'pipe' });
  const sql = readFileSync(join(root, 'drizzle/0004_slice_p05_learning_session.sql'), 'utf8');
  const marker = '\n--> statement-breakpoint\n-- P05 lifecycle guards';
  assert.ok(sql.includes(marker), 'custom lifecycle guard marker required');
  assert.equal(readFileSync(join(dir, '0004_slice_p05_learning_session.sql'), 'utf8').trim(), sql.split(marker)[0].trim());
  const generated = JSON.parse(readFileSync(join(dir, 'meta/0004_snapshot.json'), 'utf8'));
  const committed = JSON.parse(readFileSync(join(root, 'drizzle/meta/0004_snapshot.json'), 'utf8'));
  // The new snapshot UUID is random; every schema field and its prior ID must match.
  delete generated.id; delete committed.id;
  assert.deepEqual(generated, committed);
  console.log('SLICE-P05 PINNED DRIZZLE GENERATION PASS');
} finally { rmSync(dir, { recursive: true, force: true }); }
