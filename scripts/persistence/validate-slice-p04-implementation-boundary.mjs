#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT=resolve(process.cwd());
const errors=[];
const load=(p)=>{try{return JSON.parse(readFileSync(join(ROOT,p),'utf8'));}catch(e){errors.push(`${p}: ${e.message}`);return null;}};
const text=(p)=>{try{return readFileSync(join(ROOT,p),'utf8');}catch(e){errors.push(`${p}: ${e.message}`);return '';}};

const admission=load('persistence/physical-slices/identity-credentials/admission.json');
const journal=load('drizzle/meta/_journal.json');
const snapshot=load('drizzle/meta/0003_snapshot.json');
const migration=text('drizzle/0003_slice_p04_credential.sql');
const schema=text('src/modules/identity/infrastructure/persistence/credential-schema.ts');
const repo=text('src/modules/identity/infrastructure/persistence/postgres-credential-repository.ts');
const domain=text('src/modules/identity/domain/credential.ts');
const config=text('drizzle.config.ts');

if(admission?.version!=='1.1.0' || admission?.decision!=='ADMIT' || admission?.implementation_authorized!==true || admission?.migration_authoring_authorized!==true) errors.push('SLICE-P04 implementation: active ADMIT authority missing');
if(!config.includes("./src/modules/identity/infrastructure/persistence/credential-schema.ts")) errors.push('SLICE-P04 implementation: Drizzle config must include Credential schema');
if(!schema.includes("'identity_credentials'") || !schema.includes('.references(() => identities.id')) errors.push('SLICE-P04 implementation: Credential schema/table/FK definition missing');
if(/organization|location|role|capability/i.test(schema)) errors.push('SLICE-P04 implementation: Credential schema must not copy tenant/role/capability authority');
if(!repo.includes('eq(credentials.identityId, input.identityId)')) errors.push('SLICE-P04 implementation: protected repository queries must scope by authoritative IdentityId');
if(!domain.includes('passwordHash') || !domain.includes('Credential identityId is required')) errors.push('SLICE-P04 implementation: Credential domain invariants missing');

const j3=(journal?.entries||[]).find(x=>x.idx===3);
if(!j3 || j3.tag!=='0003_slice_p04_credential') errors.push('SLICE-P04 implementation: authoritative Drizzle journal must include idx 3 P04 migration');
if(!existsSync(join(ROOT,'drizzle/meta/0003_snapshot.json')) || !snapshot?.tables?.['public.identity_credentials']) errors.push('SLICE-P04 implementation: generated P04 snapshot must contain public.identity_credentials');
if(!migration.includes('CREATE TABLE "identity_credentials"')) errors.push('SLICE-P04 implementation: Credential migration table missing');
if(!migration.includes('REFERENCES "public"."identity_identities"("id")')) errors.push('SLICE-P04 implementation: Credential FK must target public.identity_identities(id)');
if(migration.includes('REFERENCES "identities"')) errors.push('SLICE-P04 implementation: stale invalid identities FK forbidden');
if(/CREATE TABLE "(organizations|memberships|locations|entitlements)"/i.test(migration)) errors.push('SLICE-P04 implementation: foreign persistence tables forbidden');

if(errors.length){
 console.error(`SLICE-P04 IMPLEMENTATION BOUNDARY FAILED (${errors.length} problem${errors.length===1?'':'s'}):`);
 for(const e of errors) console.error(`- ${e}`);
 process.exit(1);
}
console.log('SLICE-P04 IMPLEMENTATION BOUNDARY PASS');
console.log('Credential table: identity_credentials');
console.log('P04 migration: journaled idx 3');
console.log('Credential FK: public.identity_identities(id)');
console.log('Tenant/role/capability authority copying: forbidden');
