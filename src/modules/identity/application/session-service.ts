import {
  deriveSessionVerifier,
  evaluateSessionAuthentication,
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
    credential,
  });
  return { credential: credential.credential, session };
}

export async function authenticateApplicationSession(
  repository: ApplicationSessionRepository,
  credential: string,
  now: Date,
): Promise<ApplicationSessionRecord | null> {
  let verifier: Buffer;
  try {
    verifier = deriveSessionVerifier(credential);
  } catch {
    return null;
  }

  const lookup = await repository.findForAuthenticationByVerifier({
    verifierVersion: SESSION_VERIFIER_VERSION,
    verifier,
  });
  if (!lookup) return null;

  const decision = evaluateSessionAuthentication(
    {
      identityActive: lookup.identityStatus === 'ACTIVE',
      status: lookup.session.status,
      issuedAt: lookup.session.issuedAt,
      absoluteExpiresAt: lookup.session.absoluteExpiresAt,
      lastUsedAt: lookup.session.lastUsedAt,
    },
    now,
  );

  if (!decision.allowed) {
    if (
      decision.reason === 'ABSOLUTE_EXPIRED' ||
      decision.reason === 'IDLE_EXPIRED'
    ) {
      try {
        await repository.markExpired({
          id: lookup.session.id,
          identityId: lookup.session.identityId,
          now,
        });
      } catch {
        // Authentication denial is authoritative even if lazy expiry persistence fails.
      }
    }
    return null;
  }

  return (
    (await repository.touchLastUsed({
      id: lookup.session.id,
      identityId: lookup.session.identityId,
      now,
    })) ?? null
  );
}
