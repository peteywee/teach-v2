import {buildDemoNetlify} from './build-demo-netlify.mjs';
import {bundleInventory} from './build-successor-local.mjs';
import {readFileSync,writeFileSync,mkdtempSync,rmSync,cpSync,existsSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
/** Isolated credential-free canary only. No environment capture or deployment. */
export function buildNetlifyCanary(root,output){
 root=resolve(root);output=resolve(output);if(existsSync(output))throw Error('New canary output required');
 const scratch=mkdtempSync(join(tmpdir(),'teach-canary-'));
 try{
  const prepared=join(scratch,'output');const base=buildDemoNetlify(root,prepared);
  const evidence=JSON.stringify({nodePatch:base.nodePatch,files:Object.fromEntries(Object.entries(bundleInventory(prepared)).filter(([p])=>p.startsWith('private/runtime/')))});
  writeFileSync(join(prepared,'private/canary-evidence.json'),evidence);
  const digest=createHash('sha256').update(evidence).digest('hex');
  const source=readFileSync(join(root,'scripts/canary/netlify-function.mjs'),'utf8');
  if(source.split('__EVIDENCE_DIGEST__').length!==2)throw Error('Canary template mismatch');
  writeFileSync(join(prepared,'functions/demo.mjs'),source.replace('__EVIDENCE_DIGEST__',digest));
  // Provider uses the repository-root config. Do not ship stale preparation metadata.
  rmSync(join(prepared,'netlify.toml'));rmSync(join(prepared,'netlify-preparation-manifest.json'));
  const manifest={kind:'CREDENTIAL_FREE_DENY_CANARY',sourceCommit:base.sourceCommit,sourceTree:base.sourceTree,nodePatch:base.nodePatch,evidenceSha256:digest,files:bundleInventory(prepared)};
  writeFileSync(join(prepared,'canary-manifest.json'),JSON.stringify(manifest,null,2)+'\n');cpSync(prepared,output,{recursive:true,errorOnExist:true,force:false});if(JSON.stringify(bundleInventory(prepared))!==JSON.stringify(bundleInventory(output)))throw Error('Copied canary differs');return manifest;
 }finally{rmSync(scratch,{recursive:true,force:true});}
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){const root=process.cwd();const result=buildNetlifyCanary(root,join(root,'.netlify-canary'));console.log(JSON.stringify({kind:result.kind,nodePatch:result.nodePatch,files:Object.keys(result.files).length}));}
