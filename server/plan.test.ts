// Pure parsing tests: no database, no RAG service.
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildPlanPrompt, cleanPlanRequest, parsePlanSlots } from './plan.ts';

const req = { dates: ['2026-10-12', '2026-10-13'], platforms: ['instagram', 'linkedin'], count: 5 };

test('plan parser keeps only slots inside the allowed dates and platforms', () => {
  const answer = 'Berikut rencananya:\n```json\n[' + [
    '{"date":"2026-10-12","time":"19:00","platform":"Instagram","pillar":"edukasi","title":"Kenali Tarif Baru","angle":"Jelaskan tarif","source":"SK 55/2026"}',
    '{"date":"2026-10-12","time":"19:00","platform":"instagram","pillar":"edukasi","title":"Kenali Tarif Baru","angle":"duplikat","source":""}',
    '{"date":"2026-10-30","time":"08:00","platform":"linkedin","pillar":"korporat","title":"Di luar tanggal","angle":"","source":""}',
    '{"date":"2026-10-13","time":"25:99","platform":"tiktok","pillar":"x","title":"Platform asing","angle":"","source":""}',
    '{"date":"2026-10-13","time":"8:00","platform":"linkedin","pillar":"lain","title":"Laporan Kinerja Triwulan","angle":"","source":""}',
    '{"date":"2026-10-13","time":"09:00","platform":"linkedin","pillar":"layanan","title":"水费调整","angle":"","source":""}'
  ].join(',') + ']\n```';
  const slots = parsePlanSlots(answer, req);
  assert.equal(slots.length, 2);
  assert.deepEqual(slots[0], { date: '2026-10-12', time: '19:00', platform: 'instagram', pillar: 'edukasi', title: 'Kenali Tarif Baru', angle: 'Jelaskan tarif', source: 'SK 55/2026' });
  assert.deepEqual({ time: slots[1].time, pillar: slots[1].pillar }, { time: '09:00', pillar: null });
  assert.deepEqual(parsePlanSlots('maaf, tidak bisa', req), []);
  assert.deepEqual(parsePlanSlots('[{"broken": ]', req), []);
});

test('plan requests are validated before reaching the model', () => {
  assert.equal(cleanPlanRequest({ mode: 'plan', theme: '', dates: ['2026-10-12'], platforms: ['instagram'] }), 'Tema rencana wajib diisi.');
  assert.equal(cleanPlanRequest({ mode: 'gap', dates: [], platforms: ['instagram'] }), 'Tidak ada tanggal yang tersedia untuk direncanakan.');
  const clean = cleanPlanRequest({ mode: 'plan', theme: 'Tarif', dates: ['2026-10-12', 'x'], platforms: ['instagram', 'myspace'], count: 50 });
  assert.ok(typeof clean !== 'string');
  assert.deepEqual([clean.dates, clean.platforms, clean.count], [['2026-10-12'], ['instagram'], 12]);
  assert.match(buildPlanPrompt(clean), /HANYA boleh salah satu dari: 2026-10-12./);
});
