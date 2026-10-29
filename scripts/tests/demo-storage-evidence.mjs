import { installAuthoringPredecessor } from './authoring-predecessor-fixture.mjs';
import { withKitchenPredecessor } from './kitchen-predecessor-fixture.mjs';
import { RECOVERY_BASE, inspectDemoRecoveryRegistration } from '../kernel/demo-recovery-registration.mjs';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { after, test } from 'node:test';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { reconstructHistoricalDemoIntegration } from '../verification/consolidated-ci-evidence.mjs';
import { inspectSchemaIsolationRegistration } from '../kernel/demo-schema-isolation-registration.mjs';
import { inspectSchemaIsolationEngineering } from '../verification/demo-schema-isolation-engineering.mjs';
import { inspectRecipeRegistration } from '../kernel/demo-recipes-registration.mjs';
import { DEMO_RECIPE_PHYSICAL_EVIDENCE, DEMO_RECIPE_PHYSICAL_ENVELOPE, DEMO_RECIPE_PHYSICAL_REVIEW, DEMO_RECIPE_MIGRATION, DEMO_RECIPE_SNAPSHOT } from '../persistence/demo-recipes-physical-successor.mjs';
import { pathToFileURL } from 'node:url';
import { currentFacts } from '../verification/development-self-audit.mjs';
import { deriveOwnerDecisionInventory } from '../verification/owner-decision-inventory.mjs';
import { inspectDemoStorageEvidence, createPersistenceEvidenceContext, DEMO_OWNER_ADAPTERS } from '../persistence/demo-storage-evidence.mjs';
import { inspectLearningFoundation } from '../persistence/learning-foundation-evidence.mjs';
import { inspectLearningImplementation } from '../persistence/learning-implementation-evidence.mjs';
import { inspectAssignmentAdmission } from '../persistence/assignment-admission-evidence.mjs';
import { inspectFutureAdmission } from '../persistence/future-admission-evidence.mjs';

const root = resolve(new URL('../..', import.meta.url).pathname);
const fixture = mkdtempSync(join(tmpdir(), 'teach-demo-storage-'));
for (const path of ['docs', 'kernel','domains','architecture','contracts','application-interfaces','governance','persistence','drizzle','drizzle-isolated','src','drizzle.config.ts','drizzle.p05.config.ts','pnpm-lock.yaml','package.json','scripts','.github','verification','tests']) cpSync(join(root,path),join(fixture,path),{recursive:true});
installAuthoringPredecessor(fixture);
// Pair authenticated predecessor bytes with their own inspector/renderer module graph.
// Current modules must never interpret this intentionally historical fixture.
const { inspectRepositoryIntegration } = await import(pathToFileURL(join(fixture, 'scripts/architecture/repository-integration-evidence.mjs')).href);
after(() => rmSync(fixture,{recursive:true,force:true}));
const raw = path => readFileSync(join(fixture,path),'utf8');
const json = path => JSON.parse(raw(path));
const inspect = () => inspectDemoStorageEvidence(fixture);
const mutate = (path, transform, pattern, inspectEvidence=inspect) => {
  const original = existsSync(join(fixture,path)) ? raw(path) : null;
  try {
    if (transform === null) rmSync(join(fixture,path));
    else { const revised=transform(original); assert.notEqual(revised,original,`no-op mutation of ${path}`); mkdirSync(join(fixture,path,'..'),{recursive:true}); writeFileSync(join(fixture,path),revised); }
    const result = inspectEvidence();
    assert.ok(result.errors.length,`accepted mutation of ${path}`);
    assert.match(result.errors.join('\n'),pattern);
  } finally {
    if (original === null) rmSync(join(fixture,path),{force:true});
    else writeFileSync(join(fixture,path),original);
  }
};
const mutateJson = (path, change, pattern) => mutate(path,text => { const value=JSON.parse(text); change(value); return JSON.stringify(value,null,2)+'\n'; },pattern);
const pending = /^(?:demo registration: unchanged preceding source drift: persistence\/physical-slices\/|demo physical successor: (?:independent successor review missing|exact physical evidence directory inventory required)$|demo physical admission: exact package registration and dependency closure must PASS$|demo owner storage: (?:independently reviewed exact physical successor required|exact independently verified nine-path physical successor required|fresh exact physical admission must be ADMIT)$)/;
const baseline = inspect();
const reviewPending = !existsSync(join(fixture,'persistence/physical-slices/demo-runtime/independent-successor-review.json'));

