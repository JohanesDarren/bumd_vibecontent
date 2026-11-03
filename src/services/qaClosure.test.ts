import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { scheduleJsonFrom } from '../../server/rag.ts';

const read = (p: string) => readFile(new URL(p, import.meta.url), 'utf8');

/* ── K2: orphan vectors can be listed and removed ─────────────────────────── */

test('admin can list orphan vectors without deleting anything', async () => {
  const s = await read('../../server/index.ts');
  assert.match(s, /app\.get\('\/api\/admin\/rag\/orphans'/);
  assert.match(s, /function ragOrphanReport/);
  assert.match(s, /FROM kms_documents/, 'the comparison must use the document table');
});

test('purging only touches vectors with no source document', async () => {
  const s = await read('../../server/index.ts');
  const block = s.slice(s.indexOf('/api/admin/rag/orphans/purge'), s.indexOf('/api/admin/rag/orphans/purge') + 1600);
  assert.match(block, /orphans as any\[\]/, 'must iterate the orphan list only');
  assert.match(block, /ragDeleteDocument/, 'must delete through the RAG client');
  assert.match(block, /Orphan vectors purged/, 'the purge must be audited');
});

test('the purge refuses to run when everything looks orphaned', async () => {
  const s = await read('../../server/index.ts');
  const block = s.slice(s.indexOf('/api/admin/rag/orphans/purge'), s.indexOf('/api/admin/rag/orphans/purge') + 2200);
  assert.match(block, /documentCount === 0/, 'an empty document table must abort');
  assert.match(block, /orphans\.length === total/, 'a fully-orphaned corpus is treated as an error');
  assert.match(block, /dibatalkan/);
});

/* ── S12: the schedule suggestion survives fenced / array / chatty replies ── */

test('a fenced JSON reply is accepted', () => {
  const out = scheduleJsonFrom({ content: '```json\n{"date":"2026-11-05","time":"19:00","reason":"x"}\n```' });
  assert.ok(out);
  assert.equal(JSON.parse(out!).date, '2026-11-05');
});

test('a part-array reply is accepted', () => {
  const out = scheduleJsonFrom({ content: [{ text: '{"date":"2026-11-06","time":"10:00"}' }] });
  assert.ok(out);
  assert.equal(JSON.parse(out!).time, '10:00');
});

test('a chatty reply with surrounding prose is accepted', () => {
  const out = scheduleJsonFrom({ content: 'Berikut saran saya: {"date":"2026-11-07","time":"09:00"} Semoga membantu.' });
  assert.ok(out);
  assert.equal(JSON.parse(out!).date, '2026-11-07');
});

test('reasoning-only replies are still searched', () => {
  const out = scheduleJsonFrom({ content: '', reasoning_content: '{"date":"2026-11-08","time":"08:00"}' });
  assert.ok(out);
});

test('a reply without JSON returns null instead of throwing', () => {
  assert.equal(scheduleJsonFrom({ content: 'Maaf, saya tidak bisa membantu.' }), null);
  assert.equal(scheduleJsonFrom(undefined), null);
});

test('the fallback varies the hour across alternatives', async () => {
  const s = await read('../../server/index.ts');
  assert.match(s, /timeOffset/, 'the slot search must accept a time offset');
  assert.match(s, /freeScheduleSlot\(platform,cursor,taken,out\.length\+1\)/,
    'alternatives must rotate the preferred hour');
});

/* ── S5: the editor keeps every character ────────────────────────────────── */

test('the editor no longer reads innerText', async () => {
  const src = await read('../components/BriefStudioView.tsx');
  assert.match(src, /function serializeEditable/);
  assert.match(src, /setEditorContent\(serializeEditable\(/);
  assert.doesNotMatch(src, /\.innerText\)/);
});

test('a DOM re-sync does not overwrite what the user just typed', async () => {
  const src = await read('../components/BriefStudioView.tsx');
  assert.match(src, /innerHTML !== next/, 'only rewrite when the markup actually differs');
});

/* ── K2 placement: platform upkeep belongs to the admin console ──────────── */

test('the admin console owns a platform maintenance tab', async () => {
  const dash = await read('../components/AdminDashboard.tsx');
  assert.match(dash, /'pemeliharaan'/, 'the tab must exist');
  assert.match(dash, /Pemeliharaan Platform/);
  assert.match(dash, /AdminMaintenanceView/);
});

test('workspace settings no longer host the platform cleanup', async () => {
  const settings = await read('../components/SettingsHelpView.tsx');
  assert.doesNotMatch(settings, /isSuperadmin/, 'the role prop must be gone');
  assert.doesNotMatch(settings, /ragPurgeOrphans/, 'the purge must not be here');
  assert.doesNotMatch(settings, /Pemeliharaan Cepat/);
});

test('the maintenance panel checks before it deletes', async () => {
  const panel = await read('../components/AdminMaintenanceView.tsx');
  assert.match(panel, /ragOrphans/, 'it must list first');
  assert.match(panel, /ragPurgeOrphans/, 'then purge');
  assert.match(panel, /window\.confirm/, 'and ask before deleting');
  assert.match(panel, /orphanCount === 0/, 'the purge button stays disabled with nothing to do');
});

test('a superadmin does not need a workspace of their own', async () => {
  const panel = await read('../components/AdminMaintenanceView.tsx');
  assert.match(panel, /workspaceId\?: string/, 'the workspace must be optional');
  const api = await read('../services/apiService.ts');
  assert.match(api, /ragOrphans:\(workspaceId\?:string\)/);
});
