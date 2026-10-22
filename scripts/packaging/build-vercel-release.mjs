import {cpSync, existsSync, mkdirSync, mkdtempSync, renameSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {buildSuccessorAccepting} from './build-successor-accepting.mjs';

/** Publish the existing reviewed Node adapter as Build Output API output.
 * Configuration remains server-only; missing configuration or Node patch drift
 * still denies through the existing accepting entrypoint before pool creation.
 * This build neither reads credentials nor connects to a provider or database.
 */
export function buildVercelRelease(root = process.cwd()) {
  root = resolve(root);
  const destination = join(root, '.vercel', 'output');
  const pending = join(root, '.vercel', 'output.pending');
  if (existsSync(destination) || existsSync(pending)) throw Error('New Vercel output required');
  const scratch = mkdtempSync(join(tmpdir(), 'teach-vercel-release-'));
  try {
    const output = join(scratch, 'output');
    const manifest = buildSuccessorAccepting(root, output);
    mkdirSync(dirname(destination), {recursive: true});
    cpSync(output, pending, {recursive: true, errorOnExist: true, force: false});
    renameSync(pending, destination);
    return {
      kind: 'TEACH_VERCEL_RELEASE_BUILD',
      sourceCommit: manifest.sourceCommit,
      sourceTree: manifest.sourceTree,
      nodePatch: manifest.nodePatch,
      files: Object.keys(manifest.files).length,
      output: '.vercel/output',
      providerVerified: false
    };
  } finally {
    rmSync(scratch, {recursive: true, force: true});
    rmSync(pending, {recursive: true, force: true});
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  console.log(JSON.stringify(buildVercelRelease(process.argv[2])));
}
