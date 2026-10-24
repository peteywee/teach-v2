import {cpSync, existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, renameSync, rmSync, writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';
import {tmpdir} from 'node:os';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import pg from 'pg';
import {buildSuccessorAccepting} from './build-successor-accepting.mjs';
import {bundleInventory} from './build-successor-local.mjs';

/** Two independent, read-only login tests using the same server-held credential.
 * No password/hash, connection string, SQL parameter or raw driver message is logged.
 * These build diagnostics never become an endpoint or change application admission.
 */
export async function compareDatabaseLogins(configuration, {Client = pg.Client, sourceCommit} = {}) {
  const p = configuration?.options;
  if (p?.host !== 'aws-1-us-east-2.pooler.supabase.com' || p.user !== 'teach_v2_demo_runtime.acqafjkdkdmtpnsxiesw' ||
      p.port !== 6543 || p.database !== 'postgres' || typeof p.password !== 'string' || !p.password ||
      p.ssl?.rejectUnauthorized !== true || p.ssl.minVersion !== 'TLSv1.2' ||
      typeof p.ssl.ca !== 'string' || !p.ssl.ca.includes('-----BEGIN CERTIFICATE-----') || !/^[a-f0-9]{40}$/.test(sourceCommit ?? '')) {
    return {kind: 'TEACH_DATABASE_LOGIN_COMPARISON', status: 'BLOCKED', reason: 'EXACT_CONFIG_AND_SOURCE_REQUIRED'};
  }
  const targets = [
    {test: 'vercel-pooler', host: p.host, port: 6543, user: p.user},
    {test: 'supabase-direct', host: 'db.acqafjkdkdmtpnsxiesw.supabase.co', port: 5432, user: 'teach_v2_demo_runtime'}
  ];
  const networkCodes = new Set(['ECONNREFUSED','ETIMEDOUT','ENOTFOUND','EAI_AGAIN','ECONNRESET','ECONNABORTED','ENETUNREACH','EHOSTUNREACH','ERR_TLS_CERT_ALTNAME_INVALID','SELF_SIGNED_CERT_IN_CHAIN','DEPTH_ZERO_SELF_SIGNED_CERT','UNABLE_TO_VERIFY_LEAF_SIGNATURE','UNABLE_TO_GET_ISSUER_CERT_LOCALLY','CERT_HAS_EXPIRED']);
  async function probe(target) {
    const result = {test: target.test, authenticated: false, identityVerified: false, readOnly: false, tlsVerified: false, stage: 'connect', status: 'FAIL'};
    let client;
    try {
      client = new Client({host: target.host, port: target.port, user: target.user, database: 'postgres', password: p.password,
        ssl: {...p.ssl}, connectionTimeoutMillis: 3000, query_timeout: 2000,
        statement_timeout: 2000, options: '-c default_transaction_read_only=on'});
      await client.connect();
      result.authenticated = true;
      const stream = client.connection?.stream;
      result.tlsVerified = stream?.encrypted === true && stream?.authorized === true;
      result.stage = 'readback';
      const reply = await client.query("SELECT current_user AS role, current_database() AS database, current_setting('transaction_read_only') AS read_only");
      result.identityVerified = reply.rows?.length === 1 && reply.rows[0].role === 'teach_v2_demo_runtime' && reply.rows[0].database === 'postgres';
      result.readOnly = reply.rows?.[0]?.read_only === 'on';
      if (result.identityVerified && result.readOnly && result.tlsVerified) result.status = 'PASS';
      else result.code = 'READBACK_NOT_VERIFIED';
    } catch (error) {
      result.code = typeof error?.code === 'string' && (/^[0-9A-Z]{5}$/.test(error.code) || networkCodes.has(error.code)) ? error.code : 'UNCLASSIFIED';
    } finally {
      if (client) {
        let timer;
        try {
          await Promise.race([
            Promise.resolve().then(() => client.end()).catch(() => {result.cleanupFailed = true;}),
            new Promise(resolve => {timer = setTimeout(() => {result.cleanupFailed = true; try {client.connection?.stream?.destroy();} catch {} resolve();}, 500);})
          ]);
        } finally {clearTimeout(timer);}
        if (result.cleanupFailed) result.status = 'FAIL';
      }
    }
    return result;
  }
  const tests = await Promise.all(targets.map(probe));
  let comparison = 'INCONCLUSIVE';
  if (tests.every(t => t.status === 'PASS')) comparison = 'BOTH_AUTHENTICATED';
  else if (tests.every(t => !t.authenticated && t.code === '28P01')) comparison = 'BOTH_REJECTED_PASSWORD';
  else if (tests[1].status === 'PASS' && !tests[0].authenticated && tests[0].code === '28P01') comparison = 'DIRECT_ACCEPTED_POOLER_REJECTED';
  return {kind: 'TEACH_DATABASE_LOGIN_COMPARISON', sourceCommit, credentialSource: 'same-production-environment-value', tests, comparison};
}

async function runProductionLoginComparison(manifest) {
  if (process.env.VERCEL !== '1' || process.env.VERCEL_ENV !== 'production') return;
  let result;
  try {
    const configUrl = pathToFileURL(resolve(manifest.output, 'functions/demo.func/src/bootstrap/demo-successor/runtime-config.js')).href;
    const {captureRuntimeConfiguration} = await import(configUrl);
    result = await compareDatabaseLogins(captureRuntimeConfiguration(process.env), {sourceCommit: manifest.sourceCommit});
  } catch {result = {kind: 'TEACH_DATABASE_LOGIN_COMPARISON', status: 'BLOCKED', reason: 'CONFIGURATION_NOT_VERIFIED'};}
  console.info(JSON.stringify(result));
}

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

/** Observe existing driver promises only; no connection, query, retry or pool is added. */
export function addVercelDatabaseDiagnostics(bundle) {
  const path = join(bundle, 'vercel-launcher.mjs');
  const launcher = readFileSync(path, 'utf8');
  if (!launcher.startsWith("import handler from './src/bootstrap/demo-successor/accepting-entrypoint.js';")) throw Error('Expected startup launcher required');
  writeFileSync(join(bundle, 'vercel-database-diagnostics.mjs'), `import pg from 'pg';
const allowedCodes=new Set(['ECONNREFUSED','ETIMEDOUT','ENOTFOUND','EAI_AGAIN','ECONNRESET','ECONNABORTED','ERR_TLS_CERT_ALTNAME_INVALID','SELF_SIGNED_CERT_IN_CHAIN','DEPTH_ZERO_SELF_SIGNED_CERT','UNABLE_TO_VERIFY_LEAF_SIGNATURE','UNABLE_TO_GET_ISSUER_CERT_LOCALLY','CERT_HAS_EXPIRED']);
const connected=new WeakSet();
function failure(stage,error){
  try{
    const code=typeof error?.code==='string'&&(/^[0-9A-Z]{5}$/.test(error.code)||allowedCodes.has(error.code))?error.code:'UNCLASSIFIED';
    const category=typeof error?.message==='string'&&/tenant or user not found/i.test(error.message)?'POOLER_TARGET':'DRIVER_ERROR';
    console.error(JSON.stringify({kind:'TEACH_VERCEL_DATABASE_FAILURE',stage,code,category}));
  }catch{/* Observability cannot replace the original result/error. */}
}
function connection(client){
  try{if(connected.has(client))return;connected.add(client);const stream=client.connection?.stream;console.info(JSON.stringify({kind:'TEACH_VERCEL_DATABASE_CONNECTION',encrypted:stream?.encrypted===true,authorized:stream?.authorized===true}));}catch{/* Preserve the client. */}
}
for(const [prototype,key,stage]of [[pg.Pool.prototype,'connect','connect'],[pg.Client.prototype,'query','query']]){
  const original=prototype[key];
  prototype[key]=function(...args){
    let result;
    try{result=Reflect.apply(original,this,args);}catch(error){failure(stage,error);throw error;}
    if(!result||typeof result.then!=='function')return result;
    return result.then(value=>{if(stage==='connect')connection(value);return value;},error=>{failure(stage,error);throw error;});
  };
}
`, {flag: 'wx'});
  writeFileSync(path, "import './vercel-database-diagnostics.mjs';\n" + launcher);
}

/** External document navigation may read only the existing public welcome page.
 * Run the reviewed handler first: runtime/configuration/Host denials stay intact.
 * Never rewrite request metadata or change an API response.
 */
export function addVercelPublicNavigation(bundle) {
  const path = join(bundle, '.vc-config.json');
  const config = JSON.parse(readFileSync(path, 'utf8'));
  if (config.handler !== 'vercel-launcher.mjs' || config.runtime !== 'nodejs24.x') throw Error('Expected diagnostic handler required');
  const welcomeSha256 = createHash('sha256').update(readFileSync(join(bundle, 'src/web/demo/index.html'))).digest('hex');
  writeFileSync(join(bundle, 'vercel-public-navigation.mjs'), `import handler from './vercel-launcher.mjs';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {captureRuntimeConfiguration} from './src/bootstrap/demo-successor/runtime-config.js';
import {toHostedRequest} from './src/bootstrap/demo-hosted/node-adapter.js';
export default async function publicNavigation(incoming,outgoing){
  if(incoming.method!=='GET'||incoming.url!=='/')return handler(incoming,outgoing);
  let request;
  try{request=toHostedRequest(incoming,captureRuntimeConfiguration(process.env).origin);}catch{return handler(incoming,outgoing);}
  const url=new URL(request.url),headers=request.headers;
  const documentNavigation=request.method==='GET'&&url.pathname==='/'&&!url.search&&!headers.has('origin')&&
    ['cross-site','same-site'].includes(headers.get('sec-fetch-site'))&&headers.get('sec-fetch-mode')==='navigate'&&headers.get('sec-fetch-dest')==='document';
  if(!documentNavigation)return handler(incoming,outgoing);
  let status,responseHeaders,body;
  await handler(incoming,{writeHead(code,value){status=code;responseHeaders=value;},end(value){body=value;}});
  let forbidden=false;
  try{forbidden=status===403&&JSON.parse(body).error.code==='FORBIDDEN'&&!Object.hasOwn(responseHeaders,'set-cookie');}catch{/* Preserve every other response. */}
  if(forbidden){
    try{
      const welcome=readFileSync(new URL('./src/web/demo/index.html',import.meta.url));
      if(createHash('sha256').update(welcome).digest('hex')===${JSON.stringify(welcomeSha256)}){
        outgoing.writeHead(200,{...responseHeaders,'content-type':'text/html; charset=utf-8'});outgoing.end(welcome);return;
      }
    }catch{/* Missing or modified bytes preserve the reviewed denial. */}
  }
  outgoing.writeHead(status,responseHeaders);outgoing.end(body);
}
`, {flag: 'wx'});
  writeFileSync(path, JSON.stringify({...config, handler: 'vercel-public-navigation.mjs'}));
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
    addVercelDatabaseDiagnostics(join(output, 'functions', 'demo.func'));
    addVercelPublicNavigation(join(output, 'functions', 'demo.func'));
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
    const env = {...process.env};
    // Runtime provisioning uses a different user agent. Let the actual pnpm
    // executable generate its own exec metadata; never synthesize a version claim.
    delete env.npm_config_user_agent;
    delete env.npm_execpath;
    execFileSync('pnpm', ['exec', process.execPath, fileURLToPath(import.meta.url)],
      {cwd: process.cwd(), env, timeout: 25000, stdio: 'inherit'});
  } else {
    const manifest = buildVercelRelease(process.argv[2]);
    console.log(JSON.stringify(manifest));
    await runProductionLoginComparison(manifest);
  }
}
