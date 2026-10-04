#!/usr/bin/env node
import { readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { inspectRepositoryIntegration } from './repository-integration-evidence.mjs';

const root=resolve(process.cwd());
const errors=inspectRepositoryIntegration(root);
const excluded=new Set(['tests','packaging','release']);
const scripts=[];
for(const dir of readdirSync(join(root,'scripts'),{withFileTypes:true})) {
  if(!dir.isDirectory() || excluded.has(dir.name)) continue;
  for(const file of readdirSync(join(root,'scripts',dir.name))) {
    const path=`scripts/${dir.name}/${file}`;
    if(/^(?:validate|audit)-.*\.mjs$/.test(file) && path!=='scripts/architecture/validate-whole-repository.mjs') scripts.push(path);
  }
}
scripts.sort();
for(const path of scripts) {
  const result=spawnSync(process.execPath,[path],{cwd:root,encoding:'utf8',timeout:5000});
  if(result.status!==0) errors.push(`${path}: ${result.error?.message||((result.stdout||'')+(result.stderr||'')).trim()}`);
}
if(errors.length){console.error(`WHOLE-REPOSITORY AUDIT FAILED (${errors.length})\n${errors.join('\n')}`);process.exit(1);}
console.log(`WHOLE-REPOSITORY AUDIT PASS: ${scripts.length} standalone authority/admission validators`);
console.log('PROVEN: module/layer dependency checks, Application-owned repository ports, isolated execution entry guards, future queue/admission reconciliation');
console.log('BLOCK: P06 admission; UNKNOWN: full runtime authorization/audit/orchestration conformance; BLOCKED: shared/production execution');
