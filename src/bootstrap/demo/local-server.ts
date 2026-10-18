import {createServer,type Server} from 'node:http';
import {Readable} from 'node:stream';
import {existsSync,readFileSync,realpathSync} from 'node:fs';
import {resolve,sep} from 'node:path';
import {execFileSync} from 'node:child_process';
import {parseStrictJson} from '../../modules/content/domain/demo-content.js';
import pg from 'pg';
import {loadLocalDemoActivation,executingDemoSourceRoot} from './local-activation.js';
import {createDemoApplication} from './application.js';
import {PostgresDemoTransaction} from './postgres-demo-transaction.js';
import {createDemoHttpHandler} from './http.js';
import {DemoError} from '../../modules/authorization/application/demo-error.js';

export interface DemoStaticAsset {contentType:'text/html; charset=utf-8'|'text/css; charset=utf-8'|'text/javascript; charset=utf-8'|'image/svg+xml';bytes:Uint8Array}
export interface LocalDemoServerOptions {sourceRoot:string;attestationPath:string;attestationSha256:string;databaseUrl:string;isolatedOptIn:string|undefined;allowedOrigin:string}
/** Assets come only from the tracked clean executing tree, never caller-supplied bytes. */
export function loadReviewedDemoAssets(sourceRoot:string,candidateCommit:string):ReadonlyMap<string,DemoStaticAsset>{
 if(!/^[a-f0-9]{40}$/.test(candidateCommit))throw new DemoError('SERVICE_UNAVAILABLE');
 const root=executingDemoSourceRoot(sourceRoot);
 const committed=(file:string)=>execFileSync('git',['show',candidateCommit+':src/web/demo/'+file],{cwd:root,timeout:1000,maxBuffer:5*1024*1024+1,stdio:['ignore','pipe','ignore']});
 const directory=resolve(root,'src/web/demo');const manifestPath=resolve(directory,'assets.json');const assets=new Map<string,DemoStaticAsset>();
 if(!existsSync(manifestPath))return assets;
 if(realpathSync(manifestPath)!==manifestPath)throw new DemoError('SERVICE_UNAVAILABLE');
 const bytes=readFileSync(manifestPath);if(!bytes.equals(committed('assets.json')))throw new DemoError('SERVICE_UNAVAILABLE');if(bytes.byteLength>16384)throw new DemoError('SERVICE_UNAVAILABLE');const manifest=parseStrictJson(bytes.toString('utf8'));
 if(!Array.isArray(manifest)||manifest.length>20)throw new DemoError('SERVICE_UNAVAILABLE');
 for(const entry of manifest){
  if(!entry||typeof entry!=='object'||Array.isArray(entry)||Object.keys(entry).sort().join(',')!=='contentType,file,path')throw new DemoError('SERVICE_UNAVAILABLE');
  const item=entry as Record<string,unknown>;
  if(typeof item.path!=='string'||!/^\/(?:assets\/[A-Za-z0-9_./-]+)?$(?![\s\S])/.test(item.path)||item.path.includes('..')||assets.has(item.path)||typeof item.file!=='string'||! /^(?:[A-Za-z0-9_-]+\/)*[A-Za-z0-9_.-]+$(?![\s\S])/.test(item.file)||item.file.includes('..')||!['text/html; charset=utf-8','text/css; charset=utf-8','text/javascript; charset=utf-8','image/svg+xml'].includes(item.contentType as string))throw new DemoError('SERVICE_UNAVAILABLE');
  const path=resolve(directory,item.file);if(!path.startsWith(directory+sep)||realpathSync(path)!==path)throw new DemoError('SERVICE_UNAVAILABLE');const body=readFileSync(path);if(!body.equals(committed(item.file)))throw new DemoError('SERVICE_UNAVAILABLE');if(body.byteLength>5*1024*1024)throw new DemoError('SERVICE_UNAVAILABLE');assets.set(item.path,{contentType:item.contentType as DemoStaticAsset['contentType'],bytes:body});
 }
 return assets;
}
/** The only listener constructor. Never migrates, grants privileges, creates credentials,
 * changes trust settings or listens on a non-loopback interface. No import side effects. */
export async function startLocalDemoServer(options:LocalDemoServerOptions):Promise<{server:Server;close():Promise<void>}> {
 const attestation=loadLocalDemoActivation(options);
 const origin=new URL(options.allowedOrigin);
 const assets=loadReviewedDemoAssets(executingDemoSourceRoot(options.sourceRoot),attestation.candidate_commit);
 const pool=new pg.Pool({connectionString:options.databaseUrl,max:8,connectionTimeoutMillis:5000,statement_timeout:5000,lock_timeout:5000,idle_in_transaction_session_timeout:5000});
 // Establish a bounded dependency check before mounting anything. Never fall back to memory.
 try{await pool.query('SELECT 1');}catch{await pool.end();throw new DemoError('SERVICE_UNAVAILABLE');}
 const application=createDemoApplication({transactions:new PostgresDemoTransaction(pool)});
 const handler=createDemoHttpHandler({application,allowedOrigin:options.allowedOrigin});
 const server=createServer({maxHeaderSize:16384,requestTimeout:25000,headersTimeout:10000,keepAliveTimeout:5000},async(incoming,outgoing)=>{
  try{
   const host=incoming.headers.host;if(host!==origin.host){outgoing.writeHead(400,{'Cache-Control':'no-store'});outgoing.end();return;}
   const url=new URL(incoming.url??'/',options.allowedOrigin);const asset=assets.get(url.pathname);
   if(incoming.method==='GET'&&asset&&!url.search){outgoing.writeHead(200,{'Content-Type':asset.contentType,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; object-src 'none'; form-action 'self'"});outgoing.end(asset.bytes);return;}
   const headers=new Headers();for(let i=0;i<incoming.rawHeaders.length;i+=2)headers.append(incoming.rawHeaders[i]!,incoming.rawHeaders[i+1]!);
   const method=incoming.method??'GET';const init:RequestInit&{duplex?:'half'}={method,headers};if(method!=='GET'&&method!=='HEAD'){init.body=Readable.toWeb(incoming) as ReadableStream<Uint8Array>;init.duplex='half';}
   const response=await handler(new Request(url,init));outgoing.writeHead(response.status,Object.fromEntries(response.headers));outgoing.end(Buffer.from(await response.arrayBuffer()));
  }catch{if(!outgoing.headersSent)outgoing.writeHead(503,{'Cache-Control':'no-store'});outgoing.end();}
 });
 server.maxRequestsPerSocket=100;server.setTimeout(25000,socket=>socket.destroy());
 try{await new Promise<void>((resolve,reject)=>{server.once('error',reject);server.listen(Number(origin.port),'127.0.0.1',()=>{server.removeListener('error',reject);resolve();});});}catch{await pool.end();throw new DemoError('SERVICE_UNAVAILABLE');}
 // One in-flight bounded page. Authority is always the boot-validated exact expiry dispatcher.
 let expiry:Promise<unknown>|null=null;let closing=false;
 const sweep=()=>{if(!closing&&!expiry)expiry=application.expireDueRuns().catch(()=>undefined).finally(()=>{expiry=null;});};
 const interval=setInterval(sweep,60000);interval.unref();
 return {server,async close(){closing=true;clearInterval(interval);await new Promise<void>((resolve,reject)=>server.close(error=>error?reject(error):resolve()));if(expiry)await expiry;await pool.end();}};
}
