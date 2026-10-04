import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

export function inspectCommandCoverage(root) {
  const errors=[],fail=message=>errors.push(`command coverage: ${message}`);
  const load=path=>{try{return JSON.parse(readFileSync(join(root,path),'utf8'));}catch(error){fail(`${path}: ${error.message}`);return null;}};
  const record=load('verification/whole-repository/command-coverage.json'),kernel=load('kernel/commands.json'),app=load('application-interfaces/authority.json');
  const commands=(kernel?.entries||[]).filter(x=>x.status==='approved'),rows=record?.commands;
  if(record?.version!=='0.1.0' || record?.full_runtime_conformance!=='UNKNOWN' || record?.shared_or_production_execution_authorized!==false) fail('limited evidence scope and execution BLOCK must remain explicit');
  if(!Array.isArray(rows)) {fail('complete command ledger required');return errors;}
  if(rows.length!==commands.length || new Set(rows.map(x=>x?.command)).size!==commands.length || rows.some(x=>!commands.some(c=>c.id===x?.command))) fail('exact approved command inventory required');
  for(const command of commands) {
    const row=rows.find(x=>x.command===command.id);
    if(!row) continue;
    const boundary=(app?.command_interfaces||[]).filter(x=>x.commands?.includes(command.id));
    if(row.owner!==command.owning_domain || boundary.length!==1 || boundary[0].module!==row.owner || JSON.stringify(row.authority_requirements)!==JSON.stringify(command.promotion_evidence)) fail(`${command.id}: owner/authority drift`);
    if(!['PARTIAL','BLOCKED'].includes(row.state) || row.runtime_conformance!=='UNKNOWN' || row.runtime_activation!=='BLOCKED') fail(`${command.id}: full runtime conformance cannot be claimed`);
    if(!Array.isArray(row.missing_obligations) || !row.missing_obligations.length || row.missing_obligations.some(x=>typeof x!=='string' || !x.trim())) fail(`${command.id}: missing obligations must remain explicit`);
    const module=row.owner.replace(/[A-Z]/g,(c,i)=>(i?'-':'')+c.toLowerCase());
    if(!Array.isArray(row.artifacts) || !Array.isArray(row.tests)) {fail(`${command.id}: artifact/test arrays required`);continue;}
    if(row.state==='PARTIAL' && (!row.artifacts.length || !row.tests.length) || row.state==='BLOCKED' && (row.artifacts.length || row.tests.length)) fail(`${command.id}: partial/blocked source classification mismatch`);
    for(const artifact of row.artifacts) {
      if(typeof artifact.path!=='string' || !artifact.path.startsWith(`src/modules/${module}/`) || artifact.path.includes('..') || !existsSync(join(root,artifact.path))) {fail(`${command.id}: owner artifact missing`);continue;}
      const source=readFileSync(join(root,artifact.path),'utf8');
      if(typeof artifact.symbol!=='string' || !artifact.symbol.trim() || !new RegExp(`\\b${artifact.symbol.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}\\s*\\(`).test(source)) fail(`${command.id}: source symbol missing`);
      if(!['application-foundation','repository-foundation'].includes(artifact.kind) || artifact.kind==='application-foundation' && !artifact.path.includes('/application/') || artifact.kind==='repository-foundation' && !artifact.path.includes('/infrastructure/')) fail(`${command.id}: source foundation kind mismatch`);
    }
    for(const path of row.tests) if(typeof path!=='string' || path.includes('..') || !/\.test\.ts$/.test(path) || !existsSync(join(root,path))) fail(`${command.id}: referenced test missing`);
  }
  return errors;
}
