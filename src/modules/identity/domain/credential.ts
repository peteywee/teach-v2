// Credential domain model — SLICE-P04
// C11: IDN-4 (no authz claims), IDN-5 (salted hash only), IDN-6 (no plaintext),
//      IDN-13 (manager isolation), IDN-15 (change revokes sessions)

export const credentialTypes = ['PASSWORD', 'PIN', 'OAUTH_LINK'] as const;
export type CredentialType = (typeof credentialTypes)[number];

export interface CredentialRecord {
  readonly id: string;
  readonly identityId: string;
  readonly credentialType: CredentialType;
  readonly passwordHash: string | null; // salted hash only, never plaintext (IDN-5, IDN-6)
  readonly revokedAt: Date | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export function assertValidCredential(record: {
  id: string;
  identityId: string;
  credentialType: CredentialType;
  passwordHash: string | null;
}): void {
  if (!record.id || record.id.length === 0) {
    throw new RangeError('Credential id is required');
  }
  if (!record.identityId || record.identityId.length === 0) {
    throw new RangeError('Credential identityId is required (CredentialBelongsToIdentity)');
  }
  if (!credentialTypes.includes(record.credentialType)) {
    throw new RangeError(`unsupported CredentialType ${record.credentialType}`);
  }
  // IDN-5, IDN-6: PASSWORD/PIN must have hash, never plaintext
  if ((record.credentialType === 'PASSWORD' || record.credentialType === 'PIN') && !record.passwordHash) {
    throw new RangeError('PASSWORD/PIN credential requires salted hash');
  }
  if (record.credentialType === 'PASSWORD') assertApprovedPasswordHash(record.passwordHash);
  // OAUTH_LINK has no password hash
  if (record.credentialType === 'OAUTH_LINK' && record.passwordHash !== null) {
    throw new RangeError('OAUTH_LINK credential must not carry password hash');
  }
}

// This validates the encoded storage representation, not the password or proof
// that a trusted hashing backend produced it. Authentication, salt generation,
// target-infrastructure benchmarking and PIN policy remain separate work.
function assertApprovedPasswordHash(encoded: string | null): void {
  const invalid = () => new RangeError('PASSWORD credential requires an approved Argon2id encoded hash');
  if (typeof encoded !== 'string') throw invalid();
  const parts = /^\$argon2id\$v=19\$m=([1-9][0-9]*),t=([1-9][0-9]*),p=1\$([A-Za-z0-9+/]+)\$([A-Za-z0-9+/]+)$/.exec(encoded);
  if (!parts || parts[0] !== encoded) throw invalid();

  const memory = Number(parts[1]);
  const iterations = Number(parts[2]);
  // C11 IDN-5 supplies the minimum costs and p=1. RFC 9106 section 3.1
  // supplies the algorithm's uint32 bounds, not a new deployment cost policy.
  // https://www.rfc-editor.org/rfc/rfc9106.html#section-3.1
  if (!Number.isInteger(memory) || memory < 19456 || memory > 0xffffffff ||
      !Number.isInteger(iterations) || iterations < 2 || iterations > 0xffffffff) throw invalid();

  const salt = Buffer.from(parts[3]!, 'base64');
  const tag = Buffer.from(parts[4]!, 'base64');
  const canonical = (bytes: Buffer) => bytes.toString('base64').replace(/=+$/, '');
  if (canonical(salt) !== parts[3] || canonical(tag) !== parts[4] ||
      salt.length < 16 || tag.length < 4) throw invalid();
  // IDN-5 permits salts longer than 16 bytes. A 32-byte-only tag and other
  // proposed generation settings are not storage policy; RFC 9106 permits
  // tags from 4 bytes. No hash computation is performed here.
}

export function assertCredentialNotRevoked(record: CredentialRecord): void {
  if (record.revokedAt !== null) {
    throw new RangeError('Credential is revoked');
  }
}
