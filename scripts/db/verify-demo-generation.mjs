import { inspectKitchenPhysicalSuccessor } from '../persistence/demo-kitchen-physical-successor.mjs';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {cpSync,mkdtempSync,readFileSync,rmSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,relative,resolve} from 'node:path';
import { inspectDemoRecipePhysicalSuccessor, DEMO_RECIPE_MIGRATION, DEMO_RECIPE_SNAPSHOT } from '../persistence/demo-recipes-physical-successor.mjs';
const root=resolve(process.cwd()),dir=mkdtempSync(join(tmpdir(),'demo-generated-'));
try{
 const recipe=inspectDemoRecipePhysicalSuccessor(root);assert.deepEqual(recipe.errors,[],'recipe predecessor generation requires verified physical successor');
 const kitchen=inspectKitchenPhysicalSuccessor(root);assert.deepEqual(kitchen.errors,[],'kitchen predecessor generation requires verified physical successor');
 cpSync(join(root,'drizzle'),dir,{recursive:true});
 if(kitchen.admitted){rmSync(join(dir,'0007_demo_kitchen_content_guard.sql'));rmSync(join(dir,'meta/0007_snapshot.json'));}
 if(recipe.admitted){rmSync(join(dir,DEMO_RECIPE_MIGRATION.slice('drizzle/'.length)));rmSync(join(dir,DEMO_RECIPE_SNAPSHOT.slice('drizzle/'.length)));}
 rmSync(join(dir,'0005_demo_runtime_owner_storage.sql'));rmSync(join(dir,'meta/0005_snapshot.json'));
 const journal=JSON.parse(readFileSync(join(dir,'meta/_journal.json'),'utf8'));journal.entries=journal.entries.filter(entry=>entry.idx<5);writeFileSync(join(dir,'meta/_journal.json'),JSON.stringify(journal));
 const config=join(dir,'generation.config.ts');writeFileSync(config,`import config from ${JSON.stringify(join(root,'drizzle.config.ts'))};\nexport default {...config,out:${JSON.stringify(relative(root,dir))}};\n`);
 execFileSync('pnpm',['exec','drizzle-kit','generate','--name','demo_runtime_owner_storage','--config',config],{cwd:root,encoding:'utf8',timeout:25000,stdio:'pipe'});
 const committed=readFileSync(join(root,'drizzle/0005_demo_runtime_owner_storage.sql'),'utf8');const marker='\n--> statement-breakpoint\n-- Reviewed demo owner guards.';assert.ok(committed.includes(marker));const generatedPart=committed.slice(committed.indexOf('CREATE TABLE ')).split(marker)[0].trim();
 assert.equal(readFileSync(join(dir,'0005_demo_runtime_owner_storage.sql'),'utf8').trim(),generatedPart);
 const generated=JSON.parse(readFileSync(join(dir,'meta/0005_snapshot.json'),'utf8')),snapshot=JSON.parse(readFileSync(join(root,'drizzle/meta/0005_snapshot.json'),'utf8'));delete generated.id;delete snapshot.id;assert.deepEqual(generated,snapshot);assert.equal(Object.keys(snapshot.tables).length,22);
 console.log('DEMO PINNED DRIZZLE GENERATION PASS: 14 new tables, 22 total; prior five immutable');
}finally{rmSync(dir,{recursive:true,force:true});}
