import test from 'node:test';
import assert from 'node:assert/strict';
import type { RagHit } from './apiService.ts';
import {
  normalizeScore,
  sanitizeAnswer,
  extractNumericClaims,
  isClaimSupported,
  guardRagResponse
} from './ragGuard.ts';

const hit = (score: number, content: string): RagHit => ({
  document_id: 'doc-1',
  chunk_id: 'c1',
  content,
  score,
  document_name: 'Board Decree No. 55/2026'
});

/* ── normalizeScore ──────────────────────────────────────────────────── */

test('normalizeScore handles 0..1 and 0..100 inputs', () => {
  assert.equal(normalizeScore(0.5), 0.5);
  assert.equal(normalizeScore(50), 0.5);
  assert.equal(normalizeScore(1), 1);
  assert.equal(normalizeScore(120), 1);
  assert.equal(normalizeScore(-1), 0);
  assert.equal(normalizeScore(undefined), 0);
});

/* ── sanitizeAnswer ──────────────────────────────────────────────────── */

test('sanitizeAnswer strips markdown and meta prefixes', () => {
  const raw = '## Ketentuan\n\n**Biaya** sambungan baru adalah `1.250.000 rupiah`.\n\n- Bayar 3x.';
  const clean = sanitizeAnswer(raw);
  assert.doesNotMatch(clean, /##|\*\*|`/);
  assert.match(clean, /Biaya sambungan baru adalah 1\.250\.000 rupiah/);
});

test('sanitizeAnswer removes an "Jawaban:" prefix', () => {
  assert.equal(sanitizeAnswer('Jawaban: Tarif naik.'), 'Tarif naik.');
});

test('sanitizeAnswer caps the number of sentences', () => {
  const raw = 'Satu. Dua. Tiga. Empat. Lima. Enam.';
  const clean = sanitizeAnswer(raw, 2);
  assert.equal(clean, 'Satu. Dua.');
});

/* ── numeric claim checks ────────────────────────────────────────────── */

test('extractNumericClaims keeps significant numbers only', () => {
  const claims = extractNumericClaims('Biaya 1.250.000 rupiah, cicilan 3 kali, tahun 2026, tarif 2.800/m3.');
  assert.ok(claims.includes('1.250.000'));
  assert.ok(claims.includes('2.800'));
  assert.ok(claims.includes('2026'));
  assert.ok(!claims.includes('3'));
});

test('isClaimSupported matches against excerpt digits', () => {
  assert.equal(isClaimSupported('1250000', ['Biaya sambungan baru 1.250.000 rupiah.']), true);
  assert.equal(isClaimSupported('1250000', ['Tidak disebutkan nominalnya.']), false);
});

/* ── guardRagResponse ────────────────────────────────────────────────── */

const strong = hit(0.9, 'Biaya sambungan baru pelanggan niaga 1.250.000 rupiah dengan 3 kali angsuran tanpa bunga.');
const weak = hit(0.2, 'Bab 4 mengatur tarif bulanan 2.800 rupiah per m3.');

test('a grounded answer keeps every citation the provider returned', () => {
  const result = guardRagResponse({ answer: 'Biaya 1.250.000 rupiah.', grounded: true, sources: [strong, weak], threshold: 0.35 });
  assert.equal(result.sources.length, 2);
  assert.equal(result.droppedSources, 0);
});

test('an ungrounded answer still drops sources below the threshold', () => {
  const result = guardRagResponse({ answer: 'Biaya 1.250.000 rupiah.', grounded: false, sources: [strong, weak], threshold: 0.35 });
  assert.equal(result.grounded, false);
  assert.equal(result.droppedSources, 1);
  assert.match(result.notes.join(' '), /1 dokumen kurang cocok/i);
});

test('KMS citation without a score remains valid only when KMS confirms grounding', () => {
  const citation = {document_id:'doc-1', document_name:'SOP Resmi'} as RagHit;
  const result = guardRagResponse({answer:'Layanan resmi tersedia.', grounded:true, sources:[citation], threshold:0.35});
  assert.equal(result.grounded,true);
  assert.equal(result.sources.length,1);
  assert.equal(guardRagResponse({answer:'Layanan resmi tersedia.',grounded:false,sources:[citation],threshold:0.35}).grounded,false);
});

test('guardRagResponse grounds when evidence passes the threshold', () => {
  const result = guardRagResponse({ answer: '## Biaya\nBiaya sambungan baru 1.250.000 rupiah.', grounded: true, sources: [strong], threshold: 0.35 });
  assert.equal(result.grounded, true);
  assert.equal(result.usedFallback, false);
  assert.doesNotMatch(result.answer, /##/);
});

test('guardRagResponse keeps citations when the service already grounded the answer', () => {
  // The UI threshold is a local relevance filter, not a veto over the provider's
  // grounding decision: provider scores are on a different scale.
  const result = guardRagResponse({ answer: 'Tarif bulanan 2.800 rupiah.', grounded: true, sources: [weak], threshold: 0.8 });
  assert.equal(result.grounded, true);
  assert.equal(result.usedFallback, false);
  assert.equal(result.sources.length, 1);
});

test('guardRagResponse falls back when an ungrounded answer has no relevant source', () => {
  const result = guardRagResponse({ answer: 'Tarif bulanan 2.800 rupiah.', grounded: false, sources: [weak], threshold: 0.8 });
  assert.equal(result.grounded, false);
  assert.equal(result.usedFallback, true);
  assert.match(result.answer, /belum tersedia di dokumen aktif/i);
  assert.equal(result.sources.length, 0);
});

test('guardRagResponse falls back when the service reports not grounded', () => {
  const result = guardRagResponse({ answer: 'Entah.', grounded: false, sources: [strong], threshold: 0.35 });
  assert.equal(result.grounded, false);
  assert.equal(result.usedFallback, true);
  assert.ok(result.unsupportedClaims.length > 0);
});

test('guardRagResponse flags numbers that are absent from the excerpts', () => {
  const result = guardRagResponse({ answer: 'Diskonnya 50 persen dan biaya 9.999.000 rupiah.', grounded: true, sources: [strong], threshold: 0.35 });
  assert.equal(result.grounded, true);
  assert.ok(result.unsupportedClaims.some(line => /9\.999\.000/.test(line)));
  assert.match(result.notes.join(' '), /angka belum cocok/i);
});

test('guardRagResponse accepts numbers that appear in the excerpt', () => {
  const result = guardRagResponse({ answer: 'Biaya 1.250.000 rupiah dan tarif 2.800 per m3.', grounded: true, sources: [strong, weak], threshold: 0.1 });
  assert.equal(result.sources.length, 2);
  assert.equal(result.unsupportedClaims.length, 0);
});

test('sanitizeAnswer removes model self-talk that leaked into the copy', () => {
  // Regression: production answers contained fragments like these.
  const raw = 'D3 Sistem Informasi ditempuh 6 semester. intensively? Need Indonesian natural. Gelar A.Md.Kom.';
  const clean = sanitizeAnswer(raw);
  assert.ok(!/need indonesian/i.test(clean), clean);
  assert.ok(!/intensively\?/i.test(clean), clean);
  assert.match(clean, /6 semester/);
  assert.match(clean, /A\.Md\.Kom/);
});

test('sanitizeAnswer repairs corrupted concatenation tokens', () => {
  assert.match(sanitizeAnswer('Setelah studi selesai, pesertaTxn memperoleh gelar.'), /peserta memperoleh/);
});

test('grounded answers keep their citations even below the UI threshold', () => {
  // Regression: provider reranker scores (~0.27-0.32) sit under the 0.35 UI
  // threshold, so every source was dropped and valid copy became
  // "no document supports this".
  const weak = [hit(0.31, 'masa studi 6 semester'), hit(0.28, 'gelar A.Md.Kom')];
  const result = guardRagResponse({ answer: 'Masa studi 6 semester dengan gelar A.Md.Kom.', grounded: true, sources: weak, threshold: 0.35 });
  assert.equal(result.grounded, true);
  assert.equal(result.sources.length, 2);
});

test('ungrounded answers still drop weak sources', () => {
  const result = guardRagResponse({ answer: 'teks', grounded: false, sources: [hit(0.1, 'x')], threshold: 0.35 });
  assert.equal(result.grounded, false);
  assert.equal(result.sources.length, 0);
});

test('citation markers never reach the copy', () => {
  assert.equal(sanitizeAnswer('Masa studi 6 semester [1][2].'), 'Masa studi 6 semester.');
  assert.equal(sanitizeAnswer('Gelar A.Md.Kom [1, 2].'), 'Gelar A.Md.Kom.');
});
