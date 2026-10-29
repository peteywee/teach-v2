import {createAuthoringPredecessorCopy} from './authoring-proof-copy.mjs';
import assert from 'node:assert/strict';
import {test,before,after} from 'node:test';
import {cpSync,mkdirSync,mkdtempSync,readFileSync,rmSync,writeFileSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {buildDemoRouteInventory,inspectDemoRouteSource,inspectDemoRouteInventory,DEMO_ROUTE_INVENTORY} from '../verification/demo-route-inventory.mjs';
let root,predecessor;
before(()=>{predecessor=createAuthoringPredecessorCopy(resolve(new URL('../..',import.meta.url).pathname));root=predecessor.root;});
after(()=>predecessor?.remove());
function fixture(work){const dir=mkdtempSync(join(tmpdir(),'teach-demo-routes-'));try{for(const path of ['src','domains/demo-runtime'])cpSync(join(root,path),join(dir,path),{recursive:true});mkdirSync(join(dir,'verification/demo-runtime'),{recursive:true});write(dir);work(dir);}finally{rmSync(dir,{recursive:true,force:true});}}
function write(dir){writeFileSync(join(dir,DEMO_ROUTE_INVENTORY),JSON.stringify(buildDemoRouteInventory(dir),null,2)+'\n');}
function edit(dir,path,change){const file=join(dir,path);const before=readFileSync(file,'utf8');const after=change(before);assert.notEqual(before,after);writeFileSync(file,after);}
test('current source catalog equals fifteen approved routes without activation/deployment claims',()=>{
 assert.deepEqual(inspectDemoRouteSource(root),[]);const inventory=buildDemoRouteInventory(root);assert.equal(inventory.routes.length,15);assert.equal(inventory.mounted_by_default,false);assert.equal(inventory.shared_or_production_authorized,false);assert.equal(inventory.deployment_inspected,false);assert.deepEqual(inventory.listener_sources,['src/bootstrap/demo/local-server.ts']);
});
test('source proof cannot replace genuine registered and sealed authority',()=>{
 for(const registration of [null,{}, {registered:true,errors:['review pending']}])assert.match(inspectDemoRouteInventory(root,registration).join('\n'),/independently sealed/);
});
test('unrecorded source additions, changed bytes and missing inventory fail exact coverage',()=>{
 fixture(dir=>{writeFileSync(join(dir,'src/unrecorded.ts'),'export const hidden=true;');assert.match(inspectDemoRouteSource(dir).join('\n'),/inventory or hashes differ/);});
 fixture(dir=>{edit(dir,'src/bootstrap/demo/http.ts',text=>text+'\n');assert.match(inspectDemoRouteSource(dir).join('\n'),/inventory or hashes differ/);});
 fixture(dir=>{rmSync(join(dir,DEMO_ROUTE_INVENTORY));assert.ok(inspectDemoRouteSource(dir).length);});
});
test('regeneration cannot bless unknown routes, changed status, framework endpoints or another listener',()=>{
 for(const change of [text=>text.replace("path:'/api/v1/session'","path:'/api/v1/unapproved'"),text=>text.replace("operation:'ReadCurrentSession',status:200","operation:'ReadCurrentSession',status:201")])fixture(dir=>{edit(dir,'src/bootstrap/demo/http.ts',change);write(dir);assert.match(inspectDemoRouteSource(dir).join('\n'),/exactly fifteen approved/);});
 fixture(dir=>{writeFileSync(join(dir,'src/unapproved.ts'),'createServer(() => {});');write(dir);assert.match(inspectDemoRouteSource(dir).join('\n'),/listener source/);});
 fixture(dir=>{edit(dir,'src/bootstrap/demo/local-server.ts',text=>text+'\ncreateServer(() => {});');write(dir);assert.match(inspectDemoRouteSource(dir).join('\n'),/listener source/);});
 fixture(dir=>{mkdirSync(join(dir,'src/routes'));writeFileSync(join(dir,'src/routes/hidden.ts'),'export const hidden=true;');write(dir);assert.match(inspectDemoRouteSource(dir).join('\n'),/listener source/);});
});
