export type Scope = { organizationId: string; locationId: string };
export type DemoRun = Scope & { id: string; status: 'ACTIVE'|'CLOSED'|'EXPIRED'; createdAt: Date; expiresAt: Date; closedAt: Date|null; closeReason: 'USER_EXIT'|'EXPIRED'|null; admissionPrefix: string };
export type Membership = Scope & { id: string; identityId: string; status: 'ACTIVE'|'INACTIVE'|'REVOKED'; createdAt: Date; updatedAt: Date; bundles: string[] };
export interface OrganizationPort {
 lockAdmission(prefix: string): Promise<{ now: Date; prefixHour: number; globalHour: number; total: number; retryAfterSeconds: number|null }>;
 createScope(run: DemoRun): Promise<void>;
 lockRun(id: string): Promise<{ run: DemoRun; now: Date }|null>;
 findRun(runId: string): Promise<DemoRun|null>;
 createMembership(value: Omit<Membership,'bundles'>): Promise<void>;
 createGrant(value: { id:string; membershipId:string; bundle:'learner'|'manager'|'demo_visitor'; createdAt:Date }): Promise<void>;
 createReporting(value: Scope & { id:string; managerIdentityId:string; learnerIdentityId:string; createdAt:Date }): Promise<void>;
 getMembership(identityId: string, scope: Scope): Promise<Membership|null>;
 listMemberships(identityId:string): Promise<Membership[]>;
 listDirectReports(managerIdentityId:string, scope:Scope): Promise<string[]>;
 closeRun(id:string, reason:'USER_EXIT'|'EXPIRED', now:Date): Promise<DemoRun>;
 listExpiredRuns(limit:number): Promise<Array<Pick<DemoRun,'id'|'organizationId'|'locationId'|'expiresAt'>>>;
}
