import { and, eq, sql } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type { InvitationRepository } from '../../application/ports/identity-token-repository.js';
import {
  INVITATION_LIFETIME_MS,
  type InvitationRecord,
} from '../../domain/identity-tokens.js';
import * as identitySchema from './schema.js';
import * as tokenSchema from './token-schema.js';
import { identities } from './schema.js';
import { invitations, type InvitationRow } from './token-schema.js';

type DbSchema=typeof identitySchema & typeof tokenSchema;

export class PostgresInvitationRepository implements InvitationRepository {
  constructor(private readonly db:NodePgDatabase<DbSchema>) {}

  async create(input:{
    readonly id:string;
    readonly ownerIdentityId:string;
    readonly invitedIdentityId:string|null;
    readonly secret:{readonly verifierVersion:'v1';readonly verifier:Buffer};
    readonly now:Date;
  }):Promise<InvitationRecord> {
    return this.db.transaction(async tx=>{
      await requireActiveIdentity(tx,input.ownerIdentityId);
      if(input.invitedIdentityId!==null) await requireActiveIdentity(tx,input.invitedIdentityId);
      const [row]=await tx.insert(invitations).values({
        id:input.id,
        ownerIdentityId:input.ownerIdentityId,
        invitedIdentityId:input.invitedIdentityId,
        status:'PENDING',
        verifierVersion:input.secret.verifierVersion,
        secretVerifier:input.secret.verifier,
        issuedAt:input.now,
        expiresAt:new Date(input.now.getTime()+INVITATION_LIFETIME_MS),
        createdAt:input.now,
        updatedAt:input.now,
      }).returning();
      if(!row) throw new Error('Invitation insert returned no row');
      return mapInvitation(row);
    });
  }

  async getById(input:{readonly id:string;readonly ownerIdentityId:string}):Promise<InvitationRecord|null> {
    const [row]=await this.db.select().from(invitations).where(and(
      eq(invitations.id,input.id),
      eq(invitations.ownerIdentityId,input.ownerIdentityId),
    )).limit(1);
    return row?mapInvitation(row):null;
  }

  async acceptBySecret(input:{
    readonly ownerIdentityId:string;
    readonly secret:{readonly verifierVersion:'v1';readonly verifier:Buffer};
    readonly now:Date;
  }):Promise<InvitationRecord|null> {
    const [row]=await this.db.update(invitations).set({
      status:'ACCEPTED',
      acceptedAt:input.now,
      updatedAt:input.now,
    }).where(and(
      eq(invitations.ownerIdentityId,input.ownerIdentityId),
      eq(invitations.verifierVersion,input.secret.verifierVersion),
      eq(invitations.secretVerifier,input.secret.verifier),
      eq(invitations.status,'PENDING'),
      sql`${input.now} < ${invitations.expiresAt}`,
    )).returning();
    if(row) return mapInvitation(row);

    await this.expireIfNeeded(input.ownerIdentityId,input.secret,input.now);
    return null;
  }

  async revoke(input:{
    readonly id:string;
    readonly ownerIdentityId:string;
    readonly now:Date;
  }):Promise<InvitationRecord|null> {
    const [row]=await this.db.update(invitations).set({
      status:'REVOKED',
      revokedAt:input.now,
      updatedAt:input.now,
    }).where(and(
      eq(invitations.id,input.id),
      eq(invitations.ownerIdentityId,input.ownerIdentityId),
      eq(invitations.status,'PENDING'),
    )).returning();
    return row?mapInvitation(row):null;
  }

  private async expireIfNeeded(
    ownerIdentityId:string,
    secret:{readonly verifierVersion:'v1';readonly verifier:Buffer},
    now:Date,
  ):Promise<void> {
    try {
      await this.db.update(invitations).set({
        status:'EXPIRED',
        expiredAt:now,
        updatedAt:now,
      }).where(and(
        eq(invitations.ownerIdentityId,ownerIdentityId),
        eq(invitations.verifierVersion,secret.verifierVersion),
        eq(invitations.secretVerifier,secret.verifier),
        eq(invitations.status,'PENDING'),
        sql`${now} >= ${invitations.expiresAt}`,
      ));
    } catch {}
  }
}

async function requireActiveIdentity(
  tx:Parameters<Parameters<NodePgDatabase<DbSchema>['transaction']>[0]>[0],
  identityId:string,
):Promise<void> {
  const result=await tx.execute(
    sql`select "status" from "identity_identities" where "id"=${identityId} for update`,
  );
  if(result.rows[0]?.status!=='ACTIVE') {
    throw new Error('authoritative Identity must be ACTIVE');
  }
}

function mapInvitation(row:InvitationRow):InvitationRecord {
  return {
    id:row.id,
    ownerIdentityId:row.ownerIdentityId,
    invitedIdentityId:row.invitedIdentityId,
    status:row.status,
    verifierVersion:'v1',
    secretVerifier:row.secretVerifier,
    issuedAt:row.issuedAt,
    expiresAt:row.expiresAt,
    acceptedAt:row.acceptedAt,
    revokedAt:row.revokedAt,
    expiredAt:row.expiredAt,
    createdAt:row.createdAt,
    updatedAt:row.updatedAt,
  };
}
