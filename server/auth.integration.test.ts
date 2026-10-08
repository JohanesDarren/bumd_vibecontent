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
  await api('POST', '/api/onboarding', {
    organizationName: 'Registration Org', code: 'REG', sector: 'Water', city: 'Bandung',
    adminName: 'Registration Admin', adminEmail: 'reg-admin@test.dev', adminPassword: 'adminpass123'
  });
  const reg = await api('POST', '/api/auth/register', { name: 'Auth Tester', email: 'auth@test.dev', password: 'supersecret1', workspaceCode: 'REG' });
  assert.equal(reg.status, 201);
  assert.equal(reg.json.hasWorkspace, true);

  const login = await api('POST', '/api/auth/login', { email: 'auth@test.dev', password: 'supersecret1' });
  assert.equal(login.status, 200);
  assert.equal(login.json.email, 'auth@test.dev');
  assert.equal(login.json.workspaces[0].code, 'REG');
});

test('register requires a workspace code', async () => {
  const reg = await api('POST', '/api/auth/register', { name: 'No Workspace', email: 'none@test.dev', password: 'supersecret1' });
  assert.equal(reg.status, 400);
  assert.match(reg.json.error, /workspace code/i);
});

test('register rejects duplicate email (409)', async () => {
  const dup = await api('POST', '/api/auth/register', { name: 'X', email: 'auth@test.dev', password: 'supersecret1', workspaceCode: 'REG' });
  assert.equal(dup.status, 409);
});

test('register rejects short password', async () => {
  const short = await api('POST', '/api/auth/register', { name: 'X', email: 'short@test.dev', password: 'abc' });
  assert.equal(short.status, 400);
});

test('login rejects wrong password', async () => {
  const bad = await api('POST', '/api/auth/login', { email: 'auth@test.dev', password: 'wrongpassword' });
  assert.equal(bad.status, 401);
  assert.match(bad.json.error, /invalid email or password/i);
});

test('login rejects unknown email with unauthorized status', async () => {
  const bad = await api('POST', '/api/auth/login', { email: 'unknown@test.dev', password: 'somepassword' });
  assert.equal(bad.status, 401);
  assert.match(bad.json.error, /invalid email or password/i);
});

test('onboarding admin can login with password', async () => {
  const onboard = await api('POST', '/api/onboarding', {
    organizationName: 'Auth Org', code: 'AUT', sector: 'Water', city: 'Bandung',
    adminName: 'Auth Admin', adminEmail: 'Admin@AUT.test', adminPassword: 'adminpass123'
  });
  assert.equal(onboard.status, 201);
  const login = await api('POST', '/api/auth/login', { email: 'admin@aut.test', password: 'adminpass123' });
  assert.equal(login.status, 200);
  assert.equal(login.json.workspaces.length, 1);
  assert.equal(login.json.workspaces[0].code, 'AUT');
});

test('admin-created user receives a working temporary password', async () => {
  const ws = await api('GET', '/api/bootstrap');
  const wsId = ws.json.workspaces[0].id;
  const created = await api('POST', `/api/organizations/${wsId}/users`, { name: 'Invited User', email: 'invite@aut.test', role: 'creator' });
  assert.equal(created.status, 201);
  assert.ok(created.json.tempPassword);
  const login = await api('POST', '/api/auth/login', { email: 'invite@aut.test', password: created.json.tempPassword });
  assert.equal(login.status, 200);
  assert.equal(login.json.workspaces.length, 1);
});
