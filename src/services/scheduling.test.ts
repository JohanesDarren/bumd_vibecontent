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

import { suggestPublishSlot, suggestPublishSlots, type BookedSlot } from './scheduling.ts';

test('suggested slots are a full date+time and never repeat', () => {
  const booked: BookedSlot[] = [];
  const seen = new Set<string>();
  for (let i = 0; i < 5; i++) {
    const slot = suggestPublishSlot('instagram', '2026-10-22', booked);
    assert.match(slot.date, /^\d{4}-\d{2}-\d{2}$/);
    assert.match(slot.time, /^\d{2}:\d{2}$/);
    assert.ok(!seen.has(`${slot.date}T${slot.time}`), 'slot must be unique');
    seen.add(`${slot.date}T${slot.time}`);
    booked.push({ date: slot.date, time: slot.time });
  }
  assert.equal(seen.size, 5);
});

test('a date already holding a post is skipped in favour of another day', () => {
  const booked: BookedSlot[] = [{ date: '2026-10-27', time: '19:00' }];
  const slot = suggestPublishSlot('instagram', '2026-10-22', booked);
  assert.notEqual(slot.date, '2026-10-27');
});

test('alternatives land on different days', () => {
  const slots = suggestPublishSlots('instagram', '2026-10-22', [], 3);
  assert.equal(new Set(slots.map(s => s.date)).size, 3);
});

test('a fully booked day is avoided', () => {
  const booked: BookedSlot[] = ['08:00','09:00','12:00','17:00','19:00','20:00'].map(time => ({ date: '2026-10-27', time }));
  assert.notEqual(suggestPublishSlot('instagram', '2026-10-22', booked).date, '2026-10-27');
});
