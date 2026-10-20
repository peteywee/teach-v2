import assert from 'node:assert/strict';
import test from 'node:test';
import {execFileSync} from 'node:child_process';
import {cpSync,mkdirSync,mkdtempSync,readFileSync,readdirSync,rmSync,symlinkSync,writeFileSync} from 'node:fs';
import {dirname,join,resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {pathToFileURL} from 'node:url';
import {buildDemoNetlify} from '../packaging/build-demo-netlify.mjs';
import {bundleInventory} from '../packaging/build-successor-local.mjs';
const root=resolve(new URL('../..',import.meta.url).pathname);
const git=(cwd,args)=>execFileSync('git',args,{cwd,timeout:5000}).toString().trim();
function fixture(){
 const dir=mkdtempSync(join(tmpdir(),'teach-netlify-test-')),source=join(dir,'source');mkdirSync(source);
 for(const path of git(root,['ls-files','--cached','--others','--exclude-standard','-z']).split('\0').filter(Boolean)){mkdirSync(dirname(join(source,path)),{recursive:true});cpSync(join(root,path),join(source,path));}
 git(source,['init','-q']);git(source,['add','.']);git(source,['-c','user.name=Local Test','-c','user.email=test@example.invalid','commit','-qm','Local Netlify fixture']);symlinkSync(join(root,'node_modules'),join(source,'node_modules'),'dir');
 return {dir,source,close(){rmSync(dir,{recursive:true,force:true});}};
}
test('Netlify disabled preparation packages complete private runtime deterministically and resolves outside source',async()=>{
 const f=fixture();try{
  const first=join(f.dir,'first'),second=join(f.dir,'second'),manifest=buildDemoNetlify(f.source,first);buildDemoNetlify(f.source,second);
  assert.deepEqual(bundleInventory(first),bundleInventory(second));assert.equal(manifest.execution,'DISABLED');assert.equal(manifest.providerVerified,false);assert.equal(manifest.rawIngressVerified,false);assert.equal(manifest.nodePatch,process.versions.node);
  assert.deepEqual(readdirSync(join(first,'public')),[]);const files=Object.keys(manifest.files);
  assert.ok(files.includes('private/runtime/node_modules/pg/package.json'));assert.ok(files.includes('private/runtime/node_modules/drizzle-orm/package.json'));
  assert.ok(files.includes('private/runtime/domains/demo-runtime/proposal-0.1.0/baseline-error-envelope.schema.json'));assert.ok(files.includes('private/runtime/src/web/demo/assets.json'));assert.ok(files.includes('private/runtime/build-runtime.json'));
  assert.ok(!files.some(p=>/\.sql$|(^|\/)tests\/|\.env$/.test(p)));
  const wrapper=await import(pathToFileURL(join(first,'functions/demo.mjs')).href);assert.deepEqual(wrapper.config,{path:'/*',preferStatic:false,nodeBundler:'none',nodeVersion:'24',includedFiles:['private/runtime/**']});
  const runner=`import net from 'node:net';let effects=0;net.Socket.prototype.connect=function(){effects++;throw Error('network');};net.Server.prototype.listen=function(){effects++;throw Error('listen');};globalThis.fetch=async()=>{effects++;throw Error('fetch');};globalThis.setInterval=()=>{effects++;throw Error('timer');};const m=await import(${JSON.stringify(pathToFileURL(join(first,'functions/demo.mjs')).href)});for(const path of ['/','/assets/app.mjs','/api/v1/demo/start','/private/runtime/build-runtime.json','/.netlify/functions/demo']){const r=await m.default(new Request('https://demo.example.test'+path));if(r.status!==503||r.headers.get('cache-control')!=='no-store'||r.headers.has('set-cookie'))throw Error('enabled');}if(effects)throw Error('effects');console.log('PACKAGED_ZERO_EFFECTS');`;
  const project=readFileSync(join(f.source,'src/bootstrap/demo-successor/runtime-config.ts'),'utf8').match(/TEACH_SUPABASE_PROJECT!=='([a-z0-9]+)'/)[1];
  const env={PATH:process.env.PATH,TEACH_HOSTED_ENABLED:'1',TEACH_NETLIFY_ENABLED:'1',TEACH_DB_SCHEMA:'teach_v2_demo',TEACH_SUPABASE_PROJECT:project,TEACH_DEMO_ORIGIN:'https://demo.example.test',TEACH_DB_HOST:'aws-0-us-east-1.pooler.supabase.com',TEACH_DB_USER:'teach_v2_demo_runtime.'+project,TEACH_DB_PASSWORD:'synthetic-not-live',TEACH_DB_CA:'-----BEGIN CERTIFICATE-----\nsynthetic\n-----END CERTIFICATE-----'};
  assert.match(execFileSync(process.execPath,['--input-type=module','-e',runner],{cwd:tmpdir(),env,timeout:10000}).toString(),/PACKAGED_ZERO_EFFECTS/);
  // Complete runtime closure import is checked separately with sockets prohibited.
  const importRuntime=`import net from 'node:net';net.Socket.prototype.connect=function(){throw Error('network');};await import(${JSON.stringify(pathToFileURL(join(first,'private/runtime/src/bootstrap/demo-successor/runtime.js')).href)});console.log('RUNTIME_CLOSURE_RESOLVES');`;
  assert.match(execFileSync(process.execPath,['--input-type=module','-e',importRuntime],{cwd:tmpdir(),env,timeout:10000}).toString(),/RUNTIME_CLOSURE_RESOLVES/);
  assert.match(execFileSync(process.execPath,['--import','tsx',join(root,'scripts/tests/netlify-packaged-runtime.mjs'),join(first,'private/runtime')],{cwd:root,env:{...process.env,TEACH_DB_SCHEMA:'teach_v2_demo'},timeout:10000}).toString(),/15 operations, 7 exact assets/);
  for(const evidence of ['{bad',JSON.stringify({nodeVersion:'24.0.0'})]){writeFileSync(join(first,'private/runtime/build-runtime.json'),evidence);assert.equal((await wrapper.default(new Request('https://demo.example.test/'))).status,503);}
  rmSync(join(first,'private/runtime/build-runtime.json'));assert.equal((await wrapper.default(new Request('https://demo.example.test/'))).status,503);
  assert.throws(()=>buildDemoNetlify(f.source,first),/New external output/);
  writeFileSync(join(f.source,'dirty.txt'),'dirty');assert.throws(()=>buildDemoNetlify(f.source,join(f.dir,'dirty')),/Clean source/);
 }finally{f.close();}
});
