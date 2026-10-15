import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('KB upload exposes keyboard-accessible file picker and workspace selection cards', async () => {
  const [view, css] = await Promise.all([
    readFile(new URL('../components/KnowledgeBaseView.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../index.css', import.meta.url), 'utf8')
  ]);
  assert.match(view, /htmlFor="kms-file"/);
  assert.match(view, /id="kms-file"/);
  assert.match(view, /className="kms-file-input"/);
  assert.match(view, /className="kms-workspace-option"/);
  assert.match(css, /\.kms-file-input:focus-visible\s*\+/);
  assert.match(css, /\.kms-workspace-option:has\(input:checked\)/);
});
