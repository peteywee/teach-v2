import assert from 'node:assert/strict';
import test from 'node:test';
import { acceptInvitation, consumeIdentityToken, issueIdentityToken, issueInvitation } from './identity-token-service.js';
import { deriveSingleUseVerifier, issueSingleUseSecret } from '../domain/single-use-secret.js';
import type { InvitationRepository, SingleUseTokenRepository } from './ports/identity-token-repository.js';
import type { InvitationRecord, SingleUseTokenRecord } from '../domain/identity-tokens.js';

const now = new Date('2026-10-04T12:00:00Z');
function token(input: Parameters<SingleUseTokenRepository['create']>[0]): SingleUseTokenRecord {
  return { id: input.id, identityId: input.identityId, status: 'ACTIVE', verifierVersion: 'v1', secretVerifier: input.secret.verifier, issuedAt: input.now, expiresAt: new Date(now.getTime() + 900000), consumedAt: null, revokedAt: null, expiredAt: null, createdAt: input.now, updatedAt: input.now };
}
function invitation(input: Parameters<InvitationRepository['create']>[0]): InvitationRecord {
  return { id: input.id, ownerIdentityId: input.ownerIdentityId, invitedIdentityId: input.invitedIdentityId, status: 'PENDING', verifierVersion: 'v1', secretVerifier: input.secret.verifier, issuedAt: input.now, expiresAt: new Date(now.getTime() + 604800000), acceptedAt: null, revokedAt: null, expiredAt: null, createdAt: input.now, updatedAt: input.now };
}
function fixture() {
  const creates: unknown[] = [], consumes: unknown[] = [];
  const tokens: SingleUseTokenRepository = {
    async create(input) { creates.push(input); return token(input); },
    async consumeBySecret(input) { consumes.push(input); return null; },
    async revoke() { throw new Error('unexpected revoke'); },
  };
  const invitations: InvitationRepository = {
    async create(input) { creates.push(input); return invitation(input); },
    async acceptBySecret(input) { consumes.push(input); return null; },
    async getById() { throw new Error('unexpected get'); },
    async revoke() { throw new Error('unexpected revoke'); },
  };
  return { tokens, invitations, creates, consumes };
}
for (const kind of ['invitation', 'token'] as const) {
  test(`${kind} issuance gives caller one raw secret and persists only domain-separated verifier`, async () => {
    const f = fixture();
    const result = kind === 'invitation' ? await issueInvitation(f.invitations, { id: 'one', ownerIdentityId: 'owner', invitedIdentityId: null, now }) : await issueIdentityToken(f.tokens, { id: 'one', identityId: 'owner', now });
    assert.match(result.secret, /^[A-Za-z0-9_-]{43}$/);
    const stored = f.creates[0] as { secret: { verifierVersion: string; verifier: Buffer } };
    assert.equal(stored.secret.verifierVersion, 'v1'); assert.deepEqual(stored.secret.verifier, deriveSingleUseVerifier(result.secret));
    assert.equal(JSON.stringify(stored).includes(result.secret), false); assert.equal(f.creates.length, 1);
  });
  test(`${kind} canonical secret lookup forwards exact owner scope and derived verifier`, async () => {
    const f = fixture(); const issued = issueSingleUseSecret();
    const result = kind === 'invitation' ? await acceptInvitation(f.invitations, { ownerIdentityId: 'owner', secret: issued.secret, now }) : await consumeIdentityToken(f.tokens, { identityId: 'owner', secret: issued.secret, now });
    assert.equal(result, null); assert.equal(f.consumes.length, 1);
    assert.deepEqual(f.consumes[0], { [kind === 'invitation' ? 'ownerIdentityId' : 'identityId']: 'owner', now, secret: { verifierVersion: 'v1', verifier: issued.verifier } });
  });
  for (const secret of ['', 'not-a-secret', Buffer.alloc(32).toString('base64url') + '=', 'A'.repeat(42) + 'B']) {
    test(`${kind} malformed secret ${JSON.stringify(secret)} never reaches persistence`, async () => {
      const f = fixture();
      const result = kind === 'invitation' ? await acceptInvitation(f.invitations, { ownerIdentityId: 'owner', secret, now }) : await consumeIdentityToken(f.tokens, { identityId: 'owner', secret, now });
      assert.equal(result, null); assert.equal(f.consumes.length, 0); assert.equal(f.creates.length, 0);
    });
  }
  test(`${kind} persistence errors propagate without a second issuance or consumption`, async () => {
    const f = fixture(); let calls = 0;
    const reject = async () => { calls++; throw new Error('persistence unavailable'); };
    if (kind === 'invitation') { f.invitations.create = reject; await assert.rejects(issueInvitation(f.invitations, { id: 'one', ownerIdentityId: 'owner', invitedIdentityId: null, now }), /unavailable/); }
    else { f.tokens.create = reject; await assert.rejects(issueIdentityToken(f.tokens, { id: 'one', identityId: 'owner', now }), /unavailable/); }
    assert.equal(calls, 1);
  });
}
