import test from 'node:test';
import assert from 'node:assert/strict';
import type { AppSettings } from './appSettings.ts';
import {
  DEFAULT_SETTINGS,
  GROUNDING_PRESETS,
  groundingForLevel,
  toRagOptions,
  buildRetrievalQuery,
  redactCitationExcerpts,
  shouldCallRemote,
  shouldPersistDraft,
  outboundDataSummary,
  REDACTED_EXCERPT
} from './appSettings.ts';

const withSettings = (overrides: {
  privacy?: Partial<AppSettings['privacy']>;
  grounding?: Partial<AppSettings['grounding']>;
}): AppSettings => ({
  ...DEFAULT_SETTINGS,
  grounding: { ...DEFAULT_SETTINGS.grounding, ...(overrides.grounding || {}) },
  privacy: { ...DEFAULT_SETTINGS.privacy, ...(overrides.privacy || {}) }
});

/* ── Grounding scale ─────────────────────────────────────────────────── */

test('grounding scale applies the matching preset', () => {
  const level5 = groundingForLevel(5);
  assert.equal(level5.level, 5);
  assert.equal(level5.threshold, GROUNDING_PRESETS[5].threshold);
  assert.equal(level5.topK, GROUNDING_PRESETS[5].topK);
  assert.equal(level5.strictGrounding, true);

  const level1 = groundingForLevel(1);
  assert.equal(level1.strictGrounding, false);
  assert.ok(level1.threshold < level5.threshold);
});

test('grounding scale clamps out-of-range input', () => {
  assert.equal(groundingForLevel(9).level, 5);
  assert.equal(groundingForLevel(0).level, 1);
});

test('toRagOptions maps the grounding settings to RAG option keys', () => {
  const options = toRagOptions({ level: 0, strictGrounding: true, threshold: 0.5, topK: 4, includeSources: true, useReranker: true, useHybrid: false });
  assert.deepEqual(options, {
    top_k: 4,
    strict_grounding: true,
    threshold: 0.5,
    include_sources: true,
    use_reranker: true,
    use_hybrid: false
  });
});

/* ── Privacy: includeBrandContextInQuery ─────────────────────────────── */

const parts = { title: 'Kampanye Air', keyMessage: 'Tarif baru 1250000', targetAudience: 'Warga Surabaya', tone: 'Formal', channel: 'Instagram', format: 'copy_caption' };

test('privacy: brand context IS sent when enabled', () => {
  const query = buildRetrievalQuery(withSettings({ privacy: { includeBrandContextInQuery: true } }), parts);
  assert.match(query, /Kampanye Air/);
  assert.match(query, /Warga Surabaya/);
  assert.match(query, /Instagram/);
});

test('privacy: UI-only tokens are never used for retrieval', () => {
  const query = buildRetrievalQuery(withSettings({ privacy: { includeBrandContextInQuery: true } }), parts);
  assert.doesNotMatch(query, /copy_caption/);
  assert.doesNotMatch(query, /Formal/);
  assert.match(query, /Warga Surabaya/);
});

test('privacy: brand context is NOT sent when disabled', () => {
  const query = buildRetrievalQuery(withSettings({ privacy: { includeBrandContextInQuery: false } }), parts);
  assert.match(query, /Kampanye Air/);
  assert.match(query, /Tarif baru 1250000/);
  assert.doesNotMatch(query, /Warga Surabaya/);
  assert.doesNotMatch(query, /Instagram/);
  assert.doesNotMatch(query, /Formal/);
});

/* ── Privacy: allowRemoteGeneration ──────────────────────────────────── */

test('privacy: remote generation flag toggles the external call', () => {
  assert.equal(shouldCallRemote(withSettings({ privacy: { allowRemoteGeneration: true } })), true);
  assert.equal(shouldCallRemote(withSettings({ privacy: { allowRemoteGeneration: false } })), false);
});

/* ── Privacy: persistGeneratedDrafts ─────────────────────────────────── */

test('privacy: draft persistence flag toggles database writes', () => {
  assert.equal(shouldPersistDraft(withSettings({ privacy: { persistGeneratedDrafts: true } })), true);
  assert.equal(shouldPersistDraft(withSettings({ privacy: { persistGeneratedDrafts: false } })), false);
});

/* ── Privacy: includeSourceExcerpts ──────────────────────────────────── */

test('privacy: source excerpts kept when enabled', () => {
  const citations = [{ id: 'c1', excerpt: 'Isi dokumen rahasia perusahaan.' }];
  const result = redactCitationExcerpts(withSettings({ privacy: { includeSourceExcerpts: true } }), citations);
  assert.equal(result[0].excerpt, 'Isi dokumen rahasia perusahaan.');
});

test('privacy: source excerpts redacted when disabled', () => {
  const citations = [{ id: 'c1', excerpt: 'Isi dokumen rahasia perusahaan.' }];
  const result = redactCitationExcerpts(withSettings({ privacy: { includeSourceExcerpts: false } }), citations);
  assert.equal(result[0].excerpt, REDACTED_EXCERPT);
  assert.doesNotMatch(result[0].excerpt, /rahasia/i);
  // metadata is preserved
  assert.equal(result[0].id, 'c1');
});

/* ── Privacy summary reflects live state ─────────────────────────────── */

test('privacy summary reports when nothing leaves the app', () => {
  const summary = outboundDataSummary(withSettings({ privacy: { allowRemoteGeneration: false } }), DEFAULT_SETTINGS.grounding);
  assert.equal(summary.length, 1);
  assert.match(summary[0], /tidak ada data yang dikirim keluar/i);
});

test('privacy summary lists all outbound items when enabled', () => {
  const summary = outboundDataSummary(withSettings({ privacy: { allowRemoteGeneration: true, persistGeneratedDrafts: false } }), DEFAULT_SETTINGS.grounding);
  assert.ok(summary.some(line => /konteks merek/i.test(line)));
  assert.ok(summary.some(line => /TIDAK disimpan ke database/i.test(line)));
  assert.ok(summary.some(line => /grounding/i.test(line)));
});
