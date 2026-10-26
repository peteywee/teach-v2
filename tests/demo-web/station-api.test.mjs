/** Wire validation only; these tests do not claim a live browser or SQL migration. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createDemoApi,ApiError,conforms,operations} from '../../src/web/demo/api.mjs';
import {definitions,recipeDefinitions,kitchenDefinitions} from '../../src/web/demo/wire-contract.mjs';
import {content,scope,version} from './fixtures.mjs';
import {stationContent} from './station-fixtures.mjs';
const readJson=async path=>JSON.parse(await readFile(new URL(path,import.meta.url),'utf8'));
async function read(payload){
 const calls=[];
 const api=createDemoApi({fetchImpl:async(...args)=>{calls.push(args);return new Response(JSON.stringify(payload),{status:200,headers:{'Content-Type':'application/json'}});}});
 const result=await api.call('ReadAssignedContentVersion',{params:{...scope,contentPackId:'pack_1',contentVersion:version.version}});
 return {result,calls};
}
const rejects=async mutate=>{const payload=stationContent();mutate(payload);await assert.rejects(read(payload),x=>x instanceof ApiError&&x.kind==='protocol');};
test('kitchen wire definitions are exact immutable package copies and legacy definitions remain exact',async()=>{
 const [pub,canonical,old,recipe]=await Promise.all([
  readJson('../../domains/demo-kitchen/proposal-0.1.0/public-content-schema-1.2.0.json'),
  readJson('../../domains/demo-kitchen/proposal-0.1.0/content-schema-1.2.0.json'),
  readJson('../../domains/demo-runtime/proposal-0.1.0/transport-schemas.json'),
  readJson('../../domains/demo-recipes/proposal-0.1.1/public-content-schema-1.1.0.json'),
 ]);
 const {TeachingBlock,...values}=canonical.$defs;
 assert.deepEqual(kitchenDefinitions,{...pub.$defs,...values});
 assert.deepEqual(definitions,old.$defs);assert.deepEqual(recipeDefinitions.PublicContent,recipe.$defs.PublicContent);
 assert.deepEqual(kitchenDefinitions.PublicBlock,definitions.PublicBlock);
 assert.deepEqual(kitchenDefinitions.ContentVersion,definitions.ContentVersion);
});
test('1.2 public catalog uses the unchanged assigned-content GET without new operations',async()=>{
 const payload=stationContent(),{result,calls}=await read(payload);assert.deepEqual(result,payload);
 assert.equal(calls.length,1);assert.equal(calls[0][0],'/api/v1/organizations/org_1/locations/loc_1/content/pack_1/versions/1.0.0');
 const options=calls[0][1];assert.equal(options.method,'GET');assert.equal(options.credentials,'same-origin');assert.equal(options.cache,'no-store');assert.equal(options.redirect,'error');assert.equal(options.body,undefined);
 assert.equal(operations.length,15);assert.equal(operations.some(x=>/station|equipment|inventory/i.test(x)),false);
 assert.deepEqual((await read(content)).result,content);
 assert.equal(conforms(payload,definitions.PublicContent),false);assert.equal(conforms(payload,recipeDefinitions.PublicContent),false);
});
test('every kitchen collection is required, bounded, and strictly typed',async()=>{
 for(const [key,max] of [['stations',12],['people',24],['equipment',40],['inventory',80],['recipes',24]]){
  for(const value of [undefined,null,{},[],[null]])await rejects(x=>{if(value===undefined)delete x[key];else x[key]=value;});
  await rejects(x=>{x[key]=Array.from({length:max+1},()=>x[key][0]);});
 }
});
test('all kitchen values reject missing required or undeclared properties',async()=>{
 for(const collection of ['stations','people','equipment','inventory','recipes']){
  const sample=stationContent()[collection][0];
  for(const key of Object.keys(sample))await rejects(x=>{delete x[collection][0][key];});
  await rejects(x=>{x[collection][0].undeclared='extra';});
 }
 await rejects(x=>{x.extra=true;});
 await rejects(x=>{x.recipes[0].requirements[0].extra=true;});
 await rejects(x=>{delete x.recipes[0].requirements[0].quantity;});
});
test('recipe requirements and holdings use strict bounded quantities, never string coercion',async()=>{
 for(const quantity of [0,-1,1.5,101,'1',true,null]){
  await rejects(x=>{x.inventory[0].quantity=quantity;});
  await rejects(x=>{x.recipes[0].requirements[0].quantity=quantity;});
 }
 for(const requirements of [[],null,{},[{}]])await rejects(x=>{x.recipes[0].requirements=requirements;});
 await rejects(x=>{x.recipes[0].requirements=Array(21).fill(x.recipes[0].requirements[0]);});
 await rejects(x=>{x.equipment[0].kind='SUPPLY';});
 await rejects(x=>{x.inventory[0].stationId=false;});
});
test('all new labels remain bounded plain text, with no script, markup or external URLs',async()=>{
 for(const [collection,key] of [['stations','label'],['people','displayLabel'],['people','roleLabel'],['equipment','label']]){
  for(const value of ['',42,'<script>alert(1)</script>','https://example.test','bad\u0000','lone\uD800','a'.repeat(161)])await rejects(x=>{x[collection][0][key]=value;});
 }
});
test('catalog schema is version-bound and cannot reveal hidden answers or auth identities',async()=>{
 for(const schemaVersion of ['1.0.0','1.1.0','1.2.1','2.0.0',null])await rejects(x=>{x.schemaVersion=schemaVersion;});
 for(const collection of ['stations','people','equipment','recipes'])for(const key of ['identityId','expectedOptionIndex','feedback','answerKey'])await rejects(x=>{x[collection][0][key]='hidden';});
 await rejects(x=>{x.blocks[0].expectedOptionIndex=0;});
 const clean=(await read(stationContent())).result;assert.ok(clean.blocks.every(x=>!Object.hasOwn(x,'expectedOptionIndex')));
});
test('kitchen shape permits a bounded extension without fixed three-recipe UI assumptions',async()=>{
 const payload=stationContent();payload.recipes=payload.recipes.slice(0,1);assert.deepEqual((await read(payload)).result,payload);
});
