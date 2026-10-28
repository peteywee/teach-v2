/** Test/proof-only copy. Authenticate the complete live candidate, then restore
 * its byte-exact predecessor in an isolated directory; never edit the checkout. */
import { cpSync, mkdtempSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative, resolve } from 'node:path';
import { installAuthoringPredecessor } from './authoring-predecessor-fixture.mjs';
export function createAuthoringPredecessorCopy(root) {
  root = resolve(root);
  const copy = mkdtempSync(join(tmpdir(), 'teach-authoring-predecessor-'));
  try {
    cpSync(root, copy, { recursive: true, filter: path => !['.git', 'node_modules', '.vercel'].includes(relative(root, path).split('/')[0]) });
    installAuthoringPredecessor(copy);
    symlinkSync(join(root, 'node_modules'), join(copy, 'node_modules'), 'dir');
    return { root: copy, remove: () => rmSync(copy, { recursive: true, force: true }) };
  } catch (error) { rmSync(copy, { recursive: true, force: true }); throw error; }
}
