import {createHash} from 'node:crypto';
import {canonicalJson} from '../../content/domain/demo-content.js';
import {AUTHORING_LIMITS} from '../../content/domain/demo-authoring.js';
import type {AuthoringOwner} from '../../content/application/ports/demo-authoring.js';
import type {DemoContext} from '../../authorization/application/demo-authorization.js';
import {DemoError} from '../../authorization/application/demo-error.js';
import type {AuthoringMutation,AuthoringReceiptPort} from './ports/demo-authoring-receipts.js';
export async function prepareAuthoringReceipt(port:AuthoringReceiptPort,owner:AuthoringOwner,context:DemoContext,operation:AuthoringMutation,key:string|null,payload:unknown){
 if(!key||!/^[A-Za-z0-9_-]{16,128}$(?![\s\S])/.test(key))throw new DemoError('INVALID_REQUEST');
 const payloadDigest=createHash('sha256').update(canonicalJson({operation,payload})).digest('hex');
 const prior=await port.get(owner,key);await context.refresh();
 if(prior){if(prior.operation!==operation||prior.payloadDigest!==payloadDigest)throw new DemoError('IDEMPOTENCY_KEY_REUSED');if(context.now>=prior.expiresAt)throw new DemoError('CONFLICT');return {replay:structuredClone(prior.result),save:async(_result:Record<string,unknown>)=>{throw new DemoError('CONFLICT');}};}
 const count=await port.countOwnedReceipts(owner);await context.refresh();if(!Number.isSafeInteger(count)||count<0)throw new DemoError('SERVICE_UNAVAILABLE');if(count>=AUTHORING_LIMITS.receiptKeys)throw new DemoError('PRECONDITION_FAILED');
 return {replay:null,save:async(result:Record<string,unknown>)=>{await context.refresh();await port.put({...owner,key,operation,payloadDigest,result:structuredClone(result),createdAt:new Date(context.now),expiresAt:new Date(context.run.expiresAt)});await context.refresh();}};
}

export async function readAuthoringOperation(port:AuthoringReceiptPort,owner:AuthoringOwner,context:DemoContext,key:string,operation:AuthoringMutation){
 const receipt=await port.get(owner,key);await context.refresh();if(!receipt)return {found:false,operation,key};if(receipt.operation!==operation)throw new DemoError('IDEMPOTENCY_KEY_REUSED');return {found:true,operation,key,result:structuredClone(receipt.result)};
}
