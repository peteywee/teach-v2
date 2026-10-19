import {readFileSync,existsSync} from 'node:fs';
import {dirname,resolve,relative} from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {HOSTED_WEB_ASSETS} from './build-demo-hosted.mjs';
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
/** Source closure proof only. Not a deployable build, approval, or activation manifest. */
export function inspectSuccessorClosure(root){
 const files={},packages=new Set(),pending=[
 'src/bootstrap/demo-successor/accepting-entrypoint.ts','src/bootstrap/demo-successor/runtime.ts','src/bootstrap/demo-successor/runtime-config.ts','src/bootstrap/demo-successor/entrypoint.ts','src/bootstrap/demo-successor/composition.ts','src/bootstrap/demo-successor/transaction.ts',
 'src/bootstrap/demo-successor/pool.ts','src/bootstrap/demo-successor/binding.ts',
 'src/bootstrap/demo/application.ts','src/bootstrap/demo-hosted/transport.ts',
 ];
 while(pending.length){const path=pending.pop();if(files[path])continue;
 const source=readFileSync(resolve(root,path));files[path]=hash(source);
 const text=path==='src/bootstrap/demo-successor/accepting-entrypoint.ts'?source.toString().replace("import('./runtime.js')","undefined"):source.toString();if(/\bimport\s*\(/.test(text)||/\brequire\s*\(/.test(text))throw Error('Dynamic import outside closure');
 for(const match of text.matchAll(/(?:from\s*|import\s*)['"]([^'"]+)['"]/g)){
 const spec=match[1];if(spec.startsWith('node:'))continue;
 if(!spec.startsWith('.')){const name=spec.startsWith('@')?spec.split('/').slice(0,2).join('/'):spec.split('/')[0];if(!['pg','drizzle-orm'].includes(name))throw Error('Unreviewed package '+name);packages.add(name);continue;}
 let target=relative(root,resolve(root,dirname(path),spec));
 if(target.endsWith('.js'))target=target.slice(0,-3)+'.ts';
 if(!target.startsWith('src/')||!existsSync(resolve(root,target)))throw Error('Missing closure '+target);
 pending.push(target);
 }
 }
 const assets=JSON.parse(readFileSync(resolve(root,'src/web/demo/assets.json')));
 if(JSON.stringify(assets)!==JSON.stringify(HOSTED_WEB_ASSETS)||assets.length!==7)throw Error('Asset closure drift');
 for(const asset of assets){const path='src/web/demo/'+asset.file;files[path]=hash(readFileSync(resolve(root,path)));}
 for(const path of ['governance/automation-principals.json','domains/demo-runtime/proposal-0.1.0/baseline-error-envelope.schema.json','src/web/demo/assets.json','tsconfig.json','tsconfig.successor.json','scripts/packaging/build-successor-accepting.mjs','scripts/packaging/build-successor-local.mjs','scripts/packaging/inspect-successor-closure.mjs','scripts/packaging/build-demo-hosted.mjs','pnpm-lock.yaml','package.json','domains/demo-runtime/proposal-0.1.0/transport-and-queries.json'])files[path]=hash(readFileSync(resolve(root,path)));
 const routes=JSON.parse(readFileSync(resolve(root,'domains/demo-runtime/proposal-0.1.0/transport-and-queries.json'))).routes;
 if(routes.length!==15||new Set(routes.map(r=>r.operation)).size!==15)throw Error('Route closure drift');
 const sorted=Object.fromEntries(Object.entries(files).sort(([a],[b])=>a.localeCompare(b)));
 const pkg=JSON.parse(readFileSync(resolve(root,'package.json')));
 return {kind:'SUCCESSOR_SOURCE_CLOSURE',execution:'DISABLED',deployable:false,nodePatch:process.versions.node,
 files:sorted,closureDigest:hash(JSON.stringify(sorted)),packages:Object.fromEntries([...packages].sort().map(p=>[p,pkg.dependencies[p]])),routes,assets};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))console.log(JSON.stringify(inspectSuccessorClosure(resolve(process.argv[2]??'.')),null,2));
