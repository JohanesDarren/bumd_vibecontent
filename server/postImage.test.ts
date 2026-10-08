// Network-free tests: fetch is mocked.
import test from 'node:test';
import assert from 'node:assert/strict';
import { assertPostUrl, extractOgImage, fetchPostImage, youtubeVideoId } from './postImage.ts';

const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xd9]);
const page = (html: string, status = 200, headers: Record<string, string> = {}) => new Response(html, { status, headers: { 'content-type': 'text/html', ...headers } });
const image = (type = 'image/jpeg') => new Response(jpeg, { status: 200, headers: { 'content-type': type } });

test('post URLs are pinned to the platform hosts', () => {
  assert.equal(assertPostUrl('https://www.instagram.com/p/abc/', 'instagram').hostname, 'www.instagram.com');
  assert.throws(() => assertPostUrl('http://www.instagram.com/p/abc/', 'instagram'), /https/);
  assert.throws(() => assertPostUrl('https://instagram.com.evil.test/p/abc', 'instagram'), /bukan alamat/);
  assert.throws(() => assertPostUrl('https://www.instagram.com/p/abc/', 'linkedin'), /bukan alamat/);
  assert.throws(() => assertPostUrl('https://user:pw@www.instagram.com/p/abc/', 'instagram'), /tidak valid/);
});

test('og:image is read regardless of attribute order, entities decoded', () => {
  assert.equal(extractOgImage('<meta content="https://scontent.cdninstagram.com/a.jpg?x=1&amp;y=2" property="og:image">'), 'https://scontent.cdninstagram.com/a.jpg?x=1&y=2');
  assert.equal(extractOgImage('<meta name="twitter:image" content="https://pbs.twimg.com/b.jpg" />'), 'https://pbs.twimg.com/b.jpg');
  assert.equal(extractOgImage('<meta property="og:title" content="x">'), null);
});

test('YouTube thumbnails come from the video id without fetching the page', async () => {
  assert.equal(youtubeVideoId(new URL('https://youtu.be/dQw4w9WgXcQ')), 'dQw4w9WgXcQ');
  assert.equal(youtubeVideoId(new URL('https://www.youtube.com/shorts/dQw4w9WgXcQ')), 'dQw4w9WgXcQ');
  const calls: string[] = [];
  const data = await fetchPostImage('https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'youtube', (async (url: URL) => { calls.push(String(url)); return image(); }) as typeof fetch);
  assert.deepEqual(calls, ['https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg']);
  assert.match(data, /^data:image\/jpeg;base64,/);
});

test('page and image fetches refuse to leave the allowed hosts', async () => {
  const offsite = (async (url: URL) => String(url).includes('instagram.com/p/')
    ? page('<meta property="og:image" content="https://169.254.169.254/latest/meta-data">')
    : image()) as typeof fetch;
  await assert.rejects(fetchPostImage('https://www.instagram.com/p/abc/', 'instagram', offsite), /di luar platform/);

  const redirect = (async () => page('', 302, { location: 'https://evil.test/' })) as typeof fetch;
  await assert.rejects(fetchPostImage('https://www.instagram.com/p/abc/', 'instagram', redirect), /di luar platform/);

  const loginWall = (async () => page('<html><title>Login</title></html>')) as typeof fetch;
  await assert.rejects(fetchPostImage('https://www.instagram.com/p/abc/', 'instagram', loginWall), /meminta login/);

  const notImage = (async (url: URL) => String(url).includes('/p/')
    ? page('<meta property="og:image" content="https://scontent.cdninstagram.com/a.jpg">')
    : image('text/html')) as typeof fetch;
  await assert.rejects(fetchPostImage('https://www.instagram.com/p/abc/', 'instagram', notImage), /bukan gambar/);

  const ok = (async (url: URL) => String(url).includes('/p/')
    ? page('<meta property="og:image" content="https://scontent.cdninstagram.com/a.jpg">')
    : image()) as typeof fetch;
  assert.match(await fetchPostImage('https://www.instagram.com/p/abc/', 'instagram', ok), /^data:image\/jpeg;base64,/);
});

test('uploaded images are checked by their bytes', async () => {
  const { validateImageDataUrl } = await import('./postImage.ts');
  const jpegUrl = `data:image/jpeg;base64,${Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00]).toString('base64')}`;
  assert.equal(validateImageDataUrl(jpegUrl), jpegUrl);
  const html = `data:image/png;base64,${Buffer.from('<script>alert(1)</script>').toString('base64')}`;
  assert.throws(() => validateImageDataUrl(html), /tidak sesuai/);
  assert.throws(() => validateImageDataUrl('data:image/svg+xml;base64,PHN2Zz4='), /JPEG, PNG, atau WebP/);
  assert.throws(() => validateImageDataUrl(jpegUrl, 2), /maksimal/);
});
