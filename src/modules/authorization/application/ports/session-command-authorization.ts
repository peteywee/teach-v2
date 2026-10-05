export interface SessionRevocationRequest {
  readonly command: 'RevokeApplicationSession';
  readonly actorReference: string;
  readonly actorClass: 'HumanActor' | 'AutomationActor';
  readonly targetIdentityId: string;
  readonly targetSessionId: string;
  readonly requestId: string;
  readonly now: Date;
}
// A session ID or actor reference is not a grant. Real backend composition must
// provide current C14 authority before owner mutation; fixtures do not establish it.
export interface SessionCommandAuthorizationPort {
  requireSessionAuthorization(request: SessionRevocationRequest): Promise<void>;
}
