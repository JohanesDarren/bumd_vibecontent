import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { canAccessTab } from './policies.ts';

const read = (p: string) => readFile(new URL(p, import.meta.url), 'utf8');

/* The approval buttons live in Pustaka. If corporate cannot open Pustaka, the
   workflow is unreachable and the feature is dead code. */

test('corporate can reach the library where approvals happen', () => {
  assert.equal(canAccessTab('corporate', 'library'), true,
    'corporate must be able to open Pustaka to approve drafts');
});

test('creators keep the library and lose nothing', () => {
  assert.equal(canAccessTab('creator', 'library'), true);
  assert.equal(canAccessTab('creator', 'brief_studio'), true);
  assert.equal(canAccessTab('creator', 'visual_studio'), true);
});

test('corporate still cannot reach creator-only authoring screens', () => {
  assert.equal(canAccessTab('corporate', 'brief_studio'), false);
  assert.equal(canAccessTab('corporate', 'editor'), false);
  assert.equal(canAccessTab('corporate', 'visual_studio'), false);
});

test('the sidebar no longer hides the library from corporate', async () => {
  const sidebar = await read('../components/Sidebar.tsx');
  assert.doesNotMatch(sidebar, /userRole !== 'corporate'/, 'the library group must not be gated on corporate');
  assert.match(sidebar, /navButton\('library'/, 'the library destination must exist');
});

test('approvers do not get creator-only actions in the library', async () => {
  const view = await read('../components/LibraryView.tsx');
  // Buka and Ekspor are gated on !canApprove.
  const openBlock = view.slice(view.indexOf('title="Buka di Editor"') - 400, view.indexOf('title="Buka di Editor"'));
  assert.match(openBlock, /!canApprove/, 'the edit action must be creator-only');
  const exportBlock = view.slice(view.indexOf('title="Ekspor Draf"') - 400, view.indexOf('title="Ekspor Draf"'));
  assert.match(exportBlock, /!canApprove/, 'the export action must be creator-only');
});

test('the approver still gets the decision buttons', async () => {
  const view = await read('../components/LibraryView.tsx');
  assert.match(view, /Setujui/);
  assert.match(view, /Minta Revisi/);
  assert.match(view, /canApprove && onDecideDraft/);
});
