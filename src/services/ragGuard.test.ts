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

test('guardRagResponse drops sources below the threshold', () => {
  const result = guardRagResponse({ answer: 'Biaya 1.250.000 rupiah.', grounded: true, sources: [strong, weak], threshold: 0.35 });
  assert.equal(result.sources.length, 1);
  assert.equal(result.droppedSources, 1);
  assert.match(result.notes.join(' '), /1 sumber di bawah ambang/i);
});

test('guardRagResponse grounds when evidence passes the threshold', () => {
  const result = guardRagResponse({ answer: '## Biaya\nBiaya sambungan baru 1.250.000 rupiah.', grounded: true, sources: [strong], threshold: 0.35 });
  assert.equal(result.grounded, true);
  assert.equal(result.usedFallback, false);
  assert.doesNotMatch(result.answer, /##/);
});

test('guardRagResponse falls back when no source passes the threshold', () => {
  const result = guardRagResponse({ answer: 'Tarif bulanan 2.800 rupiah.', grounded: true, sources: [weak], threshold: 0.8 });
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
  assert.match(result.notes.join(' '), /klaim angka tidak cocok/i);
});

test('guardRagResponse accepts numbers that appear in the excerpt', () => {
  const result = guardRagResponse({ answer: 'Biaya 1.250.000 rupiah dan tarif 2.800 per m3.', grounded: true, sources: [strong, weak], threshold: 0.1 });
  assert.equal(result.sources.length, 2);
  assert.equal(result.unsupportedClaims.length, 0);
});
