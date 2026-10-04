import type { CredentialRecord, CredentialType } from '../../domain/credential.js';

export interface CredentialRepository {
  create(input: {
    readonly id: string;
    readonly identityId: string;
    readonly credentialType: CredentialType;
    readonly passwordHash: string | null;
    readonly now: Date;
  }): Promise<CredentialRecord>;
  findById(input: { readonly id: string; readonly identityId: string }): Promise<CredentialRecord | null>;
  revoke(input: { readonly id: string; readonly identityId: string; readonly now: Date }): Promise<CredentialRecord | null>;
  listByIdentity(input: { readonly identityId: string }): Promise<CredentialRecord[]>;
}
