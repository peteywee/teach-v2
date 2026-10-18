import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createDemoHttpHandler, DEMO_ROUTES } from '../../src/bootstrap/demo/http.js';
import { issueSessionCredential } from '../../src/modules/identity/domain/application-session.js';
import { DemoError } from '../../src/bootstrap/demo/errors.js';
import type { DemoApplicationPort, DemoApplicationRequest } from '../../src/bootstrap/demo/application-port.js';

const origin = 'https://localhost:4443';
const cookie = `__Host-teach_session=${issueSessionCredential().credential}`;
function harness() {
  const calls: DemoApplicationRequest[] = [];
  let result: unknown = { ok: true };
  let failure: Error | null = null;
  const app: DemoApplicationPort = {
    async execute(request) {
      calls.push(request);
      if (failure) throw failure;
      request.readInput();
      return { body: result };
    },
  };
  return { calls, handler: createDemoHttpHandler({ application: app, allowedOrigin: origin }),
    fail(error: Error) { failure = error; }, result(value: unknown) { result = value; } };
}
const req = (path: string, method = 'GET', body?: string, headers: Record<string, string> = {}) => new Request(origin + path, {
  method, headers: { Cookie: cookie, ...(method !== 'GET' ? { Origin: origin, 'Content-Type': 'application/json' } : {}), ...headers },
  ...(body === undefined ? {} : { body }),
});

test('the mounted demo API is exactly the fifteen approved routes', () => {
  assert.equal(DEMO_ROUTES.length, 15);
  const approved=JSON.parse(readFileSync(new URL('../../domains/demo-runtime/proposal-0.1.0/transport-and-queries.json',import.meta.url),'utf8')).routes;
  assert.deepEqual(DEMO_ROUTES.map(({method,path,operation})=>({method,path,operation})),approved.map(({method,path,operation}: any)=>({method,path,operation})));
  assert.equal(new Set(DEMO_ROUTES.map(route => route.operation)).size, 15);
  assert.ok(!DEMO_ROUTES.some(route => /CreateDemoPersona|PublishContentPack|RevokeDemoSessions|Invite|Certif/.test(route.operation)));
});

test('origin rejection precedes application invocation and never echoes request content', async () => {
  for (const value of ['', 'null', 'https://evil.example', origin + '/']) {
    const h = harness();
    const response = await h.handler(req('/api/v1/demo/start', 'POST', '{"secret":"no echo"}', { Origin: value }));
    assert.equal(response.status, 403);
    assert.equal(h.calls.length, 0);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.doesNotMatch(await response.text(), /secret|no echo|evil/);
  }
});

test('unsafe fetch-site and content type are rejected before application invocation', async () => {
  const h = harness();
  assert.equal((await h.handler(req('/api/v1/demo/start', 'POST', '{}', { 'Sec-Fetch-Site': 'cross-site' }))).status, 403);
  assert.equal((await h.handler(req('/api/v1/demo/start', 'POST', '{}', { 'Content-Type': 'text/plain' }))).status, 415);
  assert.equal(h.calls.length, 0);
});

test('unknown routes, methods, or unsupported query selectors never dispatch', async () => {
  for (const [path, method] of [['/api/v1/demo/start', 'GET'], ['/api/v1/certifications', 'POST'], ['/api/v1/session?identityId=victim', 'GET']]) {
    const h = harness();
    const response = await h.handler(req(path!, method!, method === 'POST' ? '{}' : undefined));
    assert.ok([400, 404].includes(response.status));
    assert.equal(h.calls.length, 0);
  }
});

test('malformed JSON, duplicate keys, additional fields and forbidden retry headers reject', async () => {
  for (const body of ['{', '{"x":1,"x":2}', '{"organizationId":"chosen"}']) {
    const h = harness();
    const response = await h.handler(req('/api/v1/demo/start', 'POST', body));
    assert.equal(response.status, 400);
  }
  const h = harness();
  assert.equal((await h.handler(req('/api/v1/demo/start', 'POST', '{}', { 'Idempotency-Key': 'abcdefgh12345678' }))).status, 400);
});

