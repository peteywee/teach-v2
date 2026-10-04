import { assertIsolatedDatabaseTarget } from '../../../scripts/db/isolated-database-target.mjs';
import { observeLockWait } from '../../helpers/observe-lock-wait.js';
import assert from 'node:assert/strict';
import { after,before,beforeEach,test } from 'node:test';
import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import { PostgresIdentityRepository } from '../../../src/modules/identity/infrastructure/persistence/postgres-identity-repository.js';
import { PostgresInvitationRepository } from '../../../src/modules/identity/infrastructure/persistence/postgres-invitation-repository.js';
import { PostgresSetupTokenRepository } from '../../../src/modules/identity/infrastructure/persistence/postgres-setup-token-repository.js';
import { PostgresPasswordResetTokenRepository } from '../../../src/modules/identity/infrastructure/persistence/postgres-password-reset-token-repository.js';
import {
  acceptInvitation,
  consumeIdentityToken,
  issueIdentityToken,
  issueInvitation,
} from '../../../src/modules/identity/application/identity-token-service.js';
import { deriveSingleUseVerifier } from '../../../src/modules/identity/domain/single-use-secret.js';
import * as identitySchema from '../../../src/modules/identity/infrastructure/persistence/schema.js';
import * as tokenSchema from '../../../src/modules/identity/infrastructure/persistence/token-schema.js';

const {Pool}=pg;
const connectionString=assertIsolatedDatabaseTarget(process.env.DATABASE_URL);
if(!connectionString) throw new Error('DATABASE_URL is required');
const pool=new Pool({connectionString});
const db=drizzle(pool,{schema:{...identitySchema,...tokenSchema}});
const identities=new PostgresIdentityRepository(db);
const invitations=new PostgresInvitationRepository(db);
const setupTokens=new PostgresSetupTokenRepository(db);
const resetTokens=new PostgresPasswordResetTokenRepository(db);

before(async()=>{await pool.query('select 1');});
beforeEach(async()=>{
  await pool.query('truncate table identity_invitations, identity_setup_tokens, identity_password_reset_tokens, identity_application_sessions, identity_identities cascade');
});
after(async()=>{await pool.end();});

async function active(id:string,now=new Date('2026-10-04T12:00:00Z')){
  await identities.create({id,now});
}

test('Invitation stores only verifier material, exact 7-day expiry, and optional invited Identity',async()=>{
  const now=new Date('2026-10-04T12:00:00Z');
  await active('owner',now);
  const issued=await issueInvitation(invitations,{id:'inv-1',ownerIdentityId:'owner',invitedIdentityId:null,now});
  const row=await pool.query<{secret_verifier:Buffer;expires_at:Date;invited_identity_id:string|null}>(
    'select secret_verifier,expires_at,invited_identity_id from identity_invitations where id=$1',['inv-1']);
  assert.deepEqual(row.rows[0]?.secret_verifier,deriveSingleUseVerifier(issued.secret));
  assert.equal(row.rows[0]?.invited_identity_id,null);
  assert.equal(new Date(row.rows[0]!.expires_at).getTime()-now.getTime(),7*24*60*60*1000);
});

test('Invitation owner Identity is required and distinct from optional invited Identity',async()=>{
  const now=new Date('2026-10-04T12:00:00Z');
  await active('owner',now); await active('invitee',now);
  const issued=await issueInvitation(invitations,{id:'inv-1',ownerIdentityId:'owner',invitedIdentityId:'invitee',now});
  assert.equal(issued.invitation.ownerIdentityId,'owner');
  assert.equal(issued.invitation.invitedIdentityId,'invitee');
  assert.equal(await invitations.getById({id:'inv-1',ownerIdentityId:'invitee'}),null);
});

