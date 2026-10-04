import assert from 'node:assert/strict';
import test from 'node:test';
import {
  assertCredentialNotRevoked,
  assertValidCredential,
} from './credential.js';

// Positive: valid PASSWORD credential passes
test('Credential accepts valid PASSWORD with hash', () => {
  assert.doesNotThrow(() =>
    assertValidCredential({
      id: 'cred-1',
      identityId: 'id-1',
      credentialType: 'PASSWORD',
      passwordHash: '$2b$12$saltedhash',
    }),
  );
});

// Positive: valid OAUTH_LINK without hash passes
test('Credential accepts OAUTH_LINK without hash', () => {
  assert.doesNotThrow(() =>
    assertValidCredential({
      id: 'cred-2',
      identityId: 'id-1',
      credentialType: 'OAUTH_LINK',
      passwordHash: null,
    }),
  );
});

// Negative: missing identityId fails (CredentialBelongsToIdentity)
test('Credential rejects missing identityId', () => {
  assert.throws(
    () =>
      assertValidCredential({
        id: 'cred-3',
        identityId: '',
        credentialType: 'PASSWORD',
        passwordHash: '$2b$12$hash',
      }),
    /identityId is required/,
  );
});

// Negative: PASSWORD without hash fails (IDN-5)
test('Credential rejects PASSWORD without hash', () => {
  assert.throws(
    () =>
      assertValidCredential({
        id: 'cred-4',
        identityId: 'id-1',
        credentialType: 'PASSWORD',
        passwordHash: null,
      }),
    /requires salted hash/,
  );
});

// Negative: OAUTH_LINK with hash fails
test('Credential rejects OAUTH_LINK with hash', () => {
  assert.throws(
    () =>
      assertValidCredential({
        id: 'cred-5',
        identityId: 'id-1',
        credentialType: 'OAUTH_LINK',
        passwordHash: '$2b$12$hash',
      }),
    /must not carry password hash/,
  );
});

// Positive: non-revoked credential passes revocation check
test('Credential revocation check passes for active', () => {
  assert.doesNotThrow(() =>
    assertCredentialNotRevoked({
      id: 'cred-6',
      identityId: 'id-1',
      credentialType: 'PASSWORD',
      passwordHash: '$2b$12$hash',
      revokedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }),
  );
});

// Negative: revoked credential fails revocation check
test('Credential revocation check fails for revoked', () => {
  assert.throws(
    () =>
      assertCredentialNotRevoked({
        id: 'cred-7',
        identityId: 'id-1',
        credentialType: 'PASSWORD',
        passwordHash: '$2b$12$hash',
        revokedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    /is revoked/,
  );
});
