import assert from 'node:assert/strict';
/** Exercise the five new operations through the packaged HTTP boundary, retaining
 * the caller's original fifteen-operation journey and old assignment content. */
export async function exercisePackagedAuthoring(call,base,scope,assignment,oldContent){
 const workspace=await call('ReadAuthoringWorkspace',base+'/authoring/workspace');
 const catalog=structuredClone(workspace.source.catalog);
 catalog.stations.push({id:'packaged-station',label:'Packaged sample station',responsiblePersonId:workspace.source.people[0].id});
 catalog.equipment.push({id:'packaged-tool',label:'Packaged sample tool',kind:'TOOL'});
 catalog.inventory.push({equipmentId:'packaged-tool',stationId:null,quantity:2});
 catalog.recipes.push({...structuredClone(catalog.recipes[0]),id:'packaged-recipe',title:'Packaged fictional recipe',stationId:'packaged-station',requirements:[{equipmentId:'packaged-tool',quantity:1}]});
 const saved=await call('SaveContentDraft',base+'/authoring/draft','POST',{expectedRevision:0,mode:'replace',catalog},'packaged_author_save');
 assert.deepEqual((await call('ReadAuthoringWorkspace',base+'/authoring/workspace')).draft.catalog,catalog);
 assert.equal((await call('ReadAuthoringOperation',base+'/authoring/operations/packaged_author_save?operation=SaveContentDraft')).found,true);
 const preview=await call('PreviewContentDraft',base+'/authoring/draft/preview?revision='+saved.revision);
 assert.equal(preview.draft,true);assert.ok(!JSON.stringify(preview).includes('expectedOptionIndex'));
 const body={expectedRevision:saved.revision,draftDigest:saved.catalogDigest};
 const published=await call('PublishContentDraft',base+'/authoring/draft/publish','POST',body,'packaged_author_publish');
 assert.deepEqual(await call('PublishContentDraft',base+'/authoring/draft/publish','POST',body,'packaged_author_publish'),published);
 await call('AssignContent',base+'/assignments','POST',{identityId:assignment.identityId,contentPackId:published.contentRef.contentPackId,contentVersion:{version:published.contentRef.version,digest:published.contentRef.digest}},'packaged_author_assign');
 await call('SwitchDemoPersona','/api/v1/demo/persona','POST',{...scope,persona:'LEARNER'});
 const newer=await call('ReadAssignedContentVersion',base+`/content/${published.contentRef.contentPackId}/versions/${encodeURIComponent(published.contentRef.version)}`);
 assert.ok(newer.recipes.some(row=>row.id==='packaged-recipe'));assert.deepEqual(newer.blocks,oldContent.blocks);
 assert.deepEqual(await call('ReadAssignedContentVersion',base+`/content/${assignment.contentPackId}/versions/${encodeURIComponent(assignment.contentVersion.version)}`),oldContent);
 await call('SwitchDemoPersona','/api/v1/demo/persona','POST',{...scope,persona:'MANAGER'});
}
