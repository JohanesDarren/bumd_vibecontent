import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('../../', import.meta.url);

test('the brief history lives in a sidebar rail, not a picker bar', async () => {
  const app = await readFile(new URL('src/App.tsx', root), 'utf8');
  assert.match(app, /BriefHistoryRail/);
  assert.match(app, /safeTab === 'brief_studio'/);
});

test('the rail lists briefs newest first and supports search', async () => {
  const rail = await readFile(new URL('src/components/BriefHistoryRail.tsx', root), 'utf8');
  assert.match(rail, /sort\(\(a, b\) => \(b\.updatedAt \|\| b\.createdAt\)/);
  assert.match(rail, /placeholder="Cari brief/);
  assert.match(rail, /onOpenDraft/);
});

test('draft status labels are gone from the content surfaces', async () => {
  // There is no approval flow, so a "Draf" pill adds noise without meaning.
  const files = [
    'src/components/DashboardView.tsx',
    'src/components/LibraryView.tsx',
    'src/components/EditorWorkspaceView.tsx',
    'src/components/BriefStudioView.tsx'
  ];
  for (const rel of files) {
    const src = await readFile(new URL(rel, root), 'utf8');
    assert.ok(!/>Draf</.test(src), `${rel} must not render a Draf pill`);
    assert.ok(!/STATUS: <strong>DRAF/.test(src), `${rel} must not render the draft banner`);
  }
});
