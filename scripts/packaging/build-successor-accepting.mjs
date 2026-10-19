import {buildSuccessorLocal,bundleInventory} from './build-successor-local.mjs';
import {mkdirSync,writeFileSync,readFileSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {fileURLToPath} from 'node:url';
/** Explicit opt-in Build Output API artifact. Does not deploy or grant approval. */
export function buildSuccessorAccepting(root,output){
 output=resolve(output);mkdirSync(output);mkdirSync(join(output,'functions'));
 const bundle=join(output,'functions/demo.func');const result=buildSuccessorLocal(root,bundle);
 for(const asset of result.closure.assets){const text=readFileSync(join(bundle,'src/web/demo',asset.file),'utf8');if(/TEACH_DB_PASSWORD|TEACH_DB_CA|postgres(?:ql)?:\/\/|BEGIN (?:RSA |EC |PRIVATE )?PRIVATE KEY|from\s*['"](?:pg|drizzle-orm)/.test(text))throw Error('Server material in browser asset');}
 writeFileSync(join(bundle,'.vc-config.json'),JSON.stringify({runtime:'nodejs24.x',handler:'src/bootstrap/demo-successor/accepting-entrypoint.js',launcherType:'Nodejs',shouldAddHelpers:false}));
 writeFileSync(join(output,'config.json'),JSON.stringify({version:3,routes:[{src:'/(.*)',dest:'/demo'}]}));
 const manifest={...result,kind:'SUCCESSOR_ACCEPTING_ARTIFACT',execution:'CONFIGURED_HANDLER',deploymentAuthorized:false,files:bundleInventory(output)};
 writeFileSync(join(output,'accepting-manifest.json'),JSON.stringify(manifest,null,2)+'\n');return manifest;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))console.log(JSON.stringify({files:Object.keys(buildSuccessorAccepting(process.argv[2]??'.',process.argv[3]).files).length}));
