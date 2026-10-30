import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { extractDocumentText } from './documentText.ts';

const indexSrc = await readFile(new URL('./index.ts', import.meta.url), 'utf8');

test('Brief and Editor generation go to RAG, never to KMS', () => {
  // KMS is document storage for corporate uploads; RAG does retrieval+generation.
  // The call must also carry the workspace document allow-list: the corpus is
  // shared, so isolation comes from the assigned documents, not the collection.
  assert.match(
    indexSrc,
    /const answer=await ragQuery\(workspaceId,query,undefined,await authorizedKmsIds\(String\(workspaceId\)\)\)/,
    'generation must scope RAG to the workspace documents'
  );
  assert.ok(
    !/queryKnowledge\(query,kmsConfig\(\)/.test(indexSrc),
    'generation must not call the KMS chat endpoint'
  );
});

test('KMS upload also indexes the document into the workspace RAG knowledge base', () => {
  assert.match(indexSrc, /ragIndexDocument\(\{/);
  assert.match(indexSrc, /extractDocumentText\(filename,fileData\)/);
  assert.match(indexSrc, /SET indexed=true/);
});

test('RAG status reflects the RAG service, not KMS', () => {
  assert.match(indexSrc, /await ragStatus\(\)/);
});

test('markdown documents are extracted for indexing', () => {
  const text = extractDocumentText('profil.md', Buffer.from('# Profil\n\nMasa studi 6 semester.'));
  assert.match(text, /Masa studi 6 semester/);
});

test('unsupported binary formats are rejected instead of indexed empty', () => {
  assert.throws(() => extractDocumentText('gambar.png', Buffer.from([0x89, 0x50])), /belum didukung/);
});

test('model reasoning traces are never used as the draft', async () => {
  // Regression: deepseek sometimes returns empty `content` and puts its plan in
  // `reasoning_content` ("The user wants a single Instagram caption..."), which
  // then failed the quality gate and produced no draft at all.
  const src = await readFile(new URL('./rag.ts', import.meta.url), 'utf8');
  assert.match(src, /reasoning traces are NOT copy/i);
  assert.ok(src.includes("the user|i |we |let me"), 'reasoning must be screened before use');
});

test('publish schedule is planned by the model, not a fixed hour table', async () => {
  // The product requirement: the date AND time must come from the model, since a
  // static table can never know platform/content context or avoid collisions.
  const src = await readFile(new URL('./rag.ts', import.meta.url), 'utf8');
  assert.match(src, /export async function ragSuggestSchedule/);
  assert.match(src, /tanggal DAN jam/i);
  assert.match(src, /Jangan menyarankan slot yang sudah terpakai/);
  assert.match(src, /Jangan selalu memilih jam yang sama/);
});

test('the schedule endpoint falls back to deterministic search when the model fails', async () => {
  const src = await readFile(new URL('./index.ts', import.meta.url), 'utf8');
  assert.match(src, /schedule-suggestion/);
  assert.match(src, /freeScheduleSlot\(/);
  assert.match(src, /source:'fallback'/);
});

test('the writer receives channel, tone and format, not only facts', async () => {
  // Regression: sending only facts made captions come out as fragments
  // ("6 semester. Gelar A.Md.Kom. Akreditasi Unggul.") instead of flowing prose.
  const src = await readFile(new URL('./rag.ts', import.meta.url), 'utf8');
  assert.match(src, /INSTRUKSI GAYA \(wajib dipatuhi\)/);
  assert.match(src, /function styleFrom/);
  assert.match(src, /DILARANG menulis deretan fragmen/);
  assert.match(src, /CONTOH GAYA YANG BENAR/);
});

test('quick variations reject truncated output instead of replacing the draft', async () => {
  // Regression: a variation could return only a heading or closing line and the
  // editor would swap the whole draft for it, looking like corrupted context.
  const src = await readFile(new URL('./rag.ts', import.meta.url), 'utf8');
  assert.match(src, /const quality = \(text: string, kind\?: string\)/);
  assert.match(src, /const usable = \(text: string\) => quality\(text, kind\) === null/);
  assert.match(src, /round < 3/);
  assert.match(src, /Variasi gagal:/);
});

test('each variation kind enforces its own quality rules', async () => {
  const src = await readFile(new URL('./rag.ts', import.meta.url), 'utf8');
  assert.match(src, /const quality = \(text: string, kind\?: string\)/);
  assert.match(src, /case 'instagram':/);
  assert.match(src, /case 'whatsapp':/);
  assert.match(src, /case 'bullets':/);
  assert.match(src, /case 'thread':/);
  assert.match(src, /case 'expand':/);
  // A rejected result is fed back so the retry can correct itself.
  assert.match(src, /Hasil sebelumnya ditolak karena/);
  // Over-long expansions are trimmed, not discarded.
  assert.match(src, /kind === 'expand' && last\.length > baseLen \* 2\.2/);
});

test('variations run on the writer model, not the KMS chat endpoint', async () => {
  const src = await readFile(new URL('./index.ts', import.meta.url), 'utf8');
  const refine = src.slice(src.indexOf("app.post('/api/rag/refine'"), src.indexOf("app.post('/api/rag/plan'"));
  assert.match(refine, /ragRefine\(/);
  assert.ok(!/queryKnowledge\(/.test(refine), 'refine must not use the KMS chat path');
});
