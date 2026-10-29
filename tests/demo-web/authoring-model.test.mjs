import test from 'node:test';
import assert from 'node:assert/strict';
import {stationContent} from './station-fixtures.mjs';
import {createAuthoringForm,updateAuthoringForm,changeAuthoringRows,authoringCandidate,authoringRemoval,catalogChangeSummary,currentCatalog,issueMessage} from '../../src/web/demo/authoring-model.mjs';
import {authoringWorkspace} from './authoring-fixtures.mjs';
const set=(form,fields)=>Object.entries(fields).reduce((f,[k,v])=>updateAuthoringForm(f,k,v),form);
test('new station form uses stable generated ID and only an existing fictional person',()=>{
 const w=authoringWorkspace(),f=set(createAuthoringForm(w,'station',null,{makeId:()=> 'station-new'}),{label:'Assembly'}),result=authoringCandidate(w,f);
 assert.deepEqual(result.issues,[]);assert.equal(result.catalog.stations.at(-1).id,'station-new');assert.equal(result.catalog.stations.at(-1).responsiblePersonId,w.source.people[0].id);assert.equal(w.source.catalog.stations.length,3);assert.ok(f.dirty);
 const invalid=authoringCandidate(w,updateAuthoringForm(f,'responsiblePersonId','not-a-person'));assert.ok(invalid.issues.some(x=>x.path==='responsiblePersonId'));
});
test('equipment holdings stay separate and zero is not invented for an item without holdings',()=>{
 const w=authoringWorkspace(),f=set(createAuthoringForm(w,'equipment',null,{makeId:()=> 'equipment-new'}),{label:'Measuring jug'}),result=authoringCandidate(w,f);
 assert.deepEqual(result.issues,[]);assert.equal(result.catalog.equipment.at(-1).label,'Measuring jug');assert.deepEqual(result.catalog.inventory,w.source.catalog.inventory);assert.deepEqual(result.catalog.recipes,w.source.catalog.recipes);
});
test('holding quantities and duplicate locations fail before save without erasing form values',()=>{
 const w=authoringWorkspace();let f=set(createAuthoringForm(w,'equipment',null,{makeId:()=> 'equipment-new'}),{label:'Measuring jug'});f=changeAuthoringRows(f,'holdings');f=changeAuthoringRows(f,'holdings');f=updateAuthoringForm(f,'holdings.0.quantity','1e2');
 const result=authoringCandidate(w,f);assert.ok(result.issues.some(x=>x.path==='holdings.0.quantity'&&x.code==='QUANTITY'));assert.ok(result.issues.some(x=>x.code==='DUPLICATE'));assert.equal(f.fields.holdings[0].quantity,'1e2');
});
test('recipe editor saves catalog-only body and never admits teaching fields',()=>{
 const w=authoringWorkspace();let f=set(createAuthoringForm(w,'recipe',null,{makeId:()=> 'recipe-new'}),{title:'Sample sandwich',ingredientsText:'Bread\nSample filling',stepsText:'Review the approved procedure.\nRead back the practice ticket.'});f=changeAuthoringRows(f,'requirements');f=updateAuthoringForm(f,'requirements.0.equipmentId',w.source.catalog.equipment[0].id);
 const result=authoringCandidate(w,f);assert.deepEqual(result.issues,[]);assert.deepEqual(Object.keys(result.catalog).sort(),['equipment','inventory','recipes','stations']);assert.equal(result.catalog.recipes.at(-1).id,'recipe-new');assert.deepEqual(result.catalog.recipes.at(-1).ingredients,['Bread','Sample filling']);
 assert.deepEqual(updateAuthoringForm(f,'expectedOptionIndex','0'),f);assert.deepEqual(updateAuthoringForm(f,'__proto__.bad','x'),f);
});
test('cancel can discard a local form without mutating the last server-confirmed draft',()=>{
 const w=authoringWorkspace(),before=structuredClone(w);const f=updateAuthoringForm(createAuthoringForm(w,'station',w.source.catalog.stations[0].id),'label','Unsaved name');authoringCandidate(w,f);assert.deepEqual(w,before);assert.notEqual(currentCatalog(w).stations[0].label,'Unsaved name');
});
test('recipe duplication copies references but creates a new independent identity',()=>{
 const w=authoringWorkspace(),original=w.source.catalog.recipes[0],f=createAuthoringForm(w,'recipe',original.id,{duplicate:true,makeId:()=> 'new-recipe-id'}),r=authoringCandidate(w,f);assert.deepEqual(r.issues,[]);assert.equal(r.catalog.recipes.length,4);assert.equal(r.catalog.recipes.at(-1).id,'new-recipe-id');assert.deepEqual(r.catalog.recipes.at(-1).requirements,original.requirements);assert.equal(w.source.catalog.recipes.length,3);
});
test('referenced station and equipment removal is blocked without cascading history or links',()=>{
 const w=authoringWorkspace();for(const [kind,id]of[['station',w.source.catalog.stations[0].id],['equipment',w.source.catalog.equipment[0].id]]){const r=authoringRemoval(w,kind,id);assert.ok(r.issues.some(x=>x.code==='REFERENCED'));assert.ok(r.references.length);assert.deepEqual(r.catalog,w.source.catalog);}
});
test('unreferenced added equipment can be removed, and final recipe cannot be removed',()=>{
 const w=authoringWorkspace();w.source.catalog.equipment.push({id:'unused',label:'Unused sample',kind:'TOOL'});const r=authoringRemoval(w,'equipment','unused');assert.deepEqual(r.issues,[]);assert.ok(!r.catalog.equipment.some(x=>x.id==='unused'));w.source.catalog.recipes=w.source.catalog.recipes.slice(0,1);assert.ok(authoringRemoval(w,'recipe',w.source.catalog.recipes[0].id).issues.some(x=>x.code==='MINIMUM'));
});
test('invalid plain text, numeric values, collection limits and missing requirements are explicit',()=>{
 const w=authoringWorkspace();let f=set(createAuthoringForm(w,'recipe',null,{makeId:()=> 'new'}),{title:'<script>bad</script>',servings:'0',ingredientsText:'https://example.test',stepsText:''});const issues=authoringCandidate(w,f).issues;for(const code of ['PLAIN_TEXT','QUANTITY','EMPTY_LIST'])assert.ok(issues.some(x=>x.code===code));w.limits.stations=3;assert.ok(authoringCandidate(w,set(createAuthoringForm(w,'station',null,{makeId:()=> 'new'}),{label:'Fourth'})).issues.some(x=>x.code==='LIMIT'));assert.equal(issueMessage('unknown'),issueMessage('INVALID'));
});
test('change summary separates shared inventory changes from recipe requirements',()=>{
 const w=authoringWorkspace(),before=currentCatalog(w),after=structuredClone(before);after.inventory[0].quantity++;after.recipes[0].requirements[0].quantity++;const summary=catalogChangeSummary(before,after);assert.equal(summary.find(x=>x.collection==='recipes').changed,1);assert.equal(summary.find(x=>x.collection==='holdings').changed,1);assert.equal(summary.find(x=>x.collection==='equipment').changed,0);
});
