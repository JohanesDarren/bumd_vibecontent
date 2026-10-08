// Proves the live cross-role propagation contract end to end, against the real
// Express app (not a mock):
//
//   • a superadmin mutation reaches an already-open corporate screen;
//   • a mutation in company A never reaches company B's corporate screen;
//   • the signal carries no tenant data (payload-free nudge);
//   • GET /api/events is behind the auth gate (401 when unauthenticated).
//
// This is the regression guard for "CRUD in admin succeeds but nothing happens
// on the creator/corporate side" — the symptom was client staleness, not a
// missing endpoint, so the fix must be observable on the wire.
import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
process.env.NODE_ENV = 'test';
const { default: app } = await import('./index.ts');
const { pool, runMigrations, clearAllData, hashPassword } = await import('./database.ts');
const { subscriberCount } = await import('./events.ts');

const server = app.listen(0);
await new Promise<void>(resolve => server.once('listening', resolve));
const base = `http://127.0.0.1:${(server.address() as { port: number }).port}`;

async function api(method: string, path: string, body?: unknown, cookie?: string) {
  const response = await fetch(`${base}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', Origin: 'http://localhost:5173', ...(cookie ? { Cookie: cookie } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: response.status, data: await response.json(), cookie: response.headers.get('set-cookie')?.split(';')[0] || '' };
}

// Open an SSE stream and resolve with the first `change` frame (or time out).
function nextChange(cookie: string, timeoutMs = 4000): { promise: Promise<any | null>; close: () => void } {
  const controller = new AbortController();
  const promise = (async () => {
    const response = await fetch(`${base}/api/events`, {
      headers: { Origin: 'http://localhost:5173', Cookie: cookie, Accept: 'text/event-stream' },
      signal: controller.signal,
    });
    assert.equal(response.status, 200);
    assert.match(response.headers.get('content-type') || '', /text\/event-stream/);
    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      // Frames are separated by a blank line; only 'change' frames carry data.
      const frames = buffer.split('\n\n');
      buffer = frames.pop() ?? '';
      for (const frame of frames) {
        if (!frame.includes('event: change')) continue;
        const dataLine = frame.split('\n').find(line => line.startsWith('data: '));
        return dataLine ? JSON.parse(dataLine.slice(6)) : null;
      }
    }
    return null;
  })().catch(() => null);
  return { promise, close: () => controller.abort() };
}

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

test.before(async () => { await runMigrations(); await clearAllData(); await pool.query('DELETE FROM companies'); });
test.after(async () => { await clearAllData(); await pool.query('DELETE FROM companies'); server.close(); await pool.end(); });

test('cross-role propagation: admin write reaches corporate screen; tenant-isolated; payload-free', async () => {
  const pass = `longpass-${randomUUID()}`;
  const rootEmail = `root-${randomUUID()}@test.dev`;
  await pool.query("INSERT INTO users(id,name,email,password_hash,global_role) VALUES($1,'Root',$2,$3,'superadmin')", [`usr-${randomUUID()}`, rootEmail, await hashPassword(pass)]);
  const root = await api('POST', '/api/auth/login', { email: rootEmail, password: pass });
  assert.equal(root.status, 200);

  // Two companies, one corporate manager each — the isolation boundary.
  const alpha = await api('POST', '/api/admin/companies', { name: 'Alpha' }, root.cookie);
  const beta = await api('POST', '/api/admin/companies', { name: 'Beta' }, root.cookie);
  const alphaCorpEmail = `alpha-${randomUUID()}@test.dev`;
  const betaCorpEmail = `beta-${randomUUID()}@test.dev`;
  await api('POST', '/api/admin/users', { name: 'AlphaCorp', email: alphaCorpEmail, password: pass, role: 'corporate', companyId: alpha.data.id }, root.cookie);
  await api('POST', '/api/admin/users', { name: 'BetaCorp', email: betaCorpEmail, password: pass, role: 'corporate', companyId: beta.data.id }, root.cookie);
  const alphaCorp = await api('POST', '/api/auth/login', { email: alphaCorpEmail, password: pass });
  const betaCorp = await api('POST', '/api/auth/login', { email: betaCorpEmail, password: pass });
  assert.equal(alphaCorp.status, 200);
  assert.equal(betaCorp.status, 200);

  // Unauthenticated SSE is rejected by the same gate as every other /api route.
  const anon = await fetch(`${base}/api/events`, { headers: { Origin: 'http://localhost:5173' } });
  assert.equal(anon.status, 401);

  // Both corporate screens open a live stream.
  const alphaStream = nextChange(alphaCorp.cookie);
  const betaStream = nextChange(betaCorp.cookie);
  await wait(300); // let both subscriptions register
  assert.ok(subscriberCount() >= 2, `expected >=2 live subscribers, got ${subscriberCount()}`);

  // The admin creates a workspace inside Alpha — a real mutation the corporate
  // screen must eventually see.
  const created = await api('POST', '/api/admin/workspaces', { companyId: alpha.data.id, name: 'Alpha One', code: `A${randomUUID().slice(0, 8)}`, sector: 'Water', city: 'Bandung' }, root.cookie);
  assert.equal(created.status, 201);

  const alphaSignal = await alphaStream.promise;

  // The Alpha screen was nudged...
  assert.ok(alphaSignal, 'Alpha corporate screen received no change signal');
  assert.equal(alphaSignal.kind, 'change');
  assert.equal(alphaSignal.actorRole, 'superadmin');
  assert.equal(alphaSignal.companyId, alpha.data.id);
  // ...and the nudge is payload-free: no tenant data rides the wire.
  assert.deepEqual(Object.keys(alphaSignal).sort(), ['actorId', 'actorRole', 'at', 'companyId', 'kind', 'method', 'path', 'userIds', 'workspaceIds'].sort());
  assert.equal(alphaSignal.name, undefined);
  assert.equal(alphaSignal.code, undefined);

  // The Beta screen is inside a different company: no leak. Give its stream a
  // fair window before asserting silence.
  const betaSignal = await Promise.race([betaStream.promise, wait(900).then(() => null)]);
  alphaStream.close();
  betaStream.close();
  assert.equal(betaSignal, null, 'Beta corporate screen received a signal for Alpha data');

  // And the corporate read really does see the admin's write (shared root).
  const alphaWorkspaces = await api('GET', '/api/corporate/workspaces', undefined, alphaCorp.cookie);
  assert.equal(alphaWorkspaces.status, 200);
  assert.ok(alphaWorkspaces.data.some((w: { name: string }) => w.name === 'Alpha One'), 'corporate read did not see the admin write');
});

test('cross-role propagation: the actor does not notify itself (no feedback loop)', async () => {
  const pass = `longpass-${randomUUID()}`;
  const rootEmail = `root-${randomUUID()}@test.dev`;
  await pool.query("INSERT INTO users(id,name,email,password_hash,global_role) VALUES($1,'Root',$2,$3,'superadmin')", [`usr-${randomUUID()}`, rootEmail, await hashPassword(pass)]);
  const root = await api('POST', '/api/auth/login', { email: rootEmail, password: pass });
  const stream = nextChange(root.cookie);
  await wait(300);
  const co = await api('POST', '/api/admin/companies', { name: 'Solo' }, root.cookie);
  assert.equal(co.status, 201);
  const signal = await Promise.race([stream.promise, wait(800).then(() => null)]);
  stream.close();
  assert.equal(signal, null, 'the actor received its own change signal');
});
