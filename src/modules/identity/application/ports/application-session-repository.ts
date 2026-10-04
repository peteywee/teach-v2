import type {
  ApplicationSessionRecord,
  IssuedSessionCredential,
} from '../../domain/application-session.js';
import type { IdentityStatus } from '../../domain/identity.js';

export interface SessionAuthenticationLookup {
  readonly session: ApplicationSessionRecord;
  readonly identityStatus: IdentityStatus;
}

export interface ApplicationSessionRepository {
  create(input: {
    readonly id: string;
    readonly identityId: string;
    readonly credential: IssuedSessionCredential;
    readonly now: Date;
  }): Promise<ApplicationSessionRecord>;

  getById(input: {
    readonly id: string;
    readonly identityId: string;
  }): Promise<ApplicationSessionRecord | null>;

  revoke(input: {
    readonly id: string;
    readonly identityId: string;
    readonly now: Date;
  }): Promise<ApplicationSessionRecord>;

  findForAuthenticationByVerifier(input: {
    readonly verifierVersion: 'v1';
    readonly verifier: Buffer;
  }): Promise<SessionAuthenticationLookup | null>;

  touchLastUsed(input: {
    readonly id: string;
    readonly identityId: string;
    readonly now: Date;
  }): Promise<ApplicationSessionRecord | null>;

  markExpired(input: {
    readonly id: string;
    readonly identityId: string;
    readonly now: Date;
  }): Promise<void>;
}

export class ApplicationSessionNotFoundError extends Error {
  constructor() {
    super('ApplicationSession not found in authoritative Identity scope');
    this.name = 'ApplicationSessionNotFoundError';
  }
}
