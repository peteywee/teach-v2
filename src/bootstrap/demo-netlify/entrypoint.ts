import {hostedFailure} from '../demo-hosted/transport.js';
import {runtimeReadback} from '../demo-successor/entrypoint.js';

/** Provider preparation, not an accepting adapter. No environment value, valid
 * config, build/runtime equality, request or context can open the ingress gate.
 * No runtime/pool import or configuration/credential capture occurs here. */
const initialized=Promise.resolve(Object.freeze({rawIngressVerified:false as const}));
export default async function handler(_request:Request):Promise<Response>{
 await initialized;
 runtimeReadback(); // Exact patch evidence remains local readback, not authority.
 return hostedFailure('SERVICE_UNAVAILABLE');
}
