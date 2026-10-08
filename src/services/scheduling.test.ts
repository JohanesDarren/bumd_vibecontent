import test from 'node:test';
import assert from 'node:assert/strict';
import { addDays, factConflicts, isOverdue, startOfWeek } from './scheduling.ts';
import type { ContentDraft, KnowledgeDocument, ScheduledContent } from '../types/index.ts';

const item = { id: 's1', workspaceId: 'ws', title: 'Tarif', platform: 'instagram', status: 'scheduled', date: '2026-10-03', time: '09:00', draftId: 'd1' } satisfies ScheduledContent;

test('week helpers use local Monday-based weeks', () => {
  assert.equal(startOfWeek('2026-10-07'), '2026-10-05');
  assert.equal(startOfWeek('2026-10-11'), '2026-10-05');
  assert.equal(addDays('2026-10-31', 1), '2026-11-01');
});

test('overdue only for scheduled entries whose time has passed', () => {
  assert.equal(isOverdue(item, '2026-10-07', '10:00'), true);
  assert.equal(isOverdue({ ...item, date: '2026-10-07' }, '2026-10-07', '08:59'), false);
  assert.equal(isOverdue({ ...item, status: 'published' }, '2026-10-07', '10:00'), false);
});

test('fact conflicts flag airing before the effective date and inactive sources', () => {
  const draft = { id: 'd1', currentVersionon: 1, versions: [{ versionNumber: 1, citations: [{ documentId: 'sk55', documentTitle: 'SK 55/2026' }] }] } as unknown as ContentDraft;
  const doc = { id: 'sk55', title: 'SK 55/2026', status: 'aktif', effectiveDate: '2026-10-06' } as KnowledgeDocument;
  assert.deepEqual(factConflicts({ ...item, date: '2026-10-06' }, draft, [doc]), []);
  assert.match(factConflicts(item, draft, [doc])[0], /sebelum "SK 55\/2026" berlaku \(2026-10-06\)/);
  assert.match(factConflicts({ ...item, date: '2026-10-09' }, draft, [{ ...doc, status: 'usang' }])[0], /berstatus Usang/);
  assert.match(factConflicts(item, draft, [])[0], /sudah tidak ada/);
});

test('moments follow the workspace sector; gaps and weak pillars are detected', async () => {
  const { momentsInMonth, emptyFutureDates, weakPillars } = await import('./scheduling.ts');
  assert.deepEqual(momentsInMonth(2027, 2, 'Air Minum')['2027-03-22'], ['Hari Air Sedunia']);
  assert.equal(momentsInMonth(2027, 2, 'Pasar')['2027-03-22'], undefined);
  assert.deepEqual(momentsInMonth(2026, 9, '')['2026-10-28'], ['Hari Sumpah Pemuda']);

  const empty = emptyFutureDates(2026, 9, '2026-10-29', new Set(['2026-10-30']));
  assert.deepEqual(empty, ['2026-10-29', '2026-10-31']);

  assert.deepEqual(weakPillars([{ pillar: 'edukasi' }, { pillar: 'edukasi' }]), []);
  assert.deepEqual(weakPillars([{ pillar: 'edukasi' }, { pillar: 'edukasi' }, { pillar: 'layanan' }, { pillar: 'layanan' }]), ['korporat']);
});