test('inactive invited Identity is rejected until explicitly reactivated',async()=>{
  const now=new Date('2026-10-04T12:00:00Z');
  await active('owner',now); await active('invitee',now);
  await identities.deactivate({id:'invitee',now:new Date('2026-10-04T12:01:00Z')});
  await assert.rejects(
    issueInvitation(invitations,{id:'inv-1',ownerIdentityId:'owner',invitedIdentityId:'invitee',now:new Date('2026-10-04T12:02:00Z')}),
    /authoritative Identity must be ACTIVE/,
  );
  assert.equal((await pool.query('select count(*)::int as count from identity_invitations')).rows[0]?.count,0);
});

test('concurrent Invitation acceptance is single-use: exactly one success',async()=>{
  const now=new Date('2026-10-04T12:00:00Z');
  await active('owner',now);
  const issued=await issueInvitation(invitations,{id:'inv-1',ownerIdentityId:'owner',invitedIdentityId:null,now});
  const at=new Date('2026-10-04T12:01:00Z');
  const results=await Promise.all(Array.from({length:16},()=>acceptInvitation(invitations,{ownerIdentityId:'owner',secret:issued.secret,now:at})));
  assert.equal(results.filter(Boolean).length,1);
  assert.equal((await invitations.getById({id:'inv-1',ownerIdentityId:'owner'}))?.status,'ACCEPTED');
});

test('revoked and expired Invitations reject acceptance',async()=>{
  const now=new Date('2026-10-04T12:00:00Z');
  await active('owner',now);
  const revoked=await issueInvitation(invitations,{id:'inv-r',ownerIdentityId:'owner',invitedIdentityId:null,now});
  await invitations.revoke({id:'inv-r',ownerIdentityId:'owner',now:new Date('2026-10-04T12:01:00Z')});
  assert.equal(await acceptInvitation(invitations,{ownerIdentityId:'owner',secret:revoked.secret,now:new Date('2026-10-04T12:02:00Z')}),null);

  const expired=await issueInvitation(invitations,{id:'inv-e',ownerIdentityId:'owner',invitedIdentityId:null,now});
  assert.equal(await acceptInvitation(invitations,{ownerIdentityId:'owner',secret:expired.secret,now:new Date(now.getTime()+7*24*60*60*1000)}),null);
  assert.equal((await invitations.getById({id:'inv-e',ownerIdentityId:'owner'}))?.status,'EXPIRED');
});

for(const [label,repository,lifetime] of [
  ['SetupToken',setupTokens,15*60*1000],
  ['PasswordResetToken',resetTokens,60*60*1000],
] as const){
  test(`${label} has exact lifetime, required Identity ownership, and atomic single-use consumption`,async()=>{
    const now=new Date('2026-10-04T12:00:00Z');
    await active('owner',now);
    const issued=await issueIdentityToken(repository,{id:`${label}-1`,identityId:'owner',now});
    assert.equal(issued.token.expiresAt.getTime()-now.getTime(),lifetime);
    const at=new Date(now.getTime()+1000);
    const results=await Promise.all(Array.from({length:16},()=>consumeIdentityToken(repository,{identityId:'owner',secret:issued.secret,now:at})));
    assert.equal(results.filter(Boolean).length,1);
    assert.equal(results.find(Boolean)?.status,'CONSUMED');
  });

  test(`${label} rejects wrong Identity, revocation, and exact expiry boundary`,async()=>{
    const now=new Date('2026-10-04T12:00:00Z');
    await active('owner',now); await active('other',now);
    const revoked=await issueIdentityToken(repository,{id:`${label}-r`,identityId:'owner',now});
    assert.equal(await consumeIdentityToken(repository,{identityId:'other',secret:revoked.secret,now:new Date(now.getTime()+1)}),null);
    await repository.revoke({id:`${label}-r`,identityId:'owner',now:new Date(now.getTime()+2)});
    assert.equal(await consumeIdentityToken(repository,{identityId:'owner',secret:revoked.secret,now:new Date(now.getTime()+3)}),null);

    const expired=await issueIdentityToken(repository,{id:`${label}-e`,identityId:'owner',now});
    assert.equal(await consumeIdentityToken(repository,{identityId:'owner',secret:expired.secret,now:new Date(now.getTime()+lifetime)}),null);
  });
}

