/** Test/proof-only copy. Authenticate the complete live candidate, then restore
 * its byte-exact predecessor in an isolated directory; never edit the checkout. */
import { constants, cpSync, lstatSync, mkdtempSync, readdirSync, readlinkSync, realpathSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { isAbsolute, join, relative, resolve } from 'node:path';
import { installAuthoringPredecessor } from './authoring-predecessor-fixture.mjs';
// Dependency links must remain wholly inside the owned copy. Never turn a
// verbatim absolute/outward link into an alias that can mutate the installation.
function verifyDependencyLinks(base, directory = base) {
  for (const name of readdirSync(directory)) {
    const path = join(directory, name), stat = lstatSync(path);
    if (stat.isSymbolicLink()) {
      const target = readlinkSync(path);
      let depth = relative(base, directory).split('/').filter(Boolean).length;
      for (const part of target.split('/')) {
        if (part === '..') { if (--depth < 0) throw Error('dependency symlink must stay inside copied installation'); }
        else if (part && part !== '.') depth++;
      }
      const resolved = relative(base, realpathSync(path));
      if (isAbsolute(target) || resolved === '..' || resolved.startsWith('../') || isAbsolute(resolved)) throw Error('dependency symlink must stay inside copied installation');
    } else if (stat.isDirectory()) verifyDependencyLinks(base, path);
    else if (!stat.isFile()) throw Error('dependency installation permits only regular files, directories and internal relative symlinks');
  }
}
export function createAuthoringPredecessorCopy(root) {
  root = resolve(root);
  const copy = mkdtempSync(join(tmpdir(), 'teach-authoring-predecessor-'));
  try {
    cpSync(root, copy, { recursive: true, filter: path => !['.git', 'node_modules', '.vercel'].includes(relative(root, path).split('/')[0]) });
    installAuthoringPredecessor(copy);
    const dependencies = realpathSync(join(root, 'node_modules'));
    verifyDependencyLinks(dependencies);
    cpSync(dependencies, join(copy, 'node_modules'), { recursive: true, verbatimSymlinks: true, mode: constants.COPYFILE_FICLONE });
    verifyDependencyLinks(join(copy, 'node_modules'));
    return { root: copy, remove: () => rmSync(copy, { recursive: true, force: true }) };
  } catch (error) { rmSync(copy, { recursive: true, force: true }); throw error; }
}
