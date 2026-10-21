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

test('provider busy responses are retried before failing', async () => {
  let calls = 0;
  const fetcher: typeof fetch = async () => {
    calls++;
    if (calls < 2) return new Response(JSON.stringify({ error: { message: 'busy' } }), { status: 429 });
    return new Response(JSON.stringify({ choices: [{ message: { content: 'ok' } }] }), { status: 200 });
  };
  assert.equal(await describeImage('foto.png', png, cfg, fetcher), 'ok');
  assert.equal(calls, 2);
});

test('missing credentials fail with an actionable message', async () => {
  await assert.rejects(
    describeImage('foto.png', png, { ...cfg, apiKey: '' }),
    /belum dikonfigurasi/
  );
});

test('default config points at the 9router gateway', () => {
  const config = visionConfig();
  assert.match(config.baseUrl, /^https:\/\//);
  assert.ok(config.model.length > 0);
});
