import { createHash, randomBytes } from 'node:crypto';

export const SINGLE_USE_SECRET_BYTES = 32;
export const SINGLE_USE_VERIFIER_VERSION = 'v1' as const;
const PREFIX = Buffer.from('teach-single-use-v1\0', 'utf8');
const CANONICAL = /^[A-Za-z0-9_-]{43}$/;

export interface IssuedSingleUseSecret {
  readonly secret: string;
  readonly verifierVersion: typeof SINGLE_USE_VERIFIER_VERSION;
  readonly verifier: Buffer;
}

export function issueSingleUseSecret(): IssuedSingleUseSecret {
  const raw = randomBytes(SINGLE_USE_SECRET_BYTES);
  return {
    secret: raw.toString('base64url'),
    verifierVersion: SINGLE_USE_VERIFIER_VERSION,
    verifier: verifierFromRaw(raw),
  };
}

export function deriveSingleUseVerifier(secret: string): Buffer {
  if (!CANONICAL.test(secret)) {
    throw new RangeError('single-use secret must be canonical unpadded base64url for 32 bytes');
  }
  const raw = Buffer.from(secret, 'base64url');
  if (raw.length !== SINGLE_USE_SECRET_BYTES || raw.toString('base64url') !== secret) {
    throw new RangeError('single-use secret must decode canonically to exactly 32 bytes');
  }
  return verifierFromRaw(raw);
}

function verifierFromRaw(raw: Buffer): Buffer {
  return createHash('sha256').update(PREFIX).update(raw).digest();
}
