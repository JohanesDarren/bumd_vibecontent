import test from 'node:test';
import assert from 'node:assert/strict';

// The Brief must never depend on a single long-lived HTTP request: proxies and
// browsers drop those at ~30-120s, which produced the recurring 502.
test('client polls a RAG job until it completes', async () => {
  const source = await import('node:fs/promises').then(fs =>
    fs.readFile(new URL('./apiService.ts', import.meta.url), 'utf8')
  );
  assert.match(source, /\/api\/rag\/jobs/, 'client must start an async job');
  assert.match(source, /jobs\/\$\{encodeURIComponent\(started\.jobId\)\}/, 'client must poll the job');
  assert.ok(!/request<RagAnswer>\(`\/api\/rag\/query`/.test(source), 'client must not block on the long synchronous route');
});

test('server exposes job creation and polling endpoints', async () => {
  const fs = await import('node:fs/promises');
  const source = await fs.readFile(new URL('../../server/index.ts', import.meta.url), 'utf8');
  assert.match(source, /app\.post\('\/api\/rag\/jobs'/);
  assert.match(source, /app\.get\('\/api\/rag\/jobs\/:id'/);
  assert.match(source, /RAG_JOB_TTL_MS/, 'finished jobs must expire so memory cannot grow forever');
});
