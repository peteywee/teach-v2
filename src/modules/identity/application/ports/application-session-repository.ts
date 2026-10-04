import type { ApplicationSessionRecord } from '../../domain/application-session.js';

export interface ApplicationSessionRepository {
  create(input: {
    readonly id: string;
    readonly identityId: string;
    readonly credential: {
      readonly verifierVersion: 'v1';
      readonly verifier: Buffer;
    };
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

  authenticateByVerifier(input: {
    readonly verifierVersion: 'v1';
    readonly verifier: Buffer;
    readonly now: Date;
  }): Promise<ApplicationSessionRecord | null>;
}

export class ApplicationSessionNotFoundError extends Error {
  constructor() {
    super('ApplicationSession not found in authoritative Identity scope');
    this.name = 'ApplicationSessionNotFoundError';
  }
}
