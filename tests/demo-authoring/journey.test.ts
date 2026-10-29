/** Application-boundary journeys. Real PostgreSQL isolation and browser evidence are separate gates. */
import assert from 'node:assert/strict';
import test from 'node:test';
import {authoringHarness,managerHarness} from './harness.js';

const code=(expected:string)=>(error:any)=>error?.code===expected;
const changed=(workspace:any)=>{
 const catalog=structuredClone(workspace.source.catalog);
 catalog.stations.push({id:'journey-station',label:'Sample pastry',responsiblePersonId:workspace.source.people[0].id});
 catalog.equipment.push({id:'journey-whisk',label:'Sample whisk',kind:'TOOL'});
 catalog.inventory.push({equipmentId:'journey-whisk',stationId:null,quantity:2});
 catalog.recipes.push({...structuredClone(catalog.recipes[0]),id:'journey-recipe',title:'Fictional pastry reference',stationId:'journey-station',requirements:[{equipmentId:'journey-whisk',quantity:1}]});
 return catalog;
};

test('full authoring and explicit assignment preserve both active and completed earlier attempts',async()=>{
 for(const completed of [false,true]){
  const h=authoringHarness(),learner=await h.invoke('BeginDemoRun');
  const assignment=(await h.invoke('ListOwnAssignments')).items[0].assignment;
  const oldContent=await h.invoke('ReadAssignedContentVersion',{}, {contentPackId:assignment.contentPackId,contentVersion:assignment.contentVersion.version});
  const attempt=await h.invoke('StartLearningSession',{assignmentId:assignment.id},{},'journey_start_123456');
  for(const [i,block] of oldContent.blocks.slice(0,completed?3:1).entries())await h.invoke('RecordProgressEvent',{blockId:block.id,selectedOptionIndex:0},{learningSessionId:attempt.id},'journey_progress_'+i);
  if(completed)await h.invoke('CompleteLearningSession',{}, {learningSessionId:attempt.id});
  const historical=structuredClone({assignment:h.database.state.assignments.get(assignment.id),attempt:h.database.state.learningSessions.get(attempt.id),progress:h.database.state.progress,content:[...h.database.state.content.values()][0]});
  await h.invoke('SwitchDemoPersona',{...h.scope,persona:'MANAGER'});
  const workspace=await h.invoke('ReadAuthoringWorkspace'),catalog=changed(workspace);
  const saved=await h.invoke('SaveContentDraft',{expectedRevision:0,mode:'replace',catalog},{},'journey_save_1234567');
  assert.deepEqual((await h.invoke('ReadAuthoringWorkspace')).draft.catalog,catalog);
  const preview=await h.invoke('PreviewContentDraft',{},{},null,{revision:saved.revision});
  assert.equal(preview.draft,true);assert.ok(!JSON.stringify(preview).includes('expectedOptionIndex'));
  const published=await h.invoke('PublishContentDraft',{expectedRevision:saved.revision,draftDigest:saved.catalogDigest},{},'journey_publish_1234');
  assert.equal(h.database.state.assignments.size,1,'publication does not assign');
  await h.invoke('SwitchDemoPersona',{...h.scope,persona:'LEARNER'});
  await assert.rejects(h.invoke('ReadAssignedContentVersion',{}, {contentPackId:published.contentRef.contentPackId,contentVersion:published.contentRef.version}),code('NOT_FOUND'));
  assert.deepEqual(await h.invoke('ReadAssignedContentVersion',{}, {contentPackId:assignment.contentPackId,contentVersion:assignment.contentVersion.version}),oldContent);
  await h.invoke('SwitchDemoPersona',{...h.scope,persona:'MANAGER'});
  const newer=await h.invoke('AssignContent',{identityId:learner.identityId,contentPackId:published.contentRef.contentPackId,contentVersion:{version:published.contentRef.version,digest:published.contentRef.digest}},{},'journey_assign_12345');
  assert.notEqual(newer.id,assignment.id);
  await h.invoke('SwitchDemoPersona',{...h.scope,persona:'LEARNER'});
  const visible=await h.invoke('ReadAssignedContentVersion',{}, {contentPackId:published.contentRef.contentPackId,contentVersion:published.contentRef.version});
  assert.ok(visible.recipes.some((r:any)=>r.id==='journey-recipe'));
  assert.deepEqual({assignment:h.database.state.assignments.get(assignment.id),attempt:h.database.state.learningSessions.get(attempt.id),progress:h.database.state.progress,content:[...h.database.state.content.values()][0]},historical);
  assert.equal(h.database.state.learningSessions.size,1,'new assignment never starts or switches an attempt');
 }
});

