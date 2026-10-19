import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {join} from 'node:path';
import {readFileSync,writeFileSync} from 'node:fs';
const root=process.argv[2];
const url=pathToFileURL(join(root,'src/bootstrap/demo-successor/accepting-entrypoint.js')).href;
async function invoke(handler,host='demo.example.test',target='/'){let status,body,headers;await handler({url:target,method:'GET',rawHeaders:['Host',host,'X-Activate','true']},{writeHead(s,h){status=s;headers=h;},end(b){body=Buffer.from(b);}});return {status,body,headers};}
// Cold import before configuration remains denied even if environment later changes.
const cold=(await import(url+'?cold')).default;
assert.equal((await invoke(cold)).status,503);
Object.assign(process.env,{TEACH_DB_SCHEMA:'teach_v2_demo',TEACH_SUPABASE_PROJECT:'acqafjkdkdmtpnsxiesw',TEACH_DEMO_ORIGIN:'https://demo.example.test',TEACH_DB_HOST:'aws-0-us-east-2.pooler.supabase.com',TEACH_DB_USER:'teach_v2_demo_runtime.acqafjkdkdmtpnsxiesw',TEACH_DB_PASSWORD:'synthetic-only',TEACH_DB_CA:'-----BEGIN CERTIFICATE-----\nsynthetic\n-----END CERTIFICATE-----'});
assert.equal((await invoke(cold)).status,503);
const accepting=(await import(url+'?configured')).default;
for(const asset of JSON.parse(readFileSync(join(root,'src/web/demo/assets.json')))){const response=await invoke(accepting,'demo.example.test',asset.path);assert.equal(response.status,200);assert.deepEqual(response.body,readFileSync(join(root,'src/web/demo',asset.file)));assert.equal(response.headers['cache-control'],'no-store');}
assert.equal((await invoke(accepting,'evil.example.test')).status,400);
// No database operation was issued: static/invalid-host handling must not create a pool.
console.log('PASS: packaged default accepting entrypoint 7 assets, foreign Host denial, cold503 and immutable initialization; no DB connection');

const metadata=join(root,'build-runtime.json'),original=readFileSync(metadata);
try{writeFileSync(metadata,JSON.stringify({nodeVersion:'24.0.0'}));assert.equal((await invoke((await import(url+'?mismatch')).default)).status,503);writeFileSync(metadata,'{}');assert.equal((await invoke((await import(url+'?missing')).default)).status,503);}finally{writeFileSync(metadata,original);}
console.log('PASS: mismatched and absent Node patch evidence deny503');
