/** Unit coverage for the unpromoted recipe UI candidate. No browser/runtime proof. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {runInNewContext} from 'node:vm';
import {createDemoController} from '../../src/web/demo/controller.mjs';
import {renderApp} from '../../src/web/demo/views.mjs';
import {ApiError} from '../../src/web/demo/api.mjs';
import {assignment,content,deferred,mockService,session,scope,version} from './fixtures.mjs';

// Deliberately retain the original assignment's immutable content reference.
// Only the test transport's content payload changes; the registered fixture does not.
const recipeContent=()=>({...structuredClone(content),schemaVersion:'1.1.0',recipes:[
 {id:'recipe_bowl',title:'Fictional sample: Orchard bowl',station:'Assembly',servings:1,ingredients:['Prepared grains','Diced apple','Pumpkin seeds'],steps:['Arrange the sample ingredients.','Check the sample ticket.'],reference:'General handoff practice'},
 {id:'recipe_wrap',title:'Fictional sample: Garden wrap',station:'Assembly',servings:1,ingredients:['Flatbread','Bean spread','Sliced vegetables'],steps:['Fill the sample wrap.','Read back the sample change.'],reference:'General handoff practice'},
 {id:'recipe_cooler',title:'Fictional sample: Citrus cooler',station:'Beverage',servings:2,ingredients:['Sparkling water','Orange juice'],steps:['Mix the sample drink.','Pass on unresolved ticket questions.'],reference:'General handoff practice'},
]});
const readOps=new Set(['ReadCurrentSession','ListOwnMemberships','ListOwnAssignments','ReadOwnLearnerState','ReadAssignedContentVersion']);
const key='assignment_1:recipe_bowl';
async function setup(payload=recipeContent()){
 const api=mockService();api.current=session();
 api.override=op=>op==='ReadAssignedContentVersion'?payload:undefined;
 let sequence=0;
 const c=createDemoController({api,makeKey:()=>`recipe-test-${++sequence}`});
 await c.boot();assert.equal(c.snapshot().phase,'ready');
 return {api,c,payload};
}
const recipeTitles=html=>[...html.matchAll(/<article class="panel">.*?<h2>(.*?)<\/h2>/g)].map(match=>match[1]);
function assertReadOnly(api,before){
 assert.ok(api.calls.every(call=>readOps.has(call.op)),api.calls.map(call=>call.op).join(', '));
 assert.deepEqual(api.records,before);
}

test('recipe kitchen catalog renders counts, fictional limits, and assigned general practice',async()=>{
 const {c}=await setup();await c.library('kitchen');const s=c.snapshot(),html=renderApp(s);
 assert.equal(s.screen,'kitchen');assert.equal(s.library.length,3);
 assert.match(html,/<h1[^>]*>Kitchen catalog<\/h1>/);
 assert.match(html,/3 recipes across 2 sample stations/);
 assert.match(html,/Assembly · Beverage/);
 assert.match(html,/not an approved kitchen procedure, dietary guide or food-safety instruction/);
 assert.match(html,/Browsing does not record training completion/);
 assert.match(html,/data-action="recipes"[^>]*>Browse recipe book/);
 assert.match(html,/data-action="start" data-id="assignment_1"[^>]*>Open assigned practice/);
 assert.match(html,/not a recipe-specific assessment/);
});

test('recipe book renders exact version references, labeled controls and all three records',async()=>{
 const {c}=await setup();await c.library();const html=renderApp(c.snapshot());
 assert.equal(c.snapshot().screen,'recipes');
 assert.deepEqual(recipeTitles(html),recipeContent().recipes.map(r=>r.title));
 assert.match(html,/<p[^>]*>3 recipes shown<\/p>/);
 assert.match(html,/<label[^>]*for="recipe-search"[^>]*>Search recipes or ingredients<\/label>/);
 assert.match(html,/<input id="recipe-search"[^>]*type="search"[^>]*value=""/);
 assert.match(html,/<label[^>]*for="recipe-station"[^>]*>Station<\/label>/);
 assert.match(html,/<option value="">All stations<\/option>/);
 assert.match(html,/data-action="clear-recipes"[^>]*>Clear filters/);
 assert.match(html,/data-action="refresh"[^>]*>Refresh recipes/);
 assert.equal((html.match(/Content version 1\.0\.0/g)||[]).length,3);
 assert.equal((html.match(/data-action="recipe" data-id="assignment_1:recipe_/g)||[]).length,3);
 assert.match(html,/Nothing here marks a recipe mastered/);
});

test('recipe shell marks exactly one current navigation item on dashboard, kitchen, book and detail',async()=>{
 const {c}=await setup();
 for(const [screen,current] of [['learner','dashboard'],['kitchen','kitchen'],['recipes','recipes'],['recipe','recipes']]){
  if(screen!=='learner')await c.library(screen,screen==='recipe'?key:null);
  const html=renderApp(c.snapshot());
  assert.equal((html.match(/class="nav-current"/g)||[]).length,1);
  assert.equal((html.match(/aria-current="page"/g)||[]).length,1);
  assert.match(html,new RegExp(`data-action="${current}"[^>]*class="nav-current"[^>]*aria-current="page"`));
 }
});

test('recipe detail renders ingredients and ordered steps with the existing general handoff target',async()=>{
 const {c}=await setup();await c.library('recipe',key);const html=renderApp(c.snapshot());
 assert.match(html,/<h1[^>]*>Fictional sample: Orchard bowl<\/h1>/);
 assert.match(html,/<h2>Ingredients<\/h2><ul><li>Prepared grains<\/li><li>Diced apple<\/li><li>Pumpkin seeds<\/li><\/ul>/);
 assert.match(html,/<h2>Sample steps<\/h2><ol><li>Arrange the sample ingredients\.<\/li><li>Check the sample ticket\.<\/li><\/ol>/);
 assert.match(html,/1 sample serving · Content version 1\.0\.0/);
 assert.match(html,/data-action="start" data-id="assignment_1"[^>]*>Open general handoff practice/);
 assert.match(html,/existing general handoff assignment, not a recipe-specific challenge/);
 assert.match(html,/data-action="recipes"[^>]*>Back to recipe book/);
 assert.match(html,/data-action="refresh"[^>]*>Refresh recipe/);
});

test('recipe rendering escapes labels, ingredients, steps, references, keys and filter values',async()=>{
 const {c}=await setup();await c.library();const s=c.snapshot();
 const unsafe='<img src=x onerror="alert(1)"> & \'sample\'',escaped='&lt;img src=x onerror=&quot;alert(1)&quot;&gt; &amp; &#39;sample&#39;';
 const entry=s.library[0];entry.key=unsafe;Object.assign(entry.recipe,{title:unsafe,station:unsafe,ingredients:[unsafe],steps:[unsafe],reference:unsafe});
 for(const screen of ['kitchen','recipes','recipe']){
  s.screen=screen;s.recipeKey=unsafe;
  const html=renderApp(s,{recipeSearch:screen==='recipes'?unsafe:'',station:screen==='recipes'?unsafe:''});
  assert.doesNotMatch(html,/<img|onerror="alert\(1\)"/);
  assert.ok(html.includes(escaped),screen+' escaped text');
  if(screen==='recipes'){
   assert.ok(html.includes(`value="${escaped}"`));
   assert.ok(html.includes(`data-id="${escaped}"`));
   assert.ok(html.includes(`<option value="${escaped}" selected>${escaped}</option>`));
  }
  if(screen==='recipe')assert.equal((html.match(/&lt;img/g)||[]).length,5);
 }
});

test('recipe search matches title, ingredient and station case-insensitively and composes with station filter',async()=>{
 const {c}=await setup();await c.library();const s=c.snapshot();
 for(const [recipeSearch,station,expected] of [
  ['oRcHaRd','',['Fictional sample: Orchard bowl']],
  ['PUMPKIN','',['Fictional sample: Orchard bowl']],
  ['beverage','',['Fictional sample: Citrus cooler']],
  ['','Assembly',['Fictional sample: Orchard bowl','Fictional sample: Garden wrap']],
  ['bean','Assembly',['Fictional sample: Garden wrap']],
  ['bean','Beverage',[]],
 ])assert.deepEqual(recipeTitles(renderApp(s,{recipeSearch,station})),expected,JSON.stringify({recipeSearch,station}));
 assert.match(renderApp(s,{station:'Assembly'}),/<option value="Assembly" selected>Assembly<\/option>/);
});

test('recipe no-match and empty legacy content are distinct and never substitute samples',async()=>{
 const {c}=await setup();await c.library();let html=renderApp(c.snapshot(),{recipeSearch:'unlisted ingredient'});
 assert.match(html,/0 recipes shown/);assert.match(html,/No matching recipes\./);
 assert.match(html,/Change the search or clear the filters/);
 assert.doesNotMatch(html,/No recipe references in this content version/);
 const legacy=await setup(structuredClone(content));await legacy.c.library();html=renderApp(legacy.c.snapshot());
 assert.deepEqual(legacy.c.snapshot().library,[]);
 assert.match(html,/No recipe references in this content version\./);
 assert.match(html,/Older assignments remain available in My learning/);
 assert.match(html,/No placeholder recipe data is substituted/);
 assert.doesNotMatch(html,/No matching recipes|Orchard bowl|Garden wrap|Citrus cooler/);
});

test('an authoritative empty assignment list yields an empty kitchen and recipe book',async()=>{
 const {api,c}=await setup();api.records.splice(0);
 await c.library('kitchen');assert.equal(c.snapshot().phase,'ready');let html=renderApp(c.snapshot());
 assert.match(html,/0 recipes across 0 sample stations/);assert.match(html,/No assigned practice/);
 await c.library();html=renderApp(c.snapshot());
 assert.match(html,/No recipe references in this content version/);
 assert.equal(api.calls.filter(call=>call.op==='ReadAssignedContentVersion').length,0);
});

test('controller navigation and refresh keep recipe selection and reread canonical content',async()=>{
 const {api,c,payload}=await setup();
 for(const [screen,recipeKey] of [['kitchen',null],['recipes',null],['recipe',key]]){
  await c.library(screen,recipeKey);assert.equal(c.snapshot().phase,'ready');
  const reads=api.calls.filter(call=>call.op==='ReadAssignedContentVersion').length;
  payload.recipes[0].title=`Refreshed ${screen}`;await c.refresh();
  const s=c.snapshot();assert.equal(s.phase,'ready');assert.equal(s.screen,screen);assert.equal(s.recipeKey,recipeKey);
  assert.equal(s.library[0].recipe.title,`Refreshed ${screen}`);
  assert.equal(api.calls.filter(call=>call.op==='ReadAssignedContentVersion').length,reads+1);
  assert.equal(s.assignmentId,null);assert.equal(s.content,null);
 }
 const read=api.calls.find(call=>call.op==='ReadAssignedContentVersion');
 assert.deepEqual(read.options.params,{...scope,contentPackId:'pack_1',contentVersion:version.version});
 await c.dashboard();assert.equal(c.snapshot().screen,'learner');assert.deepEqual(c.snapshot().library,[]);
});

test('browsing, filtering, refreshing and returning never start or mutate learning records',async()=>{
 const {api,c}=await setup(),before=structuredClone(api.records);
 await c.library('kitchen');await c.library();renderApp(c.snapshot(),{recipeSearch:'apple',station:'Assembly'});
 await c.library('recipe',key);await c.refresh();await c.library();await c.dashboard();
 assertReadOnly(api,before);
 assert.equal(c.snapshot().states[0].recordedBlockCount,0);assert.equal(c.snapshot().states[0].session,null);
});

test('opening the explicit general handoff action starts only its existing assignment',async()=>{
 const {api,c}=await setup();await c.library('recipe',key);
 assert.equal(api.records[0].session,null);assert.equal(c.snapshot().assignmentId,null);
 const target=c.snapshot().library.find(entry=>entry.key===key).assignmentId;
 await c.start(target);
 assert.equal(c.snapshot().phase,'ready');assert.equal(c.snapshot().screen,'training');
 assert.equal(c.snapshot().assignmentId,'assignment_1');
 assert.deepEqual(api.calls.filter(call=>call.op==='StartLearningSession').map(call=>call.options.body),[{assignmentId:'assignment_1'}]);
 assert.equal(api.records[0].responses.length,0);
 assert.equal(api.calls.some(call=>['RecordProgressEvent','CompleteLearningSession','AssignContent'].includes(call.op)),false);
});

test('missing recipe fails closed and can recover to dashboard then reopen an assigned recipe',async()=>{
 const {api,c}=await setup(),before=structuredClone(api.records);
 await c.library('recipe','assignment_1:missing');let s=c.snapshot();
 assert.equal(s.phase,'error');assert.equal(s.error.status,404);assert.equal(s.error.code,'NOT_FOUND');
 assert.deepEqual(s.library,[]);assert.equal(s.recipeKey,null);
 assert.doesNotMatch(renderApp(s),/Orchard bowl|Ingredients/);
 await c.recover();assert.equal(c.snapshot().phase,'ready');assert.equal(c.snapshot().screen,'learner');
 await c.library('recipe',key);assert.equal(c.snapshot().phase,'ready');assert.equal(c.snapshot().recipeKey,key);
 assertReadOnly(api,before);
});

test('recipe content read failure does not expose stale details and supports authoritative recovery',async()=>{
 const {api,c,payload}=await setup();await c.library('recipe',key);
 api.override=op=>{if(op==='ReadAssignedContentVersion')throw new ApiError('network');};
 await c.refresh();let s=c.snapshot();assert.equal(s.phase,'error');assert.equal(s.error.kind,'network');
 assert.deepEqual(s.library,[]);assert.doesNotMatch(renderApp(s),/Orchard bowl|Ingredients/);
 api.override=op=>op==='ReadAssignedContentVersion'?payload:undefined;
 await c.recover();await c.library('recipe',key);
 assert.equal(c.snapshot().phase,'ready');assert.match(renderApp(c.snapshot()),/Orchard bowl/);
});

test('refresh reports removed recipe references as not found, not an invented detail',async()=>{
 const {api,c}=await setup();await c.library('recipe',key);
 api.override=op=>op==='ReadAssignedContentVersion'?content:undefined;
 await c.refresh();const s=c.snapshot();assert.equal(s.phase,'error');assert.equal(s.error.status,404);
 assert.deepEqual(s.library,[]);assert.doesNotMatch(renderApp(s),/Orchard bowl/);
});

test('manager recipe navigation is denied before any recipe or own-assignment read',async()=>{
 for(const screen of ['kitchen','recipes','recipe']){
  const {api,c}=await setup();api.current=session('MANAGER');await c.recover();api.calls.length=0;
  assert.doesNotMatch(renderApp(c.snapshot()),/data-action="(?:kitchen|recipes|recipe)"/);
  await c.library(screen,key);const s=c.snapshot();assert.equal(s.phase,'forbidden');
  assert.deepEqual(s.library,[]);assert.equal(s.recipeKey,null);assert.equal(s.session,null);
  assert.equal(api.calls.some(call=>['ReadAssignedContentVersion','ListOwnAssignments','ReadOwnLearnerState'].includes(call.op)),false);
 }
});

test('recipe reads reject foreign organization, content pack, version or digest',async()=>{
 for(const change of [
  {organizationId:'foreign_org'},
  {contentPackId:'foreign_pack'},
  {contentVersion:{...version,version:'2.0.0'}},
  {contentVersion:{...version,digest:'sha256:'+'b'.repeat(64)}},
 ]){
  const {api,c}=await setup({...recipeContent(),...change}),before=structuredClone(api.records);
  await c.library();const s=c.snapshot();assert.equal(s.phase,'error');assert.equal(s.error.kind,'protocol');
  assert.deepEqual(s.library,[]);assert.doesNotMatch(renderApp(s),/Orchard bowl/);assertReadOnly(api,before);
 }
});

test('duplicate assignments to the same pack and immutable version load only one recipe set',async()=>{
 const {api,c}=await setup();api.records.push({assignment:assignment('assignment_2'),session:null,responses:[]});
 const before=structuredClone(api.records);await c.library();const s=c.snapshot();
 assert.equal(s.phase,'ready');assert.equal(s.assignments.length,2);assert.equal(s.states.length,2);assert.equal(s.library.length,3);
 assert.equal(api.calls.filter(call=>call.op==='ReadAssignedContentVersion').length,1);
 assert.ok(s.library.every(entry=>entry.assignmentId==='assignment_2'));
 assert.deepEqual(s.library.map(entry=>entry.contentVersion),[version,version,version]);
 assertReadOnly(api,before);
});

test('recipe deduplication compares version values rather than JSON property order',async()=>{
 const {api,c}=await setup();const repeated=assignment('assignment_2');
 repeated.contentVersion={digest:version.digest,version:version.version};
 api.records.push({assignment:repeated,session:null,responses:[]});
 const before=structuredClone(api.records);await c.library();const s=c.snapshot();
 assert.equal(s.phase,'ready');assert.equal(s.library.length,3);
 assert.equal(api.calls.filter(call=>call.op==='ReadAssignedContentVersion').length,1);
 assert.ok(s.library.every(entry=>entry.assignmentId==='assignment_2'));
 assertReadOnly(api,before);
});

test('recipe links target the newest reassignment while preserving earlier completion',async()=>{
 const {api,c}=await setup();await c.start('assignment_1');
 for(let i=0;i<3;i++){c.choose(0);await c.save();c.next();}
 await c.complete();assert.equal(api.records[0].session.status,'COMPLETED');
 const earlier=structuredClone(api.records[0]);
 const newer=assignment('assignment_2');newer.assignedAt='2026-10-18T03:30:00.000Z';
 api.records.push({assignment:newer,session:null,responses:[]});api.calls.length=0;
 const before=structuredClone(api.records);await c.library();let s=c.snapshot();
 assert.equal(s.phase,'ready');assert.equal(s.assignments.length,2);assert.equal(s.library.length,3);
 assert.ok(s.library.every(entry=>entry.assignmentId==='assignment_2'));
 const currentKey='assignment_2:recipe_bowl';await c.library('recipe',currentKey);
 assert.match(renderApp(c.snapshot()),/data-action="start" data-id="assignment_2"[^>]*>Open general handoff practice/);
 assertReadOnly(api,before);
 await c.start('assignment_2');s=c.snapshot();
 assert.equal(s.screen,'training');assert.equal(s.assignmentId,'assignment_2');
 assert.deepEqual(api.records[0],earlier);
 assert.equal(api.records[1].session.status,'ACTIVE');assert.deepEqual(api.records[1].responses,[]);
 assert.deepEqual(api.calls.filter(call=>call.op==='StartLearningSession').map(call=>call.options.body),[{assignmentId:'assignment_2'}]);
});

test('malformed recipe count, duplicate IDs, unsupported schema and legacy recipes fail closed',async()=>{
 const standard=recipeContent();
 for(const payload of [
  {...standard,recipes:standard.recipes.slice(0,2)},
  {...standard,recipes:[standard.recipes[0],standard.recipes[0],standard.recipes[2]]},
  {...standard,schemaVersion:'2.0.0'},
  {...standard,schemaVersion:'1.0.0'},
 ]){
  const {c}=await setup(payload);await c.library();const s=c.snapshot();
  assert.equal(s.phase,'error');assert.equal(s.error.kind,'protocol');assert.deepEqual(s.library,[]);
 }
});

// Tiny event/DOM stubs test app.mjs wiring only, not layout, real DOM semantics,
// keyboard behavior, accessibility, browser security, or backend integration.
async function appEventHarness(){
 const api=mockService();api.current=session();api.override=op=>op==='ReadAssignedContentVersion'?recipeContent():undefined;
 const elements=new Map(),listeners=new Map();
 const element=id=>{
  if(!elements.has(id))elements.set(id,{id,focusCount:0,focus(){this.focusCount++;},setSelectionRange(start,end){this.selection=[start,end];},addEventListener(){},setAttribute(){}});
  return elements.get(id);
 };
 const root=element('app');root.innerHTML='';root.addEventListener=(kind,handler)=>{const handlers=listeners.get(kind)||[];handlers.push(handler);listeners.set(kind,handlers);};
 const document={
  getElementById:id=>{
   if(id==='recipe-result-count'){
    const count=root.innerHTML.match(/<p id="recipe-result-count">([^<]*)<\/p>/);
    if(!count)return null;
    element(id).textContent=count[1];
   }
   return element(id);
  },
  querySelector:selector=>selector.startsWith('#')?document.getElementById(selector.slice(1)):element(selector),
  documentElement:{dataset:{theme:'dark'}},
 };
 let controller,pending=Promise.resolve(),sequence=0;
 const createController=options=>{
  controller=createDemoController({...options,makeKey:()=>`event-test-${++sequence}`});
  return Object.fromEntries(Object.entries(controller).map(([name,fn])=>[name,(...args)=>{const result=fn(...args);if(result?.then)pending=result;return result;}]))
 };
 const source=(await readFile(new URL('../../src/web/demo/app.mjs',import.meta.url),'utf8')).replace(/^import .*;\n/gm,'');
 runInNewContext(source,{document,window:{addEventListener(){}},renderApp,createDemoController:createController,createDemoApi:()=>api},{filename:'app.mjs unit event harness'});
 await pending;
 const dispatch=async(kind,target,attributes={})=>{for(const handler of listeners.get(kind)||[])handler({target,...attributes});await pending;};
 return {api,root,element,get controller(){return controller;},
  click:async(action,id)=>dispatch('click',{closest:()=>({dataset:{action,id},disabled:false})}),
  input:async(value,position=value.length,isComposing=false)=>dispatch('input',{id:'recipe-search',value,selectionStart:position},{isComposing}),
  compositionEnd:async value=>dispatch('compositionend',{id:'recipe-search',value,selectionStart:value.length}),
  station:async value=>dispatch('change',{id:'recipe-station',value}),
 };
}

test('app event wiring navigates kitchen/book/detail and clears search plus station without writes',async()=>{
 const app=await appEventHarness(),before=structuredClone(app.api.records);
 await app.click('kitchen');assert.equal(app.controller.snapshot().screen,'kitchen');
 await app.click('recipes');assert.equal(app.controller.snapshot().screen,'recipes');
 await app.input('bean',2);assert.deepEqual(recipeTitles(app.root.innerHTML),['Fictional sample: Garden wrap']);
 assert.equal(app.element('announcer').textContent,'1 recipe shown');
 assert.deepEqual(app.element('recipe-search').selection,[2,2]);assert.ok(app.element('recipe-search').focusCount>0);
 await app.station('Beverage');assert.match(app.root.innerHTML,/No matching recipes/);assert.ok(app.element('recipe-station').focusCount>0);
 assert.equal(app.element('announcer').textContent,'0 recipes shown');
 const reads=app.api.calls.length,focuses=app.element('recipe-search').focusCount;
 await app.click('clear-recipes');assert.equal(app.api.calls.length,reads);
 assert.equal(recipeTitles(app.root.innerHTML).length,3);
 assert.equal(app.element('announcer').textContent,'3 recipes shown');
 assert.match(app.root.innerHTML,/<input id="recipe-search"[^>]*value=""/);
 assert.doesNotMatch(app.root.innerHTML,/<option[^>]+ selected/);
 assert.equal(app.element('recipe-search').focusCount,focuses+1);
 await app.click('recipe',key);assert.equal(app.controller.snapshot().screen,'recipe');assert.equal(app.controller.snapshot().recipeKey,key);
 await app.click('recipes');assert.equal(app.controller.snapshot().screen,'recipes');
 await app.input('unlisted');await app.station('Assembly');await app.click('kitchen');await app.click('recipes');
 assert.equal(recipeTitles(app.root.innerHTML).length,3);
 assertReadOnly(app.api,before);
});


test('app recipe search preserves in-progress IME composition and applies committed text',async()=>{
 const app=await appEventHarness();await app.click('recipes');
 const before=app.root.innerHTML,reads=app.api.calls.length,focuses=app.element('recipe-search').focusCount;
 await app.input('apple',5,true);
 assert.equal(app.root.innerHTML,before);assert.equal(app.api.calls.length,reads);
 assert.equal(app.element('recipe-search').focusCount,focuses);
 await app.compositionEnd('apple');
 assert.deepEqual(recipeTitles(app.root.innerHTML),['Fictional sample: Orchard bowl']);
 assert.deepEqual(app.element('recipe-search').selection,[5,5]);
 assert.equal(app.element('announcer').textContent,'1 recipe shown');
 assert.equal(app.api.calls.length,reads);
});


test('a pending or failed save never retains an earlier successful refresh notice',async()=>{
 const {api,c}=await setup();await c.start('assignment_1');await c.refresh();
 assert.equal(c.snapshot().notice,'Showing the latest saved records.');c.choose(0);
 const gate=deferred();api.override=op=>op==='RecordProgressEvent'?gate.promise:undefined;
 const save=c.save();
 assert.equal(c.snapshot().phase,'loading');assert.equal(c.snapshot().notice,'');
 assert.doesNotMatch(renderApp(c.snapshot()),/Showing the latest saved records/);
 gate.reject(new ApiError('network'));await save;
 const failed=c.snapshot();assert.equal(failed.phase,'error');assert.equal(failed.error.kind,'network');assert.equal(failed.notice,'');
 assert.doesNotMatch(renderApp(failed),/Showing the latest saved records/);
 assert.equal(api.records[0].responses.length,0);assert.equal(api.records[0].session.status,'ACTIVE');
});

test('recipe navigation clears old successful notices immediately and after authoritative reads',async()=>{
 const {api,c,payload}=await setup();await c.library();await c.refresh();
 assert.equal(c.snapshot().notice,'Showing the latest saved records.');
 const gate=deferred();let first=true;
 api.override=op=>{
  if(op==='ReadCurrentSession'&&first){first=false;return gate.promise;}
  if(op==='ReadAssignedContentVersion')return payload;
 };
 const navigation=c.library('recipe',key);
 assert.equal(c.snapshot().phase,'loading');assert.equal(c.snapshot().notice,'');
 gate.resolve();await navigation;
 assert.equal(c.snapshot().phase,'ready');assert.equal(c.snapshot().screen,'recipe');assert.equal(c.snapshot().notice,'');
 await c.refresh();assert.equal(c.snapshot().notice,'Showing the latest saved records.');
 await c.dashboard();assert.equal(c.snapshot().screen,'learner');assert.equal(c.snapshot().notice,'');
 assert.doesNotMatch(renderApp(c.snapshot()),/Showing the latest saved records/);
});

test('recipe counts and sample servings use singular only for one and retain plurals otherwise',async()=>{
 const {c}=await setup();await c.library();const s=c.snapshot();
 const all=renderApp(s);assert.match(all,/>3 recipes shown<\/p>/);
 assert.equal((all.match(/1 sample serving ·/g)||[]).length,2);assert.match(all,/2 sample servings ·/);
 assert.doesNotMatch(all,/1 sample servings/);
 const one=renderApp(s,{recipeSearch:'bean'});assert.match(one,/>1 recipe shown<\/p>/);assert.doesNotMatch(one,/1 recipes shown/);
 assert.match(renderApp(s,{station:'Assembly'}),/>2 recipes shown<\/p>/);
 assert.match(renderApp(s,{recipeSearch:'no matching ingredient'}),/>0 recipes shown<\/p>/);
 await c.library('recipe',key);assert.match(renderApp(c.snapshot()),/1 sample serving ·/);
 await c.library('recipe','assignment_1:recipe_cooler');assert.match(renderApp(c.snapshot()),/2 sample servings ·/);
});

test('recipe-count live announcements clear when navigating to detail, kitchen or dashboard',async()=>{
 const app=await appEventHarness();
 for(const [action,id] of [['recipe',key],['kitchen',undefined],['dashboard',undefined]]){
  await app.click('recipes');await app.input('bean');assert.equal(app.element('announcer').textContent,'1 recipe shown');
  await app.click(action,id);assert.equal(app.element('announcer').textContent,'',action+' clears obsolete search count');
 }
});

test('recipe-count live announcements clear during refresh loading, failure and offline phases',async()=>{
 const app=await appEventHarness();await app.click('recipes');await app.input('bean');
 assert.equal(app.element('announcer').textContent,'1 recipe shown');
 const gate=deferred();app.api.override=op=>op==='ReadCurrentSession'?gate.promise:undefined;
 const refresh=app.click('refresh');
 assert.equal(app.controller.snapshot().phase,'loading');assert.equal(app.element('announcer').textContent,'');
 gate.reject(new ApiError('network'));await refresh;
 assert.equal(app.controller.snapshot().phase,'error');assert.equal(app.element('announcer').textContent,'');
 app.api.override=op=>op==='ReadAssignedContentVersion'?recipeContent():undefined;
 await app.click('recipes');await app.input('bean');assert.equal(app.element('announcer').textContent,'1 recipe shown');
 app.controller.offline();assert.equal(app.controller.snapshot().phase,'offline');assert.equal(app.element('announcer').textContent,'');
});
