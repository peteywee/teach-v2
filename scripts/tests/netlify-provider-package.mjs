import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdtempSync,mkdirSync,rmSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {pathToFileURL} from 'node:url';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {buildNetlifyCanary} from '../packaging/build-netlify-canary.mjs';
import {buildDemoNetlify} from '../packaging/build-demo-netlify.mjs';
// Install this exact official package in a separate verification workspace; never
// alter the application's dependency graph or lockfile for provider tooling.
const packagerRoot=resolve(process.argv[2]);
const metadata=JSON.parse(readFileSync(join(packagerRoot,'package.json')));
assert.equal(metadata.name,'@netlify/zip-it-and-ship-it');assert.equal(metadata.version,'16.4.0');
assert.equal(process.versions.node,'24.21.0');
const {zipFunctions}=await import(pathToFileURL(join(packagerRoot,'dist/main.js')).href);
const root=resolve(new URL('../..',import.meta.url).pathname),scratch=mkdtempSync(join(tmpdir(),'teach-provider-package-'));
const hash=b=>createHash('sha256').update(b).digest('hex');
async function packaged(source,label){
 const destination=join(scratch,label);mkdirSync(destination);
 const functions=await zipFunctions(join(source,'functions'),destination,{basePath:source,archiveFormat:'zip'});
 assert.equal(functions.length,1);assert.equal(functions[0].runtimeVersion,'nodejs24.x');
 const zip=functions[0].path;
 const paths=execFileSync('unzip',['-Z1',zip],{timeout:5000}).toString().trim().split('\n');
 return {zip,paths,destination};
}
function extract(zip,destination){
 // Refuse traversal or symlink extraction even for the trusted generated archive.
 const python=`import zipfile,sys,pathlib,stat\nz=zipfile.ZipFile(sys.argv[1])\nfor i in z.infolist():\n p=pathlib.PurePosixPath(i.filename)\n assert not p.is_absolute() and '..' not in p.parts and not stat.S_ISLNK(i.external_attr>>16)\nz.extractall(sys.argv[2])`;
 execFileSync('python',['-c',python,zip,destination],{timeout:5000});
}
try{
 const canary=join(scratch,'canary'),manifest=buildNetlifyCanary(root,canary);
 const positive=await packaged(canary,'canary-zip');
 assert.ok(positive.paths.includes('functions/demo.mjs'));assert.ok(positive.paths.includes('private/canary-evidence.json'));
 const extracted=join(scratch,'extracted');extract(positive.zip,extracted);
 for(const [path,digest]of Object.entries(manifest.files).filter(([p])=>p.startsWith('private/')))assert.equal(hash(readFileSync(join(extracted,path))),digest,path);
 const runner=`import assert from 'node:assert/strict';import net from 'node:net';net.Socket.prototype.connect=()=>{throw Error('network prohibited');};const logs=[];console.log=x=>logs.push(JSON.parse(x));const {default:handler}=await import(${JSON.stringify(pathToFileURL(join(extracted,'functions/demo.mjs')).href)});const response=await handler(new Request('https://synthetic.invalid/'));assert.equal(response.status,503);assert.equal(await response.text(),'{"error":{"code":"SERVICE_UNAVAILABLE","message":"Canary unavailable"}}');assert.equal(logs[0].evidenceVerified,true);assert.equal(logs[0].privateClosureVerified,true);assert.equal(logs[0].importsResolved,true);assert.equal(logs[0].exactPatchMatch,true);assert.equal(logs[0].nodePatch,'24.21.0');process.stdout.write('EXTRACTED_CLOSURE_PASS');`;
 assert.match(execFileSync(process.execPath,['--input-type=module','-e',runner],{cwd:tmpdir(),env:{PATH:process.env.PATH},timeout:10000}).toString(),/EXTRACTED_CLOSURE_PASS/);
 // Regression control: the former repository-relative inline glob silently omits
 // evidence under the real packager. This must fail even though directory imports pass.
 const wrapper=join(canary,'functions/demo.mjs'),fixed=readFileSync(wrapper,'utf8');
 writeFileSync(wrapper,fixed.replace("includedFiles:['../private/**']","includedFiles:['.netlify-canary/private/**']"));
 const negative=await packaged(canary,'old-glob-zip');assert.ok(!negative.paths.some(p=>p.endsWith('canary-evidence.json')));writeFileSync(wrapper,fixed);
 const scaffold=join(scratch,'scaffold');buildDemoNetlify(root,scaffold);const scaffoldZip=await packaged(scaffold,'scaffold-zip');
 for(const path of ['private/runtime/build-runtime.json','private/runtime/node_modules/pg/package.json','private/runtime/domains/demo-runtime/proposal-0.1.0/baseline-error-envelope.schema.json'])assert.ok(scaffoldZip.paths.includes(path),path);
 console.log(JSON.stringify({result:'PROVIDER_PACKAGER_REGRESSION_PASS',packager:'@netlify/zip-it-and-ship-it@16.4.0',nodePatch:process.versions.node,sourceCommit:manifest.sourceCommit,sourceTree:manifest.sourceTree,canaryZipEntries:positive.paths.length,scaffoldZipEntries:scaffoldZip.paths.length,oldInlineGlobOmitsEvidence:true,extractedPrivateClosureMatches:true,extractedColdChecksPass:true,providerAcceptance:false}));
}finally{rmSync(scratch,{recursive:true,force:true});}
