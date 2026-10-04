import {
  deriveSessionVerifier,
  issueSessionCredential,
  SESSION_VERIFIER_VERSION,
  type ApplicationSessionRecord,
} from '../domain/application-session.js';
import type { ApplicationSessionRepository } from './ports/application-session-repository.js';

export async function issueApplicationSession(
  repository: ApplicationSessionRepository,
  input: { readonly id: string; readonly identityId: string; readonly now: Date },
): Promise<{ credential: string; session: ApplicationSessionRecord }> {
  const credential = issueSessionCredential();
  const session = await repository.create({
    ...input,
    credential: {
      verifierVersion: credential.verifierVersion,
      verifier: credential.verifier,
    },
  });
  return { credential: credential.credential, session };
}

export async function authenticateApplicationSession(
  repository: ApplicationSessionRepository,
  credential: string,
  now: Date,
): Promise<ApplicationSessionRecord | null> {
  if (!(now instanceof Date) || !Number.isFinite(now.getTime())) return null;
  let verifier: Buffer;
  try {
    verifier = deriveSessionVerifier(credential);
  } catch {
    return null;
  }

  return repository.authenticateByVerifier({
    verifierVersion: SESSION_VERIFIER_VERSION,
    verifier,
    now,
  });
}
