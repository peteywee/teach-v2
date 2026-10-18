import { createHash,randomUUID } from 'node:crypto';
import type { ReceiptPort,ReceiptKey } from './ports/demo-receipts.js';
import type { DemoCommandContext } from '../../authorization/application/ports/demo-command-context.js';
import { DemoError } from '../../authorization/application/demo-error.js';

export async function prepareDemoReceipt(port:ReceiptPort,context:DemoCommandContext,operation:ReceiptKey['operation'],key:string|null,payload:object):Promise<{replay:object|null;save(response:object):Promise<void>}>{
  if(!key||!/^[A-Za-z0-9_-]{16,128}$/.test(key))throw new DemoError('INVALID_REQUEST');
  const receiptKey:ReceiptKey={...context.actor,...context.scope,operation,key};
  const digest=createHash('sha256').update(canonicalPayload(payload)).digest('hex');
  const existing=await port.get(receiptKey);await context.refresh();
  if(existing){
    if(existing.canonicalPayloadDigest!==digest)throw new DemoError('IDEMPOTENCY_KEY_REUSED');
    if(context.now>=existing.replayUntil)throw new DemoError('CONFLICT');
    return {replay:structuredClone(existing.response),save:async()=>{throw new DemoError('CONFLICT');}};
  }
  return {replay:null,save:async response=>{await context.refresh();await port.put({...receiptKey,id:randomUUID(),canonicalPayloadDigest:digest,responseSchemaVersion:1,response:structuredClone(response),createdAt:new Date(context.now),replayUntil:new Date(context.now.getTime()+86400000)});}};
}

function canonicalPayload(value:unknown):string{
  if(value===null||typeof value==='string'||typeof value==='boolean')return JSON.stringify(value);
  if(typeof value==='number'&&Number.isSafeInteger(value))return JSON.stringify(value);
  if(Array.isArray(value))return '['+value.map(canonicalPayload).join(',')+']';
  if(value&&typeof value==='object')return '{'+Object.keys(value).sort().map(key=>JSON.stringify(key)+':'+canonicalPayload((value as Record<string,unknown>)[key])).join(',')+'}';
  throw new DemoError('INVALID_REQUEST');
}
