import assert from 'node:assert/strict';
import test from 'node:test';
import {
  assertCredentialNotRevoked,
  assertValidCredential,
} from './credential.js';

// Representation-only fixture, not a password-authentication test vector.
const encodedHash = (options: { memory?: string; iterations?: string; parallelism?: string; saltBytes?: number; tagBytes?: number } = {}) =>
  `$argon2id$v=19$m=${options.memory ?? '19456'},t=${options.iterations ?? '2'},p=${options.parallelism ?? '1'}$${Buffer.alloc(options.saltBytes ?? 16, 1).toString('base64').replace(/=+$/, '')}$${Buffer.alloc(options.tagBytes ?? 32, 2).toString('base64').replace(/=+$/, '')}`;
const validHash = encodedHash();

// Positive: valid PASSWORD credential passes
test('Credential accepts valid PASSWORD with hash', () => {
  assert.doesNotThrow(() =>
    assertValidCredential({
      id: 'cred-1',
      identityId: 'id-1',
      credentialType: 'PASSWORD',
      passwordHash: validHash,
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
        passwordHash: validHash,
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
        passwordHash: validHash,
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
      passwordHash: validHash,
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
        passwordHash: validHash,
        revokedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    /is revoked/,
  );
});

for (const [name, passwordHash] of [
  ['plaintext', 'correct horse battery staple'],
  ['whitespace', ' '],
  ['legacy bcrypt', '$2b$12$saltedhash'],
  ['malformed Argon2 placeholder', '$argon2id$v=19$fixture'],
  ['Argon2i', validHash.replace('$argon2id$', '$argon2i$')],
  ['Argon2d', validHash.replace('$argon2id$', '$argon2d$')],
  ['old version', validHash.replace('v=19', 'v=16')],
  ['missing version', validHash.replace('v=19$', '')],
  ['memory below policy', encodedHash({ memory: '19455' })],
  ['iterations below policy', encodedHash({ iterations: '1' })],
  ['parallelism above policy', encodedHash({ parallelism: '2' })],
  ['zero parallelism', encodedHash({ parallelism: '0' })],
  ['leading-zero cost', encodedHash({ memory: '019456' })],
  ['signed cost', encodedHash({ memory: '+19456' })],
  ['exponent cost', encodedHash({ memory: '2e4' })],
  ['fractional cost', encodedHash({ iterations: '2.5' })],
  ['memory beyond Argon2 range', encodedHash({ memory: '4294967296' })],
  ['iterations beyond Argon2 range', encodedHash({ iterations: '4294967296' })],
  ['unsafe integer cost', encodedHash({ memory: '9007199254740993' })],
  ['overflow cost', encodedHash({ memory: '9'.repeat(400) })],
  ['short salt', encodedHash({ saltBytes: 15 })],
  ['short tag', encodedHash({ tagBytes: 3 })],
  ['empty salt', encodedHash({ saltBytes: 0 })],
  ['empty tag', encodedHash({ tagBytes: 0 })],
  ['padded salt', validHash.replace('$AgI', '==$AgI')],
  ['padded tag', validHash + '='],
  ['noncanonical salt bits', validHash.replace('AQEBAQEBAQEBAQEBAQEBAQ', 'AQEBAQEBAQEBAQEBAQEBAR')],
  ['noncanonical tag bits', validHash.slice(0, -1) + 'J'],
  ['duplicate parameter', validHash.replace('p=1', 'p=1,p=1')],
  ['unknown parameter', validHash.replace('p=1', 'p=1,x=1')],
  ['trailing field', validHash + '$extra'],
  ['trailing whitespace', validHash + ' '],
  ['trailing newline', validHash + '\n'],
  ['trailing carriage return', validHash + '\r'],
  ['trailing CRLF', validHash + '\r\n'],
] as const) {
  test(`PASSWORD rejects ${name} without disclosing the supplied value`, () => {
    assert.throws(() => assertValidCredential({ id: 'cred-1', identityId: 'id-1', credentialType: 'PASSWORD', passwordHash }),
      { name: 'RangeError', message: 'PASSWORD credential requires an approved Argon2id encoded hash' });
  });
}

for (const [name, passwordHash] of [
  ['minimum approved costs', validHash],
  ['stronger costs', encodedHash({ memory: '65536', iterations: '3' })],
  ['larger salt', encodedHash({ saltBytes: 32 })],
  ['non-proposed tag length', encodedHash({ tagBytes: 16 })],
  ['RFC minimum tag length', encodedHash({ tagBytes: 4 })],
  ['larger tag', encodedHash({ tagBytes: 64 })],
  ['Argon2 maximum cost integers', encodedHash({ memory: '4294967295', iterations: '4294967295' })],
] as const) {
  test(`PASSWORD accepts structurally valid ${name} without computing a hash`, () => {
    assert.doesNotThrow(() => assertValidCredential({ id: 'cred-1', identityId: 'id-1', credentialType: 'PASSWORD', passwordHash }));
  });
}

test('PASSWORD rejects non-string hash material', () => {
  for (const passwordHash of [42, {}, [], true]) {
    assert.throws(() => assertValidCredential({ id: 'cred-1', identityId: 'id-1', credentialType: 'PASSWORD', passwordHash: passwordHash as unknown as string }), RangeError);
  }
});

test('OAUTH_LINK requires null rather than an empty or undefined hash', () => {
  for (const passwordHash of ['', undefined]) {
    assert.throws(() => assertValidCredential({ id: 'cred-1', identityId: 'id-1', credentialType: 'OAUTH_LINK', passwordHash: passwordHash as unknown as null }), /must not carry password hash/);
  }
});
