import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {cpSync,mkdtempSync,readFileSync,rmSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,relative,resolve} from 'node:path';
const root=resolve(process.cwd()),dir=mkdtempSync(join(tmpdir(),'demo-generated-'));
try{
 cpSync(join(root,'drizzle'),dir,{recursive:true});rmSync(join(dir,'0005_demo_runtime_owner_storage.sql'));rmSync(join(dir,'meta/0005_snapshot.json'));
 const journal=JSON.parse(readFileSync(join(dir,'meta/_journal.json'),'utf8'));journal.entries=journal.entries.filter(entry=>entry.idx<5);writeFileSync(join(dir,'meta/_journal.json'),JSON.stringify(journal));
 const config=join(dir,'generation.config.ts');writeFileSync(config,`import config from ${JSON.stringify(join(root,'drizzle.config.ts'))};\nexport default {...config,out:${JSON.stringify(relative(root,dir))}};\n`);
 execFileSync('pnpm',['exec','drizzle-kit','generate','--name','demo_runtime_owner_storage','--config',config],{cwd:root,encoding:'utf8',timeout:25000,stdio:'pipe'});
 const committed=readFileSync(join(root,'drizzle/0005_demo_runtime_owner_storage.sql'),'utf8');const marker='\n--> statement-breakpoint\n-- Reviewed demo owner guards.';assert.ok(committed.includes(marker));const generatedPart=committed.slice(committed.indexOf('CREATE TABLE ')).split(marker)[0].trim();
 assert.equal(readFileSync(join(dir,'0005_demo_runtime_owner_storage.sql'),'utf8').trim(),generatedPart);
 const generated=JSON.parse(readFileSync(join(dir,'meta/0005_snapshot.json'),'utf8')),snapshot=JSON.parse(readFileSync(join(root,'drizzle/meta/0005_snapshot.json'),'utf8'));delete generated.id;delete snapshot.id;assert.deepEqual(generated,snapshot);assert.equal(Object.keys(snapshot.tables).length,22);
 console.log('DEMO PINNED DRIZZLE GENERATION PASS: 14 new tables, 22 total; prior five immutable');
}finally{rmSync(dir,{recursive:true,force:true});}
