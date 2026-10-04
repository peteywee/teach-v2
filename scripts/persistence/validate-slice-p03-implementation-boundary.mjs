#!/usr/bin/env node
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const ROOT=resolve(process.cwd());
const errors=[];
const load=(p)=>JSON.parse(readFileSync(join(ROOT,p),'utf8'));
const text=(p)=>readFileSync(join(ROOT,p),'utf8');

const admission=load('persistence/physical-slices/identity-tokens/admission.json');
const registration=load('persistence/physical-slices/identity-tokens/registration.json');
const readiness=load('persistence/physical-slices/readiness.json');
const schema=text('src/modules/identity/infrastructure/persistence/token-schema.ts');
const invitationRepo=text('src/modules/identity/infrastructure/persistence/postgres-invitation-repository.ts');
const setupRepo=text('src/modules/identity/infrastructure/persistence/postgres-setup-token-repository.ts');
const resetRepo=text('src/modules/identity/infrastructure/persistence/postgres-password-reset-token-repository.ts');

if(admission?.version!=='1.0.0' || admission?.decision!=='ADMIT' || admission?.implementation_authorized!==true) errors.push('SLICE-P03 implementation: active ADMIT authority missing');
if(readiness?.version!=='1.3.0' || readiness?.candidate_slices?.find(x=>x.id==='SLICE-P03')?.current_state!=='ADMITTED') errors.push('SLICE-P03 implementation: readiness 1.3.0 ADMITTED state required');
if(readiness?.implementation_guard?.shared_or_production_migration_execution_authorized!==false) errors.push('SLICE-P03 implementation: shared/production migration execution must remain blocked');

const scope=registration?.scope_rules;
if(
  scope?.invitation_invited_identity_optional!==true ||
  scope?.invitation_owner_identity_required!==true ||
  scope?.setup_token_identity_required!==true ||
  scope?.password_reset_token_identity_required!==true ||
  scope?.protected_reads_writes_require_authoritative_identity_id!==true ||
  scope?.token_verifier_secret_read_exposure_forbidden!==true ||
  scope?.tenant_role_capability_authority_columns_forbidden!==true
) errors.push('SLICE-P03 implementation: exact owner-approved scope rules required');

for(const required of [
  'identity_invitations','identity_setup_tokens','identity_password_reset_tokens',
  'owner_identity_id','invited_identity_id','identity_id','secret_verifier','verifier_version',
  "interval '7 days'","interval '15 minutes'","interval '1 hour'"
]) if(!schema.includes(required)) errors.push(`SLICE-P03 implementation: schema missing ${required}`);

for(const forbidden of ['organization_id','location_id','role_id','capability_id','raw_secret'])
  if(schema.includes(forbidden)) errors.push(`SLICE-P03 implementation: forbidden authority/secret field ${forbidden}`);

if(!invitationRepo.includes('eq(invitations.ownerIdentityId,input.ownerIdentityId)')) errors.push('SLICE-P03 implementation: Invitation operations must scope by owner IdentityId');
for(const [name,body] of [['SetupToken',setupRepo],['PasswordResetToken',resetRepo]]) {
  if(!body.includes('eq(') || !body.includes('input.identityId')) errors.push(`SLICE-P03 implementation: ${name} operations must scope by IdentityId`);
  if(!body.includes("status:'CONSUMED'") || !body.includes("eq(")) errors.push(`SLICE-P03 implementation: ${name} atomic consume path missing`);
}

for(const file of walk(join(ROOT,'src','modules'))){
  const rel=relative(ROOT,file).replaceAll('\\','/');
  if(rel.startsWith('src/modules/identity/')) continue;
  const body=readFileSync(file,'utf8');
  if(body.includes('identity/infrastructure/persistence/token-schema') ||
     body.includes('postgres-invitation-repository') ||
     body.includes('postgres-setup-token-repository') ||
     body.includes('postgres-password-reset-token-repository')) {
    errors.push(`SLICE-P03 implementation: foreign module imports Identity token persistence: ${rel}`);
  }
}

if(errors.length){
  console.error(`SLICE-P03 IMPLEMENTATION BOUNDARY FAILED (${errors.length} problem${errors.length===1?'':'s'}):`);
  for(const error of errors) console.error(`- ${error}`);
  process.exit(1);
}
console.log('SLICE-P03 IMPLEMENTATION BOUNDARY PASS');
console.log('Identity token tables: 3');
console.log('Raw reusable secret persistence: forbidden');
console.log('Tenant/location/role/capability authority columns: forbidden');
console.log('Shared/production migration execution: BLOCKED');

function walk(dir){
  const out=[];
  for(const name of readdirSync(dir)){
    const path=join(dir,name);
    if(statSync(path).isDirectory()) out.push(...walk(path));
    else if(/\.(?:ts|js|mjs)$/.test(name)) out.push(path);
  }
  return out;
}

