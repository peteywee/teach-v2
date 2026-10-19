import type {IncomingMessage,ServerResponse} from 'node:http';
import {readFileSync} from 'node:fs';
import {createDisabledHostedDemo} from './composition.js';
import {writeHostedResponse} from './node-adapter.js';
import {inspectHostedRuntime} from './runtime-policy.js';

/** Local readback export, not a mounted diagnostic route or activation authority. */
export function runtimeReadback(){
 let buildNodeVersion:unknown;
 try{buildNodeVersion=(JSON.parse(readFileSync(new URL('../../../build-runtime.json',import.meta.url),'utf8')) as {nodeVersion?:unknown}).nodeVersion;}catch{/* Missing/malformed evidence is unverified. */}
 return inspectHostedRuntime(buildNodeVersion);
}
const disabled=createDisabledHostedDemo();
/** Build Output API Nodejs launcher entrypoint. Never consumes user input or creates
 * a dependency while hosted activation is unapproved. The fixed Request is solely
 * an inert argument to H01's always-deny composition, not an inferred user origin.
 * No provider/environment value or runtime equality can activate this entrypoint.
 */
export default async function handler(_incoming:IncomingMessage,outgoing:ServerResponse):Promise<void>{
 runtimeReadback();
 await writeHostedResponse(await disabled.handle(new Request('https://disabled.example.invalid/')),outgoing);
}
