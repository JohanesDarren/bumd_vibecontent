import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateVisual } from './visual.ts';

const input = { workspaceId: 'test', prompt: 'Editorial photo of a lake at sunrise', aspectRatio: '1:1' as const };
const originalFetch = globalThis.fetch;
const keys = ['CLOUDFLARE_ACCOUNT_ID', 'CLOUDFLARE_API_TOKEN', 'CLOUDFLARE_ACCOUNT_ID_2', 'CLOUDFLARE_API_TOKEN_2'] as const;
const clearKeys = () => keys.forEach(key => delete process.env[key]);
const jpeg = Buffer.from([255, 216, 255, 224, 0, 2, 255, 217]).toString('base64');
const llmReply = 'Editorial product photography of a quiet lake at dawn, soft blue and rose light, wide balanced composition, no text.';
const llm = () => ({ success: true, result: { response: llmReply } });
const image = () => ({ success: true, result: { image: jpeg } });
const quota = () => ({ success: false, errors: [{ message: 'daily quota exceeded' }] });
const response = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

function setAccounts(count: 0 | 1 | 2) {
  clearKeys();
  if (count > 0) {
    process.env.CLOUDFLARE_ACCOUNT_ID = 'first-account';
    process.env.CLOUDFLARE_API_TOKEN = 'first-secret';
  }
  if (count > 1) {
    process.env.CLOUDFLARE_ACCOUNT_ID_2 = 'second-account';
    process.env.CLOUDFLARE_API_TOKEN_2 = 'second-secret';
  }
}

test('missing credentials fails explicitly; input is validated before provider calls', async () => {
  setAccounts(0);
  await assert.rejects(generateVisual(input), { status: 503, code: 'CLOUDFLARE_NOT_CONFIGURED' });
  setAccounts(1);
  await assert.rejects(generateVisual({ ...input, prompt: 'x'.repeat(4001) }), { status: 400, code: 'INVALID_INPUT' });
});

test('LLM plans prompt then Schnell generates a validated JPEG; copy text is kept out of generated prompt', async () => {
  setAccounts(1);
  const calls: { model: string; body: any; auth: string | null }[] = [];
  globalThis.fetch = async (url, options) => {
    calls.push({ model: String(url).split('/ai/run/')[1], body: JSON.parse(String(options?.body)), auth: new Headers(options?.headers).get('authorization') });
    return response(calls.at(-1)?.model === '@cf/meta/llama-3.2-3b-instruct' ? llm() : image());
  };
  try {
    const result = await generateVisual({ ...input, headline: 'Air bersih untuk semua' });
    assert.equal(calls.length, 2);
    assert.deepEqual(calls.map(call => call.model), ['@cf/meta/llama-3.2-3b-instruct', '@cf/black-forest-labs/flux-1-schnell']);
    assert.deepEqual(calls.map(call => call.auth), ['Bearer first-secret', 'Bearer first-secret']);
    assert.match(calls[0].body.messages[1].content, /Editorial photo of a lake/);
    assert.doesNotMatch(calls[0].body.messages[1].content, /Air bersih untuk semua/);
    assert.match(calls[1].body.prompt, /Air bersih untuk semua/);
    assert.equal(result.imageUrl, `data:image/jpeg;base64,${jpeg}`);
    assert.equal(result.llmModel, '@cf/meta/llama-3.2-3b-instruct');
    assert.equal(result.model, '@cf/black-forest-labs/flux-1-schnell');
    assert.equal(result.fallback, false);
  } finally {
    globalThis.fetch = originalFetch;
    clearKeys();
  }
});

test('LLM exhaustion on first account moves to second; image generation stays on second account', async () => {
  setAccounts(2);
  const calls: string[] = [];
  globalThis.fetch = async (url, options) => {
    const model = String(url).split('/ai/run/')[1];
    const auth = new Headers(options?.headers).get('authorization');
    calls.push(`${auth}:${model}`);
    if (auth === 'Bearer first-secret') return response(quota(), 429);
    return response(model === '@cf/meta/llama-3.2-3b-instruct' ? llm() : image());
  };
  try {
    const result = await generateVisual(input);
    assert.equal(calls.length, 3);
    assert.match(calls[0], /first-secret:@cf\/meta\/llama-3\.2-3b-instruct$/);
    assert.match(calls[1], /second-secret:@cf\/meta\/llama-3\.2-3b-instruct$/);
    assert.match(calls[2], /second-secret:@cf\/black-forest-labs\/flux-1-schnell$/);
    assert.equal(result.fallback, true);
  } finally {
    globalThis.fetch = originalFetch;
    clearKeys();
  }
});

test('image quota on LLM account rotates image generation to the second account', async () => {
  setAccounts(2);
  const calls: string[] = [];
  globalThis.fetch = async (url, options) => {
    const model = String(url).split('/ai/run/')[1];
    const auth = new Headers(options?.headers).get('authorization') || '';
    calls.push(`${auth}:${model}`);
    if (model === '@cf/meta/llama-3.2-3b-instruct') return response(llm());
    if (auth === 'Bearer first-secret') return response(quota(), 429);
    return response(image());
  };
  try {
    const result = await generateVisual(input);
    assert.equal(calls.length, 3);
    assert.equal(result.fallback, true);
    assert.match(calls[2], /second-secret:@cf\/black-forest-labs\/flux-1-schnell$/);
  } finally {
    globalThis.fetch = originalFetch;
    clearKeys();
  }
});

test('both LLM accounts exhausted stops before image calls', async () => {
  setAccounts(2);
  let calls = 0;
  globalThis.fetch = async () => { calls++; return response(quota(), 429); };
  try {
    await assert.rejects(generateVisual(input), { status: 429, code: 'CLOUDFLARE_QUOTA_EXCEEDED' });
    assert.equal(calls, 2);
  } finally {
    globalThis.fetch = originalFetch;
    clearKeys();
  }
});

test('malformed model output and auth failure are rejected safely', async () => {
  setAccounts(1);
  globalThis.fetch = async (_url, options) => {
    const body = JSON.parse(String(options?.body));
    return response(body.messages ? { success: true, result: { response: '' } } : { success: true, result: { image: 'not an image' } });
  };
  try {
    await assert.rejects(generateVisual(input), { status: 502, code: 'INVALID_CLOUDFLARE_LLM_RESPONSE' });
    globalThis.fetch = async () => response({ success: false, errors: [{ message: 'unauthorized mock-secret' }] }, 401);
    await assert.rejects(generateVisual(input), { status: 502, code: 'CLOUDFLARE_AUTH_ERROR' });
  } finally {
    globalThis.fetch = originalFetch;
    clearKeys();
  }
});

clearKeys();
