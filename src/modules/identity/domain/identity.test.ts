import assert from 'node:assert/strict';
import test from 'node:test';
import { assertAllowedIdentityTransition } from './identity.js';

test('Identity permits only ACTIVE <-> INACTIVE application transitions', () => {
  assert.doesNotThrow(() => assertAllowedIdentityTransition('ACTIVE', 'INACTIVE'));
  assert.doesNotThrow(() => assertAllowedIdentityTransition('INACTIVE', 'ACTIVE'));
});

test('Identity DELETED ingress is fail-closed', () => {
  assert.throws(
    () => assertAllowedIdentityTransition('ACTIVE', 'DELETED'),
    /DELETED ingress is not authorized/,
  );
  assert.throws(
    () => assertAllowedIdentityTransition('INACTIVE', 'DELETED'),
    /DELETED ingress is not authorized/,
  );
});
