import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import type { DemoOperation } from '../../src/bootstrap/demo/application-port.js';

const schemas=JSON.parse(readFileSync(new URL('../../domains/demo-runtime/proposal-0.1.0/transport-schemas.json',import.meta.url),'utf8')).$defs;
const recipeSchemas=JSON.parse(readFileSync(new URL('../../domains/demo-recipes/proposal-0.1.1/public-content-schema-1.1.0.json',import.meta.url),'utf8')).$defs;
const recipe=JSON.parse(readFileSync(new URL('../../domains/demo-recipes/proposal-0.1.1/content-schema-1.1.0.json',import.meta.url),'utf8')).$defs.Recipe;
schemas.Recipe=recipe;schemas.PublicContent={anyOf:[schemas.PublicContent,recipeSchemas.PublicContent]};
const names: Partial<Record<DemoOperation,string>>={ReadCurrentSession:'CurrentSession',ListOwnMemberships:'Memberships',ListTeam:'Team',ReadTeamMemberLearnerState:'TeamStates',AssignContent:'Assignment',ListOwnAssignments:'Assignments',ReadAssignedContentVersion:'PublicContent',StartLearningSession:'Session',RecordProgressEvent:'ProgressEvent',CompleteLearningSession:'Session',ReadOwnLearnerState:'OwnStates',BeginDemoRun:'CurrentSession',SwitchDemoPersona:'CurrentSession'};
export function assertOperationResponse(operation:DemoOperation,value:unknown):void{
  const name=names[operation];if(name)validate(schemas[name],value,'/'+name);else assert.equal(value,undefined);
}
function validate(schema:any,value:any,path:string):void{
  if(schema.$ref){validate(schemas[schema.$ref.split('/').at(-1)],value,path);return;}
  if(schema.anyOf){assert.ok(schema.anyOf.some((s:any)=>{try{validate(s,value,path);return true;}catch{return false;}}),path+' must match one exact variant');return;}
  if(schema.const!==undefined)assert.deepEqual(value,schema.const,path);
  if(schema.enum)assert.ok(schema.enum.includes(value),path+' enum');
  if(schema.type==='object'){
    assert.ok(value!==null&&typeof value==='object'&&!Array.isArray(value)&&!(value instanceof Date),path+' object');
    if(schema.additionalProperties===false)for(const key of Object.keys(value))assert.ok(key in schema.properties,path+'/'+key+' undeclared');
    for(const key of schema.required??[])assert.ok(Object.hasOwn(value,key),path+'/'+key+' required');
    for(const [key,entry] of Object.entries(schema.properties??{}))if(Object.hasOwn(value,key))validate(entry,value[key],path+'/'+key);
  }
  if(schema.type==='array'){assert.ok(Array.isArray(value),path+' array');if(schema.minItems!==undefined)assert.ok(value.length>=schema.minItems,path);if(schema.maxItems!==undefined)assert.ok(value.length<=schema.maxItems,path);value.forEach((v:any,i:number)=>validate(schema.items,v,path+'/'+i));}
  if(schema.type==='string'){assert.equal(typeof value,'string',path);if(schema.minLength!==undefined)assert.ok([...value].length>=schema.minLength,path);if(schema.maxLength!==undefined)assert.ok([...value].length<=schema.maxLength,path);if(schema.pattern)assert.match(value,new RegExp(schema.pattern),path);if(schema.format==='date-time'){assert.ok(Number.isFinite(Date.parse(value)),path);assert.ok(value.endsWith('Z'),path);}}
  if(schema.type==='integer'){assert.ok(Number.isInteger(value),path);if(schema.minimum!==undefined)assert.ok(value>=schema.minimum,path);if(schema.maximum!==undefined)assert.ok(value<=schema.maximum,path);}
  if(schema.type==='boolean')assert.equal(typeof value,'boolean',path);
  if(schema.type==='null')assert.equal(value,null,path);
}
