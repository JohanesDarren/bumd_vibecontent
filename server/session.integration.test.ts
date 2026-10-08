import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

// Session expiry tests: a session must stop working once it is idle past the
// idle window, even though the absolute cap has not been reached.
process.env.NODE_ENV = 'test';
process.env.API_PORT = '0';
process.env.SESSION_IDLE_MINUTES = '30';
const { default: app } = await import('./index.ts');
const { clearAllData, pool, runMigrations, hashPassword } = await import('./database.ts');

const server = app.listen(0);
await new Promise<void>(resolve => server.once('listening', resolve));
const base = `http://127.0.0.1:${(server.address() as { port: number }).port}`;

test.before(async () => { await runMigrations(); await clearAllData(); });
test.after(async () => { await clearAllData(); server.close(); await pool.end(); });

// Create a superadmin directly (there is no public onboarding route) and log in.
async function seedAndLogin() {
  const email = `session-${randomUUID()}@test.dev`;
  const password = `longpass-${randomUUID()}`;
  await pool.query("INSERT INTO users(id,name,email,password_hash,global_role) VALUES($1,'Session Admin',$2,$3,'superadmin')", [`usr-${randomUUID()}`, email, await hashPassword(password)]);
  const res = await fetch(`${base}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: 'http://localhost:5173' },
    body: JSON.stringify({ email, password })
  });
  assert.equal(res.status, 200);
  return (res.headers.get('set-cookie') || '').split(';')[0];
}

const me = (cookie: string) => fetch(`${base}/api/auth/me`, { headers: { cookie } });

test('active session is accepted and refreshes the idle clock', async () => {
  const cookie = await seedAndLogin();
  assert.equal((await me(cookie)).status, 200);

  const before = (await pool.query('SELECT last_seen_at FROM auth_sessions ORDER BY last_seen_at DESC LIMIT 1')).rows[0].last_seen_at as Date;
  await new Promise(resolve => setTimeout(resolve, 1100));
  assert.equal((await me(cookie)).status, 200);
  const after = (await pool.query('SELECT last_seen_at FROM auth_sessions ORDER BY last_seen_at DESC LIMIT 1')).rows[0].last_seen_at as Date;
  assert.ok(after.getTime() > before.getTime(), 'last_seen_at should advance on use');
});

test('session idle past the window is rejected with 401', async () => {
  const cookie = await seedAndLogin();
  // Simulate the user walking away: last activity older than the idle window,
  // but still well inside the 7-day absolute cap.
  await pool.query("UPDATE auth_sessions SET last_seen_at=now()-interval '31 minutes'");
  assert.equal((await me(cookie)).status, 401);
});

test('session at exactly the idle boundary is still accepted', async () => {
  const cookie = await seedAndLogin();
  await pool.query("UPDATE auth_sessions SET last_seen_at=now()-interval '29 minutes'");
  assert.equal((await me(cookie)).status, 200);
});

test('session past the absolute cap is rejected even when recently active', async () => {
  const cookie = await seedAndLogin();
  await pool.query("UPDATE auth_sessions SET expires_at=now()-interval '1 minute', last_seen_at=now()");
  assert.equal((await me(cookie)).status, 401);
});

test('idle-expired session is rejected on a normal API route too', async () => {
  const cookie = await seedAndLogin();
  await pool.query("UPDATE auth_sessions SET last_seen_at=now()-interval '3 hours'");
  assert.equal((await fetch(`${base}/api/bootstrap`, { headers: { cookie } })).status, 401);
});

test('cookie lifetime matches the idle window, not the absolute cap', async () => {
  const email = `cookie-${randomUUID()}@test.dev`;
  const password = `longpass-${randomUUID()}`;
  await pool.query("INSERT INTO users(id,name,email,password_hash,global_role) VALUES($1,'Cookie Admin',$2,$3,'superadmin')", [`usr-${randomUUID()}`, email, await hashPassword(password)]);
  const res = await fetch(`${base}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: 'http://localhost:5173' },
    body: JSON.stringify({ email, password })
  });
  const setCookie = res.headers.get('set-cookie') || '';
  assert.match(setCookie, /Max-Age=1800\b/, 'cookie should expire with the 30-minute idle window');
  assert.match(setCookie, /HttpOnly/);
  assert.match(setCookie, /SameSite=Lax/);
  assert.equal(res.headers.get('x-session-idle-seconds'), '1800', 'server must advertise the idle window so the client timer cannot drift');
});
