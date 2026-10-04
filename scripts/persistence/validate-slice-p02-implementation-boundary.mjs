#!/usr/bin/env node
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const ROOT=resolve(process.cwd());
const errors=[];
const load=(p)=>JSON.parse(readFileSync(join(ROOT,p),'utf8'));
const text=(p)=>readFileSync(join(ROOT,p),'utf8');

const admission=load('persistence/physical-slices/identity-session/admission.json');
const registration=load('persistence/physical-slices/identity-session/registration.json');
const readiness=load('persistence/physical-slices/readiness.json');
const schema=text('src/modules/identity/infrastructure/persistence/schema.ts');
const identityRepo=text('src/modules/identity/infrastructure/persistence/postgres-identity-repository.ts');
const sessionRepo=text('src/modules/identity/infrastructure/persistence/postgres-application-session-repository.ts');
const sessionDomain=text('src/modules/identity/domain/application-session.ts');
const migration=text('drizzle/0001_odd_photon.sql');
const drizzleConfig=text('drizzle.config.ts');

if(admission?.version!=='1.0.0' || admission?.decision!=='ADMIT' || admission?.implementation_authorized!==true) errors.push('SLICE-P02 implementation: active ADMIT authority missing');
if(readiness?.version!=='1.3.0' || readiness?.current_physical_slice_admissions?.find(x=>x.id==='SLICE-P02')?.implementation_state!=='IMPLEMENTED') errors.push('SLICE-P02 implementation: readiness 1.3.0 IMPLEMENTED state required');
if(readiness?.implementation_guard?.shared_or_production_migration_execution_authorized!==false) errors.push('SLICE-P02 implementation: shared/production migration execution must remain blocked');

const ownership=registration?.ownership_scope_decision;
if(
  ownership?.identity_organization_owned!==false ||
  ownership?.application_session_identity_fk_required!==true ||
  ownership?.tenant_authority_columns_forbidden!==true ||
  ownership?.protected_session_queries_require_authoritative_identity_id!==true ||
  ownership?.cross_identity_admin_access_requires_external_authorization!==true
) errors.push('SLICE-P02 implementation: exact owner-approved scope decision required');

const tables=schema.match(/pgTable\(/g)??[];
if(tables.length!==2) errors.push(`SLICE-P02 implementation: Identity schema must define exactly 2 tables, found ${tables.length}`);
for(const required of ['identity_identities','identity_application_sessions','credential_verifier','verifier_version','identity_id']) if(!schema.includes(required)) errors.push(`SLICE-P02 implementation: schema missing ${required}`);
for(const forbidden of ['organization_id','location_id','role_id','capability_id','raw_credential']) if(schema.includes(forbidden)) errors.push(`SLICE-P02 implementation: forbidden authority/credential field ${forbidden}`);
if(!schema.includes("dataType() {\n    return 'bytea';") || !schema.includes("octet_length(")) errors.push('SLICE-P02 implementation: 32-byte verifier storage proof missing');

if(identityRepo.includes("status: 'DELETED'") || identityRepo.includes('"DELETED"')) errors.push('SLICE-P02 implementation: repository must not implement Identity DELETED ingress');
if(!identityRepo.includes('for update') || !identityRepo.includes("status: 'REVOKED'") || !identityRepo.includes('applicationSessions.identityId')) errors.push('SLICE-P02 implementation: deactivation must lock Identity and revoke ACTIVE sessions atomically');
if(!sessionRepo.includes('for update') || !sessionRepo.includes('identityId: input.identityId') || !sessionRepo.includes('eq(applicationSessions.identityId, input.identityId)')) errors.push('SLICE-P02 implementation: session issuance/authentication and protected access must synchronize/scope by IdentityId');
if(!sessionRepo.includes("interval '30 minutes'") || !sessionRepo.includes('Denial is authoritative even when lazy EXPIRED persistence fails')) errors.push('SLICE-P02 implementation: atomic current-state authentication/expiry proof missing');
if(!sessionDomain.includes("randomBytes(SESSION_CREDENTIAL_BYTES)") || !sessionDomain.includes("Buffer.from('teach-session-v1\\0'")) errors.push('SLICE-P02 implementation: approved verifier construction missing');
if(!migration.includes('BEFORE INSERT OR UPDATE ON "identity_identities"') || !migration.includes('Identity DELETED ingress is not authorized')) errors.push('SLICE-P02 implementation: insert/update DELETED guard missing from immutable migration');
if((migration.match(/CREATE TABLE "identity_/g)??[]).length!==2) errors.push('SLICE-P02 implementation: immutable migration must create exactly two Identity-owned tables');
if(!drizzleConfig.includes("./src/modules/identity/infrastructure/persistence/schema.ts")) errors.push('SLICE-P02 implementation: live Drizzle config must include Identity schema');

for(const file of walk(join(ROOT,'src','modules'))){
  const rel=relative(ROOT,file).replaceAll('\\','/');
  if(rel.startsWith('src/modules/identity/')) continue;
  const body=readFileSync(file,'utf8');
  if(body.includes('identity/infrastructure/persistence')) errors.push(`SLICE-P02 implementation: foreign module imports Identity persistence: ${rel}`);
}

if(errors.length){
 console.error(`SLICE-P02 IMPLEMENTATION BOUNDARY FAILED (${errors.length} problem${errors.length===1?'':'s'}):`);
 for(const error of errors) console.error(`- ${error}`);
 process.exit(1);
}
console.log('SLICE-P02 IMPLEMENTATION BOUNDARY PASS');
console.log('Identity tables: 2');
console.log('Raw credential persistence: forbidden');
console.log('Tenant/role/capability authority columns: forbidden');
console.log('Identity DELETED ingress: absent');
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

