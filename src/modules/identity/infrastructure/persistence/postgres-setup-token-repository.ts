import { snapshotPersistenceInput } from './input-snapshot.mjs';
import { and, eq, sql } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type { SingleUseTokenRepository } from '../../application/ports/identity-token-repository.js';
import {
  SETUP_TOKEN_LIFETIME_MS,
  type SingleUseTokenRecord,
} from '../../domain/identity-tokens.js';
import * as identitySchema from './schema.js';
import * as tokenSchema from './token-schema.js';
import { setupTokens, type SetupTokenRow } from './token-schema.js';

type DbSchema=typeof identitySchema & typeof tokenSchema;

export class PostgresSetupTokenRepository implements SingleUseTokenRepository {
  constructor(private readonly db:NodePgDatabase<DbSchema>) {}

  async create(input:{
    readonly id:string;readonly identityId:string;
    readonly secret:{readonly verifierVersion:'v1';readonly verifier:Buffer};
    readonly now:Date;
  }):Promise<SingleUseTokenRecord> {
    input = snapshotPersistenceInput(input);
    return this.db.transaction(async tx=>{
      const lock=await tx.execute(sql`select "status" from "identity_identities" where "id"=${input.identityId} for update`);
      if(lock.rows[0]?.status!=='ACTIVE') throw new Error('authoritative Identity must be ACTIVE');
      const [row]=await tx.insert(setupTokens).values({
        id:input.id,identityId:input.identityId,status:'ACTIVE',
        verifierVersion:input.secret.verifierVersion,
        secretVerifier:input.secret.verifier,
        issuedAt:input.now,
        expiresAt:new Date(input.now.getTime()+SETUP_TOKEN_LIFETIME_MS),
        createdAt:input.now,updatedAt:input.now,
      }).returning();
      if(!row) throw new Error('SetupToken insert returned no row');
      return map(row);
    });
  }

  async consumeBySecret(input:{
    readonly identityId:string;
    readonly secret:{readonly verifierVersion:'v1';readonly verifier:Buffer};
    readonly now:Date;
  }):Promise<SingleUseTokenRecord|null> {
    input = snapshotPersistenceInput(input);
    const [row]=await this.db.update(setupTokens).set({
      status:'CONSUMED',consumedAt:input.now,updatedAt:input.now,
    }).where(and(
      eq(setupTokens.identityId,input.identityId),
      eq(setupTokens.verifierVersion,input.secret.verifierVersion),
      eq(setupTokens.secretVerifier,input.secret.verifier),
      eq(setupTokens.status,'ACTIVE'),
      sql`${input.now} < ${setupTokens.expiresAt}`,
    )).returning();
    if(row) return map(row);
    await expire(input.identityId,input.secret,input.now,this.db);
    return null;
  }

  async revoke(input:{readonly id:string;readonly identityId:string;readonly now:Date}):Promise<SingleUseTokenRecord|null> {
    input = snapshotPersistenceInput(input);
    const [row]=await this.db.update(setupTokens).set({
      status:'REVOKED',revokedAt:input.now,updatedAt:input.now,
    }).where(and(
      eq(setupTokens.id,input.id),
      eq(setupTokens.identityId,input.identityId),
      eq(setupTokens.status,'ACTIVE'),
    )).returning();
    return row?map(row):null;
  }
}

async function expire(
  identityId:string,
  secret:{readonly verifierVersion:'v1';readonly verifier:Buffer},
  now:Date,
  db:NodePgDatabase<DbSchema>,
):Promise<void>{
  try {
    await db.update(setupTokens).set({status:'EXPIRED',expiredAt:now,updatedAt:now}).where(and(
      eq(setupTokens.identityId,identityId),
      eq(setupTokens.verifierVersion,secret.verifierVersion),
      eq(setupTokens.secretVerifier,secret.verifier),
      eq(setupTokens.status,'ACTIVE'),
      sql`${now} >= ${setupTokens.expiresAt}`,
    ));
  } catch {}
}

function map(row:SetupTokenRow):SingleUseTokenRecord {
  return {
    id:row.id,identityId:row.identityId,status:row.status,verifierVersion:'v1',
    secretVerifier:row.secretVerifier,issuedAt:row.issuedAt,expiresAt:row.expiresAt,
    consumedAt:row.consumedAt,revokedAt:row.revokedAt,expiredAt:row.expiredAt,
    createdAt:row.createdAt,updatedAt:row.updatedAt,
  };
}
