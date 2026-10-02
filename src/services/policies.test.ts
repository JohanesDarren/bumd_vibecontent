import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { canAccessTab, canTransitionDraft, filterUsersForWorkspace } from './policies.ts';

const creator = { role: 'creator' as const, workspaceId: 'ws-a' };
const admin = { role: 'admin' as const, workspaceId: 'ws-a' };

test('role navigation follows PRD responsibilities', () => {
  assert.equal(canAccessTab(creator.role, 'brief_studio'), true);

  assert.equal(canAccessTab(admin.role, 'user_management'), true);
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
  assert.match(visual, /Creative Direction|Arahan Kreatif/);
  assert.doesNotMatch(visual, /Visual Style Theme/);
});

test('user can self-approve an editable draft', () => {
  assert.equal(canTransitionDraft(creator.role, 'draft', 'disetujui'), true);
  assert.equal(canTransitionDraft(creator.role, 'revisi_diminta', 'disetujui'), true);
  assert.equal(canTransitionDraft(creator.role, 'disetujui', 'draft'), false);
});

test('workspace members are isolated', () => {
  const users = [{ id: '1', ...creator }, { id: '2', role: 'admin' as const, workspaceId: 'ws-b' }];
  assert.deepEqual(filterUsersForWorkspace(users, 'ws-a').map(user => user.id), ['1']);
});