test('actual owner storage has no shape failures while missing successor review remains fail-closed', () => {
  assert.equal(baseline.extended,true);
  if (baseline.errors.length) {
    assert.equal(reviewPending,true,'present independent review must validate fully, not be treated as pending');
    assert.ok(baseline.errors.every(error => pending.test(error)),baseline.errors.join('\n'));
    assert.ok(baseline.errors.some(error => /successor/.test(error)),'pending authority cannot be silently accepted');
  }
});

test('reviewed current successor and immutable P01-P05 evidence both pass', {skip:reviewPending ? 'Independent exact successor review is pending; full admission is not PASS.' : false}, () => {
  assert.deepEqual(inspect().errors,[]);
  for (const inspectEvidence of [inspectLearningFoundation,inspectLearningImplementation,inspectAssignmentAdmission]) assert.deepEqual(inspectEvidence(fixture),[]);
  for (const slice of ['P07','P08']) assert.deepEqual(inspectFutureAdmission(fixture,slice),[]);
  const context=createPersistenceEvidenceContext(fixture);
  assert.equal(JSON.parse(context.read('persistence/physical-slices/readiness.json')).version,'1.3.0');
  assert.equal(json('persistence/physical-slices/readiness.json').version,'2.0.0');
});

test('unchanged P01-P05 historical fixture retains its real baseline checks', () => withKitchenPredecessor(fixture, () => {
  const recovery=inspectDemoRecoveryRegistration(fixture);
  assert.deepEqual(recovery.errors,[]);
  const recoveryParked=join(fixture,'parked-recovery-evidence');
  const source=json('domains/demo-runtime/source-baseline.json');
  const physicalPaths=['persistence/physical-slices/readiness.json','persistence/physical-slices/queue-post-p05.json',...['learning-session','assignment','progress-event'].flatMap(lane => ['admission.json','admission-evidence-plan.json'].map(name => `persistence/physical-slices/${lane}/${name}`)),'persistence/physical-slices/learning-session/implementation.json'];
  const demoSources=Object.keys(DEMO_OWNER_ADAPTERS).flatMap(suffix => { const [owner,file]=suffix.split('/'); return [`src/modules/${owner}/infrastructure/persistence/${file}`,`src/modules/${owner}/infrastructure/persistence/demo-schema.ts`]; });
  const schema=inspectSchemaIsolationRegistration(fixture);
  const engineering=inspectSchemaIsolationEngineering(fixture);
  assert.deepEqual(schema.errors,[]);
  assert.deepEqual(engineering.errors,[]);
  const recipe=inspectRecipeRegistration(fixture);
  assert.deepEqual(recipe.errors,[]);
  const recipeRemoved=['persistence/physical-slices/demo-recipes/independent-successor-review.json','scripts/kernel/validate-demo-recipes-registration.mjs','scripts/persistence/validate-demo-recipes-physical-admission.mjs',...recipe.addedPaths,...DEMO_RECIPE_PHYSICAL_EVIDENCE,DEMO_RECIPE_PHYSICAL_ENVELOPE,DEMO_RECIPE_PHYSICAL_REVIEW,DEMO_RECIPE_MIGRATION,DEMO_RECIPE_SNAPSHOT];
  const removed=[...schema.addedPaths,...engineering.addedPaths,'verification/demo-schema-isolation/engineering-manifest.json','verification/demo-schema-isolation/engineering-independent-review.json',...recipeRemoved,...demoSources,'src/bootstrap/demo/demo-persistence-schema.ts','drizzle/0005_demo_runtime_owner_storage.sql','drizzle/meta/0005_snapshot.json','persistence/physical-slices/demo-runtime/physical-successor.json','persistence/physical-slices/demo-runtime/independent-successor-review.json'];
  const paths=[...Object.keys(recovery.predecessorSources),...schema.revisedPaths,...engineering.revisedPaths,'scripts/db/run-demo-integration.ts',...recipe.revisedPaths,...physicalPaths,...removed,'drizzle/meta/_journal.json','drizzle.config.ts'];
  const originals=new Map(paths.map(path => [path,existsSync(join(fixture,path))?raw(path):null]));
  try {
    // Remove this complete newest layer before replaying earlier authority.
    renameSync(join(fixture,RECOVERY_BASE),recoveryParked);
    for(const [path,text] of Object.entries(recovery.predecessorSources))writeFileSync(join(fixture,path),text);
    for(const successor of [engineering,schema])for(const path of successor.revisedPaths)writeFileSync(join(fixture,path),successor.predecessorFiles[path]);
    writeFileSync(join(fixture,'scripts/db/run-demo-integration.ts'),reconstructHistoricalDemoIntegration(raw('scripts/db/run-demo-integration.ts')));
    for(const path of recipe.revisedPaths) writeFileSync(join(fixture,path),recipe.predecessorFiles[path]);
    for(const path of physicalPaths) writeFileSync(join(fixture,path),source.files[path]);
    for(const path of removed) rmSync(join(fixture,path),{force:true});
    for(const path of ['governance/demo-schema-isolation','domains/demo-recipes','persistence/physical-slices/demo-recipes']) rmSync(join(fixture,path),{recursive:true,force:true});
    writeFileSync(join(fixture,'drizzle/meta/_journal.json'),raw('persistence/physical-slices/demo-runtime/prior-journal.json'));
    writeFileSync(join(fixture,'drizzle.config.ts'),raw('drizzle.p05.config.ts'));
    assert.deepEqual(inspect().errors,[]);
    // This fixture restores the engineering predecessor, including its exact
    // workflow renderer and YAML. Load the paired inspector from that fixture,
    // not the already cached current renderer imported by this test module.
    const integrationResult=spawnSync(process.execPath,['--input-type=module','-e',"import {inspectRepositoryIntegration} from './scripts/architecture/repository-integration-evidence.mjs'; console.log(JSON.stringify(inspectRepositoryIntegration(process.cwd())));"],{cwd:fixture,encoding:'utf8',timeout:5000});
    assert.equal(integrationResult.status,0,integrationResult.stdout+integrationResult.stderr);
    assert.deepEqual(JSON.parse(integrationResult.stdout),[]);
    for(const inspectEvidence of [inspectLearningFoundation,inspectLearningImplementation,inspectAssignmentAdmission]) assert.deepEqual(inspectEvidence(fixture),[]);
    for(const slice of ['P07','P08']) assert.deepEqual(inspectFutureAdmission(fixture,slice),[]);
    for(const slice of ['p01','p02','p03','p04']) {
      const result=spawnSync(process.execPath,[join(fixture,`scripts/persistence/validate-slice-${slice}-implementation-boundary.mjs`)],{cwd:fixture,encoding:'utf8',timeout:5000});
      assert.equal(result.status,0,`${result.stdout}${result.stderr}`);
    }
  } finally {
    for(const [path,value] of originals) if(value===null) rmSync(join(fixture,path),{force:true}); else { mkdirSync(join(fixture,path,'..'),{recursive:true}); writeFileSync(join(fixture,path),value); }
    renameSync(recoveryParked,join(fixture,RECOVERY_BASE));
  }
}));

