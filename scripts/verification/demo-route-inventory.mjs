import {createHash} from 'node:crypto';
import {readFileSync,readdirSync,lstatSync} from 'node:fs';
import {join} from 'node:path';
import {isDeepStrictEqual} from 'node:util';
export const DEMO_ROUTE_INVENTORY='verification/demo-runtime/route-source-inventory.json';
const digest=value=>createHash('sha256').update(value).digest('hex');
const read=(root,path)=>readFileSync(join(root,path),'utf8');
function sourceFiles(root){const files=[];function walk(path){for(const entry of readdirSync(join(root,path),{withFileTypes:true})){const child=path+'/'+entry.name;if(entry.isSymbolicLink())throw Error('route inventory forbids source symlinks');if(entry.isDirectory())walk(child);else if(entry.isFile())files.push(child);else throw Error('route inventory requires regular source');}}walk('src');return files.sort();}
function catalog(source){
 const scope=source.match(/const scope='([^']+)';/)?.[1];if(scope!=='/api/v1/organizations/{organizationId}/locations/{locationId}')throw Error('exact approved route scope prefix required');
 const rows=[...source.matchAll(/\{method:'(GET|POST|DELETE)',path:(scope\+)?'([^']+)',operation:'([A-Za-z]+)',status:(\d+)\}/g)].map(([,method,prefix,path,operation,status])=>({method,path:(prefix?scope:'')+path,operation,success_status:Number(status)}));
 if(rows.length!==15||new Set(rows.map(row=>row.operation)).size!==15)throw Error('exact fifteen-route implementation catalog required');return rows;
}
/** Mechanical source inventory only. It cannot issue approval or mount a listener. */
export function buildDemoRouteInventory(root){
 const files=sourceFiles(root);const framework=files.filter(path=>/\/(?:app|pages)\/.*(?:route\.[cm]?[jt]sx?|api\/)|\/(?:routes|routers)\//.test(path));
 const listeners=files.filter(path=>/\b(?:app|router)\.(?:get|post|put|patch|delete|route)\s*\(|\b(?:createServer|serve)\s*\(/.test(read(root,path)));
 return {inventory_id:'TEACH-DEMO-ROUTE-SOURCE-2026-10-17',version:'1.0.0',scope:'Exact registered demo source only; listener activation and browser/runtime proof are separate gates',package_sha256sums:digest(read(root,'domains/demo-runtime/proposal-0.1.0/SHA256SUMS')),registration_sha256:digest(read(root,'domains/demo-runtime/registration.json')),source_file_count:files.length,source_sha256:Object.fromEntries(files.map(path=>[path,digest(read(root,path))])),routes:catalog(read(root,'src/bootstrap/demo/http.ts')),framework_entrypoints:framework,listener_sources:listeners,implemented_http_route_count:15,mounted_by_default:false,runtime_activation:'EXTERNAL_LOCAL_ATTESTATION_REQUIRED',shared_or_production_authorized:false,deployment_inspected:false};
}
export function inspectDemoRouteSource(root){
 const errors=[];try{
  const file=join(root,DEMO_ROUTE_INVENTORY);if(!lstatSync(file).isFile()||lstatSync(file).isSymbolicLink())throw Error('regular route inventory required');
  const actual=JSON.parse(readFileSync(file,'utf8'));const built=buildDemoRouteInventory(root);
  if(!isDeepStrictEqual(actual,built))throw Error('exact current route source inventory or hashes differ');
  const approved=JSON.parse(read(root,'domains/demo-runtime/proposal-0.1.0/transport-and-queries.json')).routes.map(({method,path,operation,success_status})=>({method,path,operation,success_status}));
  if(!isDeepStrictEqual(built.routes,approved))throw Error('implemented catalog differs from exactly fifteen approved routes');
  if(built.framework_entrypoints.length||!isDeepStrictEqual(built.listener_sources,['src/bootstrap/demo/local-server.ts'])||[...read(root,'src/bootstrap/demo/local-server.ts').matchAll(/\bcreateServer\s*\(/g)].length!==1||[...read(root,'src/bootstrap/demo/local-server.ts').matchAll(/\.listen\s*\(/g)].length!==1)throw Error('unapproved route registration or listener source');
  if(built.package_sha256sums!=='a1df23b03a0f0660a072cff00eb40d3d2fb60bc8c521f12b56977f559601196a'||built.registration_sha256!=='b94cf7c7c9bab35ad2454470295ae2b04b8814bd0ac55c282cdd3dd6df67218d')throw Error('exact admitted route authority binding required');
 }catch(error){errors.push('demo route inventory: '+error.message);}return errors;
}

export function inspectDemoRouteInventory(root,registration){
 if(registration?.errors?.length||registration?.registered!==true||registration?.physicalSuccessor?.revisedPaths?.length!==9)return ['demo route inventory: exact semantic registration and independently sealed physical successor required'];
 return inspectDemoRouteSource(root);
}
