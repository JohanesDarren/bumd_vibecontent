import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { createServer } from 'vite';

test('unauthenticated first render is login, independent of workspace bootstrap', async () => {
  const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
  try {
    const { App } = await vite.ssrLoadModule('/src/App.tsx');
    const html = renderToString(React.createElement(App));
    // The login page is a design surface: assert the behaviour (a working email
    // and password form with a submit action), not one specific headline.
    assert.match(html, /type="email"/);
    assert.match(html, /type="password"/);
    assert.match(html, /Selamat datang/i);
    assert.match(html, /Masuk/);
    assert.doesNotMatch(html, /Siapkan Workspace|Memuat PostgreSQL|Buat workspace baru/);
  } finally { await vite.close(); }
});
