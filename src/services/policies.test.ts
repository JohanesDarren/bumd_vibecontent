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
  for (const tab of ['dashboard', 'content_scheduling', 'user_management', 'corporate_management', 'corporate_users', 'settings_help'] as const) assert.equal(canAccessTab(corporate.role, tab), true, tab);
  for (const tab of ['brief_studio', 'editor', 'visual_studio', 'library', 'brand_profile', 'audit_log', 'admin_management'] as const) assert.equal(canAccessTab(corporate.role, tab), false, tab);
  assert.equal(canAccessTab(creator.role, 'corporate_management'), false);
  assert.equal(canAccessTab(superadmin.role, 'admin_management'), true);
});

test('corporate management and creator assignment remain reachable outside the admin control plane', async () => {
  const [app, sidebar] = await Promise.all([
    readFile(new URL('../App.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../components/Sidebar.tsx', import.meta.url), 'utf8')
  ]);
  assert.match(app, /safeTab === 'corporate_management'/);
  assert.match(app, /safeTab === 'corporate_users'/);
  assert.match(sidebar, /navButton\('corporate_management'/);
  assert.match(sidebar, /navButton\('corporate_users'/);
});

test('updated admin pages do not present fictional BUMD data', async () => {
  const names = ['AdminDashboard.tsx', 'SuperadminView.tsx', 'CorporateManagementView.tsx', 'CorporateUsersView.tsx', 'UserManagementView.tsx'];
  for (const name of names) {
    const view = await readFile(new URL(`../components/${name}`, import.meta.url), 'utf8');
    assert.doesNotMatch(view, /PAM Jaya Holding|PT Jakarta Propertindo|PT Tirta Metro Jakarta|56<|24\.8 GB/, name);
  }
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
  assert.match(visual, /Creative Direction|Arahan Kreatif/);
  assert.doesNotMatch(visual, /Visual Style Theme/);
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
