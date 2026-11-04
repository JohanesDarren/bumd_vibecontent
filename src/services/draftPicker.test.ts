import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (p: string) => readFile(new URL(p, import.meta.url), 'utf8');

/* One chooser for every screen that picks a draft. */

test('the editor uses the shared picker, not a raw select', async () => {
  const app = await read('../App.tsx');
  const block = app.slice(app.indexOf('Brief Hasil Generasi') - 400, app.indexOf('Brief Hasil Generasi') + 400);
  assert.match(block, /DraftPicker/, 'the editor must use DraftPicker');
  assert.doesNotMatch(block, /<select/, 'a raw select must not come back');
});

test('the visual studio uses the shared picker in both places', async () => {
  const view = await read('../components/VisualStudioView.tsx');
  assert.ok(view.includes('DraftPicker'), 'DraftPicker must be imported and used');
  const uses = [...view.matchAll(/<DraftPicker/g)].length;
  assert.ok(uses >= 2, `expected the empty state and the inline picker, found ${uses}`);
});

test('archived drafts are hidden by default and duplicates collapse', async () => {
  const src = await read('../components/ui/DraftPicker.tsx');
  assert.match(src, /excludeArchived/, 'archived drafts must be excludable');
  assert.match(src, /seen\.has\(key\)/, 'duplicate titles must collapse');
  assert.match(src, /title\.trim\(\)\.toLowerCase\(\)/, 'dedupe must normalise the title');
});

test('the picker reports status and version, and is keyboard accessible', async () => {
  const src = await read('../components/ui/DraftPicker.tsx');
  assert.match(src, /aria-haspopup="listbox"/);
  assert.match(src, /role="listbox"/);
  assert.match(src, /role="option"/);
  assert.match(src, /aria-selected/);
  assert.match(src, /Escape/, 'Escape must close the menu');
  assert.match(src, /draft-picker-check/, 'the selected row needs a visible marker');
});

test('long titles truncate instead of breaking the layout', async () => {
  const css = await read('../styles/form-controls.css');
  const block = css.slice(css.indexOf('.draft-picker-option-title'), css.indexOf('.draft-picker-option-title') + 300);
  assert.match(block, /text-overflow:\s*ellipsis/);
  assert.match(block, /white-space:\s*nowrap/);
});

test('the menu floats above content instead of pushing it', async () => {
  const css = await read('../styles/form-controls.css');
  const block = css.slice(css.indexOf('.draft-picker-menu'), css.indexOf('.draft-picker-menu') + 260);
  assert.match(block, /position:\s*absolute/);
  assert.match(block, /z-index/);
});