test('missing successor migration fails independently of review state', () => mutate('drizzle/0005_demo_runtime_owner_storage.sql',null,/0005_demo_runtime_owner_storage\.sql:.*ENOENT/));
test('reordered migrations fail original prefix and contiguous ordering', () => mutateJson('drizzle/meta/_journal.json',value => { [value.entries[3],value.entries[4]]=[value.entries[4],value.entries[3]]; },/journal index 3 must have contiguous idx 3|original journal prefix must remain immutable/));
test('missing historical migration cannot be hidden by historical projection', () => mutate('drizzle/0001_odd_photon.sql',null,/0001_odd_photon\.sql:.*ENOENT|historical migration changed/));
test('forged successor marker never replaces independent exact review', () => mutate('persistence/physical-slices/demo-runtime/physical-successor.json',() => JSON.stringify({present:true,approved:true,outcome:'PASS',revisedPaths:['persistence/physical-slices/readiness.json']}),/exact independently verified nine-path physical successor required|demo physical successor:/));
test('extra owner adapter fails exact inventory', () => mutate('src/modules/learning/infrastructure/persistence/postgres-extra-adapter.ts',() => 'export class PostgresExtraAdapter {}\n',/unadmitted physical adapter or source: .*postgres-extra-adapter/));
test('wrong owner table definition fails', () => mutate('src/modules/learning/infrastructure/persistence/demo-schema.ts',text => text.replace("pgTable('learning_assignments'","pgTable('organization_memberships'"),/exact Learning-owned table definitions required/));
test('Organization cannot query Identity persona storage directly', () => mutate('src/modules/organization/infrastructure/persistence/postgres-demo-organization.ts',text => text.replace('databaseObject("organization_demo_runs")','databaseObject("identity_demo_personas")'),/owner adapter organization\/PostgresDemoOrganization queries foreign-owned table identity_demo_personas/));
test('wrong semantic ownership fails independently of physical naming', () => mutateJson('kernel/entities.json',value => { value.entries.find(entry => entry.id==='Assignment').owning_domain='Organization'; },/exact approved overlay|learning_assignments: approved entity\/owner required/));
test('extra current table fails exact inventory', () => mutateJson('drizzle/meta/0005_snapshot.json',value => { value.tables['public.extra']={...value.tables['public.content_packs'],name:'extra'}; },/exact prior eight plus fourteen owner tables required/));
test('wrong current field nullability fails exact approved mapping', () => mutateJson('drizzle/meta/0005_snapshot.json',value => { value.tables['public.learning_assignments'].columns.identity_id.notNull=false; },/approved nullability required: learning_assignments.identity_id/));
test('removed owner table DDL fails even with correct snapshot', () => mutate('drizzle/0005_demo_runtime_owner_storage.sql',text => text.replace('CREATE TABLE "content_packs"','CREATE TABLE "unadmitted_content_packs"'),/migration must create exactly the fourteen admitted new owner tables/));
test('missing historical owner in current composition fails', () => mutate('src/bootstrap/demo/demo-persistence-schema.ts',text => text.replace(/^export \* from '.*credential-schema.js';\n/m,''),/composition must retain every historical owner/));
test('current evidence cannot reuse historical runtime PASS', () => mutateJson('persistence/physical-slices/learning-session/implementation.json',value => { value.verification.atomic_authorization_insert='PASS'; },/current P05 extension cannot inherit historical runtime PASS/));
test('P07 cannot become admitted through exact demo exception', () => mutateJson('persistence/physical-slices/certification/admission.json',value => { value.decision='ADMIT';value.implementation_authorized=true; },/P07 must remain BLOCK/));

