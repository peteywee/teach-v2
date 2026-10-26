import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, renameSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { inspectKitchenEngineering, KITCHEN_ENGINEERING_MANIFEST, KITCHEN_ENGINEERING_REVIEW, KITCHEN_SOURCE_REVISIONS, KITCHEN_REVIEWED_ADDITIONS, KITCHEN_IMPLEMENTATION_PATHS } from '../verification/demo-kitchen-engineering.mjs';
import { inspectKitchenPhysicalSuccessor } from '../persistence/demo-kitchen-physical-successor.mjs';
const root=resolve(new URL('../..',import.meta.url).pathname), fixture=mkdtempSync(join(tmpdir(),'teach-kitchen-engineering-'));
for(const path of ['.github','docs','domains','contracts','kernel','persistence','drizzle','drizzle-isolated','governance','verification','scripts','src','tests'])cpSync(join(root,path),join(fixture,path),{recursive:true});
after(()=>rmSync(fixture,{recursive:true,force:true}));
function denied(){
  const engineering=inspectKitchenEngineering(fixture),physical=inspectKitchenPhysicalSuccessor(fixture);
  assert.ok(engineering.errors.length||physical.errors.length);assert.equal(physical.admitted,false);assert.deepEqual(physical.predecessorFiles,{});
  if(engineering.errors.length){assert.deepEqual(engineering.predecessorFiles,{});assert.deepEqual(engineering.revisedPaths,[]);assert.deepEqual(engineering.addedPaths,[]);}
}
function change(path,transform){const full=join(fixture,path),before=readFileSync(full,'utf8');try{writeFileSync(full,transform(before));denied();}finally{writeFileSync(full,before);}}
test('independently reviewed finite source and physical successor pass without runtime authority',()=>{
  for(const path of [root,fixture]){const engineering=inspectKitchenEngineering(path),physical=inspectKitchenPhysicalSuccessor(path);assert.deepEqual(engineering.errors,[]);assert.deepEqual(physical.errors,[]);assert.equal(physical.admitted,true);assert.equal(physical.migrationCount,8);}
});
test('all changed gate, implementation and added source bytes are sealed',()=>{
  for(const path of [...KITCHEN_SOURCE_REVISIONS,...KITCHEN_REVIEWED_ADDITIONS,...KITCHEN_IMPLEMENTATION_PATHS])change(path,text=>text+'\n');
});
test('review, baseline and manifest edits cannot authorize arbitrary predecessor bytes',()=>{
  for(const path of [KITCHEN_ENGINEERING_MANIFEST,KITCHEN_ENGINEERING_REVIEW])change(path,text=>text+'\n');
  change(KITCHEN_ENGINEERING_MANIFEST,text=>{const v=JSON.parse(text);v.predecessor_files[KITCHEN_SOURCE_REVISIONS[0]]+=' changed';return JSON.stringify(v);});
  change(KITCHEN_ENGINEERING_REVIEW,text=>{const v=JSON.parse(text);v.source_edits_by_reviewer=true;return JSON.stringify(v);});
});
test('missing or symlink review cannot expose source projections',()=>{
  const path=join(fixture,KITCHEN_ENGINEERING_REVIEW),moved=path+'.held';
  renameSync(path,moved);try{denied();}finally{renameSync(moved,path);}
  renameSync(path,moved);try{symlinkSync(moved,path);denied();}finally{rmSync(path);renameSync(moved,path);}
});
test('old migration bytes and unknown migration suffixes remain blocked',()=>{
  change('drizzle/0006_demo_recipe_content_guard.sql',text=>text+'\n');
  for(const path of ['drizzle/0008_unreviewed.sql','drizzle-isolated/0008_unreviewed.sql']){try{writeFileSync(join(fixture,path),'SELECT 1;');denied();}finally{rmSync(join(fixture,path));}}
});

test('missing engineering manifest or physical lane rejects every orphan successor',()=>{
  for(const relative of [KITCHEN_ENGINEERING_MANIFEST,'persistence/physical-slices/demo-kitchen']) {
    const path=join(fixture,relative),moved=path+'.held';renameSync(path,moved);try{denied();}finally{renameSync(moved,path);}
  }
  change('domains/demo-kitchen/proposal-0.1.0/0007_demo_kitchen_content_guard.sql',text=>text+'\n');
});

test('unlisted evidence files and nested directories cannot expand finite admission',()=>{
  for(const base of ['verification/demo-kitchen','persistence/physical-slices/demo-kitchen']){
    const file=join(fixture,base,'unreviewed.json');try{writeFileSync(file,'{}');denied();}finally{rmSync(file);}
    const dir=join(fixture,base,'unreviewed');try{mkdirSync(dir);denied();}finally{rmSync(dir,{recursive:true});}
  }
});

test('fresh inspections reject an immediate mutation after success and recover only after exact restoration',()=>{
  assert.deepEqual(inspectKitchenEngineering(fixture).errors,[]);
  assert.equal(inspectKitchenPhysicalSuccessor(fixture).admitted,true);
  change('src/modules/content/domain/demo-content.ts',text=>text+'\n');
  assert.deepEqual(inspectKitchenEngineering(fixture).errors,[]);
  assert.equal(inspectKitchenPhysicalSuccessor(fixture).admitted,true);
});
