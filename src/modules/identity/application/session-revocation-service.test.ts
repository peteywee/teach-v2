import assert from 'node:assert/strict';
import test from 'node:test';
import { revokeApplicationSession } from './session-revocation-service.js';
import type { ApplicationSessionCommandTransaction } from './ports/application-session-command-transaction.js';
import type { ApplicationSessionRecord } from '../domain/application-session.js';
import type { SessionRevocationRequest } from '../../authorization/application/ports/session-command-authorization.js';

const now=new Date('2026-10-05T03:00:00Z');
const request=()=>({actorReference:'fixture',actorClass:'HumanActor' as const,targetIdentityId:'identity-1',targetSessionId:'session-1',requestId:'request-1',now:new Date(now)});
function fixture(options:{deny?:boolean;auditFailure?:boolean;terminal?:'REVOKED'|'EXPIRED';wrongOwner?:boolean}={}) {
 const calls:string[]=[],facts:unknown[]=[];
 const transaction:ApplicationSessionCommandTransaction={async run(work){calls.push('begin');try{const result=await work({
  sessionAuthorization:{async requireSessionAuthorization(){calls.push('authorize');if(options.deny)throw new Error('fixture denied');}},
  sessions:{async revokeWithOutcome(input){calls.push('owner');const session:ApplicationSessionRecord={id:input.id,identityId:options.wrongOwner?'wrong':input.identityId,status:options.terminal??'REVOKED',verifierVersion:'v1',verifier:Buffer.alloc(32),issuedAt:now,absoluteExpiresAt:new Date(now.getTime()+43200000),lastUsedAt:now,revokedAt:input.now,expiredAt:null,createdAt:now,updatedAt:input.now};return {session,transitioned:!options.terminal};}},
  audit:{async appendRequired(input){calls.push('audit');facts.push(input);if(options.auditFailure)throw new Error('fixture audit failed');}},
 });calls.push('commit');return result;}catch(error){calls.push('rollback');throw error;}}};return {transaction,calls,facts};
}
test('session revocation authorizes, transitions and audits inside one boundary',async()=>{const f=fixture(),input=request();const result=await revokeApplicationSession(f.transaction,input);assert.equal(result.status,'REVOKED');assert.deepEqual(f.calls,['begin','authorize','owner','audit','commit']);assert.deepEqual(f.facts,[{actorReference:input.actorReference,actorClass:input.actorClass,action:'RevokeApplicationSession',targetIdentityId:input.targetIdentityId,targetSessionId:input.targetSessionId,requestId:input.requestId,occurredAt:input.now,result:'SUCCEEDED'}]);});
test('denied session authority prevents owner mutation and append',async()=>{const f=fixture({deny:true});await assert.rejects(revokeApplicationSession(f.transaction,request()),/denied/);assert.deepEqual(f.calls,['begin','authorize','rollback']);});
test('failed required session audit cannot commit',async()=>{const f=fixture({auditFailure:true});await assert.rejects(revokeApplicationSession(f.transaction,request()),/audit failed/);assert.deepEqual(f.calls,['begin','authorize','owner','audit','rollback']);});
for(const terminal of ['REVOKED','EXPIRED'] as const)test(`${terminal} remains terminal and does not append duplicate success audit`,async()=>{const f=fixture({terminal});assert.equal((await revokeApplicationSession(f.transaction,request())).status,terminal);assert.deepEqual(f.calls,['begin','authorize','owner','commit']);assert.equal(f.facts.length,0);});
for(const field of ['actorReference','targetIdentityId','targetSessionId','requestId'] as const)test(`blank ${field} rejects before transaction`,async()=>{const f=fixture();await assert.rejects(revokeApplicationSession(f.transaction,{...request(),[field]:' '}),/non-blank/);assert.deepEqual(f.calls,[]);});
test('invalid session command clock rejects before transaction',async()=>{const f=fixture();await assert.rejects(revokeApplicationSession(f.transaction,{...request(),now:new Date(NaN)}),/finite/);assert.deepEqual(f.calls,[]);});
test('runtime agent actor cannot invoke session mechanism',async()=>{const f=fixture();await assert.rejects(revokeApplicationSession(f.transaction,{...request(),actorClass:'RuntimeAgent'} as unknown as Omit<SessionRevocationRequest,'command'>),/unsupported/);assert.deepEqual(f.calls,[]);});
test('inconsistent owner scope rolls back before success audit',async()=>{const f=fixture({wrongOwner:true});await assert.rejects(revokeApplicationSession(f.transaction,request()),/inconsistent/);assert.deepEqual(f.calls,['begin','authorize','owner','rollback']);});
test('mutating caller or authorization input cannot redirect revocation or audit',async()=>{const f=fixture(),input=request();const run=f.transaction.run.bind(f.transaction);f.transaction.run=work=>run(context=>work({...context,sessionAuthorization:{async requireSessionAuthorization(captured){input.targetSessionId='other';input.targetIdentityId='changed';input.now.setTime(0);(captured as {targetSessionId:string}).targetSessionId='adapter-change';}}}));const result=await revokeApplicationSession(f.transaction,input);assert.equal(result.id,'session-1');assert.equal(result.identityId,'identity-1');assert.equal(result.updatedAt.getTime(),now.getTime());assert.equal((f.facts[0] as {targetSessionId:string}).targetSessionId,'session-1');});
