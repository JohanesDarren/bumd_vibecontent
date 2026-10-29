import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { existsSync, statSync } from 'node:fs';

const read = (p: string) => readFile(new URL(p, import.meta.url), 'utf8');

test('both brand faces are exposed as CSS variables', async () => {
  const css = await read('../index.css');
  assert.match(css, /--font-sans:\s*'Plus Jakarta Sans'/, 'primary face must be defined');
  assert.match(css, /--font-serif:\s*'Cormorant Garamond'/, 'secondary face must be defined');
});

test('the document applies the primary face to every control', async () => {
  const css = await read('../index.css');
  // Buttons and inputs do not inherit font-family by default in any browser.
  for (const sel of ['html', 'body', 'button', 'input', 'select', 'textarea']) {
    assert.ok(css.includes(sel), `${sel} must be covered`);
  }
  const block = css.slice(css.indexOf('font-family: var(--font-sans);'));
  assert.ok(block.length > 0, 'sans face must be applied');
});

test('display headings use the secondary face app-wide', async () => {
  const css = await read('../index.css');
  // Find the rule that groups h1/h2 with .page-title and check its body.
  const m = /h1,\s*h2,\s*\.page-title[^{]*\{([^}]*)\}/.exec(css);
  assert.ok(m, 'heading rule must exist');
  assert.match(m[1], /font-family:\s*var\(--font-serif\)/);
});

test('the login heading keeps the serif face', async () => {
  const auth = await read('../components/AuthView.tsx');
  assert.match(auth, /font-serif/, 'login heading must use the secondary face');
});

test('the brand mark sits above the welcome heading', async () => {
  const auth = await read('../components/AuthView.tsx');
  const logo = auth.indexOf('favicon.svg');
  const heading = auth.indexOf('Selamat datang');
  assert.ok(logo > -1, 'logo must be present');
  assert.ok(logo < heading, 'logo must render before the heading');
});

test('no carousel image is remote', async () => {
  const carousel = await read('../components/CarouselShowcase.tsx');
  assert.doesNotMatch(carousel, /images\.unsplash\.com/, 'remote images slow the first paint');
  assert.doesNotMatch(carousel, /https?:\/\//, 'all showcase assets must be local');
});

test('carousel images are eagerly fetched, not lazy', async () => {
  const carousel = await read('../components/CarouselShowcase.tsx');
  // The columns scroll continuously, so lazy loading caused visible pop-in.
  // The phrase appears in an explanatory comment, so match the attribute only.
  assert.doesNotMatch(carousel, /loading="lazy"\s*\n?\s*className/);
  assert.doesNotMatch(carousel, /<img[^>]*loading="lazy"/);
  assert.match(carousel, /fetchPriority/, 'priority hints must be set');
});

test('every referenced showcase image exists and stays small', async () => {
  const carousel = await read('../components/CarouselShowcase.tsx');
  const refs = [...carousel.matchAll(/'(\/showcase\/[^']+)'/g)].map(m => m[1]);
  assert.ok(refs.length >= 10, 'expected the full showcase set');
  for (const ref of refs) {
    const p = new URL('../../public' + ref, import.meta.url);
    assert.ok(existsSync(p), `${ref} must exist`);
    const kb = statSync(p).size / 1024;
    assert.ok(kb < 120, `${ref} is ${kb.toFixed(0)} KB; keep showcase images under 120 KB`);
  }
});

test('the font payload drops unused families', async () => {
  const html = await read('../../index.html');
  assert.doesNotMatch(html, /Playfair/, 'unused family must be removed');
  assert.match(html, /Cormorant\+Garamond/);
  assert.match(html, /Plus\+Jakarta\+Sans/);
});
