import {createAuthoringPredecessorCopy} from '../../scripts/tests/authoring-proof-copy.mjs';
import {fileURLToPath,pathToFileURL} from 'node:url';
let predecessor;const historicalAssets=()=>{predecessor??=createAuthoringPredecessorCopy(fileURLToPath(new URL('../../',import.meta.url)));return readFile(pathToFileURL(predecessor.root+'/src/web/demo/assets.json'),'utf8');};
after(()=>predecessor?.remove());
import test,{after} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash,randomUUID} from 'node:crypto';
import {renderApp} from '../../src/web/demo/views.mjs';
import {createDemoController} from '../../src/web/demo/controller.mjs';
import {mockService,content} from './fixtures.mjs';

const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const source=path=>readFile(new URL('../../'+path,import.meta.url),'utf8');
const help=html=>html.match(/<details class="navigation-help">[\s\S]*?<\/details>/)?.[0]??'';
async function setup(){const api=mockService(),c=createDemoController({api,makeKey:randomUUID});await c.enter();return {api,c};}

test('recovered artwork preserves exact original provenance and only safe inline root adaptations',async()=>{
 const original=await source('docs/legacy-ui-reuse/TopShelfService_Logo_Trace.svg');
 const provenance=JSON.parse(await source('docs/legacy-ui-reuse/provenance.json'));
 assert.equal(Buffer.byteLength(original),28841);
 assert.equal(sha(original),'1cf758e284d37d6f26dac3e519307ed848a138bdf95de958c60f88adc684229d');
 assert.equal(createHash('sha1').update(`blob ${Buffer.byteLength(original)}\0`).update(original).digest('hex'),provenance.source.git_blob);
 const expected=original.replace(' xmlns="http://www.w3.org/2000/svg"','').replace('<svg ','<svg aria-hidden="true" focusable="false" ');
 const home=renderApp({phase:'ready',session:null});
 const actual=home.match(/<svg\b[\s\S]*?<\/svg>/)?.[0];
 assert.equal(actual,expected);assert.equal(sha(actual),provenance.served_representation.sha256);
 assert.deepEqual([...new Set([...actual.matchAll(/<\/?([A-Za-z]+)/g)].map(m=>m[1]))].sort(),['path','rect','svg']);
 assert.doesNotMatch(actual,/\b(?:href|src|style|on[a-z]+)\s*=|javascript:|https?:|<!(?:DOCTYPE|ENTITY)/i);
 assert.match(home,/class="brand-illustration-caption">Top Shelf Service<\/p>/);
 assert.doesNotMatch(home,/class="mock-scene"/);
});

test('navigation guidance is collapsed native optional UI, not lesson hints or new commands',async()=>{
 const {c}=await setup();await c.start('assignment_1');const html=help(renderApp(c.snapshot()));
 assert.ok(html);assert.match(html,/^<details class="navigation-help"><summary>Using this demo<\/summary>/);
 assert.doesNotMatch(html,/\bopen(?:\s|=|>)|aria-expanded|data-action|<(?:button|input|a|script)\b/);
 for(const label of ['Save response','Response saved','Next step','Review completion','Record completion','See manager view','Assign again','Switch to learner','Reset demo','Sign out'])assert.ok(html.includes(label),label);
 assert.match(html,/do not assume your response was saved/);assert.match(html,/only when the service confirms it/);assert.match(html,/retains synthetic history/);
 for(const block of content.blocks)for(const value of [block.instruction,block.prompt,...block.options])assert.ok(!html.includes(value));
 assert.doesNotMatch(html,/expected response|correct choice|hint|score|grade|mastery|certif|proficien|job ready/i);
});

test('help is scoped to learner views and never appears in protected error or manager views',async()=>{
 const {c}=await setup();assert.ok(help(renderApp(c.snapshot())));
 await c.start('assignment_1');assert.ok(help(renderApp(c.snapshot())));
 for(let i=0;i<3;i++){c.choose(0);await c.save();c.next();}await c.complete();assert.ok(help(renderApp(c.snapshot())));
 await c.switchPersona('MANAGER');assert.equal(help(renderApp(c.snapshot())),'');
 await c.member('learner_1');assert.equal(help(renderApp(c.snapshot())),'');
 for(const phase of ['loading','error','forbidden','unauthenticated','offline'])assert.equal(help(renderApp({phase,busy:false,error:null,notice:''})),'',phase);
 assert.equal(help(renderApp({phase:'ready',session:null})), '');
});

test('rendering guidance is pure and ordinary rerenders do not persist disclosure or alter responses',async()=>{
 const {api,c}=await setup();await c.start('assignment_1');const before=c.snapshot(),calls=api.calls.length;
 const first=renderApp(before);assert.equal(renderApp(before),first);assert.equal(api.calls.length,calls);assert.deepEqual(c.snapshot(),before);
 c.choose(1);const selected=c.snapshot();assert.equal(selected.selected,1);assert.equal(selected.states[0].recordedBlockCount,0);
 assert.doesNotMatch(help(renderApp(selected)),/<details[^>]*\bopen/);assert.equal(api.calls.length,calls);
 await c.switchPersona('MANAGER');assert.equal(help(renderApp(c.snapshot())),'');
 await c.switchPersona('LEARNER');assert.doesNotMatch(help(renderApp(c.snapshot())),/<details[^>]*\bopen/);
 await c.reset();assert.ok(help(renderApp(c.snapshot())));assert.doesNotMatch(help(renderApp(c.snapshot())),/<details[^>]*\bopen/);
 await c.logout();assert.equal(help(renderApp(c.snapshot())),'');
});

test('help preserves existing API and finite static-asset boundaries',async()=>{
 const assets=JSON.parse(await historicalAssets());
 assert.equal(assets.length,7);assert.ok(assets.some(a=>a.file==='views.mjs'));
 assert.ok(!assets.some(a=>/legacy|guidance|\.svg/.test(a.file)));
 const app=await source('src/web/demo/app.mjs');assert.doesNotMatch(app,/navigation-help|legacyBrandIllustration/);
 const css=await source('src/web/demo/styles.css');
 assert.match(css,/\.navigation-help summary\{[^}]*min-height:48px/);
 assert.match(css,/summary:focus-visible[^}]*outline:3px solid/);
 assert.match(css,/\.brand-illustration svg\{[^}]*width:min\(100%,220px\)[^}]*height:auto/);
});
