import test from 'node:test';
import assert from 'node:assert/strict';

process.env.NODE_ENV = 'test';
process.env.RAG_API_URL = 'https://rag.test';
process.env.RAG_API_KEY = 'test-key';
const { ragQuery } = await import('./rag.ts');

test('rag query retries one transient gateway failure', async () => {
  const originalFetch = globalThis.fetch;
  let attempts = 0;
  globalThis.fetch = async () => {
    attempts += 1;
    if (attempts === 1) return new Response('Bad Gateway', { status: 502 });
    return new Response(JSON.stringify({ success: true, data: { answer: 'Grounded answer', grounded: true, sources: [] } }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  };
  try {
    const result = await ragQuery('ws-test', 'test query');
    assert.equal(attempts, 2);
    assert.equal(result.answer, 'Grounded answer');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('rag query condenses Cloudflare gateway pages after its retry', async () => {
  const originalFetch = globalThis.fetch;
  let attempts = 0;
  globalThis.fetch = async () => {
    attempts += 1;
    return new Response('<title>aiones.app | 502: Bad gateway</title><h1>Error code 502</h1>', { status: 502 });
  };
  try {
    await assert.rejects(() => ragQuery('ws-test', 'test query'), /tidak dapat dihubungi/i);
    assert.equal(attempts, 5);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('rag query surfaces provider policy refusals without retrying', async () => {
  const originalFetch = globalThis.fetch;
  let attempts = 0;
  globalThis.fetch = async () => {
    attempts += 1;
    return new Response('Invalid prompt: your prompt was flagged as potentially violating our usage policy.', { status: 502 });
  };
  try {
    await assert.rejects(() => ragQuery('ws-test', 'test query'), /flagged as potentially violating/);
    assert.equal(attempts, 1);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('rag query does not retry client errors', async () => {
  const originalFetch = globalThis.fetch;
  let attempts = 0;
  globalThis.fetch = async () => {
    attempts += 1;
    return new Response(JSON.stringify({ detail: 'invalid request' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  };
  try {
    await assert.rejects(() => ragQuery('ws-test', 'test query'), /invalid request/);
    assert.equal(attempts, 1);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
