import test from 'node:test';
import assert from 'node:assert/strict';
import { markSourcesIndexed } from './ragSources.ts';

test('a metadata update failure does not reject a grounded RAG answer', async () => {
  let reported: unknown;
  const ok = await markSourcesIndexed(
    [{ document_id: 'doc-1' }, { document_id: 'doc-2' }],
    async () => { throw new Error('database unavailable'); },
    error => { reported = error; }
  );
  assert.equal(ok, false);
  assert.match(String(reported), /database unavailable/);
});

test('only valid string document IDs are written', async () => {
  let received: string[] = [];
  await markSourcesIndexed(
    [{ document_id: 'doc-1' }, { document_id: 42 }, {}, { document_id: '' }],
    async ids => { received = ids; }
  );
  assert.deepEqual(received, ['doc-1']);
});

test('no database write is attempted when there are no citations', async () => {
  let called = false;
  const ok = await markSourcesIndexed([], async () => { called = true; });
  assert.equal(ok, true);
  assert.equal(called, false);
});
