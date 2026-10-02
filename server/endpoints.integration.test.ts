import test from 'node:test';
import assert from 'node:assert/strict';

// HTTP-level integration test: spins up the Express app against the real
// PostgreSQL database and exercises every endpoint, success and error paths.
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

let workspaceId = '';
let adminId = '';

test('health check reports database connectivity', async () => {
  const { status, json } = await api('GET', '/api/health');
  assert.equal(status, 200);
  assert.equal(json.ok, true);
  assert.equal(json.database, 'vibecontent_test');
});

test('clear-all endpoint returns ok', async () => {
  const { status, json } = await api('DELETE', '/api/data');
  assert.equal(status, 200);
  assert.equal(json.ok, true);
});

test('onboarding rejects missing fields with 400', async () => {
  const { status, json } = await api('POST', '/api/onboarding', { organizationName: 'Only Name' });
  assert.equal(status, 400);
  assert.match(json.error, /required/i);
});

test('onboarding creates organization and admin (201)', async () => {
  const { status, json } = await api('POST', '/api/onboarding', {
    organizationName: 'Endpoint Org', code: 'EPT', sector: 'Water', city: 'Bandung',
    adminName: 'Endpoint Admin', adminEmail: 'admin@endpoint.test'
  });
  assert.equal(status, 201);
  workspaceId = json.workspace.id;
  adminId = json.user.id;
  assert.match(workspaceId, /^org-/);
  assert.match(adminId, /^usr-/);
  assert.equal(json.user.role, 'admin');
});

test('bootstrap returns workspaces, users, and empty lists', async () => {
  const { status, json } = await api('GET', `/api/bootstrap?workspaceId=${workspaceId}`);
  assert.equal(status, 200);
  assert.equal(json.workspaces.length, 1);
  assert.equal(json.users.length, 1);
  assert.deepEqual(json.documents, []);
  assert.deepEqual(json.drafts, []);
  assert.deepEqual(json.briefs, []);
  assert.deepEqual(json.auditLogs, []);
  assert.equal(json.brandProfile, null);
});

test('draft creation rejects missing fields with 400', async () => {
  const { status, json } = await api('POST', '/api/drafts', { workspaceId });
  assert.equal(status, 400);
  assert.match(json.error, /required/i);
});

test('draft creation rejects non-member creator', async () => {
  const { status, json } = await api('POST', '/api/drafts', {
    workspaceId, title: 'X', format: 'copy_caption', creatorId: 'usr-none', content: 'x'
  });
  assert.equal(status, 500);
  assert.match(json.error, /not a member/i);
});

test('draft creation succeeds and appears in workspace drafts', async () => {
  const created = await api('POST', '/api/drafts', {
    workspaceId, title: 'Endpoint Draft', format: 'copy_caption', creatorId: adminId, content: 'Body text'
  });
  assert.equal(created.status, 201);
  const listed = await api('GET', `/api/workspaces/${workspaceId}/drafts`);
  assert.equal(listed.status, 200);
  const draft = listed.json[0];
  assert.equal(draft.title, 'Endpoint Draft');
  assert.equal(draft.status, 'draft');
  assert.equal(draft.versions.length, 1);
  assert.equal(draft.versions[0].content, 'Body text');
  assert.equal(draft.versions[0].changeSummary, 'Initial version');
});

test('draft PUT rejects ID mismatch with 400', async () => {
  const { status, json } = await api('PUT', '/api/drafts/other-id', { id: workspaceId });
  assert.equal(status, 400);
  assert.match(json.error, /mismatch/i);
});

test('draft PUT rejects missing workspaceId with 400', async () => {
  const { status, json } = await api('PUT', '/api/drafts/some-id', { id: 'some-id' });
  assert.equal(status, 400);
  assert.match(json.error, /workspaceId/i);
});

