import { createHash, randomBytes } from 'node:crypto';

export const applicationSessionStatuses = ['ACTIVE', 'EXPIRED', 'REVOKED'] as const;
export type ApplicationSessionStatus =
  (typeof applicationSessionStatuses)[number];

export const SESSION_VERIFIER_VERSION = 'v1' as const;
export const SESSION_CREDENTIAL_BYTES = 32;
export const SESSION_ABSOLUTE_LIFETIME_MS = 12 * 60 * 60 * 1000;
export const SESSION_IDLE_LIFETIME_MS = 30 * 60 * 1000;

const VERIFIER_PREFIX = Buffer.from('teach-session-v1\0', 'utf8');
const BASE64URL_32_BYTES = /^[A-Za-z0-9_-]{43}$/;

export interface IssuedSessionCredential {
  readonly credential: string;
  readonly verifierVersion: typeof SESSION_VERIFIER_VERSION;
  readonly verifier: Buffer;
}

export interface ApplicationSessionRecord {
  readonly id: string;
  readonly identityId: string;
  readonly status: ApplicationSessionStatus;
  readonly verifierVersion: typeof SESSION_VERIFIER_VERSION;
  readonly verifier: Buffer;
  readonly issuedAt: Date;
  readonly absoluteExpiresAt: Date;
  readonly lastUsedAt: Date;
  readonly revokedAt: Date | null;
  readonly expiredAt: Date | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export type SessionAuthenticationDecision =
  | { readonly allowed: true }
  | {
      readonly allowed: false;
      readonly reason:
        | 'IDENTITY_INACTIVE'
        | 'SESSION_NOT_ACTIVE'
        | 'INVALID_TIME'
        | 'ABSOLUTE_EXPIRED'
        | 'IDLE_EXPIRED';
    };

export function issueSessionCredential(): IssuedSessionCredential {
  const raw = randomBytes(SESSION_CREDENTIAL_BYTES);
  return {
    credential: raw.toString('base64url'),
    verifierVersion: SESSION_VERIFIER_VERSION,
    verifier: verifierFromRawCredential(raw),
  };
}

export function deriveSessionVerifier(credential: string): Buffer {
  if (!BASE64URL_32_BYTES.test(credential)) {
    throw new RangeError('session credential must be canonical unpadded base64url for 32 bytes');
  }
  const raw = Buffer.from(credential, 'base64url');
  if (
    raw.length !== SESSION_CREDENTIAL_BYTES ||
    raw.toString('base64url') !== credential
  ) {
    throw new RangeError('session credential must decode canonically to exactly 32 bytes');
  }
  return verifierFromRawCredential(raw);
}

export function absoluteExpiryFromIssuedAt(issuedAt: Date): Date {
  return new Date(issuedAt.getTime() + SESSION_ABSOLUTE_LIFETIME_MS);
}

export function evaluateSessionAuthentication(
  input: {
    readonly identityActive: boolean;
    readonly status: ApplicationSessionStatus;
    readonly issuedAt: Date;
    readonly absoluteExpiresAt: Date;
    readonly lastUsedAt: Date;
  },
  now: Date,
): SessionAuthenticationDecision {
  if (!input.identityActive) return { allowed: false, reason: 'IDENTITY_INACTIVE' };
  if (input.status !== 'ACTIVE') return { allowed: false, reason: 'SESSION_NOT_ACTIVE' };
  if ([now, input.issuedAt, input.absoluteExpiresAt, input.lastUsedAt].some(
    value => !(value instanceof Date) || !Number.isFinite(value.getTime()),
  )) return { allowed: false, reason: 'INVALID_TIME' };
  if (now.getTime() >= input.absoluteExpiresAt.getTime()) {
    return { allowed: false, reason: 'ABSOLUTE_EXPIRED' };
  }
  if (now.getTime() - input.lastUsedAt.getTime() >= SESSION_IDLE_LIFETIME_MS) {
    return { allowed: false, reason: 'IDLE_EXPIRED' };
  }
  return { allowed: true };
}

function verifierFromRawCredential(raw: Buffer): Buffer {
  return createHash('sha256').update(VERIFIER_PREFIX).update(raw).digest();
}
