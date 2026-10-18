import type {DemoApplicationPort} from '../demo/application-port.js';
import type {HostedPoolFactory} from './pool.js';
import {hostedFailure} from './transport.js';

export interface DisabledHostedPreparationOptions {
 configuration?:unknown; packageEvidence?:unknown;
 applicationFactory?:()=>DemoApplicationPort;
 poolFactory?:HostedPoolFactory<unknown>;
}
const readiness=Object.freeze({state:'DISABLED',ready:false,hostedAuthorization:'NOT_IMPLEMENTED',providerVerified:false,reason:'HOSTED_ACTIVATION_REQUIRES_SEPARATE_APPROVAL'} as const);
/** The only packaged default composition. Deliberately no authorizer override.
 * It does not inspect environment variables or invoke dependency factories.
 * Integrity/configuration proposals alone are never operational authority. */
export function createDisabledHostedDemo(_options:DisabledHostedPreparationOptions={}){
 return Object.freeze({readiness:()=>readiness,handle:async(_request:Request):Promise<Response>=>hostedFailure('SERVICE_UNAVAILABLE')});
}
