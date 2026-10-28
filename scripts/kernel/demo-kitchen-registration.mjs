import { inspectSourceInScope } from '../verification/source-inspection-scope.mjs';
import { inspectAuthoringRegistration } from './demo-authoring-registration.mjs';
import { createHash } from 'node:crypto';
import { existsSync, lstatSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { isDeepStrictEqual } from 'node:util';

export const KITCHEN_BASE = 'domains/demo-kitchen';
export const KITCHEN_PROPOSAL = `${KITCHEN_BASE}/proposal-0.1.0`;
export const KITCHEN_PACKAGE_ID = 'TEACH-DEMO-KITCHEN-2026-10-26';
export const KITCHEN_SCHEMA_PROJECTION = 'kernel/content-schema-kitchen-successor.json';
// Source seals only: never independent review, physical admission or runtime proof.
export const KITCHEN_PACKAGE_SHA256 = 'ba01dfc871d53a98a621ee301ec8435061c8d01f0ac509c1029539d03337406d';
export const KITCHEN_REGISTRATION_SHA256 = '654607e901695058390d1c3fb5390c107cc2ead5fd9f6d9c9bf6e9508ba6b3ed';
const APPROVAL_SHA256 = 'f760ebb5a3521f36183923ecd219b7c32ebe5c893cdcfd85d8055c50beb1acef';
const SOURCE_SHA256 = '9eb831eb84535ff63185fbfb23356d7f57a82432ef74e250af7dadb3ca28f959';
export const KITCHEN_REVISED_PATHS = Object.freeze([
  'contracts/c31-content-teaching-engine-contract.md',
  'contracts/c41-api-boundary-contract.md',
  'contracts/c42-web-client-boundary-contract.md',
  'contracts/README.md', 'contracts/APPROVAL-RECORD.md',
]);
const REVISIONS = Object.freeze([
  ['C31', KITCHEN_REVISED_PATHS[0], '1.4.0', '1.5.0'],
  ['C41', KITCHEN_REVISED_PATHS[1], '1.3.0', '1.4.0'],
  ['C42', KITCHEN_REVISED_PATHS[2], '1.3.0', '1.4.0'],
]);
const ARCHIVES = REVISIONS.map(([, path, before]) => path.replace('contracts/', 'contracts/superseded/').replace('.md', `-${before}.md`));
const PACKAGE_NAMES = Object.freeze(['README.md', 'content-schema-1.2.0.json', 'package-manifest.json', 'public-content-schema-1.2.0.json', 'synthetic-content-template-1.2.0.json', '0007_demo_kitchen_content_guard.sql']);
const EVIDENCE_NAMES = Object.freeze(['README.md', 'owner-approval.json', 'registration.json', 'source-baseline.json']);
const PREDECESSOR_HASHES = Object.freeze({
  [KITCHEN_REVISED_PATHS[0]]: 'a6faa3aa61015a1bde940a9a21ed652f06ede7c95612497bdf4074f5e4dfd60d',
  [KITCHEN_REVISED_PATHS[1]]: '191759a7f20862f5e4dafdc81a13b80987d29fcb3cc0d20fd5bb4754a088d71a',
  [KITCHEN_REVISED_PATHS[2]]: '9a4e47b396a7867175abaf18eabb8ff290486c050fbdf5d9ac3f08730dac512e',
  [KITCHEN_REVISED_PATHS[3]]: '5aac6f632e467f85436e8c7dee828b978eaf9fbedd3868c8e884a12c916ebbbd',
  [KITCHEN_REVISED_PATHS[4]]: 'cdc23be15613112f9aed4d98875507b210d27ce4418ca95fbd08c2f0c377e9f5',
});
const ORIGINAL_SEALS = Object.freeze({
  'domains/demo-runtime/registration.json': 'b94cf7c7c9bab35ad2454470295ae2b04b8814bd0ac55c282cdd3dd6df67218d',
  'domains/demo-recipes/registration.json': 'bd0b74666f5da45c70a0d1c0fe42d5d7099a5bc6c9d727b665e4381094605443',
  'governance/demo-schema-isolation/registration.json': '188788182ba635e7ab8cc21e8236aad89f707022c5cafdd6201de32ae2b2194d',
  'kernel/entities.json': 'cd90fbe900ed6501260851fb5544af80f5d8b2ada3febe1af05860ce65566769',
  'kernel/content-schema-reference-successor.json': '4d1a61727f434c1536514cffdb388648d13ad0306b1e0940e4764a16c9868101',
});
const ORIGINAL_PACKAGES = Object.freeze([
  ['domains/demo-runtime/proposal-0.1.0', 'a1df23b03a0f0660a072cff00eb40d3d2fb60bc8c521f12b56977f559601196a', 16],
  ['domains/demo-recipes/proposal-0.1.0', '51e6cec2b309ca3a14c9ef5f1b8b9f6603c53ec3c4d350602996cf1b6c07b539', 5],
  ['domains/demo-recipes/proposal-0.1.1', 'b5f80daf1d94ecbccb1a01f3e58be3fc98d32564567b1cf03fd5c639eb435255', 5],
]);
const BASELINE = '884d829e5b53dcf9291677f52e7f100882f528e6';
const TREE = '5b0e25d95320e712d7fb112852cfe29f085f895e';
const ISSUE = 'https://github.com/peteywee/teach-v2/issues/99';
const hash = value => createHash('sha256').update(value).digest('hex');
const metadata = text => JSON.parse(text.match(/^<!--tos-doc\n([\s\S]*?)\n-->\n/)?.[1] ?? 'null');

/** Synchronous nonrecursive leaf. It validates the exact new source package,
 * current authority and preserved predecessor bytes before exposing a finite
 * historical view. It deliberately never calls old registration, engineering,
 * physical or activation inspectors: those consume this leaf, not vice versa. */
export function inspectKitchenRegistration(root) { return inspectSourceInScope('kitchenRegistration', root); }
// Internal finite dispatcher entry. Direct invocation establishes no shared scope.
export function inspectKitchenRegistrationUncached(root) {
  const empty = { present: false, errors: [], revisedPaths: [], addedPaths: [], predecessorFiles: {} };
  const registrationPath = `${KITCHEN_BASE}/registration.json`;
  const authoring = inspectAuthoringRegistration(root);
  const errors = [...authoring.errors], fail = message => errors.push(`demo kitchen registration: ${message}`);
  const equal = (a,b,message) => { if (!isDeepStrictEqual(a,b)) fail(message); };
  // Fresh snapshot per synchronous invocation; no cross-call/stat cache.
  const bytes = new Map(), directories = new Set();
  const raw = path => {
    if (Object.hasOwn(authoring.predecessorFiles, path)) return authoring.predecessorFiles[path];
    if (bytes.has(path)) return bytes.get(path);
    const parts=path.split('/');
    for(let n=1;n<=parts.length;n++) {
      const ancestor=parts.slice(0,n).join('/');
      if(n<parts.length && directories.has(ancestor)) continue;
      const stat=lstatSync(join(root,ancestor));
      if(stat.isSymbolicLink() || (n===parts.length ? !stat.isFile() : !stat.isDirectory())) throw Error(`regular file/ancestor required: ${path}`);
      if(n<parts.length) directories.add(ancestor);
    }
    const value=readFileSync(join(root,path),'utf8');bytes.set(path,value);return value;
  };
  const json = path => JSON.parse(raw(path));
  try {
    if (errors.length) return { ...empty, present: true, errors };
    if(!existsSync(join(root,registrationPath))) {
      if(existsSync(join(root,KITCHEN_BASE)) || existsSync(join(root,KITCHEN_SCHEMA_PROJECTION)) || ARCHIVES.some(p=>existsSync(join(root,p))) || KITCHEN_REVISED_PATHS.some(p=>existsSync(join(root,p))&&raw(p).includes('demo_kitchen_registration'))) fail('orphan kitchen sources without registration');
      return {...empty,errors};
    }
    for(const [path,digest] of Object.entries({...ORIGINAL_SEALS,
      [registrationPath]:KITCHEN_REGISTRATION_SHA256,
      [`${KITCHEN_BASE}/owner-approval.json`]:APPROVAL_SHA256,
      [`${KITCHEN_BASE}/source-baseline.json`]:SOURCE_SHA256,
    })) equal(hash(raw(path)),digest,`immutable evidence differs: ${path}`);
    // Never follow an unverified checksum inventory. Every admitted basename is
    // finite, path-safe, unique, regular, and covered by its immutable sums seal.
    const verifyPackage=(path,digest,count,names=null)=>{
      const sums=raw(`${path}/SHA256SUMS`);equal(hash(sums),digest,`immutable package digest differs: ${path}`);
      if(hash(sums)!==digest)return;
      const seen=new Set();
      for(const line of sums.trimEnd().split('\n')) {
        const m=/^([a-f0-9]{64})  ([A-Za-z0-9_.-]+)$/.exec(line);
        if(!m||seen.has(m[2])||m[2]==='.'||m[2]==='..'||(names&&!names.includes(m[2]))) {fail(`malformed finite package checksum: ${path}`);continue;}
        seen.add(m[2]);equal(hash(raw(`${path}/${m[2]}`)),m[1],`immutable package file differs: ${path}/${m[2]}`);
      }
      equal(seen.size,count,`exact package count required: ${path}`);
      if(names)equal([...seen].sort(),[...names].sort(),`exact package artifacts required: ${path}`);
      const files=readdirSync(join(root,path),{withFileTypes:true});
      equal(files.map(x=>x.name).sort(),[...seen,'SHA256SUMS'].sort(),`exact package directory required: ${path}`);
      if(files.some(x=>!x.isFile()))fail(`only regular package files permitted: ${path}`);
    };
    for(const p of ORIGINAL_PACKAGES)verifyPackage(...p);
    verifyPackage(KITCHEN_PROPOSAL,KITCHEN_PACKAGE_SHA256,PACKAGE_NAMES.length,PACKAGE_NAMES);
    const dir=readdirSync(join(root,KITCHEN_BASE),{withFileTypes:true});
    equal(dir.map(x=>x.name).sort(),[...EVIDENCE_NAMES,'proposal-0.1.0'].sort(),'exact kitchen evidence inventory required');
    if(dir.some(x=>x.name==='proposal-0.1.0'?!x.isDirectory():!x.isFile()))fail('regular evidence and exact proposal directory required');
    const registration=json(registrationPath),source=json(`${KITCHEN_BASE}/source-baseline.json`),approval=json(`${KITCHEN_BASE}/owner-approval.json`),manifest=json(`${KITCHEN_PROPOSAL}/package-manifest.json`);
    equal([registration.registration_id,registration.package_id,registration.version,registration.package_version,registration.state],[KITCHEN_PACKAGE_ID,KITCHEN_PACKAGE_ID,'0.1.0','0.1.0','REGISTERED_BOUNDED_SOURCE_ONLY'],'exact source registration identity required');
    equal(registration.package_sha256sums_digest,KITCHEN_PACKAGE_SHA256,'exact package binding required');
    equal([registration.source_baseline_commit,registration.source_baseline_tree],[BASELINE,TREE],'exact registration baseline required');
    equal([source.baseline_commit,source.baseline_tree],[BASELINE,TREE],'exact predecessor baseline required');
    equal([registration.source_baseline_sha256,registration.approval_sha256],[SOURCE_SHA256,APPROVAL_SHA256],'exact source/approval seals required');
    equal(registration.approval_record,`${KITCHEN_BASE}/owner-approval.json`,'exact approval path required');
    equal(registration.immutable_proposal,KITCHEN_PROPOSAL,'exact proposal path required');
    equal(registration.predecessor_registration,{path:'domains/demo-recipes/registration.json',sha256:ORIGINAL_SEALS['domains/demo-recipes/registration.json']},'exact predecessor registration required');
    equal(registration.revised_paths,[...KITCHEN_REVISED_PATHS],'exact revised authority paths required');
    equal(Object.keys(source.files).sort(),[...KITCHEN_REVISED_PATHS].sort(),'exact predecessor file inventory required');
    equal(registration.predecessor_file_hashes,PREDECESSOR_HASHES,'exact predecessor seals required');
    for(const path of KITCHEN_REVISED_PATHS)equal(hash(source.files[path]??''),PREDECESSOR_HASHES[path],`preserved authority differs: ${path}`);
    const authorityPaths=[...KITCHEN_REVISED_PATHS,...ARCHIVES,KITCHEN_SCHEMA_PROJECTION];
    equal(Object.keys(registration.authority_file_hashes).sort(),authorityPaths.slice().sort(),'exact current authority inventory required');
    for(const path of authorityPaths)equal(hash(raw(path)),registration.authority_file_hashes[path],`registered authority file differs: ${path}`);
    const evidence=EVIDENCE_NAMES.filter(x=>x!=='registration.json').map(x=>`${KITCHEN_BASE}/${x}`);
    equal(Object.keys(registration.evidence_hashes).sort(),evidence.slice().sort(),'exact source evidence inventory required');
    for(const path of evidence)equal(hash(raw(path)),registration.evidence_hashes[path],`source evidence differs: ${path}`);
    equal(registration.contracts.map(({contract,path,from,to,superseded_copy})=>[contract,path,from,to,superseded_copy]),REVISIONS.map((x,i)=>[...x,ARCHIVES[i]]),'exact three contract transitions required');
    for(const [i,[id,path,before,after]] of REVISIONS.entries()) {
      const previous=source.files[path],current=raw(path),archive=raw(ARCHIVES[i]);
      const pm=metadata(previous),cm=metadata(current),am=metadata(archive);
      equal([pm.doc_id,pm.version],[`TEACH-CON-${id}`,before],`predecessor identity differs: ${id}`);
      equal([cm.doc_id,cm.version,cm.status,cm.approval.approved_version,cm.approval.record],[`TEACH-CON-${id}`,after,'active',after,`${KITCHEN_BASE}/owner-approval.json`],`current contract identity differs: ${id}`);
      equal(am,{...pm,status:'superseded',superseded_by:`TEACH-CON-${id}@${after}`,superseded_on:'2026-10-26'},`archive metadata differs: ${id}`);
      equal(archive.split('The original body below is preserved, including its former current-status wording.\n')[1],previous.replace(/^<!--tos-doc\n[\s\S]*?\n-->\n/,'').replace(/^\n+/,''),`archive body differs: ${id}`);
      equal([registration.contracts[i].before_sha256,registration.contracts[i].after_sha256,registration.contracts[i].superseded_sha256],[hash(previous),hash(current),hash(archive)],`contract transition seals differ: ${id}`);
      for(const key of ['demo_runtime_registration','demo_recipes_registration'])equal(cm[key],pm[key],`prior authority metadata changed: ${id}/${key}`);
    }
    for(const path of KITCHEN_REVISED_PATHS)equal(metadata(raw(path)).demo_kitchen_registration,{package:`${KITCHEN_PACKAGE_ID}@0.1.0`,issue:'#99',approval_record:`${KITCHEN_BASE}/owner-approval.json`,source_package:KITCHEN_PROPOSAL,sha256sums_sha256:KITCHEN_PACKAGE_SHA256,source_registration_only:true,physical_schema_admission:false,runtime_proof:'NOT_ESTABLISHED_BY_REGISTRATION'},`source-only contract metadata differs: ${path}`);
    for(const record of [registration,approval,manifest])equal(record.impact_issue,ISSUE,'exact SYS-21 impact issue required');
    equal([approval.approval_id,approval.version,approval.state,approval.record_form],[KITCHEN_PACKAGE_ID,'0.1.0','APPROVED_BOUNDED_SCOPE','MINIMAL_OWNER_DECISION_SUMMARY'],'bounded owner decision summary required');
    if(['question','response','exchanges','owner_message_id'].some(k=>Object.hasOwn(approval,k)))fail('private conversation details must not be published');
    equal(approval.package_sha256sums_digest,KITCHEN_PACKAGE_SHA256,'owner scope binding differs');
    equal(approval.release_approval_conditional_on_tests_and_checks,true,'release approval remains conditional');
    equal(approval.independent_verification,'NOT_ESTABLISHED_BY_APPROVAL','approval cannot claim independent review');
    for(const key of ['new_semantic_entries','new_tables','new_routes','new_capabilities'])equal(registration[key],0,`registration cannot add ${key}`);
    equal(registration.new_migrations,1,'one bounded guard update only');
    equal(registration.guard_target,'teach_v2_demo.content_guard_demo_version','exact isolated guard target required');
    equal(registration.schemaVersions,['1.0.0','1.1.0','1.2.0'],'exact three-schema lineage required');
    equal(registration.new_synthetic_template_version,'1.2.0','exact new template required');
    equal([registration.api_route_count,registration.served_asset_path_count],[15,7],'existing route/asset counts unchanged');
    equal(registration.historical_migrations_immutable,true,'historical migrations immutable');
    for(const key of ['independent_verification','implementation_conformance'])equal(registration[key],'NOT_ESTABLISHED_BY_REGISTRATION',`source registration cannot prove ${key}`);
    for(const key of ['physical_admission_performed','runtime_activation_authorized','execution_authorized_by_registration'])equal(registration[key],false,`source registration cannot grant ${key}`);
    equal([manifest.package_id,manifest.version,manifest.source_commit,manifest.source_tree],[KITCHEN_PACKAGE_ID,'0.1.0',BASELINE,TREE],'package identity/baseline required');
    equal(manifest.artifact_files,[...PACKAGE_NAMES],'exact package artifact list required');
    equal(manifest.execution_authorized_by_package,false,'package cannot grant execution');
    const projection=json(KITCHEN_SCHEMA_PROJECTION);
    equal(registration.schema_reference_projection,{path:KITCHEN_SCHEMA_PROJECTION,sha256:hash(raw(KITCHEN_SCHEMA_PROJECTION))},'exact schema projection seal required');
    equal(projection.target,{path:'kernel/entities.json',entry:'ContentPack',field:'fields.versionPayload'},'only exact ContentPack field projection allowed');
    equal(projection.predecessor_registry_sha256,ORIGINAL_SEALS['kernel/entities.json'],'kernel predecessor remains exact');
    equal(projection.predecessor_text,json('kernel/entities.json').entries.find(x=>x.id==='ContentPack')?.fields?.versionPayload,'original registry text remains unchanged');
    equal(projection.predecessor_projection,{path:'kernel/content-schema-reference-successor.json',sha256:ORIGINAL_SEALS['kernel/content-schema-reference-successor.json']},'recipe projection remains immutable');
    equal(projection.exact_schema_references,[{version:'1.0.0',path:'domains/demo-runtime/proposal-0.1.0/learning-definition.json',pointer:'/canonical_content_schema'},{version:'1.1.0',path:'domains/demo-recipes/proposal-0.1.1/content-schema-1.1.0.json',pointer:''},{version:'1.2.0',path:`${KITCHEN_PROPOSAL}/content-schema-1.2.0.json`,pointer:''}],'finite three-schema references only');
    equal(projection.new_concepts,[],'no new concepts');equal(projection.original_registry_entries_modified,false,'original registry immutable');equal(projection.identity_owner_relationships_dependencies_unchanged,true,'identity/ownership/dependencies unchanged');
    for(const key of ['physical_admission_granted','runtime_activation_authorized'])equal(projection[key],false,'projection grants no admission or activation');
    return {...empty,present:true,errors,registration,packageSha256:KITCHEN_PACKAGE_SHA256,
      revisedPaths:errors.length?[]:[...KITCHEN_REVISED_PATHS],
      addedPaths:errors.length?[]:[...ARCHIVES,KITCHEN_SCHEMA_PROJECTION,...EVIDENCE_NAMES.map(x=>`${KITCHEN_BASE}/${x}`),...[...PACKAGE_NAMES,'SHA256SUMS'].map(x=>`${KITCHEN_PROPOSAL}/${x}`)],
      predecessorFiles:errors.length?{}:{...source.files}};
  } catch(error) { fail(`missing or malformed source evidence: ${error.message}`);return {...empty,present:true,errors}; }
}
