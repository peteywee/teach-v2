export type DemoErrorCode = 'UNAUTHENTICATED'|'FORBIDDEN'|'NOT_FOUND'|'INVALID_REQUEST'|'UNSUPPORTED_MEDIA_TYPE'|'CONFLICT'|'PRECONDITION_FAILED'|'IDEMPOTENCY_KEY_REUSED'|'RATE_LIMITED'|'INTERNAL_ERROR'|'SERVICE_UNAVAILABLE';
/** Finite non-disclosing boundary failures. Never put submitted values or dependency errors here. */
export class DemoError extends Error {
  readonly retryAfterSeconds: number | undefined;
  constructor(readonly code:DemoErrorCode, options:{retryAfterSeconds?:number}={}) {
    super(code); this.name='DemoError';
    this.retryAfterSeconds=(code==='RATE_LIMITED'||code==='SERVICE_UNAVAILABLE')&&Number.isSafeInteger(options.retryAfterSeconds)&&options.retryAfterSeconds!>0?options.retryAfterSeconds:undefined;
  }
}
