import { test } from 'node:test';
import assert from 'node:assert/strict';
process.env.NODE_ENV = 'test';
const { default: app } = await import('./index.ts');
const { permitted } = await import('./security.ts');

test('role and workspace boundaries', () => {
  const creator={role:'creator',workspaces:[{id:'a'}]};
  const corporate={role:'corporate',workspaces:[{id:'a'}]};
  assert.equal(permitted(creator,'a'),true);
  assert.equal(permitted(creator,'b'),false);
  assert.equal(permitted(creator,'a',true),false);
  assert.equal(permitted(corporate,'a',true),true);
  assert.equal(permitted(corporate,'b',true),false);
  assert.equal(permitted({role:'superadmin',workspaces:[]},'b',true),true);
});

async function request(method: string, path: string, body?: unknown) {
  const server = app.listen(0);
  try {
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('No listening port');
    const response = await fetch(`http://127.0.0.1:${address.port}${path}`, { method, headers: { 'content-type': 'application/json', origin: 'http://localhost:5173' }, body: body === undefined ? undefined : JSON.stringify(body) });
    return { status: response.status, headers: response.headers, body: await response.json() };
  } finally { await new Promise<void>(resolve => server.close(() => resolve())); }
}

test('anonymous requests cannot access private API or provision identities', async () => {
  for (const [method, path, body] of [
    ['GET', '/api/bootstrap'], ['GET', '/api/users/other/workspaces'], ['GET', '/api/workspaces/other/drafts'],
    ['POST', '/api/drafts', {workspaceId:'other'}], ['PUT', '/api/brand-profile', {workspaceId:'other'}],
    ['DELETE', '/api/organizations/other/users/other'], ['POST', '/api/rag/search', {workspaceId:'other',query:'x'}],
    ['POST', '/api/visual/generate', {}], ['DELETE', '/api/data'],
    ['POST', '/api/onboarding', {}], ['POST', '/api/auth/register', {}],
    ['POST', '/api/admin/companies', {}], ['POST', '/api/corporate/workspaces', {}]
  ] as [string,string,unknown?][]) {
    const response = await request(method,path,body);
    assert.ok([401,403,404].includes(response.status), `${method} ${path}: ${response.status}`);
  }
});

test('session endpoints reject missing credentials; CORS allows credentials', async () => {
  const response = await request('GET','/api/auth/me');
  assert.equal(response.status,401);
  assert.equal(response.headers.get('access-control-allow-credentials'),'true');
  assert.equal(response.headers.get('access-control-allow-origin'),'http://localhost:5173');
});

test('login validates credentials without provisioning an account', async () => {
  assert.equal((await request('POST','/api/auth/login',{email:'not-an-email',password:'x'})).status,400);
});

test('company settings and KB writes require corporate or superadmin access', () => {
  const creator={role:'creator',workspaces:[{id:'a'}]};
  const corporate={role:'corporate',workspaces:[{id:'a'},{id:'b'}]};
  assert.equal(permitted(creator,'a',true),false);
  assert.equal(permitted(corporate,'a',true),true);
  assert.equal(permitted(corporate,'other-company',true),false);
  assert.equal(permitted({role:'superadmin',workspaces:[]},'a',true),true);
});
