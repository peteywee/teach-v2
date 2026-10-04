export const invitationStatuses = ['PENDING', 'ACCEPTED', 'REVOKED', 'EXPIRED'] as const;
export type InvitationStatus = (typeof invitationStatuses)[number];

export const singleUseTokenStatuses = ['ACTIVE', 'CONSUMED', 'EXPIRED', 'REVOKED'] as const;
export type SingleUseTokenStatus = (typeof singleUseTokenStatuses)[number];

export const INVITATION_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000;
export const SETUP_TOKEN_LIFETIME_MS = 15 * 60 * 1000;
export const PASSWORD_RESET_TOKEN_LIFETIME_MS = 60 * 60 * 1000;

export interface InvitationRecord {
  readonly id: string;
  readonly ownerIdentityId: string;
  readonly invitedIdentityId: string | null;
  readonly status: InvitationStatus;
  readonly verifierVersion: 'v1';
  readonly secretVerifier: Buffer;
  readonly issuedAt: Date;
  readonly expiresAt: Date;
  readonly acceptedAt: Date | null;
  readonly revokedAt: Date | null;
  readonly expiredAt: Date | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface SingleUseTokenRecord {
  readonly id: string;
  readonly identityId: string;
  readonly status: SingleUseTokenStatus;
  readonly verifierVersion: 'v1';
  readonly secretVerifier: Buffer;
  readonly issuedAt: Date;
  readonly expiresAt: Date;
  readonly consumedAt: Date | null;
  readonly revokedAt: Date | null;
  readonly expiredAt: Date | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}