test('restoring older published business content creates a new version, equal latest is a no-op',async()=>{
 const h=await managerHarness(),workspace=await h.invoke('ReadAuthoringWorkspace'),catalog=changed(workspace);
 const saved=await h.invoke('SaveContentDraft',{expectedRevision:0,mode:'replace',catalog},{},'restore_first_save_1');
 const first=await h.invoke('PublishContentDraft',{expectedRevision:saved.revision,draftDigest:saved.catalogDigest},{},'restore_first_pub_12');
 const restored=await h.invoke('SaveContentDraft',{expectedRevision:1,mode:'restorePublished',publishedContentRef:workspace.source.baseContentRef},{},'restore_old_save_123');
 const second=await h.invoke('PublishContentDraft',{expectedRevision:restored.revision,draftDigest:restored.catalogDigest},{},'restore_old_pub_1234');
 assert.equal(second.unchanged,false);assert.equal(second.contentRef.version,'1.2.2');assert.notDeepEqual(second.contentRef,workspace.source.baseContentRef);
 const all=[...h.database.state.content.values()];assert.deepEqual(JSON.parse(all[2]!.canonicalJson).recipes,JSON.parse(all[0]!.canonicalJson).recipes);
 const before=h.database.state.audit.length;
 const again=await h.invoke('PublishContentDraft',{expectedRevision:restored.revision,draftDigest:restored.catalogDigest},{},'restore_noop_pub_123');
 assert.equal(again.unchanged,true);assert.deepEqual(again.contentRef,second.contentRef);assert.equal(h.database.state.content.size,3);assert.equal(h.database.state.audit.length,before);
 const current=await h.invoke('ReadAuthoringWorkspace');assert.equal(current.limits.remainingPublications,8);assert.ok(current.publishedVersions.some((r:any)=>r.digest===first.contentRef.digest));
});

test('all authoring operations deny learners and foreign runs; confirmed close resets only access and new visit content',async()=>{
 const h=await managerHarness(),oldScope={...h.scope},oldCredential=h.credential,workspace=await h.invoke('ReadAuthoringWorkspace');
 const saved=await h.invoke('SaveContentDraft',{expectedRevision:0,mode:'replace',catalog:changed(workspace)},{},'isolation_save_12345');
 await h.invoke('BeginDemoRun',{}, {},null,{},null);
 const calls:[any,any,any,any,any][]=[
  ['ReadAuthoringWorkspace',{}, {},null,{}],
  ['SaveContentDraft',{expectedRevision:0,mode:'replace',catalog:workspace.source.catalog},{},'forbidden_save_1234',{}],
  ['PreviewContentDraft',{}, {},null,{revision:1}],
  ['PublishContentDraft',{expectedRevision:1,draftDigest:saved.catalogDigest},{},'forbidden_pub_12345',{}],
  ['ReadAuthoringOperation',{}, {key:'isolation_save_12345'},null,{operation:'SaveContentDraft'}],
 ];
 for(const [op,body,params,key,query] of calls)await assert.rejects(h.invoke(op,body,params,key,query),code('FORBIDDEN'));
 await h.invoke('SwitchDemoPersona',{...h.scope,persona:'MANAGER'});
 for(const [op,body,params,key,query] of calls)await assert.rejects(h.invoke(op,body,{...params,...oldScope},key,query),code('NOT_FOUND'));
 assert.equal((await h.invoke('ReadAuthoringWorkspace')).draft,null);
 assert.equal((await h.invoke('ReadAuthoringOperation',{}, {key:'isolation_save_12345'},null,{operation:'SaveContentDraft'})).found,false);
 assert.equal((await h.invoke('ReadAuthoringWorkspace',{},oldScope,null,{},oldCredential)).draft.revision,1);
 await h.invoke('CloseDemoRun',oldScope,oldScope,null,{},oldCredential);
 await assert.rejects(h.invoke('ReadAuthoringWorkspace',{},oldScope,null,{},oldCredential),code('UNAUTHENTICATED'));
 assert.equal(h.database.drafts.size,1,'closing access is not physical deletion');
 }
);
