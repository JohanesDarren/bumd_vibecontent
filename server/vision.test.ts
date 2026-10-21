import test from 'node:test';
import assert from 'node:assert/strict';
import { describeImage, mimeForImage, visionConfig } from './vision.ts';

const cfg = { baseUrl: 'https://vision.test/v1', apiKey: 'secret', model: 'cbai/deepseek-v4.1-flash' };
const png = Buffer.from('89504e470d0a1a0a0000000d49484452', 'hex');

test('image mime types are recognised, non-images are rejected', () => {
  assert.equal(mimeForImage('foto.PNG'), 'image/png');
  assert.equal(mimeForImage('foto.jpeg'), 'image/jpeg');
  assert.equal(mimeForImage('foto.webp'), 'image/webp');
  assert.equal(mimeForImage('dokumen.pdf'), null);
});

test('vision sends the image as a data URL to the configured model', async () => {
  let seen: any;
  const fetcher: typeof fetch = async (url, init) => {
    seen = { url, body: JSON.parse(String(init?.body)) };
    return new Response(JSON.stringify({ choices: [{ message: { content: 'Gambar berisi logo biru.' } }] }), { status: 200 });
  };
  const text = await describeImage('foto.png', png, cfg, fetcher);
  assert.equal(text, 'Gambar berisi logo biru.');
  assert.equal(seen.url, 'https://vision.test/v1/chat/completions');
  assert.equal(seen.body.model, 'cbai/deepseek-v4.1-flash');
  const parts = seen.body.messages[0].content;
  assert.match(parts[1].image_url.url, /^data:image\/png;base64,/);
});

test('reasoning-only responses are still accepted (no empty description)', async () => {
  const fetcher: typeof fetch = async () => new Response(JSON.stringify({
    choices: [{ message: { content: '', reasoning_content: 'Gambar: persegi merah.' } }]
  }), { status: 200 });
  assert.equal(await describeImage('foto.jpg', png, cfg, fetcher), 'Gambar: persegi merah.');
});

test('provider busy responses surface a clear error instead of retrying', async () => {
  let calls = 0;
  const fetcher: typeof fetch = async () => {
    calls++;
    return new Response(JSON.stringify({ error: { message: 'Model busy. Please switch models or retry later' } }), { status: 429 });
  };
  await assert.rejects(
    describeImage('foto.png', png, cfg, fetcher),
    /menolak permintaan \(HTTP 429\)/
  );
  assert.equal(calls, 1);
});

test('missing credentials fail with an actionable message', async () => {
  await assert.rejects(
    describeImage('foto.png', png, { ...cfg, apiKey: '' }),
    /belum dikonfigurasi/
  );
});

test('default config reads the 9ROUTER env names used by the project', () => {
  const config = visionConfig();
  assert.match(config.baseUrl, /^https:\/\//);
  assert.equal(config.model, process.env['9ROUTER_VISION_MODEL'] || process.env['9ROUTER_LLM_MODEL'] || 'cbai/deepseek-v4.1-flash');
  assert.equal(config.apiKey, process.env['9ROUTER_API_KEY'] || '');
});
