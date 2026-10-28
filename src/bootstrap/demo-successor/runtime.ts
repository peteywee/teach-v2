import pg from 'pg';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createAuthoringApplication} from '../demo-authoring/application.js';
import type {AuthoringTransactionRunner} from '../demo-authoring/application.js';
import {createHostedAuthoringTransport,type HostedStaticAsset} from '../demo-hosted/transport.js';
import {createHostedNodeAdapter} from '../demo-hosted/node-adapter.js';
import {SuccessorDemoTransaction} from './transaction.js';
import {retainSuccessorPool} from './pool.js';
import type {captureRuntimeConfiguration} from './runtime-config.js';

/** Local/test seam; production entrypoint supplies only captured server configuration. */
export function assembleHostedRuntime(config:ReturnType<typeof captureRuntimeConfiguration>,transactions:AuthoringTransactionRunner){
 const inventory=JSON.parse(readFileSync(new URL('../../web/demo/assets.json',import.meta.url),'utf8')) as {path:string;file:string;contentType:string}[];
 const assets=new Map<string,HostedStaticAsset>();
 for(const row of inventory){if(!/^[a-zA-Z0-9.-]+$/.test(row.file))throw Error('Invalid asset path');const bytes=readFileSync(new URL('../../web/demo/'+row.file,import.meta.url));assets.set(row.path,{bytes,contentType:row.contentType,sha256:createHash('sha256').update(bytes).digest('hex')});}
 const handle=createHostedAuthoringTransport({application:createAuthoringApplication({transactions}),allowedOrigin:config.origin,assets});
 return {handle,nodeHandler:createHostedNodeAdapter({allowedOrigin:config.origin,handle})};
}
export function createRuntimePool(options:pg.PoolConfig){
 const pool=new pg.Pool(options);
 // pg removes and destroys the failed idle client before emitting this event.
 // Absorb the notification: no credentials/SQL/error text reach logs or responses.
 // A subsequent checkout obtains a fresh connection under the same bounded policy.
 pool.on('error',()=>{});return pool;
}
export function createHostedRuntime(config:ReturnType<typeof captureRuntimeConfiguration>){
 const retained=retainSuccessorPool(()=>createRuntimePool(config.options));
 const transactions=new SuccessorDemoTransaction(retained.get());
 return {...assembleHostedRuntime(config,transactions),close:()=>retained.close()};
}
