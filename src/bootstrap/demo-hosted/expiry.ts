import type {DemoApplication} from '../demo/application.js';
import {DemoError} from '../../modules/authorization/application/demo-error.js';
import {hostedFailure} from './transport.js';
export type HostedExpiryPort=Pick<DemoApplication,'expireDueRuns'>;
/** Unmounted default-deny invocation boundary. No supplied headers, body, principal,
 * selectors or environment flag can authorize it. Scheduler authentication is unapproved. */
export function createDisabledHostedExpiryInvocation(_applicationFactory?:()=>HostedExpiryPort):(request:Request)=>Promise<Response>{
 return async _request=>hostedFailure('FORBIDDEN');
}
/** Pure constraints for a future verified invoker. Never chooses an actor/scope. */
export async function assertEmptyExpiryInvocation(request:Request):Promise<void>{
 if(request.method!=='POST'||new URL(request.url).search||request.headers.has('Idempotency-Key')||request.headers.get('Content-Length')!==null&&request.headers.get('Content-Length')!=='0')throw new DemoError('INVALID_REQUEST');
 if(request.body){const reader=request.body.getReader();try{const next=await reader.read();if(!next.done){await reader.cancel();throw new DemoError('INVALID_REQUEST');}}finally{reader.releaseLock();}}
}
export function validateExpiryBatchResult(value:unknown):number{
 if(typeof value!=='number'||!Number.isInteger(value)||value<0||value>100)throw new DemoError('SERVICE_UNAVAILABLE');return value;
}
