import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const app = new URL('../App.tsx', import.meta.url);

test('the brief form is never hidden behind a missing draft actor', async () => {
  // Regression: the viewport was gated on `draftActor`, so when the resolved actor
  // was null the whole main area rendered blank while the rail stayed visible.
  const src = await readFile(app, 'utf8');
  assert.ok(!/safeTab === 'brief_studio' && draftActor &&/.test(src),
    'brief studio must render even when draftActor is null');
  assert.match(src, /safeTab === 'brief_studio' && \(/);
  assert.match(src, /activeUser=\{draftActor \|\| activeUser/);
});
