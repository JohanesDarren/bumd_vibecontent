import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('../../', import.meta.url);

test('the brief rail cannot squeeze the content column', async () => {
  const css = await readFile(new URL('src/index.css', root), 'utf8');
  // The rail is a fixed 264px column and the viewport keeps a usable minimum.
  assert.match(css, /\.brief-rail\s*\{[^}]*flex:\s*0 0 264px/s);
  assert.match(css, /\.content-viewport\s*\{[^}]*min-width:\s*320px/s);
  // Stacking on small screens must be driven by a real class, not :has().
  assert.ok(!/:has\(/.test(css), 'avoid :has() so older browsers cannot collapse the layout');
  assert.match(css, /@media \(max-width: 900px\)[\s\S]*?\.main-layout\.has-brief-rail\s*\{\s*flex-direction:\s*column/);
});

test('the app marks the layout when the rail is mounted', async () => {
  const app = await readFile(new URL('src/App.tsx', root), 'utf8');
  assert.match(app, /has-brief-rail/);
});
