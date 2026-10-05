// Backend-only boundary. Implementations must resolve current C14 actor,
// membership, scope, capability, target and entitlement authority in order.
// No vocabulary, Membership schema or permission is selected by this port.
export interface IdentityLifecycleRequest {
  readonly command: 'DeactivateIdentity' | 'ReactivateIdentity';
  readonly actorReference: string;
  readonly actorClass: 'HumanActor' | 'AutomationActor';
  readonly targetIdentityId: string;
  readonly requestId: string;
  readonly now: Date;
}
export interface IdentityCommandAuthorizationPort {
  requireAuthorization(request: IdentityLifecycleRequest): Promise<void>;
}