test('P03 tables copy no tenant/location/role/capability authority and contain no raw secret field',async()=>{
  const rows=await pool.query<{table_name:string;column_name:string}>(
    `select table_name,column_name from information_schema.columns
      where table_schema='public' and table_name in
      ('identity_invitations','identity_setup_tokens','identity_password_reset_tokens')
      order by table_name,ordinal_position`);
  assert.equal(rows.rows.some(r=>/organization|location|role|capability/i.test(r.column_name)),false);
  assert.equal(rows.rows.some(r=>['secret','token','credential'].includes(r.column_name)),false);
});

for (const [label, repository] of [['SetupToken', setupTokens], ['PasswordResetToken', resetTokens], ['Invitation', invitations]] as const) {
  test(`${label} captures owner, verifier Buffer and Date while Identity lock blocks insertion`, async () => {
    const now = new Date('2026-10-04T12:00:00Z');
    await active('original', now); await active('inactive', now); await identities.deactivate({id:'inactive',now});
    const common = { id: 'captured', secret: { verifierVersion: 'v1' as const, verifier: Buffer.alloc(32, 7) }, now: new Date(now) };
    const tokenInput = { ...common, identityId: 'original' };
    const invitationInput = { ...common, ownerIdentityId: 'original', invitedIdentityId: null as string | null };
    const holder = await pool.connect();
    let pending: Promise<unknown> | undefined;
    try {
      await holder.query('begin');
      const pid = (await holder.query<{pid:number}>('select pg_backend_pid() as pid')).rows[0]!.pid;
      await holder.query('select id from identity_identities where id=$1 for update', ['original']);
      pending = label === 'Invitation' ? invitations.create(invitationInput) : (repository as typeof setupTokens).create(tokenInput);
      void pending.catch(() => {}); await observeLockWait(pool, pid);
      tokenInput.id = invitationInput.id = 'redirect'; tokenInput.identityId = invitationInput.ownerIdentityId = 'inactive';
      invitationInput.invitedIdentityId = 'inactive'; common.secret.verifier.fill(9); common.now.setTime(0);
    } finally { await holder.query('rollback'); holder.release(); }
    const row = await pending as {id:string;identityId?:string;ownerIdentityId?:string;secretVerifier:Buffer;issuedAt:Date};
    assert.equal(row.id, 'captured'); assert.equal(row.identityId ?? row.ownerIdentityId, 'original');
    assert.deepEqual(row.secretVerifier, Buffer.alloc(32,7)); assert.equal(row.issuedAt.getTime(), now.getTime());
  });
}
for (const [label, repository, table, lifetime] of [
  ['SetupToken',setupTokens,'identity_setup_tokens',15*60*1000],
  ['PasswordResetToken',resetTokens,'identity_password_reset_tokens',60*60*1000],
] as const) {
  test(`${label} expiry denial survives failed lazy EXPIRED persistence`, async () => {
    const now = new Date('2026-10-04T12:00:00Z'); await active('owner',now);
    const issued = await issueIdentityToken(repository,{id:'expire-fault',identityId:'owner',now});
    await pool.query(`create function test_fail_token_expire() returns trigger language plpgsql as $$ begin if new.status='EXPIRED' then raise exception 'forced expiry failure'; end if; return new; end $$`);
    await pool.query(`create trigger test_fail_token_expire before update on ${table} for each row execute function test_fail_token_expire()`);
    try {
      assert.equal(await consumeIdentityToken(repository,{identityId:'owner',secret:issued.secret,now:new Date(now.getTime()+lifetime)}),null);
      assert.equal((await pool.query(`select status from ${table} where id='expire-fault'`)).rows[0]?.status,'ACTIVE');
    } finally {
      await pool.query(`drop trigger if exists test_fail_token_expire on ${table}`); await pool.query('drop function if exists test_fail_token_expire()');
    }
  });
}
