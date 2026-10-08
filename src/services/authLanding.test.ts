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
    assert.match(html, /Masuk ke VibeContent/);
    assert.match(html, /type="email"/);
    assert.doesNotMatch(html, /Siapkan Workspace|Memuat PostgreSQL|Buat workspace baru/);
  } finally { await vite.close(); }
});
