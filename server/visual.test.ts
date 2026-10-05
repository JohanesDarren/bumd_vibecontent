import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateVisual } from './visual.ts';

const input = { workspaceId: 'test', prompt: 'A lake at sunrise', aspectRatio: '9:16' as const, headline: 'Exact copy' };
const env = () => { process.env.CLOUDFLARE_ACCOUNT_ID = 'mock-account'; process.env.CLOUDFLARE_API_TOKEN = 'mock-secret'; };

test('missing Cloudflare credentials fails explicitly', async () => {
  delete process.env.CLOUDFLARE_ACCOUNT_ID; delete process.env.CLOUDFLARE_API_TOKEN;
  await assert.rejects(generateVisual(input), { status: 503, code: 'CLOUDFLARE_NOT_CONFIGURED' });
});

test('calls Cloudflare LLM before FLUX; image prompt excludes exact copy', async () => {
  env(); const original = globalThis.fetch; const calls: string[] = [];
  globalThis.fetch = async (url, options) => {
    const endpoint = String(url); calls.push(endpoint);
    assert.equal(new Headers(options?.headers).get('authorization'), 'Bearer mock-secret');
    if (endpoint.endsWith('/@cf/meta/llama-3.1-8b-instruct')) {
      const body = JSON.parse(String(options?.body));
      assert.equal(body.max_tokens, 400);
      assert.equal(body.temperature, 0.2);
      assert.match(body.messages[1].content, /A lake at sunrise/);
      return Response.json({ result: { choices: [{ message: { content: 'Detailed hand-painted scene, warm daylight, layered paper texture, quiet space below.' } }] } });
    }
    assert.ok(endpoint.endsWith('/@cf/black-forest-labs/flux-1-schnell'));
    const body = JSON.parse(String(options?.body));
    assert.match(body.prompt, /Authoritative scene brief/);
    assert.match(body.prompt, /A lake at sunrise/);
    assert.match(body.prompt, /Requested composition: 9:16/);
    assert.match(body.prompt, /Detailed hand-painted scene/);
    assert.doesNotMatch(body.prompt, /Exact copy/);
    assert.match(body.prompt, /no text/i);
    assert.deepEqual(Object.keys(body).sort(), ['prompt', 'steps']);
    assert.equal(body.steps, 8);
    const jpeg = Buffer.from([255,216,255,224,0,2,255,217]).toString('base64');
    return Response.json({ success: true, result: { image: jpeg } });
  };
  try {
    const result = await generateVisual(input);
    assert.equal(calls.length, 2);
    assert.equal(result.llmModel, '@cf/meta/llama-3.1-8b-instruct');
    assert.equal(result.model, '@cf/black-forest-labs/flux-1-schnell');
    assert.equal(result.steps, 8);
    assert.equal(result.prompt, input.prompt);
    assert.equal(result.dimensions, '1024x1024');
    assert.match(result.imagePrompt, /A lake at sunrise/);
    assert.equal(result.fallback, false);
    assert.ok(result.imageUrl.startsWith('data:image/jpeg;base64,'));
  } finally { globalThis.fetch = original; delete process.env.CLOUDFLARE_ACCOUNT_ID; delete process.env.CLOUDFLARE_API_TOKEN; }
});

test('LLM quota is reported without calling image model or retrying', async () => {
  env(); const original = globalThis.fetch; let calls = 0;
  globalThis.fetch = async () => { calls++; return new Response('{}', { status: 429 }); };
  try {
    await assert.rejects(generateVisual(input), { status: 429, code: 'CLOUDFLARE_QUOTA_EXCEEDED' });
    assert.equal(calls, 1);
  } finally { globalThis.fetch = original; delete process.env.CLOUDFLARE_ACCOUNT_ID; delete process.env.CLOUDFLARE_API_TOKEN; }
});

 test('oversized creative brief rejected before any provider call', async () => {
  env(); const original = globalThis.fetch; let calls = 0;
  globalThis.fetch = async () => { calls++; return Response.json({}); };
  try {
    await assert.rejects(generateVisual({ ...input, prompt: 'x'.repeat(4001) }), { status: 400, code: 'INVALID_INPUT' });
    assert.equal(calls, 0);
  } finally { globalThis.fetch = original; delete process.env.CLOUDFLARE_ACCOUNT_ID; delete process.env.CLOUDFLARE_API_TOKEN; }
});
