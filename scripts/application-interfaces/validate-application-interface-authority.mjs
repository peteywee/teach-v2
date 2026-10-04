#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { resolve, join } from 'node:path';

const ROOT=resolve(process.cwd());
const errors=[];
const load=(p)=>{ try{return JSON.parse(readFileSync(join(ROOT,p),'utf8'));}catch(e){errors.push(`${p}: ${e.message}`);return null;} };

const authority=load('application-interfaces/authority.json');
const proposal=load('application-interfaces/proposed.json');
const discovery=load('application-interfaces/discovery.json');
const architecture=load('architecture/authority.json');
const commands=load('kernel/commands.json');
const events=load('kernel/events.json');

if (architecture?.version!=='1.0.0' || architecture?.status!=='active') errors.push('application authority: Architecture 1.0.0 active required');
if (proposal?.version!=='0.1.0' || proposal?.status!=='proposed') errors.push('application authority: preserved proposal 0.1.0 required');
if (discovery?.version!=='0.1.0' || discovery?.status!=='recorded') errors.push('application authority: recorded discovery required');

if (authority) {
  if (authority.authority_id!=='TEACH-APPLICATION-INTERFACES' || authority.version!=='1.0.0' || authority.status!=='active') errors.push('application authority: wrong identity/state');
  if (!/^#(?:\d+|REHEARSAL)$/.test(authority.approval_issue||'')) errors.push('application authority: invalid approval issue');
  if ((authority.principles||[]).length!==12) errors.push('application authority: expected 12 principles');

  const approved=(commands?.entries||[]).filter(x=>x.status==='approved');
  const mapped=(authority.command_interfaces||[]).flatMap(x=>x.commands||[]);
  if (approved.length!==23 || mapped.length!==23 || new Set(mapped).size!==23) errors.push('application authority: 23/23 unique command mapping required');
  for (const c of approved) {
    const x=(authority.command_interfaces||[]).find(v=>(v.commands||[]).includes(c.id));
    if (!x) errors.push(`application authority: ${c.id} unmapped`);
    else if (x.module!==c.owning_domain) errors.push(`application authority: ${c.id} owner mismatch`);
  }

  for (const id of ['AuthorizationDecisionInterface','AuditAppendInterface','ObservabilitySinkInterface','ExternalProviderReadbackInterface']) {
    if (!(authority.policy_and_cross_cutting_interfaces||[]).find(x=>x.id===id)) errors.push(`application authority: missing ${id}`);
  }
  for (const id of ['IdentityAuthorityReadInterface','OrganizationAuthorityReadInterface','ContentReadInterface']) {
    if (!(authority.owner_read_interfaces||[]).find(x=>x.id===id)) errors.push(`application authority: missing ${id}`);
  }
  for (const useCase of ['AcceptInvitation','OffboardIdentity']) {
    if (!(authority.explicit_cross_domain_orchestrations||[]).find(x=>x.use_case===useCase)) errors.push(`application authority: missing ${useCase} orchestration`);
  }

  if (authority.next_stage!=='Persistence Model') errors.push('application authority: next stage must be Persistence Model');
}

if ((events?.entries||[]).filter(x=>x.status==='candidate').length!==10) errors.push('application authority: candidate events must remain 10');

if (errors.length) {
  console.error(`Application Interface authority FAILED (${errors.length} problem${errors.length===1?'':'s'}):`);
  for (const e of errors) console.error(`- ${e}`);
  process.exit(1);
}
console.log('Application Interface authority PASS');
console.log('Application Interfaces: active 1.0.0');
console.log('Command coverage: 23/23');
console.log('Next stage: Persistence Model');
