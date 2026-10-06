import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { canAccessTab, canTransitionDraft, filterUsersForWorkspace } from './policies.ts';

const creator = { role: 'creator' as const, workspaceId: 'ws-a' };
const corporate = { role: 'corporate' as const, workspaceId: 'ws-a' };
const superadmin = { role: 'superadmin' as const, workspaceId: 'ws-a' };

test('roles expose only their permitted menus', () => {
  assert.equal(canAccessTab(creator.role, 'brief_studio'), true);
  assert.equal(canAccessTab(creator.role, 'user_management'), false);
  assert.equal(canAccessTab(corporate.role, 'user_management'), true);
  assert.equal(canAccessTab(corporate.role, 'corporate_management'), true);
  assert.equal(canAccessTab(creator.role, 'corporate_management'), false);
  assert.equal(canAccessTab(corporate.role, 'admin_management'), false);
  assert.equal(canAccessTab(superadmin.role, 'admin_management'), true);
});

test('creator can approve their draft but cannot undo approval', () => {
  assert.equal(canTransitionDraft(creator.role, 'draft', 'disetujui'), true);
  assert.equal(canTransitionDraft(creator.role, 'revisi_diminta', 'disetujui'), true);
  assert.equal(canTransitionDraft(creator.role, 'disetujui', 'draft'), false);
  assert.equal(canTransitionDraft(corporate.role, 'draft', 'menunggu_review'), false);
});

test('workspace member lists are isolated', () => {
  const users = [{ id: '1', ...creator }, { id: '2', ...corporate, workspaceId: 'ws-b' }];
  assert.deepEqual(filterUsersForWorkspace(users, 'ws-a').map(user => user.id), ['1']);
});

test('user interface does not expose knowledge-base management', async () => {
  const [sidebar, dashboard, brief] = await Promise.all([
    readFile(new URL('../components/Sidebar.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../components/DashboardView.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../components/BriefStudioView.tsx', import.meta.url), 'utf8')
  ]);
  assert.doesNotMatch(sidebar, /RAG Knowledge Base|knowledge_base/);
  assert.doesNotMatch(dashboard, /Check RAG Knowledge|RAG Active Documents/);
  assert.doesNotMatch(brief, /RAG Knowledge Base Radar|retrieveKnowledge/);
});

test('generation workflow exposes saved drafts and approved-only visual selection', async () => {
  const [brief, visual] = await Promise.all([
    readFile(new URL('../components/BriefStudioView.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../components/VisualStudioView.tsx', import.meta.url), 'utf8')
  ]);
  assert.match(brief, /drafts\.map/);
  assert.match(brief, /onOpenEditor\(draft\.id\)/);
  assert.match(visual, /approvedDrafts/);
  assert.match(visual, /status === 'disetujui'/);
});

test('only requested role model is declared', async () => {
  const [types, labels] = await Promise.all([
    readFile(new URL('../types/index.ts', import.meta.url), 'utf8'),
    readFile(new URL('./labels.ts', import.meta.url), 'utf8')
  ]);
  assert.match(types, /'creator' \| 'corporate' \| 'superadmin'/);
  assert.doesNotMatch(types, /reviewer/);
  assert.doesNotMatch(labels, /reviewer/i);
  assert.equal(superadmin.role, 'superadmin');
});