// These exercise the real aggregate boundary, not a caller-supplied admission
// Boolean. Existing structural cases keep running against their old fixture.
const integration = () => ({errors:inspectRepositoryIntegration(fixture)});
const integrationMutation = (path, transform, pattern) => mutate(path,transform,pattern,integration);
test('repository integration accepts exact reviewed current storage and historical queue', {skip:reviewPending ? 'Independent successor review is pending.' : false}, () => {
  assert.deepEqual(integration().errors,[]);
});
test('repository integration cannot admit owner tables from a forged successor', () => integrationMutation('persistence/physical-slices/demo-runtime/physical-successor.json',() => JSON.stringify({outcome:'PASS'}),/unverified persistence evidence:.*independent review must bind exact successor envelope/));
test('repository integration rejects Certification even inside the admitted migration', () => integrationMutation('drizzle/0005_demo_runtime_owner_storage.sql',text => text+'\nCREATE TABLE "certifications" (id text);\n',/future migration table has no ADMIT authority/));
test('repository integration rejects admitted table names at an unadmitted source location', () => integrationMutation('src/modules/learning/infrastructure/persistence/extra-schema.ts',() => "export const extra=pgTable('learning_assignments',{});\n",/future physical table has no ADMIT authority/));
test('repository integration rejects admitted table names in a later migration', () => integrationMutation('drizzle/0006_unadmitted.sql',() => 'CREATE TABLE "learning_assignments" (id text);\n',/future migration table has no ADMIT authority/));
test('repository integration rejects admitted table names in a later snapshot', () => integrationMutation('drizzle/meta/0006_snapshot.json',() => JSON.stringify({tables:{'public.learning_progress_events':{}}}),/future snapshot table has no ADMIT authority/));
test('repository integration does not project a tampered live queue', () => integrationMutation('persistence/physical-slices/queue-post-p05.json',text => {
  const value=JSON.parse(text);value.slices[0].status='READY';return JSON.stringify(value);
},/unverified persistence evidence:.*exact nine-path successor envelope or original\/live hashes differ/));
test('repository integration requires the real isolated guard despite compact imports', () => integrationMutation('tests/integration/demo/migration-replay.test.ts',text => text.replace('assertIsolatedDatabaseTarget(process.env.DATABASE_URL)','process.env.DATABASE_URL'),/isolated target guard must run before any Pool/));
test('repository integration rejects a guard after the first Pool', () => integrationMutation('tests/integration/demo/postgres-owner-storage.test.ts',text => text.replace('const url=assertIsolatedDatabaseTarget(process.env.DATABASE_URL);const pool=new pg.Pool({connectionString:url});','const pool=new pg.Pool({connectionString:process.env.DATABASE_URL});const url=assertIsolatedDatabaseTarget(process.env.DATABASE_URL);'),/isolated target guard must run before any Pool/));


