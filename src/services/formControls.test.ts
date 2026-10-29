import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';

const html = (el: React.ReactElement) => renderToStaticMarkup(el);

/**
 * The components are .tsx, and `npm test` runs Node with --experimental-strip-types,
 * which strips types but cannot parse JSX. Load them through Vite so the same
 * source is transformed exactly as the app sees it.
 */
async function loadUi() {
  const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
  try {
    const mod = await vite.ssrLoadModule('/src/components/ui/FormControls.tsx');
    return mod as {
      Checkbox: React.ComponentType<any>;
      Switch: React.ComponentType<any>;
      Segmented: React.ComponentType<any>;
      Field: React.ComponentType<any>;
      ChipGroup: React.ComponentType<any>;
    };
  } finally {
    await vite.close();
  }
}

// Loaded once for the whole file; every test below shares the same components.
const { Checkbox, Switch, Segmented, Field, ChipGroup } = await loadUi();

/* ── Checkbox ─────────────────────────────────────────────────────────────── */

test('checkbox renders a real focusable input, not a styled div', () => {
  // Accessibility: a div with a click handler loses keyboard support and
  // screen-reader semantics, so the control must stay an <input type=checkbox>.
  const out = html(React.createElement(Checkbox, { checked: false, onChange: () => {}, label: 'Setuju' }));
  assert.match(out, /type="checkbox"/);
  assert.match(out, /Setuju/);
});

test('checkbox reflects the checked state in markup', () => {
  const on = html(React.createElement(Checkbox, { checked: true, onChange: () => {}, label: 'A' }));
  const off = html(React.createElement(Checkbox, { checked: false, onChange: () => {}, label: 'A' }));
  assert.match(on, /checked=""/);
  assert.doesNotMatch(off, /checked=""/);
  // The visible box is decorated by a class, so the state is not colour-only.
  assert.match(on, /is-checked/);
});

test('checkbox renders hint text and honours disabled', () => {
  const out = html(
    React.createElement(Checkbox, {
      checked: false,
      onChange: () => {},
      label: 'Konten komersial',
      hint: 'Produk sedang dipromosikan.',
      disabled: true
    })
  );
  assert.match(out, /Produk sedang dipromosikan\./);
  assert.match(out, /disabled=""/);
  assert.match(out, /is-disabled/);
});

test('checkbox binds its label to the input via htmlFor', () => {
  const out = html(React.createElement(Checkbox, { checked: false, onChange: () => {}, label: 'X' }));
  const forId = /for="([^"]+)"/.exec(out)?.[1];
  assert.ok(forId, 'label must carry a for attribute');
  assert.match(out, new RegExp(`id="${forId}"`), 'input id must match the label');
});

/* ── Switch ───────────────────────────────────────────────────────────────── */

test('switch is a checkbox underneath so space toggles it', () => {
  const out = html(React.createElement(Switch, { checked: true, onChange: () => {}, label: 'Tema' }));
  assert.match(out, /type="checkbox"/);
  assert.match(out, /is-on/);
  assert.match(out, /ui-switch-track/);
  assert.match(out, /ui-switch-thumb/);
});

test('switch exposes its off state', () => {
  const out = html(React.createElement(Switch, { checked: false, onChange: () => {}, label: 'Tema' }));
  assert.doesNotMatch(out, /is-on/);
});

/* ── Segmented ────────────────────────────────────────────────────────────── */

test('segmented control uses radio inputs inside a radiogroup', () => {
  const out = html(
    React.createElement(Segmented, {
      value: 'social',
      onChange: () => {},
      ariaLabel: 'Jenis publikasi',
      options: [
        { value: 'social', label: 'Social media post' },
        { value: 'poster', label: 'Poster / banner' }
      ]
    })
  );
  assert.match(out, /role="radiogroup"/);
  assert.match(out, /aria-label="Jenis publikasi"/);
  assert.equal((out.match(/type="radio"/g) || []).length, 2);
  // Exactly one option may be marked checked.
  assert.equal((out.match(/checked=""/g) || []).length, 1);
});

test('segmented marks the active option and renders notes', () => {
  const out = html(
    React.createElement(Segmented, {
      value: 'poster',
      onChange: () => {},
      options: [
        { value: 'social', label: 'Social', note: 'Teks minimal' },
        { value: 'poster', label: 'Poster', note: 'Persuasif' }
      ]
    })
  );
  assert.match(out, /is-active/);
  assert.match(out, /Teks minimal/);
  assert.match(out, /Persuasif/);
});

