/** Wire-codec unit tests for the bounded recipe successor; no live server/browser claim. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {ApiError,conforms,createDemoApi,operations} from '../../src/web/demo/api.mjs';
import {definitions,errorContract,recipeDefinitions} from '../../src/web/demo/wire-contract.mjs';
import {assignment,content,date,member,membership,scope,session,version} from './fixtures.mjs';

const readJson=async path=>JSON.parse(await readFile(new URL(path,import.meta.url),'utf8'));
const publicRecipeContent=()=>({...structuredClone(content),schemaVersion:'1.1.0',recipes:[
 {id:'recipe_bowl',title:'Fictional sample: Orchard bowl',station:'Assembly',servings:1,ingredients:['Prepared grains','Diced apple'],steps:['Arrange the sample ingredients.','Check the sample ticket.'],reference:'General handoff practice'},
 {id:'recipe_wrap',title:'Fictional sample: Garden wrap',station:'Assembly',servings:1,ingredients:['Flatbread','Bean spread'],steps:['Fill the sample wrap.','Read back the sample change.'],reference:'General handoff practice'},
 {id:'recipe_cooler',title:'Fictional sample: Citrus cooler',station:'Beverage',servings:2,ingredients:['Sparkling water','Orange juice'],steps:['Mix the sample drink.','Pass on unresolved ticket questions.'],reference:'General handoff practice'},
]});
const params={...scope,contentPackId:'pack_1',contentVersion:version.version};
const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json'}});
async function readContent(body){
 const requests=[];
 const api=createDemoApi({fetchImpl:async(...args)=>{requests.push(args);return json(body);}});
 const result=await api.call('ReadAssignedContentVersion',{params});
 return {result,requests};
}
async function rejectsContent(payload,label){
 await assert.rejects(readContent(payload),error=>error instanceof ApiError&&error.kind==='protocol',label);
}
const changedRecipe=mutate=>{const value=publicRecipeContent();mutate(value.recipes[0]);return value;};

test('recipe wire schemas are exact package copies while original exported definitions stay unchanged',async()=>{
 const [original,publicSource,canonicalSource,originalError]=await Promise.all([
  readJson('../../domains/demo-runtime/proposal-0.1.0/transport-schemas.json'),
  readJson('../../domains/demo-recipes/proposal-0.1.1/public-content-schema-1.1.0.json'),
  readJson('../../domains/demo-recipes/proposal-0.1.1/content-schema-1.1.0.json'),
  readJson('../../domains/demo-runtime/proposal-0.1.0/baseline-error-envelope.schema.json'),
 ]);
 assert.deepEqual(definitions,original.$defs);assert.deepEqual(errorContract,originalError);
 assert.deepEqual(recipeDefinitions,{...publicSource.$defs,Recipe:canonicalSource.$defs.Recipe});
 assert.deepEqual(recipeDefinitions.ContentVersion,definitions.ContentVersion);
 assert.deepEqual(recipeDefinitions.PublicBlock,definitions.PublicBlock);
 assert.equal(definitions.PublicContent.properties.schemaVersion.const,'1.0.0');
 assert.equal(Object.hasOwn(definitions,'Recipe'),false);
 assert.equal(Object.hasOwn(definitions.PublicContent.properties,'recipes'),false);
 assert.equal(recipeDefinitions.PublicContent.properties.recipes.items.$ref,'content-schema-1.1.0.json#/$defs/Recipe');
});

test('actual adapter accepts both original 1.0 and recipe 1.1 payloads on the unchanged content route',async()=>{
 for(const payload of [structuredClone(content),publicRecipeContent()]){
  const {result,requests}=await readContent(payload);assert.deepEqual(result,payload);assert.equal(requests.length,1);
  assert.equal(requests[0][0],'/api/v1/organizations/org_1/locations/loc_1/content/pack_1/versions/1.0.0');
  const options=requests[0][1];assert.equal(options.method,'GET');assert.equal(options.credentials,'same-origin');
  assert.equal(options.cache,'no-store');assert.equal(options.redirect,'error');
  assert.equal(Object.hasOwn(options,'body'),false);assert.equal(options.headers.Authorization,undefined);
 }
 assert.equal(conforms(publicRecipeContent(),definitions.PublicContent),false,'original schema is not silently widened');
 assert.equal(conforms(content,recipeDefinitions.PublicContent),false,'successor schema does not replace original identity');
});

test('recipe nested external and local refs resolve and reject invalid nested values',async()=>{
 const payload=publicRecipeContent();
 assert.equal(conforms(payload,recipeDefinitions.PublicContent),true);
 assert.equal(conforms(payload.recipes[0],recipeDefinitions.Recipe),true);
 for(const mutate of [
  value=>{value.recipes[0].servings='2';},
  value=>{value.blocks[0].options=[true,false];},
  value=>{value.contentVersion.digest='not-a-digest';},
 ]){
  const invalid=publicRecipeContent();mutate(invalid);
  assert.equal(conforms(invalid,recipeDefinitions.PublicContent),false);
  await rejectsContent(invalid,'nested reference must not bypass validation');
 }
});

test('recipe adapter rejects missing, malformed or out-of-bounds recipe collections',async()=>{
 const normal=publicRecipeContent();
 for(const recipes of [undefined,null,{},'recipes',[],normal.recipes.slice(0,2),[...normal.recipes,normal.recipes[0]]]){
  const payload=publicRecipeContent();if(recipes===undefined)delete payload.recipes;else payload.recipes=recipes;
  await rejectsContent(payload,`recipes ${JSON.stringify(recipes)}`);
 }
 for(const recipe of [null,[],17,'sample']){
  const payload=publicRecipeContent();payload.recipes[0]=recipe;await rejectsContent(payload,'recipe item type');
 }
});

test('recipe adapter requires all declared fields and rejects undeclared recipe properties',async()=>{
 for(const field of ['id','title','station','servings','ingredients','steps','reference']){
  await rejectsContent(changedRecipe(recipe=>{delete recipe[field];}),`missing ${field}`);
 }
 for(const field of ['imageUrl','video','instructions','evaluation','secret']){
  await rejectsContent(changedRecipe(recipe=>{recipe[field]='undeclared';}),`extra ${field}`);
 }
});

test('recipe adapter validates identifiers, servings and collection cardinality without coercion',async()=>{
 for(const id of ['',null,7,'contains space','recipe\n','a'.repeat(129)])await rejectsContent(changedRecipe(recipe=>{recipe.id=id;}),'recipe ID');
 for(const servings of [null,true,'2',0,-1,1.5,101])await rejectsContent(changedRecipe(recipe=>{recipe.servings=servings;}),'servings');
 for(const [field,limit] of [['ingredients',30],['steps',20]]){
  for(const value of [null,'not a list',[],[false],[''],Array(limit+1).fill('Sample text')]){
   await rejectsContent(changedRecipe(recipe=>{recipe[field]=value;}),`${field} cardinality/item type`);
  }
 }
});

test('recipe adapter applies declared plain-text exclusions to all recipe text fields',async()=>{
 const invalid=['<b>sample</b>','https://example.test/sample','javascript:alert(1)','data:text/plain,sample','www.example.test','//example.test/path','bad\u0000control','bad\u007fcontrol','lone\uD800surrogate','lone\uDC00surrogate'];
 for(const field of ['title','station','reference','ingredients','steps']){
  for(const value of invalid){
   await rejectsContent(changedRecipe(recipe=>{recipe[field]=['ingredients','steps'].includes(field)?[value]:value;}),`${field} rejects ${JSON.stringify(value)}`);
  }
 }
});

test('recipe text limits use Unicode scalar lengths and allow bounded ordinary plain text',async()=>{
 for(const [field,max] of [['title',160],['station',80],['reference',1000],['ingredients',500],['steps',2000]]){
  const put=(recipe,value)=>{recipe[field]=['ingredients','steps'].includes(field)?[value]:value;};
  const valid=changedRecipe(recipe=>put(recipe,'🥣'.repeat(max)));assert.deepEqual((await readContent(valid)).result,valid);
  for(const value of ['',false,42,'a'.repeat(max+1),'🥣'.repeat(max+1)]){
   await rejectsContent(changedRecipe(recipe=>put(recipe,value)),`${field} length/type`);
  }
 }
 const ordinary=changedRecipe(recipe=>{recipe.steps=['Café sample\nKeep the ticket\tand read it back.'];});
 assert.deepEqual((await readContent(ordinary)).result,ordinary);
});

test('recipe adapter rejects unknown schema versions and mismatched original/successor shapes',async()=>{
 for(const schemaVersion of [undefined,null,1.1,'1.0.0','1.1.1','2.0.0','1.1.0\n']){
  const payload=publicRecipeContent();if(schemaVersion===undefined)delete payload.schemaVersion;else payload.schemaVersion=schemaVersion;
  await rejectsContent(payload,`schemaVersion ${schemaVersion}`);
 }
 await rejectsContent({...structuredClone(content),schemaVersion:'1.1.0'},'new version requires recipes');
 for(const change of [{extra:true},{synthetic:false},{title:''},{blocks:[]}])await rejectsContent({...publicRecipeContent(),...change},'public content shape');
});

test('recipe content keeps strict immutable SemVer and digest validation through nested references',async()=>{
 for(const value of ['01.0.0','1.0','1.0.0-01','v1.0.0','1.0.0+'+'a'.repeat(33)]){
  const payload=publicRecipeContent();payload.contentVersion.version=value;await rejectsContent(payload,`version ${value}`);
 }
 for(const digest of ['',null,'SHA256:'+'a'.repeat(64),'sha256:'+'g'.repeat(64),'sha256:'+'a'.repeat(63)]){
  const payload=publicRecipeContent();payload.contentVersion.digest=digest;await rejectsContent(payload,'digest');
 }
 const valid=publicRecipeContent();valid.contentVersion.version='1.1.0-rc.1+build.2';assert.deepEqual((await readContent(valid)).result,valid);
});

test('public recipe content cannot expose hidden expected answers or feedback',async()=>{
 const clean=(await readContent(publicRecipeContent())).result;
 assert.ok(clean.blocks.every(block=>!Object.hasOwn(block,'expectedOptionIndex')&&!Object.hasOwn(block,'feedback')));
 for(const field of ['expectedOptionIndex','feedback','answerKey','evaluation']){
  for(const target of ['content','block','recipe']){
   const payload=publicRecipeContent();const record=target==='content'?payload:target==='block'?payload.blocks[0]:payload.recipes[0];
   record[field]=field==='expectedOptionIndex'?0:'hidden grading material';
   await rejectsContent(payload,`${target} ${field} leakage`);
  }
 }
});

test('recipe successor preserves the same fifteen operations, methods and paths',async()=>{
 const source=await readJson('../../domains/demo-runtime/proposal-0.1.0/transport-and-queries.json');
 assert.equal(operations.length,15);assert.deepEqual([...operations].sort(),source.routes.map(route=>route.operation).sort());
 const learningSession={id:'session_1',identityId:'learner_1',assignmentId:'assignment_1',status:'ACTIVE',startedAt:date,completedAt:null};
 const responses={
  CurrentSession:session(),Memberships:{items:[membership],nextCursor:null},Team:{items:[member],nextCursor:null},
  TeamStates:{items:[],nextCursor:null},Assignments:{items:[],nextCursor:null},OwnStates:{items:[],nextCursor:null},
  PublicContent:publicRecipeContent(),Assignment:assignment(),Session:learningSession,
  ProgressEvent:{id:'event_1',learningSessionId:'session_1',contentPackId:'pack_1',contentVersion:version,eventSchemaVersion:'1.0.0',sequence:1,evaluation:{engineVersion:'1.0.0',blockId:'block_0',selectedOptionIndex:0,matchesExpectedChoice:true,feedback:'Confirm the next step.'},recordedAt:date},
 };
 const routeParams={...params,identityId:'learner_1',learningSessionId:'session_1'};
 for(const route of source.routes){
  let request;const response=route.response_schema?responses[route.response_schema.split('/').at(-1)]:null;
  assert.notEqual(response,undefined,route.operation+' fixture');
  const api=createDemoApi({fetchImpl:async(...args)=>{request=args;return route.success_status===204?new Response(null,{status:204}):json(response,route.success_status);}});
  assert.deepEqual(await api.call(route.operation,{params:routeParams,body:{}}),response);
  const path=route.path.replace(/\{([^}]+)\}/g,(_,field)=>encodeURIComponent(routeParams[field]));
  assert.equal(request[0],path,route.operation);assert.equal(request[1].method,route.method,route.operation);
 }
});

test('recipe support invents no recipe-only API operations or external schema fetches',async()=>{
 let requests=0;const api=createDemoApi({fetchImpl:async()=>{requests++;return json(publicRecipeContent());}});
 for(const operation of ['ListRecipes','ReadRecipe','StartRecipe','CompleteRecipe']){
  await assert.rejects(api.call(operation),error=>error instanceof ApiError&&error.kind==='protocol');
 }
 assert.equal(requests,0);
 const {requests:contentRequests}=await readContent(publicRecipeContent());assert.equal(contentRequests.length,1);
 assert.match(contentRequests[0][0],/^\/api\/v1\//);assert.doesNotMatch(contentRequests[0][0],/schemas|recipes/);
});