test('audit summary validates the sealed historical packet but reports current physical questions', () => {
  const recorded=json('verification/legacy-recovery/owner-decisions.json');
  const current=deriveOwnerDecisionInventory(fixture,recorded.consulted_v2_baseline);
  const facts=currentFacts(fixture);
  assert.equal(facts.owner_decisions.physical_shape_questions,current.totals.physical_shape_questions);
  assert.notEqual(current.totals.physical_shape_questions,recorded.totals.physical_shape_questions);
  assert.equal(facts.future_admissions.assignment.decision,'ADMIT');
  assert.equal(facts.future_admissions['progress-event'].decision,'ADMIT');
  assert.equal(facts.future_admissions.certification.decision,'BLOCK');
  assert.equal(facts.runtime_activation,'BLOCKED');
});
test('audit summary refuses historical packet projection after live seal tampering', () => {
  const path='persistence/physical-slices/assignment/admission-evidence-plan.json',original=raw(path);
  try{writeFileSync(join(fixture,path),original+'\n');assert.throws(()=>currentFacts(fixture),/exact nine-path successor envelope/);}
  finally{writeFileSync(join(fixture,path),original);}
});
test('audit summary still rejects a changed historical decision packet', () => {
  const path='verification/legacy-recovery/owner-decisions.json',original=raw(path);
  try{const record=JSON.parse(original);record.totals.physical_shape_questions++;writeFileSync(join(fixture,path),JSON.stringify(record));assert.throws(()=>currentFacts(fixture),/owner decision inventory drift/);}
  finally{writeFileSync(join(fixture,path),original);}
});

test('audit summary retains nine unresolved owner questions and rejects live recipe contract drift', () => {
  assert.equal(currentFacts(fixture).owner_decisions.unresolved_contract_questions,9);
  for(const path of ['contracts/c31-content-teaching-engine-contract.md','contracts/c41-api-boundary-contract.md','contracts/c42-web-client-boundary-contract.md']) {
    const original=raw(path);
    try{writeFileSync(join(fixture,path),original+'\n');assert.throws(()=>currentFacts(fixture),/recipe successor|registered authority file differs|demo recipe registration/);}
    finally{writeFileSync(join(fixture,path),original);}
  }
});
