import assert from 'node:assert/strict';
import test from 'node:test';
import { deactivateIdentity, reactivateIdentity } from './identity-lifecycle-service.js';
import type { IdentityCommandTransaction } from './ports/identity-command-transaction.js';
import type { IdentityLifecycleRequest } from '../../authorization/application/ports/identity-command-authorization.js';

const request = () => ({ actorReference: 'actor-1', actorClass: 'HumanActor' as const, targetIdentityId: 'identity-1', requestId: 'request-1', now: new Date('2026-10-05T02:00:00Z') });
function fixture(options: { deny?: boolean; auditFailure?: boolean; ownerFailure?: boolean; wrongResult?: boolean } = {}) {
  const calls: string[] = [], auditFacts: unknown[] = [];
  const transaction: IdentityCommandTransaction = {
    async run(work) {
      calls.push('begin');
      try {
        const result = await work({
          identities: {
            async create() { throw new Error('unexpected create'); }, async getById() { return null; },
            async deactivate(input) { calls.push('deactivate'); if(options.ownerFailure) throw new Error('owner failed'); return { id: options.wrongResult ? 'other' : input.id, status: 'INACTIVE', offboardedAt: null, createdAt: input.now, updatedAt: input.now }; },
            async reactivate(input) { calls.push('reactivate'); return { id: input.id, status: 'ACTIVE', offboardedAt: null, createdAt: input.now, updatedAt: input.now }; },
          },
          authorization: { async requireAuthorization() { calls.push('authorize'); if(options.deny) throw new Error('authority unavailable'); } },
          audit: { async appendRequired(input) { calls.push('audit'); auditFacts.push(input); if(options.auditFailure) throw new Error('audit failed'); } },
        });
        calls.push('commit'); return result;
      } catch(error) { calls.push('rollback'); throw error; }
    },
  };
  return { transaction, calls, auditFacts };
}
for (const [command, invoke, status, action] of [['deactivate',deactivateIdentity,'INACTIVE','DeactivateIdentity'],['reactivate',reactivateIdentity,'ACTIVE','ReactivateIdentity']] as const) {
  test(`${command} orders authority, owner write and required audit in one boundary`, async () => {
    const f=fixture(), input=request(); const result=await invoke(f.transaction,input);
    assert.equal(result.status,status); assert.deepEqual(f.calls,['begin','authorize',command,'audit','commit']);
    assert.deepEqual(f.auditFacts,[{actorReference:input.actorReference,actorClass:input.actorClass,action,targetIdentityId:input.targetIdentityId,requestId:input.requestId,occurredAt:input.now,result:'SUCCEEDED'}]);
  });
  test(`${command} denied or unavailable authority prevents all writes and audit`, async () => {
    const f=fixture({deny:true});await assert.rejects(invoke(f.transaction,request()),/authority unavailable/);assert.deepEqual(f.calls,['begin','authorize','rollback']);
  });
  test(`${command} audit failure prevents commit`, async () => {
    const f=fixture({auditFailure:true});await assert.rejects(invoke(f.transaction,request()),/audit failed/);assert.equal(f.calls.at(-1),'rollback');assert.equal(f.calls.includes('commit'),false);
  });
}
for (const field of ['actorReference','targetIdentityId','requestId'] as const) {
  test(`blank ${field} rejects before transaction`,async()=>{const f=fixture();await assert.rejects(deactivateIdentity(f.transaction,{...request(),[field]:' '}),/non-blank/);assert.deepEqual(f.calls,[]);});
}
test('invalid clock rejects before transaction',async()=>{const f=fixture();await assert.rejects(deactivateIdentity(f.transaction,{...request(),now:new Date(NaN)}),/finite/);assert.deepEqual(f.calls,[]);});
test('unapproved runtime agent actor rejects before transaction',async()=>{const f=fixture();await assert.rejects(deactivateIdentity(f.transaction,{...request(),actorClass:'RuntimeAgent'} as unknown as Omit<IdentityLifecycleRequest,'command'>),/unsupported actor/);assert.deepEqual(f.calls,[]);});
test('owner failure cannot append success audit or commit',async()=>{const f=fixture({ownerFailure:true});await assert.rejects(deactivateIdentity(f.transaction,request()),/owner failed/);assert.deepEqual(f.calls,['begin','authorize','deactivate','rollback']);});
test('inconsistent owner result rolls back before audit',async()=>{const f=fixture({wrongResult:true});await assert.rejects(deactivateIdentity(f.transaction,request()),/inconsistent/);assert.deepEqual(f.calls,['begin','authorize','deactivate','rollback']);});
test('caller mutation during authority await cannot redirect target or audit facts',async()=>{
  const f=fixture(),mutable=request(),initial=request();const originalRun=f.transaction.run.bind(f.transaction);
  f.transaction.run=work=>originalRun(context=>work({...context,authorization:{async requireAuthorization(input){mutable.targetIdentityId='other';mutable.actorReference='changed';mutable.now.setTime(0);(input as {targetIdentityId:string}).targetIdentityId='adapter-changed';}}}));
  const result=await deactivateIdentity(f.transaction,mutable);assert.equal(result.id,initial.targetIdentityId);
  assert.equal((f.auditFacts[0] as {actorReference:string}).actorReference,initial.actorReference);assert.equal(result.updatedAt.getTime(),initial.now.getTime());
});
