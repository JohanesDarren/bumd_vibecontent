import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);

test('the RAG transport retries per-key concurrency backpressure', async () => {
  const rag = await readFile(new URL('server/rag.ts', root), 'utf8');
  // The gateway answers "This key already has 2 queries running"; that must be
  // treated as transient, not surfaced to the user.
  assert.match(rag, /concurrencyError/, 'must detect concurrency errors');
  assert.match(rag, /queries\? running\|concurren/, 'must match the provider wording');
  assert.match(rag, /busyDelays/, 'must back off and retry');
});

test('prose-only work does not consume a RAG query slot', async () => {
  const rag = await readFile(new URL('server/rag.ts', root), 'utf8');
  const compose = rag.slice(rag.indexOf('export async function ragCompose'));
  const body = compose.slice(0, compose.indexOf('export async function ragPlan'));
  // ragCompose used to POST /query with top_k:1, burning one of two slots.
  assert.ok(!/call<RagRefineResult>\('\/query'/.test(body), 'compose must not call /query');
  assert.match(body, /callWriterJson\(/, 'compose must use the writer model directly');
});
