import assert from 'node:assert/strict';
import { test } from 'node:test';
import { snapshotPersistenceInput as identitySnapshot } from '../../src/modules/identity/infrastructure/persistence/input-snapshot.mjs';
import { snapshotPersistenceInput as reconciliationSnapshot } from '../../src/modules/transaction-control/infrastructure/persistence/input-snapshot.mjs';

for(const [owner,snapshot] of [['Identity',identitySnapshot],['TransactionControl',reconciliationSnapshot]]) {
  test(`${owner}: nested scope and binding detach from caller mutation`,()=>{
    const input={id:'original',authoritativeScope:{organizationId:'acme',locations:['kitchen']},idempotency:{key:'key-a',payloadHash:'hash-a'}};
    const captured=snapshot(input);
    input.id='changed';input.authoritativeScope.organizationId='other';input.authoritativeScope.locations.push('other');input.idempotency.key='key-b';
    assert.deepEqual(captured,{id:'original',authoritativeScope:{organizationId:'acme',locations:['kitchen']},idempotency:{key:'key-a',payloadHash:'hash-a'}});
  });
  test(`${owner}: Date value is detached without changing its representation`,()=>{
    const input={now:new Date('2026-10-04T12:00:00Z')};const captured=snapshot(input);
    input.now.setUTCFullYear(2030);assert.ok(captured.now instanceof Date);assert.equal(captured.now.toISOString(),'2026-10-04T12:00:00.000Z');
  });
  test(`${owner}: Buffer verifier is detached and remains a Buffer`,()=>{
    const input={secret:{verifier:Buffer.from([1,2,3])}};const captured=snapshot(input);
    input.secret.verifier.fill(0);assert.ok(Buffer.isBuffer(captured.secret.verifier));assert.deepEqual(captured.secret.verifier,Buffer.from([1,2,3]));
  });
  test(`${owner}: nonserializable authority input fails closed`,()=>{
    assert.throws(()=>snapshot({scope:{claim:()=>true}}));
  });
}
