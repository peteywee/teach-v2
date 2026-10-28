import { authoringSourceFixture } from './authoring-source-fixture.mjs';
import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { cpSync, mkdtempSync, readFileSync, writeFileSync, rmSync, renameSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { inspectKitchenRegistration, KITCHEN_BASE, KITCHEN_PROPOSAL, KITCHEN_REVISED_PATHS, KITCHEN_SCHEMA_PROJECTION } from '../kernel/demo-kitchen-registration.mjs';
const root=resolve(new URL('../..',import.meta.url).pathname);
const fixture=authoringSourceFixture(root, 'teach-kitchen-source-');
after(()=>rmSync(fixture,{recursive:true,force:true}));
const raw=p=>readFileSync(join(fixture,p),'utf8');
const deny=()=>{const r=inspectKitchenRegistration(fixture);assert.ok(r.errors.length);assert.deepEqual(r.revisedPaths,[]);assert.deepEqual(r.addedPaths,[]);assert.deepEqual(r.predecessorFiles,{});return r;};
const change=(path,fn)=>{const before=raw(path);try{writeFileSync(join(fixture,path),fn(before));deny();}finally{writeFileSync(join(fixture,path),before);}};
const mutate=(path,fn)=>change(path,text=>{const v=JSON.parse(text);fn(v);return JSON.stringify(v,null,2)+'\n';});
test('exact source registration passes without claiming review, execution or changing prior source',()=>{
  for(const dir of [root,fixture]){const r=inspectKitchenRegistration(dir);assert.deepEqual(r.errors,[]);assert.equal(r.present,true);assert.equal(r.revisedPaths.length,5);assert.equal(r.addedPaths.length,15);assert.equal(r.registration.physical_admission_performed,false);assert.equal(r.registration.execution_authorized_by_registration,false);assert.equal(r.registration.independent_verification,'NOT_ESTABLISHED_BY_REGISTRATION');assert.deepEqual(r.registration.schemaVersions,['1.0.0','1.1.0','1.2.0']);}
});
test('every new artifact, authority and archived contract is byte-bound',()=>{
  const reg=JSON.parse(raw(`${KITCHEN_BASE}/registration.json`));
  for(const path of [...Object.keys(reg.authority_file_hashes),...Object.keys(reg.evidence_hashes),`${KITCHEN_BASE}/registration.json`,`${KITCHEN_PROPOSAL}/SHA256SUMS`,...JSON.parse(raw(`${KITCHEN_PROPOSAL}/package-manifest.json`)).artifact_files.map(x=>`${KITCHEN_PROPOSAL}/${x}`)])change(path,text=>text+'\n');
});
test('prior package, registry and registration bytes remain immutable',()=>{
  for(const path of ['kernel/entities.json','kernel/content-schema-reference-successor.json','domains/demo-runtime/registration.json','domains/demo-recipes/registration.json','governance/demo-schema-isolation/registration.json','domains/demo-runtime/proposal-0.1.0/learning-definition.json','domains/demo-recipes/proposal-0.1.0/content-schema-1.1.0.json','domains/demo-recipes/proposal-0.1.1/public-content-schema-1.1.0.json'])change(path,text=>text+'\n');
});
test('scope, authority list, versions, approvals and source predecessors cannot be inflated',()=>{
  for(const patch of [v=>v.new_tables=1,v=>v.new_routes=1,v=>v.new_migrations=2,v=>v.guard_target='public.other',v=>v.schemaVersions.push('9.0.0'),v=>v.physical_admission_performed=true,v=>v.execution_authorized_by_registration=true,v=>v.authority_file_hashes['contracts/not-approved.md']='0'.repeat(64),v=>v.impact_issue=null])mutate(`${KITCHEN_BASE}/registration.json`,patch);
  mutate(`${KITCHEN_BASE}/owner-approval.json`,v=>v.release_approval_conditional_on_tests_and_checks=false);
  mutate(`${KITCHEN_BASE}/source-baseline.json`,v=>v.files[KITCHEN_REVISED_PATHS[0]]+='\n');
  mutate(KITCHEN_SCHEMA_PROJECTION,v=>v.new_concepts.push('Station'));
});
test('unlisted package files and evidence directories cannot become an allowlist bypass',()=>{
  for(const path of [`${KITCHEN_PROPOSAL}/extra.json`,`${KITCHEN_BASE}/extra.json`]){try{writeFileSync(join(fixture,path),'{}');deny();}finally{rmSync(join(fixture,path));}}
});
test('orphan and symlink evidence never exposes predecessor bytes',()=>{
  const path=`${KITCHEN_BASE}/registration.json`,full=join(fixture,path),moved=full+'.held';
  renameSync(full,moved);try{deny();}finally{renameSync(moved,full);}
  renameSync(full,moved);try{symlinkSync(moved,full);assert.match(deny().errors.join('\n'),/regular file\/ancestor/);}finally{rmSync(full);renameSync(moved,full);}
});
