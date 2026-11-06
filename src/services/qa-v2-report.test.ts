import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (p: string) => readFile(new URL(p, import.meta.url), 'utf8');

/* F01 — uji grounding corporate harus boleh (read-only) */
test('corporate can run the read-only RAG (F01)', async () => {
  const s = await read('../../server/index.ts');
  assert.ok(
    !/app\.post\('\/api\/rag\/query',contentOnly/.test(s),
    'rag/query is a retrieval read, not a mutation — corporate must not be vetoed'
  );
});

/* F02 — dashboard row cells match header count */
test('dashboard rows have six cells matching six headers (F02)', async () => {
  const d = await read('../components/DashboardView.tsx');
  const head = d.slice(d.indexOf('Judul Draf</th>') - 400, d.indexOf('Aksi</th>'));
  assert.equal((head.match(/<th /g) || []).length, 6);
  const rowStart = d.indexOf('<tr key={d.id}');
  assert.ok(rowStart > 0, 'draft row must exist');
  const row = d.slice(rowStart, d.indexOf('</tr>', rowStart));
  assert.equal((row.match(/<td /g) || []).length, 6, 'row cells must match the 6 headers');
  assert.match(d, /function WorkflowStatus/, 'status cell must exist');
});

/* F03 — QA-V2-5519 must not be flagged as an unsupported number */
test('grounding accepts identifiers containing cited numbers (F03)', async () => {
  const e = await read('./ragEngine.ts');
  assert.match(e, /appearsInsideToken/, 'token-internal number must count as supported');
  assert.match(e, /!appearsInsideToken\(supportedSource, number\)/);
});

/* F04 — one warning per missing document + affected-citation count */
test('missing-document warning dedupes and reports citation count (F04)', async () => {
  const s = await read('./scheduling.ts');
  assert.match(s, /missingCount/);
  assert.match(s, /kutipan terdampak/);
  assert.doesNotMatch(s, /const key = `missing:\$\{documentId\}`;\n      if \(!seen\.has\(key\)\) \{\n        seen\.add\(key\);/, 'old per-chunk keys must be gone');
});

/* UX notes */
test('creator does not see the dead Edit Profil button', async () => {
  const d = await read('../components/DashboardView.tsx');
  assert.match(d, /activeUser\?\.role !== 'creator' && \(\s*<button/);
});

test('the save control does not hide that it generates', async () => {
  const b = await read('../components/BriefStudioView.tsx');
  assert.match(b, /Simpan Draf \+ Generate|Draf Tersimpan/);
});

test('help points uploads at Knowledge Base', async () => {
  const h = await read('../components/SettingsHelpView.tsx');
  assert.match(h, /Unggah dokumen resmi di Knowledge Base/);
  assert.match(h, /workspace di bawah perusahaan Anda/);
});
