import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

// Behavioural test for the approval workflow (QA finding T2). It exercises the
// real HTTP surface against PostgreSQL, because "the endpoint returns 401" only
// proves the route exists, not that the state machine works.
process.env.NODE_ENV = 'test';

/**
 * These assertions need a real PostgreSQL. When none is reachable they must be
 * skipped, not left to hang: an unreachable database used to block the runner
 * for minutes with no output.
 */
const databaseReachable = await (async () => {
  const dotenv = await import('dotenv');
  const parsed = dotenv.default.config({ quiet: true }).parsed || {};
  const raw = parsed.DATABASE_URL || process.env.DATABASE_URL;
  const net = await import('node:net');
  let host = '127.0.0.1';
  let port = 5435;
  try {
    if (raw) {
      const url = new URL(raw);
      host = url.hostname;
      port = Number(url.port || 5432);
      url.pathname = '/vibecontent_test';
      process.env.DATABASE_URL = url.toString();
    }
  } catch { /* fall back to the defaults below */ }
  return await new Promise<boolean>(resolve => {
    const socket = net.connect({ host, port });
    const done = (ok: boolean) => { socket.destroy(); resolve(ok); };
    socket.setTimeout(1500);
    socket.once('connect', () => done(true));
    socket.once('timeout', () => done(false));
    socket.once('error', () => done(false));
  });
})();

