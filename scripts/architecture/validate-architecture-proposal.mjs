#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT=resolve(process.cwd());
const errors=[];
const load=(p)=>{
  try { return JSON.parse(readFileSync(join(ROOT,p),'utf8')); }
  catch(e){ errors.push(`${p}: ${e.message}`); return null; }
};

const d=load('architecture/discovery.json');
const p=load('architecture/proposed.json');

if (d) {
  if (d.discovery_id!=='TEACH-ARCHITECTURE-DISCOVERY' || d.status!=='recorded') errors.push('architecture proposal: valid recorded discovery required');
  if ((d.decision_required||[]).length!==4) errors.push('architecture proposal: expected four discovery decision gates');
}

if (p) {
  if (p.proposal_id!=='TEACH-ARCHITECTURE-PROPOSAL') errors.push('architecture proposal: wrong id');
  if (p.version!=='0.1.0' || p.status!=='proposed') errors.push('architecture proposal: must remain proposed 0.1.0');
  if (p.approval_required!==true) errors.push('architecture proposal: approval_required must be true');
  for (const id of ['ARCH-D01','ARCH-D02','ARCH-D03','ARCH-D04','ARCH-D05']) {
    if (!p.recommendations?.[id]) errors.push(`architecture proposal: missing ${id}`);
  }
  const modules=p.recommendations?.['ARCH-D01']?.runtime_domain_modules||[];
  const expected=['Identity','Organization','Authorization','Content','Learning','Certification','AuditLifecycle','TransactionControl'];
  if (JSON.stringify(modules)!==JSON.stringify(expected)) errors.push('architecture proposal: runtime module recommendation drifted');

  const planes=p.recommendations?.['ARCH-D01']?.support_planes||[];
  const expectedPlanes=new Map([
    ['Observability','runtime infrastructure support'],
    ['VerificationEvidence','verification/release plane'],
    ['Governance','build-time/governance plane'],
  ]);
  for (const [domain,placement] of expectedPlanes) {
    const x=planes.find(v=>v.semantic_domain===domain);
    if (!x || x.placement!==placement) errors.push(`architecture proposal: ${domain} placement drifted`);
  }

  if ((p.architecture_rules||[]).length!==13) errors.push('architecture proposal: expected 13 architecture rules');
  if (p.readiness?.owner_approval!=='BLOCKED') errors.push('architecture proposal: owner approval must remain BLOCKED');
  if (p.readiness?.application_interfaces!=='BLOCKED until architecture owner approval') errors.push('architecture proposal: application interfaces must remain blocked');

  const text=JSON.stringify(p);
  for (const forbidden of ['LinkOAuthIdentity','GrantRole','RevokeRole','GrantCapability','RevokeCapability']) {
    if (text.includes(`"${forbidden}"`) && !text.includes('explicitly_not_decided')) {
      errors.push(`architecture proposal: blocked semantic ${forbidden} must not become architecture authority`);
    }
  }
}

if (errors.length) {
  console.error(`Architecture proposal FAILED (${errors.length} problem${errors.length===1?'':'s'}):`);
  for (const e of errors) console.error(`- ${e}`);
  process.exit(1);
}
console.log('Architecture proposal PASS');
console.log('Status: proposed');
console.log('Recommended runtime modules: 8');
console.log('Support planes: 3');
console.log('Architecture rules: 13');
console.log('Owner approval: BLOCKED');
