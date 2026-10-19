import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {readFileSync,readdirSync,lstatSync,realpathSync,existsSync,mkdirSync,copyFileSync,writeFileSync,mkdtempSync,rmSync} from 'node:fs';
import {resolve,join,dirname,isAbsolute,sep} from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import {inspectSuccessorClosure} from './inspect-successor-closure.mjs';
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
export function bundleInventory(root){const files={};function walk(path){for(const name of readdirSync(join(root,path)).sort()){const rel=path?path+'/'+name:name,st=lstatSync(join(root,rel));if(st.isDirectory())walk(rel);else if(st.isFile())files[rel]=hash(readFileSync(join(root,rel)));else throw Error('Nonregular bundle path '+rel);}}walk('');return files;}
/** Local disabled bundle, not deployment approval. No package installation or network access. */
export function buildSuccessorLocal(root,output){
 root=realpathSync(root);output=resolve(output);
 if(!isAbsolute(output)||output===root||output.startsWith(root+sep)||existsSync(output)||realpathSync(dirname(output))!==dirname(output))throw Error('New external output required');
 if(!/^24\.\d+\.\d+$/.test(process.versions.node))throw Error('Node24 required');
 if(!/^pnpm\/12\.8\.1(?: |$)/.test(process.env.npm_config_user_agent??'')||!process.env.npm_execpath||execFileSync(/\.(?:mjs|cjs|js)$/.test(process.env.npm_execpath)?process.execPath:process.env.npm_execpath,/\.(?:mjs|cjs|js)$/.test(process.env.npm_execpath)?[process.env.npm_execpath,'--version']:['--version'],{timeout:5000}).toString().trim()!=='12.8.1')throw Error('Pinned pnpm12.8.1 required');
 const git=args=>execFileSync('git',['--no-optional-locks',...args],{cwd:root,timeout:5000,env:{...process.env,GIT_NO_REPLACE_OBJECTS:'1'}}).toString().trim();
 if(git(['status','--porcelain','--untracked-files=all']))throw Error('Clean source required');
 if(git(['ls-files','-v']).split('\n').some(line=>!line.startsWith('H ')))throw Error('Hidden source index entries');
 const commit=git(['rev-parse','HEAD']),tree=git(['rev-parse','HEAD^{tree}']);
 const compiler=JSON.parse(readFileSync(join(root,'node_modules/typescript/package.json'))).version;if(compiler!=='7.0.2')throw Error('Pinned compiler required');
 const lock=readFileSync(join(root,'pnpm-lock.yaml'),'utf8').split('\n---\n');if(lock.length!==2||lock[1].trim()!==readFileSync(join(root,'node_modules/.pnpm/lock.yaml'),'utf8').trim())throw Error('Installed application lock differs');
 const before=inspectSuccessorClosure(root);const scratch=mkdtempSync(join(tmpdir(),'teach-successor-'));
 const write=(path,data)=>{mkdirSync(dirname(join(output,path)),{recursive:true});writeFileSync(join(output,path),data,{flag:'wx'});};
 try{
  execFileSync(process.execPath,[join(root,'node_modules/typescript/bin/tsc'),'--project','tsconfig.successor.json','--outDir',scratch],{cwd:root,timeout:25000});
  mkdirSync(output);
  for(const path of Object.keys(before.files)){
   if(path.startsWith('src/')&&path.endsWith('.ts')&&!path.endsWith('.d.ts')&&!path.endsWith('.d.mts')){const js=path.slice(0,-3)+'.js';write(js,readFileSync(join(scratch,js)));}
   else if(path.startsWith('src/')||path.startsWith('governance/')||path.endsWith('baseline-error-envelope.schema.json'))write(path,readFileSync(join(root,path)));
  }
  const packages={};
  function retain(name,from,expected){
   const req=createRequire(join(from,'package.json'));let dir;
   try{dir=dirname(req.resolve(name+'/package.json'));}catch{dir=dirname(req.resolve(name));while(!existsSync(join(dir,'package.json'))){const next=dirname(dir);if(next===dir)throw Error('Missing package metadata');dir=next;}}
   dir=realpathSync(dir);const pkg=JSON.parse(readFileSync(join(dir,'package.json')));
   if(pkg.name!==name||expected&&pkg.version!==expected)throw Error('Dependency version mismatch '+name);
   if(packages[name]){if(packages[name]!==pkg.version)throw Error('Conflicting dependency version');return;}
   packages[name]=pkg.version;
   function copy(path){for(const entry of readdirSync(join(dir,path)).sort()){if(entry==='node_modules')continue;const rel=path?path+'/'+entry:entry,st=lstatSync(join(dir,rel));if(st.isDirectory())copy(rel);else if(st.isFile())write('node_modules/'+name+'/'+rel,readFileSync(join(dir,rel)));else throw Error('Nonregular dependency source');}}copy('');
   for(const dep of Object.keys(pkg.dependencies??{}))retain(dep,dir);
   for(const dep of Object.keys(pkg.optionalDependencies??{})){try{req.resolve(dep);}catch{continue;}retain(dep,dir);}
  }
  for(const [name,version]of Object.entries(before.packages))retain(name,root,version);
  write('package.json',JSON.stringify({type:'module',engines:{node:'24.x'},dependencies:before.packages},null,2));
  write('build-runtime.json',JSON.stringify({nodeVersion:process.versions.node,sourceCommit:commit,sourceTree:tree}));
  if(JSON.stringify(before)!==JSON.stringify(inspectSuccessorClosure(root))||git(['status','--porcelain','--untracked-files=all']))throw Error('Source changed during build');
  const manifest={kind:'SUCCESSOR_LOCAL_DISABLED_BUNDLE',execution:'DISABLED',deploymentAuthorized:false,providerVerified:false,sourceCommit:commit,sourceTree:tree,nodePatch:process.versions.node,compiler:'typescript@'+compiler,installedApplicationLockMatches:true,closure:before,packages,files:bundleInventory(output)};
  write('successor-manifest.json',JSON.stringify(manifest,null,2)+'\n');return manifest;
 }finally{rmSync(scratch,{recursive:true,force:true});}
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){const result=buildSuccessorLocal(process.argv[2]??'.',process.argv[3]);console.log(JSON.stringify({files:Object.keys(result.files).length,packages:result.packages,nodePatch:result.nodePatch,execution:result.execution}));}
