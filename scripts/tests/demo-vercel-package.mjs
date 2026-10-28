import {installAuthoringPredecessor} from './authoring-predecessor-fixture.mjs';
import assert from 'node:assert/strict';
import test from 'node:test';
import {execFileSync} from 'node:child_process';
import {cpSync,mkdirSync,mkdtempSync,readFileSync,rmSync,symlinkSync,writeFileSync} from 'node:fs';
import {dirname,join,resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {pathToFileURL} from 'node:url';
import {buildDemoVercel,validateDemoVercel,outputInventory} from '../packaging/build-demo-vercel.mjs';
const root=resolve(new URL('../..',import.meta.url).pathname);
function git(cwd,args){return execFileSync('git',args,{cwd,stdio:['ignore','pipe','pipe']}).toString().trim();}
function fixture(){
 const dir=mkdtempSync(join(tmpdir(),'teach-h02-test-')),source=join(dir,'source');mkdirSync(source);
 for(const path of git(root,['ls-files','--cached','--others','--exclude-standard','-z']).split('\0').filter(Boolean)){mkdirSync(dirname(join(source,path)),{recursive:true});cpSync(join(root,path),join(source,path));}
 installAuthoringPredecessor(source);
 git(source,['init','-q']);git(source,['add','.']);git(source,['-c','user.name=Local Test','-c','user.email=test@example.invalid','commit','-qm','H02 test fixture']);
 symlinkSync(join(root,'node_modules'),join(source,'node_modules'),'dir');
 const options={sourceRoot:source,expectedCommit:git(source,['rev-parse','HEAD']),expectedTree:git(source,['rev-parse','HEAD^{tree}'])};
 return {dir,source,options,close(){rmSync(dir,{recursive:true,force:true});}};
}
test('actual Node24 Build Output is deterministic, closed, source-bound and disabled',async()=>{
 const f=fixture();try{
  const first=join(f.dir,'first'),second=join(f.dir,'second');const manifest=buildDemoVercel({...f.options,outputDirectory:first});buildDemoVercel({...f.options,outputDirectory:second});assert.deepEqual(outputInventory(first),outputInventory(second));
  assert.equal(manifest.nodePolicy,'24.x');assert.equal(manifest.nodeVersion,process.versions.node);assert.equal(manifest.deploymentAuthorized,false);assert.equal(manifest.webAssets.length,7);assert.equal(manifest.apiRouteCount,15);
  const names=Object.keys(outputInventory(first));assert.ok(!names.some(name=>/\.sql$|node_modules|tests\/|local-activation|local-server|\.env/.test(name)));
  const func=join(first,'functions/demo.func');const config=JSON.parse(readFileSync(join(func,'.vc-config.json')));assert.equal(config.runtime,'nodejs24.x');assert.equal(config.shouldAddHelpers,false);assert.equal(config.handler,'src/bootstrap/demo-hosted/vercel-entrypoint.js');
  assert.deepEqual(validateDemoVercel({...f.options,packageDirectory:first,expectedManifestSha256:manifest.manifestSha256}),{valid:true,execution:'DISABLED',deploymentAuthorized:false});
  // A fresh process outside source resolves every packaged import/schema with no
  // node_modules fallback and proves environment flags cannot activate the handler.
  const runner=`const m=await import(${JSON.stringify(pathToFileURL(join(func,config.handler)).href)});if(!m.runtimeReadback().verified)throw Error('runtime mismatch');for(const url of ['/','/assets/app.mjs','/api/v1/demo/start','/api/v1/session','/not-a-route']){let status,headers,body;await m.default({url,method:'POST',rawHeaders:[]},{writeHead(s,h){status=s;headers=h;},end(b){body=b;}});if(status!==503||headers['cache-control']!=='no-store'||headers['set-cookie']||JSON.parse(body).error.code!=='SERVICE_UNAVAILABLE')throw Error('not disabled');}console.log('PACKAGED_DISABLED_PASS');`;
  assert.match(execFileSync(process.execPath,['--input-type=module','-e',runner],{cwd:tmpdir(),timeout:10000,env:{PATH:process.env.PATH,TEACH_HOSTED_ENABLED:'1',DATABASE_URL:'must-not-be-used',TEACH_DB_SCHEMA:'teach_v2_demo'}}).toString(),/PACKAGED_DISABLED_PASS/);
  const module=await import(pathToFileURL(join(func,config.handler)).href);
  for(const evidence of [JSON.stringify({nodeVersion:'24.0.0'}),'{malformed',null]){
   const metadata=join(func,'build-runtime.json');if(evidence===null)rmSync(metadata);else writeFileSync(metadata,evidence);
   assert.equal(module.runtimeReadback().requiresReverification,true);let status;await module.default({}, {writeHead(s){status=s;},end(){}});assert.equal(status,503);
  }
  assert.throws(()=>validateDemoVercel({...f.options,packageDirectory:first,expectedManifestSha256:manifest.manifestSha256}),/rebuilt output mismatch/);
 }finally{f.close();}
});
test('builder rejects dirty, hidden-index, substituted-source, identity and output reuse',()=>{
 const f=fixture();try{
  const output=join(f.dir,'out');assert.throws(()=>buildDemoVercel({...f.options,expectedCommit:'0'.repeat(40),outputDirectory:output}),/source identity/);
  writeFileSync(join(f.source,'untracked.txt'),'dirty');assert.throws(()=>buildDemoVercel({...f.options,outputDirectory:output}),/dirty source/);rmSync(join(f.source,'untracked.txt'));
  git(f.source,['update-index','--assume-unchanged','src/bootstrap/demo-hosted/composition.ts']);assert.throws(()=>buildDemoVercel({...f.options,outputDirectory:output}),/hidden index/);git(f.source,['update-index','--no-assume-unchanged','src/bootstrap/demo-hosted/composition.ts']);
  const imported=join(f.source,'scripts/packaging/build-demo-hosted.mjs');writeFileSync(imported,readFileSync(imported,'utf8')+'\n// changed external source inventory module\n');git(f.source,['add','.']);git(f.source,['-c','user.name=Local Test','-c','user.email=test@example.invalid','commit','-qm','changed inventory']);
  assert.throws(()=>buildDemoVercel({...f.options,expectedCommit:git(f.source,['rev-parse','HEAD']),expectedTree:git(f.source,['rev-parse','HEAD^{tree}']),outputDirectory:output}),/builder identity/);
  mkdirSync(output);assert.throws(()=>buildDemoVercel({...f.options,outputDirectory:output}),/output must be new/);
  assert.throws(()=>buildDemoVercel({...f.options,outputDirectory:join(f.source,'build-output')}),/output must be new/);
 }finally{f.close();}
});
test('missing, extra, modified and symlink output cannot validate',()=>{
 const f=fixture();try{
  const output=join(f.dir,'out'),manifest=buildDemoVercel({...f.options,outputDirectory:output});const options={...f.options,packageDirectory:output,expectedManifestSha256:manifest.manifestSha256};
  writeFileSync(join(output,'unexpected.txt'),'extra');assert.throws(()=>validateDemoVercel(options),/rebuilt output mismatch/);rmSync(join(output,'unexpected.txt'));
  const schema=join(output,'functions/demo.func/domains/demo-runtime/proposal-0.1.0/baseline-error-envelope.schema.json');rmSync(schema);assert.throws(()=>validateDemoVercel(options),/rebuilt output mismatch/);symlinkSync(join(f.source,'domains/demo-runtime/proposal-0.1.0/baseline-error-envelope.schema.json'),schema);assert.throws(()=>validateDemoVercel(options),/nonregular output/);
 }finally{f.close();}
});