test('draft PUT saves full draft with versions, comments, and approval', async () => {
  const listed = await api('GET', `/api/workspaces/${workspaceId}/drafts`);
  const draft = listed.json[0];
  const now = new Date().toISOString();
  const saved = await api('PUT', `/api/drafts/${draft.id}`, {
    ...draft,
    briefId: 'brf-ept-1',
    brief: {
      id: 'brf-ept-1', workspaceId, title: 'Brief tersimpan', targetAudience: 'Warga',
      format: 'copy_caption', channel: 'Instagram', tone: 'Ramah',
      keyMessage: 'Informasi resmi', cta: 'Hubungi kanal resmi',
      language: 'Bahasa Indonesia', createdAt: now, createdBy: adminId
    },
    title: 'Endpoint Draft v2',
    status: 'menunggu_review',
    currentVersionon: 2,
    versions: [
      ...draft.versions,
      { versionNumber: 2, content: 'Edited body', citations: [], unsupportedClaims: [], qualityCheck: {}, createdAt: now, createdBy: adminId, changeSummary: 'edit' }
    ],
    comments: [{ id: 'cmt-ept-1', authorName: 'Endpoint Admin', authorRole: 'admin', text: 'note', createdAt: now, resolved: false }]
  });
  assert.equal(saved.status, 200);
  assert.equal(saved.json.status, 'menunggu_review');
  assert.equal(saved.json.versions.length, 2);
  assert.equal(saved.json.comments.length, 1);

  const recheck = await api('GET', `/api/workspaces/${workspaceId}/drafts`);
  assert.equal(recheck.json[0].versions.length, 2);
  assert.equal(recheck.json[0].comments[0].text, 'note');
  const bootstrap = await api('GET', `/api/bootstrap?workspaceId=${workspaceId}`);
  assert.equal(bootstrap.json.briefs[0].id, 'brf-ept-1');
  assert.equal(bootstrap.json.briefs[0].keyMessage, 'Informasi resmi');
});

test('brand profile PUT rejects missing workspaceId with 400', async () => {
  const { status, json } = await api('PUT', '/api/brand-profile', { organizationName: 'X' });
  assert.equal(status, 400);
  assert.match(json.error, /workspaceId/i);
});

test('brand profile upsert round-trips', async () => {
  const profile = {
    workspaceId, organizationName: 'Endpoint Org', unitDepartment: 'PR', defaultLanguage: 'English', targetAudiences: ['City residents'],
    toneOfVoice: ['Formal'], terminology: [], bannedWords: [], officialCTAs: [], approvedChannels: ['Instagram'],
    brandGuidelinesSummary: '', officialDisclaimer: ''
  };
  const saved = await api('PUT', '/api/brand-profile', profile);
  assert.equal(saved.status, 200);
  const data = await api('GET', `/api/bootstrap?workspaceId=${workspaceId}`);
  assert.equal(data.json.brandProfile?.organizationName, 'Endpoint Org');
});

test('knowledge source PUT rejects ID mismatch with 400', async () => {
  const { status, json } = await api('PUT', '/api/knowledge-sources/other', { id: 'x', workspaceId });
  assert.equal(status, 400);
  assert.match(json.error, /mismatch/i);
});

test('knowledge source upsert with chunks round-trips', async () => {
  const doc = {
    id: 'doc-ept-1', workspaceId, title: 'Endpoint SOP', category: 'sop_layanan', owner: 'Admin',
    version: 'v1', effectiveDate: '2026', status: 'aktif', uploadDate: new Date().toISOString(),
    fileSize: '1 KB', summary: 'sum',
    chunks: [{ id: 'chk-ept-1', documentId: 'doc-ept-1', section: 'Bab 1', page: 1, content: 'Tarif air 2800 rupiah', keywords: ['tarif'] }]
  };
  const saved = await api('PUT', `/api/knowledge-sources/${doc.id}`, doc);
  assert.equal(saved.status, 200);
  const data = await api('GET', `/api/bootstrap?workspaceId=${workspaceId}`);
  assert.equal(data.json.documents.length, 1);
  assert.equal(data.json.documents[0].chunks.length, 1);
  assert.equal(data.json.documents[0].chunks[0].content, 'Tarif air 2800 rupiah');
});

test('organization PUT returns 404 for unknown organization', async () => {
  const { status, json } = await api('PUT', '/api/organizations/org-nope', { name: 'N', code: 'NN', sector: 'S', city: 'C' });
  assert.equal(status, 404);
  assert.match(json.error, /not found/i);
});

test('organization PUT rejects missing fields with 400', async () => {
  const { status, json } = await api('PUT', `/api/organizations/${workspaceId}`, { name: 'Only Name' });
  assert.equal(status, 400);
  assert.match(json.error, /required/i);
});

