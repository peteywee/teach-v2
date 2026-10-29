/** Test-only exact authoring → released-kitchen reconstruction. This module is
 * never imported by runtime or admission. Current source, independent review and
 * physical prefix are all checked before any historical bytes are written. */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { existsSync, lstatSync, readdirSync, realpathSync, readFileSync, writeFileSync, rmSync, rmdirSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { inspectAuthoringRegistration } from '../kernel/demo-authoring-registration.mjs';
import { inspectAuthoringEngineering, AUTHORING_ENGINEERING_MANIFEST, AUTHORING_ENGINEERING_REVIEW } from '../verification/demo-authoring-engineering.mjs';
import { inspectAuthoringPhysicalSuccessor } from '../persistence/demo-authoring-physical-successor.mjs';

export function installAuthoringPredecessor(root) {
  const source = inspectAuthoringRegistration(root);
  assert.deepEqual(source.errors, [], 'current authoring source must authenticate before fixture projection');
  if (!source.present) return () => {};
  const engineering = inspectAuthoringEngineering(root), physical = inspectAuthoringPhysicalSuccessor(root);
  for (const result of [engineering, physical]) { assert.equal(result.present, true); assert.deepEqual(result.errors, []); }
  assert.equal(physical.admitted, true, 'current complete immutable SQL prefix must authenticate before fixture unwind');
  const removed = [...new Set([...source.addedPaths, ...engineering.addedPaths, ...physical.addedPaths, AUTHORING_ENGINEERING_MANIFEST, AUTHORING_ENGINEERING_REVIEW])];
  const predecessors = { ...source.predecessorFiles, ...engineering.predecessorFiles };
  assert.ok(removed.every(path => !Object.hasOwn(predecessors, path)), 'successor addition cannot replace a predecessor');
  const live = new Map([...new Set([...removed, ...Object.keys(predecessors)])].map(path => [path, readFileSync(join(root, path), 'utf8')]));
  const directories = [...new Set(['domains/demo-authoring/proposal-0.1.0', 'domains/demo-authoring', 'verification/demo-authoring', 'persistence/physical-slices/demo-authoring', ...(engineering.addedDirectories ?? [])])].sort((a, b) => b.split('/').length - a.split('/').length || b.localeCompare(a));
  let restored = false;
  const restore = () => {
    if (restored) return;
    for (const [path, bytes] of live) { mkdirSync(dirname(join(root, path)), { recursive: true }); writeFileSync(join(root, path), bytes); }
    restored = true;
  };
  try {
    for (const [path, bytes] of Object.entries(predecessors)) writeFileSync(join(root, path), bytes);
    for (const path of removed) rmSync(join(root, path));
    // Nonrecursive removal refuses unknown evidence instead of concealing it.
    for (const path of directories) if (existsSync(join(root, path))) rmdirSync(join(root, path));
    return restore;
  } catch (error) { restore(); throw error; }
}
export function withAuthoringPredecessor(root, work) {
  const restore = installAuthoringPredecessor(root);
  try {
    const result = work();
    if (result && typeof result.then === 'function') return result.finally(restore);
    restore(); return result;
  } catch (error) { restore(); throw error; }
}

// Reviewed scheduling successor for exactly the two frozen whole-audit controls.
// Historical source stays byte-exact; its genuine runner owns child execution.
const HISTORICAL_RUNNER='scripts/architecture/validate-whole-repository.mjs';
const HISTORICAL_INTEGRATION='scripts/architecture/validate-repository-integration.mjs';
const HISTORICAL_NEGATIVE='scripts/persistence/validate-persistence-semantic-closure-registration.mjs';
const HISTORICAL_NEGATIVE_SUFFIX='\nprocess.exit(1);\n';
const historicalHash=value=>createHash('sha256').update(value).digest('hex');
export function inspectHistoricalAuditFixture(root,control) {
  assert.equal(typeof root,'string');assert.ok(root.length);assert.ok(['positive','negative'].includes(control),'exact historical control required');
  assert.equal(realpathSync(root),resolve(root),'historical fixture root must be canonical');
  assert.ok(lstatSync(root).isDirectory()&&!lstatSync(root).isSymbolicLink(),'historical root must be a real directory');
  assert.ok(lstatSync(join(root,'scripts')).isDirectory()&&!lstatSync(join(root,'scripts')).isSymbolicLink(),'historical scripts must be a real directory');
  const walk=path=>readdirSync(join(root,path),{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name)).flatMap(entry=>{
    const child=path+'/'+entry.name;assert.ok(!entry.isSymbolicLink(),'historical script symlink forbidden');
    if(entry.isDirectory())return walk(child);assert.ok(entry.isFile(),'historical script must be regular');return [child];
  });
  const paths=walk('scripts').sort();
  const rows=paths.map(path=>{let bytes=readFileSync(join(root,path));
    if(control==='negative'&&path===HISTORICAL_NEGATIVE){const text=bytes.toString('utf8');assert.ok(text.endsWith(HISTORICAL_NEGATIVE_SUFFIX),'exact original negative mutation required');bytes=Buffer.from(text.slice(0,-HISTORICAL_NEGATIVE_SUFFIX.length));}
    return [path,historicalHash(bytes)];
  });
  assert.equal(paths.length,205,'exact historical script inventory required');
  assert.equal(historicalHash(JSON.stringify(rows)),'b6841e1a7abafc68c2ed184f3e233207ed83a9cd66436dd651bbb5b51c6cf028','exact complete historical script bytes required');
  assert.equal(historicalHash(readFileSync(join(root,HISTORICAL_RUNNER))),'fdf948be05967a2abe3b06da9c79b3863661271c6dd3eee391a2cf344f4a66b7');
}
export function reconcileHistoricalAuditResults(scripts,results) {
  assert.equal(scripts.length,59);assert.equal(historicalHash(JSON.stringify(scripts)),'cb35fb4a99bb6950b0cba9b44530287ceb1089b76ff5b68d2f460dabadf8242c','exact historical validator roster required');
  assert.ok(scripts.includes(HISTORICAL_INTEGRATION),'required repository integration validator missing');
  assert.equal(results.length,scripts.length,'every historical validator result required');
  assert.equal(new Set(results.map(result=>result.path)).size,scripts.length,'duplicate historical result');
  return scripts.map(path=>{const result=results.find(result=>result.path===path);assert.ok(result,'missing historical result');
    assert.equal(typeof result.stdout,'string');assert.equal(typeof result.stderr,'string');
    assert.ok(Number.isInteger(result.status)||result.status===null);assert.ok(result.signal===null||typeof result.signal==='string');assert.ok(result.error===null||typeof result.error==='string');return result;
  });
}
export function historicalAuditErrors(scripts,rawResults) {
  const results=reconcileHistoricalAuditResults(scripts,rawResults),errors=[];
  for(const result of results)if(result.status!==0||result.error||result.signal)errors.push(`${result.path}: ${result.error||((result.stdout||'')+(result.stderr||'')).trim()||'validator terminated '+result.signal}`);
  return errors;
}
export async function runHistoricalWholeAudit(root,control) {
  inspectHistoricalAuditFixture(root,control);
  const historical=await import(pathToFileURL(join(root,HISTORICAL_RUNNER)).href);
  assert.equal(typeof historical.discoverAuthorityValidators,'function');assert.equal(typeof historical.runAuthorityValidators,'function');
  const scripts=historical.discoverAuthorityValidators(root);
  // Authenticate the roster before any child launch, not merely at reconciliation.
  assert.equal(scripts.length,59);assert.equal(historicalHash(JSON.stringify(scripts)),'cb35fb4a99bb6950b0cba9b44530287ceb1089b76ff5b68d2f460dabadf8242c');
  const integration=await historical.runAuthorityValidators(root,[HISTORICAL_INTEGRATION]);
  const remaining=await historical.runAuthorityValidators(root,scripts.filter(path=>path!==HISTORICAL_INTEGRATION));
  const errors=historicalAuditErrors(scripts,[...integration,...remaining]);
  if(errors.length){console.error(`WHOLE-REPOSITORY AUDIT FAILED (${errors.length})\n${errors.join('\n')}`);return 1;}
  console.log(`WHOLE-REPOSITORY AUDIT PASS: ${scripts.length} standalone authority/admission validators`);
  console.log('PROVEN: module/layer dependency checks, Application-owned repository ports, isolated execution entry guards, future queue/admission reconciliation');
  const {inspectDemoStorageEvidence}=await import(pathToFileURL(join(root,'scripts/persistence/demo-storage-evidence.mjs')).href);
  const storage=inspectDemoStorageEvidence(root);
  console.log(storage.extended&&storage.errors.length===0
    ? 'ADMIT: exact demo P05 extension/P06 Assignment/P08 ProgressEvent authoring only; UNDER_TEST: current storage proof; BLOCK: P07 Certification; UNKNOWN: all-command runtime authorization/audit/orchestration conformance; BLOCKED: shared/production execution'
    : 'BLOCK: P06/P07/P08 admission; UNKNOWN: all-command runtime authorization/audit/orchestration conformance; BLOCKED: shared/production execution');
  return 0;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  assert.equal(process.argv.length,5);assert.equal(process.argv[2],'--historical-whole-audit');
  process.exitCode=await runHistoricalWholeAudit(process.argv[3],process.argv[4]);
}
