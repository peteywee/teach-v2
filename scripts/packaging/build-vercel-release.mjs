import {cpSync, existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, renameSync, rmSync, writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';
import {tmpdir} from 'node:os';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {buildSuccessorAccepting} from './build-successor-accepting.mjs';
import {bundleInventory} from './build-successor-local.mjs';

/** Read-only operator diagnostics; the reviewed handler retains every admission check. */
export function addVercelStartupDiagnostics(bundle) {
  const path = join(bundle, '.vc-config.json');
  const config = JSON.parse(readFileSync(path, 'utf8'));
  if (config.handler !== 'src/bootstrap/demo-successor/accepting-entrypoint.js' || config.runtime !== 'nodejs24.x') throw Error('Expected accepting handler required');
  writeFileSync(join(bundle, 'vercel-launcher.mjs'), `import handler from './src/bootstrap/demo-successor/accepting-entrypoint.js';
import {runtimeReadback} from './src/bootstrap/demo-successor/entrypoint.js';
import {captureRuntimeConfiguration} from './src/bootstrap/demo-successor/runtime-config.js';
const runtime=runtimeReadback();
let configurationValid=false;
try{captureRuntimeConfiguration(process.env);configurationValid=true;}catch{/* Values and caught errors never enter logs. */}
const missingConfiguration=['TEACH_DB_SCHEMA','TEACH_SUPABASE_PROJECT','TEACH_DEMO_ORIGIN','TEACH_DB_HOST','TEACH_DB_USER','TEACH_DB_PASSWORD','TEACH_DB_CA'].filter(key=>!process.env[key]);
console.info(JSON.stringify({kind:'TEACH_VERCEL_STARTUP',runtime,configurationValid,missingConfiguration}));
export default handler;
`, {flag: 'wx'});
  writeFileSync(path, JSON.stringify({...config, handler: 'vercel-launcher.mjs'}));
}

/** Restore only equivalent JSON formatting; changed configuration stays blocked. */
export function restoreVercelConfigFormatting(root) {
  const path = join(root, 'vercel.json');
  if (!lstatSync(path).isFile()) throw Error('Regular Vercel configuration required');
  const committed = execFileSync('git', ['--no-optional-locks', 'show', 'HEAD:vercel.json'], {
    cwd: root, timeout: 5000, env: {...process.env, GIT_NO_REPLACE_OBJECTS: '1'}
  });
  const current = readFileSync(path);
  if (current.equals(committed)) return false;
  let actual, expected;
  try { actual = JSON.parse(current); expected = JSON.parse(committed); }
  catch { throw Error('Invalid Vercel configuration JSON'); }
  if (!isDeepStrictEqual(actual, expected)) {
    const keys = [...new Set([...Object.keys(expected ?? {}), ...Object.keys(actual ?? {})])];
    const changed = keys.filter(key => !isDeepStrictEqual(actual?.[key], expected?.[key]));
    throw Error('Vercel configuration values differ from committed source: ' + JSON.stringify(changed.slice(0, 20)));
  }
  writeFileSync(path, committed);
  return true;
}

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
  if (process.env.VERCEL === '1' && restoreVercelConfigFormatting(root)) {
    console.log(JSON.stringify({kind: 'TEACH_VERCEL_CONFIG_FORMATTING_RESTORED'}));
  }
  const scratch = mkdtempSync(join(tmpdir(), 'teach-vercel-release-'));
  try {
    const output = join(scratch, 'output');
    const manifest = buildSuccessorAccepting(root, output);
    addVercelStartupDiagnostics(join(output, 'functions', 'demo.func'));
    const files = bundleInventory(output);
    writeFileSync(join(output, 'vercel-release-manifest.json'), JSON.stringify({
      kind: 'TEACH_VERCEL_RELEASE_MANIFEST', sourceCommit: manifest.sourceCommit,
      sourceTree: manifest.sourceTree, nodePatch: manifest.nodePatch,
      acceptingManifestSha256: createHash('sha256').update(readFileSync(join(output, 'accepting-manifest.json'))).digest('hex'),
      files
    }, null, 2) + '\n', {flag: 'wx'});
    mkdirSync(dirname(destination), {recursive: true});
    cpSync(output, pending, {recursive: true, errorOnExist: true, force: false});
    renameSync(pending, destination);
    return {
      kind: 'TEACH_VERCEL_RELEASE_BUILD',
      sourceCommit: manifest.sourceCommit,
      sourceTree: manifest.sourceTree,
      nodePatch: manifest.nodePatch,
      files: Object.keys(files).length + 1,
      output: '.vercel/output',
      providerVerified: false
    };
  } catch (error) {
    if (error?.message === 'Pinned pnpm12.8.1 required') {
      let executableVersion = null;
      try {
        const executable = process.env.npm_execpath;
        if (executable) {
          const script = /\.(?:mjs|cjs|js)$/.test(executable);
          const reported = execFileSync(script ? process.execPath : executable, script ? [executable, '--version'] : ['--version'], {
            cwd: root, encoding: 'utf8', timeout: 5000, stdio: ['ignore', 'pipe', 'ignore']
          }).trim();
          if (/^v?\d+\.\d+\.\d+$/.test(reported)) executableVersion = reported;
        }
      } catch { /* Preserve the original guard refusal. */ }
      console.error(JSON.stringify({kind: 'TEACH_VERCEL_PNPM_STATUS',
        agentMatches: /^pnpm\/12\.8\.1(?: |$)/.test(process.env.npm_config_user_agent ?? ''),
        executablePresent: Boolean(process.env.npm_execpath), executableVersion}));
    }
    if (error?.message === 'Clean source required') {
      let status = {unavailable: true};
      try {
        const entries = execFileSync('git', ['--no-optional-locks', 'status', '--porcelain=v1', '-z', '--untracked-files=all'], {
          cwd: root, encoding: 'utf8', timeout: 5000,
          env: {...process.env, GIT_NO_REPLACE_OBJECTS: '1'}
        }).split('\0').filter(Boolean);
        status = {entries: entries.slice(0, 20), omitted: Math.max(0, entries.length - 20)};
      } catch { /* Preserve the original build refusal if diagnostics fail. */ }
      console.error(JSON.stringify({kind: 'TEACH_VERCEL_SOURCE_STATUS', ...status}));
    }
    throw error;
  } finally {
    rmSync(scratch, {recursive: true, force: true});
    rmSync(pending, {recursive: true, force: true});
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv[2] === '--via-pnpm') {
    const executable = process.env.npm_execpath;
    if (!executable) throw Error('Package-manager executable required');
    const script = /\.(?:mjs|cjs|js)$/.test(executable);
    const env = {...process.env};
    // Runtime provisioning uses a different user agent. Let the actual pnpm
    // executable generate its own exec metadata; never synthesize a version claim.
    delete env.npm_config_user_agent;
    execFileSync(script ? process.execPath : executable,
      [...(script ? [executable] : []), 'exec', process.execPath, fileURLToPath(import.meta.url)],
      {cwd: process.cwd(), env, timeout: 25000, stdio: 'inherit'});
  } else console.log(JSON.stringify(buildVercelRelease(process.argv[2])));
}
