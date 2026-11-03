import test from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';

/**
 * Guard against character loss in text fields (QA finding S5).
 *
 * The report could not name which characters disappeared, so these rules cover
 * every component: nothing in the app may read a field in a way that normalises,
 * trims or truncates what the user typed.
 */

const components = new URL('../components/', import.meta.url);

async function eachComponent(fn: (file: string, src: string) => void) {
  for (const file of await readdir(components)) {
    if (!file.endsWith('.tsx')) continue;
    fn(file, await readFile(new URL(file, components), 'utf8'));
  }
}

test('no editable field reads innerText or textContent while typing', async () => {
  await eachComponent((file, src) => {
    // innerText/textContent are layout-aware and drop spaces and newlines.
    const onInput = src.match(/onInput=\{[\s\S]{0,320}?\}/g) || [];
    for (const raw of onInput) {
      // Strip comments so a comment that names the old API is not a failure.
      const block = raw.replace(/\/\/[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '');
      assert.doesNotMatch(block, /\.innerText|\.textContent/,
        `${file}: onInput must not read innerText/textContent (use a DOM walker)`);
    }
  });
});

test('no onChange handler trims or rewrites the typed value', async () => {
  await eachComponent((file, src) => {
    const handlers = src.match(/onChange=\{[^}]{0,200}\}/g) || [];
    for (const h of handlers) {
      assert.doesNotMatch(h, /\.trim\(\)/, `${file}: onChange must not trim (drops spaces mid-typing)`);
      assert.doesNotMatch(h, /\.replace\(/, `${file}: onChange must not rewrite the value`);
      assert.doesNotMatch(h, /\.slice\(|substring\(/, `${file}: onChange must not truncate the value`);
    }
  });
});

test('text inputs are controlled so React cannot desync them', async () => {
  await eachComponent((file, src) => {
    // Slice a generous window after each <input: JSX attributes can contain ">"
    // inside arrow functions, so a tag-boundary regex is unreliable here.
    for (const at of [...src.matchAll(/<input\b/g)].map(m => m.index ?? 0)) {
      const window = src.slice(at, at + 500);
      if (/type="(file|checkbox|radio|range|hidden|color|date|time|number)"/.test(window)) continue;
      const declared = /type="([a-z]+)"/.exec(window)?.[1] ?? 'text';
      if (!['text', 'email', 'password', 'search', 'url', 'tel'].includes(declared)) continue;
      assert.match(window, /\bvalue=/, `${file}: a text input is uncontrolled -> ${window.slice(0, 70).replace(/\s+/g, ' ')}`);
    }
  });
});

test('no key handler blocks printable characters', async () => {
  await eachComponent((file, src) => {
    const handlers = src.match(/onKeyDown=\{[\s\S]{0,260}?\}/g) || [];
    for (const h of handlers) {
      if (!h.includes('preventDefault')) continue;
      // Only navigation keys may be swallowed.
      assert.match(h, /'Enter'|"Enter"|'Escape'|"Escape"|'Tab'|"Tab"|Arrow/,
        `${file}: onKeyDown calls preventDefault without a navigation key`);
    }
  });
});

test('the editor serialises the DOM instead of using innerText', async () => {
  const src = await readFile(new URL('BriefStudioView.tsx', components), 'utf8');
  assert.match(src, /function serializeEditable/, 'a lossless serialiser is required');
  assert.match(src, /setEditorContent\(serializeEditable\(/, 'the editor must use it');
  assert.doesNotMatch(src, /\.innerText\)/);
});
