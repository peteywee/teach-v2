import assert from 'node:assert/strict';
import test from 'node:test';
import {execFileSync} from 'node:child_process';
import {mkdtempSync,readFileSync,writeFileSync,rmSync,symlinkSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {captureRuntimeConfiguration} from '../../src/bootstrap/demo-successor/runtime-config.js';
const good={TEACH_DB_SCHEMA:'teach_v2_demo',TEACH_SUPABASE_PROJECT:'acqafjkdkdmtpnsxiesw',TEACH_DEMO_ORIGIN:'https://demo.example.test',TEACH_DB_HOST:'aws-0-us-east-2.pooler.supabase.com',TEACH_DB_USER:'teach_v2_demo_runtime.acqafjkdkdmtpnsxiesw',TEACH_DB_PASSWORD:'synthetic-only',TEACH_DB_CA:'-----BEGIN CERTIFICATE-----\nsynthetic\n-----END CERTIFICATE-----'};
test('configuration is exact server-only target, verified TLS and two retained connections',()=>{const cfg=captureRuntimeConfiguration(good);assert.equal(cfg.options.max,2);assert.equal((cfg.options.ssl as any).rejectUnauthorized,true);assert.equal(cfg.options.port,6543);assert.ok(Object.isFrozen(cfg));for(const key of Object.keys(good))assert.throws(()=>captureRuntimeConfiguration({...good,[key]:undefined}));for(const bad of [{TEACH_DB_SCHEMA:'public'},{TEACH_SUPABASE_PROJECT:'xgtxszipmenyujwhcfut'},{TEACH_DB_USER:'postgres.acqafjkdkdmtpnsxiesw'},{TEACH_DEMO_ORIGIN:'http://demo.example.test'},{TEACH_DB_HOST:'evil.test'}])assert.throws(()=>captureRuntimeConfiguration({...good,...bad}));});
test('default entrypoint ignores request activation and invalid configuration',async()=>{const {default:handler}=await import('../../src/bootstrap/demo-successor/accepting-entrypoint.js');let status=0,body='';await handler({url:'/?activate=true',headers:{'x-activate':'true'}} as any,{writeHead(code:number){status=code;},end(bytes:Buffer){body=bytes.toString();}} as any);assert.equal(status,503);assert.match(body,/SERVICE_UNAVAILABLE/);});

const {restoreVercelConfigFormatting}=await import(new URL('../../scripts/packaging/build-vercel-release.mjs',import.meta.url).href);
function configFixture(run:(root:string,original:string)=>void){
 const root=mkdtempSync(join(tmpdir(),'teach-vercel-config-test-'));
 const original=JSON.stringify({framework:null,buildCommand:'node reviewed-build.mjs'},null,2)+'\n';
 const git=(args:string[])=>execFileSync('git',args,{cwd:root,timeout:3000,stdio:'pipe'});
 try {git(['init','-q']);writeFileSync(join(root,'vercel.json'),original);git(['add','vercel.json']);git(['-c','user.name=Teach fixture','-c','user.email=fixture@example.invalid','commit','-qm','Configuration fixture']);run(root,original);}
 finally {rmSync(root,{recursive:true,force:true});}
}
test('Vercel formatting normalization restores exact committed bytes and is idempotent',()=>configFixture((root,original)=>{
 writeFileSync(join(root,'vercel.json'),JSON.stringify({buildCommand:'node reviewed-build.mjs',framework:null}));
 assert.equal(restoreVercelConfigFormatting(root),true);assert.equal(readFileSync(join(root,'vercel.json'),'utf8'),original);
 assert.equal(restoreVercelConfigFormatting(root),false);
 assert.equal(execFileSync('git',['status','--porcelain'],{cwd:root,encoding:'utf8',timeout:3000}),'');
}));
test('Vercel normalization refuses changed values without restoring or logging values',()=>configFixture((root)=>{
 const changed=JSON.stringify({framework:null,buildCommand:'PRIVATE_SENTINEL_DO_NOT_LOG'});writeFileSync(join(root,'vercel.json'),changed);
 assert.throws(()=>restoreVercelConfigFormatting(root),(error:unknown)=>error instanceof Error&&error.message.includes('buildCommand')&&!error.message.includes('PRIVATE_SENTINEL'));
 assert.equal(readFileSync(join(root,'vercel.json'),'utf8'),changed);
}));
test('Vercel normalization rejects invalid JSON and a symbolic-link configuration',()=>configFixture((root)=>{
 const path=join(root,'vercel.json');writeFileSync(path,'PRIVATE_SENTINEL_INVALID_JSON');
 assert.throws(()=>restoreVercelConfigFormatting(root),/^Error: Invalid Vercel configuration JSON$/);
 rmSync(path);writeFileSync(join(root,'outside.txt'),'private fixture');symlinkSync('outside.txt',path);
 assert.throws(()=>restoreVercelConfigFormatting(root),/Regular Vercel configuration required/);
}));
