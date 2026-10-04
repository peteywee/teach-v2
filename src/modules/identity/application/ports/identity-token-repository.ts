import type {
  InvitationRecord,
  SingleUseTokenRecord,
} from '../../domain/identity-tokens.js';

export interface SecretVerifierMaterial {
  readonly verifierVersion: 'v1';
  readonly verifier: Buffer;
}

export interface InvitationRepository {
  create(input: {
    readonly id: string;
    readonly ownerIdentityId: string;
    readonly invitedIdentityId: string | null;
    readonly secret: SecretVerifierMaterial;
    readonly now: Date;
  }): Promise<InvitationRecord>;

  getById(input: {
    readonly id: string;
    readonly ownerIdentityId: string;
  }): Promise<InvitationRecord | null>;

  acceptBySecret(input: {
    readonly ownerIdentityId: string;
    readonly secret: SecretVerifierMaterial;
    readonly now: Date;
  }): Promise<InvitationRecord | null>;

  revoke(input: {
    readonly id: string;
    readonly ownerIdentityId: string;
    readonly now: Date;
  }): Promise<InvitationRecord | null>;
}

export interface SingleUseTokenRepository {
  create(input: {
    readonly id: string;
    readonly identityId: string;
    readonly secret: SecretVerifierMaterial;
    readonly now: Date;
  }): Promise<SingleUseTokenRecord>;

  consumeBySecret(input: {
    readonly identityId: string;
    readonly secret: SecretVerifierMaterial;
    readonly now: Date;
  }): Promise<SingleUseTokenRecord | null>;

  revoke(input: {
    readonly id: string;
    readonly identityId: string;
    readonly now: Date;
  }): Promise<SingleUseTokenRecord | null>;
}
