import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (p: string) => readFile(new URL(p, import.meta.url), 'utf8');
const server = () => read('../../server/index.ts');

/* ── T2: approval workflow exists end to end ─────────────────────────────── */

test('the server exposes submit and approval endpoints', async () => {
  const s = await server();
  assert.match(s, /app\.post\('\/api\/drafts\/:id\/submit'/, 'submit endpoint missing');
  assert.match(s, /app\.post\('\/api\/drafts\/:id\/approval'/, 'approval endpoint missing');
  assert.match(s, /menunggu_review/, 'submitting must move the draft to review');
  assert.match(s, /approval_info/, 'the decision must be recorded on the draft');
});

test('only corporate roles may decide, and only on submitted drafts', async () => {
  const s = await server();
  const block = s.slice(s.indexOf("/api/drafts/:id/approval"), s.indexOf("/api/drafts/:id/approval") + 2200);
  assert.match(block, /corporateOnly/, 'decision must require a corporate role');
  assert.match(block, /row\.status !== 'menunggu_review'/, 'only submitted drafts can be decided');
});

test('an unapproved draft cannot be scheduled', async () => {
  const s = await server();
  const block = s.slice(s.indexOf("/api/schedules/:id"), s.indexOf("/api/schedules/:id") + 3000);
  assert.match(block, /belum disetujui/, 'scheduling must be blocked while under review');
  assert.match(block, /published.*postUrl|postUrl.*published/s, 'publishing must need a post URL');
});

test('the client can submit and decide', async () => {
  const api = await read('../services/apiService.ts');
  assert.match(api, /submitDraft:/);
  assert.match(api, /decideDraft:/);
  const lib = await read('../components/LibraryView.tsx');
  assert.match(lib, /Ajukan Review/);
  assert.match(lib, /Setujui/);
});

/* ── T4: the generated image is actually persisted ───────────────────────── */

test('saving a visual calls the persistence callback, not just local state', async () => {
  const view = await read('../components/VisualStudioView.tsx');
  const block = view.slice(view.indexOf('onSave={async imageUrl'), view.indexOf('onSave={async imageUrl') + 700);
  assert.match(block, /onSaveVisual/, 'the save must reach the API');
  assert.doesNotMatch(block, /^[\s\S]*setMetadata\('Visual inti · disimpan ke draf'\)[\s\S]*$/,
    'the old local-only save must be gone');
});

/* ── T6: mutations are audited ───────────────────────────────────────────── */

test('an audit writer exists and is used by mutations', async () => {
  const s = await server();
  assert.match(s, /async function writeAudit/, 'audit writer missing');
  assert.match(s, /INSERT INTO audit_events/, 'audit rows must be inserted');
  for (const action of ['Workspace created', 'Workspace deleted', 'Company created', 'Draft approved', 'Schedule published']) {
    assert.ok(s.includes(action), `missing audit action: ${action}`);
  }
});

test('audit failures never break the user operation', async () => {
  const s = await server();
  const block = s.slice(s.indexOf('async function writeAudit'), s.indexOf('async function writeAudit') + 1200);
  assert.match(block, /catch/, 'writeAudit must swallow its own errors');
  assert.match(block, /console\.warn/);
});

/* ── T7: no internal markers or foreign hashtags in published copy ───────── */

test('generated copy carries no internal draft marker', async () => {
  const engine = await read('../services/ragEngine.ts');
  assert.doesNotMatch(engine, /\[DRAF KORPORAT\]/, 'internal marker leaked into copy');
});

test('hashtags come from the brand profile, not a fixed template', async () => {
  const engine = await read('../services/ragEngine.ts');
  assert.doesNotMatch(engine, /#BUMDProfesional/, 'BUMD template hashtag must be gone');
  assert.doesNotMatch(engine, /#PelayananPublik/, 'BUMD template hashtag must be gone');
  assert.match(engine, /approvedHashtags/, 'brand hashtags must be used');
});

/* ── S6: copy is rendered as text, not baked into the image ──────────────── */

test('the generated image is overlaid with real text', async () => {
  const studio = await read('../components/CoreVisualStudio.tsx');
  assert.match(studio, /core-overlay/, 'an overlay layer is required');
  assert.match(studio, /core-overlay-head/, 'the headline must be live text');
  const css = await read('../styles/form-controls.css');
  assert.match(css, /\.core-overlay-head/);
});

/* ── S1 correction: validated values must be the ones stored ─────────────── */

test('workspace creation stores the validated values', async () => {
  const s = await server();
  // Previously the route validated but inserted the raw body fields.
  assert.doesNotMatch(s, /v\.name,v\.code,v\.sector,v\.city\]\)\)\.rows\[0\];\s*\}\s*catch/,
    'sanity');
  const creates = [...s.matchAll(/INSERT INTO organizations[\s\S]{0,320}?\[([^\]]+)\]/g)];
  assert.ok(creates.length >= 2, 'expected both create routes');
  for (const m of creates) {
    assert.match(m[1], /v\.name/, 'the validated name must be inserted');
    assert.match(m[1], /v\.code/, 'the validated code must be inserted');
  }
});
