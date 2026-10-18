/** Transport composition contract. Owning services remain in the eight registered domains. */
export type DemoOperation = 'ReadCurrentSession' | 'RevokeApplicationSession' | 'ListOwnMemberships' | 'ListTeam' | 'ReadTeamMemberLearnerState' | 'AssignContent' | 'ListOwnAssignments' | 'ReadAssignedContentVersion' | 'StartLearningSession' | 'RecordProgressEvent' | 'CompleteLearningSession' | 'ReadOwnLearnerState' | 'BeginDemoRun' | 'SwitchDemoPersona' | 'CloseDemoRun';
export interface DemoInput {
  params: Record<string, string>;
  body: Record<string, unknown>;
  query: { limit: number; cursor: string | null; assignmentId: string | null };
  idempotencyKey: string | null;
}
export interface DemoApplicationRequest {
  operation: DemoOperation;
  requestId: string;
  credential: string | null;
  /** Unverified peer information, proxy headers and full addresses never enter this boundary. */
  admissionPrefix: string;
  /** Called only after preliminary authentication. Values are selectors, never authorization. */
  readInput(): DemoInput;
}
export interface DemoApplicationResult {
  body?: unknown;
  /** Ephemeral in-memory delivery only. Must not enter the body, log, audit or receipt. */
  issuedCredential?: string;
  clearCookie?: boolean;
}
export interface DemoApplicationPort {
  execute(request: DemoApplicationRequest): Promise<DemoApplicationResult>;
  /** Redacted C23 denial metadata only. Failure cannot authorize the rejected request. */
  recordOriginDenial?(requestId: string, operation: DemoOperation): Promise<void>;
}
