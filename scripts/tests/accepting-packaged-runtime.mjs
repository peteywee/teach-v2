import {MemoryDemoTransaction} from '../../tests/demo/memory-transaction.ts';
import {exerciseAcceptingRuntime} from './accepting-runtime-flow.mjs';
await exerciseAcceptingRuntime(process.argv[2],new MemoryDemoTransaction());
// Expiry boundary remains the existing database-clock rule, not a new scheduler.
const {assembleHostedRuntime}=await import((await import('node:url')).pathToFileURL(process.argv[2]+'/src/bootstrap/demo-successor/runtime.js').href);
const assert=(await import('node:assert/strict')).default;
const db=new MemoryDemoTransaction(),origin='https://demo.example.test';
const {handle}=assembleHostedRuntime({origin,options:{}},db);
const start=await handle(new Request(origin+'/api/v1/demo/start',{method:'POST',headers:{Host:'demo.example.test',Origin:origin,'Content-Type':'application/json'},body:'{}'}));assert.equal(start.status,201);
const cookie=start.headers.get('set-cookie').split(';')[0];
db.now=new Date(db.now.getTime()+60*60*1000);
assert.equal((await handle(new Request(origin+'/api/v1/session',{headers:{Host:'demo.example.test',Cookie:cookie}}))).status,401);
console.log('PASS: packaged accepting assembly exact hard-expiry boundary using synthetic clock');
