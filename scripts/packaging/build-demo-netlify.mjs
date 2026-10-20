import {buildSuccessorLocal,bundleInventory} from './build-successor-local.mjs';
import {execFileSync} from 'node:child_process';
import {mkdirSync,readFileSync,writeFileSync,mkdtempSync,rmSync,realpathSync,existsSync} from 'node:fs';
import {resolve,join,dirname,sep} from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
const ownSources=['src/bootstrap/demo-netlify/entrypoint.ts','src/bootstrap/demo-netlify/fetch-adapter.ts'];
/** A locally testable, disabled preparation directory. Not a provider-verified ZIP
 * or deployment authorization. Existing Vercel builders and runtime are untouched. */
export function buildDemoNetlify(root,output){
 root=realpathSync(root);output=resolve(output);
 if(output===root||output.startsWith(root+sep)||existsSync(output)||realpathSync(dirname(output))!==dirname(output))throw Error('New external output required');
 const git=args=>execFileSync('git',['--no-optional-locks',...args],{cwd:root,timeout:5000,env:{...process.env,GIT_NO_REPLACE_OBJECTS:'1'}}).toString().trim();
 if(git(['status','--porcelain','--untracked-files=all']))throw Error('Clean source required');
 const sourceCommit=git(['rev-parse','HEAD']),sourceTree=git(['rev-parse','HEAD^{tree}']);
 const snapshot=ownSources.concat(['tsconfig.netlify.json','scripts/packaging/build-demo-netlify.mjs']);
 const before=snapshot.map(p=>readFileSync(join(root,p)));
 if(!before[3].equals(readFileSync(fileURLToPath(import.meta.url))))throw Error('Builder identity mismatch');
 const scratch=mkdtempSync(join(tmpdir(),'teach-netlify-'));
 try{
  mkdirSync(output);mkdirSync(join(output,'private'));mkdirSync(join(output,'functions'));mkdirSync(join(output,'public'));
  const runtime=join(output,'private/runtime'),base=buildSuccessorLocal(root,runtime);
  execFileSync(process.execPath,[join(root,'node_modules/typescript/bin/tsc'),'--project','tsconfig.netlify.json','--outDir',scratch],{cwd:root,timeout:25000,maxBuffer:4*1024*1024});
  mkdirSync(join(runtime,'src/bootstrap/demo-netlify'));
  for(const p of ownSources){const js=p.replace(/\.ts$/,'.js');writeFileSync(join(runtime,js),readFileSync(join(scratch,js)),{flag:'wx'});}
  if(snapshot.some((p,i)=>!before[i].equals(readFileSync(join(root,p))))||git(['status','--porcelain','--untracked-files=all'])||git(['rev-parse','HEAD'])!==sourceCommit)throw Error('Source changed during build');
  // Provider bundling must preserve the module-relative filesystem closure.
  writeFileSync(join(output,'functions/demo.mjs'),`import handler from '../private/runtime/src/bootstrap/demo-netlify/entrypoint.js';\nexport default handler;\nexport const config = {path:'/*',preferStatic:false,nodeBundler:'none',nodeVersion:'24',includedFiles:['private/runtime/**']};\n`);
  writeFileSync(join(output,'netlify.toml'),'[build]\npublish = "public"\n[functions]\ndirectory = "functions"\n');
  const manifest={kind:'NETLIFY_LOCAL_DISABLED_PREPARATION',execution:'DISABLED',deploymentAuthorized:false,providerVerified:false,rawIngressVerified:false,sourceCommit,sourceTree,nodePatch:process.versions.node,packages:base.packages,closureDigest:base.closure.closureDigest,files:bundleInventory(output)};
  writeFileSync(join(output,'netlify-preparation-manifest.json'),JSON.stringify(manifest,null,2)+'\n');return manifest;
 }finally{rmSync(scratch,{recursive:true,force:true});}
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))console.log(JSON.stringify(buildDemoNetlify(process.argv[2]??'.',process.argv[3])));
