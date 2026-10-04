import assert from 'node:assert/strict';
import test from 'node:test';
import {
  deriveSingleUseVerifier,
  issueSingleUseSecret,
} from './single-use-secret.js';

test('single-use secrets are unique canonical 32-byte CSPRNG values with 32-byte verifiers', () => {
  const seen=new Set<string>();
  for(let i=0;i<1000;i++){
    const issued=issueSingleUseSecret();
    assert.match(issued.secret,/^[A-Za-z0-9_-]{43}$/);
    assert.equal(Buffer.from(issued.secret,'base64url').length,32);
    assert.equal(issued.verifier.length,32);
    assert.deepEqual(deriveSingleUseVerifier(issued.secret),issued.verifier);
    assert.equal(seen.has(issued.secret),false);
    seen.add(issued.secret);
  }
});

test('stored verifier material is not the reusable secret', () => {
  const issued=issueSingleUseSecret();
  const verifierAsSecret=issued.verifier.toString('base64url');
  assert.notDeepEqual(deriveSingleUseVerifier(verifierAsSecret),issued.verifier);
});
