import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { canAccessTab, filterUsersForWorkspace, resolveDraftActor } from './policies.ts';

const creator = { role: 'creator' as const, workspaceId: 'ws-a' };
const corporate = { role: 'corporate' as const, workspaceId: 'ws-a' };
const superadmin = { role: 'superadmin' as const, workspaceId: 'ws-a' };

test('draft actor falls back to authenticated identity only for a workspace membership', () => {
  const account = { id: 'u1', name: 'Creator', email: 'creator@example.test', role: 'creator' as const, workspaces: [{ id: 'ws-a', name: 'A', code: 'A', role: 'creator' as const }] };
  assert.equal(resolveDraftActor(null, account, 'ws-a')?.id, account.id);
  assert.equal(resolveDraftActor(null, account, 'ws-b'), null);
  assert.equal(resolveDraftActor({ id: 'u2', name: 'Active', email: '', role: 'creator', workspaceId: 'ws-a', avatar: '', title: '', department: '' }, account, 'ws-a')?.id, 'u2');
});

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

test('creator workflow moves from brief to editor and visual without approval gates', async () => {
  const [app, dashboard, schedule, visual, help] = await Promise.all([
    readFile(new URL('../App.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../components/DashboardView.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../components/ContentSchedulingView.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../components/VisualStudioView.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../components/SettingsHelpView.tsx', import.meta.url), 'utf8')
  ]);
  assert.match(app, /onOpenEditor=\{\(id\) => \{ setSelectedDraftId\(id\); setCurrentTab\('editor'\); \}\}/);
  assert.match(app, /handleContinueToVisual/);
  assert.doesNotMatch(dashboard, /Brief Belum Disetujui|Perlu Konfirmasi|Buka di Editor lalu setujui/);
  assert.doesNotMatch(schedule, /status === 'disetujui'|linkedDraft\?\.status !== 'disetujui'|Belum ada draf yang disetujui/);
  assert.match(visual, /availableDrafts/);
  assert.match(visual, /currentVersionon/);
  assert.doesNotMatch(help, /Review & persetujuan|Persetujuan membuka Studio Visual/);
});

test('workspace member lists are isolated', () => {
  const users = [{ id: '1', ...creator }, { id: '2', ...corporate, workspaceId: 'ws-b' }];
  assert.deepEqual(filterUsersForWorkspace(users, 'ws-a').map(user => user.id), ['1']);
});

test('corporate schedule is company-wide, read-only, color-labeled, and supports per-entry comments', async () => {
  const [app, schedule, api, migration, database, server] = await Promise.all([
    readFile(new URL('../App.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../components/ContentSchedulingView.tsx', import.meta.url), 'utf8'),
    readFile(new URL('./apiService.ts', import.meta.url), 'utf8'),
    readFile(new URL('../../server/migrations/010_schedule_comments.sql', import.meta.url), 'utf8'),
    readFile(new URL('../../server/database.ts', import.meta.url), 'utf8'),
    readFile(new URL('../../server/index.ts', import.meta.url), 'utf8')
  ]);
  assert.match(app, /activeUser=\{activeUser\}/);
  assert.match(schedule, /listSchedules\(workspace\.id\)/);
  assert.match(schedule, /Semua Workspace/);
  assert.match(schedule, /workspaceColors/);
  assert.match(schedule, /readOnly/);
  assert.match(schedule, /addScheduleComment/);
  assert.match(schedule, /Komentar/);
  assert.match(api, /addScheduleComment/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS schedule_comments/);
  assert.match(database, /addScheduleComment/);
  assert.match(database, /jsonb_agg/);
  assert.match(server, /app\.put\('\/api\/schedules\/:id',contentOnly/);
  assert.match(server, /app\.delete\('\/api\/organizations\/:workspaceId\/schedules\/:id',contentOnly/);
  assert.match(server, /app\.post\('\/api\/schedules\/:id\/comments',corporateOnly/);
});

test('corporate uploads to shared KMS without claiming workspace isolation', async () => {
  const view = await readFile(new URL('../components/KnowledgeBaseView.tsx', import.meta.url), 'utf8');
  assert.match(view, /Knowledge Base Bersama/);
  assert.match(view, /Aplikasi membatasi penggunaannya ke workspace terpilih/);
  assert.match(view, /uploadKmsDocument/);
  assert.match(view, /Digunakan di workspace/);
  assert.match(view, /workspaceIds/);
  assert.doesNotMatch(view, /Kategori <input/);
});

test('knowledge-base management is scoped to corporate and superadmin, not creators', async () => {
  const [sidebar, dashboard, brief] = await Promise.all([
    readFile(new URL('../components/Sidebar.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../components/DashboardView.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../components/BriefStudioView.tsx', import.meta.url), 'utf8')
  ]);
  // The KB menu was deliberately hidden; corporate now owns KB management for its company.
  assert.match(sidebar, /navButton\('knowledge_base'/);
  assert.equal(canAccessTab(corporate.role, 'knowledge_base'), true);
  assert.equal(canAccessTab(superadmin.role, 'knowledge_base'), true);
  // Creators must not reach KB management: the server rejects it and the nav must not offer it.
  assert.equal(canAccessTab(creator.role, 'knowledge_base'), false);
  assert.equal(canAccessTab(creator.role, 'settings_help'), false);
  assert.equal(canAccessTab(corporate.role, 'settings_help'), true);
  assert.equal(canAccessTab(superadmin.role, 'settings_help'), true);
  assert.doesNotMatch(dashboard, /Check RAG Knowledge|RAG Active Documents/);
  assert.doesNotMatch(brief, /RAG Knowledge Base Radar|retrieveKnowledge/);
});

test('creator saves generated draft, then opens that exact draft in editor without approval', async () => {
  const [brief, editor, app] = await Promise.all([
    readFile(new URL('../components/BriefStudioView.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../components/EditorWorkspaceView.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../App.tsx', import.meta.url), 'utf8')
  ]);
  assert.match(brief, /Buat & Simpan Draf/);
  assert.match(brief, /Lanjut ke Editor/);
  assert.match(brief, /savedBrief\.id/);
  assert.match(brief, /onOpenEditor\(savedBrief\.id\)/);
  assert.match(app, /return newDraft\.id/);
  assert.doesNotMatch(editor, /Setujui Brief & Lanjutkan/);
  assert.match(editor, /Lanjut ke Studio Visual/);
});

test('generation workflow opens any saved active draft in visual studio', async () => {
  const [brief, visual] = await Promise.all([
    readFile(new URL('../components/BriefStudioView.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../components/VisualStudioView.tsx', import.meta.url), 'utf8')
  ]);
  assert.match(brief, /drafts\.map/);
  assert.match(brief, /onOpenEditor\(draft\.id\)/);
  assert.match(visual, /availableDrafts/);
  assert.match(visual, /status !== 'diarsipkan'/);
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
