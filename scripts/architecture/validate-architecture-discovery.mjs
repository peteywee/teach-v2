#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { resolve, join } from 'node:path';

const ROOT=resolve(process.cwd());
const errors=[];
const load=(p)=>{
  try { return JSON.parse(readFileSync(join(ROOT,p),'utf8')); }
  catch(e){ errors.push(`${p}: ${e.message}`); return null; }
};

const d=load('architecture/discovery.json');
if (d) {
  if (d.discovery_id!=='TEACH-ARCHITECTURE-DISCOVERY') errors.push('architecture discovery: wrong id');
  if (d.version!=='0.1.0' || d.status!=='recorded') errors.push('architecture discovery: must remain recorded 0.1.0');
  if (d.baseline?.commit!=='0f37206e5a646b34c1ccd7158f1fcaee1268fe95') errors.push('architecture discovery: baseline commit drifted');
  if (d.baseline?.kernel_version!=='0.12.0') errors.push('architecture discovery: historical K00 baseline must remain 0.12.0');
  if (d.baseline?.ownership_map_version!=='1.6.0') errors.push('architecture discovery: historical ownership baseline must remain 1.6.0');

  const domains=d.current_semantic_domains||[];
  if (domains.length!==11) errors.push(`architecture discovery: expected 11 semantic domains, found ${domains.length}`);
  for (const id of ['ARCH-F01','ARCH-F02','ARCH-F03','ARCH-F04','ARCH-F05']) {
    const x=(d.discovered_architecture_facts||[]).find(v=>v.id===id);
    if (!x || x.state!=='PROVEN') errors.push(`architecture discovery: ${id} must be PROVEN`);
  }
  for (const id of ['ARCH-D01','ARCH-D02','ARCH-D03','ARCH-D04']) {
    const x=(d.decision_required||[]).find(v=>v.id===id);
    if (!x || x.state!=='BLOCKED') errors.push(`architecture discovery: ${id} must remain BLOCKED before owner approval`);
  }
  const s=d.semantic_constraints_not_resolved_by_architecture||{};
  const expected={candidate_events:10,discovery_blocked_command_proposals:8,remaining_core_missing_kernel_candidates:9,candidate_relationships:18,candidate_invariants:22,candidate_decision_tables:8};
  for (const [k,v] of Object.entries(expected)) if (s[k]!==v) errors.push(`architecture discovery: ${k} must remain historical snapshot ${v}`);
  if (d.readiness?.architecture_approval!=='BLOCKED') errors.push('architecture discovery: architecture approval must remain BLOCKED');
}

if (errors.length) {
  console.error(`Architecture discovery FAILED (${errors.length} problem${errors.length===1?'':'s'}):`);
  for (const e of errors) console.error(`- ${e}`);
  process.exit(1);
}
console.log('Architecture discovery PASS');
console.log('Semantic domains observed: 11');
console.log('Architecture facts: 5 PROVEN');
console.log('Architecture decisions: 4 BLOCKED');
console.log('K00 mutation: none');