if (!databaseReachable) {
  test('approval workflow (skipped: no PostgreSQL available)', { skip: 'PostgreSQL is not reachable; run this file where the test database exists.' }, () => {});
} else {
const { default: app } = await import('./index.ts');
const { pool, runMigrations, clearAllData, hashPassword } = await import('./database.ts');

const server = app.listen(0);
await new Promise<void>(resolve => server.once('listening', resolve));
const base = `http://127.0.0.1:${(server.address() as { port: number }).port}`;

async function api(method: string, path: string, body?: unknown, cookie?: string) {
  const res = await fetch(`${base}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', Origin: 'http://localhost:5173', ...(cookie ? { Cookie: cookie } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  return { status: res.status, data: await res.json().catch(() => null), cookie: res.headers.get('set-cookie')?.split(';')[0] || '' };
}

test.before(async () => { await runMigrations(); await clearAllData(); await pool.query('DELETE FROM companies'); });
test.after(async () => { await clearAllData(); await pool.query('DELETE FROM companies'); server.close(); await pool.end(); });

test('a draft must be submitted, then approved, before it can be scheduled', async () => {
  const pass = `longpass-${randomUUID()}`;

  // superadmin -> company -> corporate + creator + workspace
  const rootEmail = `root-${randomUUID()}@test.dev`;
  await pool.query("INSERT INTO users(id,name,email,password_hash,global_role) VALUES($1,'Root',$2,$3,'superadmin')", [`usr-${randomUUID()}`, rootEmail, await hashPassword(pass)]);
  const root = await api('POST', '/api/auth/login', { email: rootEmail, password: pass });
  assert.equal(root.status, 200);

  const co = await api('POST', '/api/admin/companies', { name: 'Approval Co' }, root.cookie);
  assert.equal(co.status, 201);

  const corpEmail = `corp-${randomUUID()}@test.dev`;
  assert.equal((await api('POST', '/api/admin/users', { name: 'Corp', email: corpEmail, password: pass, role: 'corporate', companyId: co.data.id }, root.cookie)).status, 201);

  const creatorEmail = `creator-${randomUUID()}@test.dev`;
  assert.equal((await api('POST', '/api/admin/users', { name: 'Creator', email: creatorEmail, password: pass, role: 'creator', companyId: co.data.id }, root.cookie)).status, 201);

  const ws = await api('POST', '/api/admin/workspaces', { companyId: co.data.id, name: 'Alpha One', code: `A${randomUUID().slice(0, 6)}`, sector: 'Air Minum', city: 'Bandung' }, root.cookie);
  assert.equal(ws.status, 201);
  const workspaceId = ws.data.id;

  const corp = await api('POST', '/api/auth/login', { email: corpEmail, password: pass });
  const creator = await api('POST', '/api/auth/login', { email: creatorEmail, password: pass });
  assert.equal(corp.status, 200);
  assert.equal(creator.status, 200);

  // creator joins the workspace
  await pool.query('INSERT INTO memberships(organization_id,user_id,role,active) VALUES($1,$2,$3,true) ON CONFLICT DO NOTHING', [workspaceId, creator.data.id, 'creator']);

  // creator writes a draft
  const created = await api('POST', '/api/drafts', { workspaceId, title: 'Draf Persetujuan', format: 'copy_caption', creatorId: creator.data.id, content: 'Isi draf untuk uji persetujuan.' }, creator.cookie);
  assert.equal(created.status, 201);
  const draftId = created.data.id;

  // ── Gate: scheduling an unapproved draft must fail ──
  const early = await api('PUT', `/api/schedules/${'sc-' + randomUUID()}`, {
    id: `sc-${randomUUID()}`, workspaceId, title: 'Terlalu dini', platform: 'instagram',
    status: 'scheduled', date: '2030-01-15', time: '09:00', draftId
  }, creator.cookie);
  assert.equal(early.status, 409, 'an unsubmitted draft must not be schedulable');
  assert.match(early.data.error, /belum disetujui/);

  // ── Submit ──
  const submitted = await api('POST', `/api/drafts/${draftId}/submit`, { workspaceId }, creator.cookie);
  assert.equal(submitted.status, 200);
  assert.equal(submitted.data.status, 'menunggu_review');

  // Still blocked while awaiting review
  const duringReview = await api('PUT', `/api/schedules/${'sc-' + randomUUID()}`, {
    id: `sc-${randomUUID()}`, workspaceId, title: 'Saat review', platform: 'instagram',
    status: 'scheduled', date: '2030-01-16', time: '09:00', draftId
  }, creator.cookie);
  assert.equal(duringReview.status, 409);

  // ── Only corporate may decide ──
  const byCreator = await api('POST', `/api/drafts/${draftId}/approval`, { workspaceId, decision: 'disetujui' }, creator.cookie);
  assert.equal(byCreator.status, 403, 'a creator must not approve their own draft');

  // ── Approve ──
  const approved = await api('POST', `/api/drafts/${draftId}/approval`, { workspaceId, decision: 'disetujui', note: 'Sudah sesuai' }, corp.cookie);
  assert.equal(approved.status, 200);
  assert.equal(approved.data.status, 'disetujui');
  assert.equal(approved.data.approvalInfo.decision, 'disetujui');

  // ── Now scheduling is allowed ──
  const scheduleId = `sc-${randomUUID()}`;
  const ok = await api('PUT', `/api/schedules/${scheduleId}`, {
    id: scheduleId, workspaceId, title: 'Sudah disetujui', platform: 'instagram',
    status: 'scheduled', date: '2030-01-17', time: '09:00', draftId
  }, creator.cookie);
  assert.equal(ok.status, 200, `approved draft should be schedulable, got ${ok.status} ${JSON.stringify(ok.data)}`);

  // ── Publishing without a post URL is refused ──
  const noUrl = await api('PUT', `/api/schedules/${scheduleId}`, {
    id: scheduleId, workspaceId, title: 'Sudah disetujui', platform: 'instagram',
    status: 'published', date: '2030-01-17', time: '09:00', draftId
  }, creator.cookie);
  assert.equal(noUrl.status, 400);
  assert.match(noUrl.data.error, /Link postingan wajib/i);

  // ── The decisions are in the audit trail ──
  const audit = await api('GET', `/api/audit-logs?workspaceId=${workspaceId}`, undefined, corp.cookie);
  const actions = (audit.data || []).map((row: { action: string }) => row.action);
  assert.ok(actions.includes('Draft submitted for review'), `submit must be audited, got ${actions.join(', ')}`);
  assert.ok(actions.includes('Draft approved'), `approval must be audited, got ${actions.join(', ')}`);
});

test('deleting a draft also removes its orphaned brief', async () => {
  const pass = `longpass-${randomUUID()}`;
  const email = `root2-${randomUUID()}@test.dev`;
  await pool.query("INSERT INTO users(id,name,email,password_hash,global_role) VALUES($1,'Root2',$2,$3,'superadmin')", [`usr-${randomUUID()}`, email, await hashPassword(pass)]);
  const root = await api('POST', '/api/auth/login', { email, password: pass });

  const co = await api('POST', '/api/admin/companies', { name: 'Brief Co' }, root.cookie);
  const ws = await api('POST', '/api/admin/workspaces', { companyId: co.data.id, name: 'Beta One', code: `B${randomUUID().slice(0, 6)}`, sector: 'Air Minum', city: 'Bogor' }, root.cookie);
  const workspaceId = ws.data.id;

  const briefId = `brf-${randomUUID()}`;
  await pool.query('INSERT INTO content_briefs(id,organization_id,created_by,data) VALUES($1,$2,$3,$4::jsonb)', [briefId, workspaceId, root.data.id, JSON.stringify({ id: briefId, title: 'Brief Uji' })]);

  const draftId = `dft-${randomUUID()}`;
  await pool.query("INSERT INTO content_drafts(id,organization_id,brief_id,title,format,status,current_version,created_by,creator_name) VALUES($1,$2,$3,'Draf Uji','copy_caption','draft',1,$4,'Root2')", [draftId, workspaceId, briefId, root.data.id]);

  const before = await pool.query('SELECT count(*)::int AS n FROM content_briefs WHERE id=$1', [briefId]);
  assert.equal(before.rows[0].n, 1, 'brief exists before deletion');

  const deleted = await api('DELETE', `/api/organizations/${workspaceId}/drafts/${draftId}`, undefined, root.cookie);
  assert.equal(deleted.status, 200);

  const after = await pool.query('SELECT count(*)::int AS n FROM content_briefs WHERE id=$1', [briefId]);
  assert.equal(after.rows[0].n, 0, 'the orphaned brief must be removed with the draft');
});
}
