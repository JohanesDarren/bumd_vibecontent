import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (p: string) => readFile(new URL(p, import.meta.url), 'utf8');

/* The visual page asks for one thing: which brief. */

test('the version picker is gone from the visual page', async () => {
  const view = await read('../components/VisualStudioView.tsx');
  assert.doesNotMatch(view, /Versi konten yang divisualisasikan/);
  assert.doesNotMatch(view, /selectedVersionNumber/);
});

test('the chosen-content field is gone from the visual page', async () => {
  const view = await read('../components/VisualStudioView.tsx');
  assert.doesNotMatch(view, /Konten versi terpilih/);
  assert.doesNotMatch(view, /readOnly/, 'the read-only copy box must not come back');
});

test('the visual page still reads the latest version for its prompt', async () => {
  const view = await read('../components/VisualStudioView.tsx');
  assert.match(view, /draft\?\.currentVersion/, 'the newest version must still drive the prompt');
  assert.match(view, /selectedVersion\?\.content/, 'the copy is still used to seed the visual');
});

test('only the brief remains as a choice', async () => {
  const view = await read('../components/VisualStudioView.tsx');
  const block = view.slice(view.indexOf('Brief yang akan divisualkan') - 400, view.indexOf('Brief yang akan divisualkan') + 300);
  assert.match(block, /DraftPicker/);
  assert.doesNotMatch(block, /<select/, 'no other selector belongs in this card');
  assert.doesNotMatch(block, /<textarea/, 'no copy box belongs in this card');
});