test('every dependency exception fails closed with the fixed envelope and a fresh UUID-v4', async () => {
  const h = harness(); h.fail(new Error('database password and SQL must not escape'));
  const response = await h.handler(req('/api/v1/session'));
  assert.equal(response.status, 503);
  const payload = await response.json();
  assert.deepEqual(Object.keys(payload), ['error']);
  assert.deepEqual(Object.keys(payload.error).sort(), ['code', 'message', 'requestId']);
  assert.equal(payload.error.code, 'SERVICE_UNAVAILABLE');
  assert.equal(payload.error.message, 'Service unavailable.');
  assert.match(payload.error.requestId, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
});

test('401 clears only the host session cookie and reports no successful close', async () => {
  const h = harness(); h.fail(new DemoError('UNAUTHENTICATED'));
  const response = await h.handler(req('/api/v1/session'));
  assert.equal(response.status, 401);
  const cookie = response.headers.get('set-cookie') ?? '';
  assert.match(cookie, /^__Host-teach_session=;/);
  assert.match(cookie, /Max-Age=0/); assert.match(cookie, /Secure/); assert.match(cookie, /HttpOnly/); assert.match(cookie, /SameSite=Lax/); assert.doesNotMatch(cookie, /Domain=/);
});

test('required retry keys and query bounds are exact, and supplied authority fields reject', async () => {
  const base = '/api/v1/organizations/org/locations/loc';
  for (const key of ['', 'short', 'a'.repeat(129), 'invalid key spaces']) {
    const h = harness();
    const response = await h.handler(req(base + '/learning-sessions', 'POST', '{"assignmentId":"a"}', { 'Idempotency-Key': key }));
    assert.equal(response.status, 400);
  }
  for (const query of ['limit=0', 'limit=51', 'limit=1.5', 'limit=2&limit=3', 'cursor=' + 'a'.repeat(513), 'learnerId=victim']) {
    const h = harness();
    assert.equal((await h.handler(req(base + '/assignments/mine?' + query))).status, 400);
  }
  const h = harness();
  assert.equal((await h.handler(req(base + '/learning-sessions', 'POST', '{"assignmentId":"a","identityId":"victim"}', { 'Idempotency-Key': 'key_1234567890123' }))).status, 400);
});

test('path version is decoded exactly once and prerelease/build identity is preserved', async () => {
  const h = harness();
  const path = '/api/v1/organizations/org/locations/loc/content/pack/versions/1.0.0-rc.1%2Bbuild.7';
  const response = await h.handler(req(path));
  assert.equal(response.status, 200);
  assert.equal(h.calls[0]!.readInput().params.contentVersion, '1.0.0-rc.1+build.7');
  assert.equal((await h.handler(req(path.replace('%2B', '%252B')))).status, 400);
});

test('same-origin headers are not authority, and no CORS or cacheable response is emitted', async () => {
  const h = harness();
  const response = await h.handler(req('/api/v1/session', 'GET', undefined, { Authorization: 'Bearer arbitrary', 'X-Forwarded-For': '203.0.113.8', 'X-Identity-Id': 'victim' }));
  assert.equal(response.status, 200);
  assert.equal(h.calls[0]!.admissionPrefix, 'SHARED_UNKNOWN');
  assert.equal(response.headers.get('access-control-allow-origin'), null);
  assert.equal(response.headers.get('cache-control'), 'no-store');
});

test('finite rate retry time mirrors the header and envelope without inventing capacity recovery', async () => {
  const h=harness();h.fail(new DemoError('RATE_LIMITED',{retryAfterSeconds:61}));
  const response=await h.handler(req('/api/v1/demo/start','POST','{}'));
  assert.equal(response.status,429);assert.equal(response.headers.get('retry-after'),'61');assert.equal((await response.json()).error.retryAfterSeconds,61);
  const capacity=harness();capacity.fail(new DemoError('RATE_LIMITED'));
  const denied=await capacity.handler(req('/api/v1/demo/start','POST','{}'));
  assert.equal(denied.headers.get('retry-after'),null);assert.equal((await denied.json()).error.retryAfterSeconds,undefined);
});
