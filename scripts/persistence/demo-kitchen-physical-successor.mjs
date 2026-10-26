import { verifyIsolatedLineage } from '../db/compile-isolated-schema.mjs';
import { createHash } from 'node:crypto';
import { existsSync, lstatSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import { inspectKitchenRegistration } from '../kernel/demo-kitchen-registration.mjs';
import { inspectKitchenEngineering } from '../verification/demo-kitchen-engineering.mjs';

export const KITCHEN_PHYSICAL_BASE = 'persistence/physical-slices/demo-kitchen';
export const KITCHEN_PUBLIC_MIGRATION = 'drizzle/0007_demo_kitchen_content_guard.sql';
export const KITCHEN_ISOLATED_MIGRATION = 'drizzle-isolated/0007_demo_kitchen_content_guard.sql';
const BASELINE = '884d829e5b53dcf9291677f52e7f100882f528e6';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const names = ['0000_slice_p01_reconciliation','0001_odd_photon','0002_quick_venus','0003_slice_p04_credential','0004_slice_p05_learning_session','0005_demo_runtime_owner_storage','0006_demo_recipe_content_guard'];
const baselinePaths = [...names.map(name => `drizzle/${name}.sql`), ...Array.from({length:7}, (_, i) => `drizzle/meta/${String(i).padStart(4,'0')}_snapshot.json`), ...names.map(name => `drizzle-isolated/${name}.sql`)];
function inspectionReader(root) {
  // A snapshot cache exists only for this synchronous inspector invocation.
  // Never reuse bytes or stat decisions between inspections/tamper probes.
  const bytes = new Map(), directories = new Set();
  return path => {
    if (bytes.has(path)) return bytes.get(path);
    const parts = path.split('/');
    for (let i = 1; i <= parts.length; i++) {
      const ancestor = parts.slice(0, i).join('/');
      if (i < parts.length && directories.has(ancestor)) continue;
      const stat = lstatSync(join(root, ancestor));
      if (stat.isSymbolicLink() || (i === parts.length ? !stat.isFile() : !stat.isDirectory())) throw Error(`regular file/ancestor required: ${path}`);
      if (i < parts.length) directories.add(ancestor);
    }
    const value = readFileSync(join(root, path), 'utf8'); bytes.set(path, value); return value;
  };
}
/** Finite authoring admission only. Independent review binds all code and SQL;
 * this inspector does not execute a migration or claim production readiness. */
export function inspectKitchenPhysicalSuccessor(root) {
  const read = inspectionReader(root);
  const denied={present:false,admitted:false,errors:[],migrationCount:null,revisedPaths:[],addedPaths:[],predecessorFiles:{}};
  if(!existsSync(join(root,KITCHEN_PHYSICAL_BASE))) {
    const orphan = [KITCHEN_PUBLIC_MIGRATION,KITCHEN_ISOLATED_MIGRATION,'drizzle/meta/0007_snapshot.json','verification/demo-kitchen/engineering-manifest.json'].some(path=>existsSync(join(root,path)));
    return orphan ? {...denied,present:true,errors:['demo kitchen physical successor: orphan migration or engineering evidence without physical lane']} : denied;
  }
  const errors=[],fail=message=>errors.push(`demo kitchen physical successor: ${message}`);
  const equal=(a,b,message)=>{if(!isDeepStrictEqual(a,b))fail(message);};
  try {
    const evidence=readdirSync(join(root,KITCHEN_PHYSICAL_BASE),{withFileTypes:true});
    equal(evidence.map(item=>item.name).sort(),['immutable-baseline.json','physical-successor.json','prior-journal.json'],'exact three-file physical evidence inventory required');
    if(evidence.some(item=>!item.isFile()))fail('physical evidence permits only regular files');
    const source=inspectKitchenRegistration(root);errors.push(...source.errors);
    const engineering=inspectKitchenEngineering(root);errors.push(...engineering.errors);
    if(!source.present||!engineering.present)fail('exact source registration and independently reviewed engineering required');
    const json=path=>JSON.parse(read(path));
    const envelope=json(`${KITCHEN_PHYSICAL_BASE}/physical-successor.json`), baseline=json(`${KITCHEN_PHYSICAL_BASE}/immutable-baseline.json`);
    equal(envelope.successor_id,'TEACH-DEMO-KITCHEN-PHYSICAL-SUCCESSOR-2026-10-26','exact successor required');
    equal(envelope.baseline_commit,BASELINE,'exact predecessor required');equal(baseline.baseline_commit,BASELINE,'exact immutable baseline required');
    equal(envelope.prior_migration_count,7,'seven prior migrations required');equal(envelope.current_migration_count,8,'eight current migrations required');
    equal(envelope.application_tables,22,'no new application tables');equal(envelope.functions,39,'no new functions');
    equal(envelope.schema_versions,['1.0.0','1.1.0','1.2.0'],'exact additive versions required');
    equal(envelope.changed_function,'teach_v2_demo.content_guard_demo_version','one existing guard only');
    for(const flag of ['new_tables','new_roles','new_grants','new_policies','rewritten_content_rows'])equal(envelope[flag],0,`${flag} forbidden`);
    for(const flag of ['runtime_activation_authorized','shared_or_production_execution_authorized','deployment_authorized'])equal(envelope[flag],false,'authoring envelope cannot authorize execution');
    equal(Object.keys(baseline.files??{}).sort(),[...baselinePaths].sort(),'exact immutable seven-migration source inventory required');
    for(const path of baselinePaths)equal(hash(read(path)),baseline.files[path],`historical bytes changed: ${path}`);
    const prior=json(`${KITCHEN_PHYSICAL_BASE}/prior-journal.json`), journal=json('drizzle/meta/_journal.json');
    equal(hash(read(`${KITCHEN_PHYSICAL_BASE}/prior-journal.json`)),'82d436f093d623ac3b90785073f7226e7ed2994283754a39084bfdea2aec33e0','exact prior journal required');
    equal({...journal,entries:journal.entries?.slice(0,7)},prior,'old journal prefix immutable');equal(journal.entries?.length,8,'one append only');
    equal(journal.entries?.[7],{idx:7,version:'7',when:1792979340000,tag:'0007_demo_kitchen_content_guard',breakpoints:true},'exact current journal suffix required');
    equal(json('drizzle-isolated/meta/_journal.json'),journal,'public and isolated journals share exact identities');
    equal(readdirSync(join(root,'drizzle')).filter(n=>n.endsWith('.sql')).sort(),[...names.map(n=>n+'.sql'),'0007_demo_kitchen_content_guard.sql'].sort(),'no additional public migrations');
    equal(readdirSync(join(root,'drizzle-isolated')).filter(n=>n.endsWith('.sql')).sort(),[...names.map(n=>n+'.sql'),'0007_demo_kitchen_content_guard.sql'].sort(),'no additional isolated migrations');
    equal(readdirSync(join(root,'drizzle/meta')).filter(n=>n.endsWith('_snapshot.json')).sort(),Array.from({length:8},(_,i)=>`${String(i).padStart(4,'0')}_snapshot.json`),'exact eight snapshots');
    const priorSnapshot=json('drizzle/meta/0006_snapshot.json'),snapshot=json('drizzle/meta/0007_snapshot.json');
    equal(snapshot,{...priorSnapshot,id:snapshot.id,prevId:priorSnapshot.id},'snapshot changes only identity link');
    if(!/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(snapshot.id)||snapshot.id==='00000000-0000-0000-0000-000000000000'||names.some((_,i)=>json(`drizzle/meta/${String(i).padStart(4,'0')}_snapshot.json`).id===snapshot.id))fail('unique nonzero snapshot ID required');
    for(const path of [KITCHEN_PUBLIC_MIGRATION,KITCHEN_ISOLATED_MIGRATION]){
      equal(hash(read(path)),envelope.migration_sha256?.[path],`migration differs: ${path}`);
      const sql=read(path).replace(/--[^\n]*/g,'').trim();
      const match=/^CREATE OR REPLACE FUNCTION (?:"teach_v2_demo"\.)?"content_guard_demo_version"\(\) RETURNS trigger LANGUAGE plpgsql AS \$\$([\s\S]*)\$\$;$/.exec(sql);
      if(!match||/\$\$/.test(match[1])||/\b(?:CREATE|ALTER|DROP|TRUNCATE|GRANT|REVOKE|COPY|EXECUTE|INSERT|UPDATE|DELETE)\b/i.test(match[1].replace(/'(?:[^']|'')*'/g,'')))fail('only finite content guard body replacement admitted');
    }
    const body = text => text.slice(text.indexOf('CREATE OR REPLACE FUNCTION'));
    equal(body(read('domains/demo-kitchen/proposal-0.1.0/0007_demo_kitchen_content_guard.sql')),body(read(KITCHEN_ISOLATED_MIGRATION)),'proposal and isolated guard function bytes must agree exactly');
    verifyIsolatedLineage(root); // Pure deterministic compiler proof; no database or old admission calls.
    const manifest=json('drizzle-isolated/manifest.json');equal(manifest.migrations?.length,8,'isolated manifest needs eighth migration');
    equal(manifest.migrations?.[7],{name:'0007_demo_kitchen_content_guard.sql',historicalSha256:hash(read(KITCHEN_PUBLIC_MIGRATION)),isolatedSha256:hash(read(KITCHEN_ISOLATED_MIGRATION)),when:1792979340000},'exact isolated migration binding');
    const admitted=errors.length===0;
    return {...denied,present:true,admitted,errors,migrationCount:admitted?8:null,revisedPaths:admitted?['drizzle/meta/_journal.json','drizzle-isolated/meta/_journal.json','drizzle-isolated/manifest.json']:[],addedPaths:admitted?[KITCHEN_PUBLIC_MIGRATION,KITCHEN_ISOLATED_MIGRATION,'drizzle/meta/0007_snapshot.json']:[],predecessorFiles:admitted?engineering.predecessorFiles:{}};
  }catch(error){fail(`missing or malformed evidence: ${error.message}`);return {...denied,present:true,errors};}
}
