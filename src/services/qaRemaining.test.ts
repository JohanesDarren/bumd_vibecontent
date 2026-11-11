import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { splitLimitations } from './ragEngine.ts';

const read = (p: string) => readFile(new URL(p, import.meta.url), 'utf8');

/* ── S3: statistics and bootstrap reflect the real KMS corpus ────────────── */

test('bootstrap returns documents from kms_documents, not the empty legacy table', async () => {
  const db = await read('../../server/database.ts');
  const block = db.slice(db.indexOf('function listBootstrap'), db.indexOf('function listBootstrap') + 6000);
  assert.match(block, /FROM kms_documents/, 'bootstrap must read the KMS table');
  assert.match(block, /kmsDocumentId/, 'documents must be mapped to the UI shape');
  assert.match(block, /seen\.has/, 'the merge must deduplicate');
});

test('the dashboard breakdown accounts for every format', async () => {
  const view = await read('../components/DashboardView.tsx');
  for (const label of ['Caption', 'Video', 'Siaran Pers', 'Panduan Visual']) {
    assert.ok(view.includes(label), `breakdown is missing ${label}`);
  }
});

test('archived drafts are excluded from dashboard counts', async () => {
  const view = await read('../components/DashboardView.tsx');
  assert.match(view, /status !== 'diarsipkan'/, 'archived drafts must not be counted');
  assert.match(view, /activeDrafts\.length/);
});

/* ── T5: archiving cancels the draft's future schedule ───────────────────── */

test('archiving a draft deactivates its upcoming schedule', async () => {
  const db = await read('../../server/database.ts');
  const block = db.slice(db.indexOf('export async function replaceDraft'), db.indexOf('export async function replaceDraft') + 6000);
  assert.match(block, /UPDATE content_schedules SET status='draft'/, 'future slots must be pulled back');
  assert.match(block, /status<>'published'/, 'already published items keep their record');
});

/* ── T8: quality scoring is honest ───────────────────────────────────────── */

test('grounding is not 100% when nothing is cited', async () => {
  const engine = await read('../services/ragEngine.ts');
  assert.doesNotMatch(engine, /groundedClaims = citations\.length > 0 \? 1 : 0/,
    'the old "any citation = 1 claim" formula must be gone');
  assert.match(engine, /const hasCitations/, 'grounding must require a real citation');
  assert.match(engine, /hasCitations && unsupported === 0/, 'passing needs zero unverified claims');
});

test('the tone message reflects the tone the brief asked for', async () => {
  const engine = await read('../services/ragEngine.ts');
  assert.doesNotMatch(engine, /brief\.tone \|\| 'Formal'/, 'tone must not hardcode Formal');
  assert.match(engine, /requestedTone/);
});

test('a version with banned words cannot be saved', async () => {
  const view = await read('../components/EditorWorkspaceView.tsx');
  assert.match(view, /bannedWordsFound/);
  assert.match(view, /Perbaiki kata terlarang sebelum menyimpan/);
});

/* ── S4: placeholders are sector-neutral ─────────────────────────────────── */

test('brief placeholders no longer assume a water or power utility', async () => {
  const view = await read('../components/BriefStudioView.tsx');
  for (const word of ['Sambungan Air', 'daya listrik', 'Pelanggan dengan daya']) {
    assert.ok(!view.includes(word), `placeholder still assumes "${word}"`);
  }
});

/* ── S6: a conflicting request is announced, not silently dropped ────────── */

test('a human request in product-only mode warns the user', async () => {
  const studio = await read('../components/CoreVisualStudio.tsx');
  assert.match(studio, /modeConflict/, 'the conflict must be detected');
  assert.match(studio, /Produk saja/, 'the warning must name the offending mode');
  assert.match(studio, /Dengan model/, 'the warning must point at the fix');
  const css = await read('../styles/form-controls.css');
  assert.match(css, /\.core-warn/);
});

/* ── S7: fresh data and no stale messages ────────────────────────────────── */

test('creating a workspace returns the sector and city it just stored', async () => {
  const server = await read('../../server/index.ts');
  const creates = [...server.matchAll(/INSERT INTO organizations\([\s\S]{0,240}?RETURNING ([^'`]+)/g)];
  assert.ok(creates.length >= 2, 'expected both create routes');
  for (const m of creates) {
    assert.match(m[1], /sector/, 'sector must be returned so the row renders without a reload');
    assert.match(m[1], /city/, 'city must be returned');
  }
});

test('a validation message is cleared when the visual mode changes', async () => {
  const studio = await read('../components/CoreVisualStudio.tsx');
  assert.match(studio, /useEffect\(\(\) => \{\s*setError\(''\);\s*\}, \[mode, publication, aspectRatio\]\)/,
    'stale errors must clear on mode change');
});

/* ── guard: splitLimitations still separates guidance from reader-facing terms */

test('writer instructions never reach the published copy', () => {
  const split = splitLimitations('Kuota terbatas. Tulis dalam bahasa formal.');
  assert.match(split.terms, /Kuota terbatas/);
  assert.match(split.guidance, /Tulis dalam bahasa formal/);
  assert.ok(!split.terms.includes('Tulis dalam bahasa formal'));
});
