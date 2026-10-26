/** Source unit/event tests only; no claim of browser layout, accessibility certification or live SQL. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {runInNewContext} from 'node:vm';
import {createDemoController} from '../../src/web/demo/controller.mjs';
import {renderApp} from '../../src/web/demo/views.mjs';
import {ApiError} from '../../src/web/demo/api.mjs';
import {content,mockService,session,assignment} from './fixtures.mjs';
import {stationContent} from './station-fixtures.mjs';
const reads=new Set(['ReadCurrentSession','ListOwnMemberships','ListOwnAssignments','ReadOwnLearnerState','ReadAssignedContentVersion']);
const key=id=>'assignment_1:'+id;
async function setup(payload=stationContent()){
 const api=mockService();api.current=session();api.override=op=>op==='ReadAssignedContentVersion'?payload:undefined;
 const c=createDemoController({api,makeKey:()=> 'station-test-key'});await c.boot();assert.equal(c.snapshot().phase,'ready');return {api,c,payload};
}
function readOnly(api,before){assert.ok(api.calls.every(x=>reads.has(x.op)),api.calls.map(x=>x.op).join(', '));assert.deepEqual(api.records,before);}
test('station navigation renders three server-owned stations and display-only people without writes',async()=>{
 const {api,c,payload}=await setup(),before=structuredClone(api.records);await c.library('stations');const s=c.snapshot(),html=renderApp(s);
 assert.equal(s.catalogs.length,1);assert.equal(s.library.length,3);assert.match(html,/<h1[^>]*>Stations<\/h1>/);
 for(const station of payload.stations){assert.ok(html.includes(station.label));assert.ok(html.includes('data-id="'+key(station.id)+'"'));}
 for(const person of payload.people)assert.ok(html.includes(person.displayLabel));
 assert.match(html,/Not live staffing, stock or equipment availability/);assert.match(html,/Browsing never changes training records/);assert.match(html,/aria-current="page"[^>]*>Stations/);
 readOnly(api,before);
});
test('station → recipe → equipment links share catalog identities, not title/position matching',async()=>{
 const {api,c,payload}=await setup(),before=structuredClone(api.records),recipe=payload.recipes[0],station=payload.stations.find(x=>x.id===recipe.stationId);
 await c.library('station',key(station.id));let html=renderApp(c.snapshot());assert.ok(html.includes(recipe.title));assert.match(html,/display-only fictional person, not a signed-in account or a scheduled shift/);
 assert.ok(html.includes('data-id="'+key(recipe.id)+'"'));assert.ok(html.includes('data-id="'+key(recipe.requirements[0].equipmentId)+'"'));
 await c.library('recipe',key(recipe.id));html=renderApp(c.snapshot());assert.match(html,/Who prepares this sample/);assert.match(html,/Required tools and equipment/);assert.ok(html.includes('data-id="'+key(station.id)+'"'));assert.match(html,/not live availability/);
 await c.library('equipment',key(recipe.requirements[0].equipmentId));html=renderApp(c.snapshot());assert.match(html,/1 item shown/);assert.ok(html.includes(recipe.title));assert.ok(html.includes('data-id="'+key(station.id)+'"'));
 readOnly(api,before);
});
test('inventory holdings are separate from requirements and shared items are not double-counted',async()=>{
 const {c,payload}=await setup();const shared=payload.inventory.find(x=>x.stationId===null&&payload.recipes.filter(r=>r.requirements.some(q=>q.equipmentId===x.equipmentId)).length>1);
 assert.ok(shared);await c.library('equipment',key(shared.equipmentId));const html=renderApp(c.snapshot());
 assert.ok(html.includes(shared.quantity+' in the fictional inventory'));assert.match(html,/Shared kitchen/);
 assert.equal((html.match(/required for this sample recipe/g)||[]).length,payload.recipes.filter(r=>r.requirements.some(q=>q.equipmentId===shared.equipmentId)).length);
 assert.match(html,/not a live stocktake, availability check or maintenance record/);
});
test('station catalog refresh preserves a selected station or equipment while rereading immutable content',async()=>{
 for(const screen of ['station','equipment']){const {c,api,payload}=await setup(),id=key(payload[screen==='station'?'stations':'equipment'][0].id);await c.library(screen,id);api.calls.length=0;await c.refresh();const s=c.snapshot();assert.equal(s.screen,screen);assert.equal(s[screen==='station'?'stationKey':'equipmentKey'],id);assert.ok(api.calls.some(x=>x.op==='ReadAssignedContentVersion'));assert.equal(s.phase,'ready');}
});
test('old content remains readable without inventing station people, tools or inventory',async()=>{
 const {c}=await setup(structuredClone(content));for(const screen of ['stations','equipment']){await c.library(screen);const s=c.snapshot();assert.equal(s.phase,'ready');assert.deepEqual(s.catalogs,[]);assert.match(renderApp(s),/No station or equipment reference in this content version/);assert.match(renderApp(s),/No people, tools or stock are invented/);}
});
test('schema 1.2 accepts one or more recipes and uses stable refs after collection reorder',async()=>{
 const payload=stationContent();payload.stations.reverse();payload.people.reverse();payload.equipment.reverse();payload.recipes=payload.recipes.slice(0,1);
 const {c}=await setup(payload);await c.library('recipe',key(payload.recipes[0].id));assert.equal(c.snapshot().phase,'ready');const html=renderApp(c.snapshot());assert.ok(html.includes(payload.stations.find(x=>x.id===payload.recipes[0].stationId).label));
});
test('duplicate assignments deduplicate the catalog and scope links to the newest assignment',async()=>{
 const {c,api}=await setup();api.records.push({assignment:assignment('assignment_2'),session:null,responses:[]});await c.library('stations');const s=c.snapshot();assert.equal(s.catalogs.length,1);assert.equal(s.catalogs[0].key,'assignment_2');assert.equal(api.calls.filter(x=>x.op==='ReadAssignedContentVersion').length,1);assert.match(renderApp(s),/data-id="assignment_2:station-/);
});
test('dangling, duplicate or invalid catalog graph values fail closed without rendering stale content',async()=>{
 const changes=[x=>{x.stations[0].responsiblePersonId='missing';},x=>{x.recipes[0].stationId='missing';},x=>{x.recipes[0].requirements[0].equipmentId='missing';},x=>{x.inventory[0].equipmentId='missing';},x=>{x.inventory[0].stationId='missing';},x=>{x.stations.push(x.stations[0]);},x=>{x.people.push(x.people[0]);},x=>{x.equipment.push(x.equipment[0]);},x=>{x.inventory.push(x.inventory[0]);},x=>{x.recipes[0].requirements.push(x.recipes[0].requirements[0]);},x=>{x.inventory[0].quantity=101;},x=>{x.recipes[0].requirements=[];}];
 for(const change of changes){const payload=stationContent();change(payload);const {c}=await setup(payload);await c.library('stations');const s=c.snapshot();assert.equal(s.phase,'error');assert.equal(s.error.kind,'protocol');assert.deepEqual(s.catalogs,[]);assert.deepEqual(s.library,[]);}
});
test('foreign scoped detail keys are not substituted with similarly named station/equipment',async()=>{
 for(const [screen,id] of [['station','station-fry'],['equipment','tool-tongs']]){const {c}=await setup();await c.library(screen,'other_assignment:'+id);assert.equal(c.snapshot().error.status,404);assert.deepEqual(c.snapshot().catalogs,[]);}
});
test('manager cannot fetch catalog data under new navigation labels',async()=>{
 for(const screen of ['stations','station','equipment']){const {c,api}=await setup();api.current=session('MANAGER');await c.recover();api.calls.length=0;assert.doesNotMatch(renderApp(c.snapshot()),/data-action="(?:stations|station|equipment)"/);await c.library(screen,key('station-fry'));assert.equal(c.snapshot().phase,'forbidden');assert.deepEqual(c.snapshot().catalogs,[]);assert.ok(api.calls.every(x=>!['ReadAssignedContentVersion','ListOwnAssignments'].includes(x.op)));}
});
test('persona change and logout discard all catalog references and selections',async()=>{
 for(const action of ['switchPersona','logout']){const {c,payload}=await setup();await c.library('station',key(payload.stations[0].id));if(action==='switchPersona')await c.switchPersona('MANAGER');else await c.logout();const s=c.snapshot();assert.deepEqual(s.catalogs,[]);assert.deepEqual(s.library,[]);assert.equal(s.stationKey,null);assert.equal(s.equipmentKey,null);}
});
test('an expired or failed content read never leaves a previously rendered catalog visible',async()=>{
 for(const error of [new ApiError('server',{status:401,code:'UNAUTHENTICATED'}),new ApiError('network')]){const {c,api}=await setup();await c.library('stations');api.override=op=>{if(op==='ReadAssignedContentVersion')throw error;};await c.refresh();const s=c.snapshot();assert.notEqual(s.phase,'ready');assert.deepEqual(s.catalogs,[]);assert.doesNotMatch(renderApp(s),/data-station-id=/);}
});
test('untrusted labels are escaped by all catalog renderers as defense in depth',async()=>{
 const {c,payload}=await setup();await c.library('stations');const s=c.snapshot();s.catalogs[0].people[0].displayLabel='<img src=x onerror=alert(1)>';s.catalogs[0].stations[0].label='<script>bad</script>';const html=renderApp(s);assert.doesNotMatch(html,/<img|<script>/);assert.match(html,/&lt;img/);assert.match(html,/&lt;script/);
});
// Minimal DOM event stub verifies dispatch and focus intent, not actual keyboard/viewport behavior.
async function eventHarness(){
 const api=mockService();api.current=session();api.override=op=>op==='ReadAssignedContentVersion'?stationContent():undefined;
 const elements=new Map(),listeners=new Map();const element=id=>{if(!elements.has(id))elements.set(id,{id,focusCount:0,focus(){this.focusCount++;},addEventListener(){},setAttribute(){}});return elements.get(id);};
 const root=element('app');root.innerHTML='';root.addEventListener=(kind,fn)=>listeners.set(kind,fn);const document={getElementById:element,querySelector:x=>element(x.replace(/^#/,'')),documentElement:{dataset:{theme:'dark'}}};let controller,pending;
 const make=opts=>{controller=createDemoController({...opts,makeKey:()=> 'event-station-key'});return Object.fromEntries(Object.entries(controller).map(([name,fn])=>[name,(...args)=>{const value=fn(...args);if(value?.then)pending=value;return value;} ]));};
 const source=(await readFile(new URL('../../src/web/demo/app.mjs',import.meta.url),'utf8')).replace(/^import .*;\n/gm,'');runInNewContext(source,{document,window:{addEventListener(){}},renderApp,createDemoController:make,createDemoApi:()=>api});await pending;
 return {api,root,element,controller,click:async(action,id)=>{listeners.get('click')({target:{closest:()=>({dataset:{action,id},disabled:false})}});await pending;}};
}
test('app station/equipment clicks dispatch to the right scoped screens and focus headings',async()=>{
 const app=await eventHarness(),before=structuredClone(app.api.records);await app.click('stations');assert.equal(app.controller.snapshot().screen,'stations');await app.click('station',key('station-fry'));assert.equal(app.controller.snapshot().stationKey,key('station-fry'));await app.click('equipment',key('tool-tongs'));assert.equal(app.controller.snapshot().equipmentKey,key('tool-tongs'));await app.click('equipment');assert.equal(app.controller.snapshot().equipmentKey,null);assert.ok(app.element('page-title').focusCount>=4);readOnly(app.api,before);
});

test('late catalog reads cannot restore protected references after logout or newer navigation',async()=>{
 for(const action of ['logout','dashboard']){
  const {c,api,payload}=await setup();let release,started;const waiting=new Promise(resolve=>{release=resolve;}),observed=new Promise(resolve=>{started=resolve;});
  api.override=op=>{if(op==='ReadAssignedContentVersion'){started();return waiting;}};
  const oldRead=c.library('stations');await observed;await c[action]();release(payload);await oldRead;
  const s=c.snapshot();assert.deepEqual(s.catalogs,[]);assert.deepEqual(s.library,[]);assert.notEqual(s.screen,'stations');assert.equal(s.stationKey,null);
 }
});
test('reused content-local IDs in different immutable versions never cross-link people or holdings',async()=>{
 const {c,api,payload}=await setup();const second=assignment('assignment_2');second.contentVersion={...second.contentVersion,version:'2.0.0',digest:'sha256:'+'b'.repeat(64)};api.records.push({assignment:second,session:null,responses:[]});
 const later=structuredClone(payload);later.contentVersion=second.contentVersion;later.people[0].displayLabel='Different version cook';later.inventory[0].quantity=7;
 api.override=op=>undefined;const baseCall=api.call.bind(api);api.call=async(op,options)=>{
  if(op==='ReadAssignedContentVersion')return structuredClone(options.params.contentVersion==='2.0.0'?later:payload);
  const value=await baseCall(op,options);if(op==='ReadOwnLearnerState')value.items.find(x=>x.assignmentId==='assignment_2').contentVersion=second.contentVersion;return value;
 };
 await c.library('station','assignment_1:'+payload.stations[0].id);let s=c.snapshot();assert.equal(s.phase,'ready');assert.equal(s.catalogs.length,2);assert.doesNotMatch(renderApp(s),/Different version cook/);
 await c.library('station','assignment_2:'+payload.stations[0].id);assert.match(renderApp(c.snapshot()),/Different version cook/);
 await c.library('equipment','assignment_1:'+payload.inventory[0].equipmentId);assert.match(renderApp(c.snapshot()),/1 in the fictional inventory/);
 await c.library('equipment','assignment_2:'+payload.inventory[0].equipmentId);assert.match(renderApp(c.snapshot()),/7 in the fictional inventory/);
});
