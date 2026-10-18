import assert from 'node:assert/strict';
import test from 'node:test';
import { createDemoHttpHandler } from '../../src/bootstrap/demo/http.js';
import type { DemoApplicationPort } from '../../src/bootstrap/demo/application-port.js';
import { issueSessionCredential } from '../../src/modules/identity/domain/application-session.js';

const origin = 'https://localhost:4443';
test('cookie issuance is ephemeral, exact C12 and omitted on failed commit', async () => {
  const issued = issueSessionCredential();
  const app: DemoApplicationPort = { async execute(request) {
    assert.equal(request.operation, 'BeginDemoRun'); request.readInput();
    return { body: { synthetic: true }, issuedCredential: issued.credential };
  } };
  const handler = createDemoHttpHandler({ application: app, allowedOrigin: origin });
  const result = await handler(new Request(origin + '/api/v1/demo/start', { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' }, body: '{}' }));
  assert.equal(result.status, 201);
  assert.ok(result.headers.get('set-cookie')===`__Host-teach_session=${issued.credential}; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=43200`, 'exact cookie attributes and ephemeral delivery');
  assert.ok(!(await result.text()).includes(issued.credential));
});

test('malformed and duplicate cookies never become a credential or a verifier lookup', async () => {
  const issued = issueSessionCredential();
  const credentials: Array<string | null> = [];
  const app: DemoApplicationPort = { async execute(request) { credentials.push(request.credential); return { body: {} }; } };
  const handler = createDemoHttpHandler({ application: app, allowedOrigin: origin });
  for (const cookie of ['__Host-teach_session=bad', `__Host-teach_session=${issued.credential}; __Host-teach_session=${issued.credential}`, '__Host-teach_session=' + 'A'.repeat(42) + 'B']) {
    const result = await handler(new Request(origin + '/api/v1/session', { headers: { Cookie: cookie } }));
    assert.equal(result.status, 401);
  }
  assert.equal(credentials.length, 0);
});
