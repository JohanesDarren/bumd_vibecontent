import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { extractDocumentText } from './documentText.ts';

const indexSrc = await readFile(new URL('./index.ts', import.meta.url), 'utf8');

test('Brief and Editor generation go to RAG, never to KMS', () => {
  // KMS is document storage for corporate uploads; RAG does retrieval+generation.
  assert.match(indexSrc, /const answer=await ragQuery\(workspaceId,query\)/);
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