test('organization PUT updates and persists', async () => {
  const { status, json } = await api('PUT', `/api/organizations/${workspaceId}`, {
    name: 'Endpoint Org Renamed', code: 'EPT2', sector: 'Water', city: 'Jakarta'
  });
  assert.equal(status, 200);
  assert.equal(json.name, 'Endpoint Org Renamed');
  const data = await api('GET', `/api/bootstrap?workspaceId=${workspaceId}`);
  assert.equal(data.json.workspaces[0].name, 'Endpoint Org Renamed');
});

test('user creation rejects missing fields with 400', async () => {
  const { status, json } = await api('POST', `/api/organizations/${workspaceId}/users`, { name: 'No Email' });
  assert.equal(status, 400);
  assert.match(json.error, /required/i);
});

test('user creation rejects invalid role with 400', async () => {
  const { status, json } = await api('POST', `/api/organizations/${workspaceId}/users`, { name: 'X', email: 'x@x.test', role: 'superhero' });
  assert.equal(status, 400);
  assert.match(json.error, /role/i);
});

test('user creation returns 404 for unknown organization', async () => {
  const { status, json } = await api('POST', '/api/organizations/org-nope/users', { name: 'X', email: 'x@x.test', role: 'creator' });
  assert.equal(status, 404);
  assert.match(json.error, /not found/i);
});

test('user membership create then delete round-trips', async () => {
  const created = await api('POST', `/api/organizations/${workspaceId}/users`, {
    name: 'Endpoint Creator', email: 'creator@endpoint.test', role: 'creator', title: 'Writer', department: 'Comms'
  });
  assert.equal(created.status, 201);
  const userId = created.json.id;
  let data = await api('GET', `/api/bootstrap?workspaceId=${workspaceId}`);
  assert.ok(data.json.users.some((u: { id: string }) => u.id === userId));
  const removed = await api('DELETE', `/api/organizations/${workspaceId}/users/${userId}`);
  assert.equal(removed.status, 200);
  data = await api('GET', `/api/bootstrap?workspaceId=${workspaceId}`);
  assert.ok(!data.json.users.some((u: { id: string }) => u.id === userId));
});

test('knowledge source delete removes document', async () => {
  const removed = await api('DELETE', `/api/organizations/${workspaceId}/knowledge-sources/doc-ept-1`);
  assert.equal(removed.status, 200);
  const data = await api('GET', `/api/bootstrap?workspaceId=${workspaceId}`);
  assert.deepEqual(data.json.documents, []);
});

test('brand profile delete clears profile', async () => {
  const removed = await api('DELETE', `/api/organizations/${workspaceId}/brand-profile`);
  assert.equal(removed.status, 200);
  const data = await api('GET', `/api/bootstrap?workspaceId=${workspaceId}`);
  assert.equal(data.json.brandProfile, null);
});

test('draft delete removes draft', async () => {
  const listed = await api('GET', `/api/workspaces/${workspaceId}/drafts`);
  const draftId = listed.json[0].id;
  const removed = await api('DELETE', `/api/organizations/${workspaceId}/drafts/${draftId}`);
  assert.equal(removed.status, 200);
  const data = await api('GET', `/api/workspaces/${workspaceId}/drafts`);
  assert.deepEqual(data.json, []);
});

test('unknown API route returns JSON 404, not HTML', async () => {
  const res = await fetch(`${base}/api/does-not-exist`);
  assert.equal(res.status, 404);
  assert.match(res.headers.get('content-type') || '', /application\/json/);
  const json = await res.json();
  assert.match(json.error, /not found/i);
});

test('audit trail records English actions for draft operations', async () => {
  const created = await api('POST', '/api/drafts', {
    workspaceId, title: 'Audit Draft', format: 'copy_caption', creatorId: adminId, content: 'x'
  });
  assert.equal(created.status, 201);
  const data = await api('GET', `/api/bootstrap?workspaceId=${workspaceId}`);
  const actions = data.json.auditLogs.map((l: { action: string }) => l.action);
  assert.ok(actions.includes('New Draft Created'));
  const draft = data.json.drafts[0];
  await api('PUT', `/api/drafts/${draft.id}`, { ...draft, title: 'Audit Draft Edited' });
  const after = await api('GET', `/api/bootstrap?workspaceId=${workspaceId}`);
  assert.ok(after.json.auditLogs.some((l: { action: string }) => l.action === 'Draft saved'));
});
