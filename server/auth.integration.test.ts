import test from 'node:test';
import assert from 'node:assert/strict';

// Auth endpoint tests: register, login, legacy claim, wrong password.
process.env.NODE_ENV = 'test';
process.env.API_PORT = '0';
const { default: app } = await import('./index.ts');
const { clearAllData, pool, runMigrations } = await import('./database.ts');

const server = app.listen(0);
await new Promise<void>(resolve => server.once('listening', resolve));
const base = `http://127.0.0.1:${(server.address() as { port: number }).port}`;

async function api(method: string, path: string, body?: unknown) {
  const res = await fetch(`${base}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const json = await res.json().catch(() => null);
  return { status: res.status, json };
}

test.before(async () => { await runMigrations(); await clearAllData(); });
test.after(async () => { await clearAllData(); server.close(); await pool.end(); });

test('register creates account and login round-trips', async () => {
  const reg = await api('POST', '/api/auth/register', { name: 'Auth Tester', email: 'auth@test.dev', password: 'supersecret1' });
  assert.equal(reg.status, 201);
  assert.equal(reg.json.hasWorkspace, false);

  const login = await api('POST', '/api/auth/login', { email: 'auth@test.dev', password: 'supersecret1' });
  assert.equal(login.status, 200);
  assert.equal(login.json.email, 'auth@test.dev');
  assert.deepEqual(login.json.workspaces, []);
});

test('register rejects duplicate email (409)', async () => {
  const dup = await api('POST', '/api/auth/register', { name: 'X', email: 'auth@test.dev', password: 'supersecret1' });
  assert.equal(dup.status, 409);
});

test('register rejects short password', async () => {
  const short = await api('POST', '/api/auth/register', { name: 'X', email: 'short@test.dev', password: 'abc' });
  assert.equal(short.status, 400);
});

test('login rejects wrong password', async () => {
  const bad = await api('POST', '/api/auth/login', { email: 'auth@test.dev', password: 'wrongpassword' });
  assert.equal(bad.status, 500);
  assert.match(bad.json.error, /invalid email or password/i);
});

test('onboarding admin can login with password', async () => {
  const onboard = await api('POST', '/api/onboarding', {
    organizationName: 'Auth Org', code: 'AUT', sector: 'Water', city: 'Bandung',
    adminName: 'Auth Admin', adminEmail: 'admin@aut.test', adminPassword: 'adminpass123'
  });
  assert.equal(onboard.status, 201);
  const login = await api('POST', '/api/auth/login', { email: 'admin@aut.test', password: 'adminpass123' });
  assert.equal(login.status, 200);
  assert.equal(login.json.workspaces.length, 1);
  assert.equal(login.json.workspaces[0].code, 'AUT');
});

test('legacy user without password claims it on first login', async () => {
  // create legacy user through membership API (no password)
  const ws = await api('GET', '/api/bootstrap');
  const wsId = ws.json.workspaces[0].id;
  await api('POST', `/api/organizations/${wsId}/users`, { name: 'Legacy User', email: 'legacy@aut.test', role: 'creator' });
  const login = await api('POST', '/api/auth/login', { email: 'legacy@aut.test', password: 'newpass1234' });
  assert.equal(login.status, 200);
  assert.equal(login.json.workspaces.length, 1);
  // second login with same password must succeed (claimed)
  const again = await api('POST', '/api/auth/login', { email: 'legacy@aut.test', password: 'newpass1234' });
  assert.equal(again.status, 200);
});
