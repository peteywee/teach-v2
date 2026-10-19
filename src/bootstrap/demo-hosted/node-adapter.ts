import type {IncomingMessage, ServerResponse} from 'node:http';
import {Readable} from 'node:stream';
import {validateHostedOrigin} from './configuration.js';
import {hostedFailure} from './transport.js';

/** Unmounted provider seam. The caller must independently authorize composition.
 * No proxy trust, parsed body, inferred origin, retry, pool, or activation switch.
 */
export function toHostedRequest(incoming:IncomingMessage, allowedOrigin:string):Request {
 const origin=validateHostedOrigin(allowedOrigin);
 const headers=new Headers();
 const singles=new Set(['host','origin','cookie','content-length','content-type','transfer-encoding','sec-fetch-site','idempotency-key']);
 const seen=new Set<string>();
 for(let i=0;i<incoming.rawHeaders.length;i+=2){
  const name=incoming.rawHeaders[i]!,value=incoming.rawHeaders[i+1];
  if(value===undefined||singles.has(name.toLowerCase())&&seen.has(name.toLowerCase()))throw new Error('INVALID_REQUEST');
  seen.add(name.toLowerCase());headers.append(name,value);
 }
 if(headers.get('host')!==new URL(origin).host)throw new Error('INVALID_REQUEST');
 if(headers.has('content-length')&&headers.has('transfer-encoding'))throw new Error('INVALID_REQUEST');
 const target=incoming.url;
 if(!target||!target.startsWith('/')||target.startsWith('//')||/[\\\r\n#]/.test(target))throw new Error('INVALID_REQUEST');
 const url=new URL(target,origin);
 // Do not silently normalize dot segments, percent encodings or the target path.
 if(url.origin!==origin||url.pathname+url.search!==target)throw new Error('INVALID_REQUEST');
 const method=incoming.method;
 if(!method)throw new Error('INVALID_REQUEST');
 // Fetch forbids GET/HEAD bodies. Reject HTTP body framing instead of dropping it.
 if((method==='GET'||method==='HEAD')&&(headers.has('transfer-encoding')||headers.has('content-length')&&headers.get('content-length')!=='0'))throw new Error('INVALID_REQUEST');
 const init:RequestInit&{duplex?:'half'}={method,headers};
 if(method!=='GET'&&method!=='HEAD'){
  init.body=Readable.toWeb(incoming) as ReadableStream<Uint8Array>;init.duplex='half';
 }
 return new Request(url,init);
}

export async function writeHostedResponse(response:Response,outgoing:ServerResponse):Promise<void>{
 // Never comma-join Set-Cookie, including future multi-cookie responses.
 const headers:Record<string,string|string[]>={};
 for(const [name,value] of response.headers)if(name!=='set-cookie')headers[name]=value;
 const cookies=response.headers.getSetCookie();if(cookies.length)headers['set-cookie']=cookies;
 const bytes=Buffer.from(await response.arrayBuffer());
 outgoing.writeHead(response.status,headers);outgoing.end(bytes);
}

/** Testable transport adaptation only. No exported default provider entrypoint. */
export function createHostedNodeAdapter(options:{allowedOrigin:string;handle:(request:Request)=>Promise<Response>}) {
 const origin=validateHostedOrigin(options.allowedOrigin);
 return async(incoming:IncomingMessage,outgoing:ServerResponse):Promise<void>=>{
  let request:Request;
  try{request=toHostedRequest(incoming,origin);}catch{await writeHostedResponse(hostedFailure('INVALID_REQUEST'),outgoing);return;}
  let response:Response;
  try{response=await options.handle(request);}catch{response=hostedFailure('SERVICE_UNAVAILABLE');}
  await writeHostedResponse(response,outgoing);
 };
}
