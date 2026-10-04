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
  // OAUTH_LINK has no password hash
  if (record.credentialType === 'OAUTH_LINK' && record.passwordHash) {
    throw new RangeError('OAUTH_LINK credential must not carry password hash');
  }
}

export function assertCredentialNotRevoked(record: CredentialRecord): void {
  if (record.revokedAt !== null) {
    throw new RangeError('Credential is revoked');
  }
}
