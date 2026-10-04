#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { resolve, join } from 'node:path';

const ROOT=resolve(process.cwd());
const errors=[];
const load=(p)=>{ try{return JSON.parse(readFileSync(join(ROOT,p),'utf8'));}catch(e){errors.push(`${p}: ${e.message}`);return null;} };
const p=load('application-interfaces/proposed.json');
const d=load('application-interfaces/discovery.json');
const commands=load('kernel/commands.json');
const architecture=load('architecture/authority.json');

if (!architecture || architecture.version!=='1.0.0' || architecture.status!=='active') errors.push('application proposal: active Architecture 1.0.0 required');
if (!d || d.version!=='0.1.0' || d.status!=='recorded') errors.push('application proposal: recorded discovery required');
if (p) {
  if (p.proposal_id!=='TEACH-APPLICATION-INTERFACE-PROPOSAL' || p.version!=='0.1.0' || p.status!=='proposed') errors.push('application proposal: wrong identity/state');
  if (p.approval_required!==true) errors.push('application proposal: approval_required must be true');
  if ((p.principles||[]).length!==12) errors.push('application proposal: expected 12 principles');

  const approved=(commands?.entries||[]).filter(x=>x.status==='approved');
  const mapped=(p.command_interfaces||[]).flatMap(x=>x.commands||[]);
  if (mapped.length!==23 || new Set(mapped).size!==23) errors.push('application proposal: command interface coverage must be exactly 23 unique commands');
  for (const c of approved) {
    const owner=(p.command_interfaces||[]).find(x=>(x.commands||[]).includes(c.id));
    if (!owner) errors.push(`application proposal: ${c.id} unmapped`);
    else if (owner.module!==c.owning_domain) errors.push(`application proposal: ${c.id} mapped to ${owner.module}, expected ${c.owning_domain}`);
  }
  for (const id of ['AuthorizationDecisionInterface','AuditAppendInterface','ObservabilitySinkInterface','ExternalProviderReadbackInterface']) {
    if (!(p.policy_and_cross_cutting_interfaces||[]).find(x=>x.id===id)) errors.push(`application proposal: missing ${id}`);
  }
  for (const id of ['IdentityAuthorityReadInterface','OrganizationAuthorityReadInterface','ContentReadInterface']) {
    if (!(p.owner_read_interfaces||[]).find(x=>x.id===id)) errors.push(`application proposal: missing ${id}`);
  }
  for (const useCase of ['AcceptInvitation','OffboardIdentity']) {
    if (!(p.explicit_cross_domain_orchestrations||[]).find(x=>x.use_case===useCase)) errors.push(`application proposal: missing ${useCase} orchestration`);
  }
  if (p.readiness?.owner_approval!=='BLOCKED') errors.push('application proposal: owner approval must remain BLOCKED');
  if (p.readiness?.persistence_model!=='BLOCKED until Application Interface approval') errors.push('application proposal: persistence must remain blocked');

  const forbiddenKeys=['tables','sql','http_routes','route_inventory','physical_packages'];
  for (const k of forbiddenKeys) if (Object.prototype.hasOwnProperty.call(p,k)) errors.push(`application proposal: forbidden premature key ${k}`);
}

if (errors.length) {
  console.error(`Application interface proposal FAILED (${errors.length} problem${errors.length===1?'':'s'}):`);
  for (const e of errors) console.error(`- ${e}`);
  process.exit(1);
}
console.log('Application interface proposal PASS');
console.log('Command coverage: 23/23');
console.log('Application Interface approval: BLOCKED');
console.log('Persistence: still deferred');
