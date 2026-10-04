#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
const ROOT=resolve(process.cwd());
const errors=[];
const load=(p)=>{try{return JSON.parse(readFileSync(join(ROOT,p),'utf8'));}catch(e){errors.push(`${p}: ${e.message}`);return null;}};
const p=load('persistence/physical-slices/transaction-control/proposed.json');
const r=load('persistence/physical-slices/readiness.json');
const m=load('kernel/manifest.json');
const ids=load('kernel/identifiers.json');

if(m?.version!=='0.14.0') errors.push(`transaction slice: expected K00 0.14.0, found ${m?.version}`);
if(r?.version!=='0.2.0' || r?.narrowed_next_lane?.preferred_slice!=='SLICE-P01') errors.push('transaction slice: readiness 0.2.0 must select SLICE-P01');
if((ids?.entries||[]).find(x=>x.id==='IdempotencyKey')?.status!=='approved') errors.push('transaction slice: IdempotencyKey must be approved');
if(p){
 if(p.proposal_id!=='TEACH-TRANSACTIONCONTROL-FIRST-SLICE-DECISION-PACKET' || p.version!=='0.1.0' || p.status!=='proposed') errors.push('transaction slice: proposal identity/state mismatch');
 if((p.decisions_required||[]).length!==4) errors.push('transaction slice: expected 4 owner decisions');
 const rec=new Map((p.decisions_required||[]).map(x=>[x.id,x.recommended]));
 const expected=new Map([
  ['TXN-SLICE-D01','BOTH_BY_OPERATION'],
  ['TXN-SLICE-D02','OPERATION_DECLARED_MINIMUM'],
  ['TXN-SLICE-D03','OPTIONAL_ONE'],
  ['TXN-SLICE-D04','INHERIT_ORIGINATING_OPERATION_SCOPE'],
 ]);
 for(const [id,v] of expected) if(rec.get(id)!==v) errors.push(`transaction slice: ${id} recommendation drifted`);
 if(p.proposed_relationship?.id!=='ReconciliationRecordUsesIdempotencyKey') errors.push('transaction slice: relationship proposal missing');
 if(p.proposed_relationship?.cardinality_if_recommended_option!=='many-to-zero-or-one') errors.push('transaction slice: relationship cardinality recommendation drifted');
 if(p.readiness?.owner_approval!=='BLOCKED' || p.readiness?.physical_schema!=='BLOCKED') errors.push('transaction slice: approval/schema must remain blocked');
}
if(errors.length){
 console.error(`TransactionControl first-slice decision packet FAILED (${errors.length} problem${errors.length===1?'':'s'}):`);
 for(const e of errors) console.error(`- ${e}`);
 process.exit(1);
}
console.log('TransactionControl first-slice decision packet PASS');
console.log('Owner decisions required: 4');
console.log('Recommended relationship: many-to-zero-or-one');
console.log('Physical schema: BLOCKED');