test('segmented groups its radios under one name', () => {
  const out = html(
    React.createElement(Segmented, {
      value: 'a',
      onChange: () => {},
      options: [{ value: 'a', label: 'A' }, { value: 'b', label: 'B' }]
    })
  );
  const names = [...out.matchAll(/name="([^"]+)"/g)].map(m => m[1]);
  assert.equal(names.length, 2);
  assert.equal(new Set(names).size, 1, 'radios must share a name to form one group');
});

test('segmented honours per-option disabled', () => {
  const out = html(
    React.createElement(Segmented, {
      value: 'a',
      onChange: () => {},
      options: [{ value: 'a', label: 'A' }, { value: 'b', label: 'B', disabled: true }]
    })
  );
  assert.match(out, /is-disabled/);
  assert.match(out, /disabled=""/);
});

/* ── Field ────────────────────────────────────────────────────────────────── */

test('field shows an error in an alert region', () => {
  const out = html(
    React.createElement(Field, {
      label: 'Email',
      error: 'Wajib diisi.',
      children: React.createElement('input', { className: 'form-input' })
    })
  );
  assert.match(out, /role="alert"/);
  assert.match(out, /Wajib diisi\./);
  assert.match(out, /has-error/);
});

test('field shows a hint when there is no error', () => {
  const out = html(
    React.createElement(Field, {
      label: 'Nama',
      hint: 'Maksimal 60 karakter.',
      children: React.createElement('input', {})
    })
  );
  assert.match(out, /Maksimal 60 karakter\./);
  assert.doesNotMatch(out, /role="alert"/);
});

test('field marks required fields and exposes the aside slot', () => {
  const out = html(
    React.createElement(Field, {
      label: 'Kategori',
      required: true,
      aside: '12/60',
      children: React.createElement('input', {})
    })
  );
  assert.match(out, /ui-field-req/);
  assert.match(out, /12\/60/);
});

/* ── Stylesheet ───────────────────────────────────────────────────────────── */

test('the stylesheet styles every primitive and keeps reduced motion in check', async () => {
  const { readFile } = await import('node:fs/promises');
  const css = await readFile(new URL('../styles/form-controls.css', import.meta.url), 'utf8');
  for (const cls of ['.ui-check-box', '.ui-switch-track', '.ui-seg-item', '.ui-swatch', '.ui-actions']) {
    assert.ok(css.includes(cls), `${cls} must be styled`);
  }
  // The select loses its native arrow, so a replacement must exist.
  assert.ok(css.includes('background-image'), 'select needs a custom chevron');
  assert.ok(css.includes(':focus-visible'), 'keyboard focus must be visible');
  assert.ok(css.includes('prefers-reduced-motion'), 'reduced motion must be honoured');
});

test('the stylesheet is imported after the legacy base rules', async () => {
  // The legacy index.css defines .form-input too; if it loads later it wins.
  const { readFile } = await import('node:fs/promises');
  const index = await readFile(new URL('../index.css', import.meta.url), 'utf8');
  const at = index.indexOf('./styles/form-controls.css');
  assert.ok(at > 0, 'form-controls.css must be imported');
  const legacy = index.indexOf('.form-input, .form-select, .form-textarea {');
  assert.ok(at > legacy, 'the new sheet must be imported after the legacy rules');
});

test('chip group is a set of real checkboxes, one per option', () => {
  const out = html(
    React.createElement(ChipGroup, {
      values: ['instagram'],
      onChange: () => {},
      ariaLabel: 'Platform publikasi',
      options: [
        { value: 'instagram', label: 'Instagram' },
        { value: 'facebook', label: 'Facebook' },
        { value: 'tiktok', label: 'TikTok' }
      ]
    })
  );
  assert.equal((out.match(/type="checkbox"/g) || []).length, 3);
  assert.match(out, /role="group"/);
  assert.match(out, /aria-label="Platform publikasi"/);
  // Only the values passed in are marked on.
  assert.equal((out.match(/is-on/g) || []).length, 1);
  assert.equal((out.match(/checked=""/g) || []).length, 1);
});

test('chip group tolerates an empty selection', () => {
  const out = html(
    React.createElement(ChipGroup, { values: [], onChange: () => {}, options: [{ value: 'a', label: 'A' }] })
  );
  assert.doesNotMatch(out, /is-on/);
  assert.doesNotMatch(out, /checked=""/);
});

test('the stylesheet covers the chips and selectable rows', async () => {
  const { readFile } = await import('node:fs/promises');
  const css = await readFile(new URL('../styles/form-controls.css', import.meta.url), 'utf8');
  for (const cls of ['.ui-chip', '.ui-chips', '.ui-slot-row', '.scheduling-filter-select']) {
    assert.ok(css.includes(cls), `${cls} must be styled`);
  }
});
