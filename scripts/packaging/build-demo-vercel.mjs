import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {existsSync,lstatSync,mkdirSync,mkdtempSync,readFileSync,readdirSync,realpathSync,rmSync,writeFileSync} from 'node:fs';
import {dirname,isAbsolute,join,relative,resolve,sep} from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import {HOSTED_WEB_ASSETS} from './build-demo-hosted.mjs';
export const H02_RUNTIME_SOURCES=Object.freeze([
 'src/bootstrap/demo-hosted/composition.ts','src/bootstrap/demo-hosted/configuration.ts','src/bootstrap/demo-hosted/transport.ts',
 'src/bootstrap/demo-hosted/node-adapter.ts','src/bootstrap/demo-hosted/runtime-policy.ts','src/bootstrap/demo-hosted/vercel-entrypoint.ts',
 'src/bootstrap/demo/http.ts','src/modules/authorization/application/demo-error.ts',
 'src/modules/identity/domain/application-session.ts','src/modules/content/domain/demo-content.ts',
]);
const SCHEMA='domains/demo-runtime/proposal-0.1.0/baseline-error-envelope.schema.json';
const BUILDER='scripts/packaging/build-demo-vercel.mjs';
const HOSTED_BUILDER='scripts/packaging/build-demo-hosted.mjs';
const executingBuilder=readFileSync(fileURLToPath(import.meta.url));
const importedInventoryBuilder=readFileSync(new URL('./build-demo-hosted.mjs',import.meta.url));
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const reject=message=>{throw Error('H02 build rejected: '+message);};
function git(root,args){return execFileSync('git',['--no-optional-locks',...args],{cwd:root,timeout:5000,maxBuffer:16*1024*1024,env:{...process.env,GIT_NO_REPLACE_OBJECTS:'1'}}).toString().trim();}
function bytes(root,path,maxBytes=5*1024*1024){const file=join(root,path);const stat=lstatSync(file);if(!stat.isFile()||stat.nlink!==1||realpathSync(file)!==file||stat.size>maxBytes)reject('nonregular/aliased/oversized source '+path);return readFileSync(file);}
function source(root,commit,tree){
 if(!/^[a-f0-9]{40}$/.test(commit)||!/^[a-f0-9]{40}$/.test(tree)||git(root,['rev-parse','HEAD'])!==commit||git(root,['rev-parse','HEAD^{tree}'])!==tree)reject('source identity');
 if(git(root,['status','--porcelain=v1','--untracked-files=all']))reject('dirty source');
 const paths=git(root,['ls-files','-v']).split('\n');if(paths.some(line=>!line.startsWith('H ')))reject('hidden index entries');
 const inventory={};
 const entries=new Map(git(root,['ls-tree','-rz','--full-tree',commit]).split('\0').filter(Boolean).map(row=>{const tab=row.indexOf('\t');return [row.slice(tab+1),row.slice(0,tab)];}));
 for(const line of paths){const path=line.slice(2);const data=bytes(root,path,64*1024*1024);const entry=entries.get(path);if(!/^100(?:644|755) blob [a-f0-9]{40}$/.test(entry??''))reject('nonregular committed source');const expected=entry.slice(-40);const blob=createHash('sha1').update(`blob ${data.length}\0`).update(data).digest('hex');if(blob!==expected)reject('source bytes differ '+path);inventory[path]=hash(data);}
 if(!bytes(root,BUILDER).equals(executingBuilder)||!bytes(root,HOSTED_BUILDER).equals(importedInventoryBuilder))reject('builder identity');
 return inventory;
}
function write(root,path,data){const target=join(root,path);mkdirSync(dirname(target),{recursive:true});writeFileSync(target,data,{flag:'wx'});}
function json(root,path,value){write(root,path,JSON.stringify(value,null,2)+'\n');}
export function outputInventory(root){const result={};function walk(path){for(const item of readdirSync(join(root,path),{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))){const file=path?path+'/'+item.name:item.name;if(item.isDirectory()){result[file+'/']=null;walk(file);}else if(item.isFile())result[file]=hash(bytes(root,file));else reject('nonregular output');}}walk('');return result;}
export function buildDemoVercel({sourceRoot,outputDirectory,expectedCommit,expectedTree}){
 const root=resolve(sourceRoot),output=resolve(outputDirectory);
 if(!isAbsolute(outputDirectory)||root!==realpathSync(root)||git(root,['rev-parse','--show-toplevel'])!==root)reject('absolute real source/output required');
 if(output===root||output.startsWith(root+sep)||existsSync(output)||realpathSync(dirname(output))!==dirname(output))reject('output must be new and outside source with a real existing parent');
 if(!/^24\.\d+\.\d+$/.test(process.versions.node))reject('Node 24.x required');
 const agent=process.env.npm_config_user_agent??'';if(!/^pnpm\/12\.8\.1(?: |$)/.test(agent))reject('invoke through pinned pnpm 12.8.1');
 const pnpmExecutable=process.env.npm_execpath;if(!pnpmExecutable||!isAbsolute(pnpmExecutable)||execFileSync(pnpmExecutable,['--version'],{cwd:root,timeout:5000}).toString().trim()!=='12.8.1')reject('actual pnpm executable version mismatch');
 const compiler=JSON.parse(readFileSync(join(root,'node_modules/typescript/package.json'))).version;if(compiler!=='7.0.2')reject('pinned compiler required');
 const sourceFiles=source(root,expectedCommit,expectedTree);
 const assets=JSON.parse(bytes(root,'src/web/demo/assets.json'));if(JSON.stringify(assets)!==JSON.stringify(HOSTED_WEB_ASSETS))reject('asset inventory mismatch');
 const routeInventory=JSON.parse(bytes(root,'verification/demo-runtime/route-source-inventory.json'));
 const sourceInventory=Object.fromEntries(Object.entries(sourceFiles).filter(([path])=>path.startsWith('src/')));
 const approvedRoutes=JSON.parse(bytes(root,'domains/demo-runtime/proposal-0.1.0/transport-and-queries.json')).routes.map(({method,path,operation,success_status})=>({method,path,operation,success_status}));
 if(JSON.stringify(routeInventory.source_sha256)!==JSON.stringify(sourceInventory)||approvedRoutes.length!==15||JSON.stringify(routeInventory.routes)!==JSON.stringify(approvedRoutes)||routeInventory.mounted_by_default!==false||routeInventory.shared_or_production_authorized!==false)reject('route source inventory mismatch');
 const scratch=mkdtempSync(join(tmpdir(),'teach-h02-compile-'));
 try{
  execFileSync(process.execPath,[join(root,'node_modules/typescript/bin/tsc'),'--project','tsconfig.h02.json','--outDir',scratch],{cwd:root,timeout:25000,maxBuffer:4*1024*1024});
  const compiled=new Map(H02_RUNTIME_SOURCES.map(path=>{const js=path.replace(/\.ts$/,'.js');return [js,bytes(scratch,js)];}));
  for(const [path,data] of compiled){const code=data.toString();if(/\b(?:import\s*\(|require\s*\()/m.test(code))reject('dynamic module loading');for(const match of code.matchAll(/(?:from\s*|import\s*)['"]([^'"]+)['"]/g)){const spec=match[1];if(spec.startsWith('node:'))continue;if(!spec.startsWith('.')||!compiled.has(relative(scratch,resolve(scratch,dirname(path),spec))))reject('runtime import outside compiled closure '+spec);}}
  if(JSON.stringify(source(root,expectedCommit,expectedTree))!==JSON.stringify(sourceFiles))reject('source changed during compilation');
  mkdirSync(output);
  const func='functions/demo.func';
  for(const [path,data] of compiled)write(output,func+'/'+path,data);
  write(output,func+'/'+SCHEMA,bytes(root,SCHEMA));
  for(const asset of HOSTED_WEB_ASSETS)write(output,func+'/src/web/demo/'+asset.file,bytes(root,'src/web/demo/'+asset.file));
  write(output,func+'/src/web/demo/assets.json',bytes(root,'src/web/demo/assets.json'));
  json(output,func+'/package.json',{type:'module',engines:{node:'24.x'}});
  json(output,func+'/.vc-config.json',{runtime:'nodejs24.x',handler:'src/bootstrap/demo-hosted/vercel-entrypoint.js',launcherType:'Nodejs',shouldAddHelpers:false,maxDuration:25});
  json(output,func+'/build-runtime.json',{policy:'24.x',nodeVersion:process.versions.node,packageManager:'pnpm@12.8.1',compiler:'typescript@'+compiler,sourceCommit:expectedCommit,sourceTree:expectedTree});
  // Everything stays behind the function's deny composition; no CDN/public files.
  json(output,'config.json',{version:3,routes:[{src:'^/.*$',dest:'/demo'}]});
  const files=outputInventory(output);
  const manifest={format:'TEACH_H02_VERCEL_BUILD_V1',execution:'DISABLED',deploymentAuthorized:false,providerBuildOutputVersion:3,
   sourceCommit:expectedCommit,sourceTree:expectedTree,nodePolicy:'24.x',nodeVersion:process.versions.node,packageManager:'pnpm@12.8.1',compiler:'typescript@'+compiler,
   sourceFiles,files,webAssets:HOSTED_WEB_ASSETS,apiRouteCount:15,apiRoutes:routeInventory.routes,activation:'NOT_IMPLEMENTED',backend:'NOT_INCLUDED'};
  json(output,'h02-build-manifest.json',manifest);
  return {manifestSha256:hash(bytes(output,'h02-build-manifest.json')),fileCount:Object.keys(files).filter(path=>!path.endsWith('/')).length+1,...manifest};
 }finally{rmSync(scratch,{recursive:true,force:true});}
}
/** Rebuild from reviewed clean source instead of trusting a self-hashed manifest. */
export function validateDemoVercel(options){
 const {packageDirectory,expectedManifestSha256,...buildOptions}=options;
 if(!/^[a-f0-9]{64}$/.test(expectedManifestSha256)||hash(bytes(resolve(packageDirectory),'h02-build-manifest.json'))!==expectedManifestSha256)reject('manifest digest');
 const scratch=mkdtempSync(join(tmpdir(),'teach-h02-rebuild-'));
 try{buildDemoVercel({...buildOptions,outputDirectory:join(scratch,'output')});if(JSON.stringify(outputInventory(resolve(packageDirectory)))!==JSON.stringify(outputInventory(join(scratch,'output'))))reject('rebuilt output mismatch');return {valid:true,execution:'DISABLED',deploymentAuthorized:false};}finally{rmSync(scratch,{recursive:true,force:true});}
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{const [root,output,commit,tree]=process.argv.slice(2);const result=buildDemoVercel({sourceRoot:root,outputDirectory:output,expectedCommit:commit,expectedTree:tree});console.log(JSON.stringify({manifestSha256:result.manifestSha256,fileCount:result.fileCount,execution:result.execution,deploymentAuthorized:false}));}catch(error){console.error(error.message);process.exitCode=1;}
}
