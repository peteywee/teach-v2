import {
  issueSingleUseSecret,
  deriveSingleUseVerifier,
  SINGLE_USE_VERIFIER_VERSION,
} from '../domain/single-use-secret.js';
import type {
  InvitationRepository,
  SingleUseTokenRepository,
} from './ports/identity-token-repository.js';

export async function issueInvitation(
  repository: InvitationRepository,
  input: {
    readonly id: string;
    readonly ownerIdentityId: string;
    readonly invitedIdentityId: string | null;
    readonly now: Date;
  },
) {
  const issued=issueSingleUseSecret();
  const invitation=await repository.create({
    ...input,
    secret:{verifierVersion:issued.verifierVersion,verifier:issued.verifier},
  });
  return {secret:issued.secret,invitation};
}

export async function acceptInvitation(
  repository: InvitationRepository,
  input: {
    readonly ownerIdentityId: string;
    readonly secret: string;
    readonly now: Date;
  },
) {
  let verifier:Buffer;
  try { verifier=deriveSingleUseVerifier(input.secret); } catch { return null; }
  return repository.acceptBySecret({
    ownerIdentityId:input.ownerIdentityId,
    secret:{verifierVersion:SINGLE_USE_VERIFIER_VERSION,verifier},
    now:input.now,
  });
}

export async function issueIdentityToken(
  repository: SingleUseTokenRepository,
  input:{readonly id:string;readonly identityId:string;readonly now:Date},
) {
  const issued=issueSingleUseSecret();
  const token=await repository.create({
    ...input,
    secret:{verifierVersion:issued.verifierVersion,verifier:issued.verifier},
  });
  return {secret:issued.secret,token};
}

export async function consumeIdentityToken(
  repository: SingleUseTokenRepository,
  input:{readonly identityId:string;readonly secret:string;readonly now:Date},
) {
  let verifier:Buffer;
  try { verifier=deriveSingleUseVerifier(input.secret); } catch { return null; }
  return repository.consumeBySecret({
    identityId:input.identityId,
    secret:{verifierVersion:SINGLE_USE_VERIFIER_VERSION,verifier},
    now:input.now,
  });
}
