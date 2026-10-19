import type {IncomingMessage,ServerResponse} from 'node:http';
import {runtimeReadback} from './entrypoint.js';
import {captureRuntimeConfiguration} from './runtime-config.js';
import {hostedFailure} from '../demo-hosted/transport.js';
import {writeHostedResponse} from '../demo-hosted/node-adapter.js';
// Configuration is captured once during module initialization, before runtime imports
// select a database schema. Missing/invalid configuration never constructs a pool.
// Selecting this artifact is an operator deployment action, not request authority.
const initialized=(async()=>{
 try{if(!runtimeReadback().verified)throw Error('Runtime patch requires reverification');const config=captureRuntimeConfiguration(process.env);
 const {createHostedRuntime}=await import('./runtime.js');return createHostedRuntime(config);
 }catch{return null;}
})();
export default async function handler(incoming:IncomingMessage,outgoing:ServerResponse):Promise<void>{
 const runtime=await initialized;
 if(!runtime){await writeHostedResponse(hostedFailure('SERVICE_UNAVAILABLE'),outgoing);return;}
 await runtime.nodeHandler(incoming,outgoing);
}
