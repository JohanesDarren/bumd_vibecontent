import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('KB upload keeps a visible native file input and workspace toggle buttons', async () => {
  const [view, css] = await Promise.all([
    readFile(new URL('../components/KnowledgeBaseView.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../index.css', import.meta.url), 'utf8')
  ]);
  assert.match(view, /id="kms-file"/);
  assert.match(view, /className="kms-file-input"/);
  assert.match(view, /type="button" className="kms-workspace-option"/);
  assert.match(view, /aria-pressed=\{workspaceIds\.includes\(workspace\.id\)\}/);
  assert.match(css, /\.kms-file-input::file-selector-button/);
  assert.doesNotMatch(css, /\.kms-file-input\s*\{[^}]*width:\s*1px/);
});
