#!/usr/bin/env node
import { resolve, join } from 'node:path';
import { readFileSync, existsSync } from 'node:fs';
import { runAuditStage,finishAudit,sourceIdentity } from './development-self-audit.mjs';
const root=resolve(process.cwd()),args=process.argv.slice(2);
try {
  if(args.length===1&&args[0]==='--finish') {const r=finishAudit(root);console.log(JSON.stringify(r,null,2));process.exit(r.state==='PROVEN'?0:1);}
  let id;
  if(args.length===2&&args[0]==='--stage')id=args[1];
  else if(args.length)throw new Error('usage: self-audit [--stage ID | --finish]');
  else {
    const plan=JSON.parse(readFileSync(join(root,'verification/whole-repository/self-audit-plan.json'),'utf8')),source=sourceIdentity(root);
    id=plan.stages.find(stage=>{const path=join(root,`verification/generated/self-audit/${stage.id}.json`);if(!existsSync(path))return true;const r=JSON.parse(readFileSync(path,'utf8'));return r.source?.stamp!==source.stamp||r.exit_code!==0;})?.id;
    if(!id){console.log('All checkpoints recorded. Run self-audit --finish to evaluate exact-source evidence.');process.exit(0);}
  }
  const result=runAuditStage(root,id);process.stdout.write(result.stdout);process.stderr.write(result.stderr);
  console.log(`SELF-AUDIT CHECKPOINT ${id}: ${result.report.state}; source ${result.report.source.source_sha}; bounded evidence saved`);
  process.exit(result.report.exit_code===0&&result.report.source_unchanged?0:1);
} catch(error){console.error(`SELF-AUDIT BLOCKED: ${error.message}`);process.exit(1);}
