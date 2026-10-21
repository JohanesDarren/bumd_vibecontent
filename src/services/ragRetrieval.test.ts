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
