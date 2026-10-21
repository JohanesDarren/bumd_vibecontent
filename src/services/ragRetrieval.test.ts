import test from 'node:test';
import assert from 'node:assert/strict';
import { retrievalTextFrom } from '../../server/rag.ts';

test('retrieval uses the brief facts, not the writing instructions', () => {
  // Regression: the full instructional prompt made RAG return ungrounded 3/3
  // times, while the factual query was grounded 3/3 with score 0.60.
  const brief = [
    'Tulis naskah caption Instagram untuk brief berikut.',
    'Judul: Profil D3 Sistem Informasi',
    'Pesan Kunci & Fakta: Masa studi 6 semester dengan gelar A.Md.Kom.',
    'Audiens: Calon mahasiswa',
    'CTA: Daftar sekarang'
  ].join('\n');
  const text = retrievalTextFrom(brief);
  assert.match(text, /Profil D3 Sistem Informasi/);
  assert.match(text, /6 semester/);
  assert.ok(!/Tulis naskah caption Instagram untuk brief berikut/i.test(text), text);
});

test('retrieval falls back to the whole query when no facts are labelled', () => {
  assert.equal(retrievalTextFrom('Berapa masa studi D3 Sistem Informasi?'), 'Berapa masa studi D3 Sistem Informasi?');
});

test('UI label variants are parsed into facts, not sent as instructions', () => {
  // Regression: the UI emits "Pesan Kunci & Fakta yang wajib dipakai:" and
  // "Target Audiens:" / "Kanal Distribusi:". The old exact-label regex missed
  // them, so the whole instruction prompt went to the embedding model and
  // relevance fell below the threshold -> "no document matches" for valid briefs.
  const uiQuery = [
    'Tulis naskah konten dalam Bahasa Indonesia berdasarkan dokumen resmi workspace.',
    'Judul: Kuliah Vokasi 3 Tahun',
    'Pesan Kunci & Fakta yang wajib dipakai:',
    'Program D3 ditempuh 6 semester dengan gelar A.Md.Kom.',
    'Target Audiens: Calon Mahasiswa Baru',
    'Kanal Distribusi: Instagram Feed & Reels',
    'Nada Suara: Inovatif',
    'Format Output: Copy & Caption',
    'Call to Action: Daftar sekarang'
  ].join('\n');
  const text = retrievalTextFrom(uiQuery);
  assert.match(text, /Kuliah Vokasi 3 Tahun/);
  assert.match(text, /6 semester/);
  assert.match(text, /Instagram Feed/);
  assert.ok(!/Tulis naskah konten/i.test(text), text);
});

test('a label with its value on the next line is still captured', () => {
  const text = retrievalTextFrom('Judul: X\nPesan Kunci & Fakta yang wajib dipakai:\nFakta penting di sini.\nTarget Audiens: Umum');
  assert.match(text, /Fakta penting di sini/);
  assert.match(text, /Umum/);
});
