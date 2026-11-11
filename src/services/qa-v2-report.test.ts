import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { reviewRagCopy } from './ragEngine.ts';
import { factConflicts } from './scheduling.ts';

const read = (p: string) => readFile(new URL(p, import.meta.url), 'utf8');

/* F01 — corporate Uji Grounding goes apiService.ragQuery -> POST /api/rag/jobs.
 * Both RAG read routes must be free of the contentOnly veto. */
test('corporate can run the read-only RAG (F01)', async () => {
  const s = await read('../../server/index.ts');
  const api = await read('./apiService.ts');
  assert.match(api, /`\/api\/rag\/jobs`/, 'UI grounding test uses the jobs route');
  assert.doesNotMatch(s, /app\.post\('\/api\/rag\/jobs',contentOnly/);
  assert.doesNotMatch(s, /app\.post\('\/api\/rag\/query',contentOnly/);
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
});

const brief = { title: 'Info', keyMessage: 'Info', audience: 'mhs', format: 'caption', channel: 'ig', cta: '' } as any;
const brand = { requiredTerms: [], bannedWords: [], approvedCtas: [], disclaimers: [], approvedChannels: [] } as any;
const numberWarnings = (answer: string, excerpt: string) =>
  reviewRagCopy(answer, brief, brand, [{ documentId: 'd', documentTitle: 't', excerpt } as any])
    .warnings.filter(w => /angka/.test(w));

/* F03 — identifier digits count as supported, but loose substrings do not */
test('grounding accepts QA-V2-5519 -> 5519 (F03)', () => {
  assert.deepEqual(numberWarnings('Kode QA-V2-5519 adalah 5519.', 'Kode QA-V2-5519.'), []);
});

test('grounding still flags numbers that are only substrings of source numbers (F03 regression guard)', () => {
  assert.equal(numberWarnings('Kuota 19 mahasiswa.', 'Didirikan tahun 2019.').length, 1);
  assert.equal(numberWarnings('Biaya Rp 500.', 'Biaya Rp 5.000.000.').length, 1);
});

/* F04 — one warning per missing document, chunks counted */
test('missing document warns once with citation count (F04)', () => {
  const title = 'D3_Sistem_Informasi_Telkom_University.docx';
  const draft = { versions: [{ citations: [
    { documentId: 'chunk-a', documentTitle: title, excerpt: '' },
    { documentId: 'chunk-b', documentTitle: title, excerpt: '' }
  ] }], currentVersion: 1 } as any;
  assert.deepEqual(factConflicts({ date: '2026-10-10' } as any, draft, []), [
    `Dokumen sumber "${title}" sudah tidak ada di Knowledge Base (2 kutipan terdampak).`
  ]);
});

test('citation file name resolves to the KB document without extension (F04)', () => {
  const draft = { versions: [{ citations: [
    { documentId: 'chunk-a', documentTitle: 'D3_Sistem_Informasi_Telkom_University.docx', excerpt: '' }
  ] }], currentVersion: 1 } as any;
  const docs = [{ id: 'kb-1', title: 'D3_Sistem_Informasi_Telkom_University', status: 'aktif' }] as any;
  assert.deepEqual(factConflicts({ date: '2026-10-10' } as any, draft, docs), []);
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
