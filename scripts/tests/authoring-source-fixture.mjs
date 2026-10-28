import { cpSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
/** Test-only complete source copy, excluding generated/build/dependency state. */
export function authoringSourceFixture(root, prefix = 'teach-authoring-source-') {
  const path = mkdtempSync(join(tmpdir(), prefix));
  try {
    cpSync(root, path, { recursive: true, filter: source => !/(?:^|\/)(?:\.git|node_modules|\.vercel)(?:\/|$)/.test(source) && !source.includes('/verification/generated/') });
    return path;
  } catch (error) { rmSync(path, { recursive: true, force: true }); throw error; }
}
